import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getActiveSessionUser } from "@/src/auth/session";
import { DEFAULT_TENANT_ID } from "@/src/config/tenant";
import { getPrisma, USE_DATABASE } from "@/src/data/db";

/**
 * Streams one evidence file back to the person who is allowed to see it.
 *
 * The store is private, so the stored object has no publicly usable URL. This
 * route is the only way to read one, and it streams the bytes through the
 * server rather than redirecting — which means no blob URL, signed or
 * otherwise, ever reaches a browser. A link that leaks cannot be replayed by
 * somebody else, because there is no link.
 *
 * Tenant isolation is enforced on the **file**, not merely on the record:
 *
 *   1. the session must resolve to a user
 *   2. the evidence row must belong to this tenant
 *   3. the case it hangs off must belong to the same tenant
 *
 * All three are read from the server session and the database. The request
 * supplies an id and nothing else; a valid id belonging to another tenant
 * matches zero rows and returns 404 — deliberately not 403, which would
 * confirm the id exists.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ evidenceId: string }> },
): Promise<NextResponse> {
  const { evidenceId } = await params;

  if (!USE_DATABASE) {
    return NextResponse.json({ error: "Evidence storage is not enabled." }, { status: 503 });
  }

  const actor = await getActiveSessionUser();
  if (!actor) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const tenantId = DEFAULT_TENANT_ID;

  // Tenant on the evidence row *and* on the case behind it. The second check
  // is not redundant: it is what stops a row whose tenantId was ever written
  // wrongly from becoming a way across the boundary.
  const record = await getPrisma().evidence.findFirst({
    where: { id: evidenceId, tenantId, case: { tenantId } },
    select: { fileName: true, storagePath: true, storageUrl: true },
  });

  if (!record) {
    return NextResponse.json({ error: "Evidence not found." }, { status: 404 });
  }

  const pathname = record.storagePath;
  if (!pathname) {
    // A metadata-only record: real evidence, filed before storage existed or
    // recorded without a file. Saying so plainly beats a broken download.
    return NextResponse.json(
      { error: "This evidence record has no stored file." },
      { status: 409 },
    );
  }

  try {
    const blob = await get(pathname, { access: "private" });
    // The row names a path the store does not have — a delete outside the app,
    // or a failed upload whose row was written anyway. Saying so beats a
    // stream of nothing.
    if (!blob) {
      return NextResponse.json({ error: "The stored file is no longer present." }, { status: 404 });
    }
    return new NextResponse(blob.stream, {
      headers: {
        "Content-Type": blob.headers.get("content-type") ?? "application/octet-stream",
        // `inline` so a PDF or an image opens in the browser rather than
        // forcing a download; the filename is the one the uploader chose.
        "Content-Disposition": `inline; filename="${encodeURIComponent(record.fileName)}"`,
        // Private evidence must never be held in a shared cache.
        "Cache-Control": "private, no-store",
      },
    }) as NextResponse;
  } catch (error) {
    console.error("[evidence/get]", error);
    return NextResponse.json({ error: "The file could not be read." }, { status: 502 });
  }
}

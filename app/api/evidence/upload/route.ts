import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getActiveSessionUser } from "@/src/auth/session";
import { DEFAULT_TENANT_ID } from "@/src/config/tenant";
import { getPrisma, USE_DATABASE } from "@/src/data/db";

/**
 * Mints the token a browser needs to upload one evidence file.
 *
 * The file goes **from the browser straight to Blob storage**, never through a
 * Server Action. That is not a preference: the UI accepts files up to 25 MB and
 * a Server Action body is capped around 4.5 MB, so routing bytes through the
 * application would fail on exactly the large files evidence tends to be.
 *
 * What the browser cannot do is authorise itself. This route is where that
 * happens, before any token exists:
 *
 *   1. the session must resolve to a real user in this tenant
 *   2. the case must exist **inside that tenant**
 *
 * Only then is a single-use token issued, scoped to a pathname this route
 * chooses. The client sends a case number and a file; it never sends a tenant,
 * a user id, or a storage path, and none of those would be believed.
 *
 * `access: "private"` is what keeps the stored object unreadable without a
 * server credential — the download route is the only way back in.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!USE_DATABASE) {
    return NextResponse.json({ error: "Evidence storage is not enabled." }, { status: 503 });
  }

  const actor = await getActiveSessionUser();
  if (!actor) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const body = (await request.json()) as HandleUploadBody;
  const tenantId = DEFAULT_TENANT_ID;

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        // The only thing the client is trusted to name is which case it means.
        const caseNo = String(clientPayload ?? "").trim().toUpperCase();
        if (!caseNo) throw new Error("No case was named for this upload.");

        const record = await getPrisma().case.findUnique({
          where: { tenantId_caseNo: { tenantId, caseNo } },
          select: { id: true },
        });
        // A case number belonging to another tenant does not resolve here at
        // all, so a token is never issued for somebody else's case.
        if (!record) throw new Error("That case does not belong to this tenant.");

        /* The client proposes a pathname and this rejects anything outside the
         * case it just proved it may write to. The path is not the security
         * boundary — the store is private and downloads go through the route
         * next door, which checks the tenant on the row — but keeping objects
         * under a per-case prefix means the store stays legible during an
         * incident, and one case's files never land in another's folder. */
        const expected = `evidence/${caseNo}/`;
        if (!pathname.startsWith(expected)) {
          throw new Error("That upload path does not belong to this case.");
        }

        return {
          access: "private",
          addRandomSuffix: true,
          maximumSizeInBytes: 25 * 1024 * 1024,
          tokenPayload: JSON.stringify({ tenantId, caseId: record.id, actorId: actor.id }),
        };
      },
      onUploadCompleted: async () => {
        // The evidence row is written by the Case Detail mutation once the
        // upload returns, so the record and its audit entry stay in the same
        // transaction as every other change to the case. Nothing to do here.
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    // The message is for the person whose upload just failed; the detail
    // belongs in the server log.
    console.error("[evidence/upload]", error);
    const message = error instanceof Error ? error.message : "The upload could not be authorised.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

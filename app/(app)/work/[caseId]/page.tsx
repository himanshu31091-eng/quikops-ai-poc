import { notFound } from "next/navigation";
import { getSessionUser } from "@/src/auth/session";
import { USE_DATABASE } from "@/src/data/db";
import { getCaseDetail } from "@/src/data/queries/case-detail";
import { CaseDetailView } from "@/features/case-detail/components/case-detail-view";

/**
 * Case detail. The execution surface for a single operational case.
 *
 * Server component: the whole record is assembled in one pass and handed to the
 * client module, so opening a case costs one round trip rather than a waterfall
 * of section fetches.
 */

interface CasePageProps {
  params: Promise<{ caseId: string }>;
}

export async function generateMetadata({ params }: CasePageProps) {
  const { caseId } = await params;
  const detail = await getCaseDetail(caseId);
  if (!detail) return { title: "Case not found" };
  return {
    title: `${detail.case.caseNo} — ${detail.case.title}`,
    description: detail.summary.problem.slice(0, 160),
  };
}

export default async function CaseDetailPage({ params }: CasePageProps) {
  const { caseId } = await params;
  const [detail, user] = await Promise.all([getCaseDetail(caseId), getSessionUser()]);

  if (!detail) notFound();

  /*
   * The key is what makes a persisted change visible.
   *
   * Case Detail seeds its reducer from these props once, on mount. After a
   * mutation the server record is re-read, but a live reducer would keep
   * showing its own optimistic copy — including a change the database
   * rejected. Changing the key remounts the module against the record that was
   * actually stored, so what is on screen is what is in Neon.
   *
   * The version is the audit trail's own length and latest entry, because
   * every mutation writes exactly one audit row or more. In fixture mode the
   * audit is derived deterministically from the corpus, so the key never
   * changes and the session behaves precisely as it did before.
   */
  const dataVersion = `${detail.audit.length}:${detail.audit[0]?.id ?? "none"}`;

  return (
    <CaseDetailView
      key={dataVersion}
      detail={detail}
      sessionUser={user}
      persistent={USE_DATABASE}
    />
  );
}

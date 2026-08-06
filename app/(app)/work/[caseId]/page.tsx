import { notFound } from "next/navigation";
import { getSessionUser } from "@/src/auth/session";
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

  return <CaseDetailView detail={detail} sessionUser={user} />;
}

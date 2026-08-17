import { getTranslations } from "@/src/i18n/server";
import { getPlantScope } from "@/src/scope/plant-scope";
import Link from "next/link";
import { Icon } from "@/components/patterns/icon";
import { PageHeader } from "@/components/patterns/page-header";
import { FirstUseTip, ReleaseAnnouncement } from "@/components/patterns/in-app-tip";
import { SectionCard } from "@/components/patterns/section-card";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/src/auth/session";
import {
  getActivityFeed,
  getCaseBaseline,
  getCriticalCases,
  getExecutionMetrics,
  getExecutiveSummary,
  getHeadlineKpis,
  getInventoryHealth,
  getOtifTrend,
  getPlantHealth,
  getPriorityDistribution,
  getRevenueImpact,
  getTodaysActions,
} from "@/src/data/queries/dashboard";
import {
  DashboardExportButton,
  LiveActivityFeed,
  LiveFlowVerdict,
  LiveExecutionMetrics,
  LiveKpiBand,
  LiveRevenueImpact,
  LiveSessionChip,
} from "@/features/dashboard/components/live-dashboard";
import {
  AskCopilotButton,
  DashboardCopilotProvider,
} from "@/features/dashboard/components/dashboard-copilot";
import { getPortfolioSnapshot } from "@/src/data/queries/portfolio";
import { AiSummaryCard } from "@/features/dashboard/components/ai-summary-card";
import { CriticalBottlenecksTable } from "@/features/dashboard/components/critical-bottlenecks-table";
import { InventoryHealthTable } from "@/features/dashboard/components/inventory-health-table";
import { OperationalHealth } from "@/features/dashboard/components/operational-health";
import { OtifTrendChart } from "@/features/dashboard/components/otif-trend-chart";
import { PriorityDistribution } from "@/features/dashboard/components/priority-distribution";
import { TodaysWorkList } from "@/features/dashboard/components/todays-work-list";
import { DEMO_NOW } from "@/src/lib/constants";
import { formatTimestamp } from "@/src/lib/format";

/**
 * The Executive Dashboard.
 *
 * Every figure on this page comes from `src/domain/portfolio-metrics` via the
 * dashboard query, which is what makes it agree with Analytics and with the
 * Copilot. Session work is layered on in `LiveDashboard`, never here.
 */
export const metadata = { title: "Executive Dashboard" };

function MetaChip({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-2xs text-content-tertiary">
      <Icon name={icon} size="xs" />
      {children}
    </span>
  );
}

export default async function ExecutiveDashboardPage() {
  const scope = await getPlantScope();
  const [
    user,
    kpis,
    summary,
    plantHealth,
    otifTrend,
    priorityDistribution,
    criticalCases,
    todaysActions,
    revenueImpact,
    activity,
    inventory,
    executionMetrics,
    caseBaseline,
    portfolio,
  ] = await Promise.all([
    getSessionUser(),
    getHeadlineKpis(scope),
    getExecutiveSummary(),
    getPlantHealth(),
    getOtifTrend(),
    getPriorityDistribution(scope),
    getCriticalCases(6, scope),
    getTodaysActions(5),
    getRevenueImpact(),
    getActivityFeed(7),
    getInventoryHealth(),
    getExecutionMetrics(),
    getCaseBaseline(scope),
    getPortfolioSnapshot(scope),
  ]);

  const { t } = await getTranslations();
  const firstName = user.name.split(" ")[0] ?? user.name;

  return (
    <DashboardCopilotProvider
      sessionUser={user}
      brief={{
        plantCount: portfolio.plants.length,
        openCases: portfolio.totals.openCases,
        revenueAtRisk: portfolio.totals.revenueAtRisk,
        currency: portfolio.totals.currency,
        criticalOpen: portfolio.totals.criticalOpen,
        breachedOpen: portfolio.totals.breachedOpen,
      }}
    >
    <div className="space-y-5">
      <PageHeader
        title={t("dash.greeting", { name: firstName })}
        // Counted from the plants actually on screen. The figure was written by
        // hand and said four while the network had three, which the plant filter
        // beside it contradicted on sight.
        description={t("dash.subtitle", { count: plantHealth.length })}
        docKey="dashboard"
        meta={
          <>
            <MetaChip icon="Clock">
              {t("dash.dataAsAt", { time: formatTimestamp(DEMO_NOW) })}
            </MetaChip>
            <MetaChip icon="PlugZap">
              {t("dash.lastSync")}
            </MetaChip>
            <MetaChip icon="Building2">
              {t("dash.plantsInScope", { count: user.plantScope.length })}
            </MetaChip>
            <LiveSessionChip cases={caseBaseline} />
          </>
        }
        actions={
          <>
            <DashboardExportButton
              kpis={kpis}
              metrics={executionMetrics}
              plantHealth={plantHealth}
              cases={caseBaseline}
            />
            <AskCopilotButton />
          </>
        }
      />

      <FirstUseTip screen="dashboard" />
      <ReleaseAnnouncement />

      {/* KPI band */}
      <section aria-label={t("dash.headlineIndicators")} data-tour="dashboard-kpi-band">
        <LiveKpiBand kpis={kpis} cases={caseBaseline} />
      </section>

      {/* Flow verdict — one band, added rather than replacing anything. The
          full flow region lives in Execution Analytics. */}
      <section aria-label={t("dash.backlogFlow")} data-tour="dashboard-flow">
        <LiveFlowVerdict cases={caseBaseline} />
      </section>

      {/* Execution performance */}
      <section
        data-tour="dashboard-execution-strip"
        aria-label={t("dash.executionPerformance")}
        className="min-w-0 overflow-hidden rounded-lg border border-line bg-surface"
      >
        <LiveExecutionMetrics metrics={executionMetrics} cases={caseBaseline} />
      </section>

      {/* Intelligence + plant health */}
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8" data-tour="dashboard-ai-summary">
          <AiSummaryCard summary={summary} />
        </div>
        <div className="min-w-0 xl:col-span-4">
          <SectionCard
            title={t("dash.operationalHealth")}
            subtitle={t("dash.operationalHealthSub")}
            icon="Factory"
            className="h-full"
            bodyClassName="p-2"
            footer={
              <p className="text-2xs text-content-tertiary">
                {t("dash.kpiFootnote")}
              </p>
            }
          >
            <OperationalHealth data={plantHealth} />
          </SectionCard>
        </div>
      </div>

      {/* Trend + distribution */}
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <SectionCard
            title={t("dash.otifTrend")}
            subtitle={t("dash.otifTrendSub")}
            icon="ChartNoAxesColumn"
            className="h-full"
          >
            <OtifTrendChart data={otifTrend} />
          </SectionCard>
        </div>
        <div className="min-w-0 xl:col-span-4">
          <SectionCard
            title={t("dash.priorityDistribution")}
            subtitle={t("dash.priorityDistributionSub")}
            icon="Target"
            className="h-full"
          >
            <PriorityDistribution data={priorityDistribution} />
          </SectionCard>
        </div>
      </div>

      {/* Bottlenecks + today's work */}
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <SectionCard
            title={t("dash.bottlenecks")}
            subtitle={t("dash.bottlenecksSub")}
            icon="TriangleAlert"
            flush
            className="h-full"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/work?band=CRITICAL">
                  {t("dash.viewAll")}
                  <Icon name="ArrowRight" size="sm" />
                </Link>
              </Button>
            }
          >
            <CriticalBottlenecksTable cases={criticalCases} />
          </SectionCard>
        </div>
        <div className="min-w-0 xl:col-span-4">
          <SectionCard
            title={t("dash.todaysWork")}
            subtitle={t("dash.todaysWorkSub")}
            icon="ListChecks"
            flush
            className="h-full"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/my-work">
                  {t("dash.myWork")}
                  <Icon name="ArrowRight" size="sm" />
                </Link>
              </Button>
            }
          >
            <TodaysWorkList actions={todaysActions} />
          </SectionCard>
        </div>
      </div>

      {/* Revenue impact + activity */}
      <div className="grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-8">
          <SectionCard
            title={t("dash.revenueImpact")}
            subtitle={t("dash.revenueImpactSub")}
            icon="DollarSign"
            className="h-full"
          >
            <LiveRevenueImpact buckets={revenueImpact} cases={caseBaseline} />
          </SectionCard>
        </div>
        <div className="min-w-0 xl:col-span-4">
          <SectionCard
            title={t("dash.recentActivity")}
            subtitle={t("dash.recentActivitySub")}
            icon="Activity"
            className="h-full"
            footer={
              <Link
                href="/system/audit"
                className="flex items-center gap-1.5 text-2xs font-medium text-accent hover:underline"
              >
                {t("dash.openAuditLog")}
                <Icon name="ArrowRight" size="xs" />
              </Link>
            }
          >
            <LiveActivityFeed events={activity} limit={7} />
          </SectionCard>
        </div>
      </div>

      {/* Inventory health */}
      <SectionCard
        title={t("dash.inventoryHealth")}
        subtitle={t("dash.inventoryHealthSub")}
        icon="Boxes"
        flush
      >
        <InventoryHealthTable rows={inventory} />
      </SectionCard>
    </div>
    </DashboardCopilotProvider>
  );
}

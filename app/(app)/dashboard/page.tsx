import Link from "next/link";
import { Icon } from "@/components/patterns/icon";
import { PageHeader } from "@/components/patterns/page-header";
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
    getHeadlineKpis(),
    getExecutiveSummary(),
    getPlantHealth(),
    getOtifTrend(),
    getPriorityDistribution(),
    getCriticalCases(6),
    getTodaysActions(5),
    getRevenueImpact(),
    getActivityFeed(7),
    getInventoryHealth(),
    getExecutionMetrics(),
    getCaseBaseline(),
    getPortfolioSnapshot(),
  ]);

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
        title={`Good morning, ${firstName}`}
        description="Operational health across four plants, with every number traceable to the cases behind it."
        docKey="dashboard"
        meta={
          <>
            <MetaChip icon="Clock">
              Data as at {formatTimestamp(DEMO_NOW)} UTC
            </MetaChip>
            <MetaChip icon="PlugZap">
              Every Angle · last sync 2h ago · 34 signals
            </MetaChip>
            <MetaChip icon="Building2">
              {user.plantScope.length} plants in scope
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

      {/* KPI band */}
      <section aria-label="Headline indicators" data-tour="dashboard-kpi-band">
        <LiveKpiBand kpis={kpis} cases={caseBaseline} />
      </section>

      {/* Flow verdict — one band, added rather than replacing anything. The
          full flow region lives in Execution Analytics. */}
      <section aria-label="Backlog flow">
        <LiveFlowVerdict cases={caseBaseline} />
      </section>

      {/* Execution performance */}
      <section
        aria-label="Execution performance"
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
            title="Operational health"
            subtitle="On-time in full by plant, worst first"
            icon="Factory"
            className="h-full"
            bodyClassName="p-2"
            footer={
              <p className="text-2xs text-content-tertiary">
                KPI values are read from Every Angle and never recomputed here.
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
            title="On-time in full — trend"
            subtitle="Group level, against the 95% target"
            icon="ChartNoAxesColumn"
            className="h-full"
          >
            <OtifTrendChart data={otifTrend} />
          </SectionCard>
        </div>
        <div className="min-w-0 xl:col-span-4">
          <SectionCard
            title="Priority distribution"
            subtitle="Open cases by band"
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
            title="Critical bottlenecks"
            subtitle="Highest priority open cases, scored by the rule set"
            icon="TriangleAlert"
            flush
            className="h-full"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/work?band=CRITICAL">
                  View all
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
            title="Today's work"
            subtitle="Actions due across your teams"
            icon="ListChecks"
            flush
            className="h-full"
            action={
              <Button variant="ghost" size="sm" asChild>
                <Link href="/my-work">
                  My work
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
            title="Revenue impact by exception type"
            subtitle="Exposure still open against value recovered through executed cases"
            icon="DollarSign"
            className="h-full"
          >
            <LiveRevenueImpact buckets={revenueImpact} cases={caseBaseline} />
          </SectionCard>
        </div>
        <div className="min-w-0 xl:col-span-4">
          <SectionCard
            title="Recent activity"
            subtitle="Every change is audit logged"
            icon="Activity"
            className="h-full"
            footer={
              <Link
                href="/system/audit"
                className="flex items-center gap-1.5 text-2xs font-medium text-accent hover:underline"
              >
                Open full audit log
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
        title="Inventory health"
        subtitle="Days of coverage against policy, with stockout and excess exposure"
        icon="Boxes"
        flush
      >
        <InventoryHealthTable rows={inventory} />
      </SectionCard>
    </div>
    </DashboardCopilotProvider>
  );
}

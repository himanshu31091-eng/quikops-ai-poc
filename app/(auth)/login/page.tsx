import Link from "next/link";
import { Icon } from "@/components/patterns/icon";
import { BrandMark } from "@/components/shell/brand-mark";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { switchPersona } from "@/src/auth/session-actions";
import { APP, ROLE_META } from "@/src/config/app-config";
import { DEMO_PERSONAS, USER_BY_ID } from "@/src/data/fixtures/organisation";
import { initials } from "@/src/lib/format";

/**
 * The sign-in screen.
 *
 * There is no authentication in this POC: choosing a persona writes the
 * session cookie through a server action. The screen exists because the demo
 * opens on it, and because persona is how role-based views are shown.
 */
export const metadata = { title: "Sign in" };

const VALUE_POINTS = [
  {
    icon: "Zap",
    title: "Detection becomes execution",
    body: "Every Angle exceptions arrive as owned cases with a due date, an owner and an audit trail.",
  },
  {
    icon: "ShieldCheck",
    title: "Verification with segregation of duties",
    body: "Corrective action is signed off by a reviewer who is never the submitter — enforced in the database.",
  },
  {
    icon: "Target",
    title: "Measured against a captured baseline",
    body: "KPI movement is reported over a defined window, with confounding factors disclosed.",
  },
] as const;

export default function LoginPage() {
  const personas = DEMO_PERSONAS.map((id) => USER_BY_ID[id]!).filter(Boolean);

  async function signInAs(formData: FormData) {
    "use server";
    const userId = formData.get("userId");
    if (typeof userId === "string") await switchPersona(userId);
  }

  return (
    <div className="flex min-h-dvh">
      {/* Value panel — establishes the enterprise frame before any credential UI */}
      <aside className="relative hidden w-[46%] shrink-0 flex-col justify-between border-r border-line-inverse bg-surface-inverse p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <BrandMark className="size-7" />
          <div>
            <p className="text-base font-semibold tracking-[-0.012em] text-content-inverse">
              {APP.name}
            </p>
            <p className="text-2xs text-content-inverse-secondary">{APP.tagline}</p>
          </div>
        </div>

        <div className="max-w-md">
          <p className="text-2xs font-semibold uppercase tracking-wider text-content-inverse-secondary">
            The execution layer
          </p>
          <h1 className="mt-3 text-2xl font-semibold leading-tight tracking-[-0.02em] text-content-inverse">
            Every Angle identifies operational bottlenecks.
            <span className="block text-content-inverse-secondary">
              QuikOps AI turns them into executed, verified outcomes.
            </span>
          </h1>

          <ul className="mt-8 space-y-5">
            {VALUE_POINTS.map((point) => (
              <li key={point.title} className="flex gap-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border border-line-inverse bg-white/5 text-content-inverse">
                  <Icon name={point.icon} size="sm" />
                </span>
                <div>
                  <p className="text-sm font-medium text-content-inverse">{point.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-content-inverse-secondary">
                    {point.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex items-center gap-4 text-2xs text-content-inverse-secondary">
          <span>Complements SAP · Oracle · Dynamics</span>
          <span className="size-1 rounded-full bg-content-inverse-secondary" />
          <span>Built by {APP.vendor}</span>
        </div>
      </aside>

      {/* Credential panel */}
      <main className="flex flex-1 items-center justify-center bg-surface px-6 py-12">
        <div className="w-full max-w-[400px]">
          <div className="lg:hidden">
            <BrandMark className="size-8" />
          </div>

          <h2 className="mt-6 text-xl font-semibold tracking-[-0.014em] text-content lg:mt-0">
            Sign in
          </h2>
          <p className="mt-1.5 text-sm text-content-secondary">
            Access is federated through your corporate identity provider.
          </p>

          <button
            type="button"
            disabled
            className="mt-6 flex h-10 w-full items-center justify-center gap-2.5 rounded-md border border-line bg-surface text-sm font-medium text-content shadow-raised transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-70"
          >
            <svg viewBox="0 0 21 21" className="size-4" aria-hidden="true">
              <rect x="1" y="1" width="9" height="9" fill="#F25022" />
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
              <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
            </svg>
            Continue with Microsoft Entra ID
          </button>

          <p className="mt-2 flex items-center gap-1.5 text-2xs text-content-tertiary">
            <Icon name="Info" size="xs" />
            SSO and SCIM provisioning are configured in Phase 5.
          </p>

          <div className="my-7 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-2xs font-medium uppercase tracking-wider text-content-tertiary">
              Demonstration personas
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="space-y-2">
            {personas.map((persona) => (
              <form key={persona.id} action={signInAs}>
                <input type="hidden" name="userId" value={persona.id} />
                <button
                  type="submit"
                  className="group flex w-full items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5 text-left transition-colors duration-150 hover:border-accent-line hover:bg-accent-subtle"
                >
                  <Avatar className="size-8">
                    <AvatarFallback>{initials(persona.name)}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-content">
                      {persona.name}
                    </span>
                    <span className="block truncate text-2xs text-content-tertiary">
                      {persona.jobTitle}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-sm border border-line bg-surface-subtle px-1.5 py-0.5 text-2xs font-medium text-content-secondary">
                    {ROLE_META[persona.role].short}
                  </span>
                  <Icon
                    name="ArrowRight"
                    size="sm"
                    className="shrink-0 text-content-tertiary transition-colors duration-150 group-hover:text-accent"
                  />
                </button>
              </form>
            ))}
          </div>

          <p className="mt-7 text-2xs leading-relaxed text-content-tertiary">
            Persona selection exists for demonstration only and is removed from
            production builds. All data in this environment is synthetic.{" "}
            <Link href="/dashboard" className="text-accent hover:underline">
              Skip to dashboard
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

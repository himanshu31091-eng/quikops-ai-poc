import { cn } from "@/src/lib/cn";

/**
 * Geometric mark: three stacked bars resolving into a single forward chevron —
 * detection resolving into execution. Flat, single colour, no gradient.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn("size-6", className)}
      aria-hidden="true"
    >
      <rect x="1" y="1" width="22" height="22" rx="5.5" className="fill-accent" />
      <path
        d="M7 8.25h5.4M7 12h8M7 15.75h5.4"
        stroke="white"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M15.6 8.4 19 12l-3.4 3.6"
        stroke="white"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

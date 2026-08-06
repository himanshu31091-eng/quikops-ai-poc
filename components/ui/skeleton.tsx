import { cn } from "@/src/lib/cn";

/**
 * The loading placeholder.
 *
 * Carries no size of its own: every skeleton is shaped by the caller to match
 * the element it stands in for, so the layout does not shift when real content
 * arrives. The shimmer lives in `.skeleton` in `globals.css`.
 */
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("skeleton", className)} {...props} />;
}

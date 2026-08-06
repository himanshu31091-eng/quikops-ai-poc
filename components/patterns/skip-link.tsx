/**
 * The first Tab stop on every page.
 *
 * WCAG 2.2 AA 2.4.1 (Bypass Blocks): a keyboard user should not have to tab
 * through the sidebar and top bar on every navigation. Visually hidden until
 * focused, which is why it uses `sr-only` plus a focus override rather than
 * `display: none`.
 */
export function SkipLink({ targetId = "main-content" }: { targetId?: string }) {
  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[100] focus:rounded-md focus:border focus:border-accent focus:bg-surface focus:px-3 focus:py-2 focus:text-xs focus:font-medium focus:text-content focus:shadow-overlay"
    >
      Skip to main content
    </a>
  );
}

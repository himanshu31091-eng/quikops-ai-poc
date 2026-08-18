/**
 * The sign-in panel's illustration: a signal becoming a verified outcome.
 *
 * It draws the product's own claim rather than decorating around it. Signals
 * arrive from the systems that already run the business, converge into one owned
 * case, the case is worked through its waypoints, a reviewer verifies it, and
 * only then does the measured line lift off the baseline — the same sequence the
 * three value points beside it describe in words, and the same order the
 * workflow enforces.
 *
 * **Inline SVG rather than a GIF or a video.** A raster loop would carry a fixed
 * palette that cannot follow the theme, blur on a retina display, weigh several
 * hundred kilobytes on the one screen that must render before anything is
 * cached, and be meaningless to assistive technology. This is a few kilobytes of
 * markup, sharp at any size, and drawn entirely from design tokens.
 *
 * **No text.** Every label would need translating into three catalogues and
 * re-measuring at each width; geometry says the same thing in every language.
 *
 * Motion is ambient — one nine-second cycle, nothing that competes with the
 * sign-in controls beside it. Under `prefers-reduced-motion` the global reset in
 * `globals.css` collapses each animation to its final frame, so the structural
 * elements are authored to *end* complete: track full, ring closed, check and
 * trend drawn. A reader who has asked for stillness gets the finished diagram,
 * not an empty one.
 */

/** Where each source lane starts, and when its signal sets off. */
const LANES = [
  { from: 18, delay: "0s" },
  { from: 62, delay: "0.9s" },
  { from: 106, delay: "1.8s" },
  { from: 150, delay: "2.7s" },
] as const;

/** A lane fans in from the left edge and lands on the hub. */
const lanePath = (from: number) => `M4 ${from} C 78 ${from}, 96 96, 150 96`;

export function ExecutionFlowVisual({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 200"
      fill="none"
      className={className}
      // Decorative: the prose beside it carries the same meaning, so a screen
      // reader announcing a second version would only repeat the panel.
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Lanes emerge from nothing at the left edge, so the signals read as
            arriving from elsewhere rather than starting at a hard border. */}
        <linearGradient id="qo-lane" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-content-inverse-secondary)" stopOpacity="0" />
          <stop offset="70%" stopColor="var(--color-content-inverse-secondary)" stopOpacity="0.32" />
          <stop offset="100%" stopColor="var(--color-accent-line)" stopOpacity="0.5" />
        </linearGradient>
        <radialGradient id="qo-glow">
          <stop offset="0%" stopColor="var(--color-accent-line)" stopOpacity="0.4" />
          <stop offset="65%" stopColor="var(--color-accent-line)" stopOpacity="0.06" />
          <stop offset="100%" stopColor="var(--color-accent-line)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Four source lanes fanning into one case. */}
      {LANES.map((lane) => (
        <path key={lane.from} d={lanePath(lane.from)} stroke="url(#qo-lane)" strokeWidth="1.25" />
      ))}

      {/* The signals themselves, travelling their lane into the hub. */}
      {LANES.map((lane) => (
        <circle
          key={`signal-${lane.from}`}
          r="2.5"
          fill="var(--color-accent-line)"
          className="qo-signal"
          style={{ animationDelay: lane.delay, offsetPath: `path("${lanePath(lane.from)}")` }}
        />
      ))}

      {/* Detection: many signals, one owned case. */}
      <circle cx="150" cy="96" r="30" fill="url(#qo-glow)" className="qo-hub-glow" />
      <circle
        cx="150"
        cy="96"
        r="12"
        fill="var(--color-surface-inverse)"
        stroke="var(--color-accent-line)"
        strokeWidth="1.5"
      />
      <circle cx="150" cy="96" r="4" fill="var(--color-accent-line)" />

      {/* The execution track. The rail is the commitment made when the case was
          opened; the fill is progress against it. */}
      <line
        x1="174"
        y1="96"
        x2="348"
        y2="96"
        stroke="var(--color-line-inverse)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <line
        x1="174"
        y1="96"
        x2="348"
        y2="96"
        stroke="var(--color-accent-line)"
        strokeWidth="2.5"
        strokeLinecap="round"
        pathLength={1}
        className="qo-track"
      />

      {/* Assignment, then corrective action — the two waypoints a case passes
          before anyone is allowed to call it done. */}
      {[232, 290].map((x, index) => (
        <circle
          key={x}
          cx={x}
          cy="96"
          r="4.5"
          fill="var(--color-surface-inverse)"
          stroke="var(--color-accent-line)"
          strokeWidth="1.5"
          className="qo-step"
          style={{ animationDelay: `${3.5 + index * 0.6}s` }}
        />
      ))}

      {/* Verification: the ring closes, then the check is drawn. Nothing counts
          as recovered until this completes, which is why it lands last. */}
      <circle cx="376" cy="96" r="21" stroke="var(--color-line-inverse)" strokeWidth="2" />
      <circle
        cx="376"
        cy="96"
        r="21"
        stroke="var(--color-success-line)"
        strokeWidth="2"
        strokeLinecap="round"
        pathLength={1}
        transform="rotate(-90 376 96)"
        className="qo-verify-ring"
      />
      <path
        d="M368 96.5 l5.5 5.5 l11 -12"
        stroke="var(--color-success-line)"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="qo-verify-check"
      />

      {/* The captured baseline, and the movement measured against it. It leaves
          from the verification ring, because an unverified case moves nothing. */}
      <line
        x1="400"
        y1="96"
        x2="512"
        y2="96"
        stroke="var(--color-line-inverse)"
        strokeWidth="1.25"
        strokeDasharray="3 5"
      />
      <path
        d="M400 96 C 428 94, 442 88, 458 74 S 486 44, 512 32"
        stroke="var(--color-success-line)"
        strokeWidth="2"
        strokeLinecap="round"
        pathLength={1}
        className="qo-kpi"
      />
      <circle cx="512" cy="32" r="3.5" fill="var(--color-success-line)" className="qo-kpi-tip" />
    </svg>
  );
}

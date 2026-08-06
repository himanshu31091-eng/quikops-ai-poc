/**
 * PDF guide and walkthrough-video registries.
 *
 * Both are declarative catalogues rather than assets: the guides render through
 * the print pipeline (D-44) so there is no PDF binary to keep in sync, and the
 * videos carry provider, chapters and transcript so the player and the
 * documentation search read the same source.
 */

export interface PdfGuide {
  id: string;
  title: string;
  audience: string;
  description: string;
  /** Help articles composed into this guide, in order. */
  articleIds: string[];
  icon: string;
}

export const PDF_GUIDES: PdfGuide[] = [
  { id: "guide_exec", title: "Executive Guide", audience: "Executives", description: "The position, what drives it, and where to look first.", articleIds: ["overview", "how-it-works", "modules"], icon: "Sparkles" },
  { id: "guide_manager", title: "Manager Guide", audience: "Operations managers", description: "Triage, assignment, verification and the approval queue.", articleIds: ["workflow", "modules", "roles"], icon: "UserCog" },
  { id: "guide_operator", title: "Operator Guide", audience: "Task owners", description: "Executing a case: plan, evidence, progress and hand-off.", articleIds: ["workflow", "shortcuts"], icon: "ListChecks" },
  { id: "guide_admin", title: "Administrator Guide", audience: "Administrators", description: "Users, routing, thresholds, weights and connector health.", articleIds: ["roles", "data-sources", "troubleshooting"], icon: "Settings2" },
  { id: "guide_architecture", title: "Architecture Overview", audience: "Technical evaluators", description: "How detection, execution and verification fit together.", articleIds: ["how-it-works", "data-sources"], icon: "Boxes" },
  { id: "guide_features", title: "Feature Guide", audience: "All users", description: "Every screen and what it is for.", articleIds: ["modules", "copilot"], icon: "LayoutDashboard" },
  { id: "guide_workflow", title: "Workflow Guide", audience: "All users", description: "Detection through to verified closure.", articleIds: ["how-it-works", "workflow"], icon: "Activity" },
  { id: "guide_quickstart", title: "Quick Start Guide", audience: "New users", description: "The first fifteen minutes.", articleIds: ["overview", "modules", "shortcuts"], icon: "Zap" },
];

export type VideoProvider = "youtube" | "vimeo" | "local";

export interface VideoChapter {
  /** Seconds from the start. */
  at: number;
  label: string;
}

export interface WalkthroughVideo {
  id: string;
  title: string;
  description: string;
  provider: VideoProvider;
  /** Embed id for youtube/vimeo, or a path under /public for local. */
  src: string | null;
  durationSeconds: number;
  chapters: VideoChapter[];
  transcript: string | null;
  /** No recording exists yet — the card says so rather than implying one. */
  isPlaceholder: boolean;
}

/**
 * ⚠️ Embedding YouTube or Vimeo requires allowing those frame sources in the
 * CSP. Worth knowing before someone spends an hour on a blank iframe.
 */
export const WALKTHROUGH_VIDEOS: WalkthroughVideo[] = [
  {
    id: "vid_tour",
    title: "Product tour",
    description: "Ten minutes across every screen, in the order a manager uses them.",
    provider: "local",
    src: null,
    durationSeconds: 612,
    chapters: [
      { at: 0, label: "Why QuikOps exists" },
      { at: 74, label: "Executive Dashboard" },
      { at: 228, label: "Work Manager" },
      { at: 351, label: "Running a case" },
      { at: 512, label: "The number moves" },
    ],
    transcript: null,
    isPlaceholder: true,
  },
  {
    id: "vid_workflow",
    title: "Running a case end to end",
    description: "Detection, assignment, corrective plan, evidence and verification.",
    provider: "local",
    src: null,
    durationSeconds: 384,
    chapters: [
      { at: 0, label: "Opening the case" },
      { at: 62, label: "Assign and start" },
      { at: 168, label: "Evidence" },
      { at: 265, label: "Verification" },
    ],
    transcript: null,
    isPlaceholder: true,
  },
  {
    id: "vid_copilot",
    title: "Using the AI Copilot",
    description: "What it can answer, and how to read a grounded response.",
    provider: "local",
    src: null,
    durationSeconds: 246,
    chapters: [
      { at: 0, label: "Case scope" },
      { at: 96, label: "Portfolio scope" },
      { at: 178, label: "When it refuses" },
    ],
    transcript: null,
    isPlaceholder: true,
  },
];

import type { Plant, User } from "@/src/domain/types";

/**
 * Seeded organisation — **Perma Construction Aids**, an Indian
 * construction-chemicals manufacturer with four production sites.
 *
 * Product lines: waterproofing chemicals, concrete admixtures, repair
 * chemicals and tile adhesives. Every site runs the same functional model —
 * procurement, production, quality, supply chain, logistics and customer
 * service — which is why one exception type reads the same way at any of them.
 */
export const PLANTS: Plant[] = [
  {
    id: "plt_vp01",
    code: "VP01",
    name: "Vapi",
    country: "India",
    countryCode: "IN",
    timezone: "Asia/Kolkata",
  },
  {
    id: "plt_rk01",
    code: "RK01",
    name: "Roorkee",
    country: "India",
    countryCode: "IN",
    timezone: "Asia/Kolkata",
  },
  {
    id: "plt_hy01",
    code: "HY01",
    name: "Hyderabad",
    country: "India",
    countryCode: "IN",
    timezone: "Asia/Kolkata",
  },
];

export const PLANT_BY_CODE: Record<string, Plant> = Object.fromEntries(
  PLANTS.map((p) => [p.code, p]),
);

const ALL_SITES = ["VP01", "RK01", "HY01"];

export const USERS: User[] = [
  {
    id: "usr_rmenon",
    email: "rajesh.menon@permaconstructionaids.com",
    name: "Rajesh Menon",
    role: "EXECUTIVE",
    jobTitle: "Supply Chain Head",
    plantScope: ALL_SITES,
    isActive: true,
  },
  {
    id: "usr_ndeshpande",
    email: "neha.deshpande@permaconstructionaids.com",
    name: "Neha Deshpande",
    role: "OPS_MANAGER",
    jobTitle: "Head of Operations",
    plantScope: ALL_SITES,
    isActive: true,
  },
  {
    id: "usr_sjoshi",
    email: "sunil.joshi@permaconstructionaids.com",
    name: "Sunil Joshi",
    role: "OPS_MANAGER",
    jobTitle: "Plant Operations Manager — Vapi",
    plantScope: ["VP01"],
    isActive: true,
  },
  {
    id: "usr_aiyer",
    email: "arun.iyer@permaconstructionaids.com",
    name: "Arun Iyer",
    role: "TASK_OWNER",
    jobTitle: "Procurement Manager",
    plantScope: ["VP01", "RK01"],
    isActive: true,
  },
  {
    id: "usr_kbhatt",
    email: "kavita.bhatt@permaconstructionaids.com",
    name: "Kavita Bhatt",
    role: "TASK_OWNER",
    jobTitle: "Quality Manager",
    plantScope: ["VP01", "HY01"],
    isActive: true,
  },
  {
    id: "usr_vrane",
    email: "vikram.rane@permaconstructionaids.com",
    name: "Vikram Rane",
    role: "TASK_OWNER",
    jobTitle: "Production Manager — Vapi",
    plantScope: ["VP01"],
    isActive: true,
  },
  {
    id: "usr_mpillai",
    email: "meera.pillai@permaconstructionaids.com",
    name: "Meera Pillai",
    role: "TASK_OWNER",
    jobTitle: "Logistics Lead",
    plantScope: ["HY01"],
    isActive: true,
  },
  {
    id: "usr_agupta",
    email: "ananya.gupta@permaconstructionaids.com",
    name: "Ananya Gupta",
    role: "ANALYST",
    jobTitle: "Supply Chain Analyst",
    plantScope: ALL_SITES,
    isActive: true,
  },
  {
    id: "usr_pnair",
    email: "prakash.nair@permaconstructionaids.com",
    name: "Prakash Nair",
    role: "ADMINISTRATOR",
    jobTitle: "Platform Administrator",
    plantScope: ALL_SITES,
    isActive: true,
  },
];

export const USER_BY_ID: Record<string, User> = Object.fromEntries(
  USERS.map((u) => [u.id, u]),
);

/** The persona the demo signs in as by default — the walkthrough opens on the
 *  Supply Chain Head, because the story starts with "which plant needs me?". */
export const DEFAULT_SESSION_USER_ID = "usr_rmenon";

/** Personas offered on the login screen and in the role switcher. One per
 *  role in the demo narrative: who asks, who triages, who executes, who runs
 *  the platform. */
export const DEMO_PERSONAS = [
  "usr_rmenon",
  "usr_ndeshpande",
  "usr_aiyer",
  // The reviewer has to be presentable, not just named. `reviewerFor()` routes a
  // Vapi case to its plant manager, and the verification card tells the reader
  // "only Sunil Joshi can record the decision — switch persona to review it". A
  // reviewer absent from this list makes that instruction impossible to follow
  // and strands the demo one step before the decision it exists to show.
  "usr_sjoshi",
  "usr_pnair",
] as const;

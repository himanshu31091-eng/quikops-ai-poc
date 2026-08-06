import type { Plant, User } from "@/src/domain/types";

/**
 * Seeded organisation. Modelled on a tier-one automotive and aerospace
 * components manufacturer with four production sites.
 */
export const PLANTS: Plant[] = [
  {
    id: "plt_mx01",
    code: "MX01",
    name: "Querétaro",
    country: "Mexico",
    countryCode: "MX",
    timezone: "America/Mexico_City",
  },
  {
    id: "plt_us01",
    code: "US01",
    name: "Greenville",
    country: "United States",
    countryCode: "US",
    timezone: "America/New_York",
  },
  {
    id: "plt_de01",
    code: "DE01",
    name: "Ingolstadt",
    country: "Germany",
    countryCode: "DE",
    timezone: "Europe/Berlin",
  },
  {
    id: "plt_in01",
    code: "IN01",
    name: "Pune",
    country: "India",
    countryCode: "IN",
    timezone: "Asia/Kolkata",
  },
];

export const PLANT_BY_CODE: Record<string, Plant> = Object.fromEntries(
  PLANTS.map((p) => [p.code, p]),
);

export const USERS: User[] = [
  {
    id: "usr_evasquez",
    email: "elena.vasquez@northbridge-industrial.com",
    name: "Elena Vásquez",
    role: "EXECUTIVE",
    jobTitle: "Chief Operating Officer",
    plantScope: ["MX01", "US01", "DE01", "IN01"],
    isActive: true,
  },
  {
    id: "usr_mreinhardt",
    email: "marcus.reinhardt@northbridge-industrial.com",
    name: "Marcus Reinhardt",
    role: "OPS_MANAGER",
    jobTitle: "VP Global Operations",
    plantScope: ["MX01", "US01", "DE01", "IN01"],
    isActive: true,
  },
  {
    id: "usr_psharma",
    email: "priya.sharma@northbridge-industrial.com",
    name: "Priya Sharma",
    role: "OPS_MANAGER",
    jobTitle: "Plant Operations Manager — Querétaro",
    plantScope: ["MX01"],
    isActive: true,
  },
  {
    id: "usr_cmendoza",
    email: "carlos.mendoza@northbridge-industrial.com",
    name: "Carlos Mendoza",
    role: "TASK_OWNER",
    jobTitle: "Procurement Manager — Americas",
    plantScope: ["MX01", "US01"],
    isActive: true,
  },
  {
    id: "usr_tberger",
    email: "thomas.berger@northbridge-industrial.com",
    name: "Thomas Berger",
    role: "TASK_OWNER",
    jobTitle: "Senior Production Planner",
    plantScope: ["DE01"],
    isActive: true,
  },
  {
    id: "usr_aokonkwo",
    email: "aisha.okonkwo@northbridge-industrial.com",
    name: "Aisha Okonkwo",
    role: "TASK_OWNER",
    jobTitle: "Logistics Lead",
    plantScope: ["MX01", "US01"],
    isActive: true,
  },
  {
    id: "usr_dkim",
    email: "daniel.kim@northbridge-industrial.com",
    name: "Daniel Kim",
    role: "ANALYST",
    jobTitle: "Supply Chain Analyst",
    plantScope: ["MX01", "US01", "DE01", "IN01"],
    isActive: true,
  },
  {
    id: "usr_swhitfield",
    email: "sandra.whitfield@northbridge-industrial.com",
    name: "Sandra Whitfield",
    role: "ADMINISTRATOR",
    jobTitle: "Platform Administrator",
    plantScope: ["MX01", "US01", "DE01", "IN01"],
    isActive: true,
  },
];

export const USER_BY_ID: Record<string, User> = Object.fromEntries(
  USERS.map((u) => [u.id, u]),
);

/** The persona the demo signs in as by default. */
export const DEFAULT_SESSION_USER_ID = "usr_evasquez";

/** Personas offered on the login screen and in the role switcher. */
export const DEMO_PERSONAS = [
  "usr_evasquez",
  "usr_mreinhardt",
  "usr_cmendoza",
  "usr_swhitfield",
] as const;

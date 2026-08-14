import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

/**
 * The Prisma client, and the switch that decides whether anything uses it.
 *
 * `USE_DATABASE` defaults to **off**. The application keeps reading fixtures
 * unless someone explicitly turns the database on, because a half-migrated read
 * path that silently becomes authoritative is how a demo breaks in front of a
 * client. Turning it on is a deliberate act, per environment.
 *
 * Prisma 7 requires a driver adapter — `new PrismaClient()` alone throws.
 *
 * The client is cached on `globalThis` so Next's dev-mode module reloading does
 * not open a new connection pool on every edit, which exhausts Neon's limit.
 */
export const USE_DATABASE = process.env.USE_DATABASE === "true";

declare global {
  var __quikopsPrisma: PrismaClient | undefined;
}

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "USE_DATABASE is true but DATABASE_URL is not set. Set it in .env.local, or unset USE_DATABASE to fall back to fixtures.",
    );
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

export function getPrisma(): PrismaClient {
  if (!globalThis.__quikopsPrisma) globalThis.__quikopsPrisma = createClient();
  return globalThis.__quikopsPrisma;
}

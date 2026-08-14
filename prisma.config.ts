import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Next.js loads `.env.local` itself, but `prisma migrate` and the seed run as
// plain CLI processes outside that loader, and the Prisma CLI only auto-loads
// `.env`. Without this the URL below is undefined at migration time.
//
// `.env.local` rather than `.env` deliberately: one file holds the credential,
// and it is the one already gitignored.
config({ path: ".env.local" });

/**
 * Prisma 7 reads the connection URL from here rather than from schema.prisma.
 *
 * The value comes from the environment and is never written into a file that
 * is committed. `DATABASE_URL` points at Neon; see .env.example.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "node prisma/seed.mjs",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});

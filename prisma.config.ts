import { defineConfig } from "prisma/config";

/**
 * Prisma 7 reads the connection URL from here rather than from schema.prisma.
 *
 * The value comes from the environment and is never written into a file that
 * is committed.  points at Neon; see .env.example.
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

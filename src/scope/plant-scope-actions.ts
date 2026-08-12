"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { PLANT_BY_CODE } from "@/src/data/fixtures/organisation";
import { ALL_PLANTS, PLANT_SCOPE_COOKIE } from "./plant-scope-shared";

const ONE_DAY_SECONDS = 60 * 60 * 24;

/**
 * Sets the plant scope and revalidates the tree.
 *
 * The revalidate is the whole point: every KPI, chart and table below the
 * layout is server-rendered from the scoped corpus, so the scope changing has
 * to re-run them. Without it the cookie would move and the screen would not,
 * which is the failure this replaced.
 */
export async function setPlantScope(scope: string): Promise<void> {
  const valid = scope === ALL_PLANTS || Boolean(PLANT_BY_CODE[scope]);
  if (!valid) return;

  const store = await cookies();
  store.set(PLANT_SCOPE_COOKIE, scope, {
    sameSite: "lax",
    path: "/",
    maxAge: ONE_DAY_SECONDS,
  });
  revalidatePath("/", "layout");
}

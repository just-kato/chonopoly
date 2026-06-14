/**
 * One-time script to reset all Plaid item cursors to null.
 *
 * Run once after deploying the /transactions/sync migration. This forces a
 * full re-sync on the next Refresh so the DB is consistent with the new endpoint.
 *
 *   npx tsx scripts/reset-plaid-cursors.ts
 *
 * Required env vars (in .env.local or shell):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Load .env.local (dotenv is not a direct dep; parse manually)
try {
  const env = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of env.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!(key in process.env)) process.env[key] = val;
  }
} catch { /* .env.local not present — rely on shell env */ }

import { createClient } from "@supabase/supabase-js";

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  const { data: items, error } = await db
    .from("plaid_items")
    .select("item_id, institution_name, user_id");

  if (error) {
    console.error("Failed to fetch plaid_items:", error.message);
    process.exit(1);
  }

  if (!items?.length) {
    console.log("No plaid_items found.");
    return;
  }

  console.log(`Resetting cursors for ${items.length} item(s)...`);

  const { error: updateError } = await db
    .from("plaid_items")
    .update({ transactions_cursor: null })
    .not("id", "is", null);

  if (updateError) {
    console.error("Failed to reset cursors:", updateError.message);
    process.exit(1);
  }

  for (const item of items) {
    console.log(`  ✓ ${item.institution_name ?? item.item_id} (user: ${item.user_id})`);
  }

  console.log("Done. Next Refresh will perform a full re-sync via /transactions/sync.");
}

run();

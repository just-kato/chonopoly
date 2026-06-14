/**
 * One-time script to register the webhook URL on all existing Plaid items.
 *
 * Existing items were connected before the webhook field was added to
 * create-link-token. New connections register automatically; this backfills
 * the rest.
 *
 * Run once after deploying with NEXT_PUBLIC_APP_URL set:
 *   NEXT_PUBLIC_APP_URL=https://your-domain.com npx tsx scripts/register-plaid-webhooks.ts
 *
 * Required env vars (in .env.local or passed inline):
 *   NEXT_PUBLIC_APP_URL
 *   PLAID_CLIENT_ID
 *   PLAID_SECRET
 *   PLAID_ENV
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import "dotenv/config";
import { Configuration, PlaidApi, PlaidEnvironments } from "plaid";
import { createClient } from "@supabase/supabase-js";

const appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (!appUrl) {
  console.error("ERROR: NEXT_PUBLIC_APP_URL is not set");
  process.exit(1);
}

const webhookUrl = `${appUrl}/api/plaid/webhook`;

const env = (process.env.PLAID_ENV ?? "sandbox") as keyof typeof PlaidEnvironments;
const plaid = new PlaidApi(
  new Configuration({
    basePath: PlaidEnvironments[env],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": process.env.PLAID_CLIENT_ID,
        "PLAID-SECRET": process.env.PLAID_SECRET,
      },
    },
  })
);

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function run() {
  console.log(`Registering webhook: ${webhookUrl}`);

  const { data: items, error } = await db
    .from("plaid_items")
    .select("item_id, access_token, institution_name, user_id");

  if (error) {
    console.error("Failed to fetch plaid_items:", error.message);
    process.exit(1);
  }

  if (!items?.length) {
    console.log("No plaid_items found.");
    return;
  }

  console.log(`Found ${items.length} item(s). Updating webhooks...`);

  for (const item of items) {
    try {
      await plaid.itemWebhookUpdate({
        access_token: item.access_token as string,
        webhook: webhookUrl,
      });
      console.log(`  ✓ ${item.institution_name ?? item.item_id} (user: ${item.user_id})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`  ✗ ${item.institution_name ?? item.item_id}: ${msg}`);
    }
  }

  console.log("Done.");
}

run();

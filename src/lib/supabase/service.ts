import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env, isServiceRoleConfigured } from "@/lib/env";

/**
 * Service-role Supabase client. Bypasses RLS entirely — server-only, never
 * bundled into client code (the `server-only` import enforces this at build
 * time). Used exclusively for the two public-facing operations that must
 * work without a signed-in owner session:
 *   1. Creating a customer order from the public storefront (prices/totals
 *      are always computed server-side, never trusted from the browser).
 *   2. Looking up an order by its unguessable status token.
 *
 * Everywhere else, prefer the request-scoped server client so RLS keeps
 * enforcing the owner boundary.
 */
export function createSupabaseServiceClient() {
  if (!isServiceRoleConfigured()) {
    throw new Error(
      "Supabase service role is not configured. Set SUPABASE_SERVICE_ROLE_KEY in your environment."
    );
  }

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

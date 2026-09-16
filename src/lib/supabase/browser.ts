"use client";

import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Browser-side Supabase client (anon key only). Used for owner sign-in and
 * for read-only realtime subscriptions on the dashboard. Never import the
 * service-role client into a client component.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}

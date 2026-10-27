import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Client con service role: ignora le RLS.
 * Usarlo SOLO lato server e solo dopo aver verificato i permessi
 * (webhook Stripe, URL firmati per i download, notifiche).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/types/database";

export function createSupabaseBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Brak konfiguracji Supabase (URL / publishable key)");

  return createBrowserClient<Database>(url, key);
}

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (isNewSupabaseApiKey(supabaseKey) && headers.get("Authorization") === `Bearer ${supabaseKey}`) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  if (!url) throw new Error("Brak NEXT_PUBLIC_SUPABASE_URL");
  return url;
}

export function createSupabaseAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Brak SUPABASE_SERVICE_ROLE_KEY");

  return createClient<Database>(getSupabaseUrl(), key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let _admin: ReturnType<typeof createSupabaseAdminClient> | undefined;

export function getSupabaseAdmin() {
  if (!_admin) _admin = createSupabaseAdminClient();
  return _admin;
}

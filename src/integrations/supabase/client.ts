import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client";

let client: ReturnType<typeof createBrowserSupabaseClient> | undefined;

export function getSupabaseClient() {
  if (typeof window === "undefined") {
    throw new Error("Supabase browser client is not available during SSR");
  }
  if (!client) {
    client = createBrowserSupabaseClient();
  }
  return client;
}

// Lazy proxy so importing the module during SSR does not instantiate the client
export const supabase = new Proxy({} as ReturnType<typeof createBrowserSupabaseClient>, {
  get(_target, prop) {
    return getSupabaseClient()[prop as keyof ReturnType<typeof createBrowserSupabaseClient>];
  },
});

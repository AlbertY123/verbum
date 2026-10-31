import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// The publishable/anon key is intentionally public. Row-level security, rather
// than secrecy of this key, protects every learner's records. Never use a
// service-role key in a VITE_ environment variable.
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // Both providers return a `code`; only Supabase may consume its own.
          detectSessionInUrl:
            typeof window === "undefined" ||
            new URLSearchParams(window.location.search).get("ai_provider") !==
              "openrouter",
          flowType: "pkce",
        },
      })
    : null;

export const cloudEnabled = Boolean(supabase);

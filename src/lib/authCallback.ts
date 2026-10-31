const authParameters = [
  "code",
  "sb_flow_id",
  "error",
  "error_code",
  "error_description",
  "error_uri",
  "access_token",
  "refresh_token",
  "provider_token",
  "provider_refresh_token",
  "expires_in",
  "expires_at",
  "token_type",
];

export interface AuthCallback {
  present: boolean;
  cancelled: boolean;
  hasError: boolean;
  hasCode: boolean;
}

/** Inspect only flags: never retain or display callback credentials/descriptions. */
export function inspectAuthCallback(url: URL): AuthCallback {
  if (url.searchParams.get("ai_provider") === "openrouter")
    return {
      present: false,
      cancelled: false,
      hasError: false,
      hasCode: false,
    };
  const hash = new URLSearchParams(url.hash.slice(1));
  const has = (key: string) => url.searchParams.has(key) || hash.has(key);
  const cancelled = [url.searchParams, hash].some(
    (params) => params.get("error") === "access_denied",
  );
  return {
    present: authParameters.some(has),
    cancelled,
    hasError: ["error", "error_code", "error_description"].some(has),
    hasCode: has("code"),
  };
}

export function authCallbackMessage(
  callback: AuthCallback,
  failed: boolean,
): string {
  if (!callback.present) return "";
  if (callback.cancelled)
    return "Sign-in was cancelled. Your saved progress is still on this device. You can try again whenever you are ready.";
  if (callback.hasError || failed)
    return "Sign-in could not be completed. The link may have expired or belong to another browser. Start sign-in again here. Your saved progress is still on this device.";
  return "";
}

/** Call only after Supabase has finished consuming its callback. */
export function cleanAuthCallbackUrl(current: URL): string {
  const url = new URL(current.href);
  if (url.searchParams.get("ai_provider") !== "openrouter") {
    const hash = new URLSearchParams(url.hash.slice(1));
    const authHash = authParameters.some((key) => hash.has(key));
    for (const key of authParameters) {
      url.searchParams.delete(key);
      if (authHash) hash.delete(key);
    }
    if (authHash) url.hash = hash.toString();
  }
  return `${url.pathname}${url.search}${url.hash}`;
}

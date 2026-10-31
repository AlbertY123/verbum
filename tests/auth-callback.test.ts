import { describe, expect, it } from "vitest";
import {
  authCallbackMessage,
  cleanAuthCallbackUrl,
  inspectAuthCallback,
} from "../src/lib/authCallback";

describe("account sign-in callback recovery", () => {
  it.each([
    "https://verbum.example/?error=access_denied&error_description=private-provider-detail#settings",
    "https://verbum.example/#error=access_denied&error_description=private-provider-detail",
  ])(
    "recognises cancellation without displaying provider details: %s",
    (href) => {
      const callback = inspectAuthCallback(new URL(href));
      const message = authCallbackMessage(callback, true);
      expect(message).toContain("Sign-in was cancelled");
      expect(message).not.toContain("private-provider-detail");
    },
  );

  it("reports failed code exchanges while a successfully consumed code needs no warning", () => {
    const callback = inspectAuthCallback(
      new URL("https://verbum.example/?code=one-use-secret"),
    );
    expect(callback).toEqual({
      present: true,
      cancelled: false,
      hasError: false,
      hasCode: true,
    });
    expect(authCallbackMessage(callback, true)).toContain(
      "Start sign-in again here",
    );
    expect(authCallbackMessage(callback, false)).toBe("");
  });

  it("removes callback credentials while preserving the app route and unrelated query", () => {
    const href =
      "https://verbum.example/?code=secret&sb_flow_id=flow&error_description=private&keep=1#settings";
    expect(cleanAuthCallbackUrl(new URL(href))).toBe("/?keep=1#settings");
    const hash = new URL(
      "https://verbum.example/#access_token=secret&refresh_token=private&provider_token=provider&expires_in=3600&error=server_error",
    );
    expect(cleanAuthCallbackUrl(hash)).toBe("/");
  });

  it("leaves OpenRouter callbacks to the separate AI connection handler", () => {
    const url = new URL(
      "https://verbum.example/?ai_provider=openrouter&code=ai-code&state=ai-state&error=access_denied",
    );
    expect(inspectAuthCallback(url).present).toBe(false);
    expect(authCallbackMessage(inspectAuthCallback(url), true)).toBe("");
    expect(cleanAuthCallbackUrl(url)).toBe(url.pathname + url.search);
  });

  it("does not treat an ordinary app route as an account callback", () => {
    const url = new URL("https://verbum.example/#settings");
    expect(inspectAuthCallback(url).present).toBe(false);
    expect(cleanAuthCallbackUrl(url)).toBe("/#settings");
  });
});

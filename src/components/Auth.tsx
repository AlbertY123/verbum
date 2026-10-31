import { useState } from "react";
import { ArrowRight, Cloud, Mail } from "lucide-react";
import { Modal } from "./Modal";
import { supabase } from "../lib/supabase";
export function Auth({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const emailEnabled = import.meta.env.VITE_EMAIL_AUTH_ENABLED === "true";
  async function google() {
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: location.origin },
      });
      if (error) throw error;
    } catch {
      setMessage(
        "Could not open Google sign-in. Check your connection and try again. Your saved progress is still on this device.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setMessage("");
    try {
      const result =
        mode === "reset"
          ? await supabase.auth.resetPasswordForEmail(email, {
              redirectTo: `${location.origin}/?reset_password=1`,
            })
          : mode === "signup"
            ? await supabase.auth.signUp({
                email,
                password,
                options: { emailRedirectTo: location.origin },
              })
            : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (mode === "login") onClose();
      else
        setMessage(
          mode === "reset"
            ? "If an account exists, a password-reset link will arrive shortly."
            : "Check your email to confirm your account, then return to sign in.",
        );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Sign-in failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Make your words yours." onClose={onClose}>
      <div className="auth-illustration">
        <Cloud size={32} />
      </div>
      <p className="muted">
        Create a free account to keep your vocabulary, writing and progress
        together across devices.
      </p>
      {supabase ? (
        <>
          <button className="button full" onClick={google} disabled={busy}>
            <span className="google-g">G</span> Continue with Google{" "}
            <ArrowRight size={16} />
          </button>
          {emailEnabled && (
            <>
              <div className="divider-text">or use your email</div>
              <form onSubmit={submit} className="form-stack">
                <label>
                  Email address
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    required
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </label>
                {mode !== "reset" && (
                  <label>
                    Password
                    <input
                      type="password"
                      autoComplete={
                        mode === "signup" ? "new-password" : "current-password"
                      }
                      value={password}
                      minLength={12}
                      maxLength={128}
                      required
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </label>
                )}
                <button className="button primary" disabled={busy}>
                  <Mail size={16} />
                  {busy
                    ? "Please wait…"
                    : mode === "login"
                      ? "Sign in"
                      : mode === "signup"
                        ? "Create account"
                        : "Send reset link"}
                </button>
              </form>
              <div className="auth-links">
                <button
                  className="text-button"
                  onClick={() =>
                    setMode(mode === "signup" ? "login" : "signup")
                  }
                >
                  {mode === "signup"
                    ? "Already have an account?"
                    : "Create an account"}
                </button>
                <button
                  className="text-button"
                  onClick={() => setMode("reset")}
                >
                  Forgot password?
                </button>
              </div>
            </>
          )}
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
        </>
      ) : (
        <div className="notice">
          <strong>Device mode is ready to use.</strong>
          <p>
            Account sync will be available once this installation’s database is
            connected. Your learning is saved in this browser in the meantime.
          </p>
          <button className="button primary" onClick={onClose}>
            Keep learning <ArrowRight size={16} />
          </button>
        </div>
      )}
      <p className="fine-print">
        No subscription required. AI connections are optional and separate from
        your Verbum account.
      </p>
    </Modal>
  );
}

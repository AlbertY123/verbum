import { useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { LearnerState } from "../types";
import { emptyState, isLearnerState, mergeStates } from "./learning";
import { supabase } from "./supabase";
import { disconnectAI } from "./ai";
import { saveLearnerSnapshot } from "./sync";
import {
  authCallbackMessage,
  cleanAuthCallbackUrl,
  inspectAuthCallback,
} from "./authCallback";

const key = (id: string) => `verbum.learner.v1.${id}`;
function read(id: string): LearnerState | null {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key(id)) || "null");
    return isLearnerState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
function persist(id: string, state: LearnerState): boolean {
  try {
    localStorage.setItem(key(id), JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}
const fingerprint = (state: LearnerState) => JSON.stringify(state);
function setAIIdentity(id: string) {
  try {
    const previous = sessionStorage.getItem("verbum.ai.owner");
    if (previous !== null && previous !== id) disconnectAI();
    sessionStorage.setItem("verbum.ai.owner", id);
  } catch {
    disconnectAI();
  }
}

export function useLearner() {
  const [state, setState] = useState<LearnerState>(
    () => read("guest") ?? emptyState(),
  );
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(!supabase);
  const [sync, setSync] = useState("Saved on this device");
  const [error, setError] = useState("");
  const [authError, setAuthError] = useState("");
  const [authCallback] = useState(() =>
    inspectAuthCallback(new URL(location.href)),
  );
  const [retry, setRetry] = useState(0);
  const [saveTick, setSaveTick] = useState(0);
  const identity = useRef("guest");
  const cloudReady = useRef(false);
  const revision = useRef(0);
  const synced = useRef("");
  const latest = useRef(state);
  const readyRef = useRef(ready);
  const loadingGeneration = useRef(0);
  const writeInFlight = useRef<Promise<void> | null>(null);
  const accountClosing = useRef(false);
  const signOutNotice = useRef("");
  latest.current = state;
  readyRef.current = ready;

  useEffect(() => {
    if (!supabase || !authCallback.present) return;
    let active = true;
    const finish = (failed: boolean) => {
      if (!active) return;
      const current = new URL(location.href);
      // With no PKCE verifier (for example, a different browser), the SDK may
      // ignore the code without returning an error. An unconsumed code failed.
      const unconsumedCode =
        authCallback.hasCode && inspectAuthCallback(current).hasCode;
      setAuthError(authCallbackMessage(authCallback, failed || unconsumedCode));
      history.replaceState(history.state, "", cleanAuthCallbackUrl(current));
    };
    // getSession() does not expose callback initialization errors. Observe the
    // SDK's existing initialization promise without exchanging the code twice.
    void supabase.auth
      .initialize()
      .then(({ error: failure }) => finish(Boolean(failure)))
      .catch(() => finish(true));
    return () => {
      active = false;
    };
  }, [authCallback]);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let cancelled = false;
    let authEvents = 0;
    // Effect-local markers are reset by StrictMode's setup/cleanup cycle.
    let loadedId: string | null = null;
    let pendingId: string | null = null;

    async function load(nextUser: User | null) {
      const id = nextUser?.id ?? "guest";
      if (pendingId === id || loadedId === id) {
        setUser(nextUser);
        return;
      }
      pendingId = id;
      const changed = identity.current !== id;
      const existingLocal = changed
        ? read(id)
        : readyRef.current
          ? latest.current
          : read(id);
      setAIIdentity(id);
      identity.current = id;
      cloudReady.current = false;
      accountClosing.current = false;
      revision.current = 0;
      synced.current = "";
      const ownGeneration = ++loadingGeneration.current;
      readyRef.current = false;
      setReady(false);
      setUser(nextUser);
      let local = existingLocal ?? emptyState();
      try {
        if (nextUser) {
          signOutNotice.current = "";
          setSync("Connecting to your account…");
          const result = await client
            .from("learner_state")
            .select("state,revision")
            .eq("user_id", id)
            .maybeSingle();
          if (cancelled || ownGeneration !== loadingGeneration.current) return;
          if (result.error)
            throw new Error(
              "Cloud progress could not be loaded. You can keep learning on this device and retry syncing.",
            );
          if (result.data) {
            if (
              !isLearnerState(result.data.state) ||
              !Number.isSafeInteger(result.data.revision)
            ) {
              throw new Error(
                "Your cloud record could not be read safely. Local progress is preserved.",
              );
            }
            // A new device has no local timestamp; it must not replace cloud
            // preferences with a freshly-created empty state.
            local = existingLocal
              ? mergeStates(existingLocal, result.data.state)
              : result.data.state;
            revision.current = result.data.revision;
            synced.current = fingerprint(result.data.state);
          } else if (!existingLocal) {
            local = read("guest") ?? local;
          }
          cloudReady.current = true;
          setSync("Account connected");
          setError("");
        } else {
          setSync(
            signOutNotice.current
              ? "Signed out · see sync notice"
              : "Saved on this device",
          );
          setError(signOutNotice.current);
        }
      } catch (failure) {
        if (cancelled || ownGeneration !== loadingGeneration.current) return;
        setError(
          failure instanceof Error
            ? failure.message
            : "Could not connect to your account. Please retry.",
        );
        setSync("Saved on this device · sync paused");
      }
      if (cancelled || ownGeneration !== loadingGeneration.current) return;
      loadedId = id;
      pendingId = null;
      latest.current = local;
      setState(local);
      readyRef.current = true;
      setReady(true);
    }

    const { data } = client.auth.onAuthStateChange((event, session) => {
      authEvents++;
      if (event === "SIGNED_IN") setAuthError("");
      setTimeout(() => {
        if (!cancelled) void load(session?.user ?? null);
      }, 0);
    });
    const initialAuthEvents = authEvents;
    void client.auth
      .getSession()
      .then(({ data: sessionData, error: authError }) => {
        if (cancelled || authEvents !== initialAuthEvents) return;
        if (authError)
          setAuthError(
            "Your account could not be restored. Please sign in again. Your saved progress is still on this device.",
          );
        void load(sessionData.session?.user ?? null);
      })
      .catch(() => {
        if (!cancelled && authEvents === initialAuthEvents) {
          void load(null);
          setAuthError(
            "Your account could not be restored. Please sign in again. Your saved progress is still on this device.",
          );
        }
      });
    return () => {
      cancelled = true;
      loadingGeneration.current++;
      data.subscription.unsubscribe();
    };
  }, [retry]);

  useEffect(() => {
    if (!ready) return;
    if (!persist(identity.current, state)) {
      setError(
        "Device storage is full or disabled. Export your progress from Settings to keep a backup.",
      );
    }
    if (!supabase || !user || !cloudReady.current || accountClosing.current)
      return;
    if (fingerprint(state) === synced.current) return;
    const client = supabase;
    const id = user.id;
    const generation = loadingGeneration.current;
    setSync("Saving…");
    const timer = setTimeout(() => {
      if (writeInFlight.current) return; // Its completion schedules the latest snapshot.
      const snapshot = latest.current;
      const current = () =>
        identity.current === id &&
        loadingGeneration.current === generation &&
        !accountClosing.current;
      const operation = (async () => {
        try {
          const saved = await saveLearnerSnapshot(
            client,
            id,
            snapshot,
            revision.current,
            current,
          );
          if (!current()) return;
          revision.current = saved.revision;
          synced.current = fingerprint(saved.state);
          // Retain edits made during the request plus any remote changes.
          const merged =
            latest.current === snapshot
              ? saved.state
              : mergeStates(latest.current, saved.state);
          latest.current = merged;
          setState(merged);
          setSync(
            fingerprint(merged) === synced.current
              ? "All progress synced"
              : "Saving…",
          );
          setError("");
        } catch (failure) {
          if (!current()) return;
          cloudReady.current = false;
          setError(
            failure instanceof Error
              ? failure.message
              : "Cloud sync is unavailable. Your progress is saved on this device.",
          );
          setSync("Saved on this device · sync paused");
        }
      })();
      writeInFlight.current = operation;
      void operation.finally(() => {
        if (writeInFlight.current === operation) writeInFlight.current = null;
        // A new account may already be ready and have skipped its save while
        // this operation occupied the slot. Wake whichever account is current.
        if (readyRef.current) setSaveTick((tick) => tick + 1);
      });
    }, 800);
    return () => {
      clearTimeout(timer);
    };
  }, [state, ready, user, saveTick]);

  const update = useCallback((fn: (s: LearnerState) => LearnerState) => {
    if (!readyRef.current || accountClosing.current) return;
    setState((previous) => {
      const next = { ...fn(previous), updatedAt: new Date().toISOString() };
      latest.current = next;
      if (!persist(identity.current, next))
        setError(
          "Device storage is full or disabled. Export your progress from Settings to keep a backup.",
        );
      return next;
    });
  }, []);

  const retrySync = () => {
    persist(identity.current, latest.current);
    setRetry((value) => value + 1);
  };

  const signOut = async () => {
    // Never leave the previous learner's AI billing credentials available while
    // waiting for the network, including when a progress save fails.
    disconnectAI();
    if (!supabase) return;
    accountClosing.current = true;
    const id = identity.current;
    let unsynced = false;
    let deviceSaved = persist(id, latest.current);
    let globalSignOutFailed = false;
    const boundedSave = async <T>(promise: Promise<T>): Promise<T> => {
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        return await Promise.race([
          promise,
          new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error("Sync timed out")), 5000);
          }),
        ]);
      } finally {
        clearTimeout(timer);
      }
    };
    try {
      try {
        if (writeInFlight.current) await boundedSave(writeInFlight.current);
      } catch {
        unsynced = true;
      }
      if (identity.current !== id) return;
      deviceSaved = persist(id, latest.current);
      if (user && fingerprint(latest.current) !== synced.current) {
        if (cloudReady.current && !unsynced) {
          try {
            const saved = await boundedSave(
              saveLearnerSnapshot(
                supabase,
                id,
                latest.current,
                revision.current,
                () => identity.current === id,
              ),
            );
            revision.current = saved.revision;
            synced.current = fingerprint(saved.state);
            deviceSaved = persist(id, saved.state);
          } catch {
            unsynced = true;
          }
        } else {
          unsynced = true;
        }
      }
      if (identity.current !== id) return;
      const notices: string[] = [];
      if (unsynced)
        notices.push(
          deviceSaved
            ? "Signed out. Some progress is saved only on this device. Sign in here again to finish syncing before clearing browser data."
            : "Signed out. Some recent progress could not be saved or synced because device storage is unavailable.",
        );
      signOutNotice.current = notices.join(" ");
      try {
        const { error: failure } = await supabase.auth.signOut();
        if (failure) globalSignOutFailed = true;
      } catch {
        globalSignOutFailed = true;
      }
      if (globalSignOutFailed) {
        // Current Supabase Auth removes its local session even when revocation
        // fails. Also explicitly request local scope as the supported fallback.
        try {
          await supabase.auth.signOut({ scope: "local" });
        } catch {
          /* Show revocation warning below. */
        }
        notices.push(
          "Other sessions could not be signed out. This device has been disconnected; check your account when you are back online.",
        );
      }
      signOutNotice.current = notices.join(" ");
      if (identity.current === id || identity.current === "guest") {
        loadingGeneration.current++;
        identity.current = "guest";
        cloudReady.current = false;
        revision.current = 0;
        synced.current = "";
        const guest = read("guest") ?? emptyState();
        latest.current = guest;
        setState(guest);
        setUser(null);
        readyRef.current = true;
        setReady(true);
        setSync(
          signOutNotice.current
            ? "Signed out · see sync notice"
            : "Saved on this device",
        );
        setError(signOutNotice.current);
      }
    } finally {
      disconnectAI();
      accountClosing.current = false;
    }
  };

  const deleteAccount = async () => {
    if (!supabase || !user) return;
    accountClosing.current = true;
    const id = user.id;
    try {
      await writeInFlight.current;
      if (identity.current !== id)
        throw new Error("Your account changed. Please open Settings again.");
      const { error: failure } = await supabase.rpc("delete_own_account", {
        p_user_id: id,
      });
      if (failure) throw failure;
      try {
        localStorage.removeItem(key(id));
      } catch {
        /* Cloud deletion succeeded. */
      }
      disconnectAI();
      await supabase.auth.signOut({ scope: "local" });
      setUser(null);
      identity.current = "guest";
      loadingGeneration.current++;
      cloudReady.current = false;
      const guest = read("guest") ?? emptyState();
      latest.current = guest;
      setState(guest);
      setSync("Saved on this device");
    } finally {
      accountClosing.current = false;
    }
  };

  return {
    state,
    update,
    user,
    ready,
    sync,
    error,
    authError,
    clearAuthError: () => setAuthError(""),
    retrySync,
    signOut,
    deleteAccount,
  };
}

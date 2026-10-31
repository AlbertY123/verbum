import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  Download,
  ExternalLink,
  LogOut,
  Plus,
  Sparkles,
  Upload,
} from "lucide-react";
import type { LearnerState, Word } from "../types";
import { categories, isLearnerState, mergeStates } from "../lib/learning";
import {
  connectOpenAI,
  connectOpenRouter,
  disconnectAI,
  generateWords,
  getAIConnection,
  listAIModels,
  parseCustomWords,
  setAIModel,
  type AIModel,
} from "../lib/ai";

export function Settings({
  state,
  update,
  email,
  onAuth,
  onSignOut,
  onDelete,
  onAddWords,
  theme,
  setTheme,
}: {
  state: LearnerState;
  update: (fn: (s: LearnerState) => LearnerState) => void;
  email?: string;
  onAuth: () => void;
  onSignOut: () => Promise<void>;
  onDelete: () => Promise<void>;
  onAddWords: (words: Word[]) => number;
  theme: string;
  setTheme: (theme: string) => void;
}) {
  const [apiKey, setApiKey] = useState("");
  const [connection, setConnection] = useState(getAIConnection);
  const [models, setModels] = useState<AIModel[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsAttempt, setModelsAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [request, setRequest] = useState(
    "Precise verbs for analysing how an author challenges social expectations",
  );
  const [raw, setRaw] = useState("");
  const [candidates, setCandidates] = useState<Word[]>([]);
  const [deleteText, setDeleteText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  useEffect(() => {
    const change = () => setConnection(getAIConnection());
    window.addEventListener("verbum-ai-change", change);
    return () => window.removeEventListener("verbum-ai-change", change);
  }, []);
  useEffect(() => {
    let cancelled = false;
    setModels([]);
    setModelsLoading(connection.connected);
    if (connection.connected) {
      listAIModels()
        .then((result) => {
          if (!cancelled) setModels(result);
        })
        .catch((e) => {
          if (!cancelled) setNotice(e.message);
        })
        .finally(() => {
          if (!cancelled) setModelsLoading(false);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [connection.connected, connection.provider, modelsAttempt]);
  function chooseModel(id: string) {
    try {
      setAIModel(id);
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Could not select this model.",
      );
    }
  }
  async function action(fn: () => Promise<void>) {
    setBusy(true);
    setNotice("");
    try {
      await fn();
    } catch (e) {
      setNotice(
        e instanceof Error
          ? e.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  function exportData() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `verbum-progress-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function importData(file: File) {
    if (file.size > 2000000)
      throw new Error("Choose a Verbum backup smaller than 2 MB.");
    const data: unknown = JSON.parse(await file.text());
    if (!isLearnerState(data))
      throw new Error("This file is not a valid Verbum progress backup.");
    update((s) => mergeStates(s, data));
    setNotice("Backup imported and merged with your current progress.");
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">MAKE ROOM FOR YOUR ROUTINE</span>
          <h1>
            Your preferences<span>.</span>
          </h1>
          <p>Your pace, your words, your choice of tools.</p>
        </div>
      </div>
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <div className="settings-grid">
        <section className="panel">
          <span className="eyebrow">YOUR DAILY PRACTICE</span>
          <h2>A little, every day.</h2>
          <label>
            What should we call you?
            <input
              value={state.name}
              maxLength={40}
              placeholder="Your first name (optional)"
              onChange={(e) => update((s) => ({ ...s, name: e.target.value }))}
            />
          </label>
          <label>
            New words each day{" "}
            <strong className="range-value">{state.dailyGoal}</strong>
            <input
              type="range"
              min={3}
              max={10}
              value={state.dailyGoal}
              onChange={(e) =>
                update((s) => ({ ...s, dailyGoal: Number(e.target.value) }))
              }
            />
          </label>
          <div className="range-labels">
            <span>3 · take it slowly</span>
            <span>10 · stretch yourself</span>
          </div>
          <label>
            Learning focus
            <select
              value={state.focus}
              onChange={(e) =>
                update((s) => ({
                  ...s,
                  focus: e.target.value as LearnerState["focus"],
                }))
              }
            >
              <option>All vocabulary</option>
              {categories.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <p className="fine-print">
            Due reviews always come first, including words outside your current
            focus.
          </p>
          <label>
            Appearance
            <select value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option value="light">Light · paper & ink</option>
              <option value="dark">Dark · evening study</option>
            </select>
          </label>
        </section>
        <section className="panel">
          <span className="eyebrow">YOUR ACCOUNT</span>
          <h2>Keep your progress.</h2>
          <p>
            {email
              ? `Signed in as ${email}`
              : "You’re learning on this device. Sign in to sync your progress across devices."}
          </p>
          {email ? (
            <button
              className="button"
              disabled={busy}
              onClick={() => action(onSignOut)}
            >
              <LogOut size={16} /> Sign out
            </button>
          ) : (
            <button className="button primary" onClick={onAuth}>
              Create a free account <ArrowRight size={16} />
            </button>
          )}
          <hr />
          <h3>Your data belongs to you.</h3>
          <p className="small muted">
            Back up your vocabulary, review history and writing. AI credentials
            are never included.
          </p>
          <div className="action-row">
            <button className="button" onClick={exportData}>
              <Download size={16} /> Export progress
            </button>
            <label className="button upload-label">
              <Upload size={16} /> Import backup
              <input
                type="file"
                accept="application/json,.json"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void action(() => importData(file));
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          {email && (
            <>
              <button
                className="text-button danger-link"
                onClick={() => setConfirmDelete(true)}
              >
                Delete my account and cloud data
              </button>
              {confirmDelete && (
                <div className="danger-box">
                  <p>
                    This permanently deletes your account and its saved cloud
                    progress. Export a backup first if you want to keep it.
                  </p>
                  <label>
                    Type DELETE to confirm
                    <input
                      value={deleteText}
                      onChange={(e) => setDeleteText(e.target.value)}
                    />
                  </label>
                  <div className="action-row">
                    <button
                      className="button danger"
                      disabled={deleteText !== "DELETE" || busy}
                      onClick={() =>
                        action(async () => {
                          await onDelete();
                          setConfirmDelete(false);
                          setNotice(
                            "Your account and cloud data have been deleted.",
                          );
                        })
                      }
                    >
                      Permanently delete
                    </button>
                    <button
                      className="button"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </div>
      <section className="ai-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">OPTIONAL, PERSONAL AI</span>
            <h2>A tutor, on your terms.</h2>
          </div>
          <span className="pill">
            <Sparkles size={13} /> Core learning is always AI-free
          </span>
        </div>
        <div className="settings-grid">
          <section className="panel provider-card">
            <div className="provider-heading">
              <span className="provider-logo">↗</span>
              <div>
                <h3>OpenRouter</h3>
                <span className="small muted">
                  Connect your account · choose your model
                </span>
              </div>
              {connection.provider === "openrouter" && (
                <span className="pill green">
                  <Check size={13} /> Connected
                </span>
              )}
            </div>
            <p>
              Get guided writing feedback and create personal word packs inside
              Verbum. Requests use your own OpenRouter credits and limits.
            </p>
            {connection.provider === "openrouter" ? (
              <>
                <label>
                  AI model
                  <select
                    value={connection.model ?? ""}
                    onChange={(e) => chooseModel(e.target.value)}
                    disabled={modelsLoading || !models.length}
                  >
                    <option value="" disabled>
                      Choose a model before using AI
                    </option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                        {m.promptPrice === 0 && m.completionPrice === 0
                          ? " · Free"
                          : ` · $${(m.promptPrice ?? 0).toFixed(2)} / $${(m.completionPrice ?? 0).toFixed(2)} per 1M tokens`}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="fine-print">
                  Prices are provider-reported USD per million input / output
                  tokens. Free models may have lower limits.
                </p>
                <button
                  className="button"
                  onClick={() => {
                    disconnectAI();
                    setModels([]);
                  }}
                >
                  Disconnect OpenRouter
                </button>
              </>
            ) : (
              <button
                className="button primary"
                disabled={busy}
                onClick={() => action(connectOpenRouter)}
              >
                Connect OpenRouter <ArrowRight size={16} />
              </button>
            )}
            <p className="fine-print">
              Your connection key stays in this tab’s session storage and is
              cleared when you disconnect. On a shared device, disconnect before
              leaving. Submitted text is processed by OpenRouter and its model
              provider.
            </p>
          </section>
          <section className="panel provider-card">
            <div className="provider-heading">
              <span className="provider-logo">
                <Sparkles size={22} />
              </span>
              <div>
                <h3>OpenAI</h3>
                <span className="small muted">Bring your own API key</span>
              </div>
              {connection.provider === "openai" && (
                <span className="pill green">
                  <Check size={13} /> Connected
                </span>
              )}
            </div>
            <p>
              Use your own OpenAI API account for feedback and personal word
              packs. API usage is billed separately from a ChatGPT subscription.
            </p>
            {connection.provider === "openai" ? (
              <>
                <label>
                  AI model
                  <select
                    value={connection.model ?? ""}
                    onChange={(e) => chooseModel(e.target.value)}
                    disabled={modelsLoading || !models.length}
                  >
                    <option value="" disabled>
                      Choose a model
                    </option>
                    {models.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
                <a
                  className="text-button"
                  href="https://developers.openai.com/api/docs/pricing"
                  target="_blank"
                  rel="noreferrer"
                >
                  Check OpenAI API pricing <ExternalLink size={13} />
                </a>
                <div className="action-row">
                  <button
                    className="button"
                    onClick={() => {
                      disconnectAI();
                      setModels([]);
                    }}
                  >
                    Disconnect OpenAI
                  </button>
                </div>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void action(async () => {
                    await connectOpenAI(apiKey);
                    setApiKey("");
                    setNotice(
                      "OpenAI connected. Choose a model to enable AI practice.",
                    );
                  });
                }}
              >
                <label>
                  Your OpenAI API key
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    autoComplete="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    placeholder="sk-..."
                    required
                    maxLength={512}
                  />
                </label>
                <button className="button" disabled={busy || !apiKey.trim()}>
                  Connect OpenAI <ArrowRight size={16} />
                </button>
              </form>
            )}
            <p className="fine-print">
              Your key is held only in this tab's session storage and sent
              directly to OpenAI. Browser extensions or scripts with access to
              this page could read it. Use a restricted project key, set a
              provider budget, and disconnect on shared devices. Never enter
              someone else's key.
            </p>
          </section>
        </div>
      </section>
      <section className="panel custom-words">
        {connection.connected && (
          <p className="small muted" role="status">
            {modelsLoading
              ? "Loading available models…"
              : !models.length
                ? "No models could be loaded."
                : `${models.length} models available.`}{" "}
            {!modelsLoading && !models.length && (
              <button
                className="text-button"
                onClick={() => setModelsAttempt((n) => n + 1)}
              >
                Retry model discovery
              </button>
            )}
          </p>
        )}
        <span className="eyebrow">BUILD YOUR PERSONAL WORD BANK</span>
        <h2>Words for what you’re writing.</h2>
        <p className="muted">
          Tell your tutor what you’re studying. Review its suggestions before
          adding them to your daily learning.
        </p>
        <label htmlFor="word-request">
          What kind of words would help?
          <textarea
            id="word-request"
            rows={2}
            maxLength={1000}
            value={request}
            onChange={(e) => setRequest(e.target.value)}
          />
        </label>
        <div className="action-row">
          <button
            className="button primary"
            disabled={
              busy ||
              !connection.connected ||
              !connection.model ||
              request.trim().length < 10
            }
            onClick={() =>
              action(async () => {
                setCandidates(await generateWords(request));
              })
            }
          >
            <Sparkles size={16} />
            {busy ? "Working…" : "Suggest words with AI"}
          </button>
        </div>
        <details className="import-words">
          <summary>Import a custom word pack (JSON)</summary>
          <label>
            Word pack JSON
            <textarea
              rows={5}
              maxLength={100000}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              placeholder="Paste the structured response here…"
            />
          </label>
          <button
            className="button"
            disabled={!raw.trim() || busy}
            onClick={() =>
              action(async () => {
                setCandidates(parseCustomWords(raw));
                setNotice(
                  "Pack checked. Review the suggestions below before adding them.",
                );
              })
            }
          >
            Preview word pack <ArrowRight size={16} />
          </button>
        </details>
        {candidates.length > 0 && (
          <div className="word-preview">
            <h3>{candidates.length} suggestions to review</h3>
            <p className="fine-print">
              AI-generated content can be inaccurate. Check the definitions and
              examples; remove any unsuitable words.
            </p>
            {candidates.map((w) => (
              <div key={w.id} className="preview-word">
                <div>
                  <h3>{w.word}</h3>
                  <p>{w.definition}</p>
                  <blockquote>{w.example}</blockquote>
                  <p className="small muted">{w.caution}</p>
                </div>
                <button
                  className="text-button"
                  onClick={() =>
                    setCandidates((c) => c.filter((x) => x.id !== w.id))
                  }
                  aria-label={`Remove ${w.word}`}
                >
                  Remove
                </button>
              </div>
            ))}
            <button
              className="button primary"
              onClick={() => {
                const count = onAddWords(candidates);
                setCandidates([]);
                setRaw("");
                setNotice(
                  `${count} new words added to your library. Duplicates were skipped.`,
                );
              }}
            >
              <Plus size={16} /> Add reviewed words
            </button>
          </div>
        )}
      </section>
    </>
  );
}

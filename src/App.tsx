import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  BookMarked,
  BookOpen,
  Bookmark,
  ChartNoAxesCombined,
  CheckCheck,
  Check,
  ChevronRight,
  Cloud,
  ExternalLink,
  Feather,
  Flame,
  GraduationCap,
  Keyboard,
  LayoutDashboard,
  Lightbulb,
  ListChecks,
  Menu,
  Moon,
  Search,
  Settings2,
  Sun,
  Target,
  X,
} from "lucide-react";
import { words as curriculum } from "./data/words";
import type { LearnerState, Word } from "./types";
import {
  categories,
  activityTotal,
  dayKey,
  getQueue,
  recordPractice,
  recordUsage,
  recordReview,
  streak,
} from "./lib/learning";
import { useLearner } from "./lib/useLearner";
import { completeOpenRouterCallback } from "./lib/ai";
import { supabase } from "./lib/supabase";
import { Modal } from "./components/Modal";
import { Auth } from "./components/Auth";
import { Study } from "./components/Study";
import { SentenceStudio, Workshop } from "./components/Workshop";
import { Settings } from "./components/Settings";
import { UsagePractice } from "./components/UsagePractice";

type Page =
  | "today"
  | "library"
  | "writing"
  | "typing"
  | "practice"
  | "choice"
  | "repair"
  | "progress"
  | "settings"
  | "study";
const navigation = [
  { id: "today", label: "My desk", icon: LayoutDashboard },
  { id: "library", label: "Word library", icon: BookOpen },
  { id: "practice", label: "Practice", icon: Feather },
  { id: "progress", label: "My progress", icon: ChartNoAxesCombined },
] as const;
const practiceModes = [
  {
    id: "writing",
    title: "Writing workshop",
    description: "Build a precise analytical sentence with a guided task.",
    icon: Feather,
  },
  {
    id: "typing",
    title: "Sentence studio",
    description: "Practise the rhythm and phrasing of strong essay sentences.",
    icon: Keyboard,
  },
  {
    id: "choice",
    title: "Choose the right word",
    description:
      "Compare close meanings and make a choice that fits the evidence.",
    icon: ListChecks,
  },
  {
    id: "repair",
    title: "Refine the sentence",
    description: "Spot imprecise language and improve how a sentence works.",
    icon: CheckCheck,
  },
] as const;
let callback: Promise<boolean> | undefined;
const getPage = (): Page => {
  const p = location.hash.slice(1);
  return [
    "today",
    "library",
    "writing",
    "typing",
    "practice",
    "choice",
    "repair",
    "progress",
    "settings",
  ].includes(p)
    ? (p as Page)
    : "today";
};
const getTheme = () => {
  try {
    return localStorage.getItem("verbum.theme") ?? "light";
  } catch {
    return "light";
  }
};

export default function App() {
  const learner = useLearner();
  const { state, update, user } = learner;
  const [page, setPage] = useState<Page>(getPage);
  const [theme, setTheme] = useState(getTheme);
  const [menu, setMenu] = useState(false);
  const [auth, setAuth] = useState(false);
  const [onboarding, setOnboarding] = useState(false);
  const [detail, setDetail] = useState<Word | null>(null);
  const [notice, setNotice] = useState("");
  const [policy, setPolicy] = useState<"privacy" | "about" | null>(null);
  const [writingId, setWritingId] = useState<string>();
  const [resetPassword, setResetPassword] = useState(
    new URLSearchParams(location.search).has("reset_password"),
  );
  const [newPassword, setNewPassword] = useState("");
  const words = useMemo(
    () => [
      ...curriculum,
      ...state.customWords.filter(
        (w) =>
          !curriculum.some(
            (c) =>
              c.id === w.id || c.word.toLowerCase() === w.word.toLowerCase(),
          ),
      ),
    ],
    [state.customWords],
  );
  function navigate(next: Page) {
    setPage(next);
    setMenu(false);
    if (next !== "study") location.hash = next;
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  const practicePage = practiceModes.find((mode) => mode.id === page);
  useEffect(() => {
    const title =
      practiceModes.find((mode) => mode.id === page)?.title ??
      navigation.find((item) => item.id === page)?.label ??
      (page === "study" ? "Daily practice" : "Preferences");
    document.title = title + " · Verbum";
  }, [page]);
  useEffect(() => {
    const handler = () => setPage(getPage());
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem("verbum.theme", theme);
    } catch {
      /* Cosmetic preference only. */
    }
  }, [theme]);
  useEffect(() => {
    let active = true;
    callback ??= completeOpenRouterCallback();
    callback
      .then((connected) => {
        if (active && connected) {
          navigate("settings");
          setNotice(
            "OpenRouter connected. Choose a model in your preferences to start using AI.",
          );
        }
      })
      .catch((e) => {
        if (active) setNotice(e.message);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (user) setAuth(false);
  }, [user]);
  useEffect(() => {
    if (!menu) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenu(false);
    };
    const resize = () => {
      if (window.innerWidth > 720) setMenu(false);
    };
    window.addEventListener("keydown", dismiss);
    window.addEventListener("resize", resize);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", dismiss);
      window.removeEventListener("resize", resize);
    };
  }, [menu]);
  const queue = getQueue(words, state);
  const due = queue.filter((w) => state.progress[w.id]).length;
  const newCount = queue.length - due;
  const today = state.activity[dayKey()];
  const learned = Object.keys(state.progress).length;
  const dailyProgress = Math.min(
    100,
    ((today?.newWords ?? 0) / state.dailyGoal) * 100,
  );
  const wordOfDay =
    curriculum[Math.floor(Date.now() / 86400000) % curriculum.length];
  function start() {
    if (!state.onboarded) setOnboarding(true);
    else navigate("study");
  }
  function bookmark(word: Word) {
    update((s) => ({
      ...s,
      saved: s.saved.includes(word.id)
        ? s.saved.filter((id) => id !== word.id)
        : [...s.saved, word.id],
    }));
  }
  function write(word: Word) {
    setWritingId(word.id);
    setDetail(null);
    navigate("writing");
  }
  function addWords(incoming: Word[]) {
    const existing = new Set(words.map((w) => w.word.toLowerCase()));
    const added = incoming
      .filter((w) => {
        if (existing.has(w.word.toLowerCase())) return false;
        existing.add(w.word.toLowerCase());
        return true;
      })
      .slice(0, Math.max(0, 1000 - state.customWords.length));
    update((s) => ({ ...s, customWords: [...s.customWords, ...added] }));
    return added.length;
  }
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="mobile-header">
        <a
          className="brand"
          href="#today"
          onClick={(event) => {
            event.preventDefault();
            navigate("today");
          }}
        >
          <span className="brand-mark">v.</span>verbum
          <span className="brand-period">.</span>
        </a>
        <button
          className="icon-button"
          aria-label={menu ? "Close navigation" : "Open navigation"}
          aria-expanded={menu}
          onClick={() => setMenu(!menu)}
        >
          {menu ? <X /> : <Menu />}
        </button>
      </header>
      {menu && (
        <button
          aria-label="Close navigation"
          className="nav-scrim"
          onClick={() => setMenu(false)}
        />
      )}
      <aside className={`sidebar ${menu ? "is-open" : ""}`}>
        <a
          className="brand"
          href="#today"
          onClick={(event) => {
            event.preventDefault();
            navigate("today");
          }}
        >
          <span className="brand-mark">v.</span>verbum
          <span className="brand-period">.</span>
        </a>
        <span className="sidebar-caption">VCE English</span>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              key={item.id}
              aria-current={
                page === item.id ||
                (item.id === "practice" && practicePage) ||
                (page === "study" && item.id === "today")
                  ? "page"
                  : undefined
              }
              className={`nav-item ${page === item.id || (item.id === "practice" && practicePage) || (page === "study" && item.id === "today") ? "active" : ""}`}
              onClick={() => navigate(item.id)}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
              {item.id === "today" && due > 0 && (
                <span className="nav-count">{due}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button
            className={`nav-item ${page === "settings" ? "active" : ""}`}
            onClick={() => navigate("settings")}
          >
            <Settings2 size={19} />
            <span>Preferences</span>
          </button>
          {user && (
            <button
              className="profile-button"
              onClick={() => navigate("settings")}
            >
              <span className="avatar">
                {state.name ? (
                  state.name[0].toUpperCase()
                ) : (
                  <GraduationCap size={20} />
                )}
              </span>
              <span>
                <strong>{state.name || "My account"}</strong>
                <small>Account connected</small>
              </span>
              <ChevronRight size={15} />
            </button>
          )}
        </div>
      </aside>
      <div className="main-shell" inert={menu || undefined}>
        <div className="topbar">
          <span className="current-page">
            {practicePage ? (
              <>
                <button
                  className="breadcrumb-link"
                  onClick={() => navigate("practice")}
                >
                  Practice
                </button>
                <span aria-hidden="true">/</span>
                {practicePage.title}
              </>
            ) : page === "settings" ? (
              "Preferences"
            ) : page === "study" ? (
              "Daily practice"
            ) : (
              navigation.find((item) => item.id === page)?.label
            )}
          </span>
          <div className="topbar-actions">
            <button
              className="icon-button"
              aria-label={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
              onClick={() => setTheme(theme === "light" ? "dark" : "light")}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            {!user && (
              <button
                className="button small-button"
                onClick={() => setAuth(true)}
              >
                Sign in <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
        <main id="main-content" tabIndex={-1}>
          {notice && (
            <div className="notice app-notice" role="status">
              <span>{notice}</span>
              <button
                className="icon-button"
                aria-label="Dismiss notification"
                onClick={() => setNotice("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {learner.error && (
            <div className="notice app-notice" role="alert">
              <span>{learner.error}</span>
              <button className="text-button" onClick={learner.retrySync}>
                Retry sync
              </button>
            </div>
          )}
          {!learner.ready ? (
            <div className="loading-state">
              <span className="brand-mark">v.</span>
              <p>Opening your learning space…</p>
            </div>
          ) : page === "today" ? (
            <>
              <div className="page-heading dashboard-heading">
                <div>
                  <h1>
                    Find the words{state.name ? ", " + state.name : ""}
                    <span>.</span>
                  </h1>
                  <p>
                    Your daily practice for clearer, more confident writing.
                  </p>
                </div>
                <time className="dashboard-date">
                  {new Date().toLocaleDateString("en-AU", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </time>
              </div>
              <div className="dashboard-hero">
                <section className="daily-card">
                  <div className="hero-top">
                    <span>Daily practice</span>
                    <span>
                      {queue.length
                        ? "About " +
                          Math.max(3, Math.ceil(queue.length * 1.2)) +
                          " minutes"
                        : "All caught up"}
                    </span>
                  </div>
                  <h2>
                    {queue.length ? (
                      <>
                        A few words,
                        <br />a little more confidence.
                      </>
                    ) : (
                      "You’re up to date."
                    )}
                  </h2>
                  <p>
                    {queue.length
                      ? "Recall what you know, then learn something new."
                      : "No words are due right now. Explore the library or try another practice."}
                  </p>
                  <div className="hero-action">
                    <button
                      className="button cream"
                      onClick={queue.length ? start : () => navigate("library")}
                    >
                      {queue.length
                        ? learned
                          ? "Continue learning"
                          : "Start today’s practice"
                        : "Explore the library"}
                      <ArrowRight size={17} />
                    </button>
                    <span>
                      {newCount} new <span className="dot-separator">·</span>{" "}
                      {due} to review
                    </span>
                  </div>
                  <div className="daily-goal">
                    <div>
                      <span>Daily goal</span>
                      <span>
                        {today?.newWords ?? 0} / {state.dailyGoal} new words
                      </span>
                    </div>
                    <div className="progress-track">
                      <span style={{ width: dailyProgress + "%" }} />
                    </div>
                  </div>
                </section>
                <section className="word-of-day">
                  <span className="word-spotlight-label">Word of the day</span>
                  <h2 className="word-day-title">{wordOfDay.word}</h2>
                  <span className="part-of-speech">
                    {wordOfDay.partOfSpeech}
                  </span>
                  <p>{wordOfDay.definition}</p>
                  <blockquote>{wordOfDay.example}</blockquote>
                  <button
                    className="text-button"
                    onClick={() => setDetail(wordOfDay)}
                  >
                    Explore word <ArrowRight size={15} />
                  </button>
                </section>
              </div>
              <div
                className="dashboard-summary"
                aria-label="Your learning summary"
              >
                <span>
                  <BookMarked size={17} />
                  <strong>{learned}</strong> words introduced
                </span>
                {streak(state) > 0 && (
                  <span>
                    <Flame size={17} />
                    <strong>{streak(state)}</strong> day streak
                  </span>
                )}
                <button
                  className="text-button"
                  onClick={() => navigate("progress")}
                >
                  View progress <ArrowRight size={14} />
                </button>
              </div>
              <section className="practice-section">
                <div className="section-heading">
                  <h2>Put your words to work.</h2>
                </div>
                <div className="practice-grid">
                  {practiceModes.map((mode) => (
                    <button
                      key={mode.id}
                      className="practice-card"
                      onClick={() => navigate(mode.id)}
                    >
                      <span className="practice-icon">
                        <mode.icon size={22} />
                      </span>
                      <div>
                        <h3>{mode.title}</h3>
                        <p>{mode.description}</p>
                      </div>
                      <ArrowRight className="practice-arrow" size={18} />
                    </button>
                  ))}
                </div>
              </section>
            </>
          ) : page === "practice" ? (
            <>
              <div className="page-heading">
                <div>
                  <h1>
                    Practice with purpose<span>.</span>
                  </h1>
                  <p>
                    Choose one way to turn vocabulary into confident writing.
                  </p>
                </div>
              </div>
              <div className="practice-grid practice-hub">
                {practiceModes.map((mode) => (
                  <button
                    key={mode.id}
                    className="practice-card"
                    onClick={() => navigate(mode.id)}
                  >
                    <span className="practice-icon">
                      <mode.icon size={24} />
                    </span>
                    <div>
                      <h3>{mode.title}</h3>
                      <p>{mode.description}</p>
                    </div>
                    <ArrowRight className="practice-arrow" size={18} />
                  </button>
                ))}
              </div>
            </>
          ) : page === "choice" || page === "repair" ? (
            <UsagePractice
              key={page}
              mode={page}
              onComplete={() => update((s) => recordUsage(s, page))}
              onExit={() => navigate("practice")}
            />
          ) : page === "library" ? (
            <Library
              words={words}
              state={state}
              onDetail={setDetail}
              onBookmark={bookmark}
            />
          ) : page === "study" ? (
            <Study
              words={words}
              state={state}
              onRate={(id, rating) =>
                update((s) => recordReview(s, id, rating))
              }
              onExit={() => navigate("today")}
            />
          ) : page === "writing" ? (
            <Workshop
              key={writingId ?? "default"}
              words={words}
              initialId={writingId}
              onSettings={() => navigate("settings")}
              onSave={(word, sentence) =>
                update((s) => ({
                  ...recordPractice(s, "writing"),
                  writing: [
                    ...s.writing,
                    {
                      id: crypto.randomUUID(),
                      wordId: word.id,
                      sentence,
                      date: new Date().toISOString(),
                    },
                  ].slice(-500),
                }))
              }
            />
          ) : page === "typing" ? (
            <SentenceStudio
              allWords={words}
              words={
                learned
                  ? words.filter((word) => state.progress[word.id])
                  : words
              }
              onComplete={() => update((s) => recordPractice(s, "typing"))}
            />
          ) : page === "progress" ? (
            <Progress
              words={words}
              state={state}
              onStart={start}
              onDetail={setDetail}
            />
          ) : (
            <Settings
              state={state}
              update={update}
              email={user?.email}
              onAuth={() => setAuth(true)}
              onSignOut={learner.signOut}
              onDelete={learner.deleteAccount}
              onAddWords={addWords}
              theme={theme}
              setTheme={setTheme}
            />
          )}
        </main>
        <footer>
          <span className="sync-status">
            <Cloud size={13} />
            {learner.sync}
          </span>
          <div>
            <button onClick={() => setPolicy("about")}>About Verbum</button>
            <button onClick={() => setPolicy("privacy")}>Privacy</button>
          </div>
        </footer>
      </div>
      {auth && <Auth onClose={() => setAuth(false)} />}{" "}
      {onboarding && (
        <Onboarding
          state={state}
          onClose={() => setOnboarding(false)}
          onDone={(name, dailyGoal, focus) => {
            update((s) => ({ ...s, name, dailyGoal, focus, onboarded: true }));
            setOnboarding(false);
            navigate("study");
          }}
        />
      )}
      {detail && (
        <Modal title="A word with purpose" wide onClose={() => setDetail(null)}>
          <div className="word-detail">
            <span className="category-label">
              {detail.category} · {detail.level}
            </span>
            <div className="detail-heading">
              <h1>{detail.word}</h1>
              <button
                className={`icon-button ${state.saved.includes(detail.id) ? "bookmarked" : ""}`}
                aria-label={
                  state.saved.includes(detail.id)
                    ? "Remove bookmark"
                    : "Bookmark word"
                }
                onClick={() => bookmark(detail)}
              >
                <Bookmark
                  fill={
                    state.saved.includes(detail.id) ? "currentColor" : "none"
                  }
                />
              </button>
            </div>
            <span className="part-of-speech">{detail.partOfSpeech}</span>
            <p className="definition">{detail.definition}</p>
            <span className="eyebrow">IN AN ESSAY</span>
            <blockquote>{detail.example}</blockquote>
            <span className="eyebrow">WORDS IT WORKS WITH</span>
            <div className="collocations">
              {detail.collocations.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
            <div className="usage-note">
              <Lightbulb size={20} />
              <p>{detail.caution}</p>
            </div>
            {detail.contrast && <p className="small">{detail.contrast}</p>}
            <button className="button primary" onClick={() => write(detail)}>
              Try it in your writing <Feather size={16} />
            </button>
          </div>
        </Modal>
      )}
      {policy && (
        <Modal
          title={
            policy === "privacy"
              ? "Your words. Your data."
              : "Words with purpose."
          }
          onClose={() => setPolicy(null)}
        >
          {policy === "privacy" ? (
            <div className="prose">
              <p>
                In device mode, your name, learning preferences, review history,
                bookmarks and writing are saved in this browser. Clearing
                browser data removes them. Export a backup from Preferences.
              </p>
              <p>
                If you sign in, your email is handled by Supabase Authentication
                and your learning data is stored in the connected Supabase
                database. Row-level security restricts records to your account.
                You can export your data or permanently delete your account in
                Preferences.
              </p>
              <p>
                AI is optional. Only when you request it, your selected
                exercise, sentence or word request is sent directly to
                OpenRouter and the model provider you choose, or to OpenAI if
                you connect an OpenAI API key. Their privacy and retention
                policies apply. Verbum keeps AI provider keys in tab session
                storage, not in its database.
              </p>
              <p>
                No advertising or analytics trackers are included. Avoid putting
                personal or sensitive information into practice sentences.
                Verbum is designed for secondary and university students.
              </p>
            </div>
          ) : (
            <div className="prose">
              <p>
                Verbum helps students build a vocabulary they can use
                confidently in VCE mainstream English: close textual analysis,
                argument analysis and clear expression.
              </p>
              <p>
                Study a few words, retrieve them from memory, revisit them over
                increasing intervals, then use them in your own writing. Model
                sentences are original fictional examples, not quotations from
                set texts.
              </p>
              <p>
                The curriculum contains {curriculum.length} original learning
                entries. Some foundational terms are included because a precise
                understanding matters more than rarity. This is an independent
                learning tool, not a VCAA product or an automated essay-marking
                service.
              </p>
              <p>
                Words marked ready for longer review have been recalled
                repeatedly; that does not certify mastery in every context. Use
                the workshop to test your ability to make a supported analytical
                claim.
              </p>
              <a
                href="https://github.com/AlbertY123/verbum"
                target="_blank"
                rel="noreferrer"
              >
                Project repository <ExternalLink size={14} />
              </a>
            </div>
          )}
        </Modal>
      )}
      {resetPassword && (
        <Modal
          title="Choose a new password"
          onClose={() => setResetPassword(false)}
        >
          <form
            className="form-stack"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!supabase) return;
              const { error } = await supabase.auth.updateUser({
                password: newPassword,
              });
              if (error) setNotice(error.message);
              else {
                setResetPassword(false);
                history.replaceState(null, "", location.pathname + "#settings");
                setNotice("Your password has been updated.");
              }
            }}
          >
            <label>
              New password
              <input
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </label>
            <button className="button primary">Update password</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Onboarding({
  state,
  onClose,
  onDone,
}: {
  state: LearnerState;
  onClose: () => void;
  onDone: (name: string, goal: number, focus: LearnerState["focus"]) => void;
}) {
  const [name, setName] = useState(state.name);
  const [goal, setGoal] = useState(state.dailyGoal);
  const [focus, setFocus] = useState(state.focus);
  return (
    <Modal title="Make a little room for words." onClose={onClose}>
      <p className="muted">
        A routine that fits your day is a routine that lasts. You can change
        these preferences anytime.
      </p>
      <form
        className="form-stack"
        onSubmit={(e) => {
          e.preventDefault();
          onDone(name.trim(), goal, focus);
        }}
      >
        <label>
          First name <span className="muted">(optional)</span>
          <input
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What should we call you?"
            autoComplete="given-name"
          />
        </label>
        <label>
          New words a day <strong className="range-value">{goal}</strong>
          <input
            type="range"
            min={3}
            max={10}
            value={goal}
            onChange={(e) => setGoal(Number(e.target.value))}
          />
        </label>
        <div className="range-labels">
          <span>3 · gentle</span>
          <span>10 · ambitious</span>
        </div>
        <label>
          What are you working on?
          <select
            value={focus}
            onChange={(e) => setFocus(e.target.value as LearnerState["focus"])}
          >
            <option>All vocabulary</option>
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className="usage-note">
          <Lightbulb size={18} />
          <p>
            New words take about a minute each. Due reviews are added to help
            earlier words stick.
          </p>
        </div>
        <button className="button primary">
          Let’s begin <ArrowRight size={16} />
        </button>
      </form>
    </Modal>
  );
}

function Library({
  words,
  state,
  onDetail,
  onBookmark,
}: {
  words: Word[];
  state: LearnerState;
  onDetail: (w: Word) => void;
  onBookmark: (w: Word) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All words");
  const [level, setLevel] = useState("All levels");
  const [saved, setSaved] = useState(false);
  const [limit, setLimit] = useState(24);
  const filtered = words.filter(
    (w) =>
      (category === "All words" || w.category === category) &&
      (level === "All levels" || w.level === level) &&
      (!saved || state.saved.includes(w.id)) &&
      `${w.word} ${w.definition} ${w.collocations.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  useEffect(() => setLimit(24), [search, category, level, saved]);
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            Build your repertoire<span>.</span>
          </h1>
          <p>Explore words, examples and the details that make them useful.</p>
        </div>
        <button
          className={`button ${saved ? "primary" : ""}`}
          onClick={() => setSaved(!saved)}
        >
          <Bookmark size={16} />
          {saved ? "Showing saved words" : "Saved words"}{" "}
          <span>{state.saved.length}</span>
        </button>
      </div>
      <div className="library-toolbar">
        <label className="search-box">
          <Search size={18} />
          <input
            aria-label="Search vocabulary"
            placeholder="Search words, meanings or phrases…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button
              className="icon-button"
              aria-label="Clear search"
              onClick={() => setSearch("")}
            >
              <X size={16} />
            </button>
          )}
        </label>
        <select
          aria-label="Filter difficulty"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option>All levels</option>
          <option>Foundation</option>
          <option>Developing</option>
          <option>Advanced</option>
        </select>
      </div>
      <div className="category-tabs" aria-label="Vocabulary categories">
        {["All words", ...categories].map((c) => (
          <button
            className={category === c ? "selected" : ""}
            aria-pressed={category === c}
            key={c}
            onClick={() => setCategory(c)}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="result-count">
        <span>
          {filtered.length} {filtered.length === 1 ? "word" : "words"} to
          explore
        </span>
        <span>Australian English · Original essay examples</span>
      </div>
      {!filtered.length ? (
        <div className="empty-state">
          <Search size={28} />
          <h2>No words found.</h2>
          <p>Try another search or a different category.</p>
          <button
            className="button"
            onClick={() => {
              setSearch("");
              setCategory("All words");
              setLevel("All levels");
              setSaved(false);
            }}
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="word-grid">
          {filtered.slice(0, limit).map((w) => (
            <article className="word-card" key={w.id}>
              <div className="word-card-top">
                <span className="word-level">{w.level}</span>
                <button
                  className={`icon-button ${state.saved.includes(w.id) ? "bookmarked" : ""}`}
                  aria-label={`${state.saved.includes(w.id) ? "Unsave" : "Save"} ${w.word}`}
                  onClick={() => onBookmark(w)}
                >
                  <Bookmark
                    size={17}
                    fill={state.saved.includes(w.id) ? "currentColor" : "none"}
                  />
                </button>
              </div>
              <button className="word-card-main" onClick={() => onDetail(w)}>
                <h2>{w.word}</h2>
                <span className="part-of-speech">{w.partOfSpeech}</span>
                <p>{w.definition}</p>
                <span className="word-card-bottom">
                  <span>{w.category}</span>
                  {state.progress[w.id] ? (
                    <Check size={15} />
                  ) : (
                    <ArrowRight size={15} />
                  )}
                </span>
              </button>
            </article>
          ))}
        </div>
      )}
      {filtered.length > limit && (
        <button
          className="button load-more"
          onClick={() => setLimit((n) => n + 24)}
        >
          Explore more words <ArrowDown size={16} />
        </button>
      )}
    </>
  );
}

function Progress({
  words,
  state,
  onStart,
  onDetail,
}: {
  words: Word[];
  state: LearnerState;
  onStart: () => void;
  onDetail: (w: Word) => void;
}) {
  const values = Object.values(state.progress);
  const total = Object.values(state.activity).reduce(
    (a, b) => ({
      reviews: a.reviews + b.reviews,
      correct: a.correct + b.correct,
    }),
    { reviews: 0, correct: 0 },
  );
  const dates = Array.from({ length: 28 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 27 + i);
    return dayKey(d);
  });
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            Look how far you’ve come<span>.</span>
          </h1>
          <p>Every return to a word makes it a little more your own.</p>
        </div>
        <button className="button primary" onClick={onStart}>
          Keep learning <ArrowRight size={16} />
        </button>
      </div>
      <div className="stat-row">
        <div className="stat-card">
          <BookMarked size={22} />
          <div>
            <span>Words introduced</span>
            <strong>{values.length}</strong>
          </div>
        </div>
        <div className="stat-card">
          <Target size={22} />
          <div>
            <span>Successful context recall</span>
            <strong>
              {total.reviews
                ? Math.round((total.correct / total.reviews) * 100)
                : 0}
              <small>% · {total.reviews} reviews</small>
            </strong>
          </div>
        </div>
        <div className="stat-card">
          <Flame size={22} />
          <div>
            <span>Current streak</span>
            <strong>
              {streak(state)}
              <small> days</small>
            </strong>
          </div>
        </div>
      </div>
      <div className="settings-grid">
        <section className="panel">
          <span className="eyebrow">THE LAST FOUR WEEKS</span>
          <h2>Showing up matters.</h2>
          <div className="activity-grid">
            {dates.map((date) => {
              const a = state.activity[date];
              const count = activityTotal(a);
              return (
                <div
                  key={date}
                  className={`activity-day activity-${Math.min(3, Math.ceil(count / 4))}`}
                  title={`${date}: ${count} activities`}
                  aria-label={`${date}: ${count} activities`}
                >
                  <span>{Number(date.slice(-2))}</span>
                </div>
              );
            })}
          </div>
          <div className="activity-legend">
            <span>Less</span>
            <i />
            <i />
            <i />
            <i />
            <span>More</span>
          </div>
          <p className="fine-print">
            Includes reviews, writing, typing and word-usage exercises. Dates
            follow this device’s local time.
          </p>
        </section>
        <section className="panel">
          <h2>Explore every angle.</h2>
          <div className="category-progress">
            {categories.map((c) => {
              const all = words.filter((w) => w.category === c);
              const count = all.filter((w) => state.progress[w.id]).length;
              return (
                <div key={c}>
                  <div>
                    <span>{c}</span>
                    <span>
                      {count} / {all.length}
                    </span>
                  </div>
                  <div className="progress-track">
                    <span
                      style={{
                        width: `${all.length ? (count / all.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      <section className="panel journal">
        <h2>The writing journal.</h2>
        {state.writing.length ? (
          state.writing
            .slice()
            .reverse()
            .map((entry) => {
              const word = words.find((w) => w.id === entry.wordId);
              return (
                <article className="journal-entry" key={entry.id}>
                  <div>
                    <button
                      className="text-button"
                      onClick={() => word && onDetail(word)}
                    >
                      {word?.word ?? "Personal practice"}
                    </button>
                    <time>
                      {new Date(entry.date).toLocaleDateString("en-AU")}
                    </time>
                  </div>
                  <p>{entry.sentence}</p>
                </article>
              );
            })
        ) : (
          <div className="empty-state compact">
            <Feather size={25} />
            <p>
              Your first sentence belongs here.
              <br />
              Complete a guided task in the writing workshop to start your
              journal.
            </p>
          </div>
        )}
      </section>
    </>
  );
}

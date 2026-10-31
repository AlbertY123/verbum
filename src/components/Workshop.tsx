import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Feather,
  Lightbulb,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import type { Word } from "../types";
import "./sentence-studio.css";
import { guidedTask, normaliseTyping } from "../lib/learning";
import {
  getAIConnection,
  requestWritingFeedback,
  type WritingFeedback,
} from "../lib/ai";

export function Workshop({
  words,
  initialId,
  onSave,
  onSettings,
}: {
  words: Word[];
  initialId?: string;
  onSave: (word: Word, sentence: string) => void;
  onSettings: () => void;
}) {
  const [wordId, setWordId] = useState(initialId ?? words[0]?.id);
  const word = words.find((w) => w.id === wordId) ?? words[0];
  const task = guidedTask(word);
  const [sentence, setSentence] = useState("");
  const [checks, setChecks] = useState<boolean[]>([false, false, false]);
  const [feedback, setFeedback] = useState<WritingFeedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const activeRequest = useRef(0);
  useEffect(() => {
    activeRequest.current++;
    setSentence("");
    setFeedback(null);
    setChecks([false, false, false]);
    setMessage("");
    setSaved(false);
    setBusy(false);
  }, [wordId]);
  useEffect(
    () => () => {
      activeRequest.current++;
    },
    [],
  );
  const input = {
    word,
    scenario: `${task.context}\nTask: ${task.task}`,
    sentence,
  };
  async function feedbackRequest() {
    const requestId = ++activeRequest.current;
    setBusy(true);
    setMessage("");
    try {
      const result = await requestWritingFeedback(input);
      if (requestId === activeRequest.current) setFeedback(result);
    } catch (e) {
      if (requestId === activeRequest.current)
        setMessage(e instanceof Error ? e.message : "Feedback is unavailable.");
    } finally {
      if (requestId === activeRequest.current) setBusy(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">FROM KNOWING TO USING</span>
          <h1>
            The writing workshop<span>.</span>
          </h1>
          <p>Give a word a purpose. Make a claim. Support it with evidence.</p>
        </div>
        <span className="page-symbol">
          <Feather size={28} />
        </span>
      </div>
      <div className="workshop-grid">
        <aside className="panel target-panel">
          <label className="label-caps" htmlFor="target-word">
            YOUR TARGET WORD
          </label>
          <select
            id="target-word"
            value={word.id}
            onChange={(e) => setWordId(e.target.value)}
          >
            {words.map((w) => (
              <option key={w.id} value={w.id}>
                {w.word}
              </option>
            ))}
          </select>
          <h2>{word.word}</h2>
          <span className="part-of-speech">
            {word.partOfSpeech} · {word.category}
          </span>
          <p>{word.definition}</p>
          <div className="collocations">
            {word.collocations.map((c) => (
              <span key={c}>{c}</span>
            ))}
          </div>
          <div className="usage-note">
            <Lightbulb size={18} />
            <p>{word.caution}</p>
          </div>
          <details>
            <summary>See a model sentence</summary>
            <blockquote>{word.example}</blockquote>
            <p className="small muted">
              Use the structure as a guide, then make your own claim about the
              source.
            </p>
          </details>
        </aside>
        <div className="panel writing-panel">
          <span className="eyebrow">01 · READ THE SOURCE</span>
          <blockquote className="source-extract">{task.context}</blockquote>
          <span className="eyebrow">02 · MAKE YOUR CLAIM</span>
          <h3>{task.task}</h3>
          <p className="sentence-stem">
            A possible starting point: <em>{task.stem}</em>
          </p>
          <label htmlFor="sentence">Your analytical sentence</label>
          <textarea
            id="sentence"
            maxLength={1600}
            rows={5}
            placeholder="Build your response to the task above…"
            value={sentence}
            onChange={(e) => {
              activeRequest.current++;
              setBusy(false);
              setSentence(e.target.value);
              setSaved(false);
              setFeedback(null);
            }}
          />
          <div className="input-hint">
            <span>Aim for 20–60 words. Precision comes before complexity.</span>
            <span>
              {sentence.trim() ? sentence.trim().split(/\s+/).length : 0} words
            </span>
          </div>
          <span className="eyebrow checklist-title">
            03 · CHECK YOUR THINKING
          </span>
          <div className="checklist">
            {task.checks.map((check, i) => (
              <label key={check}>
                <input
                  type="checkbox"
                  checked={checks[i]}
                  onChange={(e) =>
                    setChecks((c) =>
                      c.map((v, j) => (i === j ? e.target.checked : v)),
                    )
                  }
                />
                <span>{check}</span>
              </label>
            ))}
          </div>
          <div className="action-row">
            <button
              className="button primary"
              disabled={
                sentence.trim().length < 30 || checks.some((c) => !c) || saved
              }
              onClick={() => {
                onSave(word, sentence.trim());
                setSaved(true);
                setMessage(
                  "Saved to your writing journal. Your checklist is a self-assessment, not an automated mark.",
                );
              }}
            >
              <CheckCircle2 size={16} />
              {saved ? "Saved to journal" : "Save my practice"}
            </button>
            <button
              className="button"
              disabled={busy || sentence.trim().length < 30}
              onClick={
                getAIConnection().connected ? feedbackRequest : onSettings
              }
            >
              <Sparkles size={16} />
              {busy ? "Reading your sentence…" : "Get AI feedback"}
            </button>
          </div>
          <p className="fine-print">
            AI feedback sends this source and your sentence to your selected
            provider. Don’t include personal information.
          </p>
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
        </div>
      </div>
      {feedback && (
        <section className="panel feedback-panel" aria-live="polite">
          <span className="eyebrow">
            YOUR AI WRITING COACH · {feedback.verdict}
          </span>
          <h2>Make the next sentence stronger.</h2>
          <div className="feedback-grid">
            {(["meaning", "grammar", "register"] as const).map((key) => (
              <div key={key}>
                <h3>{key}</h3>
                <p>{feedback[key]}</p>
              </div>
            ))}
          </div>
          <blockquote>{feedback.revision}</blockquote>
          <p>
            <strong>Your next step:</strong> {feedback.nextStep}
          </p>
          <p className="fine-print">
            AI can be mistaken. Compare its advice with the source and your
            teacher’s guidance.
          </p>
        </section>
      )}
    </>
  );
}

export function SentenceStudio({
  words,
  allWords = words,
  onComplete,
}: {
  words: Word[];
  allWords?: Word[];
  onComplete: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [start, setStart] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [finished, setFinished] = useState(false);
  const [meaning, setMeaning] = useState("");
  const [checked, setChecked] = useState(false);
  const [keystrokes, setKeystrokes] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [focused, setFocused] = useState(false);
  const [caret, setCaret] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const meaningRef = useRef<HTMLHeadingElement>(null);
  const composing = useRef(false);
  const compositionStart = useRef("");
  const word = words[index % words.length];
  const target = normaliseTyping(word.example);
  const options = useMemo(() => {
    const others = allWords.filter(
      (w) => w.id !== word.id && w.definition !== word.definition,
    );
    const start = index % Math.max(1, others.length - 1);
    return [word, ...others.slice(start, start + 2)].sort((a, b) =>
      a.word.localeCompare(b.word),
    );
  }, [word, allWords, index]);
  useEffect(() => {
    if (!start || finished) return;
    const timer = setInterval(
      () => setElapsed((Date.now() - start) / 1000),
      250,
    );
    return () => clearInterval(timer);
  }, [start, finished]);
  useEffect(() => {
    // A physical keyboard can start straight away. Touch users open their
    // keyboard by tapping the sentence, rather than on page navigation.
    if (window.matchMedia("(pointer: fine)").matches)
      inputRef.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (finished) meaningRef.current?.focus({ preventScroll: true });
  }, [finished]);
  const accuracy = keystrokes
    ? Math.max(0, Math.round(((keystrokes - mistakes) / keystrokes) * 100))
    : 100;
  function reset(next = false) {
    setIndex((i) => (next ? i + 1 : i));
    setTyped("");
    setStart(null);
    setElapsed(0);
    setFinished(false);
    setMeaning("");
    setChecked(false);
    setKeystrokes(0);
    setMistakes(0);
    setCaret(0);
    composing.current = false;
    // Keep keyboard focus through a new sentence. readOnly is used below so
    // the editor remains focusable while React updates the completed state.
    inputRef.current?.focus({ preventScroll: true });
  }
  function updateTyping(raw: string, previous = typed, selection = raw.length) {
    const text = normaliseTyping(raw);
    const t = start ?? Date.now();
    if (!start && text) setStart(t);
    // Count the edited segment, not just changes in total length. Replacing a
    // wrong character must count as another keystroke; backspace is not one.
    let prefix = 0;
    while (
      prefix < previous.length &&
      prefix < text.length &&
      previous[prefix] === text[prefix]
    )
      prefix++;
    let suffix = 0;
    while (
      suffix < previous.length - prefix &&
      suffix < text.length - prefix &&
      previous[previous.length - 1 - suffix] === text[text.length - 1 - suffix]
    )
      suffix++;
    const inserted = text.slice(prefix, text.length - suffix);
    if (inserted) {
      setKeystrokes((k) => k + inserted.length);
      setMistakes(
        (m) =>
          m +
          [...inserted].filter(
            (character, offset) => character !== target[prefix + offset],
          ).length,
      );
    }
    setTyped(text);
    setCaret(
      Math.min(normaliseTyping(raw.slice(0, selection)).length, text.length),
    );
    if (text === target) {
      setFinished(true);
      setElapsed((Date.now() - t) / 1000);
    }
  }
  return (
    <div className="sentence-studio">
      <div className="page-heading">
        <div>
          <h1>
            The sentence studio<span>.</span>
          </h1>
          <p>Type the sentence where you see it. Then check the meaning.</p>
        </div>
      </div>
      <section
        className={`typing-panel ${focused ? "is-focused" : ""} ${finished ? "is-finished" : ""}`}
        aria-label="Sentence typing practice"
      >
        <div className="typing-top">
          <span className="category-label">{word.category}</span>
          <div className="typing-stats">
            <span>
              <strong>
                {start
                  ? Math.round((typed.length / 5 / Math.max(1, elapsed)) * 60)
                  : "—"}
              </strong>{" "}
              wpm
            </span>
            <span>
              <strong>{accuracy}%</strong> accuracy
            </span>
          </div>
        </div>
        <label htmlFor="typing-input" className="sr-only">
          TYPE THE SENTENCE HERE
        </label>
        <p className="sr-only" id="typing-sentence">
          Sentence to type: {target}
        </p>
        <div className="inline-typing">
          <div className="typing-text" aria-hidden="true">
            {[...target].map((char, i) => (
              <span
                key={i}
                className={`${i < typed.length ? (char === typed[i] ? "char-correct" : "char-wrong") : "char-pending"} ${i === caret && !finished ? "char-current" : ""}`}
              >
                {char}
              </span>
            ))}
            {[...typed.slice(target.length)].map((char, i) => (
              <span
                key={`extra-${i}`}
                className={`char-wrong char-extra ${caret === target.length + i && !finished ? "char-current" : ""}`}
              >
                {char}
              </span>
            ))}
            {caret === Math.max(target.length, typed.length) && !finished && (
              <span className="char-current char-end" />
            )}
          </div>
          <textarea
            ref={inputRef}
            id="typing-input"
            className="typing-capture"
            rows={1}
            value={typed}
            maxLength={target.length + 50}
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            inputMode="text"
            enterKeyHint="done"
            aria-describedby="typing-sentence typing-instruction"
            readOnly={finished}
            aria-readonly={finished}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPaste={(e) => e.preventDefault()}
            onDrop={(e) => e.preventDefault()}
            onKeyDown={(e) => {
              if (e.key === "Escape") e.currentTarget.blur();
            }}
            onClick={(e) => {
              // Clicking a fresh line resumes typing at the current end,
              // rather than guessing a position from transparent text.
              e.currentTarget.setSelectionRange(typed.length, typed.length);
              setCaret(typed.length);
            }}
            onSelect={(e) => {
              if (!composing.current) setCaret(e.currentTarget.selectionStart);
            }}
            onCompositionStart={() => {
              composing.current = true;
              compositionStart.current = typed;
            }}
            onCompositionEnd={(e) => {
              composing.current = false;
              updateTyping(
                e.currentTarget.value,
                compositionStart.current,
                e.currentTarget.selectionStart,
              );
            }}
            onChange={(e) => {
              if (finished) return;
              if (composing.current) {
                setTyped(e.target.value);
                setCaret(e.target.selectionStart);
                return;
              }
              updateTyping(e.target.value, typed, e.target.selectionStart);
            }}
          />
        </div>
        <div className="typing-bottom">
          <span id="typing-instruction">
            {finished
              ? "Sentence complete. Check your understanding below."
              : focused
                ? typed
                  ? "Keep going. Backspace to correct a mistake."
                  : "Start typing. Accuracy comes first."
                : "Click or tap the sentence to type."}
          </span>
          <button className="text-button" onClick={() => reset()}>
            <RotateCcw size={14} /> Restart sentence
          </button>
          <button className="text-button" onClick={() => reset(true)}>
            Skip <ArrowRight size={14} />
          </button>
        </div>
      </section>
      {finished && (
        <section className="panel meaning-check">
          <h2 ref={meaningRef} tabIndex={-1}>
            What does “{word.word}” mean here?
          </h2>
          <div className="definition-options">
            {options.map((w) => (
              <button
                className={`answer-option ${meaning === w.id ? "chosen" : ""}`}
                disabled={checked}
                key={w.id}
                onClick={() => setMeaning(w.id)}
              >
                {w.definition}
              </button>
            ))}
          </div>
          {!checked ? (
            <button
              className="button primary"
              disabled={!meaning}
              onClick={() => {
                setChecked(true);
                if (meaning === word.id) onComplete();
              }}
            >
              Check understanding <Check size={16} />
            </button>
          ) : (
            <div role="status">
              <p className="notice">
                {meaning === word.id
                  ? "That’s right. Practice recorded."
                  : `Not quite. ${word.definition} Read the example again and notice how the word works.`}
              </p>
              <button className="button primary" onClick={() => reset(true)}>
                Next sentence <ArrowRight size={16} />
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

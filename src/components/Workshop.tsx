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
  const inputRef = useRef<HTMLTextAreaElement>(null);
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
    setTimeout(() => inputRef.current?.focus(), 0);
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">LET GOOD SENTENCES BECOME FAMILIAR</span>
          <h1>
            The sentence studio<span>.</span>
          </h1>
          <p>
            Type with attention. Notice the phrasing. Then check the meaning.
          </p>
        </div>
        <span className="pill">Accuracy over speed</span>
      </div>
      <section className="typing-panel">
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
        <div
          className="typing-text"
          aria-hidden="true"
          onClick={() => inputRef.current?.focus()}
        >
          {[...target].map((char, i) => (
            <span
              key={i}
              className={`${i < typed.length ? (char === typed[i] ? "char-correct" : "char-wrong") : ""} ${i === typed.length ? "char-current" : ""}`}
            >
              {char}
            </span>
          ))}
        </div>
        <p className="sr-only">Sentence to type: {target}</p>
        <label htmlFor="typing-input" className="label-caps">
          TYPE THE SENTENCE HERE
        </label>
        <textarea
          ref={inputRef}
          id="typing-input"
          rows={3}
          value={typed}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          disabled={finished}
          onPaste={(e) => e.preventDefault()}
          onChange={(e) => {
            const text = normaliseTyping(e.target.value);
            const t = start ?? Date.now();
            if (!start) setStart(t);
            if (text.length > typed.length) {
              const added = text.length - typed.length;
              setKeystrokes((k) => k + added);
              setMistakes(
                (m) =>
                  m +
                  [...text.slice(typed.length)].filter(
                    (c, i) => c !== target[typed.length + i],
                  ).length,
              );
            }
            setTyped(text);
            if (text === target) {
              setFinished(true);
              setElapsed((Date.now() - t) / 1000);
            }
          }}
          placeholder="Start typing when you’re ready…"
        />
        <div className="typing-bottom">
          <span>
            {typed.length} / {target.length} characters
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
          <span className="eyebrow">THE WORD BEHIND THE WORDS</span>
          <h2>What does “{word.word}” mean here?</h2>
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
      <div className="studio-footnote">
        <Lightbulb size={18} />
        <p>
          Typing helps you notice how words fit together. To practise producing
          your own ideas, follow this with the writing workshop.
        </p>
      </div>
    </>
  );
}

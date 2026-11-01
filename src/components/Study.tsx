import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import type { LearnerState, Rating, Word } from "../types";
import { getQueue, normaliseAnswer } from "../lib/learning";

export function Study({
  words,
  state,
  onRate,
  onExit,
}: {
  words: Word[];
  state: LearnerState;
  onRate: (id: string, rating: Rating) => void;
  onExit: () => void;
}) {
  const [queue] = useState(() => getQueue(words, state));
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<"meaning" | "gap" | "result">(() =>
    queue[0] && state.progress[queue[0].id] ? "gap" : "meaning",
  );
  const [answer, setAnswer] = useState("");
  const [correct, setCorrect] = useState(false);
  const [typed, setTyped] = useState(true);
  const [missed, setMissed] = useState(false);
  const [assisted, setAssisted] = useState(false);
  const [score, setScore] = useState(0);
  const word = queue[index];
  const options = useMemo(() => {
    if (!word) return [];
    const others = words.filter(
      (w) =>
        w.id !== word.id &&
        w.category === word.category &&
        w.partOfSpeech === word.partOfSpeech &&
        normaliseAnswer(w.answer) !== normaliseAnswer(word.answer),
    );
    const distinct = Array.from(
      new Map(
        others.map((w) => [normaliseAnswer(w.answer), w.answer]),
      ).values(),
    );
    const start = (index * 3) % Math.max(1, distinct.length - 2);
    return [word.answer, ...distinct.slice(start, start + 3)].sort((a, b) =>
      a.localeCompare(b),
    );
  }, [word, words, index]);
  const typedOnly = options.length < 4;
  function check(e: React.FormEvent) {
    e.preventDefault();
    if (!answer.trim()) return;
    const match = normaliseAnswer(answer) === normaliseAnswer(word.answer);
    setCorrect(match);
    if (!match) setMissed(true);
    setStage("result");
  }
  function next(rating: Rating) {
    onRate(
      word.id,
      missed ? "again" : assisted && rating !== "again" ? "hard" : rating,
    );
    if (correct && !missed) setScore((s) => s + 1);
    const nextWord = queue[index + 1];
    const reviewing = Boolean(nextWord && state.progress[nextWord.id]);
    setIndex((i) => i + 1);
    setStage(reviewing ? "gap" : "meaning");
    setTyped(true);
    setMissed(false);
    setAssisted(false);
    setCorrect(false);
    setAnswer("");
  }
  if (!word)
    return (
      <div className="session-complete">
        <span className="completion-icon">
          <CheckCircle2 size={42} />
        </span>
        <span className="eyebrow">
          A LITTLE PRACTICE. A LASTING DIFFERENCE.
        </span>
        <h1>{queue.length ? "A few words further." : "You’re up to date."}</h1>
        <p>
          {queue.length
            ? `You reviewed ${queue.length} words and answered ${score} correctly on the first attempt. They’ll return when it’s time to practise again.`
            : "Your next words will be ready tomorrow. You can still explore the library, write or practise typing."}
        </p>
        <div className="complete-stats">
          <div>
            <strong>{queue.length}</strong>
            <span>words reviewed</span>
          </div>
          <div>
            <strong>
              {queue.length ? Math.round((score / queue.length) * 100) : 0}%
            </strong>
            <span>first-attempt accuracy</span>
          </div>
        </div>
        <button className="button primary" onClick={onExit}>
          Back to your desk <ArrowRight size={16} />
        </button>
        <p className="fine-print">
          Choosing “Again” brings a word back in 10 minutes. Longer intervals
          grow with successful recall.
        </p>
      </div>
    );
  return (
    <section className="study-session">
      <div className="session-top">
        <button className="text-button" onClick={onExit}>
          <ArrowLeft size={16} /> Back to your desk
        </button>
        <span>
          {index + 1} of {queue.length} words
        </span>
      </div>
      <div className="progress-track">
        <span style={{ width: `${(index / queue.length) * 100}%` }} />
      </div>
      <div className="session-steps">
        <span className={stage === "meaning" ? "active" : ""}>
          01 · Learn the meaning
        </span>
        <span className={stage === "gap" || stage === "result" ? "active" : ""}>
          02 · Recall in context
        </span>
      </div>
      <details
        className="recall-hint"
        onToggle={(event) => {
          if (event.currentTarget.open && stage === "gap") setAssisted(true);
        }}
      >
        <summary>
          Words in this session · {index + 1} of {queue.length}
        </summary>
        <ol>
          {queue.map((item, position) => (
            <li
              key={item.id}
              aria-current={position === index ? "step" : undefined}
            >
              {item.word}
              {position === index
                ? " — practising now"
                : position < index
                  ? " — completed"
                  : " — coming up"}
            </li>
          ))}
        </ol>
      </details>
      <article className="study-card">
        <span className="category-label">{word.category}</span>
        <h1>{stage === "gap" ? "Find the right word." : word.word}</h1>
        <p className="part-of-speech">
          {word.partOfSpeech} <span>·</span> {word.level}
        </p>
        {stage === "meaning" ? (
          <>
            <p className="definition">{word.definition}</p>
            <blockquote>{word.example}</blockquote>
            <div className="collocations">
              {word.collocations.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
            <div className="usage-note">
              <Lightbulb size={18} />
              <p>{word.caution}</p>
            </div>
            <button className="button primary" onClick={() => setStage("gap")}>
              Try it in context <ArrowRight size={16} />
            </button>
          </>
        ) : (
          <>
            <p className="gap-sentence">
              {word.gap.split("___").map((part, i) => (
                <span key={i}>
                  {i > 0 && (
                    <span className="blank">
                      {stage === "result" ? word.answer : "　　　　　"}
                    </span>
                  )}
                  {part}
                </span>
              ))}
            </p>
            <p className="muted small">
              Recall the word from this card and use the form that fits the
              sentence. Open “Words in this session” above if you need to see
              which word you’re practising.
            </p>
            {stage === "gap" && (
              <details
                className="recall-hint"
                onToggle={(event) => {
                  if (event.currentTarget.open) setAssisted(true);
                }}
              >
                <summary>Need a meaning hint?</summary>
                <p>{word.definition}</p>
                <p className="fine-print">
                  If the hint helped you remember, choose “With effort” after
                  checking.
                </p>
              </details>
            )}
            <form onSubmit={check}>
              {stage === "gap" && (
                <>
                  {!typedOnly && (
                    <div className="mode-toggle">
                      <button
                        type="button"
                        className={!typed ? "selected" : ""}
                        onClick={() => {
                          setTyped(false);
                          setAssisted(true);
                          setAnswer("");
                        }}
                      >
                        Choose a word
                      </button>
                      <button
                        type="button"
                        className={typed ? "selected" : ""}
                        onClick={() => {
                          setTyped(true);
                          setAnswer("");
                        }}
                      >
                        Type it from memory
                      </button>
                    </div>
                  )}
                  {typed || typedOnly ? (
                    <label className="sr-only-label">
                      Your answer
                      <input
                        autoFocus
                        autoComplete="off"
                        spellCheck={false}
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Type the missing word…"
                      />
                    </label>
                  ) : (
                    <div className="answer-options">
                      {options.map((option) => (
                        <button
                          type="button"
                          className={`answer-option ${answer === option ? "chosen" : ""}`}
                          key={option}
                          onClick={() => setAnswer(option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  )}
                  <button className="button primary" disabled={!answer.trim()}>
                    Check answer <Check size={16} />
                  </button>
                </>
              )}
              {stage === "result" && (
                <div
                  className={`answer-feedback ${correct ? "correct" : "incorrect"}`}
                  role="status"
                >
                  <strong>
                    {correct
                      ? "Exactly. A precise choice."
                      : `The target form is “${word.answer}”.`}
                  </strong>
                  <p>{word.definition}</p>
                  <p className="small">{word.caution}</p>
                  {!correct && (
                    <p className="small">
                      Your wording may still make sense. This check practises
                      the target vocabulary, rather than judging every possible
                      sentence.
                    </p>
                  )}
                  {correct && missed ? (
                    <>
                      <p>
                        You corrected it. This word will return soon to
                        strengthen your recall.
                      </p>
                      <button
                        type="button"
                        className="button primary"
                        onClick={() => next("again")}
                      >
                        Continue <ArrowRight size={16} />
                      </button>
                    </>
                  ) : correct ? (
                    <>
                      <p>
                        {assisted
                          ? "You used support. This word will get a shorter review interval."
                          : "How easily did it come to mind?"}
                      </p>
                      <div className="rating-buttons">
                        <button
                          type="button"
                          className="button"
                          onClick={() => next("hard")}
                        >
                          With effort
                        </button>
                        <button
                          type="button"
                          className="button primary"
                          onClick={() => next("good")}
                        >
                          Remembered
                        </button>
                        <button
                          type="button"
                          className="button"
                          onClick={() => next("easy")}
                        >
                          Easily
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="rating-buttons">
                      <button
                        type="button"
                        className="button primary"
                        onClick={() => {
                          setAnswer("");
                          setTyped(true);
                          setStage("gap");
                        }}
                      >
                        Try once more
                      </button>
                      <button
                        type="button"
                        className="button"
                        onClick={() => next("again")}
                      >
                        Practise again later <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </form>
          </>
        )}
      </article>
    </section>
  );
}

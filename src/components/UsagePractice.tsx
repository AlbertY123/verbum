import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, RotateCcw } from "lucide-react";
import {
  USAGE_SESSION_LENGTH,
  usageExercises,
  type UsageMode,
} from "../data/usage-exercises";
import "./usage-practice.css";

interface UsagePracticeProps {
  mode: UsageMode;
  onComplete: () => void;
  onExit: () => void;
}

/** The keyed session resets cleanly when navigation changes practice mode. */
export function UsagePractice(props: UsagePracticeProps) {
  return <UsageSession key={props.mode} {...props} />;
}

function UsageSession({ mode, onComplete, onExit }: UsagePracticeProps) {
  const pool = usageExercises[mode];
  const [setNumber, setSetNumber] = useState(
    () =>
      Math.floor(Date.now() / 86400000) %
      Math.ceil(pool.length / USAGE_SESSION_LENGTH),
  );
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [finished, setFinished] = useState(false);
  const completionRecorded = useRef(false);
  const feedbackRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const session = Array.from(
    { length: USAGE_SESSION_LENGTH },
    (_, offset) =>
      pool[(setNumber * USAGE_SESSION_LENGTH + offset) % pool.length],
  );
  const question = session[index];
  const isCorrect = selected === question.correctIndex;
  const score = answers.filter(Boolean).length;
  const title = mode === "choice" ? "Word choice" : "Sentence repair";

  useEffect(() => {
    if (checked) feedbackRef.current?.focus();
  }, [checked]);
  useEffect(() => {
    if (index > 0) headingRef.current?.focus();
  }, [index]);

  function checkAnswer() {
    if (selected === null || checked) return;
    setAnswers((previous) => [...previous, selected === question.correctIndex]);
    setChecked(true);
  }

  function nextQuestion() {
    if (!checked || finished) return;
    if (index === session.length - 1) {
      setFinished(true);
      if (!completionRecorded.current) {
        completionRecorded.current = true;
        onComplete();
      }
    } else {
      setIndex((previous) => previous + 1);
      setSelected(null);
      setChecked(false);
    }
  }

  function restart(anotherSet: boolean) {
    if (anotherSet)
      setSetNumber(
        (previous) =>
          (previous + 1) % Math.ceil(pool.length / USAGE_SESSION_LENGTH),
      );
    completionRecorded.current = false;
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setAnswers([]);
    setFinished(false);
  }

  if (finished) {
    return (
      <section className="usage-practice usage-complete" data-mode={mode}>
        <span className="eyebrow">{title} · session complete</span>
        <h1>A more precise way to say it.</h1>
        <p className="usage-result">
          <strong>
            {score} / {session.length}
          </strong>
          <span>correct on your first attempt</span>
        </p>
        <p className="muted">
          {score === session.length
            ? "You matched every choice to the evidence. Keep noticing the differences when you write."
            : "The explanations are part of the practice. Revisit the distinctions that felt less familiar, then try another context."}
        </p>
        <div className="usage-result-review" aria-label="Your session results">
          {session.map((item, position) => (
            <div key={item.id}>
              <span className={answers[position] ? "usage-result-correct" : ""}>
                {answers[position] ? (
                  <Check size={16} aria-label="Correct" />
                ) : (
                  <RotateCcw size={16} aria-label="Revisit" />
                )}
              </span>
              <p>{item.options[item.correctIndex].text}</p>
            </div>
          ))}
        </div>
        <div className="action-row">
          <button className="button primary" onClick={() => restart(true)}>
            Practise another set <ArrowRight size={16} />
          </button>
          <button className="button" onClick={() => restart(false)}>
            <RotateCcw size={16} /> Retry these questions
          </button>
          <button className="text-button" onClick={onExit}>
            Back to practice
          </button>
        </div>
        <p className="fine-print">
          Session recorded. A correct choice here is a useful step; using the
          word accurately in your own writing is the next one.
        </p>
      </section>
    );
  }

  return (
    <section className="usage-practice" data-mode={mode}>
      <div className="page-heading">
        <div>
          <span className="eyebrow">
            {mode === "choice"
              ? "CHOOSE WITH A REASON"
              : "MAKE THE LANGUAGE FIT THE IDEA"}
          </span>
          <h1>
            {title}
            <span>.</span>
          </h1>
          <p>
            {mode === "choice"
              ? "Similar words do different work. Let the evidence guide your choice."
              : "Spot an awkward pattern or an unsupported claim, then make a precise repair."}
          </p>
        </div>
      </div>
      <div className="usage-session-header">
        <button className="text-button" onClick={onExit}>
          <ArrowLeft size={15} /> Back to practice
        </button>
        <span>
          Question {index + 1} of {session.length}
        </span>
      </div>
      <progress
        className="usage-progress"
        aria-label="Questions completed"
        value={index + (checked ? 1 : 0)}
        max={session.length}
      />
      <article className="panel usage-question" data-exercise-id={question.id}>
        <span className="eyebrow">
          THE CONTEXT · ORIGINAL FICTIONAL EXAMPLE
        </span>
        <p className="usage-context">{question.context}</p>
        <span className="eyebrow">
          {mode === "choice"
            ? "COMPLETE THE ANALYSIS"
            : "THE SENTENCE TO REPAIR"}
        </span>
        <blockquote
          className={
            mode === "repair" ? "usage-sentence usage-flawed" : "usage-sentence"
          }
        >
          {mode === "choice"
            ? question.sentence.split("___").map((part, i) => (
                <span key={i}>
                  {i > 0 && (
                    <span className="usage-blank">
                      {checked
                        ? question.options[question.correctIndex].text
                        : "________"}
                    </span>
                  )}
                  {part}
                </span>
              ))
            : question.sentence}
        </blockquote>
        <h2
          id="usage-question-prompt"
          ref={headingRef}
          tabIndex={-1}
          className="usage-prompt"
        >
          {question.prompt}
        </h2>
        <div
          className="usage-options"
          role="group"
          aria-labelledby="usage-question-prompt"
        >
          {question.options.map((option, position) => (
            <button
              key={option.text}
              type="button"
              className={`usage-option ${selected === position ? "usage-selected" : ""} ${checked && position === question.correctIndex ? "usage-correct" : ""} ${checked && selected === position && !isCorrect ? "usage-revisit" : ""}`}
              aria-pressed={selected === position}
              disabled={checked}
              onClick={() => setSelected(position)}
            >
              <span className="usage-option-letter" aria-hidden="true">
                {String.fromCharCode(65 + position)}
              </span>
              <span>{option.text}</span>
              {checked && position === question.correctIndex && (
                <Check size={17} aria-label="Correct answer" />
              )}
            </button>
          ))}
        </div>
        {!checked ? (
          <button
            className="button primary usage-check"
            disabled={selected === null}
            onClick={checkAnswer}
          >
            Check {mode === "choice" ? "choice" : "repair"} <Check size={16} />
          </button>
        ) : (
          <>
            <div
              ref={feedbackRef}
              tabIndex={-1}
              className={`usage-feedback ${isCorrect ? "usage-feedback-correct" : ""}`}
              role="status"
            >
              <strong>
                {isCorrect
                  ? "That fits the evidence."
                  : "A distinction to notice."}
              </strong>
              <p>
                {selected !== null
                  ? question.options[selected].explanation
                  : ""}
              </p>
              {!isCorrect && (
                <>
                  <p>
                    <strong>
                      The precise {mode === "choice" ? "choice" : "repair"}
                      :{" "}
                    </strong>
                    {question.options[question.correctIndex].text}
                  </p>
                  <p>{question.options[question.correctIndex].explanation}</p>
                </>
              )}
            </div>
            <details className="usage-comparison">
              <summary>Compare all four options</summary>
              <ol>
                {question.options.map((option, position) => (
                  <li key={option.text}>
                    <strong>
                      {option.text}
                      {position === question.correctIndex
                        ? " — fits this task"
                        : ""}
                    </strong>
                    <p>{option.explanation}</p>
                  </li>
                ))}
              </ol>
            </details>
            <button
              className="button primary usage-next"
              onClick={nextQuestion}
            >
              {index === session.length - 1
                ? "Finish session"
                : "Next question"}{" "}
              <ArrowRight size={16} />
            </button>
          </>
        )}
      </article>
      <p className="usage-footnote">
        {mode === "choice"
          ? "Choose for this particular context. A word that does not fit here may be useful in a different argument."
          : "A good repair preserves what the evidence supports. More elaborate language is not automatically more accurate."}
      </p>
    </section>
  );
}

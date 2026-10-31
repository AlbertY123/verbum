import { describe, expect, it } from "vitest";
import {
  dayKey,
  emptyState,
  getQueue,
  isLearnerState,
  mergeStates,
  normaliseAnswer,
  recordPractice,
  recordReview,
  schedule,
  streak,
} from "../src/lib/learning";
import type { LearnerState, Word } from "../src/types";
const now = new Date("2026-10-30T12:00:00");
const word = (id: string): Word => ({
  id,
  word: id,
  partOfSpeech: "verb",
  category: "Analytical verbs",
  level: "Developing",
  definition: "A test definition",
  example: "The contrast reveals a division.",
  gap: "The contrast ___ a division.",
  answer: "reveals",
  collocations: ["reveals conflict", "reveals tensions"],
  caution: "Support claims with evidence.",
});
describe("learning schedule", () => {
  it("prioritises requested personal words without bypassing due reviews", () => {
    const custom = { ...word("personal-word"), level: "Advanced" as const };
    let state: LearnerState = { ...emptyState(), customWords: [custom] };
    state = recordReview(state, "old", "good", new Date("2026-10-25T12:00:00"));
    expect(
      getQueue([word("foundation"), word("old"), custom], state, now).map(
        (w) => w.id,
      ),
    ).toEqual(["old", "personal-word", "foundation"]);
  });
  it("schedules failed retrieval soon and reduces ease without marking mastery", () => {
    const p = schedule(undefined, "again", now);
    expect(new Date(p.due).getTime() - now.getTime()).toBe(600000);
    expect(p.interval).toBe(0);
    expect(p.lapses).toBe(1);
    expect(p.ease).toBe(2.3);
  });
  it("grows successful intervals and preserves introduction date", () => {
    const first = schedule(undefined, "good", now);
    const next = schedule(first, "good", new Date("2026-11-01T12:00:00"));
    expect(first.interval).toBe(1);
    expect(next.interval).toBe(3);
    expect(next.introduced).toBe(first.introduced);
    expect(next.reviews).toBe(2);
  });
  it("never generates unbounded intervals or ease", () => {
    let p = schedule(undefined, "easy", now);
    for (let i = 0; i < 30; i++) p = schedule(p, "easy", now);
    expect(p.interval).toBe(365);
    expect(p.ease).toBe(3);
    for (let i = 0; i < 30; i++) p = schedule(p, "again", now);
    expect(p.ease).toBe(1.3);
  });
  it("counts a new word once across repeated failed reviews", () => {
    let s = recordReview(emptyState(), "one", "again", now);
    s = recordReview(s, "one", "again", now);
    expect(s.activity[dayKey(now)].newWords).toBe(1);
    expect(s.activity[dayKey(now)].reviews).toBe(2);
    expect(s.activity[dayKey(now)].correct).toBe(0);
  });
  it("includes due words outside chosen focus before new words and honours daily quota", () => {
    let s = {
      ...emptyState(),
      dailyGoal: 3,
      focus: "Analytical verbs" as const,
    };
    const dueWord = { ...word("old"), category: "Themes & ideas" as const };
    s = recordReview(
      s,
      "old",
      "good",
      new Date("2026-10-25T12:00:00"),
    ) as typeof s;
    s = recordReview(s, "one", "good", now) as typeof s;
    const q = getQueue(
      [word("one"), word("two"), word("three"), word("four"), dueWord],
      s,
      now,
    );
    expect(q.map((w) => w.id)).toEqual(["old", "two", "three"]);
  });
  it("keeps streak yesterday until today is complete; breaks after a missed day", () => {
    let s = recordPractice(
      emptyState(),
      "writing",
      new Date("2026-10-28T12:00:00"),
    );
    s = recordPractice(s, "typing", new Date("2026-10-29T12:00:00"));
    expect(streak(s, now)).toBe(2);
    expect(streak(s, new Date("2026-10-31T12:00:00"))).toBe(0);
  });
  it("accepts casing and punctuation, not unrelated inflections", () => {
    expect(normaliseAnswer("  Reveals. ")).toBe("reveals");
    expect(normaliseAnswer("reveal")).not.toBe(normaliseAnswer("reveals"));
  });
  it("rejects broken imports before rendering", () => {
    expect(isLearnerState(emptyState())).toBe(true);
    expect(isLearnerState({ ...emptyState(), dailyGoal: 100 })).toBe(false);
    expect(
      isLearnerState({ ...emptyState(), progress: { bad: { due: "never" } } }),
    ).toBe(false);
    expect(
      isLearnerState({
        ...emptyState(),
        customWords: [{ word: "incomplete" }],
      }),
    ).toBe(false);
  });
  it("merges per-word schedules and journals without losing another device’s entries", () => {
    const a = recordReview(emptyState(), "one", "good", now);
    const b = recordReview(emptyState(), "two", "easy", now);
    const result = mergeStates(a, b);
    expect(Object.keys(result.progress).sort()).toEqual(["one", "two"]);
    expect(isLearnerState(result)).toBe(true);
  });
});

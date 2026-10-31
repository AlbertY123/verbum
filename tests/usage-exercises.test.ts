import { describe, expect, it } from "vitest";
import { words } from "../src/data/words";
import {
  choiceExercises,
  repairExercises,
  USAGE_SESSION_LENGTH,
  usageExercises,
} from "../src/data/usage-exercises";

describe("authored usage curriculum", () => {
  it("provides four complete five-question sets in each mode", () => {
    expect(USAGE_SESSION_LENGTH).toBe(5);
    expect(choiceExercises).toHaveLength(20);
    expect(repairExercises).toHaveLength(20);
    expect(usageExercises.choice).toBe(choiceExercises);
    expect(usageExercises.repair).toBe(repairExercises);
  });

  it("links every exercise to a real vocabulary entry and uses unique identifiers", () => {
    const all = [...choiceExercises, ...repairExercises];
    const ids = new Set(words.map((word) => word.id));
    expect(new Set(all.map((question) => question.id)).size).toBe(40);
    for (const question of all) {
      expect(ids.has(question.wordId), question.id).toBe(true);
      expect(question.id).toMatch(/^(choice|repair)-[a-z-]+$/);
    }
  });

  it("supplies a specific source, task and individual reasoning for all four choices", () => {
    for (const question of [...choiceExercises, ...repairExercises]) {
      expect(question.context.length, question.id).toBeGreaterThan(40);
      expect(question.prompt.length, question.id).toBeGreaterThan(30);
      expect(question.sentence.length, question.id).toBeGreaterThan(30);
      expect(question.options, question.id).toHaveLength(4);
      expect(
        new Set(question.options.map((option) => option.text)).size,
        question.id,
      ).toBe(4);
      expect(
        new Set(question.options.map((option) => option.explanation)).size,
        question.id,
      ).toBe(4);
      expect(Number.isInteger(question.correctIndex), question.id).toBe(true);
      expect(question.correctIndex, question.id).toBeGreaterThanOrEqual(0);
      expect(question.correctIndex, question.id).toBeLessThan(4);
      for (const option of question.options) {
        expect(option.text.trim().length, question.id).toBeGreaterThan(3);
        expect(option.explanation.length, question.id).toBeGreaterThan(40);
      }
    }
  });

  it("uses a single gap for word choice and complete alternatives for sentence repair", () => {
    for (const question of choiceExercises)
      expect(question.sentence.split("___"), question.id).toHaveLength(2);
    for (const question of repairExercises) {
      expect(question.sentence, question.id).not.toContain("___");
      for (const option of question.options)
        expect(option.text, question.id).toMatch(/[.!?]$/);
    }
  });

  it("balances answer positions so the same position does not become a shortcut", () => {
    for (const mode of ["choice", "repair"] as const) {
      expect(
        [0, 1, 2, 3].map(
          (position) =>
            usageExercises[mode].filter(
              (question) => question.correctIndex === position,
            ).length,
        ),
      ).toEqual([5, 5, 5, 5]);
    }
  });

  it("keeps fictional source passages original within this set and uses Australian spelling", () => {
    const all = [...choiceExercises, ...repairExercises];
    expect(new Set(all.map((question) => question.context)).size).toBe(40);
    expect(JSON.stringify(all)).not.toMatch(
      /\b(analyzes|analyze|problematizes|satirizes|behavior|center)\b/i,
    );
  });
});

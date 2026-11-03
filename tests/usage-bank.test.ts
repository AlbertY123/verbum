import { describe, expect, it } from "vitest";
import { words } from "../src/data/words";
import { usageExercises } from "../src/data/usage-exercises";
import {
  buildUsageBank,
  usageSession,
  type UsageDeck,
} from "../src/lib/usage-bank";

for (const mode of ["choice", "repair"] as const) {
  describe(`${mode} full vocabulary bank`, () => {
    const pool = buildUsageBank(words, mode);
    it("covers every word once, including every strand and difficulty, and retains authored questions", () => {
      expect(pool).toHaveLength(words.length);
      expect(new Set(pool.map((q) => q.wordId))).toEqual(
        new Set(words.map((w) => w.id)),
      );
      expect(new Set(pool.map((q) => q.id)).size).toBe(words.length);
      for (const question of usageExercises[mode])
        expect(pool).toContain(question);
    });
    it("grounds each new correct answer in the word's own definition and retrieval sentence", () => {
      for (const question of pool.filter((q) => q.kind === "bank")) {
        const word = words.find((w) => w.id === question.wordId)!;
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options.map((o) => o.text)).size, word.id).toBe(
          4,
        );
        const correct = question.options[question.correctIndex];
        expect(correct.text, word.id).toBe(
          mode === "choice"
            ? word.answer
            : word.gap.replace("___", word.answer),
        );
        expect(correct.explanation).toContain(word.definition);
        expect(correct.explanation).toContain(word.caution);
        expect(question.context).toContain(word.definition);
        if (mode === "choice")
          expect(question.sentence.split("___")).toHaveLength(2);
        else expect(question.sentence).not.toBe(correct.text);
        for (const option of question.options.filter((o) => o !== correct))
          expect(option.explanation).toContain(
            "Other wording may be valid English",
          );
      }
    });
    it("visits all 600 words before repeating, in sessions of five", () => {
      let deck: UsageDeck | undefined;
      const seen = new Set<string>();
      for (let i = 0; i < words.length / 5; i++) {
        const round = usageSession(pool, deck, () => 0.37);
        expect(round.questions).toHaveLength(5);
        for (const q of round.questions) {
          expect(seen.has(q.wordId), q.wordId).toBe(false);
          seen.add(q.wordId);
        }
        deck = round.nextDeck;
      }
      expect(seen.size).toBe(words.length);
      expect(usageSession(pool, deck).questions).toHaveLength(5);
    });
    it("resumes an unfinished set and moves forward after a completed set", () => {
      const round = usageSession(pool);
      expect(
        usageSession(pool, JSON.parse(JSON.stringify(round.deck))).questions,
      ).toEqual(round.questions);
      const next = usageSession(pool, round.nextDeck);
      expect(next.questions.some((q) => round.questions.includes(q))).toBe(
        false,
      );
    });
    it("includes new personal words without repeating completed words, and removes deleted words", () => {
      const personal = {
        ...words[0],
        id: "personal-word",
        word: "personal word",
        answer: "personal word",
        gap: "Use ___ here.",
      };
      const extended = buildUsageBank([...words, personal], mode);
      expect(extended.at(-1)?.wordId).toBe(personal.id);
      const finished = { ids: pool.map((q) => q.id), completed: pool.length };
      const round = usageSession(extended, finished);
      expect(round.questions.map((q) => q.wordId)).toEqual([personal.id]);
      const removed = usageSession(pool, round.deck);
      expect(removed.questions).toHaveLength(5);
      expect(removed.deck.ids).not.toContain(extended.at(-1)!.id);
    });
    it("recovers from invalid saved decks and supports a small or empty bank", () => {
      for (const saved of [
        {},
        { ids: null, completed: 0 },
        { ids: [pool[0].id, pool[0].id], completed: 0 },
        { ids: [], completed: -1 },
        { ids: [], completed: 0.5 },
      ]) {
        expect(usageSession(pool, saved as UsageDeck).questions).toHaveLength(
          5,
        );
      }
      expect(usageSession([]).questions).toEqual([]);
      expect(
        usageSession(buildUsageBank([words[0]], mode)).questions,
      ).toHaveLength(1);
    });
  });
}

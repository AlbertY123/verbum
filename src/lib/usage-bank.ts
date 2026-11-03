import type { Word } from "../types";
import {
  usageExercises,
  USAGE_SESSION_LENGTH,
  type UsageMode,
  type UsageQuestion,
} from "../data/usage-exercises";

export interface UsageDeck {
  ids: string[];
  completed: number;
}

export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Keep authored distinctions, then cover every remaining word using its own teaching material. */
export function buildUsageBank(
  words: Word[],
  mode: UsageMode,
): UsageQuestion[] {
  const authored = new Map(usageExercises[mode].map((q) => [q.wordId, q]));
  return words.map((word, index) => {
    const existing = authored.get(word.id);
    if (existing) return existing;

    // Restrict distractors to distinct words and forms. They are alternatives to
    // the specified vocabulary target, not claims that no synonym could fit.
    const candidates = words.filter(
      (other) =>
        other.id !== word.id &&
        other.word.toLocaleLowerCase() !== word.word.toLocaleLowerCase() &&
        other.definition.trim().toLocaleLowerCase() !==
          word.definition.trim().toLocaleLowerCase() &&
        other.answer.trim().toLocaleLowerCase() !==
          word.answer.trim().toLocaleLowerCase(),
    );
    candidates.sort(
      (a, b) =>
        Number(b.partOfSpeech === word.partOfSpeech) -
          Number(a.partOfSpeech === word.partOfSpeech) ||
        Number(b.category === word.category) -
          Number(a.category === word.category),
    );
    const distinct = [
      ...new Map(
        candidates.map((other) => [
          other.answer.trim().toLocaleLowerCase(),
          other,
        ]),
      ).values(),
    ];
    const samePartOfSpeech = distinct.filter(
      (other) => other.partOfSpeech === word.partOfSpeech,
    );
    const sameStrand = samePartOfSpeech.filter(
      (other) => other.category === word.category,
    );
    const distractors =
      sameStrand.length >= 3
        ? sameStrand
        : samePartOfSpeech.length >= 3
          ? samePartOfSpeech
          : distinct;
    const alternatives = Array.from(
      { length: Math.min(3, distractors.length) },
      (_, offset) => distractors[(index * 3 + offset) % distractors.length],
    );
    const gap =
      word.gap.split("___").length === 2 && word.answer.trim()
        ? word.gap
        : "The vocabulary term for this meaning is ___.";
    const answer = word.answer.trim() || word.word;
    const fill = (value: string) => gap.replace("___", () => value);
    const options = [word, ...alternatives].map((entry, position) => ({
      text:
        mode === "choice"
          ? position === 0
            ? answer
            : entry.answer
          : fill(position === 0 ? answer : entry.answer),
      explanation:
        position === 0
          ? `“${word.word}” means: ${word.definition} The model sentence is: ${fill(answer)} Usage guidance: ${word.caution}`
          : `“${entry.word}” means: ${entry.definition} This task asks for “${word.word}”, meaning: ${word.definition} Other wording may be valid English; this option does not supply the specified vocabulary target.`,
    }));
    // Spread the correct option across positions without deriving a correctness
    // judgement from potentially overlapping meanings of arbitrary words.
    const correctIndex = index % options.length;
    const correct = options.shift()!;
    options.splice(correctIndex, 0, correct);
    return {
      id: `${mode}-bank-${word.id}`,
      wordId: word.id,
      kind: "bank",
      prompt:
        mode === "choice"
          ? `Choose the vocabulary word with this taught meaning: ${word.definition}`
          : `Replace “${alternatives[0]?.answer ?? "[word to replace]"}” with “${word.word}” in the form the model sentence needs. Keep the rest of the sentence unchanged.`,
      context:
        mode === "choice"
          ? `Intended meaning: ${word.definition} Choose the word taught with this definition; another expression might also fit the sentence.`
          : `Intended meaning of the replacement: ${word.definition} Usage guidance: ${word.caution}`,
      sentence:
        mode === "choice"
          ? gap
          : fill(alternatives[0]?.answer ?? "[word to replace]"),
      options,
      correctIndex,
    };
  });
}

/** Retain the remaining deck across visits; reconcile added/deleted vocabulary. */
export function usageSession(
  pool: UsageQuestion[],
  saved?: UsageDeck,
  random = Math.random,
) {
  const byId = new Map(pool.map((question) => [question.id, question]));
  const valid =
    saved &&
    Array.isArray(saved.ids) &&
    saved.ids.every((id) => typeof id === "string") &&
    new Set(saved.ids).size === saved.ids.length &&
    Number.isInteger(saved.completed) &&
    saved.completed >= 0 &&
    saved.completed <= saved.ids.length;
  let ids = valid ? saved.ids.filter((id) => byId.has(id)) : [];
  let completed = valid
    ? saved.ids.slice(0, saved.completed).filter((id) => byId.has(id)).length
    : 0;
  const known = new Set(ids);
  ids.push(
    ...shuffle(
      pool.filter((q) => !known.has(q.id)).map((q) => q.id),
      random,
    ),
  );
  if (completed === ids.length) {
    ids = shuffle(ids, random);
    completed = 0;
  }
  const questions = ids
    .slice(completed, completed + USAGE_SESSION_LENGTH)
    .map((id) => byId.get(id)!);
  return {
    questions,
    deck: { ids, completed },
    nextDeck: { ids, completed: completed + questions.length },
  };
}

const storageKey = (mode: UsageMode) => `verbum.usage-deck.v1.${mode}`;
export function readUsageDeck(mode: UsageMode): UsageDeck | undefined {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(storageKey(mode)) ?? "null",
    );
    return value && typeof value === "object"
      ? (value as UsageDeck)
      : undefined;
  } catch {
    return undefined;
  }
}
export function saveUsageDeck(mode: UsageMode, deck: UsageDeck) {
  try {
    localStorage.setItem(storageKey(mode), JSON.stringify(deck));
  } catch {
    /* Practice still works when browser storage is unavailable. */
  }
}

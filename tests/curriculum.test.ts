import { describe, expect, it } from "vitest";
import { analysisWords } from "../src/data/analysis-words";
import { literaryWords } from "../src/data/literary-words";
import { words } from "../src/data/words";
import type { Word } from "../src/types";

const authoredWords = [...analysisWords, ...literaryWords];
const categories = [
  "Analytical verbs",
  "Argument & persuasion",
  "Tone & attitude",
  "Themes & ideas",
  "Character & society",
  "Literary craft",
];

function forms(word: Word): string[] {
  const headword = word.word.toLowerCase();
  if (word.partOfSpeech === "noun")
    return [
      headword,
      `${headword}s`,
      `${headword}es`,
      ...(headword.endsWith("y") ? [`${headword.slice(0, -1)}ies`] : []),
    ];
  if (word.partOfSpeech !== "verb") return [headword];
  const stem = headword.endsWith("e") ? headword.slice(0, -1) : headword;
  return [
    headword,
    `${headword}s`,
    `${headword}es`,
    `${stem}ing`,
    `${stem}ed`,
    ...(headword.endsWith("y")
      ? [`${headword.slice(0, -1)}ies`, `${headword.slice(0, -1)}ied`]
      : []),
  ];
}

describe("the authored VCE vocabulary curriculum", () => {
  it("contains 600 distinct entries without silently hiding duplicates during aggregation", () => {
    expect(authoredWords).toHaveLength(600);
    expect(new Set(authoredWords.map((word) => word.id)).size).toBe(600);
    expect(
      new Set(authoredWords.map((word) => word.word.toLowerCase())).size,
    ).toBe(600);
    expect(words).toEqual(authoredWords);
  });

  it("covers six strands with 100 entries each and valid learning metadata", () => {
    expect(
      [...new Set(authoredWords.map((word) => word.category))].sort(),
    ).toEqual([...categories].sort());
    for (const category of categories)
      expect(
        authoredWords.filter((word) => word.category === category),
      ).toHaveLength(100);
    for (const word of authoredWords) {
      expect(word.id, word.word).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(
        ["verb", "noun", "adjective", "adverb", "phrase"],
        word.word,
      ).toContain(word.partOfSpeech);
      expect(["Foundation", "Developing", "Advanced"], word.word).toContain(
        word.level,
      );
    }
  });

  it("gives every word a definition, an essay example, two combinations and usage guidance", () => {
    for (const word of authoredWords) {
      for (const field of ["definition", "example", "caution"] as const) {
        expect(
          word[field].trim().length,
          `${word.word}: ${field}`,
        ).toBeGreaterThan(15);
        expect(
          word[field],
          `${word.word}: unresolved editorial marker`,
        ).not.toMatch(/\[\[|\]\]|TODO|TBD|___/);
      }
      expect(word.collocations, word.word).toHaveLength(2);
      expect(new Set(word.collocations).size, word.word).toBe(2);
      for (const collocation of word.collocations)
        expect(collocation.trim().length, word.word).toBeGreaterThan(3);
    }
  });

  it("supplies exactly one retrievable target and an answer belonging to the taught headword", () => {
    for (const word of authoredWords) {
      expect(word.gap.split("___"), word.word).toHaveLength(2);
      expect(word.gap, word.word).not.toMatch(/\[\[|\]\]/);
      expect(word.answer.trim(), word.word).toBe(word.answer);
      expect(forms(word), `${word.word}: incompatible gap answer`).toContain(
        word.answer.toLowerCase(),
      );
      expect(
        word.gap.replace("___", word.answer).length,
        word.word,
      ).toBeGreaterThan(25);
    }
  });

  it("actually models each target word, allowing plural nouns and verb inflections", () => {
    for (const word of authoredWords) {
      const pattern = forms(word)
        .map((form) => form.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
        .join("|");
      expect(word.example.toLowerCase(), word.word).toMatch(
        new RegExp(`\\b(?:${pattern})\\b`),
      );
    }
  });

  it("uses Australian spellings for common regional variants", () => {
    const prose = authoredWords
      .flatMap((word) => [
        word.word,
        word.definition,
        word.example,
        word.caution,
        word.gap,
        ...word.collocations,
      ])
      .join("\n");
    expect(prose).not.toMatch(
      /\b(?:analyz(?:e|es|ed|ing)|emphasiz(?:e|es|ed|ing)|symboliz(?:e|es|ed|ing)|marginaliz(?:e|es|ed|ing)|prioritiz(?:e|es|ed|ing)|characteriz(?:e|es|ed|ing)|behavior(?:s|al)?|color(?:s|ed|ful)?|labor(?:s|ed|ing)?|neighbor(?:s|hood)?|skeptical|organization(?:s)?|defense)\b/i,
    );
    expect(authoredWords.some((word) => word.word === "sceptical")).toBe(true);
    expect(authoredWords.some((word) => word.word === "characterise")).toBe(
      true,
    );
    expect(authoredWords.some((word) => word.word === "marginalisation")).toBe(
      true,
    );
  });
});

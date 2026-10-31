export type Category =
  | "Analytical verbs"
  | "Argument & persuasion"
  | "Tone & attitude"
  | "Themes & ideas"
  | "Character & society"
  | "Literary craft";
export interface Word {
  id: string;
  word: string;
  pronunciation?: string;
  partOfSpeech: "verb" | "noun" | "adjective" | "adverb" | "phrase";
  category: Category;
  level: "Foundation" | "Developing" | "Advanced";
  definition: string;
  example: string;
  collocations: string[];
  caution: string;
  gap: string;
  answer: string;
  contrast?: string;
}
export interface WordProgress {
  interval: number;
  ease: number;
  due: string;
  reviews: number;
  lapses: number;
  introduced: string;
  lastReviewed: string;
}
export interface Activity {
  date: string;
  reviews: number;
  correct: number;
  newWords: number;
  writing: number;
  typing: number;
}
export interface WritingEntry {
  id: string;
  wordId: string;
  sentence: string;
  date: string;
}
export interface LearnerState {
  version: 1;
  name: string;
  dailyGoal: number;
  focus: "All vocabulary" | Category;
  onboarded: boolean;
  progress: Record<string, WordProgress>;
  activity: Record<string, Activity>;
  saved: string[];
  customWords: Word[];
  writing: WritingEntry[];
  updatedAt: string;
}
export type Rating = "again" | "hard" | "good" | "easy";

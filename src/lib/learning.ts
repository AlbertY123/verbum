import type {
  Activity,
  LearnerState,
  Rating,
  Word,
  WordProgress,
} from "../types";

export const categories = [
  "Analytical verbs",
  "Argument & persuasion",
  "Tone & attitude",
  "Themes & ideas",
  "Character & society",
  "Literary craft",
] as const;
export const dayKey = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export function emptyState(): LearnerState {
  return {
    version: 1,
    name: "",
    dailyGoal: 5,
    focus: "All vocabulary",
    onboarded: false,
    progress: {},
    activity: {},
    saved: [],
    customWords: [],
    writing: [],
    updatedAt: new Date().toISOString(),
  };
}
export function normaliseAnswer(text: string): string {
  return text
    .toLocaleLowerCase("en-AU")
    .trim()
    .replace(/[’‘]/g, "'")
    .replace(/\s+/g, " ")
    .replace(/[.!?]+$/, "");
}
/** Accept keyboard equivalents of print typography while preserving words, case and punctuation. */
export function normaliseTyping(text: string): string {
  return text
    .normalize("NFC")
    .replace(/[\u2018\u2019\u201a\u201b]/g, "'")
    .replace(/[\u201c\u201d\u201e\u201f]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/[\u00a0\u202f]/g, " ");
}
export function schedule(
  previous: WordProgress | undefined,
  rating: Rating,
  now = new Date(),
): WordProgress {
  const ease = Math.max(
    1.3,
    Math.min(
      3,
      (previous?.ease ?? 2.5) +
        (rating === "easy"
          ? 0.15
          : rating === "hard"
            ? -0.15
            : rating === "again"
              ? -0.2
              : 0),
    ),
  );
  let interval =
    rating === "again"
      ? 0
      : rating === "hard"
        ? Math.max(1, Math.round((previous?.interval ?? 0) * 1.2))
        : rating === "easy"
          ? Math.max(4, Math.round((previous?.interval ?? 0) * ease * 1.3))
          : Math.max(
              previous?.reviews ? 3 : 1,
              Math.round((previous?.interval ?? 0) * ease),
            );
  interval = Math.min(365, interval);
  const due = new Date(now);
  if (rating === "again") due.setMinutes(due.getMinutes() + 10);
  else due.setDate(due.getDate() + interval);
  return {
    interval,
    ease,
    due: due.toISOString(),
    reviews: (previous?.reviews ?? 0) + 1,
    lapses: (previous?.lapses ?? 0) + (rating === "again" ? 1 : 0),
    introduced: previous?.introduced ?? now.toISOString(),
    lastReviewed: now.toISOString(),
  };
}
export function recordReview(
  state: LearnerState,
  wordId: string,
  rating: Rating,
  now = new Date(),
): LearnerState {
  const date = dayKey(now);
  const activity = state.activity[date] ?? {
    date,
    reviews: 0,
    correct: 0,
    newWords: 0,
    writing: 0,
    typing: 0,
  };
  return {
    ...state,
    updatedAt: now.toISOString(),
    progress: {
      ...state.progress,
      [wordId]: schedule(state.progress[wordId], rating, now),
    },
    activity: {
      ...state.activity,
      [date]: {
        ...activity,
        reviews: activity.reviews + 1,
        correct: activity.correct + (rating === "again" ? 0 : 1),
        newWords: activity.newWords + (state.progress[wordId] ? 0 : 1),
      },
    },
  };
}
export function recordPractice(
  state: LearnerState,
  kind: "writing" | "typing",
  now = new Date(),
): LearnerState {
  const date = dayKey(now);
  const activity: Activity = state.activity[date] ?? {
    date,
    reviews: 0,
    correct: 0,
    newWords: 0,
    writing: 0,
    typing: 0,
  };
  return {
    ...state,
    updatedAt: now.toISOString(),
    activity: {
      ...state.activity,
      [date]: { ...activity, [kind]: activity[kind] + 1 },
    },
  };
}
export function recordUsage(
  state: LearnerState,
  mode: "choice" | "repair",
  now = new Date(),
): LearnerState {
  const date = dayKey(now);
  const previous: Activity = state.activity[date] ?? {
    date,
    reviews: 0,
    correct: 0,
    newWords: 0,
    writing: 0,
    typing: 0,
  };
  return {
    ...state,
    updatedAt: now.toISOString(),
    activity: {
      ...state.activity,
      [date]: { ...previous, [mode]: (previous[mode] ?? 0) + 1 },
    },
  };
}
export function activityTotal(activity?: Activity): number {
  return activity
    ? activity.reviews +
        activity.writing +
        activity.typing +
        (activity.choice ?? 0) +
        (activity.repair ?? 0)
    : 0;
}
export function getQueue(
  words: Word[],
  state: LearnerState,
  now = new Date(),
): Word[] {
  const due = words
    .filter(
      (w) => state.progress[w.id] && new Date(state.progress[w.id].due) <= now,
    )
    .sort((a, b) =>
      state.progress[a.id].due.localeCompare(state.progress[b.id].due),
    );
  const remaining = Math.max(
    0,
    state.dailyGoal - (state.activity[dayKey(now)]?.newWords ?? 0),
  );
  const unseen = words.filter(
    (w) =>
      !state.progress[w.id] &&
      (state.focus === "All vocabulary" || w.category === state.focus),
  );
  const personal = new Set(state.customWords.map((word) => word.id));
  const ordered = [...unseen].sort(
    (a, b) =>
      Number(personal.has(b.id)) - Number(personal.has(a.id)) ||
      ["Foundation", "Developing", "Advanced"].indexOf(a.level) -
        ["Foundation", "Developing", "Advanced"].indexOf(b.level),
  );
  return [...due.slice(0, 30), ...ordered.slice(0, remaining)];
}
export function streak(state: LearnerState, now = new Date()): number {
  const cursor = new Date(now);
  let result = 0;
  const active = () => {
    const a = state.activity[dayKey(cursor)];
    return activityTotal(a) > 0;
  };
  if (!active()) cursor.setDate(cursor.getDate() - 1);
  while (active()) {
    result++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return result;
}
export function isLearnerState(value: unknown): value is LearnerState {
  if (!value || typeof value !== "object") return false;
  const s = value as LearnerState;
  return (
    s.version === 1 &&
    typeof s.name === "string" &&
    s.name.length <= 80 &&
    Number.isInteger(s.dailyGoal) &&
    s.dailyGoal >= 3 &&
    s.dailyGoal <= 10 &&
    (s.focus === "All vocabulary" || categories.includes(s.focus)) &&
    typeof s.onboarded === "boolean" &&
    !!s.progress &&
    typeof s.progress === "object" &&
    !Array.isArray(s.progress) &&
    Object.values(s.progress).every(
      (p) =>
        p &&
        Number.isFinite(p.interval) &&
        p.interval >= 0 &&
        Number.isFinite(p.ease) &&
        p.reviews >= 0 &&
        p.lapses >= 0 &&
        Number.isFinite(Date.parse(p.due)) &&
        Number.isFinite(Date.parse(p.lastReviewed)) &&
        Number.isFinite(Date.parse(p.introduced)),
    ) &&
    !!s.activity &&
    typeof s.activity === "object" &&
    !Array.isArray(s.activity) &&
    Object.values(s.activity).every(
      (a) =>
        a &&
        typeof a.date === "string" &&
        [
          a.reviews,
          a.correct,
          a.newWords,
          a.writing,
          a.typing,
          a.choice ?? 0,
          a.repair ?? 0,
        ].every((n) => Number.isFinite(n) && n >= 0),
    ) &&
    Array.isArray(s.saved) &&
    s.saved.every((x) => typeof x === "string") &&
    Array.isArray(s.customWords) &&
    s.customWords.length <= 1000 &&
    s.customWords.every(
      (w) =>
        w &&
        typeof w.id === "string" &&
        typeof w.word === "string" &&
        typeof w.definition === "string" &&
        typeof w.example === "string" &&
        typeof w.caution === "string" &&
        typeof w.gap === "string" &&
        typeof w.answer === "string" &&
        Array.isArray(w.collocations) &&
        w.collocations.every((c) => typeof c === "string") &&
        categories.includes(w.category) &&
        ["Foundation", "Developing", "Advanced"].includes(w.level),
    ) &&
    Array.isArray(s.writing) &&
    s.writing.length <= 500 &&
    s.writing.every(
      (w) =>
        w &&
        typeof w.id === "string" &&
        typeof w.wordId === "string" &&
        typeof w.sentence === "string" &&
        typeof w.date === "string",
    ) &&
    Number.isFinite(Date.parse(s.updatedAt))
  );
}
export function mergeStates(
  local: LearnerState,
  remote: LearnerState,
): LearnerState {
  const latest = local.updatedAt > remote.updatedAt ? local : remote;
  const progress = { ...remote.progress };
  for (const [id, p] of Object.entries(local.progress))
    if (!progress[id] || p.lastReviewed > progress[id].lastReviewed)
      progress[id] = p;
  const activity = { ...remote.activity };
  for (const [date, a] of Object.entries(local.activity)) {
    const b = activity[date];
    activity[date] = b
      ? {
          date,
          reviews: Math.max(a.reviews, b.reviews),
          correct: Math.max(a.correct, b.correct),
          newWords: Math.max(a.newWords, b.newWords),
          writing: Math.max(a.writing, b.writing),
          typing: Math.max(a.typing, b.typing),
          choice: Math.max(a.choice ?? 0, b.choice ?? 0),
          repair: Math.max(a.repair ?? 0, b.repair ?? 0),
        }
      : a;
  }
  return {
    ...latest,
    progress,
    activity,
    customWords: Array.from(
      new Map(
        [...remote.customWords, ...local.customWords].map((w) => [w.id, w]),
      ).values(),
    ),
    writing: Array.from(
      new Map(
        [...remote.writing, ...local.writing].map((w) => [w.id, w]),
      ).values(),
    ).slice(-500),
  };
}
export function guidedTask(word: Word) {
  const tasks = {
    "Analytical verbs": {
      context:
        "A fictional mayor calls a proposed library closure “a necessary saving”, but later admits the council has spent more on its own offices.",
      task: "Explain how the contrast shapes our view of the mayor. Use the target verb to make a precise analytical claim.",
      stem: "The contrast between … and …",
      checks: [
        "Name the specific contrast.",
        "Use the target verb in the right form.",
        "Explain what the contrast reveals about the mayor.",
      ],
    },
    "Argument & persuasion": {
      context:
        "An editorial argues for free school lunches. It opens with a hungry student’s story, then cites improved attendance at schools that provide meals.",
      task: "Decide whether the target term fits a persuasive choice in this extract. If it does, explain its intended effect on parents. If it does not, propose a short rewrite that would demonstrate it, clearly labelling your wording as an addition.",
      stem: "The editorial uses … to … / A proposed rewrite, “...”, would use … to …",
      checks: [
        "Identify a supported choice or clearly label a proposed rewrite.",
        "Use the target term accurately without inventing evidence.",
        "Explain the intended effect on parents.",
      ],
    },
    "Tone & attitude": {
      context:
        "A columnist writes: “Another grand announcement. Another empty playground. Apparently, our children can play on promises.”",
      task: "Decide whether your target tone word fits. If it does, explain why. If it does not, explain what wording would need to change to create that tone.",
      stem: "The phrase “…” creates / does not create a … tone because …",
      checks: [
        "Refer to a particular word or phrase.",
        "Justify whether the tone word fits.",
        "Explain the intended response.",
      ],
    },
    "Themes & ideas": {
      context:
        "In a fictional story, Mara leaves her coastal hometown for university. She adopts her classmates’ accent, then refuses to translate her grandmother’s stories at a family gathering.",
      task: "Use the target concept to develop a possible reading of Mara’s choices. If it does not fit this scene, add one plausible detail that would make it relevant and label that addition.",
      stem: "Mara’s decision to … suggests …",
      checks: [
        "Connect the concept to a concrete action.",
        "Avoid asserting more than the scene supports.",
        "Explain the wider idea rather than retelling the story.",
      ],
    },
    "Character & society": {
      context:
        "A fictional town praises its founder as a hero. When a student discovers that he displaced local families, the council refuses to amend the memorial.",
      task: "Use the target word to interpret the council, the student or the community. If needed, propose and label an extra detail that would support your interpretation.",
      stem: "The council’s refusal to … reflects …",
      checks: [
        "Identify whose behaviour you are interpreting.",
        "Support the target word with a specific detail.",
        "Connect individual behaviour to a social value.",
      ],
    },
    "Literary craft": {
      context:
        "A fictional novel opens with a locked garden gate. In the final chapter, the protagonist returns and leaves it open. Between these scenes, she learns why her family hid their history.",
      task: "Explain how a writer could use the target technique or concept in this story. Distinguish what is already in the extract from any technique you propose adding.",
      stem: "The writer’s use of … could …",
      checks: [
        "Identify or propose a concrete literary choice.",
        "Use the term accurately.",
        "Connect the choice to meaning or reader response.",
      ],
    },
  };
  return tasks[word.category];
}

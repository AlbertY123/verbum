import { analysisWords } from "./analysis-words";
import { literaryWords } from "./literary-words";
export const words = [...analysisWords, ...literaryWords].filter(
  (w, i, all) =>
    all.findIndex(
      (other) => other.word.toLowerCase() === w.word.toLowerCase(),
    ) === i,
);

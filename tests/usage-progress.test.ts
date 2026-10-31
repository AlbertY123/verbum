import { describe, expect, it } from "vitest";
import {
  activityTotal,
  dayKey,
  emptyState,
  isLearnerState,
  mergeStates,
  recordUsage,
  streak,
} from "../src/lib/learning";

describe("usage practice progress", () => {
  const now = new Date("2026-11-01T12:00:00");
  it("records both modes and counts them towards the study streak", () => {
    const result = recordUsage(
      recordUsage(emptyState(), "choice", now),
      "repair",
      now,
    );
    expect(result.activity[dayKey(now)].choice).toBe(1);
    expect(result.activity[dayKey(now)].repair).toBe(1);
    expect(activityTotal(result.activity[dayKey(now)])).toBe(2);
    expect(streak(result, now)).toBe(1);
    expect(isLearnerState(result)).toBe(true);
  });
  it("merges new counters while keeping old saved data compatible", () => {
    const older = emptyState();
    const newer = recordUsage(older, "repair", now);
    expect(isLearnerState(older)).toBe(true);
    expect(mergeStates(older, newer).activity[dayKey(now)].repair).toBe(1);
    expect(activityTotal()).toBe(0);
    expect(
      isLearnerState({
        ...newer,
        activity: {
          [dayKey(now)]: { ...newer.activity[dayKey(now)], repair: -1 },
        },
      }),
    ).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";
import { emptyState, recordReview } from "../src/lib/learning";
import { saveLearnerSnapshot, type SyncClient } from "../src/lib/sync";

describe("revision-checked cloud saves", () => {
  it("binds each write to the expected account and server revision", async () => {
    const state = emptyState();
    const rpc = vi
      .fn()
      .mockResolvedValue({
        data: { saved: true, state, revision: 4 },
        error: null,
      });
    const saved = await saveLearnerSnapshot(
      { rpc } as unknown as SyncClient,
      "learner-a",
      state,
      3,
    );
    expect(saved.revision).toBe(4);
    expect(rpc).toHaveBeenCalledWith("save_learner_state", {
      p_user_id: "learner-a",
      p_state: state,
      p_expected_revision: 3,
    });
  });

  it("merges remote work and retries instead of overwriting another device", async () => {
    const local = recordReview(
      emptyState(),
      "elucidate",
      "good",
      new Date("2026-11-01T09:00:00Z"),
    );
    const remote = recordReview(
      emptyState(),
      "juxtapose",
      "good",
      new Date("2026-11-01T09:01:00Z"),
    );
    const rpc = vi
      .fn()
      .mockResolvedValueOnce({
        data: { saved: false, state: remote, revision: 8 },
        error: null,
      })
      .mockImplementationOnce((_name, args) =>
        Promise.resolve({
          data: { saved: true, state: args.p_state, revision: 9 },
          error: null,
        }),
      );
    const saved = await saveLearnerSnapshot(
      { rpc } as unknown as SyncClient,
      "learner-a",
      local,
      7,
    );
    expect(Object.keys(saved.state.progress).sort()).toEqual([
      "elucidate",
      "juxtapose",
    ]);
    expect(rpc.mock.calls[1][1].p_expected_revision).toBe(8);
  });

  it("refuses to retry under a changed account", async () => {
    const state = emptyState();
    const rpc = vi
      .fn()
      .mockResolvedValue({
        data: { saved: false, state, revision: 2 },
        error: null,
      });
    const current = vi.fn().mockReturnValueOnce(true).mockReturnValue(false);
    await expect(
      saveLearnerSnapshot(
        { rpc } as unknown as SyncClient,
        "learner-a",
        state,
        1,
        current,
      ),
    ).rejects.toThrow(/account changed/);
    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("preserves local work when a cloud record is invalid", async () => {
    const state = emptyState();
    const before = JSON.stringify(state);
    const rpc = vi
      .fn()
      .mockResolvedValue({
        data: { saved: false, state: { version: 99 }, revision: 2 },
        error: null,
      });
    await expect(
      saveLearnerSnapshot(
        { rpc } as unknown as SyncClient,
        "learner-a",
        state,
        1,
      ),
    ).rejects.toThrow(/preserved/);
    expect(JSON.stringify(state)).toBe(before);
  });

  it("bounds contention retries and surfaces network errors", async () => {
    const state = emptyState();
    const rpc = vi
      .fn()
      .mockResolvedValue({
        data: { saved: false, state, revision: 2 },
        error: null,
      });
    await expect(
      saveLearnerSnapshot(
        { rpc } as unknown as SyncClient,
        "learner-a",
        state,
        1,
      ),
    ).rejects.toThrow(/Another device/);
    expect(rpc).toHaveBeenCalledTimes(4);
    rpc.mockResolvedValue({
      data: null,
      error: { message: "connection unavailable" },
    });
    await expect(
      saveLearnerSnapshot(
        { rpc } as unknown as SyncClient,
        "learner-a",
        state,
        1,
      ),
    ).rejects.toThrow(/sync is unavailable/);
  });
});

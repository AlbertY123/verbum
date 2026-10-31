import type { SupabaseClient } from "@supabase/supabase-js";
import type { LearnerState } from "../types";
import { isLearnerState, mergeStates } from "./learning";

export interface SavedSnapshot {
  state: LearnerState;
  revision: number;
}
export type SyncClient = Pick<SupabaseClient, "rpc">;

/** The server serialises revisions; a concurrent writer is merged and retried. */
export async function saveLearnerSnapshot(
  client: SyncClient,
  userId: string,
  state: LearnerState,
  expectedRevision: number,
  isCurrent: () => boolean = () => true,
): Promise<SavedSnapshot> {
  let candidate = state;
  let revision = expectedRevision;
  for (let attempt = 0; attempt < 4; attempt++) {
    if (!isCurrent())
      throw new Error(
        "Your account changed while saving. Your progress remains on this device.",
      );
    const { data, error } = await client.rpc("save_learner_state", {
      p_user_id: userId,
      p_state: candidate,
      p_expected_revision: revision,
    });
    if (error)
      throw new Error(
        "Cloud sync is unavailable. Your progress is saved on this device. Please retry when online.",
      );
    if (
      !data ||
      typeof data.saved !== "boolean" ||
      !Number.isSafeInteger(data.revision) ||
      data.revision < 0 ||
      !isLearnerState(data.state)
    ) {
      throw new Error(
        "The cloud record could not be read safely. Your local progress has been preserved.",
      );
    }
    if (data.saved) return { state: data.state, revision: data.revision };
    candidate = mergeStates(candidate, data.state);
    revision = data.revision;
  }
  throw new Error(
    "Another device is updating this account. Close its study session, then retry syncing here.",
  );
}

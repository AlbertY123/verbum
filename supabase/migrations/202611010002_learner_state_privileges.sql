-- Remove surplus privileges inherited from Supabase's default table grants.
-- Browser clients read/delete their own rows; inserts/updates use the save RPC.
begin;

revoke all on table public.learner_state from authenticated;
grant select, delete on table public.learner_state to authenticated;

commit;

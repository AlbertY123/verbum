-- Run once in the Supabase SQL editor. No service-role key is needed by the app.
begin;

create table if not exists public.learner_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null default '{}'::jsonb,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now(),
  constraint learner_state_object check (jsonb_typeof(state) = 'object'),
  constraint learner_state_size check (octet_length(state::text) <= 1048576)
);

alter table public.learner_state enable row level security;
alter table public.learner_state force row level security;

revoke all on public.learner_state from anon;
revoke insert, update on public.learner_state from authenticated;
grant select, delete on public.learner_state to authenticated;

create policy "Learners read their own progress"
  on public.learner_state for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "Learners create their own progress"
  on public.learner_state for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "Learners update their own progress"
  on public.learner_state for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "Learners delete their own progress"
  on public.learner_state for delete to authenticated
  using ((select auth.uid()) = user_id);

create or replace function public.stamp_learner_state()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger learner_state_updated_at
before update on public.learner_state
for each row execute function public.stamp_learner_state();

-- Serialise updates and reject writes made with a stale account session.
create or replace function public.save_learner_state(
  p_user_id uuid, p_state jsonb, p_expected_revision bigint
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  caller uuid := auth.uid();
  existing_state jsonb;
  existing_revision bigint;
begin
  if caller is null or p_user_id is null or caller <> p_user_id then
    raise exception 'Authentication changed' using errcode = '28000';
  end if;
  if p_expected_revision is null or p_expected_revision < 0
     or p_state is null or jsonb_typeof(p_state) <> 'object'
     or octet_length(p_state::text) > 1048576 then
    raise exception 'Invalid learner state' using errcode = '22023';
  end if;
  insert into public.learner_state(user_id) values (caller)
  on conflict (user_id) do nothing;
  select state, revision into existing_state, existing_revision
    from public.learner_state where user_id = caller for update;
  if existing_revision <> p_expected_revision then
    return jsonb_build_object('saved', false, 'state', existing_state, 'revision', existing_revision);
  end if;
  update public.learner_state set state = p_state, revision = revision + 1
    where user_id = caller returning revision into existing_revision;
  return jsonb_build_object('saved', true, 'state', p_state, 'revision', existing_revision);
end;
$$;
revoke all on function public.save_learner_state(uuid, jsonb, bigint) from public, anon;
grant execute on function public.save_learner_state(uuid, jsonb, bigint) to authenticated;

-- SECURITY DEFINER is restricted to auth.uid(), also checking the UI's expected
-- identity. No search_path lookup. Cascading deletes remove all learner data.
create or replace function public.delete_own_account(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare caller uuid := auth.uid();
begin
  if caller is null or p_user_id is null or caller <> p_user_id then
    raise exception 'Authentication required' using errcode = '28000';
  end if;
  delete from auth.users where id = caller;
end;
$$;
revoke all on function public.delete_own_account(uuid) from public, anon;
grant execute on function public.delete_own_account(uuid) to authenticated;

commit;

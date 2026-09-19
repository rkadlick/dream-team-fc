-- Dream Team FC — initial schema
-- One club, manual post-game data entry, public read, admin-only writes.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.seasons (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  start_date  date not null,
  end_date    date,
  is_current  boolean not null default false,
  created_at  timestamptz not null default now()
);

-- Only one season may be the current one.
create unique index seasons_one_current_idx
  on public.seasons (is_current)
  where is_current;

create table public.players (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  jersey_number  int,
  -- Quoted because bare `position in (...)` can collide with the
  -- position(substring in string) function syntax.
  position       text check ("position" in (
                    'GK','CB','LB','RB','CDM','CM','CAM','LM','RM','LW','RW','ST'
                  )),
  is_human       boolean not null default false,
  gamertag       text,
  user_id        uuid unique references auth.users(id) on delete set null,
  is_active      boolean not null default true,
  created_at     timestamptz not null default now()
);

comment on table public.players is
  'Full roster. AI teammates are ordinary rows with is_human = false; they keep the same real name from game to game.';

create table public.game_types (
  id          uuid primary key default gen_random_uuid(),
  name        text unique not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

comment on table public.game_types is
  'League / Playoff / Promotion plus any named tournament ("Summer Cup"), which is added later as its own game type.';

create table public.matches (
  id               uuid primary key default gen_random_uuid(),
  season_id        uuid not null references public.seasons(id),
  game_type_id     uuid not null references public.game_types(id),
  played_on        date not null,
  division         int not null check (division >= 1),
  opponent         text not null,
  home_away        text not null check (home_away in ('home','away')),
  score_us         int not null check (score_us >= 0),
  score_them       int not null check (score_them >= 0),
  opp_own_goals    int not null default 0 check (opp_own_goals >= 0),
  went_to_overtime boolean not null default false,
  went_to_pks      boolean not null default false,
  pk_us            int check (pk_us >= 0),
  pk_them          int check (pk_them >= 0),
  result           text not null check (result in ('W','D','L')),
  notes            text,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  -- PK scores only make sense for a shootout, and stay optional even then.
  constraint matches_pks_only_when_shootout
    check (went_to_pks or (pk_us is null and pk_them is null))
);

comment on column public.matches.result is
  'Stored explicitly as entered, never derived from the scores.';
comment on column public.matches.opp_own_goals is
  'Own goals by the opponent. Already included in score_us, so it is not attributed to any player.';

create index matches_season_idx on public.matches (season_id);
create index matches_played_on_idx on public.matches (played_on desc);

create table public.match_player_stats (
  id          uuid primary key default gen_random_uuid(),
  match_id    uuid not null references public.matches(id) on delete cascade,
  player_id   uuid not null references public.players(id) on delete restrict,
  goals       int not null default 0 check (goals >= 0),
  assists     int not null default 0 check (assists >= 0),
  created_at  timestamptz not null default now(),
  unique (match_id, player_id)
);

comment on table public.match_player_stats is
  'One row per player who recorded something in a match. Future stats (shots, yellow_cards, red_cards, saves, ...) are added as new int columns with "not null default 0" — no view or function changes required. A row is always saved for every human player who played (even 0/0); AI players only get a row when they scored or assisted, so games played is counted from these rows for human players only.';

create index match_player_stats_player_idx on public.match_player_stats (player_id);

create table public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

comment on table public.admins is
  'Admin allow-list. Rows are inserted by hand through the Supabase SQL editor; there are no client write policies.';

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger matches_set_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- Insert-or-update a match and replace all of its player stat rows, atomically.
-- security invoker: RLS on matches / match_player_stats is the real enforcement.
create or replace function public.save_match(p_match jsonb, p_stats jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id uuid := nullif(p_match->>'id', '')::uuid;
begin
  if v_id is null then
    insert into public.matches (
      season_id, game_type_id, played_on, division, opponent, home_away,
      score_us, score_them, opp_own_goals, went_to_overtime, went_to_pks,
      pk_us, pk_them, result, notes, created_by
    )
    values (
      (p_match->>'season_id')::uuid,
      (p_match->>'game_type_id')::uuid,
      (p_match->>'played_on')::date,
      (p_match->>'division')::int,
      p_match->>'opponent',
      p_match->>'home_away',
      (p_match->>'score_us')::int,
      (p_match->>'score_them')::int,
      coalesce((p_match->>'opp_own_goals')::int, 0),
      coalesce((p_match->>'went_to_overtime')::boolean, false),
      coalesce((p_match->>'went_to_pks')::boolean, false),
      nullif(p_match->>'pk_us', '')::int,
      nullif(p_match->>'pk_them', '')::int,
      p_match->>'result',
      nullif(p_match->>'notes', ''),
      auth.uid()
    )
    returning id into v_id;
  else
    update public.matches set
      season_id        = (p_match->>'season_id')::uuid,
      game_type_id     = (p_match->>'game_type_id')::uuid,
      played_on        = (p_match->>'played_on')::date,
      division         = (p_match->>'division')::int,
      opponent         = p_match->>'opponent',
      home_away        = p_match->>'home_away',
      score_us         = (p_match->>'score_us')::int,
      score_them       = (p_match->>'score_them')::int,
      opp_own_goals    = coalesce((p_match->>'opp_own_goals')::int, 0),
      went_to_overtime = coalesce((p_match->>'went_to_overtime')::boolean, false),
      went_to_pks      = coalesce((p_match->>'went_to_pks')::boolean, false),
      pk_us            = nullif(p_match->>'pk_us', '')::int,
      pk_them          = nullif(p_match->>'pk_them', '')::int,
      result           = p_match->>'result',
      notes            = nullif(p_match->>'notes', '')
    where id = v_id;

    if not found then
      raise exception 'Match % not found or not writable', v_id;
    end if;
  end if;

  delete from public.match_player_stats where match_id = v_id;

  insert into public.match_player_stats (match_id, player_id, goals, assists)
  select v_id, s.player_id, coalesce(s.goals, 0), coalesce(s.assists, 0)
  from jsonb_to_recordset(coalesce(p_stats, '[]'::jsonb))
       as s(player_id uuid, goals int, assists int);

  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.seasons            enable row level security;
alter table public.players            enable row level security;
alter table public.game_types         enable row level security;
alter table public.matches            enable row level security;
alter table public.match_player_stats enable row level security;
alter table public.admins             enable row level security;

create policy "seasons are public" on public.seasons
  for select to anon, authenticated using (true);
create policy "admins insert seasons" on public.seasons
  for insert to authenticated with check (public.is_admin());
create policy "admins update seasons" on public.seasons
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete seasons" on public.seasons
  for delete to authenticated using (public.is_admin());

create policy "players are public" on public.players
  for select to anon, authenticated using (true);
create policy "admins insert players" on public.players
  for insert to authenticated with check (public.is_admin());
create policy "admins update players" on public.players
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete players" on public.players
  for delete to authenticated using (public.is_admin());

create policy "game types are public" on public.game_types
  for select to anon, authenticated using (true);
create policy "admins insert game types" on public.game_types
  for insert to authenticated with check (public.is_admin());
create policy "admins update game types" on public.game_types
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete game types" on public.game_types
  for delete to authenticated using (public.is_admin());

create policy "matches are public" on public.matches
  for select to anon, authenticated using (true);
create policy "admins insert matches" on public.matches
  for insert to authenticated with check (public.is_admin());
create policy "admins update matches" on public.matches
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete matches" on public.matches
  for delete to authenticated using (public.is_admin());

create policy "match stats are public" on public.match_player_stats
  for select to anon, authenticated using (true);
create policy "admins insert match stats" on public.match_player_stats
  for insert to authenticated with check (public.is_admin());
create policy "admins update match stats" on public.match_player_stats
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admins delete match stats" on public.match_player_stats
  for delete to authenticated using (public.is_admin());

-- Admins may only read their own row; there is no client write path.
create policy "read own admin row" on public.admins
  for select to authenticated using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Seed (structural, not sample data)
-- ---------------------------------------------------------------------------

insert into public.game_types (name) values
  ('League'), ('Playoff'), ('Promotion')
on conflict (name) do nothing;

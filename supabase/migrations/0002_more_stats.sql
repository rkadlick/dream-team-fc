-- Dream Team FC — extra player and match statistics.
--
-- Everything added here is OPTIONAL: the new columns are nullable with no
-- default, so `null` means "not tracked for this match" and `0` means
-- "tracked, and it was zero". goals and assists keep their `not null default 0`
-- so existing rows and the goal-attribution check are untouched.

-- ---------------------------------------------------------------------------
-- Per-player stats
-- ---------------------------------------------------------------------------

alter table public.match_player_stats
  add column shots            int check (shots >= 0),
  add column shots_on_target  int check (shots_on_target >= 0),
  add column tackles          int check (tackles >= 0),
  add column saves            int check (saves >= 0),
  add column yellow_cards     int check (yellow_cards >= 0),
  add column red_cards        int check (red_cards >= 0),
  add column potg_rank        int check (potg_rank between 1 and 3);

-- Deliberately no cross-column constraints (e.g. shots_on_target <= shots).
-- A backfilled match may record goals without shots, and a CHECK would block
-- saving it. The match form warns instead.

comment on column public.match_player_stats.saves is
  'Goalkeepers only in practice, but stored for every player: position can change, and the data must not be lost when it does. The UI hides the field for non-keepers.';
comment on column public.match_player_stats.potg_rank is
  'Player of the match. 1-3 players per match may be named; the rank is only a slot to keep them distinct, not a placing.';

-- At most one player per slot per match.
create unique index match_player_stats_potg_idx
  on public.match_player_stats (match_id, potg_rank)
  where potg_rank is not null;

comment on table public.match_player_stats is
  'One row per player who appeared in a match, human or AI, even at zero. Games played is counted from these rows. Future stats are added as new nullable int columns AND to public.save_match (which lists them explicitly) AND to lib/stats-config.ts.';

-- ---------------------------------------------------------------------------
-- Per-match team stats, recorded for both sides
-- ---------------------------------------------------------------------------

alter table public.matches
  add column shots_us            int check (shots_us >= 0),
  add column shots_them          int check (shots_them >= 0),
  add column tackles_us          int check (tackles_us >= 0),
  add column tackles_them        int check (tackles_them >= 0),
  add column possession_us       int check (possession_us between 0 and 100),
  add column possession_them     int check (possession_them between 0 and 100),
  add column pass_accuracy_us    int check (pass_accuracy_us between 0 and 100),
  add column pass_accuracy_them  int check (pass_accuracy_them between 0 and 100);

comment on column public.matches.shots_us is
  'Team shots as reported by the game. Deliberately not reconciled against the sum of per-player shots, which excludes anything not attributed.';
comment on column public.matches.possession_us is
  'Not constrained to sum to 100 with possession_them: in-game stat screens round.';

-- ---------------------------------------------------------------------------
-- save_match: now carries the new columns, and refuses payload keys it does
-- not know about.
--
-- This function lists every column explicitly, so adding a stat column WITHOUT
-- adding it here would make the app appear to save the stat while the RPC
-- silently dropped it. The two guards below turn that into a loud error.
-- ---------------------------------------------------------------------------

create or replace function public.save_match(p_match jsonb, p_stats jsonb)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_id  uuid := nullif(p_match->>'id', '')::uuid;
  v_bad text;
begin
  select string_agg(distinct k, ', ')
    into v_bad
  from jsonb_object_keys(coalesce(p_match, '{}'::jsonb)) as k
  where k <> all (array[
    'id','season_id','game_type_id','played_on','division','opponent',
    'home_away','score_us','score_them','opp_own_goals','went_to_overtime',
    'went_to_pks','pk_us','pk_them','result','notes',
    'shots_us','shots_them','tackles_us','tackles_them',
    'possession_us','possession_them','pass_accuracy_us','pass_accuracy_them'
  ]);
  if v_bad is not null then
    raise exception 'save_match: unknown match key(s): %', v_bad;
  end if;

  select string_agg(distinct k, ', ')
    into v_bad
  from jsonb_array_elements(coalesce(p_stats, '[]'::jsonb)) as e(elem),
       lateral jsonb_object_keys(e.elem) as k
  where k <> all (array[
    'player_id','goals','assists','shots','shots_on_target','tackles',
    'saves','yellow_cards','red_cards','potg_rank'
  ]);
  if v_bad is not null then
    raise exception 'save_match: unknown stat key(s): %', v_bad;
  end if;

  if v_id is null then
    insert into public.matches (
      season_id, game_type_id, played_on, division, opponent, home_away,
      score_us, score_them, opp_own_goals, went_to_overtime, went_to_pks,
      pk_us, pk_them, result, notes, created_by,
      shots_us, shots_them, tackles_us, tackles_them,
      possession_us, possession_them, pass_accuracy_us, pass_accuracy_them
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
      auth.uid(),
      nullif(p_match->>'shots_us', '')::int,
      nullif(p_match->>'shots_them', '')::int,
      nullif(p_match->>'tackles_us', '')::int,
      nullif(p_match->>'tackles_them', '')::int,
      nullif(p_match->>'possession_us', '')::int,
      nullif(p_match->>'possession_them', '')::int,
      nullif(p_match->>'pass_accuracy_us', '')::int,
      nullif(p_match->>'pass_accuracy_them', '')::int
    )
    returning id into v_id;
  else
    update public.matches set
      season_id          = (p_match->>'season_id')::uuid,
      game_type_id       = (p_match->>'game_type_id')::uuid,
      played_on          = (p_match->>'played_on')::date,
      division           = (p_match->>'division')::int,
      opponent           = p_match->>'opponent',
      home_away          = p_match->>'home_away',
      score_us           = (p_match->>'score_us')::int,
      score_them         = (p_match->>'score_them')::int,
      opp_own_goals      = coalesce((p_match->>'opp_own_goals')::int, 0),
      went_to_overtime   = coalesce((p_match->>'went_to_overtime')::boolean, false),
      went_to_pks        = coalesce((p_match->>'went_to_pks')::boolean, false),
      pk_us              = nullif(p_match->>'pk_us', '')::int,
      pk_them            = nullif(p_match->>'pk_them', '')::int,
      result             = p_match->>'result',
      notes              = nullif(p_match->>'notes', ''),
      shots_us           = nullif(p_match->>'shots_us', '')::int,
      shots_them         = nullif(p_match->>'shots_them', '')::int,
      tackles_us         = nullif(p_match->>'tackles_us', '')::int,
      tackles_them       = nullif(p_match->>'tackles_them', '')::int,
      possession_us      = nullif(p_match->>'possession_us', '')::int,
      possession_them    = nullif(p_match->>'possession_them', '')::int,
      pass_accuracy_us   = nullif(p_match->>'pass_accuracy_us', '')::int,
      pass_accuracy_them = nullif(p_match->>'pass_accuracy_them', '')::int
    where id = v_id;

    if not found then
      raise exception 'Match % not found or not writable', v_id;
    end if;
  end if;

  delete from public.match_player_stats where match_id = v_id;

  -- goals/assists coalesce to 0 (they are not null); every other stat passes
  -- null straight through, which is what "not tracked" means.
  insert into public.match_player_stats (
    match_id, player_id, goals, assists,
    shots, shots_on_target, tackles, saves, yellow_cards, red_cards, potg_rank
  )
  select v_id, s.player_id, coalesce(s.goals, 0), coalesce(s.assists, 0),
         s.shots, s.shots_on_target, s.tackles, s.saves,
         s.yellow_cards, s.red_cards, s.potg_rank
  from jsonb_to_recordset(coalesce(p_stats, '[]'::jsonb))
       as s(player_id uuid, goals int, assists int, shots int,
            shots_on_target int, tackles int, saves int,
            yellow_cards int, red_cards int, potg_rank int);

  return v_id;
end;
$$;

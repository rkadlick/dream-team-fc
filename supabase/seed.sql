-- ===========================================================================
-- FAKE SAMPLE DATA — DEVELOPMENT ONLY. DO NOT RUN AGAINST PRODUCTION.
-- ===========================================================================
-- Every name, opponent and score below is made up. This file is kept separate
-- from supabase/migrations/0001_init.sql on purpose: the migration is the real
-- schema, this is throwaway data so the UI has something to render locally.
--
--   psql "$DATABASE_URL" -f supabase/seed.sql
--
-- To wipe it again:
--   delete from match_player_stats; delete from matches;
--   delete from players; delete from seasons where name = 'FAKE Season 1';
-- ===========================================================================

insert into public.seasons (name, start_date, end_date, is_current)
values ('FAKE Season 1', '2026-01-05', null, true);

insert into public.players (name, jersey_number, position, is_human, gamertag, is_active) values
  ('FAKE Marcus Reed',   10, 'ST',  true,  'reedstrike',  true),
  ('FAKE Danny Oyelaran', 8, 'CM',  true,  'dOyel_88',    true),
  ('FAKE Theo Vance',     4, 'CB',  true,  'vancewall',   true),
  ('FAKE Ivan Brekalo',   1, 'GK',  false, null,          true),  -- AI goalie
  ('FAKE Sam Okada',      7, 'RW',  false, null,          true),  -- AI
  ('FAKE Luis Ferrer',    6, 'CDM', false, null,          true);  -- AI

-- Five matches. Player goals + opponent own goals always add up to score_us.
with s as (select id from public.seasons where name = 'FAKE Season 1'),
     league as (select id from public.game_types where name = 'League'),
     playoff as (select id from public.game_types where name = 'Playoff')
insert into public.matches (
  season_id, game_type_id, played_on, division, opponent, home_away,
  score_us, score_them, opp_own_goals, went_to_overtime, went_to_pks,
  pk_us, pk_them, result, notes
)
select s.id, league.id, '2026-01-09'::date, 4, 'FAKE Red Harbour', 'home',
       3, 1, 0, false, false, null, null, 'W', 'Comfortable start to the season.'
from s, league
union all
select s.id, league.id, '2026-01-16'::date, 4, 'FAKE Cobalt City', 'away',
       2, 2, 1, true,  false, null, null, 'D', 'Went to extra time, ended level.'
from s, league
union all
select s.id, league.id, '2026-01-23'::date, 4, 'FAKE Northgate United', 'home',
       0, 2, 0, false, false, null, null, 'L', null
from s, league
union all
select s.id, league.id, '2026-01-30'::date, 3, 'FAKE Valley Rovers', 'away',
       4, 2, 0, false, false, null, null, 'W', 'Promoted to division 3 after this one.'
from s, league
union all
select s.id, playoff.id, '2026-02-06'::date, 3, 'FAKE Summit Athletic', 'home',
       1, 1, 0, true,  true,  4, 3, 'W', 'Won it on penalties.'
from s, playoff;

-- Stats: a row for every human player who played (even 0/0), AI players only
-- when they scored or assisted.
insert into public.match_player_stats (match_id, player_id, goals, assists)
select m.id, p.id, v.goals, v.assists
from (values
  ('FAKE Red Harbour',      'FAKE Marcus Reed',    2, 0),
  ('FAKE Red Harbour',      'FAKE Danny Oyelaran', 1, 1),
  ('FAKE Red Harbour',      'FAKE Theo Vance',     0, 1),
  ('FAKE Red Harbour',      'FAKE Sam Okada',      0, 1),

  ('FAKE Cobalt City',      'FAKE Marcus Reed',    1, 0),
  ('FAKE Cobalt City',      'FAKE Danny Oyelaran', 0, 1),
  ('FAKE Cobalt City',      'FAKE Theo Vance',     0, 0),

  ('FAKE Northgate United', 'FAKE Marcus Reed',    0, 0),
  ('FAKE Northgate United', 'FAKE Danny Oyelaran', 0, 0),
  ('FAKE Northgate United', 'FAKE Theo Vance',     0, 0),

  ('FAKE Valley Rovers',    'FAKE Marcus Reed',    2, 1),
  ('FAKE Valley Rovers',    'FAKE Danny Oyelaran', 1, 2),
  ('FAKE Valley Rovers',    'FAKE Theo Vance',     0, 0),
  ('FAKE Valley Rovers',    'FAKE Sam Okada',      1, 0),

  ('FAKE Summit Athletic',  'FAKE Marcus Reed',    0, 0),
  ('FAKE Summit Athletic',  'FAKE Danny Oyelaran', 1, 0),
  ('FAKE Summit Athletic',  'FAKE Theo Vance',     0, 1)
) as v(opponent, player_name, goals, assists)
join public.matches m on m.opponent = v.opponent
join public.players p on p.name = v.player_name;

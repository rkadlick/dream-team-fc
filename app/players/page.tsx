import { Empty, PageTitle } from '@/components/ui'
import { PlayersTable, type LeaderboardRow } from '@/components/PlayersTable'
import { SeasonFilter } from '@/components/SeasonFilter'
import { STAT_KEYS } from '@/lib/stats-config'
import { sumStat, totalsByPlayer } from '@/lib/aggregate'
import { getMatches, getPlayers, getSeasons, getStatRows } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function PlayersPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const searchParams = await props.searchParams
  const rawSeason = searchParams.season
  const seasonId = Array.isArray(rawSeason) ? rawSeason[0] : rawSeason ?? ''

  const [players, seasons] = await Promise.all([getPlayers(), getSeasons()])

  // All-time when no season is selected; otherwise restrict to that season's
  // matches, which is what scopes the stat rows.
  let statRows
  if (seasonId) {
    const matches = await getMatches(seasonId)
    statRows = await getStatRows(matches.map((m) => m.id))
  } else {
    statRows = await getStatRows()
  }

  const totals = totalsByPlayer(players, statRows)
  const rows: LeaderboardRow[] = totals.map((t) => ({
    id: t.player.id,
    name: t.player.name,
    jerseyNumber: t.player.jersey_number,
    position: t.player.position,
    isHuman: t.player.is_human,
    stats: t.stats,
    combined: sumStat(t.stats, STAT_KEYS),
    gamesPlayed: t.gamesPlayed,
  }))

  return (
    <>
      <PageTitle>Players</PageTitle>
      <SeasonFilter
        seasons={seasons.map((s) => ({ value: s.id, label: s.name }))}
        current={seasonId}
        basePath="/players"
      />
      {rows.length === 0 ? (
        <Empty>No players on the roster yet.</Empty>
      ) : (
        <PlayersTable rows={rows} />
      )}
      <p className="mt-3 text-xs text-neutral-600">
        Games played and per-game averages are tracked for human players only;
        AI teammates show “—”.
      </p>
    </>
  )
}

import { PlayersView } from '@/components/PlayersView'
import type { LeaderboardRow } from '@/components/PlayersTable'
import type { EditablePlayer } from '@/components/RosterAdmin'
import { CONTRIBUTION_KEYS } from '@/lib/stats-config'
import { sumStat, totalsByPlayer } from '@/lib/aggregate'
import { getViewer } from '@/lib/auth'
import { getMatches, getPlayers, getSeasons, getStatRows } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function PlayersPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const searchParams = await props.searchParams
  const rawSeason = searchParams.season
  const seasonId = Array.isArray(rawSeason) ? rawSeason[0] : rawSeason ?? ''

  const [players, seasons, viewer] = await Promise.all([
    getPlayers(),
    getSeasons(),
    getViewer(),
  ])

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
    isActive: t.player.is_active,
    stats: t.stats,
    statGames: t.statGames,
    // Goals and assists only — adding cards into a "combined" figure is noise.
    combined: sumStat(t.stats, CONTRIBUTION_KEYS),
    gamesPlayed: t.gamesPlayed,
    potgAwards: t.potgAwards,
  }))

  // Only admins need the editable shape, and only they are sent it.
  let editablePlayers: EditablePlayer[] = []
  if (viewer.isAdmin) {
    const allStatRows = seasonId ? await getStatRows() : statRows
    const withStats = new Set(allStatRows.map((r) => r.player_id))
    editablePlayers = players.map((player) => ({
      id: player.id,
      name: player.name,
      jersey_number: player.jersey_number,
      position: player.position,
      is_human: player.is_human,
      gamertag: player.gamertag,
      is_active: player.is_active,
      linkedToMe: Boolean(player.user_id) && player.user_id === viewer.userId,
      hasStats: withStats.has(player.id),
    }))
  }

  return (
    <PlayersView
      rows={rows}
      seasons={seasons.map((s) => ({ value: s.id, label: s.name }))}
      currentSeason={seasonId}
      isAdmin={viewer.isAdmin}
      editablePlayers={editablePlayers}
    />
  )
}

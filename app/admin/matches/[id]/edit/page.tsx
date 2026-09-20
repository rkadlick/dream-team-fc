import { notFound } from 'next/navigation'
import { PageTitle } from '@/components/ui'
import { MatchForm } from '@/components/MatchForm'
import { STATS, pickMatchStats } from '@/lib/stats-config'
import {
  getGameTypes,
  getMatch,
  getOpponents,
  getPlayers,
  getSeasons,
  getStatRows,
} from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function EditMatchPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const match = await getMatch(id)
  if (!match) notFound()

  const [seasons, gameTypes, players, opponents, statRows] = await Promise.all([
    getSeasons(),
    getGameTypes(),
    getPlayers(),
    getOpponents(),
    getStatRows([id]),
  ])

  // Inactive players and inactive game types already on the match stay
  // selectable so an old match can be edited without re-activating anything.
  const rosterIds = new Set(statRows.map((r) => r.player_id))

  return (
    <>
      <PageTitle>Edit match</PageTitle>
      <MatchForm
        seasons={seasons.map((s) => ({ id: s.id, name: s.name }))}
        gameTypes={gameTypes
          .filter((g) => g.is_active || g.id === match.game_type_id)
          .map((g) => ({ id: g.id, name: g.name }))}
        players={players.filter((p) => p.is_active || rosterIds.has(p.id))}
        opponents={opponents}
        defaults={{ seasonId: match.season_id, division: match.division }}
        initial={{
          ...match,
          matchStats: pickMatchStats(match as unknown as Record<string, unknown>),
          stats: statRows.map((row) => ({
            player_id: row.player_id,
            potg_rank:
              row.potg_rank === null || row.potg_rank === undefined
                ? null
                : Number(row.potg_rank),
            // null is preserved so an untracked stat stays blank on the form.
            ...Object.fromEntries(
              STATS.map((s) => {
                const raw = row[s.key]
                if (raw === null || raw === undefined) {
                  return [s.key, s.optional ? null : 0]
                }
                return [s.key, Number(raw)]
              })
            ),
          })),
        }}
      />
    </>
  )
}

import { Empty, PageTitle } from '@/components/ui'
import { MatchForm } from '@/components/MatchForm'
import {
  getCurrentSeason,
  getGameTypes,
  getOpponents,
  getPlayers,
  getSeasons,
} from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function NewMatchPage() {
  const [seasons, currentSeason, gameTypes, players, opponents] =
    await Promise.all([
      getSeasons(),
      getCurrentSeason(),
      getGameTypes(),
      getPlayers(),
      getOpponents(),
    ])

  if (seasons.length === 0) {
    return (
      <>
        <PageTitle>Add match</PageTitle>
        <Empty>Create a season first, under Seasons.</Empty>
      </>
    )
  }

  const seasonId = currentSeason?.id ?? seasons[0].id

  return (
    <>
      <PageTitle>Add match</PageTitle>
      <MatchForm
        seasons={seasons.map((s) => ({ id: s.id, name: s.name }))}
        gameTypes={gameTypes
          .filter((g) => g.is_active)
          .map((g) => ({ id: g.id, name: g.name }))}
        players={players.filter((p) => p.is_active)}
        opponents={opponents}
        defaults={{ seasonId }}
      />
    </>
  )
}

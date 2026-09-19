import Link from 'next/link'
import { Card, Empty, PageTitle, Pill, ResultBadge } from '@/components/ui'
import { MatchFilters } from '@/components/MatchFilters'
import { formatDate, formatScore } from '@/lib/format'
import { sortMatchesDesc } from '@/lib/aggregate'
import { getGameTypes, getMatches, getSeasons } from '@/lib/queries'

export const dynamic = 'force-dynamic'

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

export default async function MatchesPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const searchParams = await props.searchParams
  const filters = {
    season: one(searchParams.season),
    division: one(searchParams.division),
    gameType: one(searchParams.gameType),
    result: one(searchParams.result),
    opponent: one(searchParams.opponent),
  }

  const [allMatches, seasons, gameTypes] = await Promise.all([
    getMatches(),
    getSeasons(),
    getGameTypes(),
  ])

  const seasonName = new Map(seasons.map((s) => [s.id, s.name]))
  const gameTypeName = new Map(gameTypes.map((g) => [g.id, g.name]))
  const divisions = [...new Set(allMatches.map((m) => m.division))].sort(
    (a, b) => a - b
  )

  const needle = filters.opponent.trim().toLowerCase()
  const matches = sortMatchesDesc(
    allMatches.filter((m) => {
      if (filters.season && m.season_id !== filters.season) return false
      if (filters.division && String(m.division) !== filters.division) return false
      if (filters.gameType && m.game_type_id !== filters.gameType) return false
      if (filters.result && m.result !== filters.result) return false
      if (needle && !m.opponent.toLowerCase().includes(needle)) return false
      return true
    })
  )

  return (
    <>
      <PageTitle>Matches</PageTitle>

      <MatchFilters
        seasons={seasons.map((s) => ({ value: s.id, label: s.name }))}
        gameTypes={gameTypes.map((g) => ({ value: g.id, label: g.name }))}
        divisions={divisions}
        current={filters}
      />

      <p className="mb-3 text-sm text-neutral-500">
        {matches.length} {matches.length === 1 ? 'match' : 'matches'}
      </p>

      {matches.length === 0 ? (
        <Empty>No matches match these filters.</Empty>
      ) : (
        <div className="space-y-3">
          {matches.map((m) => (
            <Link key={m.id} href={`/matches/${m.id}`} className="block">
              <Card className="px-4 py-3 transition-colors hover:border-violet-700">
                <div className="flex items-start gap-3">
                  <ResultBadge result={m.result} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate font-semibold">{m.opponent}</span>
                      <span className="shrink-0 font-bold tabular-nums">
                        {formatScore(m)}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-neutral-500">
                      {formatDate(m.played_on)} ·{' '}
                      {m.home_away === 'home' ? 'Home' : 'Away'}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Pill>{gameTypeName.get(m.game_type_id) ?? 'Game'}</Pill>
                      <Pill>Division {m.division}</Pill>
                      <Pill>{seasonName.get(m.season_id) ?? 'Season'}</Pill>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </>
  )
}

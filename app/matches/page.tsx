import Link from 'next/link'
import {
  ButtonLink,
  Empty,
  PageTitle,
  Panel,
  ResultBadge,
} from '@/components/ui'
import { MatchFilters } from '@/components/MatchFilters'
import { formatDateShort, formatScore } from '@/lib/format'
import { sortMatchesDesc, type MatchRow } from '@/lib/aggregate'
import { getViewer } from '@/lib/auth'
import { getGameTypes, getMatches, getSeasons } from '@/lib/queries'

export const dynamic = 'force-dynamic'

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

/** 'Feb 2026' style heading from a 'YYYY-MM-DD' string, no Date involved. */
function monthLabel(isoDate: string): string {
  const [y, m] = isoDate.split('-')
  return `${MONTHS[Number(m) - 1] ?? m} ${y}`
}

function groupByMonth(matches: MatchRow[]) {
  const groups: { label: string; matches: MatchRow[] }[] = []
  for (const match of matches) {
    const label = monthLabel(match.played_on)
    const last = groups[groups.length - 1]
    if (last && last.label === label) last.matches.push(match)
    else groups.push({ label, matches: [match] })
  }
  return groups
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

  const [allMatches, seasons, gameTypes, viewer] = await Promise.all([
    getMatches(),
    getSeasons(),
    getGameTypes(),
    getViewer(),
  ])

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

  const groups = groupByMonth(matches)

  return (
    <>
      <PageTitle
        action={
          viewer.isAdmin ? (
            <ButtonLink href="/admin/matches/new">
              <span aria-hidden>＋</span> Add match
            </ButtonLink>
          ) : undefined
        }
      >
        Matches
      </PageTitle>

      <MatchFilters
        seasons={seasons.map((s) => ({ value: s.id, label: s.name }))}
        gameTypes={gameTypes.map((g) => ({ value: g.id, label: g.name }))}
        divisions={divisions}
        current={filters}
        resultCount={matches.length}
      />

      {matches.length === 0 ? (
        <Empty>No matches match these filters.</Empty>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.label}>
              {/* A month heading gives the list a spine, so consecutive
                  matches stop reading as one repeated block. */}
              <div className="mb-2 flex items-center gap-3">
                <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">
                  {group.label}
                </h2>
                <span className="h-px flex-1 bg-line" />
                <span className="text-[11px] tabular-nums text-faint">
                  {group.matches.length}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {group.matches.map((m) => (
                  <Link key={m.id} href={`/matches/${m.id}`} className="block">
                    <Panel interactive className="h-full px-3.5 py-3">
                      <div className="flex items-center gap-3">
                        <ResultBadge result={m.result} />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold">
                            {m.opponent}
                          </div>
                          <div className="mt-0.5 truncate text-xs text-faint">
                            {formatDateShort(m.played_on)} ·{' '}
                            {m.home_away === 'home' ? 'H' : 'A'} · Div{' '}
                            {m.division} ·{' '}
                            {gameTypeName.get(m.game_type_id) ?? 'Game'}
                          </div>
                        </div>
                        <div className="shrink-0 text-right text-lg font-bold tabular-nums">
                          {formatScore(m)}
                        </div>
                      </div>
                    </Panel>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  )
}

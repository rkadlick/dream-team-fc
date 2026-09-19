import Link from 'next/link'
import { Card, Empty, PageTitle, ResultBadge, SectionTitle, Stat } from '@/components/ui'
import { formatDateShort, formatScore } from '@/lib/format'
import { sortMatchesDesc, teamRecord, totalsByPlayer } from '@/lib/aggregate'
import { STATS } from '@/lib/stats-config'
import {
  getCurrentSeason,
  getMatches,
  getPlayers,
  getStatRows,
} from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const season = await getCurrentSeason()

  if (!season) {
    return (
      <>
        <PageTitle>Dashboard</PageTitle>
        <Empty>
          No current season yet. An admin can create one under Seasons.
        </Empty>
      </>
    )
  }

  const [matches, players] = await Promise.all([
    getMatches(season.id),
    getPlayers(),
  ])
  const sorted = sortMatchesDesc(matches)
  const statRows = await getStatRows(sorted.map((m) => m.id))

  const record = teamRecord(sorted)
  const division = sorted[0]?.division ?? null
  const totals = totalsByPlayer(players, statRows)

  return (
    <>
      <PageTitle>{season.name}</PageTitle>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Division" value={division !== null ? division : '—'} />
        <Stat
          label="Record"
          value={`${record.wins}-${record.draws}-${record.losses}`}
        />
        <Stat label="Goals for" value={record.goalsFor} />
        <Stat label="Goals against" value={record.goalsAgainst} />
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle>Last 5 results</SectionTitle>
          <Link href="/matches" className="text-sm text-violet-400 hover:text-violet-300">
            All matches →
          </Link>
        </div>
        {sorted.length === 0 ? (
          <Empty>No matches recorded this season yet.</Empty>
        ) : (
          <Card className="divide-y divide-[var(--color-line)]">
            {sorted.slice(0, 5).map((m) => (
              <Link
                key={m.id}
                href={`/matches/${m.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-2)]"
              >
                <ResultBadge result={m.result} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{m.opponent}</div>
                  <div className="text-xs text-neutral-500">
                    {formatDateShort(m.played_on)} ·{' '}
                    {m.home_away === 'home' ? 'H' : 'A'} · Div {m.division}
                  </div>
                </div>
                <div className="shrink-0 text-right text-sm font-semibold tabular-nums">
                  {formatScore(m)}
                </div>
              </Link>
            ))}
          </Card>
        )}
      </section>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {STATS.map((stat) => {
          const leaders = totals
            .filter((t) => t.stats[stat.key] > 0)
            .sort((a, b) => b.stats[stat.key] - a.stats[stat.key])
            .slice(0, 5)

          return (
            <section key={stat.key}>
              <div className="mb-3">
                <SectionTitle>Top {stat.label.toLowerCase()}</SectionTitle>
              </div>
              {leaders.length === 0 ? (
                <Empty>Nothing recorded yet.</Empty>
              ) : (
                <Card className="divide-y divide-[var(--color-line)]">
                  {leaders.map((t, i) => (
                    <Link
                      key={t.player.id}
                      href={`/players/${t.player.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--color-surface-2)]"
                    >
                      <span className="w-4 text-sm tabular-nums text-neutral-600">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate">
                        {t.player.name}
                        {!t.player.is_human && (
                          <span className="ml-2 text-xs text-neutral-600">AI</span>
                        )}
                      </span>
                      <span className="font-bold tabular-nums text-violet-300">
                        {t.stats[stat.key]}
                      </span>
                    </Link>
                  ))}
                </Card>
              )}
            </section>
          )
        })}
      </div>
    </>
  )
}

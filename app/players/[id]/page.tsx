import { notFound } from 'next/navigation'
import {
  BackLink,
  Empty,
  PageTitle,
  Panel,
  Pill,
  SectionTitle,
} from '@/components/ui'
import { STATS, STAT_KEYS, emptyStats, pickStats } from '@/lib/stats-config'
import { formatAverage } from '@/lib/format'
import { sumStat } from '@/lib/aggregate'
import { getMatches, getPlayers, getSeasons, getStatRows } from '@/lib/queries'

export const dynamic = 'force-dynamic'

export default async function PlayerDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params

  const [players, seasons, matches] = await Promise.all([
    getPlayers(),
    getSeasons(),
    getMatches(),
  ])
  const player = players.find((p) => p.id === id)
  if (!player) notFound()

  const statRows = await getStatRows()
  const mine = statRows.filter((r) => r.player_id === player.id)
  const seasonOfMatch = new Map(matches.map((m) => [m.id, m.season_id]))

  const career = emptyStats()
  let careerGames = 0
  const bySeason = new Map<string, { stats: Record<string, number>; games: number }>()

  for (const row of mine) {
    const values = pickStats(row as Record<string, unknown>)
    const seasonId = seasonOfMatch.get(row.match_id)
    if (!seasonId) continue

    let entry = bySeason.get(seasonId)
    if (!entry) {
      entry = { stats: emptyStats(), games: 0 }
      bySeason.set(seasonId, entry)
    }
    for (const stat of STATS) {
      career[stat.key] += values[stat.key] ?? 0
      entry.stats[stat.key] += values[stat.key] ?? 0
    }
    careerGames += 1
    entry.games += 1
  }

  const seasonRows = seasons
    .filter((s) => bySeason.has(s.id))
    .map((s) => ({ season: s, ...bySeason.get(s.id)! }))

  const combined = sumStat(career, STAT_KEYS)

  return (
    <>
      <BackLink href="/players">Players</BackLink>

      <PageTitle
        sub={
          <span className="flex flex-wrap gap-1.5">
            {player.jersey_number !== null && <Pill>#{player.jersey_number}</Pill>}
            {player.position && <Pill tone="accent">{player.position}</Pill>}
            <Pill>{player.is_human ? 'Human' : 'AI teammate'}</Pill>
            {player.gamertag && <Pill>{player.gamertag}</Pill>}
            {!player.is_active && <Pill tone="warn">Inactive</Pill>}
          </span>
        }
      >
        {player.name}
      </PageTitle>

      {/* Career totals as one banded panel rather than a grid of look-alike
          tiles. */}
      <Panel className="mb-8 overflow-hidden">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-4 px-5 py-5">
          {STATS.map((s) => (
            <div key={s.key}>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                {s.label}
              </div>
              <div className="mt-0.5 text-3xl font-bold tabular-nums">
                {career[s.key] ?? 0}
              </div>
            </div>
          ))}
          <div className="ml-auto flex gap-8">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                {STATS.map((s) => s.shortLabel).join('+')}
              </div>
              <div className="mt-0.5 text-3xl font-bold tabular-nums text-accent-text">
                {combined}
              </div>
            </div>
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                Games
              </div>
              <div className="mt-0.5 text-3xl font-bold tabular-nums">
                {player.is_human ? careerGames : '—'}
              </div>
            </div>
          </div>
        </div>
        {player.is_human && careerGames > 0 && (
          <div className="flex flex-wrap gap-x-6 gap-y-1 border-t border-line bg-surface-2 px-5 py-2.5 text-xs text-muted">
            {STATS.map((s) => (
              <span key={s.key}>
                {formatAverage(career[s.key] ?? 0, careerGames)}{' '}
                {s.label.toLowerCase()} per game
              </span>
            ))}
          </div>
        )}
      </Panel>

      <SectionTitle>By season</SectionTitle>
      {seasonRows.length === 0 ? (
        <Empty>No stats recorded yet.</Empty>
      ) : (
        <Panel className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="border-b border-line bg-surface-2 text-xs text-faint">
                <th scope="col" className="px-4 py-2 text-left font-semibold">
                  Season
                </th>
                {STATS.map((s) => (
                  <th
                    key={s.key}
                    scope="col"
                    className="px-2 py-2 text-right font-semibold"
                    title={s.label}
                  >
                    {s.shortLabel}
                  </th>
                ))}
                <th scope="col" className="px-2 py-2 text-right font-semibold">
                  GP
                </th>
                {STATS.map((s) => (
                  <th
                    key={`avg-${s.key}`}
                    scope="col"
                    className="px-2 py-2 text-right font-semibold"
                    title={`${s.label} per game`}
                  >
                    {s.shortLabel}/G
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {seasonRows.map((row) => (
                <tr key={row.season.id} className="hover:bg-surface-2">
                  <td className="px-4 py-2.5 font-medium">
                    {row.season.name}
                    {row.season.is_current && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-accent-text">
                        current
                      </span>
                    )}
                  </td>
                  {STATS.map((s) => (
                    <td key={s.key} className="px-2 py-2.5 text-right tabular-nums">
                      {row.stats[s.key] ?? 0}
                    </td>
                  ))}
                  <td className="px-2 py-2.5 text-right tabular-nums">
                    {player.is_human ? row.games : '—'}
                  </td>
                  {STATS.map((s) => (
                    <td
                      key={`avg-${s.key}`}
                      className="px-2 py-2.5 text-right tabular-nums text-muted"
                    >
                      {player.is_human
                        ? formatAverage(row.stats[s.key] ?? 0, row.games)
                        : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  )
}

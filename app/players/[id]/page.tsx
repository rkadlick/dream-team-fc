import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Card, Empty, PageTitle, Pill, Stat } from '@/components/ui'
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

  return (
    <>
      <Link href="/players" className="mb-4 inline-block text-sm text-violet-400">
        ← Players
      </Link>

      <PageTitle>{player.name}</PageTitle>

      <div className="mb-6 flex flex-wrap gap-1.5">
        {player.jersey_number !== null && <Pill>#{player.jersey_number}</Pill>}
        {player.position && <Pill>{player.position}</Pill>}
        <Pill>{player.is_human ? 'Human' : 'AI teammate'}</Pill>
        {player.gamertag && <Pill>{player.gamertag}</Pill>}
        {!player.is_active && <Pill>Inactive</Pill>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {STATS.map((s) => (
          <Stat key={s.key} label={s.label} value={career[s.key] ?? 0} />
        ))}
        <Stat
          label={STATS.map((s) => s.shortLabel).join('+')}
          value={sumStat(career, STAT_KEYS)}
        />
        <Stat
          label="Games played"
          value={player.is_human ? careerGames : '—'}
        />
      </div>

      <h2 className="mb-3 mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
        By season
      </h2>
      {seasonRows.length === 0 ? (
        <Empty>No stats recorded yet.</Empty>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[28rem] text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-neutral-500">
                <th className="px-4 py-2 text-left font-semibold">Season</th>
                {STATS.map((s) => (
                  <th key={s.key} className="px-2 py-2 text-right font-semibold" title={s.label}>
                    {s.shortLabel}
                  </th>
                ))}
                <th className="px-2 py-2 text-right font-semibold">GP</th>
                {STATS.map((s) => (
                  <th
                    key={`avg-${s.key}`}
                    className="px-2 py-2 text-right font-semibold"
                    title={`${s.label} per game`}
                  >
                    {s.shortLabel}/G
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {seasonRows.map((row) => (
                <tr key={row.season.id}>
                  <td className="px-4 py-3">{row.season.name}</td>
                  {STATS.map((s) => (
                    <td key={s.key} className="px-2 py-3 text-right tabular-nums">
                      {row.stats[s.key] ?? 0}
                    </td>
                  ))}
                  <td className="px-2 py-3 text-right tabular-nums">
                    {player.is_human ? row.games : '—'}
                  </td>
                  {STATS.map((s) => (
                    <td
                      key={`avg-${s.key}`}
                      className="px-2 py-3 text-right tabular-nums text-neutral-400"
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
        </Card>
      )}
    </>
  )
}

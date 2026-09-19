import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ButtonLink,
  Card,
  Empty,
  PageTitle,
  Pill,
  ResultBadge,
} from '@/components/ui'
import { formatDate, formatPlayerLabel, formatScore } from '@/lib/format'
import { STATS, pickStats } from '@/lib/stats-config'
import { getViewer } from '@/lib/auth'
import { getGameTypes, getMatch, getPlayers, getSeasons, getStatRows } from '@/lib/queries'

export const dynamic = 'force-dynamic'

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-3">
      <span className="text-sm text-neutral-500">{label}</span>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  )
}

export default async function MatchDetailPage(props: {
  params: Promise<{ id: string }>
}) {
  const { id } = await props.params
  const match = await getMatch(id)
  if (!match) notFound()

  const [seasons, gameTypes, players, statRows, viewer] = await Promise.all([
    getSeasons(),
    getGameTypes(),
    getPlayers(),
    getStatRows([match.id]),
    getViewer(),
  ])

  const season = seasons.find((s) => s.id === match.season_id)
  const gameType = gameTypes.find((g) => g.id === match.game_type_id)
  const playerById = new Map(players.map((p) => [p.id, p]))

  const lines = statRows
    .map((row) => ({
      player: playerById.get(row.player_id),
      stats: pickStats(row as Record<string, unknown>),
    }))
    .filter((line) => line.player)
    .sort((a, b) => {
      const diff =
        (b.stats.goals ?? 0) + (b.stats.assists ?? 0) -
        ((a.stats.goals ?? 0) + (a.stats.assists ?? 0))
      return diff !== 0 ? diff : a.player!.name.localeCompare(b.player!.name)
    })

  return (
    <>
      <Link href="/matches" className="mb-4 inline-block text-sm text-violet-400">
        ← Matches
      </Link>

      <PageTitle
        action={
          viewer.isAdmin ? (
            <ButtonLink href={`/admin/matches/${match.id}/edit`} variant="secondary">
              Edit
            </ButtonLink>
          ) : undefined
        }
      >
        {match.opponent}
      </PageTitle>

      <Card className="mb-6 px-4 py-5">
        <div className="flex items-center gap-4">
          <ResultBadge result={match.result} />
          <div className="text-3xl font-bold tabular-nums">{formatScore(match)}</div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Pill>{formatDate(match.played_on)}</Pill>
          <Pill>{match.home_away === 'home' ? 'Home' : 'Away'}</Pill>
          <Pill>{gameType?.name ?? 'Game'}</Pill>
          <Pill>Division {match.division}</Pill>
          <Pill>{season?.name ?? 'Season'}</Pill>
        </div>
      </Card>

      <Card className="mb-6 divide-y divide-[var(--color-line)]">
        <Field label="Goals for" value={match.score_us} />
        <Field label="Goals against" value={match.score_them} />
        <Field label="Opponent own goals" value={match.opp_own_goals} />
        <Field label="Overtime" value={match.went_to_overtime ? 'Yes' : 'No'} />
        <Field label="Penalty shootout" value={match.went_to_pks ? 'Yes' : 'No'} />
        {match.went_to_pks && (
          <Field
            label="Shootout score"
            value={
              match.pk_us !== null && match.pk_them !== null
                ? `${match.pk_us}-${match.pk_them}`
                : 'Not recorded'
            }
          />
        )}
        <Field label="Result" value={match.result} />
      </Card>

      {match.notes && (
        <Card className="mb-6 px-4 py-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Notes
          </div>
          <p className="whitespace-pre-wrap text-sm text-neutral-200">{match.notes}</p>
        </Card>
      )}

      <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
        Player stats
      </h2>
      {lines.length === 0 ? (
        <Empty>No player stats recorded for this match.</Empty>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] text-neutral-500">
                <th className="px-4 py-2 text-left font-semibold">Player</th>
                {STATS.map((s) => (
                  <th
                    key={s.key}
                    className="w-14 px-2 py-2 text-right font-semibold"
                    title={s.label}
                  >
                    {s.shortLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {lines.map(({ player, stats }) => (
                <tr key={player!.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={`/players/${player!.id}`}
                      className="hover:text-violet-300"
                    >
                      {formatPlayerLabel(player!)}
                    </Link>
                    {!player!.is_human && (
                      <span className="ml-2 text-xs text-neutral-600">AI</span>
                    )}
                  </td>
                  {STATS.map((s) => (
                    <td
                      key={s.key}
                      className="px-2 py-3 text-right tabular-nums"
                    >
                      {stats[s.key] ?? 0}
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

import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  BackLink,
  ButtonLink,
  Empty,
  PageTitle,
  Panel,
  Pill,
  ResultBadge,
  SectionTitle,
} from '@/components/ui'
import { formatDate, formatPlayerLabel } from '@/lib/format'
import { STATS, pickStats } from '@/lib/stats-config'
import { getViewer } from '@/lib/auth'
import {
  getGameTypes,
  getMatch,
  getPlayers,
  getSeasons,
  getStatRows,
} from '@/lib/queries'

export const dynamic = 'force-dynamic'

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4 py-2.5">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-right text-sm font-semibold tabular-nums">{value}</span>
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

  const home = match.home_away === 'home'

  return (
    <>
      <BackLink href="/matches">Matches</BackLink>

      <PageTitle
        sub={`${formatDate(match.played_on)} · ${home ? 'Home' : 'Away'} · ${
          gameType?.name ?? 'Game'
        }`}
        action={
          viewer.isAdmin ? (
            <ButtonLink
              href={`/admin/matches/${match.id}/edit`}
              variant="secondary"
            >
              <span aria-hidden>✎</span> Edit match
            </ButtonLink>
          ) : undefined
        }
      >
        {match.opponent}
      </PageTitle>

      {/* A scoreboard, not another text row. */}
      <Panel className="mb-8 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-6 sm:px-8">
          <div className="min-w-0 text-right">
            <div className="truncate text-sm font-semibold sm:text-base">
              Dream Team FC
            </div>
            <div className="text-[10px] uppercase tracking-wider text-faint">
              {home ? 'Home' : 'Away'}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-4xl font-bold tabular-nums sm:text-5xl">
              {match.score_us}
            </span>
            <span className="text-2xl text-faint">–</span>
            <span className="text-4xl font-bold tabular-nums sm:text-5xl">
              {match.score_them}
            </span>
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold sm:text-base">
              {match.opponent}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-faint">
              {home ? 'Away' : 'Home'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-line bg-surface-2 px-4 py-3">
          <ResultBadge result={match.result} size="lg" />
          {match.went_to_overtime && <Pill>Overtime</Pill>}
          {match.went_to_pks && (
            <Pill>
              Shootout{' '}
              {match.pk_us !== null && match.pk_them !== null
                ? `${match.pk_us}–${match.pk_them}`
                : 'not recorded'}
            </Pill>
          )}
          <Pill>Division {match.division}</Pill>
          <Pill>{season?.name ?? 'Season'}</Pill>
        </div>
      </Panel>

      <div className="grid gap-8 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <SectionTitle>Player stats</SectionTitle>
          {lines.length === 0 ? (
            <Empty>No player stats recorded for this match.</Empty>
          ) : (
            <Panel className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface-2 text-xs text-faint">
                    <th scope="col" className="px-4 py-2 text-left font-semibold">
                      Player
                    </th>
                    {STATS.map((s) => (
                      <th
                        key={s.key}
                        scope="col"
                        className="w-14 px-2 py-2 text-right font-semibold"
                        title={s.label}
                      >
                        {s.shortLabel}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {lines.map(({ player, stats }) => (
                    <tr key={player!.id} className="hover:bg-surface-2">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/players/${player!.id}`}
                          className="font-medium transition-colors hover:text-accent-text"
                        >
                          {formatPlayerLabel(player!)}
                        </Link>
                        {!player!.is_human && (
                          <span className="ml-2 rounded bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold text-faint">
                            AI
                          </span>
                        )}
                      </td>
                      {STATS.map((s) => (
                        <td
                          key={s.key}
                          className={`px-2 py-2.5 text-right tabular-nums ${
                            (stats[s.key] ?? 0) > 0 ? 'font-semibold' : 'text-faint'
                          }`}
                        >
                          {stats[s.key] ?? 0}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          )}
        </section>

        <div className="space-y-6 lg:col-span-5">
          <section>
            <SectionTitle>Match detail</SectionTitle>
            <Panel className="divide-y divide-line">
              <Field label="Goals for" value={match.score_us} />
              <Field label="Goals against" value={match.score_them} />
              <Field label="Opponent own goals" value={match.opp_own_goals} />
              <Field
                label="Overtime"
                value={match.went_to_overtime ? 'Yes' : 'No'}
              />
              <Field
                label="Penalty shootout"
                value={match.went_to_pks ? 'Yes' : 'No'}
              />
              {match.went_to_pks && (
                <Field
                  label="Shootout score"
                  value={
                    match.pk_us !== null && match.pk_them !== null
                      ? `${match.pk_us}–${match.pk_them}`
                      : 'Not recorded'
                  }
                />
              )}
            </Panel>
          </section>

          {match.notes && (
            <section>
              <SectionTitle>Notes</SectionTitle>
              <Panel tone="quiet" className="px-4 py-3">
                <p className="whitespace-pre-wrap text-sm text-muted">
                  {match.notes}
                </p>
              </Panel>
            </section>
          )}
        </div>
      </div>
    </>
  )
}

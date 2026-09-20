import Link from 'next/link'
import {
  ButtonLink,
  Empty,
  Panel,
  Pill,
  ResultBadge,
  SectionTitle,
} from '@/components/ui'
import { formatDateShort, formatScore } from '@/lib/format'
import { sortMatchesDesc, teamRecord, totalsByPlayer } from '@/lib/aggregate'
import { LEADERBOARD_STATS, statApplies } from '@/lib/stats-config'
import { getViewer } from '@/lib/auth'
import {
  getCurrentSeason,
  getMatches,
  getPlayers,
  getStatRows,
} from '@/lib/queries'

export const dynamic = 'force-dynamic'

function BigFigure({
  label,
  value,
  accent = false,
}: {
  label: string
  value: React.ReactNode
  accent?: boolean
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
        {label}
      </div>
      <div
        className={`mt-0.5 text-2xl font-bold tabular-nums sm:text-3xl ${
          accent ? 'text-accent-text' : ''
        }`}
      >
        {value}
      </div>
    </div>
  )
}

export default async function DashboardPage() {
  const [season, viewer] = await Promise.all([getCurrentSeason(), getViewer()])

  if (!season) {
    return (
      <>
        <h1 className="mb-6 text-2xl font-bold tracking-tight sm:text-3xl">
          Dashboard
        </h1>
        <Empty>
          No current season yet.{' '}
          {viewer.isAdmin
            ? 'Create one under Seasons in the admin bar.'
            : 'An admin can create one under Seasons.'}
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
  const goalDiff = record.goalsFor - record.goalsAgainst
  const form = sorted.slice(0, 5)

  return (
    <>
      {/* One composed header instead of a row of identical stat tiles. */}
      <Panel tone="accent" className="mb-8 overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4 px-5 py-5 sm:px-6">
          <div className="min-w-0">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-text">
              Current season
            </div>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
              {season.name}
            </h1>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {division !== null && <Pill tone="accent">Division {division}</Pill>}
              <Pill tone="accent">
                {record.played} {record.played === 1 ? 'match' : 'matches'}
              </Pill>
            </div>
          </div>

          {form.length > 0 && (
            <div className="shrink-0">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-text">
                Form
              </div>
              <div className="flex gap-1">
                {[...form].reverse().map((m) => (
                  <ResultBadge key={m.id} result={m.result} />
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-4 border-t border-accent-line px-5 py-4 sm:grid-cols-4 sm:px-6">
          <BigFigure
            label="Record (W-D-L)"
            value={`${record.wins}-${record.draws}-${record.losses}`}
            accent
          />
          <BigFigure label="Goals for" value={record.goalsFor} />
          <BigFigure label="Goals against" value={record.goalsAgainst} />
          <BigFigure
            label="Goal difference"
            value={goalDiff > 0 ? `+${goalDiff}` : goalDiff}
          />
        </div>
      </Panel>

      {/* Asymmetric split: results carry the page, leaders sit alongside. */}
      <div className="grid gap-8 lg:grid-cols-12">
        <section className="lg:col-span-7">
          <SectionTitle
            action={
              <Link
                href="/matches"
                className="text-sm font-medium text-accent-text hover:underline"
              >
                All matches →
              </Link>
            }
          >
            Recent results
          </SectionTitle>

          {sorted.length === 0 ? (
            <Empty>
              No matches recorded this season yet.
              {viewer.isAdmin && ' Use “Add match” in the admin bar.'}
            </Empty>
          ) : (
            <Panel className="divide-y divide-line">
              {sorted.slice(0, 6).map((m) => (
                <Link
                  key={m.id}
                  href={`/matches/${m.id}`}
                  className="flex items-center gap-3 px-4 py-3 transition-colors first:rounded-t-2xl last:rounded-b-2xl hover:bg-surface-2"
                >
                  <ResultBadge result={m.result} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{m.opponent}</div>
                    <div className="text-xs text-faint">
                      {formatDateShort(m.played_on)} ·{' '}
                      {m.home_away === 'home' ? 'Home' : 'Away'} · Div{' '}
                      {m.division}
                    </div>
                  </div>
                  <div className="shrink-0 text-right font-bold tabular-nums">
                    {formatScore(m)}
                  </div>
                </Link>
              ))}
            </Panel>
          )}

          {viewer.isAdmin && (
            <div className="mt-3">
              <ButtonLink href="/admin/matches/new" variant="secondary">
                <span aria-hidden>＋</span> Add a match
              </ButtonLink>
            </div>
          )}
        </section>

        <div className="space-y-6 lg:col-span-5">
          {LEADERBOARD_STATS.map((stat) => {
            const leaders = totals
              .filter(
                (t) =>
                  (t.stats[stat.key] ?? 0) > 0 &&
                  statApplies(stat, t.player.position, t.stats[stat.key])
              )
              .sort((a, b) => (b.stats[stat.key] ?? 0) - (a.stats[stat.key] ?? 0))
              .slice(0, 5)
            const top = leaders[0]?.stats[stat.key] ?? 0

            return (
              <section key={stat.key}>
                <SectionTitle>Top {stat.label.toLowerCase()}</SectionTitle>
                {leaders.length === 0 ? (
                  <Empty>Nothing recorded yet.</Empty>
                ) : (
                  <Panel className="overflow-hidden">
                    {leaders.map((t, i) => (
                      <Link
                        key={t.player.id}
                        href={`/players/${t.player.id}`}
                        className="relative flex items-center gap-3 border-b border-line px-4 py-2.5 transition-colors last:border-b-0 hover:bg-surface-2"
                      >
                        {/* A bar behind the row makes the gap between first
                            and fifth readable at a glance. */}
                        <span
                          aria-hidden
                          className="absolute inset-y-0 left-0 bg-accent/10"
                          style={{
                            width: top
                              ? `${Math.max(6, ((t.stats[stat.key] ?? 0) / top) * 100)}%`
                              : 0,
                          }}
                        />
                        <span className="relative w-4 text-xs font-semibold tabular-nums text-faint">
                          {i + 1}
                        </span>
                        <span className="relative min-w-0 flex-1 truncate text-sm font-medium">
                          {t.player.name}
                          {!t.player.is_human && (
                            <span className="ml-2 text-[10px] uppercase text-faint">
                              AI
                            </span>
                          )}
                        </span>
                        <span className="relative font-bold tabular-nums text-accent-text">
                          {t.stats[stat.key] ?? 0}
                        </span>
                      </Link>
                    ))}
                  </Panel>
                )}
              </section>
            )
          })}
        </div>
      </div>
    </>
  )
}

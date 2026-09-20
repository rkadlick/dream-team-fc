'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Panel, iconButtonStyles } from '@/components/ui'
import {
  CONTRIBUTION_LABEL,
  PER_GAME_STATS,
  TABLE_STATS,
  statApplies,
} from '@/lib/stats-config'
import { formatAverage, formatStat } from '@/lib/format'

export type LeaderboardRow = {
  id: string
  name: string
  jerseyNumber: number | null
  position: string | null
  isHuman: boolean
  isActive: boolean
  /** null for an optional stat that has never been recorded for this player. */
  stats: Record<string, number | null>
  /** Per stat, the matches in which it was recorded — the average denominator. */
  statGames: Record<string, number>
  combined: number
  gamesPlayed: number
  potgAwards: number
}

type SortKey = 'name' | 'combined' | 'games' | 'potg' | string

function SortHeader({
  label,
  sortAs,
  title,
  className = '',
  sortKey,
  asc,
  onToggle,
}: {
  label: string
  sortAs: SortKey
  title?: string
  className?: string
  sortKey: SortKey
  asc: boolean
  onToggle: (key: SortKey) => void
}) {
  const active = sortKey === sortAs
  return (
    <th
      scope="col"
      className={`px-2 py-2 font-semibold ${className}`}
      aria-sort={active ? (asc ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onToggle(sortAs)}
        title={title}
        className={`inline-flex min-h-8 items-center gap-1 transition-colors ${
          active ? 'text-accent-text' : 'text-faint hover:text-fg'
        }`}
      >
        {label}
        {active && <span aria-hidden>{asc ? '▲' : '▼'}</span>}
      </button>
    </th>
  )
}

export function PlayersTable({
  rows,
  onEdit,
}: {
  rows: LeaderboardRow[]
  /** Admins get a per-row edit control; visitors get no extra column at all. */
  onEdit?: (playerId: string) => void
}) {
  const [sortKey, setSortKey] = useState<SortKey>(TABLE_STATS[0]?.key ?? 'combined')
  const [asc, setAsc] = useState(false)

  const sorted = useMemo(() => {
    const value = (r: LeaderboardRow): number | string => {
      if (sortKey === 'name') return r.name.toLowerCase()
      if (sortKey === 'combined') return r.combined
      if (sortKey === 'games') return r.gamesPlayed
      if (sortKey === 'potg') return r.potgAwards
      if (sortKey.startsWith('avg:')) {
        const key = sortKey.slice(4)
        const games = r.statGames[key] ?? 0
        // Never recorded sorts below a genuine zero.
        return games > 0 ? (r.stats[key] ?? 0) / games : -1
      }
      // null (never recorded) sorts below 0 (recorded as zero).
      return r.stats[sortKey] ?? -1
    }
    return [...rows].sort((a, b) => {
      const av = value(a)
      const bv = value(b)
      let cmp: number
      if (typeof av === 'string' || typeof bv === 'string') {
        cmp = String(av).localeCompare(String(bv))
      } else {
        cmp = av - bv
      }
      if (cmp === 0) cmp = a.name.localeCompare(b.name)
      return asc ? cmp : -cmp
    })
  }, [rows, sortKey, asc])

  const toggle = (key: SortKey) => {
    if (key === sortKey) setAsc((v) => !v)
    else {
      setSortKey(key)
      setAsc(key === 'name')
    }
  }

  return (
    <Panel className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="border-b border-line bg-surface-2 text-xs">
            <SortHeader sortKey={sortKey} asc={asc} onToggle={toggle} label="Player" sortAs="name" className="pl-4 text-left" />
            {TABLE_STATS.map((s) => (
              <SortHeader sortKey={sortKey} asc={asc} onToggle={toggle}
                key={s.key}
                label={s.shortLabel}
                sortAs={s.key}
                title={s.label}
                className="text-right"
              />
            ))}
            <SortHeader sortKey={sortKey} asc={asc} onToggle={toggle}
              label={CONTRIBUTION_LABEL}
              sortAs="combined"
              title="Goals and assists combined"
              className="text-right"
            />
            <SortHeader sortKey={sortKey} asc={asc} onToggle={toggle} label="POTM" sortAs="potg" title="Player of the match awards" className="text-right" />
            <SortHeader sortKey={sortKey} asc={asc} onToggle={toggle} label="GP" sortAs="games" title="Games played" className="text-right" />
            {PER_GAME_STATS.map((s) => (
              <SortHeader sortKey={sortKey} asc={asc} onToggle={toggle}
                key={`avg-${s.key}`}
                label={`${s.shortLabel}/G`}
                sortAs={`avg:${s.key}`}
                title={`${s.label} per game`}
                className="text-right"
              />
            ))}
            {onEdit && <th className="w-12 px-2 py-2" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {sorted.map((r) => (
            <tr key={r.id} className="transition-colors hover:bg-surface-2">
              <td className="py-2.5 pl-4 pr-2">
                <Link
                  href={`/players/${r.id}`}
                  className="font-medium transition-colors hover:text-accent-text"
                >
                  {r.jerseyNumber !== null && (
                    <span className="mr-1.5 tabular-nums text-faint">
                      #{r.jerseyNumber}
                    </span>
                  )}
                  {r.name}
                </Link>
                {!r.isHuman && (
                  <span className="ml-2 rounded bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold text-faint">
                    AI
                  </span>
                )}
                {!r.isActive && (
                  <span className="ml-2 text-[10px] uppercase tracking-wider text-faint">
                    inactive
                  </span>
                )}
              </td>
              {TABLE_STATS.map((s) => (
                <td key={s.key} className="px-2 py-2.5 text-right tabular-nums">
                  {statApplies(s, r.position, r.stats[s.key])
                    ? formatStat(r.stats[s.key])
                    : '—'}
                </td>
              ))}
              <td className="px-2 py-2.5 text-right font-bold tabular-nums text-accent-text">
                {r.combined}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums">
                {r.potgAwards > 0 ? r.potgAwards : <span className="text-faint">—</span>}
              </td>
              <td className="px-2 py-2.5 text-right tabular-nums">
                {r.gamesPlayed}
              </td>
              {PER_GAME_STATS.map((s) => (
                <td
                  key={`avg-${s.key}`}
                  className="px-2 py-2.5 text-right tabular-nums text-muted"
                >
                  {formatAverage(r.stats[s.key], r.statGames[s.key] ?? 0)}
                </td>
              ))}
              {onEdit && (
                <td className="px-2 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => onEdit(r.id)}
                    aria-label={`Edit ${r.name}`}
                    className={iconButtonStyles()}
                  >
                    <span aria-hidden>✎</span>
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  )
}

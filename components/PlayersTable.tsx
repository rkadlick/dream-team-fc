'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Card } from '@/components/ui'
import { STATS } from '@/lib/stats-config'
import { formatAverage } from '@/lib/format'

export type LeaderboardRow = {
  id: string
  name: string
  jerseyNumber: number | null
  position: string | null
  isHuman: boolean
  stats: Record<string, number>
  combined: number
  gamesPlayed: number | null
}

type SortKey = 'name' | 'combined' | 'games' | string

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
    <th className={`px-2 py-2 font-semibold ${className}`}>
      <button
        type="button"
        onClick={() => onToggle(sortAs)}
        title={title}
        className={`inline-flex min-h-8 items-center gap-1 ${
          active ? 'text-violet-300' : 'text-neutral-500'
        }`}
      >
        {label}
        {active && <span aria-hidden>{asc ? '\u25B2' : '\u25BC'}</span>}
      </button>
    </th>
  )
}

export function PlayersTable({ rows }: { rows: LeaderboardRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>(STATS[0]?.key ?? 'combined')
  const [asc, setAsc] = useState(false)

  const sorted = useMemo(() => {
    const value = (r: LeaderboardRow): number | string => {
      if (sortKey === 'name') return r.name.toLowerCase()
      if (sortKey === 'combined') return r.combined
      if (sortKey === 'games') return r.gamesPlayed ?? -1
      if (sortKey.startsWith('avg:')) {
        const key = sortKey.slice(4)
        return r.gamesPlayed && r.gamesPlayed > 0
          ? (r.stats[key] ?? 0) / r.gamesPlayed
          : -1
      }
      return r.stats[sortKey] ?? 0
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
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-sm">
        <thead>
          <tr className="border-b border-[var(--color-line)]">
            <SortHeader sortKey={sortKey} asc={asc} onToggle={toggle} label="Player" sortAs="name" className="text-left" />
            {STATS.map((s) => (
              <SortHeader sortKey={sortKey} asc={asc} onToggle={toggle}
                key={s.key}
                label={s.shortLabel}
                sortAs={s.key}
                title={s.label}
                className="text-right"
              />
            ))}
            <SortHeader sortKey={sortKey} asc={asc} onToggle={toggle}
              label={STATS.map((s) => s.shortLabel).join('+')}
              sortAs="combined"
              title="All stats combined"
              className="text-right"
            />
            <SortHeader sortKey={sortKey} asc={asc} onToggle={toggle} label="GP" sortAs="games" title="Games played" className="text-right" />
            {STATS.map((s) => (
              <SortHeader sortKey={sortKey} asc={asc} onToggle={toggle}
                key={`avg-${s.key}`}
                label={`${s.shortLabel}/G`}
                sortAs={`avg:${s.key}`}
                title={`${s.label} per game`}
                className="text-right"
              />
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--color-line)]">
          {sorted.map((r) => (
            <tr key={r.id} className="hover:bg-[var(--color-surface-2)]">
              <td className="px-2 py-3">
                <Link href={`/players/${r.id}`} className="hover:text-violet-300">
                  {r.jerseyNumber !== null && (
                    <span className="mr-1.5 text-neutral-600 tabular-nums">
                      #{r.jerseyNumber}
                    </span>
                  )}
                  {r.name}
                </Link>
                {!r.isHuman && (
                  <span className="ml-2 text-xs text-neutral-600">AI</span>
                )}
              </td>
              {STATS.map((s) => (
                <td key={s.key} className="px-2 py-3 text-right tabular-nums">
                  {r.stats[s.key] ?? 0}
                </td>
              ))}
              <td className="px-2 py-3 text-right font-semibold tabular-nums text-violet-300">
                {r.combined}
              </td>
              <td className="px-2 py-3 text-right tabular-nums">
                {r.gamesPlayed ?? '—'}
              </td>
              {STATS.map((s) => (
                <td
                  key={`avg-${s.key}`}
                  className="px-2 py-3 text-right tabular-nums text-neutral-400"
                >
                  {r.gamesPlayed === null
                    ? '—'
                    : formatAverage(r.stats[s.key] ?? 0, r.gamesPlayed)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { fieldBase, fieldStyles } from '@/components/ui'

type Option = { value: string; label: string }

const selectStyles = `${fieldBase} min-h-9 min-w-0 flex-1 rounded-lg border-line bg-surface-2 py-1 pr-8 text-sm sm:flex-none`

/**
 * A single compact toolbar rather than a grid of full-width fields. It submits
 * on change, so the Apply button is only there for the text search.
 */
export function MatchFilters({
  seasons,
  gameTypes,
  divisions,
  current,
  resultCount,
}: {
  seasons: Option[]
  gameTypes: Option[]
  divisions: number[]
  current: {
    season: string
    division: string
    gameType: string
    result: string
    opponent: string
  }
  resultCount: number
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const submit = () => formRef.current?.requestSubmit()

  const activeCount = Object.values(current).filter(Boolean).length

  return (
    <form
      ref={formRef}
      method="get"
      action="/matches"
      className="mb-6 rounded-2xl border border-line bg-surface-2 p-2"
    >
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-faint"
          >
            ⌕
          </span>
          <input
            name="opponent"
            type="search"
            defaultValue={current.opponent}
            placeholder="Search opponent"
            aria-label="Search opponent"
            className={`${fieldStyles} min-h-9 rounded-lg border-line py-1 pl-8 text-sm`}
          />
        </div>

        <select
          name="season"
          aria-label="Season"
          defaultValue={current.season}
          onChange={submit}
          className={selectStyles}
        >
          <option value="">All seasons</option>
          {seasons.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <select
          name="division"
          aria-label="Division"
          defaultValue={current.division}
          onChange={submit}
          className={selectStyles}
        >
          <option value="">All divisions</option>
          {divisions.map((d) => (
            <option key={d} value={String(d)}>
              Division {d}
            </option>
          ))}
        </select>

        <select
          name="gameType"
          aria-label="Game type"
          defaultValue={current.gameType}
          onChange={submit}
          className={selectStyles}
        >
          <option value="">All game types</option>
          {gameTypes.map((g) => (
            <option key={g.value} value={g.value}>
              {g.label}
            </option>
          ))}
        </select>

        <select
          name="result"
          aria-label="Result"
          defaultValue={current.result}
          onChange={submit}
          className={selectStyles}
        >
          <option value="">All results</option>
          <option value="W">Wins</option>
          <option value="D">Draws</option>
          <option value="L">Losses</option>
        </select>

        <button
          type="submit"
          className="min-h-9 shrink-0 rounded-lg bg-accent px-3 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
        >
          Apply
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 px-1 pt-2 text-xs text-faint">
        <span>
          {resultCount} {resultCount === 1 ? 'match' : 'matches'}
          {activeCount > 0 && ` · ${activeCount} filter${activeCount === 1 ? '' : 's'}`}
        </span>
        {activeCount > 0 && (
          <Link href="/matches" className="font-medium text-accent-text hover:underline">
            Clear filters
          </Link>
        )}
      </div>
    </form>
  )
}

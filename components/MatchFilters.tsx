'use client'

import { useRef } from 'react'
import { fieldStyles } from '@/components/ui'

type Option = { value: string; label: string }

export function MatchFilters({
  seasons,
  gameTypes,
  divisions,
  current,
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
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const submit = () => formRef.current?.requestSubmit()

  return (
    <form
      ref={formRef}
      method="get"
      action="/matches"
      className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3"
    >
      <input
        name="opponent"
        type="search"
        defaultValue={current.opponent}
        placeholder="Search opponent"
        className={`${fieldStyles} col-span-2 sm:col-span-3`}
      />

      <select
        name="season"
        defaultValue={current.season}
        onChange={submit}
        className={fieldStyles}
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
        defaultValue={current.division}
        onChange={submit}
        className={fieldStyles}
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
        defaultValue={current.gameType}
        onChange={submit}
        className={fieldStyles}
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
        defaultValue={current.result}
        onChange={submit}
        className={fieldStyles}
      >
        <option value="">All results</option>
        <option value="W">Wins</option>
        <option value="D">Draws</option>
        <option value="L">Losses</option>
      </select>

      <button
        type="submit"
        className="col-span-2 min-h-11 rounded-xl bg-violet-600 px-4 text-sm font-semibold text-white hover:bg-violet-500 sm:col-span-1"
      >
        Apply
      </button>
    </form>
  )
}

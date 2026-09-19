'use client'

import { useRouter } from 'next/navigation'
import { fieldStyles } from '@/components/ui'

export function SeasonFilter({
  seasons,
  current,
  basePath,
}: {
  seasons: { value: string; label: string }[]
  current: string
  basePath: string
}) {
  const router = useRouter()

  return (
    <div className="mb-4">
      <select
        aria-label="Season"
        value={current}
        onChange={(e) => {
          const value = e.target.value
          router.push(value ? `${basePath}?season=${value}` : basePath)
        }}
        className={`${fieldStyles} sm:max-w-xs`}
      >
        <option value="">All time</option>
        {seasons.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  )
}

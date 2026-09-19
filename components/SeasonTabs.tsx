import Link from 'next/link'

/**
 * Replaces the season <select>. A handful of seasons is a set of choices, not
 * a form field — showing them all means one tap instead of three, and it makes
 * the current scope visible without opening anything.
 */
export function SeasonTabs({
  seasons,
  current,
  basePath,
  allLabel = 'All time',
}: {
  seasons: { value: string; label: string }[]
  current: string
  basePath: string
  allLabel?: string
}) {
  const options = [{ value: '', label: allLabel }, ...seasons]

  return (
    <div className="-mx-1 mb-5 overflow-x-auto px-1 pb-1">
      <div
        role="tablist"
        aria-label="Season"
        className="inline-flex min-w-full gap-1 rounded-xl border border-line bg-surface-2 p-1"
      >
        {options.map((option) => {
          const active = option.value === current
          return (
            <Link
              key={option.value || 'all'}
              role="tab"
              aria-selected={active}
              href={option.value ? `${basePath}?season=${option.value}` : basePath}
              scroll={false}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? 'bg-accent text-accent-fg shadow-card'
                  : 'text-muted hover:text-fg'
              }`}
            >
              {option.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

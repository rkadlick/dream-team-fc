'use client'

import { useCallback, useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'dtfc-theme'

/**
 * The stored choice is external state (localStorage + the data-theme attribute
 * the blocking script in app/layout.tsx already set), so it is read through
 * useSyncExternalStore rather than mirrored into an effect.
 */
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  // Other tabs changing the theme should move this control too.
  window.addEventListener('storage', listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', listener)
  }
}

function getSnapshot(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

/** The server cannot know the choice, so it renders the neutral one. */
function getServerSnapshot(): Theme {
  return 'system'
}

function store(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') {
    root.removeAttribute('data-theme')
    localStorage.removeItem(STORAGE_KEY)
  } else {
    root.setAttribute('data-theme', theme)
    localStorage.setItem(STORAGE_KEY, theme)
  }
  for (const listener of listeners) listener()
}

const OPTIONS: { value: Theme; label: string; glyph: string }[] = [
  { value: 'light', label: 'Light', glyph: '☀' },
  { value: 'system', label: 'System', glyph: '◐' },
  { value: 'dark', label: 'Dark', glyph: '☾' },
]

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  const choose = useCallback((next: Theme) => store(next), [])

  return (
    <div
      role="group"
      aria-label="Colour theme"
      className={`inline-flex items-center gap-0.5 rounded-xl border border-line bg-surface-2 p-0.5 ${
        compact ? '' : 'shrink-0'
      }`}
    >
      {OPTIONS.map((option) => {
        const active = theme === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => choose(option.value)}
            aria-pressed={active}
            title={option.label}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors ${
              active
                ? 'bg-surface text-accent-text shadow-card'
                : 'text-faint hover:text-fg'
            }`}
          >
            <span aria-hidden>{option.glyph}</span>
            <span className="sr-only">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

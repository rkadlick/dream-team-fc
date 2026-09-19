import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

/* ------------------------------------------------------------------ *
 * Surfaces
 *
 * Three deliberately different weights, so a page never reads as a stack
 * of identical boxes:
 *   <Panel>  — the default container for content that already exists.
 *   <Inset>  — a recessed well used *inside* a panel.
 *   <Draft>  — a dashed, accent-tinted container for "this creates
 *              something new", which is what tells an Add form apart from
 *              the records listed beneath it.
 * ------------------------------------------------------------------ */

export function Panel({
  children,
  className = '',
  tone = 'default',
  interactive = false,
}: {
  children: ReactNode
  className?: string
  tone?: 'default' | 'accent' | 'quiet'
  interactive?: boolean
}) {
  const tones = {
    default: 'border-line bg-surface',
    accent: 'border-accent-line bg-accent-soft',
    quiet: 'border-line bg-surface-2',
  }
  return (
    <div
      className={`rounded-2xl border shadow-card ${tones[tone]} ${
        interactive
          ? 'transition-[border-color,box-shadow,transform] hover:border-accent-line hover:shadow-lift'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}

/** Backwards-compatible alias; Panel is the name to reach for in new code. */
export const Card = Panel

export function Inset({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`rounded-xl border border-line bg-surface-2 ${className}`}>
      {children}
    </div>
  )
}

export function Draft({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border-2 border-dashed border-accent-line bg-accent-soft ${className}`}
    >
      {children}
    </div>
  )
}

/* ------------------------------------------------------------------ *
 * Headings
 * ------------------------------------------------------------------ */

export function SectionTitle({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-faint">
        {children}
      </h2>
      {action}
    </div>
  )
}

export function PageTitle({
  children,
  sub,
  action,
}: {
  children: ReactNode
  sub?: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{children}</h1>
        {sub && <p className="mt-1 text-sm text-muted">{sub}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  )
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-accent-text"
    >
      <span aria-hidden>←</span>
      {children}
    </Link>
  )
}

/* ------------------------------------------------------------------ *
 * Indicators
 * ------------------------------------------------------------------ */

export function ResultBadge({
  result,
  size = 'sm',
}: {
  result: string
  size?: 'sm' | 'lg'
}) {
  // Green / red are reserved for exactly this.
  const styles: Record<string, string> = {
    W: 'bg-win-soft text-win ring-win/30',
    D: 'bg-draw-soft text-draw ring-draw/30',
    L: 'bg-loss-soft text-loss ring-loss/30',
  }
  const dims = size === 'lg' ? 'h-11 w-11 text-lg' : 'h-7 w-7 text-sm'
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg font-bold ring-1 ${dims} ${
        styles[result] ?? styles.D
      }`}
    >
      {result}
    </span>
  )
}

export function Pill({
  children,
  tone = 'default',
}: {
  children: ReactNode
  tone?: 'default' | 'accent' | 'warn'
}) {
  const tones = {
    default: 'border-line bg-surface-2 text-muted',
    accent: 'border-accent-line bg-accent-soft text-accent-text',
    warn: 'border-warn-line bg-warn-soft text-warn',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-line px-4 py-10 text-center text-sm text-faint">
      {children}
    </p>
  )
}

/* ------------------------------------------------------------------ *
 * Controls
 * ------------------------------------------------------------------ */

const buttonBase =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45'

export const buttonStyles = {
  primary: `${buttonBase} bg-accent text-accent-fg hover:bg-accent-hover`,
  secondary: `${buttonBase} border border-line-strong bg-surface text-fg hover:border-accent hover:text-accent-text`,
  quiet: `${buttonBase} border border-line bg-surface-2 text-muted hover:text-fg`,
  danger: `${buttonBase} border border-loss/40 bg-loss-soft text-loss hover:border-loss`,
  ghost: `${buttonBase} text-muted hover:text-fg`,
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<'button'> & { variant?: keyof typeof buttonStyles }) {
  return <button className={`${buttonStyles[variant]} ${className}`} {...props} />
}

export function ButtonLink({
  variant = 'primary',
  className = '',
  ...props
}: ComponentProps<typeof Link> & { variant?: keyof typeof buttonStyles }) {
  return <Link className={`${buttonStyles[variant]} ${className}`} {...props} />
}

/** Square icon-only button, for compact row actions. */
export function iconButtonStyles(active = false) {
  return `inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm transition-colors ${
    active
      ? 'border-accent-line bg-accent-soft text-accent-text'
      : 'border-line bg-surface text-muted hover:border-accent-line hover:text-accent-text'
  }`
}

/** Width-free, so compact toolbars can size their own controls. */
export const fieldBase =
  'min-h-10 rounded-xl border border-line-strong bg-surface px-3 text-base text-fg outline-none transition-colors placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/25'

export const fieldStyles = `${fieldBase} w-full`

export function Label({
  children,
  htmlFor,
}: {
  children: ReactNode
  htmlFor?: string
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-faint"
    >
      {children}
    </label>
  )
}

/* ------------------------------------------------------------------ *
 * Stats
 * ------------------------------------------------------------------ */

export function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: ReactNode
  tone?: 'default' | 'accent'
}) {
  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        tone === 'accent'
          ? 'border-accent-line bg-accent-soft'
          : 'border-line bg-surface'
      }`}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wider text-faint">
        {label}
      </div>
      <div
        className={`mt-0.5 text-xl font-bold tabular-nums sm:text-2xl ${
          tone === 'accent' ? 'text-accent-text' : ''
        }`}
      >
        {value}
      </div>
    </div>
  )
}

import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] ${className}`}
    >
      {children}
    </div>
  )
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-400">
      {children}
    </h2>
  )
}

export function PageTitle({
  children,
  action,
}: {
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{children}</h1>
      {action}
    </div>
  )
}

export function ResultBadge({ result }: { result: string }) {
  // Muted green / red are reserved for exactly this.
  const styles: Record<string, string> = {
    W: 'bg-emerald-900/50 text-emerald-300 ring-emerald-700/50',
    D: 'bg-neutral-800 text-neutral-300 ring-neutral-600/60',
    L: 'bg-rose-950/60 text-rose-300 ring-rose-800/50',
  }
  return (
    <span
      className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-sm font-bold ring-1 ${
        styles[result] ?? styles.D
      }`}
    >
      {result}
    </span>
  )
}

export function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-[var(--color-line)] bg-[var(--color-surface-2)] px-2.5 py-1 text-xs text-neutral-300">
      {children}
    </span>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-[var(--color-line)] px-4 py-10 text-center text-sm text-neutral-500">
      {children}
    </p>
  )
}

const buttonBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50'

export const buttonStyles = {
  primary: `${buttonBase} bg-violet-600 text-white hover:bg-violet-500`,
  secondary: `${buttonBase} border border-[var(--color-line)] bg-[var(--color-surface-2)] text-white hover:border-violet-600`,
  danger: `${buttonBase} border border-rose-900/70 bg-rose-950/40 text-rose-200 hover:bg-rose-950/70`,
  ghost: `${buttonBase} text-neutral-300 hover:text-white`,
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

export const fieldStyles =
  'min-h-11 w-full rounded-xl border border-[var(--color-line)] bg-[var(--color-surface-2)] px-3 text-base text-white outline-none placeholder:text-neutral-600 focus:border-violet-500'

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
      className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-neutral-400"
    >
      {children}
    </label>
  )
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  )
}

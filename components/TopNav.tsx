'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Wordmark } from '@/components/Wordmark'
import { ThemeToggle } from '@/components/ThemeToggle'
import { signOutAction } from '@/app/auth-actions'

/** Everyone sees these. */
const PUBLIC_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/matches', label: 'Matches' },
  { href: '/players', label: 'Players' },
]

/**
 * Admin-only destinations. These never mix into the public row — they live in
 * their own tinted band so it is obvious at a glance which controls exist
 * because you are signed in.
 */
const ADMIN_LINKS = [
  { href: '/admin/matches/new', label: 'Add match', glyph: '＋' },
  { href: '/admin/seasons', label: 'Seasons', glyph: '◷' },
  { href: '/admin/game-types', label: 'Game types', glyph: '⚑' },
  { href: '/admin/team-photos', label: 'Team photos', glyph: '▦' },
]

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

function SignInButton({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/login"
      onClick={onNavigate}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-accent-line bg-accent-soft px-3 text-sm font-semibold text-accent-text transition-colors hover:border-accent"
    >
      <span aria-hidden>→]</span>
      Sign in
    </Link>
  )
}

function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="inline-flex min-h-9 items-center gap-1.5 rounded-xl border border-line-strong bg-surface px-3 text-sm font-medium text-muted transition-colors hover:border-loss hover:text-loss"
      >
        <span aria-hidden>[→</span>
        Sign out
      </button>
    </form>
  )
}

function AdminChip() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-fg">
      <span aria-hidden>●</span> Admin
    </span>
  )
}

export function TopNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  // The sheet is remembered per path, so navigating away closes it without an
  // effect having to chase the route.
  const [openPath, setOpenPath] = useState<string | null>(null)
  const open = openPath === pathname

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0">
          <Wordmark className="text-lg sm:text-xl" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {PUBLIC_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(pathname, link.href)
                  ? 'bg-surface-2 text-fg'
                  : 'text-muted hover:text-fg'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />
          {isAdmin ? (
            <>
              <AdminChip />
              <SignOutButton />
            </>
          ) : (
            <SignInButton />
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {isAdmin && <AdminChip />}
          <button
            type="button"
            onClick={() => setOpenPath(open ? null : pathname)}
            aria-expanded={open}
            aria-label="Toggle navigation"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-line-strong text-fg"
          >
            <span className="text-lg leading-none" aria-hidden>
              {open ? '✕' : '☰'}
            </span>
          </button>
        </div>
      </div>

      {/* The admin band: present only when signed in, and impossible to mistake
          for the public row. */}
      {isAdmin && (
        <div className="hidden border-t border-accent-line bg-accent-soft md:block">
          <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2 sm:px-6">
            <span className="mr-1 text-[10px] font-bold uppercase tracking-[0.18em] text-accent-text">
              Admin tools
            </span>
            {ADMIN_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(pathname, link.href) ? 'page' : undefined}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
                  isActive(pathname, link.href)
                    ? 'bg-accent text-accent-fg'
                    : 'text-accent-text hover:bg-accent/15'
                }`}
              >
                <span aria-hidden>{link.glyph}</span>
                {link.label}
              </Link>
            ))}
            <span className="ml-auto text-xs text-accent-text/80">
              Editing controls appear on each page
            </span>
          </div>
        </div>
      )}

      {open && (
        <div className="border-t border-line bg-surface md:hidden">
          <nav className="px-4 py-2">
            {PUBLIC_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block rounded-lg px-3 py-3 text-base font-medium ${
                  isActive(pathname, link.href)
                    ? 'bg-surface-2 text-fg'
                    : 'text-muted'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {isAdmin && (
            <nav className="border-t border-accent-line bg-accent-soft px-4 py-2">
              <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-accent-text">
                Admin tools
              </p>
              {ADMIN_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-3 text-base font-medium ${
                    isActive(pathname, link.href)
                      ? 'bg-accent text-accent-fg'
                      : 'text-accent-text'
                  }`}
                >
                  <span aria-hidden>{link.glyph}</span>
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3">
            <ThemeToggle compact />
            {isAdmin ? <SignOutButton /> : <SignInButton />}
          </div>
        </div>
      )}
    </header>
  )
}

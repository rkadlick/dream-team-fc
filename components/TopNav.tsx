'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { Wordmark } from '@/components/Wordmark'
import { signOutAction } from '@/app/auth-actions'

const PUBLIC_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/matches', label: 'Matches' },
  { href: '/players', label: 'Players' },
]

const ADMIN_LINKS = [
  { href: '/admin/matches/new', label: 'Add match' },
  { href: '/admin/players', label: 'Players' },
  { href: '/admin/seasons', label: 'Seasons' },
  { href: '/admin/game-types', label: 'Game types' },
]

function isActive(pathname: string, href: string) {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

export function TopNav({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const links = isAdmin ? [...PUBLIC_LINKS, ...ADMIN_LINKS] : PUBLIC_LINKS

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--color-line)] bg-black/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="shrink-0" onClick={() => setOpen(false)}>
          <Wordmark className="text-lg sm:text-xl" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive(pathname, link.href)
                  ? 'bg-violet-600/20 text-violet-300'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin ? (
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-500 hover:text-white"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-500 hover:text-white"
            >
              Admin
            </Link>
          )}
        </nav>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label="Toggle navigation"
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--color-line)] text-white md:hidden"
        >
          <span className="text-lg leading-none">{open ? '✕' : '☰'}</span>
        </button>
      </div>

      {open && (
        <nav className="border-t border-[var(--color-line)] px-4 py-2 md:hidden">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3 py-3 text-base font-medium ${
                isActive(pathname, link.href)
                  ? 'bg-violet-600/20 text-violet-300'
                  : 'text-neutral-300'
              }`}
            >
              {link.label}
            </Link>
          ))}
          {isAdmin ? (
            <form action={signOutAction}>
              <button
                type="submit"
                className="block w-full rounded-lg px-3 py-3 text-left text-base font-medium text-neutral-500"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-3 text-base font-medium text-neutral-500"
            >
              Admin
            </Link>
          )}
        </nav>
      )}
    </header>
  )
}

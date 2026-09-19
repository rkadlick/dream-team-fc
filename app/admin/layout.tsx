import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const TABS = [
  { href: '/admin/matches/new', label: 'Add match' },
  { href: '/admin/players', label: 'Players' },
  { href: '/admin/seasons', label: 'Seasons' },
  { href: '/admin/game-types', label: 'Game types' },
]

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // The proxy already blocks non-admins; this is the belt-and-braces check.
  const { isAdmin } = await getViewer()
  if (!isAdmin) redirect('/login?error=not_authorized')

  return (
    <div>
      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="shrink-0 rounded-xl border border-[var(--color-line)] px-3 py-2 text-sm text-neutral-300 hover:border-violet-600 hover:text-white"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  )
}

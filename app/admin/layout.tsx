import { redirect } from 'next/navigation'
import { getViewer } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * No tab row here any more — the admin band in TopNav is the one place admin
 * destinations live, so they are not duplicated two rows apart.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // The proxy already blocks non-admins; this is the belt-and-braces check.
  const { isAdmin } = await getViewer()
  if (!isAdmin) redirect('/login?error=not_authorized')

  return <>{children}</>
}

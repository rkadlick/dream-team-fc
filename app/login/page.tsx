import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/LoginForm'
import { Panel } from '@/components/ui'
import { getViewer } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function LoginPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const viewer = await getViewer()
  const searchParams = await props.searchParams

  const pick = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] ?? '' : v ?? ''
  const next = pick(searchParams.next)
  const error = pick(searchParams.error)

  if (viewer.isAdmin) redirect(next || '/admin/matches/new')

  return (
    <div className="mx-auto max-w-sm py-6 sm:py-12">
      <Panel className="p-6">
        <h1 className="text-xl font-bold">Admin sign in</h1>
        <p className="mb-6 mt-1 text-sm text-muted">
          Accounts are created in the Supabase dashboard; there is no sign-up.
        </p>
        <Suspense>
          <LoginForm
            next={next}
            initialError={error === 'not_authorized' ? 'Not authorized' : null}
          />
        </Suspense>
      </Panel>
    </div>
  )
}

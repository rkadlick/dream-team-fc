import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/LoginForm'
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
    <div className="mx-auto max-w-sm py-8">
      <h1 className="mb-1 text-2xl font-bold">Admin sign in</h1>
      <p className="mb-6 text-sm text-neutral-500">
        Accounts are created in the Supabase dashboard; there is no sign-up.
      </p>
      <Suspense>
        <LoginForm
          next={next}
          initialError={error === 'not_authorized' ? 'Not authorized' : null}
        />
      </Suspense>
    </div>
  )
}

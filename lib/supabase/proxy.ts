import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

/**
 * Refreshes the auth cookie and, for /admin/*, enforces that the signed-in
 * user is in the admins table. A signed-in non-admin is signed out.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!request.nextUrl.pathname.startsWith('/admin')) {
    return response
  }

  if (!user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`
    return NextResponse.redirect(url)
  }

  const { data: adminRow } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!adminRow) {
    await supabase.auth.signOut()
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.search = '?error=not_authorized'
    return NextResponse.redirect(url)
  }

  return response
}

import { createClient } from '@/lib/supabase/server'

export type Viewer = {
  userId: string | null
  isAdmin: boolean
}

/**
 * Who is looking at the page. Admin status is read from the admins table,
 * which only exposes the caller's own row, so this cannot be spoofed.
 */
export async function getViewer(): Promise<Viewer> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { userId: null, isAdmin: false }

  const { data } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  return { userId: user.id, isAdmin: Boolean(data) }
}

/** Throws unless the caller is an admin. Server actions call this first. */
export async function requireAdmin(): Promise<string> {
  const viewer = await getViewer()
  if (!viewer.isAdmin || !viewer.userId) {
    throw new Error('Not authorized')
  }
  return viewer.userId
}

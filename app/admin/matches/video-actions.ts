'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { fail, ok, type ActionState } from '@/lib/action-state'
import { VIDEO_KINDS } from '@/lib/constants'
import { parseYoutubeId } from '@/lib/youtube'

export async function addMatchVideoAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin()
  const matchId = String(formData.get('match_id') ?? '')
  const url = String(formData.get('url') ?? '').trim()
  const kind = String(formData.get('kind') ?? '')
  const title = String(formData.get('title') ?? '').trim()

  if (!matchId) return fail('Missing match.')
  const videoId = parseYoutubeId(url)
  if (!videoId) return fail('Enter a valid YouTube link.')
  if (!(VIDEO_KINDS as readonly string[]).includes(kind)) {
    return fail('Pick a video type.')
  }

  const supabase = await createClient()
  const { error } = await supabase.from('match_videos').insert({
    match_id: matchId,
    url,
    title: title || null,
    kind,
  })
  if (error) return fail(error.message)

  revalidatePath(`/matches/${matchId}`)
  revalidatePath('/', 'layout')
  return ok('Video added.')
}

export async function deleteMatchVideoAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const matchId = String(formData.get('match_id') ?? '')
  if (!id) return fail('Missing video.')

  const supabase = await createClient()
  const { error } = await supabase.from('match_videos').delete().eq('id', id)
  if (error) return fail(error.message)

  revalidatePath(`/matches/${matchId}`)
  revalidatePath('/', 'layout')
  return ok('Video removed.')
}

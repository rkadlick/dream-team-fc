'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { fail, ok, type ActionState } from '@/lib/action-state'

const STORAGE_BUCKET = 'team-photos'
const MAX_BYTES = 8 * 1024 * 1024
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
])

export async function uploadTeamPhotoAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const userId = await requireAdmin()

  const file = formData.get('photo')
  if (!(file instanceof File) || file.size === 0) return fail('Choose a photo.')
  if (!ALLOWED_TYPES.has(file.type)) {
    return fail('Photos must be JPEG, PNG, WEBP, AVIF, or GIF.')
  }
  if (file.size > MAX_BYTES) return fail('Photo must be smaller than 8MB.')

  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
  const storagePath = `${crypto.randomUUID()}.${extension}`

  const supabase = await createClient()
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, { contentType: file.type })
  if (uploadError) return fail(uploadError.message)

  const { error: insertError } = await supabase
    .from('team_photos')
    .insert({ storage_path: storagePath, created_by: userId })
  if (insertError) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])
    return fail(insertError.message)
  }

  revalidatePath('/', 'layout')
  return ok('Photo added.')
}

export async function deleteTeamPhotoAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin()

  const id = String(formData.get('id') ?? '')
  const storagePath = String(formData.get('storage_path') ?? '')
  if (!id || !storagePath) return fail('Missing photo.')

  const supabase = await createClient()
  const { error: deleteRowError } = await supabase
    .from('team_photos')
    .delete()
    .eq('id', id)
  if (deleteRowError) return fail(deleteRowError.message)

  await supabase.storage.from(STORAGE_BUCKET).remove([storagePath])

  revalidatePath('/', 'layout')
  return ok('Photo removed.')
}

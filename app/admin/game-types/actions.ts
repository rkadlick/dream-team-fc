'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'

export async function createGameTypeAction(formData: FormData) {
  await requireAdmin()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return

  const supabase = await createClient()
  await supabase.from('game_types').insert({ name })
  revalidatePath('/', 'layout')
}

export async function updateGameTypeAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  if (!id || !name) return

  const supabase = await createClient()
  await supabase
    .from('game_types')
    .update({ name, is_active: formData.get('is_active') === 'on' })
    .eq('id', id)
  revalidatePath('/', 'layout')
}

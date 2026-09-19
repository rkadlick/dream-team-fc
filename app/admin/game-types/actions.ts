'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { fail, ok, type ActionState } from '@/lib/action-state'

export async function createGameTypeAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin()
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return fail('Enter a name.')

  const supabase = await createClient()
  const { error } = await supabase.from('game_types').insert({ name })
  if (error) return fail(error.message)

  revalidatePath('/', 'layout')
  return ok(`“${name}” added.`)
}

export async function updateGameTypeAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const name = String(formData.get('name') ?? '').trim()
  if (!id) return fail('Missing game type.')
  if (!name) return fail('Enter a name.')

  const supabase = await createClient()
  const { error } = await supabase
    .from('game_types')
    .update({ name, is_active: formData.get('is_active') === 'on' })
    .eq('id', id)
  if (error) return fail(error.message)

  revalidatePath('/', 'layout')
  return ok('Saved.')
}

/** Flip active/inactive without opening the row's editor. */
export async function toggleGameTypeAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const next = formData.get('next') === 'true'
  if (!id) return fail('Missing game type.')

  const supabase = await createClient()
  const { error } = await supabase
    .from('game_types')
    .update({ is_active: next })
    .eq('id', id)
  if (error) return fail(error.message)

  revalidatePath('/', 'layout')
  return ok(next ? 'Activated.' : 'Deactivated.')
}

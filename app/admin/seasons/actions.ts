'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'
import { fail, ok, type ActionState } from '@/lib/action-state'

function readSeasonFields(formData: FormData) {
  const endDate = String(formData.get('end_date') ?? '').trim()
  return {
    name: String(formData.get('name') ?? '').trim(),
    start_date: String(formData.get('start_date') ?? '').trim(),
    end_date: endDate === '' ? null : endDate,
  }
}

function validate(fields: ReturnType<typeof readSeasonFields>): string | null {
  if (!fields.name) return 'Give the season a name.'
  if (!fields.start_date) return 'Pick a start date.'
  if (fields.end_date && fields.end_date < fields.start_date) {
    return 'The end date is before the start date.'
  }
  return null
}

export async function createSeasonAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin()
  const fields = readSeasonFields(formData)
  const problem = validate(fields)
  if (problem) return fail(problem)

  const supabase = await createClient()
  const { error } = await supabase.from('seasons').insert(fields)
  if (error) return fail(error.message)

  revalidatePath('/', 'layout')
  return ok(`“${fields.name}” added.`)
}

export async function updateSeasonAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const fields = readSeasonFields(formData)
  if (!id) return fail('Missing season.')
  const problem = validate(fields)
  if (problem) return fail(problem)

  const supabase = await createClient()
  const { error } = await supabase.from('seasons').update(fields).eq('id', id)
  if (error) return fail(error.message)

  revalidatePath('/', 'layout')
  return ok('Season updated.')
}

/** A partial unique index allows only one current season, so clear first. */
export async function setCurrentSeasonAction(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return fail('Missing season.')

  const supabase = await createClient()
  await supabase
    .from('seasons')
    .update({ is_current: false })
    .eq('is_current', true)
  const { error } = await supabase
    .from('seasons')
    .update({ is_current: true })
    .eq('id', id)
  if (error) return fail(error.message)

  revalidatePath('/', 'layout')
  return ok('Current season changed.')
}

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth'

function readSeasonFields(formData: FormData) {
  const endDate = String(formData.get('end_date') ?? '').trim()
  return {
    name: String(formData.get('name') ?? '').trim(),
    start_date: String(formData.get('start_date') ?? '').trim(),
    end_date: endDate === '' ? null : endDate,
  }
}

export async function createSeasonAction(formData: FormData) {
  await requireAdmin()
  const fields = readSeasonFields(formData)
  if (!fields.name || !fields.start_date) return

  const supabase = await createClient()
  await supabase.from('seasons').insert(fields)
  revalidatePath('/', 'layout')
}

export async function updateSeasonAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  const fields = readSeasonFields(formData)
  if (!id || !fields.name || !fields.start_date) return

  const supabase = await createClient()
  await supabase.from('seasons').update(fields).eq('id', id)
  revalidatePath('/', 'layout')
}

/** A partial unique index allows only one current season, so clear first. */
export async function setCurrentSeasonAction(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const supabase = await createClient()
  await supabase
    .from('seasons')
    .update({ is_current: false })
    .eq('is_current', true)
  await supabase.from('seasons').update({ is_current: true }).eq('id', id)
  revalidatePath('/', 'layout')
}

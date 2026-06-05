'use server'

import { createClient as createSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PrvClient } from '@/lib/types/database'

type ActionResult<T = null> = { data: T; error: null } | { data: null; error: string }

export async function createClient(input: {
  name: string
  slug: string
  logo_url?: string | null
}): Promise<ActionResult<PrvClient>> {
  const supabase = await createSupabaseClient()
  const { data, error } = await supabase
    .from('Prv_clients')
    .insert({ name: input.name, slug: input.slug, logo_url: input.logo_url ?? null })
    .select()
    .single()
  if (error) return { data: null, error: error.message }
  revalidatePath('/dashboard/clients')
  return { data: data as PrvClient, error: null }
}

export async function updateClient(
  id: string,
  input: Partial<Pick<PrvClient, 'name' | 'slug' | 'logo_url'>>
): Promise<ActionResult<PrvClient>> {
  const supabase = await createSupabaseClient()
  const { data, error } = await supabase
    .from('Prv_clients')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) return { data: null, error: error.message }
  revalidatePath('/dashboard/clients')
  revalidatePath(`/dashboard/clients/${id}`)
  return { data: data as PrvClient, error: null }
}

export async function deleteClient(id: string): Promise<ActionResult> {
  const supabase = await createSupabaseClient()
  const { error } = await supabase
    .from('Prv_clients')
    .delete()
    .eq('id', id)
  if (error) return { data: null, error: error.message }
  revalidatePath('/dashboard/clients')
  return { data: null, error: null }
}

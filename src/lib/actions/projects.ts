'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PrvProject } from '@/lib/types/database'

type ActionResult<T = null> = { data: T; error: null } | { data: null; error: string }

export async function createProject(input: {
  client_id: string
  name: string
  description?: string | null
  spine_version?: string | null
}): Promise<ActionResult<PrvProject>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('Prv_projects')
    .insert({
      client_id: input.client_id,
      name: input.name,
      description: input.description ?? null,
      spine_version: input.spine_version ?? null,
    })
    .select()
    .single()
  if (error) return { data: null, error: error.message }
  revalidatePath(`/dashboard/clients/${input.client_id}`)
  return { data: data as PrvProject, error: null }
}

export async function updateProject(
  id: string,
  input: Partial<Pick<PrvProject, 'name' | 'description' | 'status' | 'spine_version' | 'share_enabled'>>
): Promise<ActionResult<PrvProject>> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('Prv_projects')
    .update(input)
    .eq('id', id)
    .select()
    .single()
  if (error) return { data: null, error: error.message }
  revalidatePath(`/dashboard/clients`)
  return { data: data as PrvProject, error: null }
}

export async function deleteProject(id: string, clientId: string): Promise<ActionResult> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('Prv_projects')
    .delete()
    .eq('id', id)
  if (error) return { data: null, error: error.message }
  revalidatePath(`/dashboard/clients/${clientId}`)
  return { data: null, error: null }
}

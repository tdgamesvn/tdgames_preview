'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PrvTask } from '@/lib/types/database'

type ActionResult<T = null> = { data: T; error: null } | { data: null; error: string }

export async function createTask(input: {
  project_id: string
  client_id: string   // for revalidation path
  name: string
}): Promise<ActionResult<PrvTask>> {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from('Prv_tasks')
    .insert({ project_id: input.project_id, name: input.name })
    .select()
    .single()
  if (error) return { data: null, error: error.message }
  revalidatePath(`/dashboard/clients/${input.client_id}/projects/${input.project_id}`)
  return { data: data as PrvTask, error: null }
}

export async function createTasksBatch(input: {
  project_id: string
  client_id: string
  names: string[]   // already trimmed, non-empty
}): Promise<ActionResult<PrvTask[]>> {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const rows = input.names.map((name, i) => ({ project_id: input.project_id, name, sort_order: i }))
  const { data, error } = await supabase
    .from('Prv_tasks')
    .insert(rows)
    .select()
  if (error) return { data: null, error: error.message }
  revalidatePath(`/dashboard/clients/${input.client_id}/projects/${input.project_id}`)
  return { data: data as PrvTask[], error: null }
}

export async function updateTask(input: {
  task_id: string
  project_id: string
  client_id: string
  name: string
}): Promise<ActionResult<PrvTask>> {
  const name = input.name.trim()
  if (!name) return { data: null, error: 'Name cannot be empty' }
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from('Prv_tasks')
    .update({ name })
    .eq('id', input.task_id)
    .select()
    .single()
  if (error) return { data: null, error: error.message }
  revalidatePath(`/dashboard/clients/${input.client_id}/projects/${input.project_id}`)
  return { data: data as PrvTask, error: null }
}

export async function updateTaskAvatar(params: {
  task_id: string
  project_id: string
  client_id: string
  avatar_asset_id: string | null
  avatar_animation: string | null
  avatar_skin?: string | null
  avatar_bg?: string | null
  avatar_scale: number
  avatar_offset_x: number
  avatar_offset_y: number
}): Promise<{ error?: string }> {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { error } = await supabase
    .from('Prv_tasks')
    .update({
      avatar_asset_id: params.avatar_asset_id,
      avatar_animation: params.avatar_animation,
      avatar_skin: params.avatar_skin ?? null,
      avatar_bg: params.avatar_bg ?? null,
      avatar_scale: params.avatar_scale,
      avatar_offset_x: params.avatar_offset_x,
      avatar_offset_y: params.avatar_offset_y,
    })
    .eq('id', params.task_id)
    .eq('project_id', params.project_id)
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/clients/${params.client_id}/projects/${params.project_id}`)
  return {}
}

export async function deleteTask(input: {
  task_id: string
  project_id: string
  client_id: string
}): Promise<ActionResult> {
  const supabase = (await createClient()) as any // eslint-disable-line @typescript-eslint/no-explicit-any
  const { error } = await supabase
    .from('Prv_tasks')
    .delete()
    .eq('id', input.task_id)
  if (error) return { data: null, error: error.message }
  revalidatePath(`/dashboard/clients/${input.client_id}/projects/${input.project_id}`)
  return { data: null, error: null }
}

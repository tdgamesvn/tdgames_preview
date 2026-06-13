'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import type { PrvProfile } from '@/lib/types/database'

type ActionResult<T = null> = { data: T; error: null } | { data: null; error: string }

/**
 * Create a Supabase Auth user (role=client) then upsert their Prv_profiles row.
 * On profile failure, rolls back the auth user.
 */
export async function createClientAccount(
  clientId: string,
  email: string,
  password: string,
  displayName: string,
): Promise<ActionResult<PrvProfile>> {
  const supabase = createAdminClient()

  // 1. Create auth user — email pre-confirmed so they can log in immediately
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (authError || !authData.user) {
    return { data: null, error: authError?.message ?? 'Failed to create auth user' }
  }

  // 2. Upsert profile row
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile, error: profileError } = await (supabase as any)
    .from('Prv_profiles')
    .upsert({
      id: authData.user.id,
      role: 'client',
      client_id: clientId,
      display_name: displayName,
    })
    .select()
    .single()

  if (profileError) {
    // Rollback: delete the auth user we just created
    await supabase.auth.admin.deleteUser(authData.user.id)
    return { data: null, error: profileError.message }
  }

  revalidatePath(`/dashboard/clients/${clientId}`)
  return { data: profile as PrvProfile, error: null }
}

/**
 * Change the login password for an existing client account.
 * No old-password required — internal team only.
 */
export async function updateClientAccountPassword(
  userId: string,
  newPassword: string,
  clientId: string,
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase.auth.admin.updateUserById(userId, { password: newPassword })
  if (error) return { data: null, error: error.message }
  revalidatePath(`/dashboard/clients/${clientId}`)
  return { data: null, error: null }
}

/**
 * Delete a client login account.
 * Auth user deletion cascades to Prv_profiles via ON DELETE CASCADE.
 */
export async function deleteClientAccount(
  userId: string,
  clientId: string,
): Promise<ActionResult> {
  const supabase = createAdminClient()
  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) return { data: null, error: error.message }
  revalidatePath(`/dashboard/clients/${clientId}`)
  return { data: null, error: null }
}

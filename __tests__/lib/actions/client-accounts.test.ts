/**
 * @jest-environment node
 */
import {
  createClientAccount,
  updateClientAccountPassword,
  deleteClientAccount,
} from '@/lib/actions/client-accounts'

// ── Mocks ──────────────────────────────────────────────────────────────────
const mockCreateUser     = jest.fn()
const mockUpdateUserById = jest.fn()
const mockDeleteUser     = jest.fn()
const mockFrom           = jest.fn()
const mockUpsert         = jest.fn()
const mockSelect         = jest.fn()
const mockSingle         = jest.fn()

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    auth: {
      admin: {
        createUser:     mockCreateUser,
        updateUserById: mockUpdateUserById,
        deleteUser:     mockDeleteUser,
      },
    },
    from: mockFrom,
  })),
}))

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

// ── Shared chain setup ─────────────────────────────────────────────────────
const PROFILE = {
  id: 'u1',
  role: 'client',
  client_id: 'c1',
  display_name: 'Studio ABC',
  created_at: '2026-01-01T00:00:00Z',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockSingle.mockResolvedValue({ data: PROFILE, error: null })
  mockSelect.mockReturnValue({ single: mockSingle })
  mockUpsert.mockReturnValue({ select: mockSelect })
  mockFrom.mockReturnValue({ upsert: mockUpsert })
})

// ── createClientAccount ────────────────────────────────────────────────────
describe('createClientAccount', () => {
  it('creates auth user with email_confirm=true then upserts profile', async () => {
    mockCreateUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })

    const result = await createClientAccount('c1', 'contact@studio.com', 'pass123', 'Studio ABC')

    expect(mockCreateUser).toHaveBeenCalledWith({
      email: 'contact@studio.com',
      password: 'pass123',
      email_confirm: true,
    })
    expect(mockFrom).toHaveBeenCalledWith('Prv_profiles')
    expect(mockUpsert).toHaveBeenCalledWith({
      id: 'u1',
      role: 'client',
      client_id: 'c1',
      display_name: 'Studio ABC',
    })
    expect(result.error).toBeNull()
    expect(result.data).toMatchObject({ id: 'u1', role: 'client', client_id: 'c1' })
  })

  it('returns error when Supabase auth creation fails', async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Email already registered' },
    })

    const result = await createClientAccount('c1', 'taken@studio.com', 'pass', 'Studio')

    expect(result.error).toBe('Email already registered')
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('rolls back auth user when profile upsert fails', async () => {
    mockCreateUser.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    mockSingle.mockResolvedValue({ data: null, error: { message: 'profile insert failed' } })
    mockDeleteUser.mockResolvedValue({ error: null })

    const result = await createClientAccount('c1', 'test@studio.com', 'pass', 'Studio')

    expect(mockDeleteUser).toHaveBeenCalledWith('u1')
    expect(result.error).toBe('profile insert failed')
  })

  it('works with empty display_name', async () => {
    mockCreateUser.mockResolvedValue({ data: { user: { id: 'u2' } }, error: null })

    await createClientAccount('c1', 'noname@studio.com', 'pass123', '')

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ display_name: '' })
    )
  })
})

// ── updateClientAccountPassword ────────────────────────────────────────────
describe('updateClientAccountPassword', () => {
  it('calls updateUserById with the new password', async () => {
    mockUpdateUserById.mockResolvedValue({ error: null })

    const result = await updateClientAccountPassword('u1', 'newS3cr3t', 'c1')

    expect(mockUpdateUserById).toHaveBeenCalledWith('u1', { password: 'newS3cr3t' })
    expect(result.error).toBeNull()
  })

  it('returns error when update fails', async () => {
    mockUpdateUserById.mockResolvedValue({ error: { message: 'weak password' } })

    const result = await updateClientAccountPassword('u1', 'abc', 'c1')

    expect(result.error).toBe('weak password')
  })
})

// ── deleteClientAccount ────────────────────────────────────────────────────
describe('deleteClientAccount', () => {
  it('calls deleteUser with the user id', async () => {
    mockDeleteUser.mockResolvedValue({ error: null })

    const result = await deleteClientAccount('u1', 'c1')

    expect(mockDeleteUser).toHaveBeenCalledWith('u1')
    expect(result.error).toBeNull()
  })

  it('returns error when deletion fails', async () => {
    mockDeleteUser.mockResolvedValue({ error: { message: 'user not found' } })

    const result = await deleteClientAccount('u1', 'c1')

    expect(result.error).toBe('user not found')
  })
})

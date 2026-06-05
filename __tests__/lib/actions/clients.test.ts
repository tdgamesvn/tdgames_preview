import { createClient, updateClient, deleteClient } from '@/lib/actions/clients'

const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()
const mockFrom = jest.fn()
const mockEq = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}))

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

beforeEach(() => {
  jest.clearAllMocks()
  const chain = {
    select: jest.fn().mockReturnThis(),
    single: jest
      .fn()
      .mockResolvedValue({
        data: { id: 'c1', name: 'Test', slug: 'test' },
        error: null,
      }),
    eq: jest.fn().mockReturnThis(),
    error: null,
  }
  mockInsert.mockReturnValue(chain)
  mockUpdate.mockReturnValue(chain)
  mockEq.mockReturnValue(chain)
  mockDelete.mockReturnValue(chain)
  mockFrom.mockReturnValue({
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  })
})

describe('createClient', () => {
  it('calls Supabase insert with correct data', async () => {
    const result = await createClient({ name: 'Acme', slug: 'acme' })
    expect(mockFrom).toHaveBeenCalledWith('Prv_clients')
    expect(mockInsert).toHaveBeenCalledWith({
      name: 'Acme',
      slug: 'acme',
      logo_url: null,
    })
    expect(result.error).toBeNull()
    expect(result.data).toEqual({ id: 'c1', name: 'Test', slug: 'test' })
  })

  it('returns error when insert fails', async () => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      single: jest
        .fn()
        .mockResolvedValue({
          data: null,
          error: { message: 'duplicate slug' },
        }),
    }
    mockInsert.mockReturnValue(chain)
    const result = await createClient({ name: 'Acme', slug: 'acme' })
    expect(result.error).toBe('duplicate slug')
  })

  it('passes logo_url when provided', async () => {
    await createClient({ name: 'Acme', slug: 'acme', logo_url: 'https://example.com/logo.png' })
    expect(mockInsert).toHaveBeenCalledWith({
      name: 'Acme',
      slug: 'acme',
      logo_url: 'https://example.com/logo.png',
    })
  })
})

describe('updateClient', () => {
  it('calls Supabase update with correct data', async () => {
    const eqChain = {
      select: jest.fn().mockReturnThis(),
      single: jest
        .fn()
        .mockResolvedValue({
          data: { id: 'c1', name: 'Updated', slug: 'test' },
          error: null,
        }),
    }
    const updateChain = {
      eq: jest.fn().mockReturnValue(eqChain),
    }
    mockUpdate.mockReturnValue(updateChain)
    const result = await updateClient('c1', { name: 'Updated' })
    expect(mockFrom).toHaveBeenCalledWith('Prv_clients')
    expect(mockUpdate).toHaveBeenCalledWith({ name: 'Updated' })
    expect(updateChain.eq).toHaveBeenCalledWith('id', 'c1')
    expect(result.error).toBeNull()
  })

  it('returns error when update fails', async () => {
    const eqChain = {
      select: jest.fn().mockReturnThis(),
      single: jest
        .fn()
        .mockResolvedValue({
          data: null,
          error: { message: 'not found' },
        }),
    }
    const updateChain = {
      eq: jest.fn().mockReturnValue(eqChain),
    }
    mockUpdate.mockReturnValue(updateChain)
    const result = await updateClient('c1', { name: 'Updated' })
    expect(result.error).toBe('not found')
  })
})

describe('deleteClient', () => {
  it('calls Supabase delete with client id', async () => {
    const deleteChain = {
      eq: jest.fn().mockResolvedValue({ error: null }),
    }
    mockDelete.mockReturnValue(deleteChain)
    const result = await deleteClient('c1')
    expect(deleteChain.eq).toHaveBeenCalledWith('id', 'c1')
    expect(result.error).toBeNull()
  })

  it('returns error when delete fails', async () => {
    const deleteChain = {
      eq: jest
        .fn()
        .mockResolvedValue({ error: { message: 'delete failed' } }),
    }
    mockDelete.mockReturnValue(deleteChain)
    const result = await deleteClient('c1')
    expect(result.error).toBe('delete failed')
  })
})

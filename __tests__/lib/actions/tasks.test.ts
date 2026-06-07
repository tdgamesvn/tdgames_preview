/**
 * @jest-environment node
 */
import { updateTaskAvatar } from '@/lib/actions/tasks'

const mockUpdate = jest.fn()
const mockEq     = jest.fn()
const mockFrom   = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    from: mockFrom,
  })),
}))

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

beforeEach(() => {
  jest.clearAllMocks()
})

function makeUpdateChain(error: unknown = null) {
  const chain = {
    eq: jest.fn().mockReturnThis(),
    // Final .eq() resolves to { error }
  }
  // last .eq() call returns the settled promise
  chain.eq.mockImplementation(() => {
    // Keep track of call count; return the promise on the second .eq
    const c = chain.eq.mock.calls.length
    if (c >= 2) return Promise.resolve({ error })
    return chain
  })
  mockUpdate.mockReturnValue(chain)
  mockEq.mockReturnValue(chain)
  return chain
}

describe('updateTaskAvatar', () => {
  const BASE = {
    task_id: 't1',
    project_id: 'p1',
    client_id: 'c1',
    avatar_asset_id: 'a1',
    avatar_animation: 'idle',
    avatar_scale: 1.5,
    avatar_offset_x: 10,
    avatar_offset_y: -5,
  }

  it('updates avatar fields and returns empty object on success', async () => {
    makeUpdateChain(null)
    mockFrom.mockReturnValue({ update: mockUpdate })

    const result = await updateTaskAvatar(BASE)

    expect(mockFrom).toHaveBeenCalledWith('Prv_tasks')
    expect(mockUpdate).toHaveBeenCalledWith({
      avatar_asset_id: 'a1',
      avatar_animation: 'idle',
      avatar_skin: null,
      avatar_bg: null,
      avatar_scale: 1.5,
      avatar_offset_x: 10,
      avatar_offset_y: -5,
    })
    expect(result).toEqual({})
    expect(result.error).toBeUndefined()
  })

  it('returns error message when Supabase update fails', async () => {
    makeUpdateChain({ message: 'record not found' })
    mockFrom.mockReturnValue({ update: mockUpdate })

    const result = await updateTaskAvatar(BASE)

    expect(result.error).toBe('record not found')
  })

  it('clears avatar when null values are passed', async () => {
    makeUpdateChain(null)
    mockFrom.mockReturnValue({ update: mockUpdate })

    const result = await updateTaskAvatar({
      ...BASE,
      avatar_asset_id: null,
      avatar_animation: null,
    })

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        avatar_asset_id: null,
        avatar_animation: null,
      })
    )
    expect(result).toEqual({})
  })
})

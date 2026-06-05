import { createProject, updateProject, deleteProject } from '@/lib/actions/projects'

const mockInsert = jest.fn()
const mockUpdate = jest.fn()
const mockDelete = jest.fn()
const mockFrom = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({ from: mockFrom })),
}))

jest.mock('next/cache', () => ({ revalidatePath: jest.fn() }))

beforeEach(() => {
  jest.clearAllMocks()
})

describe('createProject', () => {
  it('inserts project with required fields', async () => {
    const fakeProject = { id: 'p1', client_id: 'c1', name: 'Hero Art', description: null, status: 'active', spine_version: null, share_enabled: false, share_token: 'tok', created_at: '' }
    const chain = { select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: fakeProject, error: null }) }
    mockInsert.mockReturnValue(chain)
    mockFrom.mockReturnValue({ insert: mockInsert })

    const result = await createProject({ client_id: 'c1', name: 'Hero Art' })
    expect(mockFrom).toHaveBeenCalledWith('Prv_projects')
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({ client_id: 'c1', name: 'Hero Art' }))
    expect(result.error).toBeNull()
    expect(result.data?.name).toBe('Hero Art')
  })

  it('returns error on failure', async () => {
    const chain = { select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: { message: 'FK violation' } }) }
    mockInsert.mockReturnValue(chain)
    mockFrom.mockReturnValue({ insert: mockInsert })
    const result = await createProject({ client_id: 'bad', name: 'X' })
    expect(result.error).toBe('FK violation')
  })
})

describe('updateProject', () => {
  it('updates project settings', async () => {
    const fakeProject = { id: 'p1', name: 'Hero Art', spine_version: '4.2', share_enabled: true }
    const chain = { eq: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: fakeProject, error: null }) }
    mockUpdate.mockReturnValue(chain)
    mockFrom.mockReturnValue({ update: mockUpdate })
    const result = await updateProject('p1', { spine_version: '4.2', share_enabled: true })
    expect(mockUpdate).toHaveBeenCalledWith({ spine_version: '4.2', share_enabled: true })
    expect(result.error).toBeNull()
    expect(result.data?.id).toBe('p1')
  })
})

describe('deleteProject', () => {
  it('deletes project by id', async () => {
    const eqFn = jest.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ delete: jest.fn().mockReturnValue({ eq: eqFn }) })
    const result = await deleteProject('p1', 'c1')
    expect(eqFn).toHaveBeenCalledWith('id', 'p1')
    expect(result.error).toBeNull()
  })
})

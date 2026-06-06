/**
 * @jest-environment node
 */
import { GET, POST } from '@/app/api/projects/[id]/comments/route'
import { NextRequest } from 'next/server'

const mockAnonFrom = jest.fn()
const mockAdminFrom = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    },
    from: mockAnonFrom,
  })),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({ from: mockAdminFrom })),
}))

function makeReq(body?: object, method = 'GET') {
  return new NextRequest('http://localhost/api/projects/p1/comments', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  const { createClient } = require('@/lib/supabase/server')
  createClient.mockReturnValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
    from: mockAnonFrom,
  })
})

describe('GET /api/projects/[id]/comments', () => {
  it('returns comments list', async () => {
    const fakeComments = [{ id: 'c1', content: 'Looks great!', author_id: 'u1', created_at: '' }]
    mockAnonFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: fakeComments, error: null }),
    })
    // Author display names are resolved separately via the admin client
    mockAdminFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      in: jest.fn().mockResolvedValue({
        data: [{ id: 'u1', display_name: 'Alice' }],
        error: null,
      }),
    })
    const res = await GET(makeReq(), { params: { id: 'p1' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveLength(1)
    expect(json[0].content).toBe('Looks great!')
    expect(json[0].Prv_profiles.display_name).toBe('Alice')
  })

  it('returns 401 when not authenticated', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockReturnValueOnce({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      from: jest.fn(),
    })
    const res = await GET(makeReq(), { params: { id: 'p1' } })
    expect(res.status).toBe(401)
  })
})

describe('POST /api/projects/[id]/comments', () => {
  it('creates comment and returns 201', async () => {
    const fakeComment = { id: 'c2', content: 'Nice work!', author_id: 'u1', project_id: 'p1', asset_id: null, created_at: '' }
    mockAdminFrom.mockReturnValue({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: fakeComment, error: null }),
      }),
    })
    const res = await POST(makeReq({ content: 'Nice work!' }, 'POST'), { params: { id: 'p1' } })
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.content).toBe('Nice work!')
  })

  it('returns 400 when content missing', async () => {
    const res = await POST(makeReq({}, 'POST'), { params: { id: 'p1' } })
    expect(res.status).toBe(400)
  })
})

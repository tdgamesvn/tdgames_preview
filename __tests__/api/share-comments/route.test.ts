/**
 * @jest-environment node
 */
import { GET } from '@/app/api/share-comments/[token]/route'
import { NextRequest } from 'next/server'

const mockAdminFrom = jest.fn()
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({ from: mockAdminFrom })),
}))

function makeReq(token: string) {
  return new NextRequest(`http://localhost/api/share-comments/${token}`)
}

function makeProjectChain(project: object | null) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: project }),
  }
}

function makeCommentsChain(comments: object[] | null, error?: object) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: comments, error: error ?? null }),
  }
}

function makeProfilesChain(profiles: object[]) {
  return {
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockResolvedValue({ data: profiles }),
  }
}

beforeEach(() => jest.clearAllMocks())

it('returns 404 when share token is invalid', async () => {
  mockAdminFrom.mockReturnValueOnce(makeProjectChain(null))
  const res = await GET(makeReq('bad-token'), { params: { token: 'bad-token' } })
  expect(res.status).toBe(404)
})

it('returns 404 when share_enabled is false (no project match)', async () => {
  mockAdminFrom.mockReturnValueOnce(makeProjectChain(null))
  const res = await GET(makeReq('disabled-token'), { params: { token: 'disabled-token' } })
  expect(res.status).toBe(404)
})

it('returns empty array when project has no comments', async () => {
  mockAdminFrom
    .mockReturnValueOnce(makeProjectChain({ id: 'proj1' }))
    .mockReturnValueOnce(makeCommentsChain([]))
  const res = await GET(makeReq('valid-token'), { params: { token: 'valid-token' } })
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json).toHaveLength(0)
})

it('returns comments with display names resolved', async () => {
  const fakeComments = [
    { id: 'c1', content: 'Looks great!', author_id: 'u1', asset_id: null, created_at: '' },
  ]
  mockAdminFrom
    .mockReturnValueOnce(makeProjectChain({ id: 'proj1' }))
    .mockReturnValueOnce(makeCommentsChain(fakeComments))
    .mockReturnValueOnce(makeProfilesChain([{ id: 'u1', display_name: 'Alice' }]))
  const res = await GET(makeReq('valid-token'), { params: { token: 'valid-token' } })
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json).toHaveLength(1)
  expect(json[0].content).toBe('Looks great!')
  expect(json[0].Prv_profiles.display_name).toBe('Alice')
})

it('falls back to Unknown when author has no display_name', async () => {
  const fakeComments = [
    { id: 'c2', content: 'Hi', author_id: 'u2', asset_id: null, created_at: '' },
  ]
  mockAdminFrom
    .mockReturnValueOnce(makeProjectChain({ id: 'proj1' }))
    .mockReturnValueOnce(makeCommentsChain(fakeComments))
    .mockReturnValueOnce(makeProfilesChain([{ id: 'u2', display_name: null }]))
  const res = await GET(makeReq('tok'), { params: { token: 'tok' } })
  expect(res.status).toBe(200)
  const json = await res.json()
  expect(json[0].Prv_profiles.display_name).toBe('Unknown')
})

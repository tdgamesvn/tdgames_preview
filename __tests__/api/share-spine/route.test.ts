/**
 * @jest-environment node
 */
import { GET } from '@/app/api/share-spine/[token]/[taskId]/[name]/route'
import { NextRequest } from 'next/server'

const mockAdminFrom = jest.fn()
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({ from: mockAdminFrom })),
}))

jest.mock('@/lib/r2', () => ({
  getR2Object: jest.fn(),
}))
// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockGetR2Object = require('@/lib/r2').getR2Object as jest.Mock

function makeRequest(token: string, taskId: string, name: string) {
  return new NextRequest(
    `http://localhost/api/share-spine/${token}/${taskId}/${encodeURIComponent(name)}`
  )
}

function makeParams(token: string, taskId: string, name: string) {
  return { params: { token, taskId, name: encodeURIComponent(name) } }
}

function makeProjectChain(project: object | null) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: project, error: project ? null : { message: 'not found' } }),
  }
}

function makeAssetChain(asset: object | null) {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn().mockResolvedValue({ data: asset, error: null }),
  }
}

beforeEach(() => jest.clearAllMocks())

it('returns 404 when share token is invalid', async () => {
  mockAdminFrom.mockReturnValueOnce(makeProjectChain(null))
  const res = await GET(
    makeRequest('bad-token', 'task1', 'char.json'),
    makeParams('bad-token', 'task1', 'char.json')
  )
  expect(res.status).toBe(404)
})

it('returns 404 when share_enabled is false', async () => {
  // share_enabled=false → the eq chain returns null (no match)
  mockAdminFrom.mockReturnValueOnce(makeProjectChain(null))
  const res = await GET(
    makeRequest('tok', 'task1', 'char.json'),
    makeParams('tok', 'task1', 'char.json')
  )
  expect(res.status).toBe(404)
})

it('returns 404 when asset not found', async () => {
  mockAdminFrom
    .mockReturnValueOnce(makeProjectChain({ id: 'proj1', share_token: 'tok', share_enabled: true }))
    .mockReturnValueOnce(makeAssetChain(null))
  const res = await GET(
    makeRequest('tok', 'task1', 'missing.json'),
    makeParams('tok', 'task1', 'missing.json')
  )
  expect(res.status).toBe(404)
})

it('returns 404 when taskId belongs to a different project', async () => {
  // project.id is 'proj1', but asset query returns null because project_id filter fails
  mockAdminFrom
    .mockReturnValueOnce(makeProjectChain({ id: 'proj1', share_token: 'tok', share_enabled: true }))
    .mockReturnValueOnce(makeAssetChain(null)) // null = project_id mismatch → not found
  const res = await GET(
    makeRequest('tok', 'task-from-other-project', 'char.json'),
    makeParams('tok', 'task-from-other-project', 'char.json')
  )
  expect(res.status).toBe(404)
})

it('streams R2 object when token and asset are valid', async () => {
  mockAdminFrom
    .mockReturnValueOnce(makeProjectChain({ id: 'proj1', share_token: 'tok', share_enabled: true }))
    .mockReturnValueOnce(makeAssetChain({ r2_key: 'uploads/abc123/char.json', name: 'char.json' }))
  mockGetR2Object.mockResolvedValue({
    body: 'stream-body',
    contentType: 'application/json',
    contentLength: 42,
  })

  const res = await GET(
    makeRequest('tok', 'task1', 'char.json'),
    makeParams('tok', 'task1', 'char.json')
  )
  expect(res.status).toBe(200)
  expect(res.headers.get('Content-Type')).toBe('application/json')
})

it('returns 304 when ETag matches', async () => {
  const r2Key = 'uploads/abc123/char.json'
  const etag = `"${r2Key.slice(0, 24)}"`
  mockAdminFrom
    .mockReturnValueOnce(makeProjectChain({ id: 'proj1', share_token: 'tok', share_enabled: true }))
    .mockReturnValueOnce(makeAssetChain({ r2_key: r2Key, name: 'char.json' }))

  const req = new NextRequest('http://localhost/api/share-spine/tok/task1/char.json', {
    headers: { 'if-none-match': etag },
  })
  const res = await GET(req, makeParams('tok', 'task1', 'char.json'))
  expect(res.status).toBe(304)
})

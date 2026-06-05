/**
 * @jest-environment node
 */
import { POST } from '@/app/api/assets/route'
import { DELETE } from '@/app/api/assets/[id]/route'
import { NextRequest } from 'next/server'

// Mock admin client (used for DB writes)
const mockInsert = jest.fn()
const mockAdminFrom = jest.fn()
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({ from: mockAdminFrom })),
}))

// Mock anon client (used for auth check)
const mockAnonFrom = jest.fn()
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'u1' } },
        error: null,
      }),
    },
    from: mockAnonFrom,
  })),
}))

jest.mock('@/lib/r2', () => ({
  deleteR2Object: jest.fn().mockResolvedValue(undefined),
}))

function makeAuthChain() {
  return {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { role: 'internal' }, error: null }),
  }
}

function makeRequest(body: object, method = 'POST') {
  return new NextRequest('http://localhost/api/assets', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockAnonFrom.mockReturnValue(makeAuthChain())

  // Always reset createClient to an authenticated internal user
  // (individual tests can override via mockReturnValueOnce)
  const { createClient } = require('@/lib/supabase/server')
  createClient.mockReturnValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'u1' } },
        error: null,
      }),
    },
    from: mockAnonFrom,
  })
})

// ─── POST /api/assets ─────────────────────────────────────────────────────────

describe('POST /api/assets', () => {
  it('saves asset record and returns 201', async () => {
    const fakeAsset = {
      id: 'a1',
      project_id: 'p1',
      service_type: 'art',
      name: 'hero.png',
      r2_key: 'assets/a1.png',
      file_type: 'png',
      metadata: {},
      sort_order: 0,
      created_at: '',
    }
    const chain = {
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: fakeAsset, error: null }),
    }
    mockInsert.mockReturnValue(chain)
    mockAdminFrom.mockReturnValue({ insert: mockInsert })

    const req = makeRequest({
      project_id: 'p1',
      service_type: 'art',
      name: 'hero.png',
      r2_key: 'assets/a1.png',
      file_type: 'png',
    })
    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.id).toBe('a1')
  })

  it('returns 400 when required fields are missing', async () => {
    const req = makeRequest({ project_id: 'p1' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockReturnValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
      from: jest.fn(),
    })
    const req = makeRequest({ project_id: 'p1', service_type: 'art', name: 'x.png', r2_key: 'k', file_type: 'png' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})

// ─── DELETE /api/assets/[id] ──────────────────────────────────────────────────

describe('DELETE /api/assets/[id]', () => {
  it('deletes asset from DB and R2, returns 200', async () => {
    const fakeAsset = { id: 'a1', r2_key: 'assets/a1.png' }
    mockAdminFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: fakeAsset, error: null }),
      delete: jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      }),
    })

    const req = new NextRequest('http://localhost/api/assets/a1', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: 'a1' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.success).toBe(true)
  })

  it('returns 404 when asset not found', async () => {
    mockAdminFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    })

    const req = new NextRequest('http://localhost/api/assets/bad', { method: 'DELETE' })
    const res = await DELETE(req, { params: { id: 'bad' } })
    expect(res.status).toBe(404)
  })
})

/**
 * @jest-environment node
 */
import { POST, DELETE } from '@/app/api/projects/[id]/cover/route'
import { NextRequest } from 'next/server'

const mockAnonFrom = jest.fn()
const mockAdminFrom = jest.fn()
const mockS3Send = jest.fn()

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({ from: mockAdminFrom })),
}))

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockS3Send })),
  PutObjectCommand: jest.fn(),
}))

function makeInternalClient() {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    },
    from: mockAnonFrom,
  }
}

function makeAnonClient() {
  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: jest.fn(),
  }
}

function makeFormDataReq(withFile = true) {
  const fd = new FormData()
  if (withFile) {
    fd.append('file', new File(['imgdata'], 'cover.jpg', { type: 'image/jpeg' }))
  }
  return new NextRequest('http://localhost/api/projects/p1/cover', {
    method: 'POST',
    body: fd,
  })
}

function makeDeleteReq() {
  return new NextRequest('http://localhost/api/projects/p1/cover', { method: 'DELETE' })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockS3Send.mockResolvedValue({})

  const { createClient } = require('@/lib/supabase/server')
  createClient.mockResolvedValue(makeInternalClient())

  // Default: internal role
  mockAnonFrom.mockReturnValue({
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { role: 'internal' }, error: null }),
  })

  // Default: admin update succeeds
  mockAdminFrom.mockReturnValue({
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockResolvedValue({ error: null }),
  })
})

describe('POST /api/projects/[id]/cover', () => {
  it('returns 200 with r2_key when internal user uploads a file', async () => {
    const res = await POST(makeFormDataReq(), { params: { id: 'p1' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.r2_key).toMatch(/^covers\/p1\/\d+-cover\.jpg$/)
  })

  it('returns 403 when user has client role', async () => {
    mockAnonFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'client' }, error: null }),
    })
    const res = await POST(makeFormDataReq(), { params: { id: 'p1' } })
    expect(res.status).toBe(403)
  })

  it('returns 400 when no file is provided', async () => {
    const res = await POST(makeFormDataReq(false), { params: { id: 'p1' } })
    expect(res.status).toBe(400)
  })

  it('returns 401 when not authenticated', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockResolvedValueOnce(makeAnonClient())
    const res = await POST(makeFormDataReq(), { params: { id: 'p1' } })
    expect(res.status).toBe(401)
  })
})

describe('DELETE /api/projects/[id]/cover', () => {
  it('returns 200 with ok:true when cover removed by internal user', async () => {
    const res = await DELETE(makeDeleteReq(), { params: { id: 'p1' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
  })

  it('returns 403 when user has client role', async () => {
    mockAnonFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'client' }, error: null }),
    })
    const res = await DELETE(makeDeleteReq(), { params: { id: 'p1' } })
    expect(res.status).toBe(403)
  })
})

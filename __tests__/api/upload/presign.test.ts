/**
 * @jest-environment node
 */
import { POST } from '@/app/api/upload/presign/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/r2', () => ({
  getPresignedPutUrl: jest.fn().mockResolvedValue('https://r2.example.com/presigned'),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'internal' }, error: null }),
    }),
  })),
}))

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/upload/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/upload/presign', () => {
  it('returns presigned URL for valid internal user', async () => {
    const req = makeRequest({ key: 'assets/abc.png', contentType: 'image/png' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.url).toBe('https://r2.example.com/presigned')
  })

  it('returns 400 when key or contentType missing', async () => {
    const req = makeRequest({ key: 'assets/abc.png' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 403 when user is not internal', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u2' } }, error: null }) },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: { role: 'client' }, error: null }),
      }),
    })
    const req = makeRequest({ key: 'assets/abc.png', contentType: 'image/png' })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })

  it('returns 401 when not authenticated', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
      from: jest.fn(),
    })
    const req = makeRequest({ key: 'assets/abc.png', contentType: 'image/png' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})

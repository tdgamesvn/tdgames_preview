/**
 * @jest-environment node
 */
import { GET } from '@/app/api/assets/[id]/download/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/r2', () => ({
  getPresignedGetUrl: jest.fn().mockResolvedValue('https://r2.example.com/signed-download'),
}))

jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { id: 'a1', r2_key: 'assets/a1.png', name: 'hero.png', file_type: 'png' },
        error: null,
      }),
    }),
  })),
}))

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    },
  })),
}))

function makeReq() {
  return new NextRequest('http://localhost/api/assets/a1/download', { method: 'GET' })
}

describe('GET /api/assets/[id]/download', () => {
  it('returns presigned URL for authenticated user', async () => {
    const res = await GET(makeReq(), { params: { id: 'a1' } })
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.url).toBe('https://r2.example.com/signed-download')
    expect(json.filename).toBe('hero.png')
  })

  it('returns 401 when not authenticated', async () => {
    const { createClient } = require('@/lib/supabase/server')
    createClient.mockReturnValueOnce({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }) },
    })
    const res = await GET(makeReq(), { params: { id: 'a1' } })
    expect(res.status).toBe(401)
  })

  it('returns 404 when asset not found', async () => {
    const { createAdminClient } = require('@/lib/supabase/admin')
    createAdminClient.mockReturnValueOnce({
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
      }),
    })
    const res = await GET(makeReq(), { params: { id: 'bad' } })
    expect(res.status).toBe(404)
  })
})

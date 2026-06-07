/**
 * @jest-environment node
 */
import { POST } from '@/app/api/upload/route'
import { NextRequest } from 'next/server'

// ── R2 mock ─────────────────────────────────────────────────────────────────
const mockSend = jest.fn().mockResolvedValue({})
jest.mock('@aws-sdk/client-s3', () => {
  const original = jest.requireActual('@aws-sdk/client-s3')
  return {
    ...original,
    S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
    PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
    DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  }
})

// ── Supabase auth mock (internal user) ──────────────────────────────────────
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: { id: 'u1' } }, error: null }),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { role: 'internal' }, error: null }),
    }),
  })),
}))

// ── Supabase admin mock ──────────────────────────────────────────────────────
const mockAdminUpdate = jest.fn().mockReturnValue({
  eq: jest.fn().mockReturnValue({
    select: jest.fn().mockReturnValue({
      single: jest.fn().mockResolvedValue({
        data: { id: 'asset-old', r2_key: 'assets/p1/new.png', name: 'hero.png', file_type: 'png' },
        error: null,
      }),
    }),
  }),
})
const mockAdminInsert = jest.fn().mockReturnValue({
  select: jest.fn().mockReturnValue({
    single: jest.fn().mockResolvedValue({
      data: { id: 'asset-new', r2_key: 'assets/p1/1234-hero.png' },
      error: null,
    }),
  }),
})
jest.mock('@/lib/supabase/admin', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn().mockReturnValue({
      insert: mockAdminInsert,
      update: mockAdminUpdate,
    }),
  })),
}))

// ── helpers ──────────────────────────────────────────────────────────────────
function makeFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  fd.append('file', new File(['pixel'], 'hero.png', { type: 'image/png' }))
  fd.append('project_id',   'p1')
  fd.append('service_type', 'art')
  fd.append('r2_key',       'assets/p1/1234-hero.png')
  fd.append('name',         'hero.png')
  fd.append('file_type',    'png')
  fd.append('task_id',      'null')
  Object.entries(overrides).forEach(([k, v]) => fd.set(k, v))
  return fd
}

function makeRequest(fd: FormData) {
  return new NextRequest('http://localhost/api/upload', { method: 'POST', body: fd })
}

// ── tests ────────────────────────────────────────────────────────────────────
describe('POST /api/upload — replace mode', () => {
  beforeEach(() => {
    mockSend.mockResolvedValue({})
    jest.clearAllMocks()
    mockSend.mockResolvedValue({})
    mockAdminUpdate.mockReturnValue({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: 'asset-old', r2_key: 'assets/p1/new.png' },
            error: null,
          }),
        }),
      }),
    })
    mockAdminInsert.mockReturnValue({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({
          data: { id: 'asset-new', r2_key: 'assets/p1/1234-hero.png' },
          error: null,
        }),
      }),
    })
  })

  it('updates existing asset row and deletes old R2 object when replace_asset_id supplied', async () => {
    const fd = makeFormData({
      replace_asset_id: 'asset-old',
      old_r2_key:       'assets/p1/old-hero.png',
    })
    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.asset.id).toBe('asset-old')

    // should have called R2 delete with old key
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3')
    expect(DeleteObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({ Key: 'assets/p1/old-hero.png' }),
    )
  })

  it('uses INSERT (not UPDATE) when replace_asset_id is absent', async () => {
    const fd = makeFormData()
    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(200)
    expect(mockAdminInsert).toHaveBeenCalled()
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3')
    expect(DeleteObjectCommand).not.toHaveBeenCalled()
  })

  it('returns 500 and skips R2 delete when DB update fails', async () => {
    mockAdminUpdate.mockReturnValueOnce({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } }),
        }),
      }),
    })
    const fd = makeFormData({
      replace_asset_id: 'asset-old',
      old_r2_key:       'assets/p1/old-hero.png',
    })
    const res = await POST(makeRequest(fd))
    expect(res.status).toBe(500)
    const { DeleteObjectCommand } = require('@aws-sdk/client-s3')
    expect(DeleteObjectCommand).not.toHaveBeenCalled()
  })
})

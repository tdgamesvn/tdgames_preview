// __tests__/components/asset-grid-client.test.tsx
import { render, screen } from '@testing-library/react'
import { AssetGridClient } from '@/components/dashboard/asset-grid-client'
import type { PrvAsset } from '@/lib/types/database'

// Mock SpineAnimationGallery (canvas/WebGL not available in jsdom)
jest.mock('@/components/dashboard/spine-animation-gallery', () => ({
  SpineAnimationGallery: () => <div data-testid="spine-gallery">SpineGallery</div>,
}))

jest.mock('@/components/preview/asset-viewer-modal', () => ({
  AssetViewerModal: () => <div data-testid="asset-modal">Modal</div>,
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}))

const makeAsset = (overrides: Partial<PrvAsset> = {}): PrvAsset => ({
  id: 'asset-1',
  project_id: 'proj-1',
  task_id: 'task-1',
  service_type: 'animation',
  name: 'hero.json',
  r2_key: 'anim/hero.json',
  file_type: 'json',
  metadata: {},
  sort_order: 0,
  created_at: '2026-01-01',
  ...overrides,
})

describe('AssetGridClient — animation tab', () => {
  it('renders SpineAnimationGallery for animation assets with a json file', () => {
    render(
      <AssetGridClient
        assets={[makeAsset()]}
        serviceType="animation"
        spineVersion="4.1"
        projectId="proj-1"
      />
    )
    expect(screen.getByTestId('spine-gallery')).toBeInTheDocument()
  })

  it('shows all source file names in animation tab', () => {
    const assets = [
      makeAsset({ name: 'hero.json', file_type: 'json' }),
      makeAsset({ id: 'asset-2', name: 'hero.atlas', file_type: 'atlas' }),
    ]
    render(
      <AssetGridClient
        assets={assets}
        serviceType="animation"
        spineVersion="4.1"
        projectId="proj-1"
      />
    )
    expect(screen.getByText('hero.json')).toBeInTheDocument()
    expect(screen.getByText('hero.atlas')).toBeInTheDocument()
  })
})

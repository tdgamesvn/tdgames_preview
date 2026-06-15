// __tests__/components/project-settings-form.test.tsx
import { render, screen } from '@testing-library/react'
import { ProjectSettingsForm } from '@/components/dashboard/project-settings-form'
import type { PrvProject } from '@/lib/types/database'

jest.mock('@/lib/actions/projects', () => ({
  updateProject: jest.fn().mockResolvedValue({ data: null, error: null }),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn() }),
}))

const makeProject = (overrides: Partial<PrvProject> = {}): PrvProject => ({
  id: 'proj-1',
  client_id: 'client-1',
  name: 'Test Project',
  description: null,
  status: 'active',
  spine_version: null,
  share_enabled: false,
  share_token: null,
  card_bg_type: 'color',
  card_bg_value: '#3a3a3aff',
  allow_download: true,
  allow_comments: true,
  default_skin: null,
  created_at: '2026-01-01',
  ...overrides,
})

describe('ProjectSettingsForm — Default Skin (Change 2)', () => {
  it('renders Default Skin text input', () => {
    render(<ProjectSettingsForm project={makeProject()} />)
    expect(screen.getByLabelText(/default skin/i)).toBeInTheDocument()
  })

  it('pre-fills Default Skin input with project.default_skin value', () => {
    render(<ProjectSettingsForm project={makeProject({ default_skin: 'SkinA' })} />)
    expect(screen.getByDisplayValue('SkinA')).toBeInTheDocument()
  })

  it('shows empty Default Skin input when project.default_skin is null', () => {
    render(<ProjectSettingsForm project={makeProject({ default_skin: null })} />)
    const input = screen.getByLabelText(/default skin/i) as HTMLInputElement
    expect(input.value).toBe('')
  })
})

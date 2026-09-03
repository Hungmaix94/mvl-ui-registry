import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { describe, expect, it, vi } from 'vitest'
import ProjectFilterForm from './ProjectFilterForm'

vi.mock('@/lib/firebase', () => ({
  app: {},
  analytics: {},
  messaging: {},
  getFCMToken: vi.fn().mockResolvedValue('mock-token'),
}))
vi.mock('firebase/app', () => ({ initializeApp: vi.fn() }))
vi.mock('firebase/analytics', () => ({ getAnalytics: vi.fn() }))
vi.mock('firebase/messaging', () => ({ getMessaging: vi.fn(), getToken: vi.fn() }))

// Mock ResizeObserver for jsdom
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

vi.mock('@/hooks/useEmployeeSelect', () => ({
  useEmployeeSelect: () => ({
    loadEmployeeOptions: vi.fn(),
    loadInitialEmployeeOptions: vi.fn(),
  }),
}))

vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({
    keysMapOptions: new Map(),
  }),
}))

vi.mock('@/services/realestate-service', () => ({
  getRealEstateService: () => ({
    getInvestorDropdown: vi.fn().mockResolvedValue({ results: [] }),
  }),
}))

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('ProjectFilterForm', () => {
  it('renders filter fields including project_secretary and project_director', () => {
    const { getByText } = renderWithProviders(<ProjectFilterForm isOpen={true} />)
    expect(getByText('Nhà đầu tư')).toBeInTheDocument()
    expect(getByText('Loại dự án')).toBeInTheDocument()
    expect(getByText('Loại nguồn')).toBeInTheDocument()
    expect(getByText('Trạng thái mở bán')).toBeInTheDocument()
    expect(getByText('Thư ký dự án')).toBeInTheDocument()
    expect(getByText('Giám đốc dự án')).toBeInTheDocument()
  })
})

import { describe, it, expect, vi } from 'vitest'

// Mock Firebase dependencies
vi.mock('@/lib/firebase', () => ({
  default: null,
  getFCMToken: vi.fn(),
  onMessageListener: vi.fn(),
  messaging: null,
  analytics: null,
}))
vi.mock('firebase/app', () => ({
  initializeApp: vi.fn(),
}))
vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
}))
// Mock ResizeObserver for jsdom environment
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import CommissionTransferDialog from './CommissionTransferDialog'

vi.mock('@/features/accounting/monthly-summaries/services/commission-transfer-service', () => ({
  useCommissionTransfer: () => ({ data: undefined }),
  useCommissionTransferCaps: () => ({
    data: {
      buckets: [{ bucket: 'MGMT', cap: '10000000', used: '2000000' }],
    },
  }),
  useCreateCommissionTransfer: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSetCommissionTransferTargets: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

vi.mock('@/hooks/useEmployeeSelect', () => ({
  useEmployeeSelect: () => ({
    loadEmployeeOptions: vi.fn(),
    loadInitialEmployeeOptions: vi.fn(),
  }),
}))

function renderWithProviders(ui: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>)
}

describe('CommissionTransferDialog', () => {
  it('renders correctly when open', () => {
    renderWithProviders(
      <CommissionTransferDialog
        open={true}
        onOpenChange={vi.fn()}
        year={2026}
        month={8}
        employeeId={100}
      />
    )

    expect(screen.getByText('Khấu trừ hoa hồng quản lý để thưởng')).toBeInTheDocument()
    expect(screen.getByText('Hoa hồng quản lý kỳ này')).toBeInTheDocument()
    expect(screen.getByText('Còn khấu trừ được')).toBeInTheDocument()
    expect(screen.getByText('Thêm người được thưởng')).toBeInTheDocument()
  })

  it('does not render content when closed', () => {
    renderWithProviders(
      <CommissionTransferDialog
        open={false}
        onOpenChange={vi.fn()}
        year={2026}
        month={8}
        employeeId={100}
      />
    )

    expect(screen.queryByText('Khấu trừ hoa hồng quản lý để thưởng')).not.toBeInTheDocument()
  })
})

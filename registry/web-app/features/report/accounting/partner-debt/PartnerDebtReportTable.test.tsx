import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// jsdom lacks ResizeObserver, which the Table/Sidebar layout relies on.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

// useAppConstant hits the app-constant store; stub it so the fallback partner-type
// labels are used and no network/store is required.
vi.mock('@/hooks/useAppConstant', () => ({
  default: () => ({ keysMap: new Map() }),
}))

// Imported after the mock above is registered.
import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import PartnerDebtReportTable from './PartnerDebtReportTable'

const row = {
  partner_id: 1,
  partner_type: 'INVESTOR',
  partner_name: 'Công ty ABC',
  contact: '0900000000',
  // Regen 2026-07-27: mỗi chỉ tiêu là { period, cumulative }
  receivable: { period: '12000000', cumulative: '12000000' },
  payable: { period: '0', cumulative: '0' },
  balance: { period: '12000000', cumulative: '12000000' },
}

const setup = () =>
  render(
    <SidebarProvider>
      <PartnerDebtReportTable
        data={{ year: 2026, month: 7, results: [row] }}
        isLoading={false}
        pageSize={25}
        currentPageIndex={0}
        onPaginationChange={vi.fn()}
      />
    </SidebarProvider>
  )

describe('PartnerDebtReportTable', () => {
  it('renders the metric columns', () => {
    setup()
    for (const header of ['Phải thu', 'Phải trả', 'Công nợ ròng']) {
      expect(screen.getByText(header)).toBeInTheDocument()
    }
  })

  it('renders the partner row with its fallback type label', () => {
    setup()
    expect(screen.getByText('Công ty ABC')).toBeInTheDocument()
    expect(screen.getByText('Chủ đầu tư')).toBeInTheDocument()
  })

  it('renders receivable amount', () => {
    setup()
    expect(screen.getAllByText(/12\D?000\D?000/).length).toBeGreaterThan(0)
  })
})

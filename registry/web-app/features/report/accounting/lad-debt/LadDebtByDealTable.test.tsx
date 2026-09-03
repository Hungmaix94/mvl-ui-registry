import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import LadDebtByDealTable, { type LadDebtByDealTableProps } from './LadDebtByDealTable'
import type { LadDebtReportRow } from '@/features/accounting/reports/services/report-service'
import { LadDebtRateSource } from '@/constants/api-schema-aliases'

function buildRow(overrides: Partial<LadDebtReportRow>): LadDebtReportRow {
  return {
    deal_id: 1,
    deal_code: 'HD06000001',
    project_name: 'Dự án A',
    unit_number: 'A-101',
    fee_calculation_price: '1000000000',
    rate_source: LadDebtRateSource.current_config,
    lad_batch_code: null,
    pct_agency_fee: '4.0000',
    pct_investor_bonus: null,
    pct_shared_bonus: null,
    expected_amount: '40000000',
    received_amount: '10000000',
    outstanding_amount: '30000000',
    ...overrides,
  }
}

function renderTable(props: LadDebtByDealTableProps) {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <LadDebtByDealTable {...props} />
      </SidebarProvider>
    </MemoryRouter>
  )
}

describe('LadDebtByDealTable', () => {
  it('shows an empty state when there are no rows', () => {
    renderTable({
      data: {
        rows: [],
        summary: { total_expected: '0', total_received: '0', total_outstanding: '0' },
      },
      isLoading: false,
    })
    expect(screen.getByText('Không có dữ liệu')).toBeInTheDocument()
  })

  it('renders a row with its deal code link and rate-source label', () => {
    const row = buildRow({})
    renderTable({
      data: {
        rows: [row],
        summary: {
          total_expected: '40000000',
          total_received: '10000000',
          total_outstanding: '30000000',
        },
      },
      isLoading: false,
    })

    const link = screen.getByRole('link', { name: 'HD06000001' })
    expect(link).toHaveAttribute('href', '/project-admin/contract-transaction/deal/1')
    expect(screen.getByText('Cấu hình hoa hồng hiện tại')).toBeInTheDocument()
  })

  it('labels no_basis rows so accountants can tell a deal has no config to compute from', () => {
    const row = buildRow({
      rate_source: LadDebtRateSource.no_basis,
      pct_agency_fee: null,
      expected_amount: '0',
    })
    renderTable({
      data: {
        rows: [row],
        summary: { total_expected: '0', total_received: '0', total_outstanding: '0' },
      },
      isLoading: false,
    })
    expect(screen.getByText('Chưa có căn cứ tính')).toBeInTheDocument()
  })
})

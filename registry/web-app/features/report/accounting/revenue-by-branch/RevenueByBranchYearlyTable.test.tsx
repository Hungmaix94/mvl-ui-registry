import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import RevenueByBranchYearlyTable from './RevenueByBranchYearlyTable'
import type { RevenueByBranchYearlyRow } from '@/features/accounting/reports/services/report-service'

function buildRow(overrides: Partial<RevenueByBranchYearlyRow>): RevenueByBranchYearlyRow {
  return {
    metric: 'revenue',
    bucket: 'f2_ctv',
    label: 'Doanh thu F2 + CTV ngoài',
    monthly: Array.from({ length: 12 }, () => '0'),
    total_year: '0',
    ...overrides,
  }
}

describe('RevenueByBranchYearlyTable', () => {
  it('shows a loading state', () => {
    render(<RevenueByBranchYearlyTable rows={[]} isLoading />)
    expect(screen.queryByText('Không có dữ liệu')).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no rows', () => {
    render(<RevenueByBranchYearlyTable rows={[]} isLoading={false} />)
    expect(screen.getByText('Không có dữ liệu')).toBeInTheDocument()
  })

  it('renders the month + Tổng năm header columns', () => {
    render(<RevenueByBranchYearlyTable rows={[buildRow({})]} isLoading={false} />)
    expect(screen.getByText('Diễn giải')).toBeInTheDocument()
    expect(screen.getByText('T1')).toBeInTheDocument()
    expect(screen.getByText('T12')).toBeInTheDocument()
    expect(screen.getByText('Tổng năm')).toBeInTheDocument()
  })

  it('renders each row label and its amounts', () => {
    const rows = [
      buildRow({
        metric: 'revenue',
        bucket: 'f2_ctv',
        label: 'Doanh thu F2 + CTV ngoài',
        monthly: ['0', '0', '8000000', '0', '0', '0', '3200000', '0', '0', '0', '0', '0'],
        total_year: '11200000',
      }),
      buildRow({
        metric: 'revenue',
        bucket: 'total',
        label: 'Tổng doanh thu',
        total_year: '11200000',
      }),
    ]
    render(<RevenueByBranchYearlyTable rows={rows} isLoading={false} />)

    expect(screen.getByText('Doanh thu F2 + CTV ngoài')).toBeInTheDocument()
    expect(screen.getByText('Tổng doanh thu')).toBeInTheDocument()
    expect(screen.getAllByText(/11\D?200\D?000/).length).toBeGreaterThan(0)
  })
})

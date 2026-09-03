import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import LadDebtByProjectTable, { type LadDebtByProjectTableProps } from './LadDebtByProjectTable'
import type { LadDebtProjectReportRow } from '@/features/accounting/reports/services/report-service'

function buildRow(overrides: Partial<LadDebtProjectReportRow>): LadDebtProjectReportRow {
  return {
    project_id: 1,
    project_name: 'Dự án A',
    expected_amount: '40000000',
    received_amount: '10000000',
    outstanding_amount: '30000000',
    ...overrides,
  }
}

function renderTable(props: LadDebtByProjectTableProps) {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <LadDebtByProjectTable {...props} />
      </SidebarProvider>
    </MemoryRouter>
  )
}

describe('LadDebtByProjectTable', () => {
  it('shows an empty state when there are no rows', () => {
    renderTable({ data: { rows: [] }, isLoading: false })
    expect(screen.getByText('Không có dữ liệu')).toBeInTheDocument()
  })

  it('renders a project row linked to the project detail page', () => {
    renderTable({ data: { rows: [buildRow({})] }, isLoading: false })
    const link = screen.getByRole('link', { name: 'Dự án A' })
    expect(link).toHaveAttribute('href', '/project-admin/project/management/1')
  })

  it('sums expected/received/outstanding across all rows for the summary footer (AC-6)', () => {
    const rows = [
      buildRow({
        project_id: 1,
        project_name: 'Dự án A',
        expected_amount: '40000000',
        received_amount: '10000000',
        outstanding_amount: '30000000',
      }),
      buildRow({
        project_id: 2,
        project_name: 'Dự án B',
        expected_amount: '20000000',
        received_amount: '20000000',
        outstanding_amount: '0',
      }),
    ]
    renderTable({ data: { rows }, isLoading: false })

    // Tổng expected = 60,000,000 phải xuất hiện ở dòng tổng — kiểm tra bằng regex khớp số,
    // bất kể ký tự phân tách nghìn (đúng cách RevenueByBranchYearlyTable.test.tsx đang làm).
    expect(screen.getAllByText(/60\D?000\D?000/).length).toBeGreaterThan(0)
  })
})

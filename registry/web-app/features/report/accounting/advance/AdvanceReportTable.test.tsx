import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)
vi.mock('@/lib/firebase', () => ({
  getFCMToken: vi.fn().mockResolvedValue(''),
  messaging: null,
}))
vi.mock('@/lib/ability', () => ({ useAbility: () => ({ can: () => true }) }))

import { SidebarProvider } from '@/components/ui/sidebar/sidebar'
import AdvanceReportTable from './AdvanceReportTable'
import type { AdvanceSettlementRow } from '@/features/accounting/reports/services/report-service'

function makeEmployee(id: number, code: string, fullname: string) {
  return {
    id,
    code,
    fullname,
    email: `${code}@mvl.vn`,
    branch: { id: 10, name: 'CN Hà Nội', code: 'CNHN' },
    block: { id: 20, name: 'Khối Kinh doanh', code: 'KD' },
    department: { id: 30, name: 'Phòng KD1', code: 'KD1' },
    position: { id: 1, name: 'NV', code: 'NV' },
  } as unknown as AdvanceSettlementRow['requester_employee']
}

function makeRow(overrides: Partial<AdvanceSettlementRow> = {}): AdvanceSettlementRow {
  return {
    id: 1,
    code: 'ADV-0001',
    paid_effective_date: '2026-05-01',
    requested_amount: '5000000',
    paid_amount: '5000000',
    recovered_amount: '0',
    days_outstanding: 10,
    status: 'PAID',
    recipient_lines: [],
    requester_employee: makeEmployee(1, 'NV001', 'Nguyễn Văn A'),
    deal: {
      id: 10,
      code: 'DEAL-2026-0010',
      product_inventory: {
        id: 100,
        code: 'SP-100',
        unit_number: 'A-1204',
        tower: 'Tòa A',
        status: 'sold',
      },
      project: { id: 5, code: 'DA-05', name: 'Dự án Grand Park' },
    },
    ...overrides,
  } as AdvanceSettlementRow
}

function renderTable(rows: AdvanceSettlementRow[], props: Record<string, unknown> = {}) {
  return render(
    <MemoryRouter>
      <SidebarProvider>
        <AdvanceReportTable
          data={rows}
          isLoading={false}
          pageSize={25}
          currentPageIndex={0}
          totalRecords={rows.length}
          onPaginationChange={vi.fn()}
          {...props}
        />
      </SidebarProvider>
    </MemoryRouter>
  )
}

/** Leaf header labels, left to right — the order CR 21.3 pins down. */
function headerLabels() {
  return screen
    .getAllByRole('columnheader')
    .map((header) => header.textContent?.trim().replace(/\s+/g, ' ') ?? '')
}

/** Picks a cell out of a row group by the column it belongs to. */
function cellFor(cells: HTMLElement[], columnId: string) {
  return cells.find((cell) => cell.getAttribute('data-column-id') === columnId)
}

/** `<tfoot>` exposes itself as a rowgroup; it is the one carrying the grand-total label. */
function getSummaryRowGroup() {
  return screen.getAllByRole('rowgroup').find((group) => within(group).queryByText(/TỔNG CỘNG/))
}

describe('AdvanceReportTable columns', () => {
  it('shows code and name in a single NHÂN SỰ column', () => {
    renderTable([makeRow()])

    const labels = headerLabels()
    expect(labels).toContain('NHÂN SỰ')
    expect(labels).not.toContain('MÃ NV')
    expect(labels).not.toContain('HỌ TÊN')
    expect(screen.getByText('NV001')).toBeInTheDocument()
    expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument()
  })

  it('lists every recipient when one request paid out to several people', () => {
    renderTable([
      makeRow({
        recipient_lines: [
          { id: 1, recipient_employee: makeEmployee(2, 'NV002', 'Trần Thị B') },
          { id: 2, recipient_employee: makeEmployee(3, 'NV003', 'Lê Văn C') },
        ] as unknown as AdvanceSettlementRow['recipient_lines'],
      }),
    ])

    expect(screen.getByText('NV002')).toBeInTheDocument()
    expect(screen.getByText('Trần Thị B')).toBeInTheDocument()
    expect(screen.getByText('NV003')).toBeInTheDocument()
    expect(screen.getByText('Lê Văn C')).toBeInTheDocument()
    // Recipients replace the requester as the subject of the row.
    expect(screen.queryByText('Nguyễn Văn A')).not.toBeInTheDocument()
  })

  it('shows a dash rather than a blank cell when the row carries no usable identity', () => {
    const nameless = { ...makeEmployee(4, '', ''), code: '', fullname: '' }
    renderTable([
      makeRow({ requester_employee: nameless as AdvanceSettlementRow['requester_employee'] }),
    ])

    expect(cellFor(screen.getAllByRole('cell'), 'employee')?.textContent).toBe('-')
  })

  it('puts NGÀY HOÀN TẠM ỨNG immediately after NGÀY TẠM ỨNG', () => {
    renderTable([makeRow()])

    const labels = headerLabels()
    const paidIndex = labels.indexOf('NGÀY TẠM ỨNG')
    expect(paidIndex).toBeGreaterThan(-1)
    expect(labels[paidIndex + 1]).toBe('NGÀY HOÀN TẠM ỨNG')
  })

  it('renders the settlement date once the backend supplies it', () => {
    renderTable([{ ...makeRow(), settlement_date: '2026-06-20' } as AdvanceSettlementRow])

    expect(screen.getByText('20/06/2026')).toBeInTheDocument()
  })

  it('shows the project name and links the unit number to the deal in a new tab', () => {
    renderTable([makeRow()])

    expect(screen.getByText('Dự án Grand Park')).toBeInTheDocument()
    const unitLink = screen.getByRole('link', { name: 'A-1204' })
    expect(unitLink).toHaveAttribute('target', '_blank')
    expect(unitLink.getAttribute('href')).toContain('/10')
  })

  it('falls back to the deal code when no unit number exists', () => {
    renderTable([makeRow({ deal: { id: 11, code: 'DEAL-2026-0011' } as never })])

    expect(screen.getByRole('link', { name: 'DEAL-2026-0011' })).toBeInTheDocument()
  })

  it('mutes a zero in ĐÃ THU HỒI TẠM ỨNG instead of colouring it like a link', () => {
    renderTable([makeRow({ recovered_amount: '0' })])

    expect(screen.getByText('0')).toHaveClass('text-content-dark-3')
  })

  it('marks money that was actually recovered', () => {
    renderTable([makeRow({ paid_amount: '5000000', recovered_amount: '3000000' })])

    expect(screen.getByText('3.000.000')).toHaveClass('text-data-green-default')
  })
})

/** Totals come from the backend, computed over the whole filtered set — never from the page. */
const SUMMARY = {
  total_paid: '3000000',
  total_recovered: '0',
  total_outstanding: '3000000',
  row_count: 2,
}

describe('AdvanceReportTable summary row', () => {
  it('merges the TỔNG CỘNG label into the STT cell', () => {
    renderTable([makeRow()], { summary: SUMMARY })

    const footer = getSummaryRowGroup()
    expect(footer).toBeDefined()

    const cells = within(footer as HTMLElement).getAllByRole('cell')
    const labelCell = cellFor(cells, 'employee')

    // The label owns the leading span, so STT no longer renders a cell of its own — that is
    // exactly what "merge cell Tổng cộng với cell STT" asks for.
    expect(cellFor(cells, 'stt')).toBeUndefined()
    expect(cells[0]).toBe(labelCell)
    expect(Number(labelCell?.getAttribute('colspan'))).toBeGreaterThan(1)
  })

  it('shows the backend totals, not the sum of the page on screen', () => {
    // One row visible, but the filter matched two — the total must still read the filter's.
    renderTable([makeRow({ id: 1, paid_amount: '1000000' })], { summary: SUMMARY })

    const footer = getSummaryRowGroup() as HTMLElement
    // Scoped to the column: the same figure also lands in CÒN LẠI while nothing is recovered.
    const paidTotal = cellFor(within(footer).getAllByRole('cell'), 'paid_amount')

    expect(paidTotal?.textContent).toBe('3.000.000')
    expect(within(footer).getByText(/2 bản ghi/)).toBeInTheDocument()
  })

  it('hides the summary row when the filter matched nothing', () => {
    renderTable([], {
      summary: { total_paid: '0', total_recovered: '0', total_outstanding: '0', row_count: 0 },
    })

    expect(screen.queryByText(/TỔNG CỘNG/)).not.toBeInTheDocument()
  })
})

/**
 * An advance paid out to three people with different amounts — the shape of phiếu 23, the
 * repro QA filed the bug against.
 */
function makeMultiRecipientRow(): AdvanceSettlementRow {
  return makeRow({
    id: 23,
    code: 'ADV-0023',
    paid_amount: '60000000',
    recovered_amount: '20000000',
    recipient_lines: [
      {
        id: 1,
        recipient_employee: makeEmployee(2, 'NV002', 'Trần Thị B'),
        requested_amount: '30000000',
        paid_amount: '30000000',
        recovered_amount: '10000000',
      },
      {
        id: 2,
        recipient_employee: makeEmployee(3, 'NV003', 'Lê Văn C'),
        requested_amount: '20000000',
        paid_amount: '20000000',
        recovered_amount: '0',
      },
      {
        id: 3,
        recipient_employee: makeEmployee(4, 'NV004', 'Phạm Thị D'),
        requested_amount: '10000000',
        paid_amount: '10000000',
        recovered_amount: '10000000',
      },
    ] as unknown as AdvanceSettlementRow['recipient_lines'],
  })
}

/** The `<tr>` a given piece of text sits in. */
function rowOf(text: string) {
  return screen.getByText(text).closest('tr') as HTMLElement
}

function cellTextIn(row: HTMLElement, columnId: string) {
  return cellFor(within(row).getAllByRole('cell'), columnId)?.textContent?.trim()
}

describe('AdvanceReportTable multi-recipient breakdown', () => {
  it('gives every recipient a sub-row carrying only their own money', () => {
    renderTable([makeMultiRecipientRow()])

    const first = rowOf('Trần Thị B')
    expect(cellTextIn(first, 'paid_amount')).toBe('30.000.000')
    expect(cellTextIn(first, 'recovered_amount')).toBe('10.000.000')
    expect(cellTextIn(first, 'remaining')).toBe('20.000.000')

    const second = rowOf('Lê Văn C')
    expect(cellTextIn(second, 'paid_amount')).toBe('20.000.000')
    expect(cellTextIn(second, 'recovered_amount')).toBe('0')
    expect(cellTextIn(second, 'remaining')).toBe('20.000.000')

    const third = rowOf('Phạm Thị D')
    expect(cellTextIn(third, 'paid_amount')).toBe('10.000.000')
    expect(cellTextIn(third, 'recovered_amount')).toBe('10.000.000')
    expect(cellTextIn(third, 'remaining')).toBe('0')
  })

  it('keeps the advance total on the parent row, and the parts add up to it', () => {
    renderTable([makeMultiRecipientRow()])

    const parent = rowOf('ADV-0023')
    expect(cellTextIn(parent, 'paid_amount')).toBe('60.000.000')
    expect(cellTextIn(parent, 'recovered_amount')).toBe('20.000.000')
    expect(cellTextIn(parent, 'remaining')).toBe('40.000.000')

    // 30 + 20 + 10 = 60, and 10 + 0 + 10 = 20. A breakdown that does not reconcile with the
    // advance it belongs to is the bug this report was re-opened for.
    const sum = (columnId: string) =>
      ['Trần Thị B', 'Lê Văn C', 'Phạm Thị D']
        .map((name) => Number(cellTextIn(rowOf(name), columnId)?.replace(/\./g, '')))
        .reduce((total, amount) => total + amount, 0)

    expect(sum('paid_amount')).toBe(60000000)
    expect(sum('recovered_amount')).toBe(20000000)
  })

  it('names the advance on the parent row instead of picking one person for everyone', () => {
    renderTable([makeMultiRecipientRow()])

    const parent = rowOf('ADV-0023')
    expect(within(parent).getByText('3 người nhận')).toBeInTheDocument()
    // The requester is not a recipient — naming them here is the original bug.
    expect(screen.queryByText('Nguyễn Văn A')).not.toBeInTheDocument()
  })

  it('numbers the advance, never the recipients', () => {
    renderTable([makeMultiRecipientRow()])

    expect(cellTextIn(rowOf('ADV-0023'), 'stt')).toBe('1')
    expect(cellTextIn(rowOf('Trần Thị B'), 'stt')).toBe('')
  })

  it('leaves the advance-wide columns to the parent row', () => {
    renderTable([makeMultiRecipientRow()])

    const child = rowOf('Trần Thị B')
    // Date and deal belong to the whole advance and already sit directly above; repeating the
    // settlement date per person would claim a recovery that recipient never had.
    expect(cellTextIn(child, 'paid_effective_date')).toBe('')
    expect(cellTextIn(child, 'settlement_date')).toBe('')
    expect(cellTextIn(child, 'deal')).toBe('')
  })

  it('folds the recipients away on demand and brings them back', async () => {
    const user = userEvent.setup()
    renderTable([makeMultiRecipientRow()])

    expect(screen.getByText('Trần Thị B')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: /Thu gọn 3 người nhận của phiếu ADV-0023/ })
    )
    expect(screen.queryByText('Trần Thị B')).not.toBeInTheDocument()
    // The advance itself stays on screen — folding hides the breakdown, not the row.
    expect(screen.getByText('ADV-0023')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Mở 3 người nhận của phiếu ADV-0023/ }))
    expect(screen.getByText('Trần Thị B')).toBeInTheDocument()
  })

  it('shows a single recipient inline, with no toggle to click', () => {
    renderTable([
      makeRow({
        recipient_lines: [
          {
            id: 1,
            recipient_employee: makeEmployee(2, 'NV002', 'Trần Thị B'),
            requested_amount: '5000000',
            paid_amount: '5000000',
            recovered_amount: '0',
          },
        ] as unknown as AdvanceSettlementRow['recipient_lines'],
      }),
    ])

    expect(screen.getByText('NV002')).toBeInTheDocument()
    expect(screen.getByText('Trần Thị B')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /người nhận của phiếu/ })).not.toBeInTheDocument()
    expect(screen.queryByText(/^\d+ người nhận$/)).not.toBeInTheDocument()
  })
})

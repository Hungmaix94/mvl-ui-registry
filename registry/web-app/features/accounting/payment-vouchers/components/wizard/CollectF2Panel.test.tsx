import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'

import { CollectF2Panel, type F2InvoiceRow } from './CollectF2Panel'

/** Số thật của HDIN000000214: gross 36.689.999, thuần 33.354.545 — chênh lệch là VAT đầu vào. */
const ONE_UNIT: F2InvoiceRow[] = [
  {
    id: 214,
    code: 'HDIN000000214',
    amount: 36689999,
    netAmount: 33354545,
    units: [
      {
        lineId: 324,
        unitNumber: 'A-1201',
        projectName: 'Masteri',
        lineTotalWithVat: 37155000,
        lineRemainingWithVat: 37155000,
        netAmount: 33354545,
        amountWithVat: 36689999,
      },
    ],
  },
]

/** Một hóa đơn cắt cho hai căn — grain tick (hóa đơn) khác grain đọc (căn). */
const TWO_UNITS: F2InvoiceRow[] = [
  {
    id: 214,
    code: 'HDIN000000214',
    amount: 48689999,
    netAmount: 44263636,
    units: [
      ...ONE_UNIT[0].units,
      {
        lineId: 325,
        unitNumber: 'A-1202',
        projectName: 'Masteri',
        lineTotalWithVat: 12000000,
        lineRemainingWithVat: 12000000,
        netAmount: 10909091,
        amountWithVat: 12000000,
      },
    ],
  },
]

const BASE_PROPS = {
  payeeLabel: 'VHomes',
  isCollecting: false,
  hasCollected: true,
  onCollect: () => {},
  skipped: [],
  onToggle: () => {},
  onToggleAll: () => {},
}

describe('CollectF2Panel', () => {
  it('hiện dự án, mã căn và cả hai số tiền trên hàng của căn', () => {
    render(
      <CollectF2Panel
        {...BASE_PROPS}
        rows={ONE_UNIT}
        selectedIds={[214]}
        total={36689999}
        netTotal={33354545}
      />
    )

    const row = screen.getAllByRole('row')[1]
    expect(within(row).getByText('HDIN000000214')).toBeInTheDocument()
    expect(within(row).getByText('Masteri')).toBeInTheDocument()
    expect(within(row).getByText('A-1201')).toBeInTheDocument()
    expect(within(row).getByText('33.354.545')).toBeInTheDocument()
    expect(within(row).getByText('36.689.999')).toBeInTheDocument()
  })

  it('hóa đơn nhiều căn ra nhiều hàng, ô hóa đơn và checkbox gộp dọc', () => {
    render(
      <CollectF2Panel
        {...BASE_PROPS}
        rows={TWO_UNITS}
        selectedIds={[214]}
        total={48689999}
        netTotal={44263636}
      />
    )

    const [, first, second] = screen.getAllByRole('row')
    expect(within(first).getByText('A-1201')).toBeInTheDocument()
    expect(within(second).getByText('A-1202')).toBeInTheDocument()
    // Mã hóa đơn chỉ xuất hiện MỘT lần dù có hai căn — nó là ô gộp.
    expect(screen.getAllByText('HDIN000000214')).toHaveLength(1)
    expect(within(first).getByRole('checkbox')).toBeInTheDocument()
    expect(within(second).queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('dòng tổng cộng cả hai cột tiền', () => {
    render(
      <CollectF2Panel
        {...BASE_PROPS}
        rows={ONE_UNIT}
        selectedIds={[214]}
        total={36689999}
        netTotal={33354545}
      />
    )

    const total = screen.getAllByRole('row').at(-1)!
    expect(within(total).getByText('33.354.545')).toBeInTheDocument()
    expect(within(total).getByText('36.689.999 ₫')).toBeInTheDocument()
  })

  it('bỏ tick hóa đơn thì tổng hai cột về 0, không còn số cũ treo lại', () => {
    render(
      <CollectF2Panel {...BASE_PROPS} rows={ONE_UNIT} selectedIds={[]} total={0} netTotal={0} />
    )

    const total = screen.getAllByRole('row').at(-1)!
    expect(within(total).getByText('0')).toBeInTheDocument()
    expect(within(total).getByText('0 ₫')).toBeInTheDocument()
  })
})

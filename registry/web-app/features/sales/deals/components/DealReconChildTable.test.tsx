import { describe, expect, it } from 'vitest'
import { render, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { formatCurrencyVND } from '@/utils/common'

import DealReconChildTable, { type DealReconChildRow } from './DealReconChildTable'
import type { ParentReconLike } from '../utils/deal-recon-parent'

/**
 * Guard cho ClickUp 86eyb9a4z + lỗi tổng tiền cộng nhầm phiếu đã huỷ.
 *
 * Hai hành vi bị khoá ở đây:
 *  1. Cột "Sinh từ" CHỈ hiển thị mã của phiếu cha thật. Thiếu quan hệ ⇒ "-", tuyệt đối
 *     không in lại mã dòng con (từng bịa ra bằng cách gọt hậu tố `-F2`/`-CTV`).
 *  2. Dòng có `voided_at` bị loại khỏi TỔNG — void không đổi `status` (SRS 18.5 §test-spec 16).
 */

const PARENT_CODE = 'DAAS2T-IRS1525-001'
const PARENT_SHEET_ID = 1525
const CHILD_CODE = 'DAAS2T-IRS1525-F2-001'

const PARENTS: ParentReconLike[] = [
  {
    id: 1580,
    code: PARENT_CODE,
    investor_sheet: PARENT_SHEET_ID,
    progress_from_pct: '0.00',
    progress_to_pct: '10.00',
  },
]

type Row = DealReconChildRow & { total_amount?: string }

function makeRow(overrides: Partial<Row> = {}): Row {
  return {
    id: 222,
    code: CHILD_CODE,
    status: 'draft',
    created_at: '2026-07-28T10:00:00Z',
    pct_commission: '0.40',
    progress_from_pct: '0.00',
    progress_to_pct: '10.00',
    total_amount: '2560000',
    ...overrides,
  }
}

function renderTable(rows: Row[], canLinkParent = true) {
  return render(
    <MemoryRouter>
      <DealReconChildTable
        sectionTag="B"
        title="Đối chiếu Sàn F2 (HD05)"
        subtitle="test"
        counterpartLabel="Sàn F2"
        rows={rows}
        parentReconciliations={PARENTS}
        canLinkParent={canLinkParent}
        parentDetailPath={(id) => `/investor-reconciliation/${id}`}
        getCounterpartName={() => 'Ntest-f2'}
        getFeeAmount={(row) => row.total_amount}
        getDetailPath={(row) => `/f2-reconciliation/${row.id}`}
        detailLabel="Mở →"
        renderStatus={(row) => <span>{row.status}</span>}
      />
    </MemoryRouter>
  )
}

type Rendered = ReturnType<typeof renderTable>

/** Ô "Sinh từ" = cột thứ 2 của dòng dữ liệu (bỏ dòng header ở đầu bảng). */
function parentCell(view: Rendered, rowIndex = 0) {
  const row = view.getAllByRole('row')[rowIndex + 1]
  return within(row).getAllByRole('cell')[1]
}

/** Ô "HH kỳ này" của dòng TỔNG (dòng cuối bảng). */
function totalFeeCell(view: Rendered) {
  const rows = view.getAllByRole('row')
  return within(rows[rows.length - 1]).getAllByRole('cell')[3]
}

describe('DealReconChildTable — cột "Sinh từ"', () => {
  it('BE không trả quan hệ cha: hiện "-", không link, KHÔNG in lại mã dòng con', () => {
    // Đúng response thật của deal 2896: serializer list thiếu hẳn field parent.
    const cell = parentCell(renderTable([makeRow()]))

    expect(cell.textContent).toBe('-')
    expect(within(cell).queryByRole('link')).not.toBeInTheDocument()
    expect(cell.textContent).not.toContain(CHILD_CODE)
  })

  it('có nested detail: hiện mã cha và link về BẢNG đối chiếu CĐT (investor_sheet)', () => {
    const view = renderTable([
      makeRow({
        parent_investor_reconciliation: 1580,
        parent_investor_reconciliation_detail: {
          id: 1580,
          code: PARENT_CODE,
          investor_sheet: PARENT_SHEET_ID,
        },
      }),
    ])
    const link = within(parentCell(view)).getByRole('link')

    expect(link).toHaveTextContent(PARENT_CODE)
    expect(link).toHaveAttribute('href', `/investor-reconciliation/${PARENT_SHEET_ID}`)
  })

  it('chỉ có FK, không có nested: vẫn tra được mã cha trong danh sách CĐT của deal', () => {
    // Nếu chỉ đọc nested, ô này ra "-" trong khi link vẫn dựng được — lệch nguồn dữ liệu.
    const view = renderTable([makeRow({ parent_investor_reconciliation: 1580 })])
    const link = within(parentCell(view)).getByRole('link')

    expect(link).toHaveTextContent(PARENT_CODE)
    expect(link).toHaveAttribute('href', `/investor-reconciliation/${PARENT_SHEET_ID}`)
  })

  it('thiếu quyền xem đối chiếu CĐT: hiện mã dạng text, không link', () => {
    const view = renderTable(
      [
        makeRow({
          parent_investor_reconciliation_detail: {
            id: 1580,
            code: PARENT_CODE,
            investor_sheet: PARENT_SHEET_ID,
          },
        }),
      ],
      false
    )
    const cell = parentCell(view)

    expect(cell.textContent).toBe(PARENT_CODE)
    expect(within(cell).queryByRole('link')).not.toBeInTheDocument()
  })
})

describe('DealReconChildTable — TỔNG loại phiếu đã huỷ', () => {
  it('dòng có voided_at bị loại khỏi tổng dù status vẫn là draft', () => {
    // Deal 2896: phiếu F2 bị huỷ lúc 14:08 nhưng status vẫn "draft" → trước đây vẫn được
    // cộng 2.560.000 vào "Tổng dự kiến chi Sàn F2".
    const view = renderTable([
      makeRow({ id: 1, code: 'A-001', total_amount: '1000000' }),
      makeRow({
        id: 2,
        code: 'B-001',
        total_amount: '2560000',
        voided_at: '2026-07-29T14:08:26+07:00',
      }),
    ])

    expect(totalFeeCell(view).textContent).toBe(formatCurrencyVND(1000000))
  })

  it('không có phiếu nào bị huỷ: cộng đủ mọi dòng', () => {
    const view = renderTable([
      makeRow({ id: 1, code: 'A-001', total_amount: '1000000' }),
      makeRow({ id: 2, code: 'B-001', total_amount: '2560000' }),
    ])

    expect(totalFeeCell(view).textContent).toBe(formatCurrencyVND(3560000))
  })
})

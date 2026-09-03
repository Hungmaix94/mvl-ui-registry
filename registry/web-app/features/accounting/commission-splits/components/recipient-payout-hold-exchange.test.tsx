import { render, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { type Muc6Group, RecipientPayoutTable } from './RecipientPayoutTable'

/**
 * ClickUp 86eyc1n13 — "Chia HH Thực nhận_Với line SLK_Ẩn button Giữ Hoa hồng".
 *
 * "Tạm giữ hoa hồng" là công cụ giữ tiền của NGƯỜI LÀM CÔNG (sale/CTV). Hoa hồng của Sàn F2
 * thanh toán theo hợp đồng giữa hai công ty nên không nằm trong diện tạm giữ — BE vẫn cho giữ
 * (`beneficiary_exchange` hợp lệ), nên luật này phải chặn ngay ở màn.
 *
 * Luật xét NGƯỜI NHẬN TIỀN, không xét `recipient_type` của band (BA chốt 2026-08-19):
 *  - band Sale nhưng SÀN nhận hộ  → tiền của sàn  → ẩn nút.
 *  - band F2 nhưng CTV nhận hộ    → tiền của người → VẪN còn nút (người thật, có khấu trừ TNCN).
 */

const isCommissionType = (t: string) => t === 'pct_sale_commission'

/** Một band với đúng một người nhận — đủ để dựng một dòng payee. */
const bandWith = (
  overrides: Partial<Muc6Group>,
  recipient: Record<string, unknown>
): Muc6Group => ({
  code: 'CODE',
  name: 'Tên',
  recipient_type: 'employee',
  recipient_id: 1,
  participationPct: null,
  positions: [
    {
      posIdx: 0,
      posData: {
        pct_type: 'pct_sale_commission',
        percentage: '2.00',
        recipients: [{ pct_of_parent: '100.00', amount: '10000000', ...recipient }],
        payee_holds: [],
      },
    },
  ],
  ...overrides,
})

const SALE_BAND = bandWith(
  { code: 'MVL0001', name: 'Lê Thị Uyên', recipient_type: 'employee', recipient_id: 2906 },
  { employee_id: 2906, recipient_name: 'Lê Thị Uyên' }
)

const CTV_BAND = bandWith(
  { code: 'CTV0001', name: 'Trần Văn B', recipient_type: 'collaborator', recipient_id: 11 },
  { collaborator_id: 11, recipient_name: 'Trần Văn B' }
)

const F2_BAND = bandWith(
  { code: 'F20001', name: 'Sàn Đất Vàng', recipient_type: 'exchange', recipient_id: 21 },
  { exchange_id: 21, recipient_name: 'Sàn Đất Vàng' }
)

/** Band của một sale nhưng tiền do SÀN nhận hộ — vẫn là tiền của sàn. */
const SALE_BAND_PAID_TO_F2 = bandWith(
  { code: 'MVL0002', name: 'Nguyễn Văn C', recipient_type: 'employee', recipient_id: 2907 },
  { exchange_id: 21, recipient_name: 'Sàn Đất Vàng' }
)

/**
 * Band đứng tên SÀN nhưng người nhận là một CTV "nhận hộ" — tiền của người làm công.
 * Ca thật trên sheet 163: band `F2 · Sàn T123` trả cho `Hà Bích Ngọc (nhận hộ · CTV)`,
 * dòng đó bị khấu trừ TNCN nên phải giữ được.
 */
const F2_BAND_PAID_TO_CTV = bandWith(
  { code: 'F20001', name: 'Sàn T123', recipient_type: 'exchange', recipient_id: 21 },
  { collaborator_id: 77, recipient_name: 'Hà Bích Ngọc' }
)

function renderTable(groups: Muc6Group[]) {
  const { container } = render(
    <RecipientPayoutTable
      groups={groups}
      isCommissionType={isCommissionType}
      accountOwnerByPayee={new Map()}
      canEdit
      onEditGroup={vi.fn()}
      onHoldGroup={vi.fn()}
      periodFeePct={null}
      periodBonusPct={null}
    />
  )
  return within(container)
}

/** Nút "Giữ"/"Mở giữ" nhận diện qua title — cùng bộ chữ với tooltip trong component. */
const holdButtons = (view: ReturnType<typeof renderTable>) =>
  view.queryAllByTitle(/[Tt]ạm giữ hoa hồng|Giữ thêm phần còn lại|Bỏ tạm giữ/)

describe('Mục 4 — nút Giữ hoa hồng không áp dụng cho Sàn F2', () => {
  it('band Sàn F2: KHÔNG hiện nút Giữ', () => {
    expect(holdButtons(renderTable([F2_BAND]))).toHaveLength(0)
  })

  it('band Sale: vẫn hiện nút Giữ', () => {
    expect(holdButtons(renderTable([SALE_BAND])).length).toBeGreaterThan(0)
  })

  it('band CTV: vẫn hiện nút Giữ', () => {
    expect(holdButtons(renderTable([CTV_BAND])).length).toBeGreaterThan(0)
  })

  it('band Sale nhưng người nhận là sàn (nhận hộ): KHÔNG hiện nút Giữ', () => {
    expect(holdButtons(renderTable([SALE_BAND_PAID_TO_F2]))).toHaveLength(0)
  })

  it('band Sàn F2 nhưng người nhận là CTV (nhận hộ): VẪN hiện nút Giữ', () => {
    // Luật bám người NHẬN tiền, không bám band. Gate cũ xét `recipient_type === exchange`
    // nên ẩn cả dòng này — kế toán mất đường giữ hoa hồng của một người làm công thật.
    expect(holdButtons(renderTable([F2_BAND_PAID_TO_CTV])).length).toBeGreaterThan(0)
  })

  it('bảng gộp Sale + CTV + F2: chỉ hai dòng đầu còn nút Giữ', () => {
    expect(holdButtons(renderTable([SALE_BAND, CTV_BAND, F2_BAND]))).toHaveLength(2)
  })
})

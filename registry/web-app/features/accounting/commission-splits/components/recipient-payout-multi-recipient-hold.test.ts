import { describe, it, expect } from 'vitest'
import { buildPayeeRows } from './RecipientPayoutTable'

/**
 * Bug 86eyc1cqy: "tạm giữ" > "được chia" tại Bảng chia thực nhận khi 1 share chia cho >= 2
 * người nhận. `posData.held_amount` là tổng hold ở MỨC SHARE — trước fix, FE gán toàn bộ
 * số này cho recipient đầu tiên (rIdx === 0) thay vì chia theo tỷ lệ pct_of_parent như
 * "được chia" (amount). Quyết định đã chốt: cột "tạm giữ" hiển thị phần của từng người,
 * đồng nhất với cột "được chia".
 */

const isCommissionType = (t: string) => t === 'pct_sale_commission'

// Share chia hoa hồng cho 2 người: A nhận 6,000,000 (60%) ; B nhận 4,000,000 (40%).
// Share đang held toàn bộ 10,000,000 (held_amount = tổng mức share, chưa materialize per-payee).
const twoRecipientHeldPosition = (over: Record<string, unknown> = {}) => ({
  posIdx: 0,
  posData: {
    pct_type: 'pct_sale_commission',
    percentage: '2.00',
    is_held: true,
    held_amount: '10000000',
    tax_base: 'POST_TAX',
    payee_holds: [],
    recipients: [
      {
        employee_id: 111,
        recipient_name: 'Nguyen Van A',
        pct_of_parent: '60',
        amount: '6000000',
      },
      {
        employee_id: 222,
        recipient_name: 'Tran Thi B',
        pct_of_parent: '40',
        amount: '4000000',
      },
    ],
    ...over,
  },
})

const build = (position: ReturnType<typeof twoRecipientHeldPosition>) =>
  buildPayeeRows([position], { isCommissionType, ownerType: 'employee', ownerId: 111 })

describe('buildPayeeRows — prorate share-level held_amount across recipients (bug 86eyc1cqy)', () => {
  it('splits held_amount by pct_of_parent so hold never exceeds each recipient own share', () => {
    const rows = build(twoRecipientHeldPosition())

    const rowA = rows.find((r) => r.key === 'employee-111')!
    const rowB = rows.find((r) => r.key === 'employee-222')!

    expect(rowA.fee).toBe(6000000)
    expect(rowA.hold).toBe(6000000)
    expect(rowA.hold).toBeLessThanOrEqual(rowA.fee)

    expect(rowB.fee).toBe(4000000)
    expect(rowB.hold).toBe(4000000)
    expect(rowB.hold).toBeLessThanOrEqual(rowB.fee)
  })

  it('sums the prorated parts back to the share-level held_amount exactly (no money lost to rounding)', () => {
    // 3 recipients with an uneven split that would drift under naive rounding.
    const rows = build(
      twoRecipientHeldPosition({
        held_amount: '10000000',
        recipients: [
          { employee_id: 111, recipient_name: 'A', pct_of_parent: '33.33', amount: '3333000' },
          { employee_id: 222, recipient_name: 'B', pct_of_parent: '33.33', amount: '3333000' },
          { employee_id: 333, recipient_name: 'C', pct_of_parent: '33.34', amount: '3334000' },
        ],
      })
    )

    const total = rows.reduce((sum, r) => sum + r.hold, 0)
    expect(total).toBe(10000000)
  })

  it('leaves the single-recipient case unchanged (100% share, existing behavior)', () => {
    const rows = build(
      twoRecipientHeldPosition({
        held_amount: '8600000',
        recipients: [
          {
            collaborator_id: 130,
            recipient_name: 'Nguyen Van CTV',
            pct_of_parent: '100',
            amount: '8600000',
          },
        ],
      })
    )

    expect(rows).toHaveLength(1)
    expect(rows[0].hold).toBe(8600000)
  })
})

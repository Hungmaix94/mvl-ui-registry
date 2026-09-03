import { describe, expect, it } from 'vitest'

import {
  buildParentReconIndex,
  findParentInvestorRecon,
  isVoidedRecon,
  parentInvestorReconCode,
  parentInvestorSheetId,
  resolveProgressPct,
  type ParentReconLike,
} from './deal-recon-parent'

const PARENTS: ParentReconLike[] = [
  {
    id: 99,
    code: 'DCCDT-2026-000123',
    investor_sheet: 555,
    progress_from_pct: '10.00',
    progress_to_pct: '30.00',
  },
  { id: 100, code: 'DCCDT-2026-000124', investor_sheet: 556 },
]
const INDEX = buildParentReconIndex(PARENTS)

describe('buildParentReconIndex (task 86eyb9a4z)', () => {
  it('lập chỉ mục theo id và theo mã', () => {
    expect(INDEX.byId.get(99)?.code).toBe('DCCDT-2026-000123')
    expect(INDEX.byCode.get('DCCDT-2026-000124')?.id).toBe(100)
  })

  it('bỏ qua parent không có mã (chỉ vào chỉ mục id)', () => {
    const index = buildParentReconIndex([{ id: 7, code: null, investor_sheet: 70 }])
    expect(index.byId.get(7)?.investor_sheet).toBe(70)
    expect(index.byCode.size).toBe(0)
  })
})

describe('findParentInvestorRecon (task 86eyb9a4z)', () => {
  it('khớp theo FK parent_investor_reconciliation', () => {
    const row = { code: 'DCCDT-2026-000123-F2', parent_investor_reconciliation: 99 }
    expect(findParentInvestorRecon(row, INDEX)?.id).toBe(99)
  })

  it('khớp theo mã trong parent_investor_reconciliation_detail khi FK không có trong danh sách', () => {
    const row = {
      code: 'DCCDT-2026-000124-CTV',
      parent_investor_reconciliation: 12345,
      parent_investor_reconciliation_detail: { code: 'DCCDT-2026-000124' },
    }
    expect(findParentInvestorRecon(row, INDEX)?.id).toBe(100)
  })

  it('khớp theo investor_reconciliation_code (BE cũ)', () => {
    const row = { code: 'X-F2', investor_reconciliation_code: 'DCCDT-2026-000123' }
    expect(findParentInvestorRecon(row, INDEX)?.id).toBe(99)
  })

  it('KHÔNG suy ra parent từ hậu tố mã — dòng thiếu thông tin parent thì trả undefined', () => {
    const row = { code: 'DCCDT-2026-000123-F2' }
    expect(findParentInvestorRecon(row, INDEX)).toBeUndefined()
  })

  it('trả undefined khi danh sách đối chiếu CĐT rỗng', () => {
    const emptyIndex = buildParentReconIndex([])
    expect(
      findParentInvestorRecon({ parent_investor_reconciliation: 99 }, emptyIndex)
    ).toBeUndefined()
  })
})

describe('parentInvestorSheetId (task 86eyb9a4z)', () => {
  it('trả id BẢNG đối chiếu (investor_sheet), không phải id dòng', () => {
    expect(parentInvestorSheetId({ parent_investor_reconciliation: 99 }, INDEX)).toBe(555)
  })

  it('trả null khi parent chưa có bảng', () => {
    const index = buildParentReconIndex([{ id: 99, code: 'A', investor_sheet: null }])
    expect(parentInvestorSheetId({ parent_investor_reconciliation: 99 }, index)).toBeNull()
  })

  it('trả null khi không tra được parent', () => {
    expect(parentInvestorSheetId({ code: 'A-F2' }, INDEX)).toBeNull()
  })

  it('ưu tiên investor_sheet trên nested — link không cần dòng CĐT nằm trong danh sách', () => {
    const emptyIndex = buildParentReconIndex([])
    const row = {
      code: 'DCCDT-2026-000999-F2',
      parent_investor_reconciliation: 999,
      parent_investor_reconciliation_detail: { code: 'DCCDT-2026-000999', investor_sheet: 777 },
    }
    expect(parentInvestorSheetId(row, emptyIndex)).toBe(777)
  })

  it('nested thắng danh sách khi cả hai cùng có (nested là nguồn của BE)', () => {
    const row = {
      parent_investor_reconciliation: 99,
      parent_investor_reconciliation_detail: { code: 'DCCDT-2026-000123', investor_sheet: 777 },
    }
    expect(parentInvestorSheetId(row, INDEX)).toBe(777)
  })

  it('nested thiếu investor_sheet: fallback tra trong danh sách (response cũ)', () => {
    const row = {
      parent_investor_reconciliation: 99,
      parent_investor_reconciliation_detail: { code: 'DCCDT-2026-000123' },
    }
    expect(parentInvestorSheetId(row, INDEX)).toBe(555)
  })
})

describe('parentInvestorReconCode (task 86eyb9a4z)', () => {
  it('ưu tiên mã từ parent detail', () => {
    expect(
      parentInvestorReconCode(
        {
          code: 'X-F2',
          parent_investor_reconciliation_detail: { code: 'DCCDT-2026-000123' },
        },
        INDEX
      )
    ).toBe('DCCDT-2026-000123')
  })

  it('dùng mã ở field BE cũ khi không có nested detail', () => {
    expect(
      parentInvestorReconCode(
        { code: 'X-F2', investor_reconciliation_code: 'DCCDT-2026-000123' },
        INDEX
      )
    ).toBe('DCCDT-2026-000123')
  })

  it('chỉ có FK, không có nested: lấy mã từ dòng CĐT tra được trong danh sách', () => {
    // Khớp với `parentInvestorSheetId` — dòng nào đủ dữ liệu để dựng link thì cũng phải
    // có mã để hiển thị, không được ra "-" trong khi link vẫn bấm được.
    expect(
      parentInvestorReconCode({ code: 'X-F2', parent_investor_reconciliation: 99 }, INDEX)
    ).toBe('DCCDT-2026-000123')
  })

  it('KHÔNG bịa mã cha từ mã dòng con — thiếu quan hệ thì trả null', () => {
    // Quy ước `<mã CĐT>-F2` từng được dùng để gọt ra mã cha. Đó là bịa một khoá quan hệ từ
    // quy ước đặt tên, và quy ước đã đổi: mã thật trên môi trường test là
    // `DAAS2T-IRS1525-F2-001` (cụm `-F2` nằm giữa), CTV thì không có cụm nào.
    expect(parentInvestorReconCode({ code: 'DCCDT-2026-000123-F2' }, INDEX)).toBeNull()
    expect(parentInvestorReconCode({ code: 'DCCDT-2026-000123-CTV' }, INDEX)).toBeNull()
  })

  it('không suy ra mã cha từ mã con dạng thật của BE (deal 2896)', () => {
    // Serializer list của BE không trả field parent → cột "Sinh từ" phải hiện "-",
    // không được in lại mã dòng con như thể đó là mã cha.
    expect(parentInvestorReconCode({ code: 'DAAS2T-IRS1525-F2-001' }, INDEX)).toBeNull()
    expect(parentInvestorReconCode({ code: 'DAAS2T-CRS0113-001' }, INDEX)).toBeNull()
  })

  it('FK trỏ dòng CĐT không nằm trong danh sách: trả null', () => {
    expect(
      parentInvestorReconCode({ code: 'X-F2', parent_investor_reconciliation: 4242 }, INDEX)
    ).toBeNull()
  })

  it('trả null khi không có gì để hiển thị', () => {
    expect(parentInvestorReconCode({}, INDEX)).toBeNull()
  })
})

describe('isVoidedRecon', () => {
  it('coi là đã huỷ khi có voided_at, dù status vẫn là draft/confirmed', () => {
    // SRS 18.5 test-spec §16: "Void = set voided_at (status giữ nguyên)".
    // Dữ liệu thật deal 2896: F2 id 222 status=draft, InvestorRecon 1580 status=confirmed,
    // cả hai đều đã bị huỷ lúc 14:08 → phải bị loại khỏi TỔNG tiền.
    expect(isVoidedRecon({ status: 'draft', voided_at: '2026-07-29T14:08:26+07:00' })).toBe(true)
    expect(isVoidedRecon({ status: 'confirmed', voided_at: '2026-07-29T14:08:26+07:00' })).toBe(
      true
    )
  })

  it('vẫn nhận dạng status voided (enum BE có giá trị này)', () => {
    expect(isVoidedRecon({ status: 'voided' })).toBe(true)
  })

  it('phiếu còn hiệu lực thì không bị loại', () => {
    expect(isVoidedRecon({ status: 'draft' })).toBe(false)
    expect(isVoidedRecon({ status: 'confirmed', voided_at: null })).toBe(false)
    expect(isVoidedRecon({})).toBe(false)
  })
})

describe('resolveProgressPct (task 86eyb9a4z)', () => {
  it('ưu tiên % của dòng con', () => {
    expect(resolveProgressPct('45.50', '30.00')).toBe(45.5)
  })

  it('lấy % của đối chiếu CĐT gốc khi dòng con trống', () => {
    expect(resolveProgressPct(null, '30.00')).toBe(30)
    expect(resolveProgressPct(undefined, '30.00')).toBe(30)
  })

  it('trả 0 khi cả hai trống hoặc không parse được', () => {
    expect(resolveProgressPct(null, null)).toBe(0)
    expect(resolveProgressPct('abc', null)).toBe(0)
  })
})

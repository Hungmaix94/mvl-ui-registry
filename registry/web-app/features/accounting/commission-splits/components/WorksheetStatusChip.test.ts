import { describe, expect, it } from 'vitest'

import { WORKSHEET_STATUS, buildWorksheetStatusOptions } from './WorksheetStatusChip'

// Nhãn do BE trả về qua app-constant `DealPeriodWorksheet_STATUS_CHOICES`. Fixture này
// chép đúng payload thật của BE (apps/accounting/constants.py -> WorksheetStatus + .po).
const BE_LABELS = {
  DRAFT: 'Chờ Thư ký duyệt chi',
  ADMIN_APPROVED: 'TK đã duyệt chi',
  APPROVED: 'KT đã duyệt thực nhận',
  VOIDED: 'Đã huỷ',
}

// Regression guard for ClickUp 86ey45799 (Bug2): the "Trạng thái duyệt" filter dropdown on
// "Giao dịch tiền về đợt này" must show exactly the worksheet-lifecycle states the list
// column renders — no bogus `LOCKED`, and never missing `ADMIN_APPROVED`.
describe('buildWorksheetStatusOptions', () => {
  it('covers the full worksheet lifecycle in DRAFT → ADMIN_APPROVED → APPROVED → VOIDED order', () => {
    expect(buildWorksheetStatusOptions(BE_LABELS).map((o) => o.value)).toEqual([
      WORKSHEET_STATUS.DRAFT,
      WORKSHEET_STATUS.ADMIN_APPROVED,
      WORKSHEET_STATUS.APPROVED,
      WORKSHEET_STATUS.VOIDED,
    ])
  })

  it('includes ADMIN_APPROVED and excludes the bogus LOCKED value', () => {
    const values = buildWorksheetStatusOptions(BE_LABELS).map((o) => o.value)
    expect(values).toContain(WORKSHEET_STATUS.ADMIN_APPROVED)
    expect(values).not.toContain('LOCKED')
  })

  it('takes every label from the BE app-constant — FE keeps no hardcoded wording', () => {
    expect(buildWorksheetStatusOptions(BE_LABELS)).toEqual([
      { value: 'DRAFT', label: 'Chờ Thư ký duyệt chi' },
      { value: 'ADMIN_APPROVED', label: 'TK đã duyệt chi' },
      { value: 'APPROVED', label: 'KT đã duyệt thực nhận' },
      { value: 'VOIDED', label: 'Đã huỷ' },
    ])
  })

  // Đổi chữ ở BE phải hiện ra ngay trên web: đó là toàn bộ lý do bỏ map cứng của FE.
  it('follows a BE label change without any FE edit', () => {
    const renamed = { ...BE_LABELS, DRAFT: 'Chờ TK duyệt chi' }
    const draft = buildWorksheetStatusOptions(renamed).find((o) => o.value === 'DRAFT')
    expect(draft?.label).toBe('Chờ TK duyệt chi')
  })

  // App-constant chưa tải xong / BE thiếu key: hiện mã thật, không rơi về chữ FE tự bịa.
  it('falls back to the raw status code when the app-constant has no label', () => {
    expect(buildWorksheetStatusOptions({}).map((o) => o.label)).toEqual([
      'DRAFT',
      'ADMIN_APPROVED',
      'APPROVED',
      'VOIDED',
    ])
  })
})

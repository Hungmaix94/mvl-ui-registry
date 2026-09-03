import { describe, it, expect } from 'vitest'
import { z } from 'zod'

import { exchangeFormSchema } from '@/features/exchange/_shares/types/exchange-form-types'
import { investorFormSchema } from '@/features/investor/_shares/types/investor-form-types'

/**
 * CR STT27 (ClickUp 86eykqg66) — "Ngày thành lập" bắt buộc.
 *
 * Cả hai màn Sửa đều gọi PATCH, và BE giữ PATCH ở chế độ partial (DRF bỏ `required` khi partial),
 * nên **chính zod ở đây là thứ duy nhất chặn việc lưu khi bỏ trống lúc chỉnh sửa**. Đó là lý do
 * file test này tồn tại riêng thay vì trộn vào test form: nếu ai đó nới field này thành optional
 * để "cho dễ sửa bản ghi cũ", yêu cầu nghiệp vụ của CR biến mất mà không có lỗi nào nổ ra.
 */
const base = {
  name: 'Đối tác A',
  address: 'Số 1, Hà Nội',
  tax_code: '0123456789',
  is_active: true,
  attachment_tokens: [],
}
const investorBase = { ...base, attachment_keep_ids: [] }

describe('investorFormSchema — established_date', () => {
  it('rejects a missing established_date', () => {
    const result = investorFormSchema.safeParse(investorBase)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'established_date')).toBe(true)
    }
  })

  it('rejects an empty string — a cleared date picker must not pass as "filled"', () => {
    const result = investorFormSchema.safeParse({ ...investorBase, established_date: '' })

    expect(result.success).toBe(false)
  })

  it('accepts an API-format date', () => {
    const result = investorFormSchema.safeParse({
      ...investorBase,
      established_date: '2010-03-15',
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.established_date).toBe('2010-03-15')
  })

  // Luật "DatePicker ↔ Zod" (patterns.md): `DatePicker.onChange` trả 'DD/MM/YYYY' còn API nhận
  // 'yyyy-MM-dd'. `z.preprocess` là thứ khiến field chịu được cả hai — không có nó, một `reset()`
  // hay `defaultValues` mang dạng hiển thị sẽ đi thẳng lên API sai định dạng.
  it('normalises a DD/MM/YYYY value from the date picker into API format', () => {
    const result = investorFormSchema.safeParse({
      ...investorBase,
      established_date: '15/03/2010',
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.established_date).toBe('2010-03-15')
  })

  it('normalises a Date object into API format', () => {
    const result = investorFormSchema.safeParse({
      ...investorBase,
      established_date: new Date(2010, 2, 15),
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.established_date).toBe('2010-03-15')
  })
})

describe('exchangeFormSchema — established_date', () => {
  // Cùng schema dùng cho CẢ hai màn sàn (F2 "Sàn liên kết" và F0 "Nguồn sàn"), đúng như user chốt.
  it('rejects a missing established_date', () => {
    const result = exchangeFormSchema.safeParse(base)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === 'established_date')).toBe(true)
    }
  })

  it('rejects an empty string', () => {
    expect(exchangeFormSchema.safeParse({ ...base, established_date: '' }).success).toBe(false)
  })

  it('accepts an API-format date', () => {
    expect(exchangeFormSchema.safeParse({ ...base, established_date: '2012-05-20' }).success).toBe(
      true
    )
  })

  it('normalises a DD/MM/YYYY value into API format', () => {
    const result = exchangeFormSchema.safeParse({ ...base, established_date: '20/05/2012' })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.established_date).toBe('2012-05-20')
  })
})

/**
 * ClickUp 86eyr4pd6 — "Ngày thành lập" KHÔNG được ở tương lai.
 *
 * Bug báo ở 3 màn Tạo mới (Chủ đầu tư, Nguồn sàn F0, Sàn liên kết F2) nhưng chỉ có HAI schema:
 * `exchangeFormSchema` dùng chung cho cả hai màn sàn. Và cả 8 chỗ dựng form — 3 màn Tạo, 2 màn
 * Sửa, 4 dialog "Thêm mới" nội tuyến (`InvestorSelectWithCreate`, `SourceExchangeSelectWithCreate`,
 * `PiF2Table`, `SaleAllocationF2Table`) — đều đi qua đúng hai schema này. Ghim ở đây là ghim hết.
 *
 * Ngày mốc dựng bằng phép tính local ĐỘC LẬP thay vì gọi `formatDateToApi`: nếu test dùng chung
 * helper với implementation thì một lỗi trong helper tự triệt tiêu và test vẫn xanh.
 */
const toApi = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const toDisplay = (d: Date) =>
  `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
const shiftDays = (days: number) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

// Hai màn gọi cùng một cột bằng hai tên, cố ý: màn CĐT là "Ngày sinh nhật", hai màn sàn là
// "Ngày thành lập" (quyết định nghiệp vụ 26/08/2026). Nên message đi THEO TỪNG SCHEMA, không
// dùng chung một hằng — chính test này là thứ chặn việc gộp lại cho gọn. Backend tách msgid
// tương ứng ở PR #3442.
const INVESTOR_FUTURE_MESSAGE = 'Ngày sinh nhật không được ở tương lai'
const EXCHANGE_FUTURE_MESSAGE = 'Ngày thành lập không được ở tương lai'

const SCHEMAS: ReadonlyArray<[string, z.ZodTypeAny, Record<string, unknown>, string]> = [
  ['investorFormSchema', investorFormSchema, investorBase, INVESTOR_FUTURE_MESSAGE],
  ['exchangeFormSchema', exchangeFormSchema, base, EXCHANGE_FUTURE_MESSAGE],
]

describe.each(SCHEMAS)(
  '%s — established_date không được ở tương lai',
  (_name, schema, fixture, futureMessage) => {
    it('rejects tomorrow in API format', () => {
      const result = schema.safeParse({ ...fixture, established_date: toApi(shiftDays(1)) })

      expect(result.success).toBe(false)
      if (!result.success) {
        const issue = result.error.issues.find((i) => i.path[0] === 'established_date')
        // Keyed on the field, not just "some error happened": the form renders the message under
        // the date input by path, so a message parked elsewhere never reaches the user.
        expect(issue?.message).toBe(futureMessage)
      }
    })

    it('rejects tomorrow typed by hand as DD/MM/YYYY', () => {
      // The path the calendar cannot guard: `allowManualInput` lets the user type straight into
      // the input, so `disabledDays` is bypassed and only this refine is left standing.
      const result = schema.safeParse({ ...fixture, established_date: toDisplay(shiftDays(1)) })

      expect(result.success).toBe(false)
    })

    it('rejects a future Date object', () => {
      // `defaultValues` / `reset()` can hand the field a real Date rather than a string.
      const result = schema.safeParse({ ...fixture, established_date: shiftDays(30) })

      expect(result.success).toBe(false)
    })

    it('accepts today — the boundary must stay open', () => {
      // A company founded this morning is legal. `<` instead of `<=` locks out a valid day, and
      // nothing else in this file would catch that.
      const result = schema.safeParse({ ...fixture, established_date: toApi(new Date()) })

      expect(result.success).toBe(true)
      if (result.success) expect(result.data.established_date).toBe(toApi(new Date()))
    })

    it('accepts yesterday', () => {
      expect(schema.safeParse({ ...fixture, established_date: toApi(shiftDays(-1)) }).success).toBe(
        true
      )
    })
  }
)

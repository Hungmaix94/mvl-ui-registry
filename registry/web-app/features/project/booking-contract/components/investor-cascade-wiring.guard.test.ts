/**
 * Guard cho ClickUp 86eyqrk7h — đổi Chủ đầu tư phải dọn Dự án / Mã BĐS / Thông tin bán hàng.
 *
 * `investor-cascade.test.ts` chỉ chứng minh helper chạy đúng; nó vẫn xanh nguyên nếu ai đó gỡ lời
 * gọi ở form đi (helper đúng nhưng không màn nào dùng). Guard này khoá phần NỐI DÂY: `onChange` của
 * ô Chủ đầu tư phải đi qua `isInvestorChanged` + `clearInvestorDependents`, chứ không quay lại
 * nhánh `if (!val)` cũ — nhánh chỉ dọn khi XOÁ TRẮNG, để lọt đúng ca "đổi sang CĐT khác".
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const FORM_PATH = join(dirname(fileURLToPath(import.meta.url)), 'BookingContractForm.tsx')
const source = readFileSync(FORM_PATH, 'utf-8')

describe('BookingContractForm — cascade Chủ đầu tư (86eyqrk7h)', () => {
  it('dùng helper dùng chung thay vì tự dọn tại chỗ', () => {
    expect(source).toContain('isInvestorChanged')
    expect(source).toContain('clearInvestorDependents(setValue)')
  })

  it('so với giá trị CĐT trước đó, không phải chỉ kiểm tra rỗng', () => {
    // Tiền đề: đây đúng là file có ô Chủ đầu tư.
    expect(source).toContain('name="investor_id"')

    expect(source).toMatch(/isInvestorChanged\(\s*watchInvestorId\s*,\s*val\s*\)/)
  })

  it('không còn nhánh chỉ-dọn-khi-xoá-trắng ngay dưới setValue investor_id', () => {
    const idx = source.indexOf("setValue('investor_id', val")
    expect(idx).toBeGreaterThan(-1) // tiền đề: vẫn còn chỗ ghi investor_id

    const doan = source.slice(idx, idx + 400)
    // Bản lỗi: `setValue('investor_id', ...)` rồi `if (!val) { ...dọn... }`
    expect(doan).not.toMatch(/if\s*\(\s*!val\s*\)\s*\{[\s\S]{0,200}project_id/)
  })
})

/**
 * Guard cho ClickUp 86eyqr9e0 — "đã chọn khách hàng mà vẫn báo Vui lòng chọn khách hàng".
 *
 * Bug gốc: bỏ hết "Hợp đồng đặt chỗ liên quan" ⇒ nhánh gỡ autofill reset `customer` về
 * `initialValues?.customer ?? null` KÈM `shouldValidate: true`. Ở màn Tạo mới không có
 * `initialValues.customer` nên khách hàng bị xoá trắng, đồng thời lỗi bắn ra TRƯỚC lần submit đầu.
 * Form chạy `mode: 'onSubmit'` (mặc định RHF, `useForm` không khai `mode`) nên `reValidateMode`
 * chưa có hiệu lực ⇒ user chọn lại khách hàng thì `field.onChange` KHÔNG re-validate và lỗi cũ
 * nằm lì trên màn — đúng ảnh QA gửi: ô có giá trị, thẻ preview khách hàng vẫn render, mà vẫn đỏ.
 *
 * Vì sao cần guard đọc source chứ không phải test render: cả hai triệu chứng đều IM LẶNG với
 * `tsc` và `eslint`, và test đơn vị của `clearBookingAutofill` vẫn xanh nguyên nếu ai đó chỉ gỡ
 * lời gọi ở component đi (hàm đúng nhưng không màn nào dùng).
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const FORM_PATH = join(dirname(fileURLToPath(import.meta.url)), 'DepositContractForm.tsx')
const source = readFileSync(FORM_PATH, 'utf-8')

describe('DepositContractForm — gỡ autofill khi bỏ HĐ đặt chỗ liên quan (86eyqr9e0)', () => {
  it('vẫn dùng helper dùng chung `clearBookingAutofill`, không tự reset tại chỗ', () => {
    expect(source).toContain('clearBookingAutofill')
    expect(source).toMatch(/clearBookingAutofill\(\s*setValue\s*,\s*initialValues\s*\)/)
  })

  it('KHÔNG reset `customer` theo initialValues khi bỏ HĐ đặt chỗ liên quan', () => {
    // Tiền đề: đây đúng là file có nhánh gỡ autofill. Thiếu assert này thì bài kiểm "không chứa"
    // bên dưới vẫn xanh kể cả khi file bị đổi tên/rỗng.
    expect(source).toContain('handleBookingIdsChange')

    expect(source).not.toContain("setValue('customer', initialValues?.customer")
  })

  it('không có lời gọi nào vừa set `customer` rỗng vừa validate ngay (lỗi sẽ kẹt)', () => {
    const offenders = [
      ...source.matchAll(/setValue\(\s*'customer'\s*,\s*(null|undefined)[\s\S]{0,80}?\)/g),
    ].filter((match) => /shouldValidate:\s*true/.test(match[0]))

    // Đối chứng: file THẬT SỰ có ít nhất một chỗ set customer về rỗng — nếu không còn chỗ nào,
    // phép lọc trên rỗng một cách vô nghĩa và guard này hết tác dụng mà vẫn xanh.
    const clearsCustomer = [...source.matchAll(/setValue\(\s*'customer'\s*,\s*(null|undefined)/g)]
    expect(clearsCustomer.length).toBeGreaterThan(0)

    expect(offenders.map((match) => match[0])).toEqual([])
  })
})

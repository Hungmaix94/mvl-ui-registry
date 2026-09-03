import { describe, expect, test } from 'vitest'

import { buildCounterpartyTypeOptions } from './counterparty-type-options'
import { DEFAULT_INPUT_INVOICE_FORM_VALUES } from '../types/input-invoice-types'

// Chụp nguyên văn từ `/api/constants/` → `accounting.InputInvoice_COUNTERPARTY_TYPE_CHOICES`
// (đo 26/08). Gõ tay một danh sách "trông giống" là tự bỏ mất nửa số kiểu lỗi — nhất là nhãn,
// vì BE gọi SUPPLIER là "Nhà cung cấp" chứ không phải "Chủ đầu tư" như form từng tự đặt.
const ALL_OPTIONS = [
  { value: 'EMPLOYEE', label: 'Nhân sự' },
  { value: 'COLLABORATOR', label: 'Cộng tác viên' },
  { value: 'EXCHANGE', label: 'Sàn giao dịch' },
  { value: 'SUPPLIER', label: 'Nhà cung cấp' },
  { value: 'INVESTOR', label: 'Chủ đầu tư' },
]

// `accounting.INPUT_INVOICE_MANUAL_COUNTERPARTY_TYPES`
const ALLOWED = ['SUPPLIER']

const valuesOf = (options: Array<{ value: string }>) => options.map((option) => option.value)

describe('buildCounterpartyTypeOptions', () => {
  test('màn Tạo chỉ chào loại mà backend thật sự nhận', () => {
    const options = buildCounterpartyTypeOptions({
      isEditMode: false,
      allOptions: ALL_OPTIONS,
      allowedValues: ALLOWED,
    })

    expect(valuesOf(options)).toEqual(['SUPPLIER'])
    // Chính là ca trong ClickUp 86eyr4wt3: kế toán chọn được "Cộng tác viên" rồi ăn 400.
    expect(valuesOf(options)).not.toContain('COLLABORATOR')
  })

  test('nhãn lấy nguyên của backend, form không tự đặt lại', () => {
    const options = buildCounterpartyTypeOptions({
      isEditMode: false,
      allOptions: ALL_OPTIONS,
      allowedValues: ALLOWED,
    })

    expect(options).toEqual([{ value: 'SUPPLIER', label: 'Nhà cung cấp' }])
  })

  test('màn Sửa giữ đủ loại để hóa đơn cũ vẫn hiện đúng đối tượng', () => {
    const options = buildCounterpartyTypeOptions({
      isEditMode: true,
      allOptions: ALL_OPTIONS,
      allowedValues: ALLOWED,
    })

    // Đối chứng: 210/213 hóa đơn trên dev mang loại mà lượt tạo tay từ chối. Lọc ở màn Sửa
    // là ô "Đối tượng" hiện rỗng khi mở chúng.
    expect(options).toEqual(ALL_OPTIONS)
    expect(valuesOf(options)).toContain('EXCHANGE')
  })

  test('giữ loại đang được chọn dù nó ngoài danh sách cho phép', () => {
    // Màn HH F2 tháng điều hướng sang form Tạo kèm sẵn EXCHANGE (nút "Nhận HĐ").
    const options = buildCounterpartyTypeOptions({
      isEditMode: false,
      allOptions: ALL_OPTIONS,
      allowedValues: ALLOWED,
      currentValue: 'EXCHANGE',
    })

    expect(valuesOf(options)).toEqual(['EXCHANGE', 'SUPPLIER'])
  })

  test.each([
    ['chưa nạp xong constants', [], undefined],
    ['có nhãn nhưng chưa có tập cho phép', ALL_OPTIONS, undefined],
    ['payload đổi dạng', ALL_OPTIONS, { SUPPLIER: 'Nhà cung cấp' }],
  ])('không bịa danh sách thay backend (%s)', (_case, allOptions, allowedValues) => {
    const options = buildCounterpartyTypeOptions({
      isEditMode: false,
      allOptions: allOptions as Array<{ value: string; label: string }>,
      allowedValues,
    })

    // Thà để ô đang tải còn hơn chào một loại mà API sẽ từ chối.
    expect(options).toEqual([])
  })

  test('giá trị mặc định của form nằm trong danh sách được phép', () => {
    // Ghim mặc định vào chính luật: mặc định cũ là EXCHANGE — loại BE từ chối ngay khi tạo,
    // nên mở form rồi bấm Lưu là dính 400 dù chưa đổi gì. Đổi ngược lại thì test này đỏ.
    const options = buildCounterpartyTypeOptions({
      isEditMode: false,
      allOptions: ALL_OPTIONS,
      allowedValues: ALLOWED,
    })

    expect(valuesOf(options)).toContain(DEFAULT_INPUT_INVOICE_FORM_VALUES.counterparty_type)
  })
})

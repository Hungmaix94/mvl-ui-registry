import { render } from '@testing-library/react'
import { Table } from '@radix-ui/themes'
import { describe, expect, it } from 'vitest'

import { renderTbcValueCell } from './renderTbcValueCell'

/**
 * "Thưởng MV" (`amt_staff_incentive`) — ClickUp 86eyhybt4.
 *
 * Form tạo/sửa cấu hình Phí & Thưởng đã có ô này từ lâu, nhưng mọi tầng ĐỌC (card
 * "Cấu hình đang áp dụng", bảng "Lịch sử cấu hình", màn chi tiết) đều bỏ sót key
 * `staff_incentive`, nên số kế toán nhập vào biến mất khỏi màn hình.
 *
 * Khác mọi khoản còn lại, schema chỉ có `amt_staff_incentive`: KHÔNG có
 * `pct_staff_incentive` và KHÔNG có `is_staff_incentive_include_vat`. Đọc cờ VAT
 * không tồn tại sẽ ra `undefined` — nếu render vô điều kiện thì ô hiện chip
 * "Không VAT" bịa ra một thông tin nghiệp vụ không hề tồn tại.
 */
function renderCell(
  record: Record<string, unknown>,
  key: Parameters<typeof renderTbcValueCell>[1]
) {
  return render(
    <Table.Root>
      <Table.Body>
        <Table.Row>{renderTbcValueCell(record as never, key)}</Table.Row>
      </Table.Body>
    </Table.Root>
  )
}

describe('renderTbcValueCell — staff_incentive (Thưởng MV)', () => {
  it('hiển thị số tiền Thưởng MV thay vì ô trống', () => {
    const { getByRole } = renderCell({ amt_staff_incentive: '5000000' }, 'staff_incentive')

    expect(getByRole('cell').textContent).toContain('5.000.000')
  })

  it('KHÔNG gắn chip VAT — schema không có cờ `is_staff_incentive_include_vat`', () => {
    const { getByRole } = renderCell({ amt_staff_incentive: '5000000' }, 'staff_incentive')

    expect(getByRole('cell').textContent).not.toContain('VAT')
  })

  it('vẫn trả về ô "—" khi cấu hình để trống (dự án không có thưởng nền)', () => {
    const { getByRole } = renderCell({ amt_staff_incentive: null }, 'staff_incentive')

    expect(getByRole('cell').textContent).toContain('—')
  })

  it('khoản có cờ VAT vẫn giữ nguyên chip — không bị fix này làm mất', () => {
    const { getByText } = renderCell(
      { amt_agency_fee: '1000000', is_agency_fee_include_vat: true },
      'agency_fee'
    )

    expect(getByText('VAT')).toBeTruthy()
  })
})

import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import { BookingRefundSaleSale_type as DepositContractSaleType } from '@/api/schema'

import FeeSupportSalesStaffField, { type FeeSupportStaffRow } from './FeeSupportSalesStaffField'

const MV_STAFF: FeeSupportStaffRow = {
  id: 4152,
  sale_type: DepositContractSaleType.mv,
  employee_detail: { id: 13772, fullname: 'Hoàng Văn Long', code: 'MV000013772' },
}
const CTV_STAFF: FeeSupportStaffRow = {
  id: 4200,
  sale_type: DepositContractSaleType.collaborator,
  collaborator_name: 'Nguyễn Văn A',
}
const F2_STAFF: FeeSupportStaffRow = {
  id: 4153,
  sale_type: DepositContractSaleType.partner,
  exchange_detail: { name: 'Ntest-f2', code: 'EX000001944' },
}

/** Bọc controlled state để mô phỏng đúng cách form bind (value ↔ onChange). */
function Harness({
  salesStaff,
  initial = [],
  onChange,
}: {
  salesStaff: FeeSupportStaffRow[]
  initial?: number[]
  onChange?: (ids: number[]) => void
}) {
  const [value, setValue] = useState<number[]>(initial)
  return (
    <FeeSupportSalesStaffField
      salesStaff={salesStaff}
      value={value}
      onChange={(ids) => {
        setValue(ids)
        onChange?.(ids)
      }}
    />
  )
}

const checkboxFor = (name: string | RegExp) => screen.getByRole('checkbox', { name })

/** Dùng chung cho cả phép đo CÓ và phép đo KHÔNG CÓ hint — lệch nhau là hỏng cả hai. */
const HINT_RE = /F2 \(sàn liên kết\) chưa được hỗ trợ nên không chọn được/

describe('FeeSupportSalesStaffField — khoá bỏ tích (CR STT14)', () => {
  it('sale MV luôn được tích và bị disabled', () => {
    render(<Harness salesStaff={[MV_STAFF]} />)

    const checkbox = checkboxFor(/Hoàng Văn Long/)
    expect(checkbox).toBeDisabled()
    expect(checkbox).toHaveAttribute('data-state', 'checked')
  })

  it('CTV của sale luôn được tích và bị disabled', () => {
    render(<Harness salesStaff={[CTV_STAFF]} />)

    const checkbox = checkboxFor(/Nguyễn Văn A/)
    expect(checkbox).toBeDisabled()
    expect(checkbox).toHaveAttribute('data-state', 'checked')
  })

  it('click vào dòng bị khoá KHÔNG phát onChange (không untick được)', () => {
    const onChange = vi.fn()
    render(
      <Harness salesStaff={[MV_STAFF, CTV_STAFF]} initial={[4152, 4200]} onChange={onChange} />
    )

    fireEvent.click(checkboxFor(/Hoàng Văn Long/))
    fireEvent.click(checkboxFor(/Nguyễn Văn A/))

    expect(onChange).not.toHaveBeenCalled()
    expect(checkboxFor(/Hoàng Văn Long/)).toHaveAttribute('data-state', 'checked')
    expect(checkboxFor(/Nguyễn Văn A/)).toHaveAttribute('data-state', 'checked')
  })

  /**
   * ĐẢO CHIỀU so với CR STT14 (86eyqv8yu): trước đây F2 tích/bỏ tích tự do. BE
   * từ chối MỌI id `partner`, nên ô tích đó chỉ dẫn tới 400 kèm message kỹ thuật.
   * Test cũ ("F2 ... tích/bỏ tích được") đã được viết lại ở đây — để nguyên thì
   * cái XANH của nó có nghĩa là task CHƯA xong.
   */
  it('F2 vẫn hiển thị nhưng KHÔNG tích được', () => {
    const onChange = vi.fn()
    render(<Harness salesStaff={[MV_STAFF, F2_STAFF]} initial={[4152]} onChange={onChange} />)

    expect(screen.getByText('Ntest-f2')).toBeInTheDocument()
    const f2 = checkboxFor(/Ntest-f2/)
    expect(f2).toBeDisabled()
    expect(f2).toHaveAttribute('data-state', 'unchecked')

    fireEvent.click(f2)

    expect(onChange).not.toHaveBeenCalled()
    expect(checkboxFor(/Ntest-f2/)).toHaveAttribute('data-state', 'unchecked')
  })

  it('nói rõ lý do F2 không chọn được ngay trên dòng, không chỉ trong tooltip', () => {
    render(<Harness salesStaff={[MV_STAFF, F2_STAFF]} />)

    // Đối chứng: dòng MV hợp lệ KHÔNG mang câu này — nếu nó hiện ở mọi dòng thì
    // phép đo trên vô nghĩa.
    expect(screen.getAllByText(/Chưa hỗ trợ tạo phiếu hỗ trợ phí cho F2/)).toHaveLength(1)
  })

  it('cảnh báo khi giao dịch chỉ có F2 (không có nhân sự bắt buộc nào)', () => {
    render(<Harness salesStaff={[F2_STAFF]} />)

    expect(screen.getByText(/chưa hỗ trợ tạo phiếu hỗ trợ phí cho F2/)).toBeInTheDocument()
  })

  it('giao dịch chỉ có F2: nuốt lỗi zod "chọn ít nhất một" vì không có gì để chọn', () => {
    render(
      <FeeSupportSalesStaffField
        salesStaff={[F2_STAFF]}
        value={[]}
        onChange={vi.fn()}
        error="Vui lòng chọn ít nhất một nhân sự tham gia"
      />
    )

    expect(screen.queryByText('Vui lòng chọn ít nhất một nhân sự tham gia')).not.toBeInTheDocument()
    expect(screen.getByText(/không tạo được đề xuất cho giao dịch này/)).toBeInTheDocument()
  })

  it('giao dịch chỉ có F2 nhưng ĐÃ có lựa chọn: lỗi server VẪN phải hiện', () => {
    // `sales` nằm trong FORM_FIELD_NAMES nên lỗi 400 của BE đổ vào đúng prop `error`.
    // Nuốt theo `hasF2Only` trần là giấu luôn lỗi thật. Ca dựng được: HĐ cọc bị gỡ
    // mất dòng MV sau khi phiếu đã tạo ⇒ màn Sửa thấy F2-only mà `value` còn id cũ.
    render(
      <FeeSupportSalesStaffField
        salesStaff={[F2_STAFF]}
        value={[9999]}
        onChange={vi.fn()}
        error="Nhân sự tham gia phải thuộc đúng hợp đồng cọc này."
      />
    )

    expect(
      screen.getByText('Nhân sự tham gia phải thuộc đúng hợp đồng cọc này.')
    ).toBeInTheDocument()
  })

  it('còn nhân sự hợp lệ thì lỗi zod VẪN hiện như cũ', () => {
    // Đối chứng cho test trên: chứng minh việc nuốt lỗi bị bó đúng vào ca F2-only,
    // chứ không phải component đã ngừng hiện lỗi.
    render(
      <FeeSupportSalesStaffField
        salesStaff={[MV_STAFF, F2_STAFF]}
        value={[]}
        onChange={vi.fn()}
        error="Vui lòng chọn ít nhất một nhân sự tham gia"
      />
    )

    expect(screen.getByText('Vui lòng chọn ít nhất một nhân sự tham gia')).toBeInTheDocument()
  })

  it('không hiện hint khoá khi danh sách rỗng, chỉ hiện emptyMessage', () => {
    render(
      <FeeSupportSalesStaffField
        salesStaff={[]}
        value={[]}
        onChange={vi.fn()}
        emptyMessage="Đang tải nhân sự giao dịch..."
      />
    )

    expect(screen.getByText('Đang tải nhân sự giao dịch...')).toBeInTheDocument()
    // Dùng ĐÚNG regex của test khẳng-định-có bên dưới: gõ lệch một chữ là phép đo
    // vắng-mặt này xanh vì tìm nhầm, chứ không phải vì hint thật sự vắng.
    expect(screen.queryByText(HINT_RE)).not.toBeInTheDocument()
  })

  it('hint mô tả đúng hiện trạng: F2 không chọn được', () => {
    // Ghim nội dung hint. Bản cũ hứa "chỉ F2 có thể bỏ chọn" — câu đó nay là SAI,
    // và sai lặng lẽ vì không test nào đọc tới.
    render(<Harness salesStaff={[MV_STAFF, F2_STAFF]} />)

    expect(screen.getByText(HINT_RE)).toBeInTheDocument()
  })
})

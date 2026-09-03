import { render, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('@/services/realestate-service', () => ({
  useExchanges: () => ({ data: { results: [] } }),
}))

import CurrentTbcConfigCard from './CurrentTbcConfigCard'

/**
 * ClickUp 86eyhybt4 — card "Cấu hình đang áp dụng" cũng bỏ sót "Thưởng MV"
 * (`amt_staff_incentive`), nên kế toán mở tab "Phí và Thưởng" ra là không thấy
 * con số vừa nhập ở form.
 *
 * Header của card là 2 tầng có `colSpan`: thêm cột dữ liệu mà quên nâng `colSpan`
 * của nhóm "Chia cho Sale" sẽ làm lệch cả bảng, nên phải chốt bằng phép so số
 * cột lá với số ô dữ liệu.
 */
const record = {
  effective_from: '2026-07-01',
  effective_to: '2026-07-31',
  pct_agency_fee: '5',
  is_agency_fee_include_vat: false,
  amt_shared_bonus: '20000000',
  pct_sale_commission: '2',
  amt_staff_incentive: '5000000',
  note: 'Ghi chú',
}

function renderCard() {
  return render(<CurrentTbcConfigCard current={{ __version: 'v1', record }} />)
}

describe('CurrentTbcConfigCard — cột Thưởng MV', () => {
  it('hiện cột "Thưởng MV" kèm số tiền đã cấu hình', () => {
    const { getAllByRole, getByText } = renderCard()

    const headerTexts = getAllByRole('columnheader').map((th) => th.textContent?.trim())
    expect(headerTexts).toContain('Thưởng MV')
    expect(getByText(/5\.000\.000/)).toBeTruthy()
  })

  it('số cột lá của header khớp số ô dữ liệu', () => {
    const { getAllByRole } = renderCard()

    // rows[0] = tầng nhóm, rows[1] = tầng nhãn lá, rows[2] = dòng dữ liệu duy nhất.
    const [outerRow, innerRow, bodyRow] = getAllByRole('row')
    // Ô có `rowspan=2` tự nó là cột lá; ô không có `rowspan` chỉ là tiêu đề nhóm,
    // cột lá của nó nằm ở tầng dưới nên đếm theo tầng dưới để khỏi đếm trùng.
    const spannedDownCells = within(outerRow)
      .getAllByRole('columnheader')
      .filter((th) => Number(th.getAttribute('rowspan') ?? 1) >= 2).length
    const leafColumns = spannedDownCells + within(innerRow).getAllByRole('columnheader').length

    expect(leafColumns).toBe(within(bodyRow).getAllByRole('cell').length)
  })
})

/**
 * Ô "Người duyệt" từng in một tên người cố định lấy từ `tbc-mock-data.ts` — một giá trị bịa,
 * hiện y hệt nhau cho mọi user trên mọi dự án. Trên màn quyết định hoa hồng, người đọc tin đó
 * là người duyệt có thật.
 *
 * ClickUp 86exm4ud9 đã bổ sung `approved_by_name` ở BE, nên ô này in tên thật. Hai chiều đều
 * phải chốt: có người duyệt thì hiện đúng tên họ, chưa ai duyệt thì hiện gạch ngang. Nếu chỉ
 * chốt một chiều thì một hằng số cứng vẫn qua được cả bộ test.
 */
describe('CurrentTbcConfigCard — ô "Người duyệt"', () => {
  it('hiện tên người đã duyệt do BE trả về', () => {
    const { getByText } = render(
      <CurrentTbcConfigCard
        current={{ __version: 'v1', record: { ...record, approved_by_name: 'Nguyễn Văn Khoa' } }}
      />
    )

    expect(getByText('Người duyệt').textContent?.trim()).toBe('Người duyệt Nguyễn Văn Khoa')
  })

  it('hiện gạch ngang khi chưa ai duyệt', () => {
    const { getByText } = renderCard()

    expect(getByText('Người duyệt').textContent?.trim()).toBe('Người duyệt —')
  })

  it('không in bất kỳ tên bịa nào khi BE không trả tên', () => {
    const { container } = renderCard()

    // Tên trong mock cũ. Ca này chặn việc gắn lại một giá trị giả vào ô người duyệt.
    expect(container.textContent).not.toContain('Trần Bình')
  })
})

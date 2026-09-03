import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

import ReconMismatchList from './ReconMismatchList'
import {
  RECON_PRIMARY_FIELDS,
  reconCheckFieldLabel,
  reconCheckMismatches,
  type ReconCheck,
} from './recon-server-check'

/**
 * Giá trị lệch cho 1 field: cờ VAT là boolean (false vs true), còn lại là số (khác 0 hai vế — nếu
 * cả hai "rỗng" thì `effectiveReconMatch` coi như không có gì để so và mismatch biến mất).
 */
function mismatchEntry(field: string) {
  if (field.startsWith('is_')) {
    return { submitted: false, mv_config: true, delta: null, match: false }
  }
  return { submitted: '1', mv_config: '2', delta: '-1', match: false }
}

/** recon_check mà MỌI field badge đếm đều đang lệch. */
function allPrimaryMismatched(): ReconCheck {
  return Object.fromEntries(RECON_PRIMARY_FIELDS.map((f) => [f, mismatchEntry(f)]))
}

describe('ReconMismatchList', () => {
  /**
   * GUARD — bất biến "mọi cảnh báo badge đếm đều phải đọc được".
   *
   * Badge trên header căn đếm `reconCheckMismatches()` (mọi field trong RECON_PRIMARY_FIELDS), nên bề
   * mặt hiển thị phải phủ ĐÚNG chừng đó. Bảng ledger từng chỉ gắn chip cho 7 nhóm field và bỏ sót 3 cờ
   * VAT ⇒ badge "2 Cảnh báo" mà mở rộng chỉ thấy 1 (phiếu DAVTT-IRS1535, căn GN10001).
   *
   * Danh sách field lấy ĐỘNG từ RECON_PRIMARY_FIELDS — thêm field mới vào đó mà quên bề mặt hiển thị
   * thì test này đỏ ngay, không cần ai nhớ cập nhật danh sách viết tay.
   */
  it('hiển thị đủ mọi mismatch mà badge đếm được', () => {
    const recon = allPrimaryMismatched()
    const mismatches = reconCheckMismatches(recon)
    expect(mismatches).toHaveLength(RECON_PRIMARY_FIELDS.length)

    render(<ReconMismatchList mismatches={mismatches} />)

    expect(screen.getAllByTestId('recon-mismatch-item')).toHaveLength(RECON_PRIMARY_FIELDS.length)
    for (const field of RECON_PRIMARY_FIELDS) {
      expect(screen.getByText(reconCheckFieldLabel(field))).toBeInTheDocument()
    }
  })

  it('hiển thị được lệch cờ VAT — trường hợp bảng ledger bỏ sót', () => {
    const recon: ReconCheck = {
      is_extra_bonus_include_vat: mismatchEntry('is_extra_bonus_include_vat'),
    }
    render(<ReconMismatchList mismatches={reconCheckMismatches(recon)} />)

    expect(screen.getByText('Phí tăng thêm gồm VAT')).toBeInTheDocument()
    // Cờ boolean đọc thành Có/Không, không phải true/false.
    expect(screen.getByText('Không')).toBeInTheDocument()
    expect(screen.getByText('Có')).toBeInTheDocument()
  })

  it('không render gì khi không có mismatch', () => {
    const { container } = render(<ReconMismatchList mismatches={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

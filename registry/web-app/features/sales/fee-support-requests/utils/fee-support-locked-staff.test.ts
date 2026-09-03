import { describe, expect, it } from 'vitest'

import { BookingRefundSaleSale_type as DepositContractSaleType } from '@/api/schema'

import {
  hasNoSelectableFeeSupportStaff,
  isFeeSupportF2Staff,
  isFeeSupportLockedStaff,
  lockedFeeSupportStaffIds,
  withLockedFeeSupportStaffIds,
} from './fee-support-locked-staff'

describe('isFeeSupportF2Staff (86eyqv8yu)', () => {
  it('nhận đúng dòng F2 (partner / sàn liên kết)', () => {
    expect(isFeeSupportF2Staff({ id: 1, sale_type: DepositContractSaleType.partner })).toBe(true)
  })

  it('KHÔNG nhận sale MV', () => {
    expect(isFeeSupportF2Staff({ id: 2, sale_type: DepositContractSaleType.mv })).toBe(false)
  })

  it('KHÔNG nhận CTV — CTV của sale vẫn nhận hỗ trợ phí được (CR STT14)', () => {
    expect(isFeeSupportF2Staff({ id: 3, sale_type: DepositContractSaleType.collaborator })).toBe(
      false
    )
  })

  it('KHÔNG nhận dòng không rõ loại', () => {
    expect(isFeeSupportF2Staff({ id: 4 })).toBe(false)
  })
})

describe('hasNoSelectableFeeSupportStaff (86eyqv8yu)', () => {
  it('giao dịch chỉ có F2 ⇒ không còn ai tích được', () => {
    expect(
      hasNoSelectableFeeSupportStaff([
        { id: 1, sale_type: DepositContractSaleType.partner },
        { id: 2, sale_type: DepositContractSaleType.partner },
      ])
    ).toBe(true)
  })

  it('có sale MV ⇒ vẫn tạo được phiếu', () => {
    expect(
      hasNoSelectableFeeSupportStaff([
        { id: 1, sale_type: DepositContractSaleType.partner },
        { id: 2, sale_type: DepositContractSaleType.mv },
      ])
    ).toBe(false)
  })

  it('có CTV ⇒ vẫn tạo được phiếu', () => {
    expect(
      hasNoSelectableFeeSupportStaff([{ id: 1, sale_type: DepositContractSaleType.collaborator }])
    ).toBe(false)
  })

  it('danh sách RỖNG là ca khác hẳn (đang tải / chưa có) ⇒ false', () => {
    // Trả true ở đây là màn hình báo "giao dịch chỉ có F2" trong lúc dữ liệu chưa
    // về — nói sai với người dùng ngay ở nhịp đầu tiên.
    expect(hasNoSelectableFeeSupportStaff([])).toBe(false)
  })
})

describe('isFeeSupportLockedStaff (CR STT14)', () => {
  it('khoá sale MV', () => {
    expect(isFeeSupportLockedStaff({ id: 1, sale_type: DepositContractSaleType.mv })).toBe(true)
  })

  it('khoá CTV của sale (mọi tuyến)', () => {
    expect(
      isFeeSupportLockedStaff({ id: 2, sale_type: DepositContractSaleType.collaborator })
    ).toBe(true)
  })

  it('KHÔNG khoá F2 (partner / sàn liên kết)', () => {
    expect(isFeeSupportLockedStaff({ id: 3, sale_type: DepositContractSaleType.partner })).toBe(
      false
    )
  })

  it('KHÔNG khoá dòng không rõ loại', () => {
    expect(isFeeSupportLockedStaff({ id: 4 })).toBe(false)
  })
})

describe('lockedFeeSupportStaffIds (CR STT14)', () => {
  it('lấy id của MV + CTV, bỏ qua F2, giữ thứ tự', () => {
    const staff = [
      { id: 1, sale_type: DepositContractSaleType.mv },
      { id: 2, sale_type: DepositContractSaleType.partner },
      { id: 3, sale_type: DepositContractSaleType.collaborator },
      { id: 4, sale_type: DepositContractSaleType.partner },
      { id: 5, sale_type: DepositContractSaleType.mv },
    ]

    expect(lockedFeeSupportStaffIds(staff)).toEqual([1, 3, 5])
  })

  it('trả về rỗng khi giao dịch chỉ có F2', () => {
    const staff = [
      { id: 1, sale_type: DepositContractSaleType.partner },
      { id: 2, sale_type: DepositContractSaleType.partner },
    ]

    expect(lockedFeeSupportStaffIds(staff)).toEqual([])
  })
})

describe('withLockedFeeSupportStaffIds (CR STT14)', () => {
  const staff = [
    { id: 1, sale_type: DepositContractSaleType.mv },
    { id: 2, sale_type: DepositContractSaleType.partner },
    { id: 3, sale_type: DepositContractSaleType.collaborator },
  ]

  it('bổ sung id bị khoá còn thiếu vào cuối, giữ nguyên lựa chọn F2', () => {
    expect(withLockedFeeSupportStaffIds([2], staff)).toEqual([2, 1, 3])
  })

  it('trả về CHÍNH mảng cũ khi đã đủ id bị khoá (tránh effect lặp)', () => {
    const selected = [1, 3]
    expect(withLockedFeeSupportStaffIds(selected, staff)).toBe(selected)
  })

  it('không thêm gì khi giao dịch chỉ có F2', () => {
    const selected: number[] = []
    expect(withLockedFeeSupportStaffIds(selected, [staff[1]])).toBe(selected)
  })
})

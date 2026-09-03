import { describe, expect, it } from 'vitest'

import { BookingRefundSaleSale_type as DepositContractSaleType } from '@/api/schema'

import { describeFeeSupportStaff } from './fee-support-staff-display'

describe('describeFeeSupportStaff (CR STT14)', () => {
  it('sale MV: tên + mã nhân viên, phụ đề chi nhánh · khối · phòng ban', () => {
    expect(
      describeFeeSupportStaff({
        sale_type: DepositContractSaleType.mv,
        employee_detail: {
          fullname: 'Hoàng Văn Long',
          code: 'MV000013772',
          branch: { name: 'Quảng Ninh' },
          block: { name: 'Khối Hỗ trợ' },
          department: { name: 'Sàn Liên Kết & Cộng Tác Viên_QN' },
        },
      })
    ).toEqual({
      name: 'Hoàng Văn Long (MV000013772)',
      org: 'Quảng Ninh · Khối Hỗ trợ · Sàn Liên Kết & Cộng Tác Viên_QN',
    })
  })

  it('CTV: lấy collaborator_name, phụ đề "Cộng tác viên"', () => {
    expect(
      describeFeeSupportStaff({
        sale_type: DepositContractSaleType.collaborator,
        collaborator_name: 'Nguyễn Văn A',
      })
    ).toEqual({ name: 'Nguyễn Văn A', org: 'Cộng tác viên' })
  })

  it('F2: lấy tên sàn từ exchange_detail, phụ đề "Sàn liên kết (F2)" + mã sàn', () => {
    expect(
      describeFeeSupportStaff({
        sale_type: DepositContractSaleType.partner,
        exchange_detail: { name: 'Ntest-f2', code: 'EX000001944' },
      })
    ).toEqual({ name: 'Ntest-f2', org: 'Sàn liên kết (F2) · EX000001944' })
  })

  it('thiếu dữ liệu: fallback nhãn mặc định, org "-"', () => {
    expect(describeFeeSupportStaff({ sale_type: DepositContractSaleType.mv })).toEqual({
      name: 'Nhân viên',
      org: '—',
    })
    expect(describeFeeSupportStaff({ sale_type: DepositContractSaleType.partner })).toEqual({
      name: 'Sàn liên kết',
      org: 'Sàn liên kết (F2)',
    })
  })
})

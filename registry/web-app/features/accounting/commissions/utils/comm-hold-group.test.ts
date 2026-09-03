import { describe, it, expect } from 'vitest'
import {
  buildHoldBreakdown,
  buildHoldGroupQuery,
  holdGroupIdentity,
  isAutoCertHold,
  parseHoldGroupIdentity,
  resolveBeneficiary,
  resolveBeneficiaryId,
  resolveHoldReceiptVoucher,
} from './comm-hold-group'
import type {
  CommissionHold,
  CommissionHoldGroup,
} from '@/features/accounting/commission-holds/services/commission-hold-service'
import { CommissionHoldBeneficiaryType as BeneficiaryType } from '@/constants/api-schema-aliases'
const baseGroup = {
  manual_fee_amount: '0',
  manual_bonus_amount: '0',
  auto_cert_fee_amount: '0',
  auto_cert_bonus_amount: '0',
  other_amount: '0',
} as unknown as CommissionHoldGroup

describe('buildHoldBreakdown', () => {
  it('chỉ trả về các bucket khác 0, giữ thứ tự cố định tay-phí → tay-thưởng → auto-phí → auto-thưởng → khác', () => {
    const items = buildHoldBreakdown({
      ...baseGroup,
      manual_fee_amount: '1000000',
      manual_bonus_amount: '400000',
      auto_cert_fee_amount: '200000',
      other_amount: '50000',
    } as CommissionHoldGroup)

    expect(items.map((i) => i.key)).toEqual([
      'manual_fee',
      'manual_bonus',
      'auto_cert_fee',
      'other',
    ])
    expect(items[0]).toEqual({ key: 'manual_fee', label: 'Giữ tay · Phí', amount: 1000000 })
    expect(items.find((i) => i.key === 'auto_cert_bonus')).toBeUndefined()
  })

  it('group không còn hold ACTIVE nào → mảng rỗng', () => {
    expect(buildHoldBreakdown(baseGroup)).toEqual([])
  })

  it('bucket giảm trừ mang số ÂM vẫn được giữ lại (lọc theo !== 0, không phải > 0)', () => {
    const items = buildHoldBreakdown({
      ...baseGroup,
      auto_cert_fee_amount: '11226600',
      deduction_amount: '-135565',
    } as unknown as CommissionHoldGroup)

    expect(items).toEqual([
      { key: 'auto_cert_fee', label: 'Tự động (CCMG) · Phí', amount: 11226600 },
      { key: 'deduction', label: 'Giảm trừ', amount: -135565 },
    ])
  })

  it('BE chưa deploy bucket giảm trừ → không dựng dòng rỗng', () => {
    const items = buildHoldBreakdown({
      ...baseGroup,
      auto_cert_fee_amount: '11091035',
    } as CommissionHoldGroup)
    expect(items.map((i) => i.key)).toEqual(['auto_cert_fee'])
  })

  it('chịu được giá trị null/undefined từ API', () => {
    const items = buildHoldBreakdown({
      ...baseGroup,
      manual_bonus_amount: undefined as unknown as string,
      auto_cert_bonus_amount: '300000',
    } as CommissionHoldGroup)
    expect(items).toEqual([
      { key: 'auto_cert_bonus', label: 'Tự động (CCMG) · Thưởng', amount: 300000 },
    ])
  })
})

describe('isAutoCertHold', () => {
  it('chỉ hold nguồn AUTO_CERT là tạm giữ tự động (không cho giải phóng/huỷ tay)', () => {
    expect(isAutoCertHold({ hold_origin: 'AUTO_CERT' } as CommissionHold)).toBe(true)
    expect(isAutoCertHold({ hold_origin: 'MANUAL' } as CommissionHold)).toBe(false)
    expect(isAutoCertHold({ hold_origin: 'CARRYOVER' } as CommissionHold)).toBe(false)
    expect(isAutoCertHold({} as CommissionHold)).toBe(false)
  })
})

describe('resolveHoldReceiptVoucher', () => {
  it('lấy phiếu thu nguồn từ PBTV (mã + ngày thu) để phân biệt các lần thu cùng worksheet', () => {
    expect(
      resolveHoldReceiptVoucher({
        source_pbtv_detail: {
          id: 5,
          code: 'PBTV-01',
          worksheet: 9,
          receipt_voucher: 41,
          receipt_voucher_code: 'PT2605-0003',
          receipt_voucher_date: '2026-05-11',
        },
      } as unknown as CommissionHold)
    ).toEqual({ id: 41, code: 'PT2605-0003', date: '2026-05-11' })
  })

  it('hold không sinh từ PBTV (giữ tay / theo kỳ tháng) → null', () => {
    expect(
      resolveHoldReceiptVoucher({ source_pbtv_detail: null } as unknown as CommissionHold)
    ).toBe(null)
  })

  it('BE chưa trả field phiếu thu → null (không dựng ô rỗng)', () => {
    expect(
      resolveHoldReceiptVoucher({
        source_pbtv_detail: { id: 5, code: 'PBTV-01', worksheet: 9 },
      } as unknown as CommissionHold)
    ).toBe(null)
  })

  it('có id nhưng thiếu mã → fallback #id, ngày null', () => {
    expect(
      resolveHoldReceiptVoucher({
        source_pbtv_detail: { id: 5, receipt_voucher: 41 },
      } as unknown as CommissionHold)
    ).toEqual({ id: 41, code: '#41', date: null })
  })
})

describe('resolveBeneficiaryId', () => {
  it('lấy id theo đúng nhánh beneficiary_type', () => {
    expect(
      resolveBeneficiaryId({
        beneficiary_type: BeneficiaryType.EMPLOYEE,
        beneficiary_employee: 12,
        beneficiary_collaborator: 99,
        beneficiary_exchange: 77,
      } as CommissionHold)
    ).toBe(12)
    expect(
      resolveBeneficiaryId({
        beneficiary_type: BeneficiaryType.COLLABORATOR,
        beneficiary_employee: null,
        beneficiary_collaborator: 99,
        beneficiary_exchange: null,
      } as CommissionHold)
    ).toBe(99)
    expect(
      resolveBeneficiaryId({
        beneficiary_type: BeneficiaryType.EXCHANGE,
        beneficiary_employee: null,
        beneficiary_collaborator: null,
        beneficiary_exchange: 77,
      } as CommissionHold)
    ).toBe(77)
  })
})

describe('holdGroupIdentity', () => {
  const group = {
    beneficiary_type: BeneficiaryType.EMPLOYEE,
    beneficiary_employee: 12,
    beneficiary_collaborator: null,
    beneficiary_exchange: null,
    commission_period_year: 2026,
    commission_period_month: 7,
  } as CommissionHoldGroup

  it('dựng đủ 4 mảnh khoá điều hướng', () => {
    expect(holdGroupIdentity(group)).toEqual({
      beneficiaryType: BeneficiaryType.EMPLOYEE,
      beneficiaryId: 12,
      year: 2026,
      month: 7,
    })
  })

  it('thiếu id người nhận hoặc kỳ → null (không dựng được URL chi tiết)', () => {
    expect(holdGroupIdentity({ ...group, beneficiary_employee: null } as CommissionHoldGroup)).toBe(
      null
    )
    expect(
      holdGroupIdentity({ ...group, commission_period_year: 0 } as unknown as CommissionHoldGroup)
    ).toBe(null)
  })
})

describe('parseHoldGroupIdentity', () => {
  it('parse param URL hợp lệ', () => {
    expect(
      parseHoldGroupIdentity({
        beneficiaryType: 'COLLABORATOR',
        beneficiaryId: '99',
        year: '2026',
        month: '7',
      })
    ).toEqual({
      beneficiaryType: BeneficiaryType.COLLABORATOR,
      beneficiaryId: 99,
      year: 2026,
      month: 7,
    })
  })

  it('loại param sai định dạng → null (trang chi tiết báo 404)', () => {
    const valid = { beneficiaryType: 'EMPLOYEE', beneficiaryId: '12', year: '2026', month: '7' }
    expect(parseHoldGroupIdentity({ ...valid, beneficiaryType: 'PARTNER' })).toBe(null)
    expect(parseHoldGroupIdentity({ ...valid, beneficiaryId: 'abc' })).toBe(null)
    expect(parseHoldGroupIdentity({ ...valid, beneficiaryId: '0' })).toBe(null)
    expect(parseHoldGroupIdentity({ ...valid, month: '13' })).toBe(null)
    expect(parseHoldGroupIdentity({ ...valid, month: '0' })).toBe(null)
    expect(parseHoldGroupIdentity({})).toBe(null)
  })
})

describe('buildHoldGroupQuery', () => {
  it('gửi đúng param id theo loại người nhận, KHÔNG mang filter của list', () => {
    expect(
      buildHoldGroupQuery({
        beneficiaryType: BeneficiaryType.EMPLOYEE,
        beneficiaryId: 12,
        year: 2026,
        month: 7,
      })
    ).toEqual({
      beneficiary_type: BeneficiaryType.EMPLOYEE,
      beneficiary_employee: 12,
      commission_period_year: 2026,
      commission_period_month: 7,
      page: 1,
      page_size: 1,
    })

    expect(
      buildHoldGroupQuery({
        beneficiaryType: BeneficiaryType.EXCHANGE,
        beneficiaryId: 77,
        year: 2026,
        month: 12,
      })
    ).toMatchObject({ beneficiary_exchange: 77 })

    expect(
      buildHoldGroupQuery({
        beneficiaryType: BeneficiaryType.COLLABORATOR,
        beneficiaryId: 99,
        year: 2026,
        month: 1,
      })
    ).toMatchObject({ beneficiary_collaborator: 99 })
  })
})

describe('resolveBeneficiary', () => {
  it('nhân viên: tên + mã + breadcrumb chi nhánh/khối/phòng ban', () => {
    expect(
      resolveBeneficiary({
        beneficiary_type: BeneficiaryType.EMPLOYEE,
        beneficiary_employee: 12,
        beneficiary_employee_detail: {
          fullname: 'Nguyễn Văn A',
          code: 'NV001',
          branch: { name: 'CN Hà Nội' },
          department: { name: 'Phòng KD1' },
        },
      } as unknown as CommissionHold)
    ).toEqual({
      name: 'Nguyễn Văn A',
      code: 'NV001',
      meta: [
        { label: 'Chi nhánh', value: 'CN Hà Nội' },
        { label: 'Phòng ban', value: 'Phòng KD1' },
      ],
    })
  })

  it('CTV: hiện SĐT; thiếu detail thì fallback về #id', () => {
    expect(
      resolveBeneficiary({
        beneficiary_type: BeneficiaryType.COLLABORATOR,
        beneficiary_collaborator: 99,
        beneficiary_collaborator_detail: { name: 'CTV B', code: 'CTV01', phone: '0900000000' },
      } as unknown as CommissionHold)
    ).toEqual({
      name: 'CTV B',
      code: 'CTV01',
      meta: [{ label: 'SĐT', value: '0900000000' }],
    })

    expect(
      resolveBeneficiary({
        beneficiary_type: BeneficiaryType.EXCHANGE,
        beneficiary_exchange: 77,
        beneficiary_exchange_detail: null,
      } as unknown as CommissionHold)
    ).toEqual({ name: '#77', code: null, meta: [] })
  })
})

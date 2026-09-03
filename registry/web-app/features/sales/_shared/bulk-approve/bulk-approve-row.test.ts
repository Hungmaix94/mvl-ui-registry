import { describe, it, expect } from 'vitest'

import { createStepResolver, describeSalesRow, salesRowCustomerName } from './bulk-approve-row'
import { BULK_APPROVE_STEP } from './bulk-approve-model'

const resolveStep = createStepResolver({
  pendingAdmin: 'pending_admin',
  pendingAdminLead: 'pending_admin_lead',
  pendingAccountant: 'pending_accountant',
})

describe('createStepResolver', () => {
  it('suy đúng bàn duyệt cho ba trạng thái chờ', () => {
    expect(resolveStep('pending_admin')).toBe(BULK_APPROVE_STEP.ADMIN)
    expect(resolveStep('pending_admin_lead')).toBe(BULK_APPROVE_STEP.ADMIN_LEAD)
    expect(resolveStep('pending_accountant')).toBe(BULK_APPROVE_STEP.ACCOUNTANT)
  })

  it('trả null cho trạng thái ngoài luồng duyệt', () => {
    // `pending_confirm` (bàn của sale) và `pending_treasurer` (bàn chi tiền) bị BE loại khỏi
    // bulk-approve — không có trong bảng nên tự động không tích được.
    expect(resolveStep('pending_confirm')).toBeNull()
    expect(resolveStep('pending_treasurer')).toBeNull()
    expect(resolveStep('approved')).toBeNull()
    expect(resolveStep('rejected')).toBeNull()
  })

  it('trả null với giá trị rỗng', () => {
    expect(resolveStep(null)).toBeNull()
    expect(resolveStep(undefined)).toBeNull()
    expect(resolveStep('')).toBeNull()
  })
})

describe('salesRowCustomerName', () => {
  it('ưu tiên bản ghi khách LIÊN KẾT hơn ảnh chụp trên hợp đồng', () => {
    // `customer_detail` là Customer thật; cột `cust_*` chỉ là snapshot cho bản ghi tạo từ mobile
    // không gắn khách nào. Có cả hai thì bản ghi liên kết là nguồn chuẩn.
    expect(
      salesRowCustomerName({
        customer_detail: { name: 'Nguyễn Văn A' },
        cust_full_name: 'Ảnh chụp cũ',
      })
    ).toBe('Nguyễn Văn A')
  })

  it('lùi dần: khách tiềm năng → snapshot cá nhân → snapshot doanh nghiệp', () => {
    expect(salesRowCustomerName({ potential_customer_detail: { full_name: 'Khách TN' } })).toBe(
      'Khách TN'
    )
    expect(salesRowCustomerName({ cust_full_name: 'Chỉ có snapshot' })).toBe('Chỉ có snapshot')
    expect(salesRowCustomerName({ cust_business_name: 'Công ty B' })).toBe('Công ty B')
  })

  it('trả chuỗi rỗng khi không có nguồn nào', () => {
    expect(salesRowCustomerName({})).toBe('')
    expect(salesRowCustomerName({ customer_detail: null })).toBe('')
  })
})

describe('describeSalesRow', () => {
  it('ghép tên khách và mã căn bằng dấu chấm giữa', () => {
    expect(
      describeSalesRow({
        code: 'HDC-001',
        customer_detail: { name: 'Nguyễn Văn A' },
        product_inventory_detail: { unit_number: 'A-12.05', code: 'A1205' },
      })
    ).toEqual({ code: 'HDC-001', subject: 'Nguyễn Văn A · A-12.05' })
  })

  it('lùi về mã sản phẩm khi không có số căn', () => {
    expect(
      describeSalesRow({
        code: 'HDC-002',
        product_inventory_detail: { unit_number: null, code: 'A1206' },
      }).subject
    ).toBe('A1206')
  })

  it('không để lại dấu chấm lửng khi thiếu mảnh', () => {
    expect(describeSalesRow({ code: 'HDC-003' }).subject).toBe('')
    expect(
      describeSalesRow({ code: 'HDC-004', customer_detail: { name: 'Chỉ có tên' } }).subject
    ).toBe('Chỉ có tên')
  })

  it('nối thêm phần đặc thù của màn và bỏ mảnh rỗng', () => {
    expect(
      describeSalesRow({ code: 'HT-001', customer_detail: { name: 'Trần B' } }, [
        '1.200.000 ₫',
        null,
        '  ',
      ]).subject
    ).toBe('Trần B · 1.200.000 ₫')
  })

  it('code rỗng khi bản ghi không có mã', () => {
    expect(describeSalesRow({}).code).toBe('')
  })
})

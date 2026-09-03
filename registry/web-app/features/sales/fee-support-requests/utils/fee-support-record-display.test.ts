import { describe, expect, it } from 'vitest'

import {
  feeSupportCustomerCollaboratorLabel,
  feeSupportCustomerLabel,
  feeSupportProjectName,
  feeSupportUnitNumber,
} from './fee-support-record-display'

describe('feeSupportProjectName (CR STT16)', () => {
  it('ưu tiên project_name phẳng', () => {
    expect(
      feeSupportProjectName({
        project_name: 'The Prive',
        project_detail: { name: 'Khác' },
      } as never)
    ).toBe('The Prive')
  })

  it('BE trả chuỗi rỗng → rơi xuống project_detail', () => {
    expect(
      feeSupportProjectName({ project_name: '  ', project_detail: { name: 'The Prive' } } as never)
    ).toBe('The Prive')
  })

  it('không có nguồn nào → null để caller tự fallback', () => {
    expect(feeSupportProjectName({ project_name: '', project_detail: null } as never)).toBeNull()
    expect(feeSupportProjectName(null)).toBeNull()
  })
})

describe('feeSupportUnitNumber (CR STT16)', () => {
  it('ưu tiên unit_number phẳng', () => {
    expect(
      feeSupportUnitNumber({
        unit_number: 'TW8-2305',
        product_inventory_detail: { unit_number: 'Khác' },
      } as never)
    ).toBe('TW8-2305')
  })

  it('BE trả chuỗi rỗng → rơi xuống product_inventory_detail', () => {
    expect(
      feeSupportUnitNumber({
        unit_number: '',
        product_inventory_detail: { unit_number: 'TW8-2305' },
      } as never)
    ).toBe('TW8-2305')
  })

  it('không có nguồn nào → null', () => {
    expect(
      feeSupportUnitNumber({ unit_number: '', product_inventory_detail: null } as never)
    ).toBeNull()
    expect(feeSupportUnitNumber(undefined)).toBeNull()
  })
})

describe('feeSupportCustomerLabel (86ey4vjmp)', () => {
  it('lấy TÊN khách từ customer_detail — không phải id CSDL', () => {
    expect(
      feeSupportCustomerLabel({
        customer_detail: { id: 10, code: 'KH000000010', name: 'Tập đoàn Á Châu' },
      } as never)
    ).toBe('Tập đoàn Á Châu')
  })

  it('chưa có tên thì lấy MÃ NGHIỆP VỤ, không rơi về id', () => {
    // Đây là điểm mấu chốt của bug: màn cũ in `KH #10` trong khi mã thật là
    // KH000000010 — con số 10 không tra cứu được ở đâu.
    expect(
      feeSupportCustomerLabel({
        customer_detail: { id: 10, code: 'KH000000010', name: '   ' },
      } as never)
    ).toBe('KH000000010')
  })

  it('BE khai non-nullable nhưng trả null → không nổ, trả null cho caller fallback', () => {
    expect(feeSupportCustomerLabel({ customer_detail: null } as never)).toBeNull()
    expect(feeSupportCustomerLabel(null)).toBeNull()
  })

  it('bản ghi cũ chưa có customer_detail thì dùng tên truyền từ deal-workspace', () => {
    expect(feeSupportCustomerLabel({ customer_detail: null } as never, 'Nguyễn Văn A')).toBe(
      'Nguyễn Văn A'
    )
  })

  it('customer_detail thắng fallback của workspace', () => {
    expect(
      feeSupportCustomerLabel(
        { customer_detail: { id: 10, code: 'KH000000010', name: 'Tên trên phiếu' } } as never,
        'Tên cũ từ workspace'
      )
    ).toBe('Tên trên phiếu')
  })
})

describe('feeSupportCustomerCollaboratorLabel (86ey4vjmp)', () => {
  it('lấy TÊN CTV thay cho `CTV #<id>`', () => {
    expect(
      feeSupportCustomerCollaboratorLabel({
        customer_collaborator_detail: {
          id: 132,
          code: 'CTV000000131',
          name: 'KH000000010 - Tập đoàn Á Châu',
        },
      } as never)
    ).toBe('KH000000010 - Tập đoàn Á Châu')
  })

  it('id CSDL và mã nghiệp vụ LỆCH nhau — phải trả mã, không trả id', () => {
    // CTV id=132 nhưng code=CTV000000131: in id ra màn là sai hẳn một đơn vị.
    expect(
      feeSupportCustomerCollaboratorLabel({
        customer_collaborator_detail: { id: 132, code: 'CTV000000131', name: '' },
      } as never)
    ).toBe('CTV000000131')
  })

  it('phiếu không có chiết khấu khách → null (28/45 phiếu trên dev)', () => {
    expect(
      feeSupportCustomerCollaboratorLabel({ customer_collaborator_detail: null } as never)
    ).toBeNull()
    expect(feeSupportCustomerCollaboratorLabel(undefined)).toBeNull()
  })
})

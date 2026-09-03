import { describe, expect, it } from 'vitest'
import type { components } from '@/api/schema'
import { CustomerType } from '@/constants/api-schema-aliases'
import { resolveCustomerDisplay, type CustomerDisplaySource } from './customer-display'

describe('resolveCustomerDisplay', () => {
  describe('nguồn chuẩn hoá từ backend (`name` / `identify_number`)', () => {
    it('khách doanh nghiệp hiện tên công ty và mã số thuế', () => {
      const result = resolveCustomerDisplay({
        customer_type: CustomerType.business,
        name: 'Tập đoàn Sơn Á',
        identify_number: '89389638',
        full_name: '',
        id_number: '',
      })

      expect(result).toEqual({
        isBusiness: true,
        name: 'Tập đoàn Sơn Á',
        identifyNumber: '89389638',
      })
    })

    it('khách cá nhân hiện họ tên và CCCD', () => {
      const result = resolveCustomerDisplay({
        customer_type: CustomerType.individual,
        name: 'Nguyễn Văn A',
        identify_number: '001099012345',
      })

      expect(result).toEqual({
        isBusiness: false,
        name: 'Nguyễn Văn A',
        identifyNumber: '001099012345',
      })
    })
  })

  describe('đường lui khi serializer chưa gửi cặp chuẩn hoá', () => {
    it('khách doanh nghiệp lấy business_name / business_tax_code', () => {
      const result = resolveCustomerDisplay({
        customer_type: CustomerType.business,
        business_name: 'Công ty TNHH Vạn Phát',
        business_tax_code: '0312345678',
      })

      expect(result.name).toBe('Công ty TNHH Vạn Phát')
      expect(result.identifyNumber).toBe('0312345678')
    })

    it('khách cá nhân lấy full_name / id_number', () => {
      const result = resolveCustomerDisplay({
        customer_type: CustomerType.individual,
        full_name: 'Trần Thị B',
        id_number: '001199054321',
      })

      expect(result.name).toBe('Trần Thị B')
      expect(result.identifyNumber).toBe('001199054321')
    })

    it('KHÔNG lấy cột của loại khách khác — đó chính là cách bug cũ ẩn mình', () => {
      // Bản ghi doanh nghiệp còn sót dữ liệu cá nhân từ lần đổi loại: lấy nhầm sang đó
      // thì màn hình hiện tên một người trong khi khách là công ty.
      const result = resolveCustomerDisplay({
        customer_type: CustomerType.business,
        full_name: 'Người đại diện cũ',
        id_number: '001099012345',
        business_name: '',
        business_tax_code: '',
      })

      expect(result.name).toBe('')
      expect(result.identifyNumber).toBe('')
    })
  })

  describe('dữ liệu thiếu', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['object rỗng', {}],
    ])('trả chuỗi rỗng khi customer là %s, không ném lỗi', (_label, customer) => {
      expect(resolveCustomerDisplay(customer as CustomerDisplaySource | null | undefined)).toEqual({
        isBusiness: false,
        name: '',
        identifyNumber: '',
      })
    })

    it('coi chuỗi toàn khoảng trắng là rỗng và đi tiếp xuống đường lui', () => {
      const result = resolveCustomerDisplay({
        customer_type: CustomerType.business,
        name: '   ',
        identify_number: '',
        business_name: 'Công ty CP Đại Phát',
        business_tax_code: '0101234567',
      })

      expect(result.name).toBe('Công ty CP Đại Phát')
      expect(result.identifyNumber).toBe('0101234567')
    })

    it('customer_type thiếu thì coi như cá nhân, không đoán từ dữ liệu doanh nghiệp', () => {
      const result = resolveCustomerDisplay({ business_name: 'Công ty X' })

      expect(result.isBusiness).toBe(false)
      expect(result.name).toBe('')
    })
  })

  describe('hợp đồng với schema backend', () => {
    // Ba fixture dưới đây khai KIỂU LÀ CHÍNH SCHEMA và dựng bằng object literal, nên `tsc`
    // bắt cả field thiếu lẫn field thừa — mạnh hơn hẳn một phép gán suông. Backend đổi tên
    // hay đổi kiểu field thì đỏ ngay ở đây, thay vì để màn hình lặng lẽ hiện rỗng. Rồi vẫn
    // chạy qua helper và assert giá trị, để test này KHÔNG chỉ là khai báo kiểu.

    it('shape của DealWorkspaceOverviewCustomer — nguồn của cả ba màn trong bug', () => {
      const fromWorkspace: components['schemas']['DealWorkspaceOverviewCustomer'] = {
        id: 67,
        customer_type: CustomerType.business,
        name: 'Tập đoàn Sơn Á',
        identify_number: '89389638',
        full_name: null,
        id_number: null,
        phone: '0974125125',
        email: 'hoaan8676373785@gmail.com',
      }

      expect(resolveCustomerDisplay(fromWorkspace)).toEqual({
        isBusiness: true,
        name: 'Tập đoàn Sơn Á',
        identifyNumber: '89389638',
      })
    })

    it('shape của CustomerNested — serializer lồng dùng chung toàn app', () => {
      const fromNested: components['schemas']['CustomerNested'] = {
        id: 40,
        code: 'KH000000040',
        customer_type: CustomerType.business,
        name: 'Công ty TNHH 1',
        identify_number: '0101234567',
      }

      expect(resolveCustomerDisplay(fromNested)).toEqual({
        isBusiness: true,
        name: 'Công ty TNHH 1',
        identifyNumber: '0101234567',
      })
    })

    it('shape của Customer đầy đủ — chỉ có cặp cột thô, phải đi đường lui', () => {
      const fromFullCustomer: Pick<
        components['schemas']['Customer'],
        'customer_type' | 'full_name' | 'id_number' | 'business_name' | 'business_tax_code'
      > = {
        customer_type: CustomerType.business,
        full_name: '',
        id_number: '',
        business_name: 'Công ty CP Đại Phát',
        business_tax_code: '0312345678',
      }

      expect(resolveCustomerDisplay(fromFullCustomer)).toEqual({
        isBusiness: true,
        name: 'Công ty CP Đại Phát',
        identifyNumber: '0312345678',
      })
    })

    it('nhận diện doanh nghiệp bằng enum của schema, không bằng chuỗi gõ tay', () => {
      // Nếu backend đổi giá trị enum, `CustomerType.business` đổi theo và test này vẫn
      // đúng; một literal 'business' gõ tay thì không.
      expect(resolveCustomerDisplay({ customer_type: CustomerType.business }).isBusiness).toBe(true)
      expect(resolveCustomerDisplay({ customer_type: CustomerType.individual }).isBusiness).toBe(
        false
      )
    })
  })
})

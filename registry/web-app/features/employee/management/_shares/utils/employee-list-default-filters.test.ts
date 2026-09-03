import { describe, expect, it } from 'vitest'

import { EmployeeStatus } from '@/constants/api-schema-aliases'
import { EMPLOYEE_FILTER_STATUS_VALUES } from '@/constants/employee-filter'
import {
  EMPLOYEE_LIST_DEFAULT_INCLUDE_REPORT_EXCLUDED_POSITIONS,
  EMPLOYEE_LIST_DEFAULT_IS_OS_CODE_TYPE,
  EMPLOYEE_LIST_DEFAULT_STATUSES,
  applyEmployeeListDefaultFilters,
} from './employee-list-default-filters'

describe('employee-list-default-filters — bộ lọc mặc định màn Hồ sơ nhân viên (CR269)', () => {
  describe('giá trị mặc định', () => {
    // Ghim bằng CHUỖI LITERAL, không so với chính enum: so `EMPLOYEE_LIST_DEFAULT_STATUSES[0]`
    // với `EmployeeStatus.Active` là hai vế cùng một nguồn ⇒ phép so rỗng, đổi enum thì vẫn xanh.
    it('tích đúng 2 trạng thái: "Đang làm việc" + "Nghỉ việc hưởng chế độ thai sản"', () => {
      expect([...EMPLOYEE_LIST_DEFAULT_STATUSES]).toEqual(['Active', 'Maternity Leave'])
    })

    // Vế đối chứng cho phép assert vắng mặt ngay dưới: nếu tên trạng thái bị gõ sai thì vế này
    // đỏ trước, thay vì để "không tìm thấy" đội lốt "đúng là không có".
    it('KHÔNG tích "Đang Onboarding" và "Đã nghỉ việc" — CR269 chỉ yêu cầu 2 trạng thái', () => {
      expect([...EMPLOYEE_LIST_DEFAULT_STATUSES]).toContain(EmployeeStatus.Active)
      expect([...EMPLOYEE_LIST_DEFAULT_STATUSES]).not.toContain(EmployeeStatus.Onboarding)
      expect([...EMPLOYEE_LIST_DEFAULT_STATUSES]).not.toContain(EmployeeStatus.Resigned)
    })

    it('"Chức vụ không được tính vào báo cáo nhân sự" mặc định "Có hiển thị" (= true)', () => {
      expect(EMPLOYEE_LIST_DEFAULT_INCLUDE_REPORT_EXCLUDED_POSITIONS).toBe('true')
    })

    it('giữ nguyên "không phải nhân viên mã OS" (= false) — CR269 không đụng tới', () => {
      expect(EMPLOYEE_LIST_DEFAULT_IS_OS_CODE_TYPE).toBe('false')
    })

    // Trạng thái mặc định nằm ngoài tập bộ lọc chấp nhận ⇒ URL mang giá trị mà
    // `parseEmployeeFilterParamsFromUrl` lọc bỏ ⇒ ô tick trong pop-up không khớp URL, im lặng.
    it('mọi trạng thái mặc định đều là trạng thái bộ lọc chấp nhận', () => {
      // Khẳng định tiền đề trước: tập đối chiếu phải thật sự hẹp hơn enum, không thì phép
      // kiểm dưới đúng một cách vô nghĩa.
      expect(EMPLOYEE_FILTER_STATUS_VALUES).not.toContain(EmployeeStatus.Unpaid_Leave)
      expect(EMPLOYEE_FILTER_STATUS_VALUES).toContain(EmployeeStatus.Resigned)

      EMPLOYEE_LIST_DEFAULT_STATUSES.forEach((status) => {
        expect(EMPLOYEE_FILTER_STATUS_VALUES).toContain(status)
      })
    })
  })

  describe('applyEmployeeListDefaultFilters', () => {
    it('ghi 2 tham số statuses riêng biệt, không gộp thành một', () => {
      // Arrange
      const params = new URLSearchParams()

      // Act
      applyEmployeeListDefaultFilters(params)

      // Assert
      expect(params.getAll('statuses')).toEqual(['Active', 'Maternity Leave'])
    })

    it('ghi include_report_excluded_positions=true và is_os_code_type=false', () => {
      const params = new URLSearchParams()

      applyEmployeeListDefaultFilters(params)

      expect(params.get('include_report_excluded_positions')).toBe('true')
      expect(params.get('is_os_code_type')).toBe('false')
    })

    it('giữ nguyên các tham số không thuộc bộ lọc đã có sẵn (page, page_size)', () => {
      const params = new URLSearchParams()
      params.set('page', '1')
      params.set('page_size', '25')

      applyEmployeeListDefaultFilters(params)

      expect(params.get('page')).toBe('1')
      expect(params.get('page_size')).toBe('25')
    })

    // `statuses` là tham số đa giá trị: không xoá trước khi ghi thì lần gọi thứ hai nhân đôi nó
    // và backend nhận `Active,Maternity Leave,Active,Maternity Leave`.
    it('idempotent — gọi hai lần trên CÙNG một object vẫn ra đúng 2 statuses', () => {
      const params = new URLSearchParams()

      applyEmployeeListDefaultFilters(params)
      applyEmployeeListDefaultFilters(params)

      expect(params.getAll('statuses')).toEqual(['Active', 'Maternity Leave'])
    })

    it('ghi đè trạng thái người dùng đã chọn trước đó, không cộng dồn vào', () => {
      const params = new URLSearchParams()
      params.append('statuses', 'Resigned')

      applyEmployeeListDefaultFilters(params)

      expect(params.getAll('statuses')).toEqual(['Active', 'Maternity Leave'])
      expect(params.getAll('statuses')).not.toContain('Resigned')
    })

    it('trả lại chính đối tượng được truyền vào để nối chuỗi lời gọi', () => {
      const params = new URLSearchParams()

      expect(applyEmployeeListDefaultFilters(params)).toBe(params)
    })

    // Hai đường reset (vào màn lần đầu · nút "Xoá bộ lọc") phải cho ra URL y hệt nhau — trước
    // CR269 chúng là hai khối copy-paste và đó là chỗ hai đường trôi khỏi nhau.
    it('hai lần gọi độc lập cho ra cùng một chuỗi query', () => {
      const fromEmptyUrl = applyEmployeeListDefaultFilters(
        new URLSearchParams({ page: '1', page_size: '25' })
      )
      const fromClearAll = applyEmployeeListDefaultFilters(
        new URLSearchParams({ page: '1', page_size: '25' })
      )

      expect(fromEmptyUrl.toString()).toBe(fromClearAll.toString())
      expect(fromEmptyUrl.toString()).toContain('statuses=Active')
      expect(fromEmptyUrl.toString()).toContain('include_report_excluded_positions=true')
    })
  })
})

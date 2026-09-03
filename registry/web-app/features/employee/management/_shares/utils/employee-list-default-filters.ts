import { EmployeeStatus } from '@/constants/api-schema-aliases'
import { EMPLOYEE_FILTER_YES_NO_VALUES, TEmployeeFilter } from '@/constants/employee-filter'

/**
 * Bộ lọc mặc định của màn "Hồ sơ nhân viên" (`/employee/management`).
 *
 * CR269 — ClickUp 86eynzfft (https://app.clickup.com/t/86eynzfft), khách hàng HR yêu cầu 19/08/2026:
 *   "Trường 'Chức vụ không được tính vào báo cáo nhân sự': Mặc định chọn `Có hiển thị`."
 *   "Trường 'Trạng thái': Mặc định tích chọn 2 trạng thái: [x] Đang làm việc,
 *    [x] Nghỉ việc hưởng chế độ thai sản"
 *
 * ĐẢO CHIỀU có chủ ý so với bản đầu (commit ae96f4712, 24/06/2026 — "Danh sách nhân viên: …
 * mặc định Không hiển thị"). Sau CR269 màn này trùng màn "Nhân sự theo cấu trúc tổ chức"
 * ở `include_report_excluded_positions`, nhưng VẪN khác ở trạng thái: màn kia mặc định
 * 3 trạng thái (thêm `Onboarding`), CR269 chỉ yêu cầu 2.
 *
 * `include_report_excluded_positions` phải gửi TƯỜNG MINH: backend mặc định `false` (ẩn) khi
 * tham số vắng mặt ở request danh sách — xem SRS `hrm/5.1-employee-profile/fsd.md` §5.
 */
export const EMPLOYEE_LIST_DEFAULT_STATUSES: readonly EmployeeStatus[] = [
  EmployeeStatus.Active,
  EmployeeStatus.Maternity_Leave,
]

/** Màn này luôn loại nhân viên mã OS khỏi danh sách mặc định (không thuộc phạm vi CR269). */
export const EMPLOYEE_LIST_DEFAULT_IS_OS_CODE_TYPE: TEmployeeFilter =
  EMPLOYEE_FILTER_YES_NO_VALUES.NO

/** CR269: "Có hiển thị" — hồ sơ có chức vụ bị loại khỏi báo cáo nhân sự vẫn nằm trong danh sách. */
export const EMPLOYEE_LIST_DEFAULT_INCLUDE_REPORT_EXCLUDED_POSITIONS: TEmployeeFilter =
  EMPLOYEE_FILTER_YES_NO_VALUES.YES

/**
 * Ghi bộ lọc mặc định vào `params` (mutate rồi trả lại chính nó, đúng lối dùng của URLSearchParams).
 *
 * Dùng ở CẢ HAI đường reset về mặc định — lần đầu vào màn khi URL rỗng, và nút "Xoá bộ lọc" —
 * để hai đường không trôi khỏi nhau. Trước CR269 hai chỗ này là hai khối copy-paste và đó chính
 * là thứ bắt buộc phải sửa hai lần cho mọi thay đổi mặc định.
 *
 * Idempotent: `statuses` là tham số ĐA GIÁ TRỊ nên phải xoá trước khi ghi, không thì gọi hai lần
 * trên cùng một object sẽ nhân đôi và backend nhận `Active,Maternity Leave,Active,Maternity Leave`.
 */
export function applyEmployeeListDefaultFilters(params: URLSearchParams): URLSearchParams {
  params.delete('statuses')
  EMPLOYEE_LIST_DEFAULT_STATUSES.forEach((status) => params.append('statuses', status))
  params.set('is_os_code_type', EMPLOYEE_LIST_DEFAULT_IS_OS_CODE_TYPE)
  params.set(
    'include_report_excluded_positions',
    EMPLOYEE_LIST_DEFAULT_INCLUDE_REPORT_EXCLUDED_POSITIONS
  )
  return params
}

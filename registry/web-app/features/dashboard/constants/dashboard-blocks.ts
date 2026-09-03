import {
  ACCOUNTANT_DASHBOARD_ACTIONS,
  ACCOUNTANT_DASHBOARD_SUBJECT,
} from '@/features/dashboard/components/accounting/accountant-dashboard-constants'
import {
  SALES_ADMIN_DASHBOARD_ACTIONS,
  SALES_ADMIN_DASHBOARD_SUBJECT,
} from '@/features/dashboard/components/sales/sales-admin-dashboard-constants'
import { FEATURE_KEY, type FeatureKey } from '@/constants/feature-flags'

/**
 * Danh mục khối dùng chung cho MỌI trang dashboard.
 *
 * Vì sao tồn tại: quyền xem một khối đang nằm ở component CHA (`AccountingDashboard` /
 * `SalesAdminDashboard` kiểm `ability.can(...)` rồi mới render khối), còn bản thân khối
 * — ví dụ `DebtTrendChart` — gọi API ngay khi mount và KHÔNG tự kiểm gì. Trang thứ hai dùng
 * lại khối mà chép lại điều kiện quyền là chắc chắn lệch nhau sau vài tháng: cấp quyền mới
 * sẽ chỉ ăn ở một trang. Mọi trang phải đọc quyền từ đây.
 */
export const DASHBOARD_BLOCK = {
  EXEC_KPI_STRIP: 'exec_kpi_strip',
  COLLECTION_PROGRESS: 'collection_progress',
  DEBT_TREND: 'debt_trend',
  COMMISSION_TREND: 'commission_trend',
  REVENUE_TREND: 'revenue_trend',
  KPI_ACHIEVEMENT: 'kpi_achievement',
  EMPLOYEE_KPI: 'employee_kpi',
  DEPARTMENT_KPI: 'department_kpi',

  // Hàng đợi VẬN HÀNH — thứ trưởng phòng/giám đốc mở dashboard ra là phải xử lý ngay, khác hẳn
  // CEO chỉ đọc số. Đều dùng lại component có sẵn.
  OPERATIONS_QUEUE: 'operations_queue',
  ATTENDANCE_RATE: 'attendance_rate',
  TOP_PROJECTS_PARETO: 'top_projects_pareto',
  STAFF_GROWTH: 'staff_growth',

  // Section dùng lại NGUYÊN KHỐI cho preset phòng ban. Cố ý không băm nhỏ RecruitmentDashboard /
  // TimesheetDashboard ra từng biểu đồ: chúng đã tự gác quyền, tự trả null khi không đủ quyền, và
  // băm ra là đụng vào file đang chạy production để đổi lấy đúng một thứ ta không cần.
  SECTION_ACCOUNTING: 'section_accounting',
  SECTION_SALES_ADMIN: 'section_sales_admin',
  SECTION_RECRUITMENT: 'section_recruitment',
  SECTION_HRM_COMMON: 'section_hrm_common',
  SECTION_TIMESHEET: 'section_timesheet',
} as const

export type DashboardBlockKey = (typeof DASHBOARD_BLOCK)[keyof typeof DASHBOARD_BLOCK]

/**
 * Cặp `(action, subject)` truyền thẳng vào `useAbility().can(action, subject)`.
 *
 * MỌI khối đều phải có mục ở đây — không có ngoại lệ "khối này không cần gác". Khối nào không
 * thuộc subject dashboard thì gác bằng đúng resource nó đọc (xem chú thích trong bảng).
 */
/**
 * Khối TỰ gác quyền bên trong nó (các section dùng lại: `AccountingDashboard` & co. đều kiểm
 * `ability.can` rồi `return null` khi không đủ quyền).
 *
 * Dùng sentinel tường minh thay vì `null`/bỏ trống để phân biệt được "component tự lo" với "ai đó
 * quên khai" — quên khai thì `undefined` và test đỏ ngay.
 */
export const SELF_GATED = 'self-gated'

export type BlockGuard = readonly [action: string, subject: string] | typeof SELF_GATED

export const DASHBOARD_BLOCK_ABILITY: Record<DashboardBlockKey, BlockGuard> = {
  // Dải KPI điều hành đọc 5 endpoint (kế toán, bán hàng, realtime HRM/tuyển dụng); gác ở quyền
  // nặng nhất trong số đó. Thiếu quyền lẻ thì ô tương ứng hiện 0, không vỡ khối.
  [DASHBOARD_BLOCK.EXEC_KPI_STRIP]: [
    ACCOUNTANT_DASHBOARD_ACTIONS.SUMMARY,
    ACCOUNTANT_DASHBOARD_SUBJECT,
  ],
  [DASHBOARD_BLOCK.COLLECTION_PROGRESS]: [
    ACCOUNTANT_DASHBOARD_ACTIONS.PARTNER_TABLE,
    ACCOUNTANT_DASHBOARD_SUBJECT,
  ],
  [DASHBOARD_BLOCK.DEBT_TREND]: [
    ACCOUNTANT_DASHBOARD_ACTIONS.DEBT_TREND,
    ACCOUNTANT_DASHBOARD_SUBJECT,
  ],
  [DASHBOARD_BLOCK.COMMISSION_TREND]: [
    ACCOUNTANT_DASHBOARD_ACTIONS.COMMISSION_TREND,
    ACCOUNTANT_DASHBOARD_SUBJECT,
  ],
  [DASHBOARD_BLOCK.REVENUE_TREND]: [
    SALES_ADMIN_DASHBOARD_ACTIONS.REVENUE_TREND,
    SALES_ADMIN_DASHBOARD_SUBJECT,
  ],
  // Ba khối dưới đây KHÔNG thuộc 2 subject dashboard ở trên, nhưng vẫn phải gác — gác bằng đúng
  // resource mà khối THỰC SỰ đọc. `ability` tách permission ở dấu chấm CUỐI (ability.ts:20) nên
  // `departmentmonthlykpi.list` → can('list', 'departmentmonthlykpi').
  //
  // Bài học đã ghi ở route-permission.test.tsx: gác bằng resource khác với resource màn đọc thì
  // cấp đúng quyền vẫn bị chặn, còn muốn vào được lại phải mở nhầm một resource khác.
  [DASHBOARD_BLOCK.KPI_ACHIEVEMENT]: ['list', 'departmentmonthlykpi'],
  [DASHBOARD_BLOCK.EMPLOYEE_KPI]: ['list', 'employeemonthlykpi'],
  [DASHBOARD_BLOCK.DEPARTMENT_KPI]: ['list', 'departmentmonthlykpi'],
  // Khối tự kiểm quyền phần bán hàng bên trong; phần quản lý do BE trả rỗng khi không có quyền.
  [DASHBOARD_BLOCK.OPERATIONS_QUEUE]: SELF_GATED,
  [DASHBOARD_BLOCK.ATTENDANCE_RATE]: ['attendance_statistics', 'hrm.dashboard.common'],
  // Đọc cùng endpoint với bảng "Giao dịch theo dự án" nên gác cùng quyền.
  [DASHBOARD_BLOCK.TOP_PROJECTS_PARETO]: [
    SALES_ADMIN_DASHBOARD_ACTIONS.TRANSACTIONS_BY_PROJECT,
    SALES_ADMIN_DASHBOARD_SUBJECT,
  ],
  // Giống cách RecruitmentDashboard gác: 'recruitment_dashboard.staff_growth_by_branches_chart'.
  [DASHBOARD_BLOCK.STAFF_GROWTH]: ['staff_growth_by_branches_chart', 'recruitment_dashboard'],

  [DASHBOARD_BLOCK.SECTION_ACCOUNTING]: SELF_GATED,
  [DASHBOARD_BLOCK.SECTION_SALES_ADMIN]: SELF_GATED,
  [DASHBOARD_BLOCK.SECTION_RECRUITMENT]: SELF_GATED,
  [DASHBOARD_BLOCK.SECTION_HRM_COMMON]: SELF_GATED,
  [DASHBOARD_BLOCK.SECTION_TIMESHEET]: SELF_GATED,
}

/**
 * Cụm tính năng mà khối THUỘC VỀ — tiêu chí là **link của khối đi đâu**, không phải số lấy từ đâu.
 *
 * conventions.md đã cảnh báo và đây là chỗ từng sót: card điều hướng sang màn của cụm bị tắt thì
 * vẫn hiện và bấm vào là văng 404. `null` = không thuộc cụm bật/tắt được nào.
 */
export const DASHBOARD_BLOCK_FEATURE: Record<DashboardBlockKey, FeatureKey | null> = {
  [DASHBOARD_BLOCK.EXEC_KPI_STRIP]: FEATURE_KEY.ACCOUNTING,
  [DASHBOARD_BLOCK.COLLECTION_PROGRESS]: FEATURE_KEY.ACCOUNTING,
  [DASHBOARD_BLOCK.DEBT_TREND]: FEATURE_KEY.ACCOUNTING,
  [DASHBOARD_BLOCK.COMMISSION_TREND]: FEATURE_KEY.ACCOUNTING,
  [DASHBOARD_BLOCK.REVENUE_TREND]: FEATURE_KEY.PROJECT_SECRETARY,
  [DASHBOARD_BLOCK.KPI_ACHIEVEMENT]: FEATURE_KEY.ACCOUNTING,
  [DASHBOARD_BLOCK.EMPLOYEE_KPI]: FEATURE_KEY.ACCOUNTING,
  [DASHBOARD_BLOCK.DEPARTMENT_KPI]: FEATURE_KEY.ACCOUNTING,
  [DASHBOARD_BLOCK.OPERATIONS_QUEUE]: null,
  [DASHBOARD_BLOCK.ATTENDANCE_RATE]: null,
  [DASHBOARD_BLOCK.TOP_PROJECTS_PARETO]: FEATURE_KEY.PROJECT_SECRETARY,
  [DASHBOARD_BLOCK.STAFF_GROWTH]: null,

  [DASHBOARD_BLOCK.SECTION_ACCOUNTING]: FEATURE_KEY.ACCOUNTING,
  [DASHBOARD_BLOCK.SECTION_SALES_ADMIN]: FEATURE_KEY.PROJECT_SECRETARY,
  [DASHBOARD_BLOCK.SECTION_RECRUITMENT]: null,
  [DASHBOARD_BLOCK.SECTION_HRM_COMMON]: null,
  [DASHBOARD_BLOCK.SECTION_TIMESHEET]: null,
}

/**
 * Preset khối theo vai trò.
 *
 * Khai đủ 3 preset ngay từ đầu dù hiện chỉ `EXEC` có route: conventions.md — mở rộng từ 2 lên 3+
 * vai trò mà dùng ternary 2 nhánh là bug tiềm năng, nên dựng sẵn lookup map.
 *
 * `DIRECTOR` (GĐKD) và `MANAGER` (TPKD) CHƯA gắn route — còn chờ BE gắn data-scope cho 2 dashboard
 * viewset, nếu không họ sẽ thấy số toàn công ty. Xem plan BE Bước 2.
 */
export const DASHBOARD_PRESET = {
  EXEC: 'exec',
  DIRECTOR: 'director',
  MANAGER: 'manager',
  // Preset phòng ban — ghép từ section sẵn có, dành cho người muốn xem sâu một mảng.
  ACCOUNTING: 'accounting',
  PROJECT_SECRETARY: 'project_secretary',
  HR: 'hr',
  /** Trang `/` cũ, hiện đủ mọi khối người đó có quyền. Router xử lý riêng, không có block list. */
  FULL: 'full',
} as const

export type DashboardPreset = (typeof DASHBOARD_PRESET)[keyof typeof DASHBOARD_PRESET]

export const PRESET_BLOCKS: Record<DashboardPreset, readonly DashboardBlockKey[]> = {
  /**
   * Trang của TỔNG GIÁM ĐỐC: mỗi khối trả lời ĐÚNG MỘT câu hỏi, không có hai biểu đồ cùng trả lời
   * một câu. Bản trước có 12 khối và ba cặp trùng câu hỏi (hiệu suất khối vs đạt chỉ tiêu khối, top
   * dự án vs giao dịch theo dự án, HH phải trả vs xu hướng HH) — nhìn vào thì "đầy đủ", nhưng CEO
   * phải tự lọc, tức là ta đẩy việc lọc cho người ít thời gian nhất.
   *
   * Bốn khối bị cắt KHÔNG mất: hiệu suất khối / giao dịch theo dự án nằm trong tab "TP Thư ký KD",
   * HH phải trả trong tab "Kế toán trưởng", cọc cộng dồn có nguyên trang báo cáo riêng.
   *
   * Trật tự: số chốt trước (dải KPI 4 mảng), rồi tiền vào → chỉ tiêu → tiền đến từ đâu → tiền đang
   * kẹt → tiền phải trả → người.
   */
  [DASHBOARD_PRESET.EXEC]: [
    DASHBOARD_BLOCK.EXEC_KPI_STRIP,
    DASHBOARD_BLOCK.REVENUE_TREND,
    DASHBOARD_BLOCK.KPI_ACHIEVEMENT,
    DASHBOARD_BLOCK.TOP_PROJECTS_PARETO,
    DASHBOARD_BLOCK.DEBT_TREND,
    DASHBOARD_BLOCK.COLLECTION_PROGRESS,
    DASHBOARD_BLOCK.COMMISSION_TREND,
    DASHBOARD_BLOCK.STAFF_GROWTH,
  ],
  /**
   * GĐKD và TPKD là vai trò VẬN HÀNH, không phải vai trò đọc số: mở dashboard ra là để biết hôm
   * nay phải duyệt gì, ai chưa chấm công, KPI nào chờ đánh giá. Vì vậy hàng đợi xếp TRƯỚC, biểu đồ
   * hiệu suất xếp SAU — ngược hẳn preset điều hành.
   *
   * Chốt nghiệp vụ: cả hai KHÔNG xem công nợ và HH phải trả.
   */
  /**
   * Giám đốc kinh doanh quản NHIỀU phòng nên câu hỏi của họ là "phòng nào đang đuối", còn trưởng
   * phòng quản một phòng nên câu hỏi là "ai trong phòng đang đuối". Cùng nguồn dữ liệu, khác đơn
   * vị dòng — dùng chung một khối là sai tầm cho một trong hai.
   */
  [DASHBOARD_PRESET.DIRECTOR]: [
    DASHBOARD_BLOCK.OPERATIONS_QUEUE,
    DASHBOARD_BLOCK.ATTENDANCE_RATE,
    DASHBOARD_BLOCK.DEPARTMENT_KPI,
    DASHBOARD_BLOCK.EMPLOYEE_KPI,
  ],
  /**
   * Trưởng phòng kinh doanh quản ĐÚNG MỘT phòng, nên tầm nhìn khác hẳn CEO/GĐKD: không có khối
   * tiền của công ty, không có công nợ, mà có KPI từng người trong phòng — thứ hai preset kia
   * không cần. `KPI_ACHIEVEMENT` vẫn giữ để họ thấy phòng mình nằm đâu so với các khối.
   */
  [DASHBOARD_PRESET.MANAGER]: [
    DASHBOARD_BLOCK.OPERATIONS_QUEUE,
    DASHBOARD_BLOCK.ATTENDANCE_RATE,
    DASHBOARD_BLOCK.EMPLOYEE_KPI,
  ],

  [DASHBOARD_PRESET.ACCOUNTING]: [DASHBOARD_BLOCK.SECTION_ACCOUNTING],
  [DASHBOARD_PRESET.PROJECT_SECRETARY]: [DASHBOARD_BLOCK.SECTION_SALES_ADMIN],
  [DASHBOARD_PRESET.HR]: [
    DASHBOARD_BLOCK.SECTION_HRM_COMMON,
    DASHBOARD_BLOCK.SECTION_TIMESHEET,
    DASHBOARD_BLOCK.SECTION_RECRUITMENT,
  ],
  // FULL không đi qua PresetDashboard — router render thẳng trang cũ.
  [DASHBOARD_PRESET.FULL]: [],
}

/** Khối bị cấm với preset không phải điều hành — khoá chốt nghiệp vụ, dùng cho test. */
export const NON_EXEC_FORBIDDEN_BLOCKS: readonly DashboardBlockKey[] = [
  DASHBOARD_BLOCK.EXEC_KPI_STRIP,
  DASHBOARD_BLOCK.COLLECTION_PROGRESS,
  DASHBOARD_BLOCK.DEBT_TREND,
  DASHBOARD_BLOCK.COMMISSION_TREND,
]

/**
 * Vai trò → preset dashboard.
 *
 * Khoá là `Me.role.code` (RoleSummary.code). Mỗi user có ĐÚNG MỘT vai trò (FK đơn trên `core.User`)
 * nên không có chuyện "đội nhiều mũ" phải phân xử. Mã vai trò do BE sinh từ
 * `apps/core/fixtures/role_permissions/role_*.yaml`.
 *
 * ⚠️ Vai trò KHÔNG có trong bảng này KHÔNG phải lỗi — `resolveDashboardPreset` trả `null` và trang
 * `/` rơi về dashboard cũ y nguyên. Đây là hành vi CÓ CHỦ Ý: kế toán / TKKD / HR giữ nguyên thứ họ
 * đang thấy, chỉ vai trò được map mới đổi. Đừng "sửa" thành ném lỗi hay trang trắng.
 *
 * TODO(BE): khi BE trả thẳng `dashboard_preset` trên `/api/users/me/`, bỏ bảng này và đọc từ đó —
 * lúc ấy thêm vai trò mới chỉ là đổi cấu hình, không cần deploy FE.
 */
export const PRESET_BY_ROLE_CODE: Readonly<Record<string, DashboardPreset>> = {
  TGD: DASHBOARD_PRESET.EXEC,
  GDKD: DASHBOARD_PRESET.DIRECTOR,
  GD_CHINHANH: DASHBOARD_PRESET.DIRECTOR,
  TPKD: DASHBOARD_PRESET.MANAGER,
  // Ba vai trò trưởng bộ phận: mở dashboard ra là vào thẳng mảng của mình, không phải trang tổng
  // hợp rồi tự tìm. Mã lấy từ `apps/core/fixtures/role_permissions/role_*.yaml`.
  KETOAN_TRUONG: DASHBOARD_PRESET.ACCOUNTING,
  'TP-TKKD': DASHBOARD_PRESET.PROJECT_SECRETARY,
  TPHCNS: DASHBOARD_PRESET.HR,
}

/** `null` = không có preset riêng ⇒ dùng dashboard mặc định đang chạy. */
export function resolveDashboardPreset(
  roleCode: string | undefined | null
): DashboardPreset | null {
  if (!roleCode) return null
  return PRESET_BY_ROLE_CODE[roleCode] ?? null
}

/** Tiêu đề trang theo preset — hiện ở `PageTitle`, không phải nhãn menu (menu chỉ có một mục). */
export const PRESET_TITLE: Record<DashboardPreset, string> = {
  [DASHBOARD_PRESET.EXEC]: 'Dashboard điều hành',
  [DASHBOARD_PRESET.DIRECTOR]: 'Dashboard giám đốc kinh doanh',
  [DASHBOARD_PRESET.MANAGER]: 'Dashboard trưởng phòng kinh doanh',
  [DASHBOARD_PRESET.ACCOUNTING]: 'Dashboard kế toán trưởng',
  [DASHBOARD_PRESET.PROJECT_SECRETARY]: 'Dashboard trưởng phòng thư ký kinh doanh',
  [DASHBOARD_PRESET.HR]: 'Dashboard trưởng phòng hành chính nhân sự',
  [DASHBOARD_PRESET.FULL]: 'Tổng hợp (đầy đủ)',
}

/**
 * Nhãn NGẮN cho tab. Tiêu đề đầy đủ nằm ở `PRESET_TITLE`, dùng cho `PageTitle` khi người dùng
 * KHÔNG có tab (vai trò không được đổi bảng).
 *
 * Nhãn đặt theo MẢNG việc chứ không theo chức danh đầy đủ: thanh tab chỉ còn bốn mục nên "Kế toán"
 * / "Thư ký" / "Nhân sự" đã đủ phân biệt, mà ngắn hơn hẳn "Kế toán trưởng" / "TP Thư ký KD" /
 * "TP HCNS". Ba preset ngoài `SWITCHABLE_PRESETS` vẫn phải có nhãn ở đây vì `Record` đòi đủ khoá,
 * và vì `?preset=` gõ tay vẫn mở được chúng.
 */
export const PRESET_TAB_LABEL: Record<DashboardPreset, string> = {
  [DASHBOARD_PRESET.EXEC]: 'Tổng giám đốc',
  [DASHBOARD_PRESET.DIRECTOR]: 'GĐKD',
  [DASHBOARD_PRESET.MANAGER]: 'TPKD',
  [DASHBOARD_PRESET.ACCOUNTING]: 'Kế toán',
  [DASHBOARD_PRESET.PROJECT_SECRETARY]: 'Thư ký',
  [DASHBOARD_PRESET.HR]: 'Nhân sự',
  [DASHBOARD_PRESET.FULL]: 'Tổng hợp',
}

/**
 * Preset ghép từ section dùng lại → render thẳng, KHÔNG bọc lưới `px-7`.
 * Các section có sẵn tự mang padding (`p-10 pt-6 pb-0`) và tiêu đề `<h1>` riêng; bọc thêm là lệch lề.
 */
export const SECTION_PRESETS: readonly DashboardPreset[] = [
  DASHBOARD_PRESET.ACCOUNTING,
  DASHBOARD_PRESET.PROJECT_SECRETARY,
  DASHBOARD_PRESET.HR,
]

/**
 * Vai trò được phép ĐỔI sang dashboard khác.
 *
 * Chốt nghiệp vụ: CHỈ CEO. Vai trò khác luôn ở đúng bảng của mình, không thấy nút đổi. Đây vừa là
 * UX vừa là hàng rào: TPKD mà đổi được sang preset điều hành là thấy công nợ + HH phải trả — trái
 * điều đã chốt. Lớp bảo vệ thứ hai vẫn còn (mỗi khối tự kiểm quyền khi render), nhưng đừng dựa vào
 * mình nó.
 */
export const SWITCHABLE_ROLE_CODES: readonly string[] = ['TGD']

export function canSwitchDashboard(roleCode: string | undefined | null): boolean {
  return !!roleCode && SWITCHABLE_ROLE_CODES.includes(roleCode)
}

/**
 * Bốn bảng CEO đổi được, theo đúng thứ tự trên thanh tab — bảng của chính CEO (`EXEC`) đứng đầu.
 *
 * `DIRECTOR` / `MANAGER` / `FULL` cố ý KHÔNG có mặt: chốt với người dùng là thanh tab chỉ giữ bốn
 * mảng trên. Chúng vẫn là preset HỢP LỆ — `?preset=full` gõ tay vẫn ra trang tổng hợp cũ, kèm
 * thanh tab — chỉ là không còn đường vào bằng tab nữa. Bỏ `FULL` khỏi đây đồng nghĩa CEO không còn
 * lối bấm về trang `/` cũ; muốn trả lại thì thêm đúng một dòng vào mảng này.
 */
export const SWITCHABLE_PRESETS: readonly DashboardPreset[] = [
  DASHBOARD_PRESET.EXEC,
  DASHBOARD_PRESET.ACCOUNTING,
  DASHBOARD_PRESET.PROJECT_SECRETARY,
  DASHBOARD_PRESET.HR,
]

/**
 * Khối chiếm nguyên hàng hay nửa hàng.
 *
 * Có bảng này thì BỐ CỤC do chính `PRESET_BLOCKS` quyết định — thứ tự khối trong preset là thứ tự
 * hiển thị. Trước đó `PresetDashboard` hard-code thứ tự nên mọi preset buộc phải giống nhau, mà
 * CEO cần số trước còn trưởng phòng cần hàng đợi vận hành trước.
 */
export const BLOCK_SPAN: Record<DashboardBlockKey, 'full' | 'half'> = {
  [DASHBOARD_BLOCK.EXEC_KPI_STRIP]: 'full',
  [DASHBOARD_BLOCK.OPERATIONS_QUEUE]: 'full',
  [DASHBOARD_BLOCK.REVENUE_TREND]: 'full',
  [DASHBOARD_BLOCK.STAFF_GROWTH]: 'full',

  [DASHBOARD_BLOCK.EMPLOYEE_KPI]: 'half',
  [DASHBOARD_BLOCK.DEPARTMENT_KPI]: 'half',
  [DASHBOARD_BLOCK.KPI_ACHIEVEMENT]: 'half',
  [DASHBOARD_BLOCK.DEBT_TREND]: 'half',
  [DASHBOARD_BLOCK.COLLECTION_PROGRESS]: 'half',
  [DASHBOARD_BLOCK.TOP_PROJECTS_PARETO]: 'half',
  [DASHBOARD_BLOCK.COMMISSION_TREND]: 'half',
  [DASHBOARD_BLOCK.ATTENDANCE_RATE]: 'half',

  // Section dùng lại tự mang khung riêng — luôn nguyên hàng.
  [DASHBOARD_BLOCK.SECTION_ACCOUNTING]: 'full',
  [DASHBOARD_BLOCK.SECTION_SALES_ADMIN]: 'full',
  [DASHBOARD_BLOCK.SECTION_RECRUITMENT]: 'full',
  [DASHBOARD_BLOCK.SECTION_HRM_COMMON]: 'full',
  [DASHBOARD_BLOCK.SECTION_TIMESHEET]: 'full',
}

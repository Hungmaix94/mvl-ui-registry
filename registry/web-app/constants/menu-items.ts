import type { ComponentType } from 'react'

import {
  IconAddressbook,
  IconBooks,
  IconChartbar,
  IconChartlineup,
  IconChecksquareoffset,
  IconFiles,
  IconHouseline,
  IconKey,
  IconMegaphone,
  IconMoney,
  IconNewspaperclipping,
  IconPath,
  IconTreestructure,
  IconChats,
  IconChatscircle,
} from '../icons'
import { getForbiddenFeatures } from '@/config/environment'
import { FEATURE_KEY, type FeatureKey } from '../constants/feature-flags'
// Import thẳng từ AppRoute.constant thay vì barrel '@/routes': barrel kéo theo AppRoute.tsx
// cùng toàn bộ page/component và tạo vòng lặp import khi menu-items được nạp trước.
import { APP_PATH } from '@/routes/AppRoute.constant'
import type { TIcon } from '@/types'

export type SidebarMenuItem = {
  title: string
  icon?: ComponentType<TIcon>
  hasChildren?: boolean
  children?: Array<SidebarMenuItem>
  url?: string
  isGroupLabel?: boolean
  permission?: string | string[]
  /**
   * Cụm tính năng mà item này thuộc về. Khi cụm bị tắt qua `VITE_FORBIDDEN_FEATURES`,
   * item bị loại khỏi menu cùng toàn bộ cây con của nó.
   */
  featureKey?: FeatureKey
}

/**
 * Menu đầy đủ, CHƯA lọc theo feature flag. Consumer luôn dùng `getMenuItems()`;
 * hàm này export ra để test được cấu trúc menu tách rời khỏi biến môi trường.
 */
export function buildMenuItems(): Array<SidebarMenuItem> {
  return [
    {
      title: 'Dashboard',
      icon: IconHouseline,
      url: APP_PATH.DASHBOARD,
      hasChildren: false,
    },
    {
      title: '📊 Phân Hệ CRM & Marketing',
      icon: IconChartlineup,
      hasChildren: true,
      children: [
        {
          title: 'Auto Lead Ads Round-Robin',
          url: 'http://localhost:3002/crm/leads/auto-routing',
          permission: 'crm:lead_routing',
        },
        {
          title: 'Theo Dõi SLA 7 Ngày Lead',
          url: 'http://localhost:3002/crm/leads/sla-monitor',
          permission: 'crm:sla_monitor',
        },
        {
          title: 'Duyệt Giao Dịch Co-Sale',
          url: 'http://localhost:3002/crm/cosale/approvals',
          permission: 'crm:cosale_approve',
        },
      ],
    },
    {
      title: 'Sơ đồ tổ chức',
      icon: IconTreestructure,
      hasChildren: true,
      children: [
        {
          title: 'Quản lý chi nhánh',
          url: APP_PATH.BRANCH_MANAGEMENT,
          hasChildren: false,
          permission: 'branch.list',
        },
        {
          title: 'Quản lý khối',
          url: APP_PATH.BLOCK_MANAGEMENT,
          hasChildren: false,
          permission: 'block.list',
        },
        {
          title: 'Quản lý phòng ban',
          url: APP_PATH.DEPARTMENT_MANAGEMENT,
          hasChildren: false,
          permission: 'department.list',
        },
        {
          title: 'Quản lý chức vụ',
          url: APP_PATH.POSITION_MANAGEMENT,
          hasChildren: false,
          permission: 'position.list',
        },
      ],
    },
    {
      title: 'Phân quyền',
      icon: IconKey,
      hasChildren: true,
      children: [
        {
          title: 'Quản lý quyền',
          url: APP_PATH.PERMISSION_MANAGEMENT,
          hasChildren: false,
          permission: 'permission.list',
        },
        {
          title: 'Quản lý vai trò',
          url: APP_PATH.PERMISSION_ROLE_MANAGEMENT,
          hasChildren: false,
          permission: 'role.list',
        },
        {
          title: 'Quản lý nhân viên theo vai trò',
          url: APP_PATH.PERMISSION_EMPLOYEE_MANAGEMENT_BY_ROLE,
          hasChildren: false,
          permission: 'employee_role.list',
        },
      ],
    },
    {
      title: 'Theo dõi thao tác người dùng',
      icon: IconPath,
      url: APP_PATH.USER_ACTION_TRACKING,
      hasChildren: false,
      permission: 'audit_logging.search',
    },
    {
      title: 'Tuyển dụng',
      icon: IconMegaphone,
      hasChildren: true,
      children: [
        {
          title: 'Kênh tuyển dụng',
          url: APP_PATH.RECRUITMENT_CHANNEL,
          hasChildren: false,
          permission: 'recruitment_channel.list',
        },
        {
          title: 'Nguồn tuyển dụng',
          url: APP_PATH.RECRUITMENT_SOURCE,
          hasChildren: false,
          permission: 'recruitment_source.list',
        },
        {
          title: 'Mô tả công việc (JD)',
          url: APP_PATH.RECRUITMENT_JOB_DESCRIPTION,
          hasChildren: false,
          permission: 'job_description.list',
        },
        {
          title: 'Đề nghị tuyển dụng',
          url: APP_PATH.RECRUITMENT_REQUEST,
          hasChildren: false,
          permission: 'recruitment_request.list',
        },
        {
          title: 'Ứng viên',
          url: APP_PATH.RECRUITMENT_CANDIDATE,
          hasChildren: false,
          permission: 'recruitment_candidate.list',
        },
        {
          title: 'Lịch phỏng vấn',
          url: APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE,
          hasChildren: false,
          permission: 'interview_schedule.list',
        },
        {
          title: 'Chi phí tuyển dụng',
          url: APP_PATH.RECRUITMENT_EXPENSE,
          hasChildren: false,
          permission: 'recruitment_expense.list',
        },
      ],
    },
    {
      title: 'Nhân sự',
      icon: IconAddressbook,
      hasChildren: true,
      children: [
        {
          title: 'Nhân viên',
          url: APP_PATH.EMPLOYEE_MANAGEMENT,
          hasChildren: false,
          permission: 'employee.list',
        },
        {
          title: 'Nhân viên theo cấu trúc tổ chức',
          url: APP_PATH.EMPLOYEE_ORG_TREE,
          hasChildren: false,
          permission: 'employee.list',
        },
        {
          title: 'Số tài khoản ngân hàng',
          url: APP_PATH.EMPLOYEE_BANK_ACCOUNT,
          hasChildren: false,
          permission: 'employee_bank_account.list',
        },
        {
          title: 'Ban lãnh đạo',
          url: APP_PATH.EMPLOYEE_LEADERSHIP,
          hasChildren: false,
          permission: 'employee.leader_list',
        },
        {
          title: 'Bằng cấp, chứng chỉ môi giới',
          url: APP_PATH.EMPLOYEE_CERTIFICATE,
          hasChildren: false,
          permission: 'employee_certificate.list',
        },
        {
          title: 'Quan hệ nhân thân',
          url: APP_PATH.EMPLOYEE_RELATION,
          hasChildren: false,
          permission: 'employee_relationship.list',
        },
        {
          title: 'Người phụ thuộc',
          url: APP_PATH.EMPLOYEE_DEPENDENT,
          hasChildren: false,
          permission: 'employee_dependent.list',
        },
      ],
    },
    {
      title: 'Đánh giá KPI',
      icon: IconChartlineup,
      hasChildren: true,
      children: [
        {
          title: 'Cấu trúc KPI',
          url: APP_PATH.KPI_STRUCTURE,
          hasChildren: false,
          permission: 'payroll.kpi_config',
        },
        {
          title: 'Tiêu chí đánh giá KPI',
          url: APP_PATH.KPI_CRITERIA,
          hasChildren: false,
          permission: 'kpi_criterion.list',
        },
        {
          title: 'Phiếu đánh giá KPI theo kỳ',
          url: APP_PATH.KPI_PERIOD_EVALUATION,
          hasChildren: false,
          permission: 'kpi_assessment_period.list',
        },
        {
          title: 'Phiếu đánh giá KPI theo đơn vị',
          url: APP_PATH.KPI_UNIT_EVALUATION,
          hasChildren: false,
          permission: 'kpi_assessment_period.list',
        },
        {
          title: 'Đánh giá nhân viên',
          url: APP_PATH.KPI_MANAGER_PERIOD_EVALUATION,
          hasChildren: false,
          permission: 'employee_manager_assessment.list',
        },
        {
          title: 'Bảng tổng kết KPI kỳ',
          url: APP_PATH.KPI_PERIOD_SUMMARY,
          hasChildren: false,
          permission: 'kpi_assessment_period.summary',
        },
      ],
    },
    {
      title: 'Báo cáo',
      icon: IconChartbar,
      hasChildren: true,
      children: [
        {
          title: 'Tuyển dụng',
          hasChildren: true,
          children: [
            {
              title: 'Tăng trưởng nhân sự theo ngày',
              hasChildren: false,
              url: APP_PATH.REPORT_RECRUITMENT_STAFF_GROWTH_WEEKLY,
              permission: 'recruitment_reports.staff_growth',
            },
            {
              title: 'Nguồn tuyển dụng',
              hasChildren: false,
              url: APP_PATH.REPORT_RECRUITMENT_SOURCE,
              permission: 'recruitment_reports.recruitment_source',
            },
            {
              title: 'Kênh tuyển dụng',
              hasChildren: false,
              url: APP_PATH.REPORT_RECRUITMENT_CHANNEL,
              permission: 'recruitment_reports.recruitment_channel',
            },
            {
              title: 'Chi phí tuyển dụng theo nguồn',
              hasChildren: false,
              url: APP_PATH.REPORT_RECRUITMENT_EXPENSE_BY_SOURCE,
              permission: 'recruitment_reports.recruitment_cost',
            },
            {
              title: 'Chi phí tuyển dụng theo nhân sự',
              hasChildren: false,
              url: APP_PATH.REPORT_RECRUITMENT_EXPENSE_BY_STAFF,
              permission: 'recruitment_reports.cost_by_payer',
            },
            {
              title: 'Chi phí giới thiệu',
              hasChildren: false,
              url: APP_PATH.REPORT_RECRUITMENT_REFERRAL_EXPENSE,
              permission: 'recruitment_reports.referral_cost',
            },
            {
              title: 'Ứng viên nhận việc',
              hasChildren: false,
              url: APP_PATH.REPORT_RECRUITMENT_HIRED_CANDIDATE,
              permission: 'recruitment_reports.hired_candidate',
            },
          ],
        },
        {
          title: 'Nhân sự',
          hasChildren: true,
          children: [
            {
              title: 'Số lượng nghỉ việc',
              hasChildren: false,
              url: APP_PATH.REPORT_STAFF_TURNOVER,
              permission: 'employee_reports.employee_resigned_breakdown',
            },
            {
              title: 'Số lượng nhân sự',
              hasChildren: false,
              url: APP_PATH.REPORT_STAFF_STATISTICS,
              permission: 'employee_reports.employee_status_breakdown',
            },
            {
              title: 'Tỉ lệ lý do nghỉ việc',
              hasChildren: false,
              url: APP_PATH.REPORT_STAFF_RESIGNED_REASON,
              permission: 'employee_reports.employee_resigned_reasons_summary',
            },
            {
              title: 'Thâm niên nhân viên',
              hasChildren: false,
              url: APP_PATH.REPORT_STAFF_SENIORITY,
              permission: 'employee_seniority_report.list',
            },
            {
              title: 'Báo cáo chuyển đổi loại nhân viên',
              hasChildren: false,
              url: APP_PATH.REPORT_STAFF_TYPE_CONVERSION,
              permission: 'employee_type_conversion_report.list',
            },
            {
              title: 'Đánh giá chất lượng nhân sự',
              hasChildren: false,
              url: APP_PATH.REPORT_STAFF_SALES_REVENUE,
              permission: 'sales_revenue_report.list',
            },
            {
              title: 'Nhân sự vào - nghỉ',
              hasChildren: false,
              url: APP_PATH.REPORT_STAFF_IN_OUT,
              permission: 'employee_reports.staff_in_out_report',
            },
            {
              title: 'Điều chuyển công tác',
              hasChildren: false,
              url: APP_PATH.REPORT_STAFF_JOB_TRANSFER,
              permission: 'job_transfer_report.list',
            },
          ],
        },
        {
          title: 'Chấm công',
          hasChildren: true,
          children: [
            {
              title: 'Thống kê chấm công theo phương thức',
              hasChildren: false,
              url: APP_PATH.REPORT_ATTENDANCE_METHOD,
              permission: 'recruitment_reports.by_method',
            },
            {
              title: 'Thống kê chấm công theo dự án',
              hasChildren: false,
              url: APP_PATH.REPORT_ATTENDANCE_PROJECT,
              permission: 'recruitment_reports.by_project',
            },
            {
              title: 'Thống kê chấm công theo đơn vị trên từng dự án',
              hasChildren: false,
              url: APP_PATH.REPORT_ATTENDANCE_PROJECT_UNIT,
              permission: 'recruitment_reports.by_project_organization',
            },
            {
              title: 'Báo cáo chưa chấm công',
              hasChildren: false,
              url: APP_PATH.REPORT_ATTENDANCE_UNCHECKIN,
              permission: 'recruitment_reports.by_uncheckin',
            },
          ],
        },
      ],
    },
    {
      title: 'Chấm công',
      icon: IconChecksquareoffset,
      hasChildren: true,
      children: [
        {
          title: 'Máy chấm công',
          url: APP_PATH.ATTENDANCE_DEVICE,
          hasChildren: false,
          permission: 'attendance_device.list',
        },
        {
          title: 'Wifi chấm công',
          url: APP_PATH.ATTENDANCE_WIFI_DEVICE,
          hasChildren: false,
          permission: 'wifi_attendance_device.list',
        },
        {
          title: 'Định vị dự án',
          url: APP_PATH.PROJECT_LOCATION_MANAGEMENT,
          hasChildren: false,
          permission: 'attendance_geolocation.list',
        },
        {
          title: 'Lịch làm việc',
          url: APP_PATH.ATTENDANCE_WORKING_SCHEDULE,
          hasChildren: false,
        },
        {
          title: 'Ngày lễ',
          url: APP_PATH.HOLIDAY_MANAGEMENT,
          hasChildren: false,
          permission: 'holiday.list',
        },
        {
          title: 'Danh sách miễn chấm công',
          url: APP_PATH.ATTENDANCE_EXEMPTION,
          hasChildren: false,
          permission: 'attendance_exemption.list',
        },
        {
          title: 'Bảng chấm công',
          url: APP_PATH.ATTENDANCE_TIMESHEET,
          hasChildren: false,
          permission: 'timesheet.list',
        },
        {
          title: 'Nhân sự chấm công hàng ngày',
          url: APP_PATH.ATTENDANCE_DAILY_TIMESHEET,
          hasChildren: false,
          permission: 'timesheet_daily_entry.list',
        },
        {
          title: 'Log chấm công',
          url: APP_PATH.ATTENDANCE_LOG,
          hasChildren: false,
          permission: 'attendance_record.first_attendance',
        },
        {
          title: 'Chấm công khác',
          url: APP_PATH.ATTENDANCE_OTHER,
          hasChildren: false,
          permission: 'attendance_record.list',
        },
        {
          title: 'Xác nhận công',
          url: APP_PATH.ATTENDANCE_TIMESHEET_COMPLAINT,
          hasChildren: false,
          permission: 'proposal_timesheet_entry_complaint.list',
        },
      ],
    },
    {
      title: 'Quyết định/đề xuất',
      icon: IconNewspaperclipping,
      hasChildren: true,
      children: [
        {
          title: 'Quyết định',
          url: APP_PATH.DECISION_MANAGEMENT,
          hasChildren: false,
          permission: 'decision.list',
        },
        {
          title: 'Đề xuất',
          url: APP_PATH.PROPOSAL_MANAGEMENT,
          hasChildren: true,
          permission: 'proposal.list',
          children: [
            {
              title: 'Danh sách cần duyệt',
              url: APP_PATH.PROPOSAL_MANAGE,
              hasChildren: false,
              permission: 'proposal_verifier.mine',
            },
            {
              title: 'Toàn bộ đề xuất',
              url: APP_PATH.PROPOSAL_LIST,
              hasChildren: false,
              permission: 'proposal.list',
            },
            {
              title: 'Nghỉ phép không lương',
              url: APP_PATH.PROPOSAL_UNPAID_LEAVE,
              hasChildren: false,
              permission: 'proposal_unpaid_leave.list',
            },
            {
              title: 'Nghỉ phép có lương',
              url: APP_PATH.PROPOSAL_PAID_LEAVE,
              hasChildren: false,
              permission: 'proposal_paid_leave.list',
            },
            {
              title: 'Làm việc thêm giờ (OT)',
              url: APP_PATH.PROPOSAL_OVERTIME_WORK,
              hasChildren: false,
              permission: 'proposal_overtime_work.list',
            },
            {
              title: 'Miễn trừ trễ',
              url: APP_PATH.PROPOSAL_LATE_EXEMPTION,
              hasChildren: false,
              permission: 'proposal_late_exemption.list',
            },
            {
              title: 'Nghỉ việc hưởng chế độ thai sản',
              url: APP_PATH.PROPOSAL_MATERNITY_LEAVE,
              hasChildren: false,
              permission: 'proposal_maternity_leave.list',
            },
            {
              title: 'Chế độ làm việc hậu thai sản',
              url: APP_PATH.PROPOSAL_POST_MATERNITY_BENEFIT,
              hasChildren: false,
              permission: 'proposal_post_maternity_benefits.list',
            },
            {
              title: 'Điều chuyển công tác',
              url: APP_PATH.PROPOSAL_JOB_TRANSFER,
              hasChildren: false,
              permission: 'proposal_job_transfer.list',
            },
            {
              title: 'Điều chuyển công tác hàng loạt',
              url: APP_PATH.PROPOSAL_BULK_JOB_TRANSFER,
              hasChildren: false,
              permission: 'proposal_bulk_job_transfer.list',
            },
            {
              title: 'Cấp tài sản',
              url: APP_PATH.PROPOSAL_ASSET_ALLOCATION,
              hasChildren: false,
              permission: 'proposal_asset_allocation.list',
            },
            {
              title: 'Đổi thiết bị',
              url: APP_PATH.PROPOSAL_DEVICE_CHANGE,
              hasChildren: false,
              permission: 'proposal_device_change.list',
            },
            {
              title: 'Quay lại làm việc',
              url: APP_PATH.PROPOSAL_RETURN_TO_WORK,
              hasChildren: false,
              permission: 'proposal_return_to_work.list',
            },
            {
              title: 'Nghỉ chế độ',
              url: APP_PATH.PROPOSAL_STATUTORY_LEAVE,
              hasChildren: false,
              permission: 'proposal_statutory_leave.list',
            },
          ],
        },
      ],
    },
    {
      title: 'Hợp đồng',
      icon: IconFiles,
      hasChildren: true,
      children: [
        {
          title: 'Loại hợp đồng',
          url: APP_PATH.CONTRACT_TYPE,
          hasChildren: false,
          permission: 'contract_type.list',
        },
        {
          title: 'Quản lý hợp đồng',
          url: APP_PATH.CONTRACT_MANAGE,
          hasChildren: false,
          permission: 'contract.list',
        },
        {
          title: 'Phụ lục hợp đồng',
          url: APP_PATH.CONTRACT_APPENDIX,
          hasChildren: false,
          permission: 'contract_appendix.list',
        },
        {
          title: 'Đánh giá hợp đồng',
          hasChildren: true,
          children: [
            // Phiếu đánh giá của tôi (NV self-service) do mobile xử lý — không xuất hiện ở menu web.
            {
              title: 'Phiếu cần duyệt',
              url: APP_PATH.CONTRACT_EVALUATION_MANAGER,
              hasChildren: false,
              permission: 'contract_evaluation_manager.list',
            },
            {
              title: 'Quản lý phiếu (HR)',
              url: APP_PATH.CONTRACT_EVALUATION_HR,
              hasChildren: false,
              permission: 'contract_evaluation_hr.list',
            },
          ],
        },
      ],
    },
    {
      title: 'Tính lương',
      icon: IconNewspaperclipping,
      hasChildren: true,
      children: [
        {
          title: 'Cấu hình lương',
          url: APP_PATH.PAYROLL_CONFIGURATION,
          hasChildren: false,
          permission: 'payroll.view_salary_config',
        },
        {
          title: 'Kỳ lương',
          url: APP_PATH.PAYROLL_PERIOD,
          hasChildren: false,
          permission: 'salary_period.list',
        },
        {
          title: 'Truy thu/Truy lĩnh',
          url: APP_PATH.RECOVERY_VOUCHER,
          hasChildren: false,
          permission: 'payroll.recovery_voucher.list',
        },
        {
          title: 'Xử phạt',
          url: APP_PATH.PENALTY_MANAGEMENT,
          hasChildren: false,
          permission: 'payroll.penalty_ticket.list',
        },
        {
          title: 'Công tác phí',
          url: APP_PATH.TRAVEL_EXPENSE,
          hasChildren: false,
          permission: 'payroll.travel_expense.list',
        },
        {
          title: 'Doanh thu kinh doanh',
          url: APP_PATH.SALES_REVENUE,
          hasChildren: false,
          permission: 'sales_revenue.list',
        },
      ],
    },
    {
      title: 'Thư viện điện tử',
      icon: IconBooks,
      featureKey: FEATURE_KEY.ELIBRARY,
      hasChildren: true,
      children: [
        {
          title: 'Danh mục tài liệu',
          url: APP_PATH.ELIBRARY_CATEGORY,
          hasChildren: false,
          permission: 'elibrary_category.list',
        },
        {
          title: 'Tài liệu cá nhân',
          url: APP_PATH.ELIBRARY_MY_DOCUMENTS,
          hasChildren: false,
          permission: 'elibrary_item.my_documents',
        },
        {
          title: 'Tài liệu phòng ban',
          url: APP_PATH.ELIBRARY_DEPARTMENT_DOCUMENTS,
          hasChildren: false,
          permission: 'elibrary_item.department_documents',
        },
        {
          title: 'Tài liệu toàn công ty',
          url: APP_PATH.ELIBRARY_COMPANY_DOCUMENTS,
          hasChildren: false,
          permission: 'elibrary_item.list',
        },
        {
          title: 'Tài liệu chia sẻ với tôi',
          url: APP_PATH.ELIBRARY_SHARED_WITH_ME_DOCUMENTS,
          hasChildren: false,
          permission: 'elibrary_item.shared_with_me',
        },
        {
          title: 'Yêu cầu truy cập',
          url: APP_PATH.ELIBRARY_ACCESS_REQUESTS,
          hasChildren: false,
          permission: 'elibrary_access_request.list',
        },
      ],
    },
    {
      title: 'Thư ký dự án',
      icon: IconMoney,
      featureKey: FEATURE_KEY.PROJECT_SECRETARY,
      hasChildren: true,
      children: [
        {
          title: 'Dự án',
          hasChildren: true,
          children: [
            {
              title: 'Quản lý dự án',
              url: APP_PATH.PROJECT_MANAGEMENT,
              hasChildren: false,
              permission: 'project.list',
            },
            {
              title: 'Quản lý thông tin bán hàng',
              url: APP_PATH.PROJECT_SALE_ALLOCATIONS,
              hasChildren: false,
              permission: 'project.list',
            },
            {
              title: 'Quản lý bất động sản',
              url: APP_PATH.PROJECT_PRODUCT_INVENTORIES,
              hasChildren: false,
              permission: 'project.list',
            },
            {
              title: 'Quản lý chủ đầu tư',
              url: APP_PATH.INVESTOR_MANAGEMENT,
              hasChildren: false,
              permission: 'investor.list',
            },
            {
              title: 'Nguồn sàn',
              url: APP_PATH.SOURCE_EXCHANGE_MANAGEMENT,
              hasChildren: false,
              permission: 'exchange.list',
            },
            {
              title: 'Sàn liên kết',
              url: APP_PATH.EXCHANGE_MANAGEMENT,
              hasChildren: false,
              permission: 'exchange.list',
            },
          ],
        },
        {
          title: 'Hợp đồng & giao dịch',
          hasChildren: true,
          children: [
            {
              title: 'Quản lý khách hàng',
              url: APP_PATH.CUSTOMER_MANAGER,
              hasChildren: false,
              permission: 'customer.list',
            },
            {
              title: 'Hợp đồng đặt chỗ',
              url: APP_PATH.PROJECT_BOOKING_CONTRACT,
              hasChildren: false,
              permission: 'booking.list',
            },
            {
              title: 'Hoàn tiền đặt chỗ',
              url: APP_PATH.PROJECT_REFUND_BOOKING,
              hasChildren: false,
              permission: 'booking_refund.list',
            },
            {
              // Nhãn phải trùng `AppRoute.constant.ts` (breadcrumb + H1 của chính màn này),
              // nếu không sidebar và tiêu đề trang gọi cùng một màn bằng hai cái tên.
              title: 'Hợp đồng đặt cọc',
              url: APP_PATH.DEPOSIT_CONTRACT,
              hasChildren: false,
              permission: 'deposit_contract.list',
            },
            {
              title: 'Danh sách giao dịch',
              url: APP_PATH.DEAL,
              hasChildren: false,
              permission: 'deal.list',
            },
            {
              title: 'Phiếu thông tin giao dịch',
              url: APP_PATH.TRANSACTION_SHEET,
              hasChildren: false,
              permission: 'transaction_sheet.list',
            },
            {
              // Chỉ còn một mục: bản 2.0 đứng trên path chuẩn, bản 1.0 đã rút khỏi menu + route.
              title: 'Đối chiếu chủ đầu tư',
              url: APP_PATH.INVESTOR_RECONCILIATION,
              hasChildren: false,
              permission: 'investor_reconciliation_sheet.list',
            },
            {
              title: 'Đối chiếu F2',
              url: APP_PATH.F2_RECONCILIATION,
              hasChildren: false,
              permission: 'f2_reconciliation_sheet.list',
            },
            {
              title: 'Đối chiếu CTV',
              url: APP_PATH.CTV_RECONCILIATION,
              hasChildren: false,
              permission: 'ctv_reconciliation.list',
            },
            {
              title: 'Đề xuất hỗ trợ phí bán hàng',
              url: APP_PATH.FEE_SUPPORT_PROPOSAL,
              hasChildren: false,
              permission: 'fee_support.list',
            },
            {
              title: 'Tạm ứng hoa hồng',
              hasChildren: true,
              children: [
                {
                  title: 'Phiếu đề xuất tạm ứng hoa hồng',
                  url: APP_PATH.COMMISSION_ADVANCE,
                  hasChildren: false,
                  permission: 'commissionadvance.list',
                },
                {
                  title: 'Quỹ tạm ứng thưởng CĐT theo dự án',
                  url: APP_PATH.INVESTOR_ADVANCE,
                  hasChildren: false,
                  permission: 'investor_advance_account.list',
                },
              ],
            },
          ],
        },
        {
          title: 'Báo cáo',
          hasChildren: true,
          children: [
            {
              title: 'Tổng quan doanh thu theo tháng',
              url: APP_PATH.REPORT_SALES_OVERVIEW,
              hasChildren: false,
              permission: 'sales.admindashboard.revenue_trend',
            },
            {
              title: 'Doanh số theo Khối kinh doanh',
              url: APP_PATH.REPORT_SALES_BY_DIVISION,
              hasChildren: false,
              permission: 'reports.tkkdrevenuegoodsblock.get',
            },
            {
              title: 'Doanh số theo Chi nhánh',
              url: APP_PATH.REPORT_SALES_BY_BRANCH,
              hasChildren: false,
              permission: 'reports.tkkdrevenuegoodsbranch.get',
            },
            {
              title: 'Doanh số theo Phòng kinh doanh',
              url: APP_PATH.REPORT_SALES_BY_DEPARTMENT,
              hasChildren: false,
              permission: 'reports.tkkdrevenuegoodsdept.get',
            },
            {
              title: 'Doanh số theo Dự án',
              url: APP_PATH.REPORT_SALES_BY_PROJECT,
              hasChildren: false,
              permission: 'reports.tkkdrevenuegoodsproject.get',
            },
            {
              title: 'Ma trận Dự án x Khối kinh doanh',
              url: APP_PATH.REPORT_SALES_MATRIX,
              hasChildren: false,
            },
            {
              title: 'Thu - Chi tiền khách',
              url: APP_PATH.REPORT_SALES_CUSTOMER_CASH_FLOW,
              hasChildren: false,
              permission: 'reports.customercashflow.get',
            },
            {
              title: 'Cọc cộng dồn theo Chi nhánh',
              url: APP_PATH.REPORT_SALES_DEPOSIT_CUMULATIVE_BY_BRANCH,
              hasChildren: false,
              permission: 'reports.tkkddepositcumulativebranch.get',
            },
            {
              title: 'Cọc cộng dồn theo Khối kinh doanh',
              url: APP_PATH.REPORT_SALES_DEPOSIT_CUMULATIVE_BY_BLOCK,
              hasChildren: false,
              permission: 'reports.tkkddepositcumulativeblock.get',
            },
          ],
        },
      ],
    },
    {
      title: 'Kế toán',
      icon: IconMoney,
      featureKey: FEATURE_KEY.ACCOUNTING,
      hasChildren: true,
      children: [
        {
          title: 'Cấu hình',
          hasChildren: true,
          children: [
            {
              title: 'Tài khoản ngân hàng',
              url: APP_PATH.COMPANY_BANK_ACCOUNT_MANAGEMENT,
              hasChildren: false,
              permission: 'companybankaccount.list',
            },
            {
              title: 'Kỳ kế toán',
              url: APP_PATH.ACCOUNTING_PERIOD_MANAGEMENT,
              hasChildren: false,
              permission: 'accountingperiod.list',
            },
            {
              title: 'Quy định HH theo KPI',
              url: APP_PATH.KPI_COMMISSION_RULE,
              hasChildren: false,
              permission: 'kpicommissionrule.list',
            },
            {
              title: 'Định mức HH phòng hỗ trợ',
              url: APP_PATH.SUPPORT_DEPT_COMMISSION_RATE,
              hasChildren: false,
              permission: 'supportdeptcommissionrateconfig.list',
            },
            {
              title: 'Chỉ tiêu phòng SLK',
              url: APP_PATH.COMM_SLK_DEPT,
              hasChildren: false,
              permission: 'linkedexchangetarget.list',
            },
          ],
        },
        {
          title: 'Đối tác',
          hasChildren: true,
          children: [
            {
              title: 'Cộng tác viên',
              url: APP_PATH.COLLABORATOR_MANAGEMENT,
              hasChildren: false,
              permission: 'collaborator.list',
            },
            {
              title: 'Hợp đồng CTV',
              url: APP_PATH.COLLABORATOR_CONTRACT_MANAGEMENT,
              hasChildren: false,
              permission: 'collaborator_contract.list',
            },
            {
              title: 'Chứng chỉ môi giới (CTV)',
              url: APP_PATH.BROKER_CERTIFICATE_MANAGEMENT,
              hasChildren: false,
              permission: 'brokercertificate.list',
            },
          ],
        },
        {
          title: 'Giao dịch',
          hasChildren: true,
          children: [
            {
              title: 'Hóa đơn bán ra',
              url: APP_PATH.SALES_INVOICE,
              hasChildren: false,
              permission: 'salesinvoice.list',
            },
            {
              title: 'Hóa đơn đầu vào',
              url: APP_PATH.INPUT_INVOICE,
              hasChildren: false,
              permission: 'inputinvoice.list',
            },
            {
              title: 'Phiếu thu',
              url: APP_PATH.RECEIPT_VOUCHER,
              hasChildren: false,
              permission: 'receiptvoucher.list',
            },
            {
              title: 'Phiếu chi',
              url: APP_PATH.PAYMENT_VOUCHER_MANAGEMENT,
              hasChildren: false,
              permission: 'paymentvoucher.list',
            },
            {
              title: 'Giao dịch tiền về đợt này',
              url: APP_PATH.DEAL_PERIOD_ALLOCATION,
              hasChildren: false,
              // Phải khớp route guard trong AppRoute.tsx — `list` dùng chung với
              // "Chia HH theo tháng" nên không phân biệt được hai màn.
              permission: 'dealperiodworksheet.admin_preview',
            },
          ],
        },
        {
          title: 'Hoa hồng sale',
          hasChildren: true,
          children: [
            {
              title: 'Chia HH theo tháng',
              url: APP_PATH.MONTHLY_COMMISSION_SPLIT_SHEET,
              hasChildren: false,
              permission: 'dealperiodworksheet.list',
            },
            {
              title: 'HH theo tháng — Sale',
              url: APP_PATH.COMMISSION_SALE_MONTHLY,
              hasChildren: false,
              permission: 'salesmonthlycommissionsummary.list',
            },
            {
              title: 'HH theo tháng — F2',
              url: APP_PATH.COMMISSION_F2_MONTHLY,
              hasChildren: false,
              permission: 'f2monthlycommissionsummary.list',
            },
            {
              title: 'HH theo tháng — CTV',
              url: APP_PATH.COMMISSION_CTV_MONTHLY,
              hasChildren: false,
              permission: 'collaboratormonthlycommissionsummary.list',
            },
            {
              title: 'Tạm giữ HH Sale',
              url: APP_PATH.COMMISSION_HOLD,
              hasChildren: false,
              permission: 'commissionhold.list',
            },
          ],
        },
        {
          title: 'Hoa hồng quản lý',
          hasChildren: true,
          children: [
            {
              title: 'Bảng theo dõi doanh thu Xúc tiến',
              url: APP_PATH.PROMOTION_DISTRIBUTION_TRACKING,
              hasChildren: false,
              permission: 'promotion_distribution.list',
            },
            {
              title: 'Hoa hồng Giám đốc dự án',
              url: APP_PATH.DIRECTOR_COMMISSION_TRACKING,
              hasChildren: false,
              permission: 'project_director_commission.list',
            },
            {
              title: 'Hoa hồng theo doanh thu',
              url: APP_PATH.COMMISSION_BY_REVENUE,
              hasChildren: false,
              // Phải khớp route guard trong AppRoute.tsx — màn đọc department-monthly-kpi.
              permission: 'departmentmonthlykpi.list',
            },
            {
              title: 'HH theo tháng — Quản lý',
              url: APP_PATH.COMMISSION_MANAGER_MONTHLY,
              hasChildren: false,
              permission: 'managementmonthlycommissionsummary.list',
            },
            {
              title: 'HH theo tháng — Sàn liên kết',
              url: APP_PATH.COMMISSION_SLK_MONTHLY,
              hasChildren: false,
              permission: 'linkedexchangemonthlycommission.list',
            },
            {
              title: 'HH theo tháng — Phòng ban',
              url: APP_PATH.DEPARTMENT_MONTHLY_KPI,
              hasChildren: false,
              permission: 'departmentcommissionpool.list',
            },
            // {
            //   title: 'Tổng kết HH theo người',
            //   url: APP_PATH.COMM_EMPLOYEE_PAYROLL,
            //   hasChildren: false,
            //   permission: 'employeemonthlycommissionsummary.list',
            // },
          ],
        },
        {
          title: 'Đợt đi tiền',
          url: APP_PATH.EMPLOYEE_PAYOUT_BATCH,
          hasChildren: false,
          permission: 'employeepayoutbatch.list',
        },

        {
          title: 'Đợt thưởng nhập ngoài',
          url: APP_PATH.IMPORTED_BONUS_BATCH,
          hasChildren: false,
          permission: 'imported_bonus_batch.list',
        },
        {
          title: 'Báo cáo',
          hasChildren: true,
          children: [
            {
              title: '21.3 Theo dõi dư nợ hoàn ứng của nhân sự',
              url: APP_PATH.REPORT_ACCOUNTING_ADVANCE,
              hasChildren: false,
              permission: 'reports.advancesettlement.get',
            },
            {
              title: '21.10 Tổng thu nhập theo người thực nhận',
              url: APP_PATH.REPORT_ACCOUNTING_INCOME_BY_RECIPIENT,
              hasChildren: false,
              permission: 'reports.incomebyrecipient.get',
            },
            {
              title: '20.16 Báo cáo công nợ của CĐT (theo dự án)',
              url: APP_PATH.REPORT_ACCOUNTING_PROJECT_RECEIVABLE,
              hasChildren: false,
              permission: 'reports.projectreceivable.get',
            },
            // {
            //   title: '20.16 Báo cáo công nợ đối tác',
            //   url: APP_PATH.REPORT_ACCOUNTING_PARTNER_DEBT,
            //   hasChildren: false,
            //   permission: 'reports.partnerdebt.get',
            // },
            {
              title: '20.16 Đối chiếu chi tiết căn',
              url: APP_PATH.REPORT_ACCOUNTING_INVESTOR_INVOICE_RECONCILIATION,
              hasChildren: false,
              permission: 'reports.investorinvoice.get',
            },
            {
              title: '20.9 Thanh toán HH F2/Sàn',
              url: APP_PATH.REPORT_COMMISSION_PAYMENT_F2,
              hasChildren: false,
              permission: 'reports.f2paymentlist.get',
            },
            {
              title: '20.14 HHQL bảng Tổng',
              url: APP_PATH.REPORT_ACCOUNTING_MANAGEMENT_COMMISSION_SUMMARY,
              hasChildren: false,
              permission: 'commissionpayroll.list',
            },
            // {
            //   title: '21.2 Báo cáo tổng hợp dự án (tháng + lũy tiến năm)',
            //   url: APP_PATH.REPORT_ACCOUNTING_INTERNAL_REPORT,
            //   hasChildren: false,
            //   permission: 'reports.totalreceivables.get',
            // },
            {
              title: '20.16 Báo cáo theo chi nhánh và F2',
              url: APP_PATH.REPORT_ACCOUNTING_BRANCH_F2_REPORT,
              hasChildren: false,
              permission: ['reports.partnerdebt.get', 'reports.f2debt.get'],
            },
            {
              title: '21.4 Báo cáo tổng hợp thuế và thu nhập năm',
              url: APP_PATH.REPORT_ACCOUNTING_ANNUAL_TAX_INCOME,
              hasChildren: false,
              permission: 'reports.beneficiarycommission.get',
            },
            {
              title: '21.7 Báo cáo chi tiết HH bán hàng tháng',
              url: APP_PATH.REPORT_ACCOUNTING_SALES_COMMISSION_PAYOUT,
              hasChildren: false,
              permission: 'reports.salescommissionpayout.get',
            },
            {
              title: '21.6 Danh sách các dự án về tiền tháng',
              url: APP_PATH.REPORT_ACCOUNTING_PROJECT_MONEY_IN,
              hasChildren: false,
              permission: 'reports.projectmoneyin.get',
            },
            {
              title: '21.8 Doanh thu theo chi nhánh',
              url: APP_PATH.REPORT_ACCOUNTING_REVENUE_BY_BRANCH,
              hasChildren: false,
              permission: 'reports.revenuebybranch.get',
            },
            {
              title: '21.9 Các căn đã về tiền chưa chi hết',
              url: APP_PATH.REPORT_ACCOUNTING_UNITS_NOT_FULLY_PAID,
              hasChildren: false,
              permission: 'reports.unitsnotfullypaid.get',
            },
            {
              title: '21.11 Tổng thu nhập nội bộ theo người đứng tên bán hàng',
              url: APP_PATH.REPORT_ACCOUNTING_INCOME_BY_SALESPERSON,
              hasChildren: false,
              permission: 'reports.incomebysalesperson.get',
            },
            {
              title: '21.13 Báo cáo HHQL theo dự án',
              url: APP_PATH.REPORT_ACCOUNTING_HHQL_BY_PROJECT,
              hasChildren: false,
              permission: 'reports.hhqlbyproject.get',
            },
            {
              title: '21.12 Tổng hợp theo dự án (tháng + lũy tiến năm)',
              url: APP_PATH.REPORT_ACCOUNTING_PROJECT_SUMMARY,
              hasChildren: false,
              permission: 'reports.projectsummary.get',
            },
            {
              title: '21.5 Báo cáo công nợ CĐT theo Lô áp dụng',
              url: APP_PATH.REPORT_ACCOUNTING_LAD_DEBT,
              hasChildren: false,
              permission: 'reports.laddebt.get',
            },
          ],
        },
      ],
    },
    {
      title: 'Trò chuyện',
      icon: IconChats,
      featureKey: FEATURE_KEY.CHAT,
      url: APP_PATH.CHAT,
      hasChildren: false,
    },
    {
      title: 'Group Chat',
      icon: IconChatscircle,
      featureKey: FEATURE_KEY.GROUP_CHAT,
      url: APP_PATH.CHAT_GROUP_CHANNELS,
      hasChildren: false,
      permission: 'chat_channel.list',
    },
  ]
}

/**
 * Loại bỏ những item thuộc cụm tính năng đang bị tắt, kèm toàn bộ cây con của chúng.
 * Đệ quy để một item cấp bất kỳ gắn `featureKey` đều được xử lý đúng.
 */
export function removeForbiddenFeatureItems(
  items: Array<SidebarMenuItem>,
  forbiddenFeatures: ReadonlySet<FeatureKey>
): Array<SidebarMenuItem> {
  if (forbiddenFeatures.size === 0) {
    return items
  }

  return items
    .filter((item) => !item.featureKey || !forbiddenFeatures.has(item.featureKey))
    .map((item) =>
      item.children
        ? { ...item, children: removeForbiddenFeatureItems(item.children, forbiddenFeatures) }
        : item
    )
}

/**
 * Menu đã lọc theo `VITE_FORBIDDEN_FEATURES`.
 *
 * Đây là điểm cắt duy nhất: cả `AppSidebar` lẫn `MenuSearchDialog` (Alt+K / Cmd+K)
 * đều lấy menu từ đây nên tự động ăn theo cấu hình.
 */
export function getMenuItems(): Array<SidebarMenuItem> {
  return removeForbiddenFeatureItems(buildMenuItems(), getForbiddenFeatures())
}

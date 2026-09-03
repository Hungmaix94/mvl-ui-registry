// Route definitions array
import type { TAppPath } from '@/types'

export const APP_PATH = {
  // Public routes
  HOME: '/',
  ABOUT: '/about',
  CONTACT: '/contact',
  EXAMPLE: '/example',
  // Public elibrary share-link viewer (accessible without login)
  DOCS_PREVIEW: '/docs/:token',

  // Auth routes
  LOGIN: '/login',
  LOGIN_OTP: '/login/otp',
  LOGIN_FORGOT_PASSWORD: '/login/forgot-password',
  LOGIN_RENEW_PASSWORD: '/login/renew-password',
  FORGOT_PASSWORD: '/forgot-password',

  // Protected routes
  DASHBOARD: '/',
  CHANGE_PASSWORD: '/change-password',

  ORG_CHAR: '/org-chart',
  BRANCH_MANAGEMENT: '/org-chart/branch-management',
  BRANCH_MANAGEMENT_DETAIL: '/org-chart/branch-management/:id',
  BRANCH_MANAGEMENT_EDIT: '/org-chart/branch-management/:id/edit',
  BRANCH_MANAGEMENT_CREATE: '/org-chart/branch-management/new',
  BRANCH_MANAGEMENT_HISTORY: '/org-chart/branch-management/:id/history',
  BRANCH_MANAGEMENT_HISTORY_DETAIL: '/org-chart/branch-management/:id/history/:log_id',

  BLOCK_MANAGEMENT: '/org-chart/block-management',
  BLOCK_MANAGEMENT_DETAIL: '/org-chart/block-management/:id',
  BLOCK_MANAGEMENT_EDIT: '/org-chart/block-management/:id/edit',
  BLOCK_MANAGEMENT_CREATE: '/org-chart/block-management/new',
  BLOCK_MANAGEMENT_HISTORY: '/org-chart/block-management/:id/history',
  BLOCK_MANAGEMENT_HISTORY_DETAIL: '/org-chart/block-management/:id/history/:log_id',

  DEPARTMENT_MANAGEMENT: '/org-chart/department-management',
  DEPARTMENT_CREATE_NEW: '/org-chart/department-management/new',
  DEPARTMENT_MANAGEMENT_DETAIL: '/org-chart/department-management/:id',
  DEPARTMENT_MANAGEMENT_EDIT: '/org-chart/department-management/:id/edit',
  DEPARTMENT_MANAGEMENT_HISTORY: '/org-chart/department-management/:id/history',
  DEPARTMENT_MANAGEMENT_HISTORY_DETAIL: '/org-chart/department-management/:id/history/:log_id',

  POSITION_MANAGEMENT: '/org-chart/position-management',
  POSITION_MANAGEMENT_DETAIL: '/org-chart/position-management/:id',
  POSITION_MANAGEMENT_EDIT: '/org-chart/position-management/:id/edit',
  POSITION_MANAGEMENT_CREATE: '/org-chart/position-management/new',
  POSITION_MANAGEMENT_HISTORY: '/org-chart/position-management/:id/history',
  POSITION_MANAGEMENT_HISTORY_DETAIL: '/org-chart/position-management/:id/history/:log_id',

  PERMISSION: '/permission',
  PERMISSION_MANAGEMENT: '/permission/management',
  PERMISSION_ROLE_MANAGEMENT: '/permission/role-management',
  PERMISSION_ROLE_MANAGEMENT_DETAIL: '/permission/role-management/:id',
  PERMISSION_ROLE_MANAGEMENT_EDIT: '/permission/role-management/:id/edit',
  PERMISSION_ROLE_MANAGEMENT_CREATE: '/permission/role-management/new',
  PERMISSION_ROLE_MANAGEMENT_HISTORY: '/permission/role-management/:id/history',
  PERMISSION_ROLE_MANAGEMENT_HISTORY_DETAIL: '/permission/role-management/:id/history/:log_id',

  PERMISSION_EMPLOYEE_MANAGEMENT_BY_ROLE: '/permission/employee-by-role',
  PERMISSION_EMPLOYEE_MANAGEMENT_BY_ROLE_BULK_EDIT: '/permission/employee-by-role/bulk-edit',

  USER_ACTION_TRACKING: '/user-action-tracking',
  USER_ACTION_TRACKING_DETAIL: '/user-action-tracking/:id',

  // =========================================
  RECRUITMENT: '/recruitment',
  // -----------------------------------------
  RECRUITMENT_CHANNEL: '/recruitment/channel',
  RECRUITMENT_CHANNEL_CREATE: '/recruitment/channel/new',
  RECRUITMENT_CHANNEL_DETAIL: '/recruitment/channel/:id',
  RECRUITMENT_CHANNEL_EDIT: '/recruitment/channel/:id/edit',
  RECRUITMENT_CHANNEL_HISTORY: '/recruitment/channel/:id/history',
  RECRUITMENT_CHANNEL_HISTORY_DETAIL: '/recruitment/channel/:id/history/:log_id',

  RECRUITMENT_SOURCE: '/recruitment/source',
  RECRUITMENT_SOURCE_CREATE: '/recruitment/source/new',
  RECRUITMENT_SOURCE_DETAIL: '/recruitment/source/:id',
  RECRUITMENT_SOURCE_EDIT: '/recruitment/source/:id/edit',
  RECRUITMENT_SOURCE_HISTORY: '/recruitment/source/:id/history',
  RECRUITMENT_SOURCE_HISTORY_DETAIL: '/recruitment/source/:id/history/:log_id',

  RECRUITMENT_EXPENSE: '/recruitment/expense',
  RECRUITMENT_EXPENSE_CREATE: '/recruitment/expense/new',
  RECRUITMENT_EXPENSE_DETAIL: '/recruitment/expense/:id',
  RECRUITMENT_EXPENSE_EDIT: '/recruitment/expense/:id/edit',
  RECRUITMENT_EXPENSE_HISTORY: '/recruitment/expense/:id/history',
  RECRUITMENT_EXPENSE_HISTORY_DETAIL: '/recruitment/expense/:id/history/:log_id',

  RECRUITMENT_JOB_DESCRIPTION: '/recruitment/job-description',
  RECRUITMENT_JOB_DESCRIPTION_CREATE: '/recruitment/job-description/new',
  RECRUITMENT_JOB_DESCRIPTION_DETAIL: '/recruitment/job-description/:id',
  RECRUITMENT_JOB_DESCRIPTION_EDIT: '/recruitment/job-description/:id/edit',
  RECRUITMENT_JOB_DESCRIPTION_HISTORY: '/recruitment/job-description/:id/history',
  RECRUITMENT_JOB_DESCRIPTION_HISTORY_DETAIL: '/recruitment/job-description/:id/history/:log_id',

  RECRUITMENT_REQUEST: '/recruitment/request',
  RECRUITMENT_REQUEST_CREATE: '/recruitment/request/new',
  RECRUITMENT_REQUEST_DETAIL: '/recruitment/request/:id',
  RECRUITMENT_REQUEST_EDIT: '/recruitment/request/:id/edit',
  RECRUITMENT_REQUEST_HISTORY: '/recruitment/request/:id/history',
  RECRUITMENT_REQUEST_HISTORY_DETAIL: '/recruitment/request/:id/history/:log_id',

  RECRUITMENT_CANDIDATE: '/recruitment/candidate',
  RECRUITMENT_CANDIDATE_CREATE: '/recruitment/candidate/new',
  RECRUITMENT_CANDIDATE_DETAIL: '/recruitment/candidate/:id',
  RECRUITMENT_CANDIDATE_EDIT: '/recruitment/candidate/:id/edit',
  RECRUITMENT_CANDIDATE_HISTORY: '/recruitment/candidate/:id/history',
  RECRUITMENT_CANDIDATE_HISTORY_DETAIL: '/recruitment/candidate/:id/history/:log_id',

  RECRUITMENT_INTERVIEW_SCHEDULE: '/recruitment/interview-schedule',
  RECRUITMENT_INTERVIEW_SCHEDULE_CREATE: '/recruitment/interview-schedule/new',
  RECRUITMENT_INTERVIEW_SCHEDULE_DETAIL: '/recruitment/interview-schedule/:id',
  RECRUITMENT_INTERVIEW_SCHEDULE_EDIT: '/recruitment/interview-schedule/:id/edit',
  RECRUITMENT_INTERVIEW_SCHEDULE_HISTORY: '/recruitment/interview-schedule/:id/history',
  RECRUITMENT_INTERVIEW_SCHEDULE_HISTORY_DETAIL:
    '/recruitment/interview-schedule/:id/history/:log_id',

  // =========================================
  EMPLOYEE: '/employee',
  // -----------------------------------------
  EMPLOYEE_MANAGEMENT: '/employee/management',
  EMPLOYEE_MANAGEMENT_CREATE: '/employee/management/new',
  EMPLOYEE_MANAGEMENT_DETAIL: '/employee/management/:id',
  EMPLOYEE_MANAGEMENT_EDIT: '/employee/management/:id/edit',
  EMPLOYEE_MANAGEMENT_HISTORY: '/employee/management/:id/history',
  EMPLOYEE_MANAGEMENT_HISTORY_DETAIL: '/employee/management/:id/history/:log_id',

  EMPLOYEE_LEADERSHIP: '/employee/leadership',

  EMPLOYEE_CERTIFICATE: '/employee/certificate',
  EMPLOYEE_CERTIFICATE_CREATE: '/employee/certificate/new',
  EMPLOYEE_CERTIFICATE_DETAIL: '/employee/certificate/:id',
  EMPLOYEE_CERTIFICATE_EDIT: '/employee/certificate/:id/edit',
  EMPLOYEE_CERTIFICATE_HISTORY: '/employee/certificate/:id/history',
  EMPLOYEE_CERTIFICATE_HISTORY_DETAIL: '/employee/certificate/:id/history/:log_id',

  EMPLOYEE_RELATION: '/employee/relation',
  EMPLOYEE_RELATION_CREATE: '/employee/relation/new',
  EMPLOYEE_RELATION_DETAIL: '/employee/relation/:id',
  EMPLOYEE_RELATION_EDIT: '/employee/relation/:id/edit',
  EMPLOYEE_RELATION_HISTORY: '/employee/relation/:id/history',
  EMPLOYEE_RELATION_HISTORY_DETAIL: '/employee/relation/:id/history/:log_id',

  EMPLOYEE_DEPENDENT: '/employee/dependent',
  EMPLOYEE_DEPENDENT_CREATE: '/employee/dependent/new',
  EMPLOYEE_DEPENDENT_DETAIL: '/employee/dependent/:id',
  EMPLOYEE_DEPENDENT_EDIT: '/employee/dependent/:id/edit',
  EMPLOYEE_DEPENDENT_HISTORY: '/employee/dependent/:id/history',
  EMPLOYEE_DEPENDENT_HISTORY_DETAIL: '/employee/dependent/:id/history/:log_id',

  EMPLOYEE_ORG_TREE: '/employee/org-tree',

  EMPLOYEE_BANK_ACCOUNT: '/employee/bank-accounts',

  EMPLOYEE_HISTORY: '/employee/history',
  EMPLOYEE_HISTORY_CREATE: '/employee/history/new',
  EMPLOYEE_HISTORY_DETAIL: '/employee/history/:id',
  EMPLOYEE_HISTORY_EDIT: '/employee/history/:id/edit',

  // =========================================
  REPORT: '/report',
  // _________________________________________
  REPORT_RECRUITMENT: '/report/recruitment',
  // -----------------------------------------
  REPORT_RECRUITMENT_STAFF_GROWTH_WEEKLY: '/report/recruitment/staff-growth-weekly',
  REPORT_RECRUITMENT_SOURCE: '/report/recruitment/source',
  REPORT_RECRUITMENT_CHANNEL: '/report/recruitment/channel',
  REPORT_RECRUITMENT_EXPENSE_BY_SOURCE: '/report/recruitment/expense-by-source',
  REPORT_RECRUITMENT_EXPENSE_BY_STAFF: '/report/recruitment/expense-by-staff',
  REPORT_RECRUITMENT_REFERRAL_EXPENSE: '/report/recruitment/referral-expense',
  REPORT_RECRUITMENT_HIRED_CANDIDATE: '/report/recruitment/hired-candidate',
  // -----------------------------------------
  REPORT_STAFF: '/report/staff',
  // _________________________________________
  REPORT_STAFF_TURNOVER: '/report/staff/turnover',
  REPORT_STAFF_STATISTICS: '/report/staff/statistics',
  REPORT_STAFF_RESIGNED_REASON: '/report/staff/resigned-reason',
  REPORT_STAFF_SENIORITY: '/report/staff/seniority',
  REPORT_STAFF_TYPE_CONVERSION: '/report/staff/type-conversion',
  REPORT_STAFF_SALES_REVENUE: '/report/staff/sales-revenue',
  REPORT_STAFF_IN_OUT: '/report/staff/in-out',
  REPORT_STAFF_JOB_TRANSFER: '/report/staff/job-transfer',
  // _________________________________________
  REPORT_ATTENDANCE: '/report/attendance',
  // _________________________________________
  REPORT_ATTENDANCE_METHOD: '/report/attendance/method',
  REPORT_ATTENDANCE_PROJECT: '/report/attendance/project',
  REPORT_ATTENDANCE_PROJECT_UNIT: '/report/attendance/unit-project',
  REPORT_ATTENDANCE_UNCHECKIN: '/report/attendance/uncheckin',

  // SALES REPORTS (thuộc menu "Thư ký dự án" → base /project-admin/report)

  REPORT_SALES_OVERVIEW: '/project-admin/report/sales-overview',
  REPORT_SALES_BY_DIVISION: '/project-admin/report/by-division',
  REPORT_SALES_BY_DIVISION_DETAIL: '/project-admin/report/by-division/:id',
  REPORT_SALES_BY_BRANCH: '/project-admin/report/by-branch',
  REPORT_SALES_BY_BRANCH_DETAIL: '/project-admin/report/by-branch/:id',
  REPORT_SALES_BY_DEPARTMENT: '/project-admin/report/by-department',
  REPORT_SALES_BY_DEPARTMENT_DETAIL: '/project-admin/report/by-department/:id',
  REPORT_SALES_BY_PROJECT: '/project-admin/report/by-project',
  REPORT_SALES_BY_PROJECT_DETAIL: '/project-admin/report/by-project/:id',
  REPORT_SALES_MATRIX: '/project-admin/report/matrix',
  REPORT_SALES_CUSTOMER_CASH_FLOW: '/project-admin/report/customer-cash-flow',
  REPORT_SALES_CUSTOMER_CASH_DETAIL: '/project-admin/report/customer-cash-detail',
  REPORT_SALES_DEPOSIT_CUMULATIVE_BY_BRANCH: '/project-admin/report/deposit-cumulative-by-branch',
  REPORT_SALES_DEPOSIT_CUMULATIVE_BY_BLOCK: '/project-admin/report/deposit-cumulative-by-block',

  // _________________________________________

  // =========================================
  ATTENDANCE: '/attendance',
  // -----------------------------------------
  ATTENDANCE_DEVICE: '/attendance/device',
  ATTENDANCE_DEVICE_CREATE: '/attendance/device/new',
  ATTENDANCE_DEVICE_DETAIL: '/attendance/device/:id',
  ATTENDANCE_DEVICE_EDIT: '/attendance/device/:id/edit',
  ATTENDANCE_DEVICE_HISTORY: '/attendance/device/:id/history',
  ATTENDANCE_DEVICE_HISTORY_DETAIL: '/attendance/device/:id/history/:log_id',

  ATTENDANCE_WIFI_DEVICE: '/attendance/wifi-device',
  ATTENDANCE_WIFI_DEVICE_CREATE: '/attendance/wifi-device/new',
  ATTENDANCE_WIFI_DEVICE_DETAIL: '/attendance/wifi-device/:id',
  ATTENDANCE_WIFI_DEVICE_EDIT: '/attendance/wifi-device/:id/edit',
  ATTENDANCE_WIFI_DEVICE_HISTORY: '/attendance/wifi-device/:id/history',
  ATTENDANCE_WIFI_DEVICE_HISTORY_DETAIL: '/attendance/wifi-device/:id/history/:log_id',

  ATTENDANCE_WORKING_SCHEDULE: '/attendance/working-schedule',

  ATTENDANCE_TIMESHEET: '/attendance/timesheet',
  ATTENDANCE_TIMESHEET_DETAIL: '/attendance/timesheet/:entryId',
  ATTENDANCE_TIMESHEET_HISTORY: '/attendance/timesheet/:id/history',
  ATTENDANCE_TIMESHEET_HISTORY_DETAIL: '/attendance/timesheet/:id/history/:log_id',
  ATTENDANCE_TIMESHEET_COMPLAINT: '/attendance/complaint',
  ATTENDANCE_TIMESHEET_COMPLAINT_DETAIL: '/attendance/complaint/:id',
  ATTENDANCE_TIMESHEET_COMPLAINT_HISTORY: '/attendance/complaint/:id/history',
  ATTENDANCE_TIMESHEET_COMPLAINT_HISTORY_DETAIL: '/attendance/complaint/:id/history/:log_id',

  ATTENDANCE_DAILY_TIMESHEET: '/attendance/daily-timesheet',

  ATTENDANCE_LOG: '/attendance/log',
  ATTENDANCE_OTHER: '/attendance/other-attendance',
  ATTENDANCE_OTHER_HISTORY: '/attendance/other-attendance/:id/history',
  ATTENDANCE_OTHER_HISTORY_DETAIL: '/attendance/other-attendance/:id/history/:log_id',

  ATTENDANCE_EXEMPTION: '/attendance/exemption',
  ATTENDANCE_EXEMPTION_HISTORY: '/attendance/exemption/:id/history',
  ATTENDANCE_EXEMPTION_HISTORY_DETAIL: '/attendance/exemption/:id/history/:log_id',

  HOLIDAY_MANAGEMENT: '/attendance/holiday-management',
  HOLIDAY_MANAGEMENT_CREATE: '/attendance/holiday-management/new',
  HOLIDAY_MANAGEMENT_DETAIL: '/attendance/holiday-management/:id',
  HOLIDAY_MANAGEMENT_EDIT: '/attendance/holiday-management/:id/edit',
  HOLIDAY_MANAGEMENT_HISTORY: '/attendance/holiday-management/:id/history',
  HOLIDAY_MANAGEMENT_HISTORY_DETAIL: '/attendance/holiday-management/:id/history/:log_id',

  PROJECT_LOCATION_MANAGEMENT: '/attendance/project-location',
  PROJECT_LOCATION_CREATE: '/attendance/project-location/new',
  PROJECT_LOCATION_DETAIL: '/attendance/project-location/:id',
  PROJECT_LOCATION_EDIT: '/attendance/project-location/:id/edit',
  PROJECT_LOCATION_HISTORY: '/attendance/project-location/:id/history',
  PROJECT_LOCATION_HISTORY_DETAIL: '/attendance/project-location/:id/history/:log_id',

  // =========================================
  // "Thư ký dự án" (Project Admin) — base + 3 sub-group Outlet (project /
  // contract-transaction / report). Segment feature dùng số ít.
  PROJECT_ADMIN: '/project-admin',
  PROJECT_ADMIN_REPORT: '/project-admin/report',
  // -----------------------------------------
  // Sub-group "Dự án" = /project-admin/project (PROJECT tái dùng làm namespace nhóm)
  PROJECT: '/project-admin/project',
  // -----------------------------------------
  PROJECT_MANAGEMENT: '/project-admin/project/management',
  PROJECT_MANAGEMENT_CREATE: '/project-admin/project/management/new',
  PROJECT_MANAGEMENT_DETAIL: '/project-admin/project/management/:id',
  PROJECT_MANAGEMENT_EDIT: '/project-admin/project/management/:id/edit',
  PROJECT_MANAGEMENT_HISTORY: '/project-admin/project/management/:id/history',
  PROJECT_MANAGEMENT_HISTORY_DETAIL: '/project-admin/project/management/:id/history/:log_id',
  PROJECT_MANAGEMENT_DOCUMENTS: '/project-admin/project/management/:id/documents',
  PROJECT_MANAGEMENT_DOCUMENT_CREATE: '/project-admin/project/management/:id/documents/new',

  PROJECT_SALE_ALLOCATIONS: '/project-admin/project/sale-allocation',
  PROJECT_SALE_ALLOCATIONS_CREATE: '/project-admin/project/sale-allocation/new',
  PROJECT_SALE_ALLOCATIONS_DETAIL: '/project-admin/project/sale-allocation/:id',
  PROJECT_SALE_ALLOCATIONS_EDIT: '/project-admin/project/sale-allocation/:id/edit',
  PROJECT_SALE_ALLOCATIONS_HISTORY: '/project-admin/project/sale-allocation/:id/history',
  PROJECT_SALE_ALLOCATIONS_HISTORY_DETAIL:
    '/project-admin/project/sale-allocation/:id/history/:log_id',

  PROJECT_SA_TBC_MANAGEMENT_EDIT:
    '/project-admin/project/sale-allocation/:saId/tbc-management/:id/edit',
  PROJECT_SA_TBC_MANAGEMENT_CREATE:
    '/project-admin/project/sale-allocation/:saId/tbc-management/new',

  PROJECT_SA_TBC_COMMISSION_DETAIL:
    '/project-admin/project/sale-allocation/:saId/tbc-commissions/:id',
  PROJECT_SA_TBC_COMMISSION_EDIT:
    '/project-admin/project/sale-allocation/:saId/tbc-commissions/:id/edit',
  PROJECT_SA_TBC_COMMISSION_CREATE:
    '/project-admin/project/sale-allocation/:saId/tbc-commissions/new',

  PROJECT_SA_TBC_F2_CREATE: '/project-admin/project/sale-allocation/:saId/tbc-f2/new',
  PROJECT_SA_TBC_F2_EDIT: '/project-admin/project/sale-allocation/:saId/tbc-f2/:id/edit',

  PROJECT_PRODUCT_INVENTORIES: '/project-admin/project/product-inventory',
  PROJECT_PRODUCT_INVENTORIES_CREATE: '/project-admin/project/product-inventory/new',
  PROJECT_PRODUCT_INVENTORIES_DETAIL: '/project-admin/project/product-inventory/:id',
  PROJECT_PRODUCT_INVENTORIES_EDIT: '/project-admin/project/product-inventory/:id/edit',

  PROJECT_PRODUCT_INVENTORIES_TBC_CREATE: '/project-admin/project/product-inventory/:id/tbc/create',
  PROJECT_PRODUCT_INVENTORIES_TBC_EDIT: '/project-admin/project/product-inventory/:id/tbc/:tbcId',

  PROJECT_PRODUCT_INVENTORIES_MANAGEMENT_CREATE:
    '/project-admin/project/product-inventory/:id/tbc-management/create',
  PROJECT_PRODUCT_INVENTORIES_MANAGEMENT_EDIT:
    '/project-admin/project/product-inventory/:id/tbc-management/:tbcId',

  PROJECT_PRODUCT_INVENTORIES_F2_CREATE: '/project-admin/project/product-inventory/:id/tbc-f2/new',
  PROJECT_PRODUCT_INVENTORIES_F2_EDIT:
    '/project-admin/project/product-inventory/:id/tbc-f2/:tbcId/edit',

  PROJECT_PRODUCT_INVENTORIES_HISTORY: '/project-admin/project/product-inventory/:id/history',
  PROJECT_PRODUCT_INVENTORIES_HISTORY_DETAIL:
    '/project-admin/project/product-inventory/:id/history/:log_id',

  // -----------------------------------------
  // Chủ đầu tư (feature dưới sub-group "Dự án")
  INVESTOR_MANAGEMENT: '/project-admin/project/investor',
  INVESTOR_MANAGEMENT_CREATE: '/project-admin/project/investor/new',
  INVESTOR_MANAGEMENT_DETAIL: '/project-admin/project/investor/:id',
  INVESTOR_MANAGEMENT_EDIT: '/project-admin/project/investor/:id/edit',
  INVESTOR_MANAGEMENT_HISTORY: '/project-admin/project/investor/:id/history',
  INVESTOR_MANAGEMENT_HISTORY_DETAIL: '/project-admin/project/investor/:id/history/:log_id',

  // -----------------------------------------
  // Sàn liên kết (feature dưới sub-group "Dự án")
  EXCHANGE_MANAGEMENT: '/project-admin/project/exchange',
  EXCHANGE_MANAGEMENT_CREATE: '/project-admin/project/exchange/new',
  EXCHANGE_MANAGEMENT_DETAIL: '/project-admin/project/exchange/:id',
  EXCHANGE_MANAGEMENT_EDIT: '/project-admin/project/exchange/:id/edit',
  EXCHANGE_MANAGEMENT_HISTORY: '/project-admin/project/exchange/:id/history',
  EXCHANGE_MANAGEMENT_HISTORY_DETAIL: '/project-admin/project/exchange/:id/history/:log_id',

  // -----------------------------------------
  // Nguồn sàn (feature dưới sub-group "Dự án")
  SOURCE_EXCHANGE_MANAGEMENT: '/project-admin/project/source-exchange',
  SOURCE_EXCHANGE_MANAGEMENT_CREATE: '/project-admin/project/source-exchange/new',
  SOURCE_EXCHANGE_MANAGEMENT_DETAIL: '/project-admin/project/source-exchange/:id',
  SOURCE_EXCHANGE_MANAGEMENT_EDIT: '/project-admin/project/source-exchange/:id/edit',
  SOURCE_EXCHANGE_MANAGEMENT_HISTORY: '/project-admin/project/source-exchange/:id/history',
  SOURCE_EXCHANGE_MANAGEMENT_HISTORY_DETAIL:
    '/project-admin/project/source-exchange/:id/history/:log_id',

  // Nhóm "Hợp đồng & giao dịch" — booking/refund là feature dưới contract-transaction
  PROJECT_REFUND_BOOKING: '/project-admin/contract-transaction/refund-booking',
  PROJECT_REFUND_BOOKING_CREATE: '/project-admin/contract-transaction/refund-booking/new',
  PROJECT_REFUND_BOOKING_DETAIL: '/project-admin/contract-transaction/refund-booking/:id',
  PROJECT_REFUND_BOOKING_EDIT: '/project-admin/contract-transaction/refund-booking/:id/edit',

  PROJECT_BOOKING_CONTRACT: '/project-admin/contract-transaction/booking-contract',
  PROJECT_BOOKING_CONTRACT_CREATE: '/project-admin/contract-transaction/booking-contract/new',
  PROJECT_BOOKING_CONTRACT_DETAIL: '/project-admin/contract-transaction/booking-contract/:id',
  PROJECT_BOOKING_CONTRACT_EDIT: '/project-admin/contract-transaction/booking-contract/:id/edit',
  PROJECT_BOOKING_CONTRACT_REFUND:
    '/project-admin/contract-transaction/booking-contract/:id/refund',
  PROJECT_BOOKING_CONTRACT_HISTORY:
    '/project-admin/contract-transaction/booking-contract/:id/history',
  PROJECT_BOOKING_CONTRACT_HISTORY_DETAIL:
    '/project-admin/contract-transaction/booking-contract/:id/history/:log_id',

  // =========================================
  KPI: '/kpi',
  // -----------------------------------------
  KPI_STRUCTURE: '/kpi/structure',
  KPI_CRITERIA: '/kpi/criteria',
  KPI_PERIOD_EVALUATION: '/kpi/period-evaluation',
  KPI_PERIOD_EVALUATION_DETAIL: '/kpi/period-evaluation/:id',
  KPI_ASSESSMENT_DETAIL: '/kpi/assessment/:id',
  KPI_ASSESSMENT_ASSESS: '/kpi/assessment/:id/assess',
  KPI_ASSESSMENT_HISTORY: '/kpi/assessment/:id/history',
  KPI_ASSESSMENT_HISTORY_DETAIL: '/kpi/assessment/:id/history/:log_id',
  KPI_PERIOD_SUMMARY: '/kpi/period-summary',
  KPI_PERIOD_SUMMARY_DETAIL: '/kpi/period-summary/:id',
  KPI_PERIOD_SUMMARY_EMPLOYEE_DETAIL: '/kpi/period-summary/:id/:departmentId',
  KPI_UNIT_EVALUATION: '/kpi/unit-evaluation',
  KPI_UNIT_EVALUATION_DETAIL: '/kpi/unit-evaluation/:id',
  KPI_MANAGER_PERIOD_EVALUATION: '/kpi/manager/period-evaluation',
  KPI_MANAGER_PERIOD_EVALUATION_DETAIL: '/kpi/manager/period-evaluation/:id',
  KPI_MANAGER_ASSESSMENT_DETAIL: '/kpi/manager/assessment/:id',
  KPI_MANAGER_ASSESSMENT_ASSESS: '/kpi/manager/assessment/:id/assess',
  KPI_MANAGER_ASSESSMENT_HISTORY: '/kpi/manager/assessment/:id/history',
  KPI_MANAGER_ASSESSMENT_HISTORY_DETAIL: '/kpi/manager/assessment/:id/history/:log_id',

  // =========================================
  CONTRACT: '/contract',
  // -----------------------------------------
  CONTRACT_TYPE: '/contract/type',
  CONTRACT_TYPE_CREATE: '/contract/type/new',
  CONTRACT_TYPE_DETAIL: '/contract/type/:id',
  CONTRACT_TYPE_EDIT: '/contract/type/:id/edit',
  CONTRACT_TYPE_HISTORY: '/contract/type/:id/history',
  CONTRACT_TYPE_HISTORY_DETAIL: '/contract/type/:id/history/:log_id',

  CONTRACT_MANAGE: '/contract/manage',
  CONTRACT_MANAGE_CREATE: '/contract/manage/new',
  CONTRACT_MANAGE_DETAIL: '/contract/manage/:id',
  CONTRACT_MANAGE_EDIT: '/contract/manage/:id/edit',
  CONTRACT_MANAGE_HISTORY: '/contract/manage/:id/history',
  CONTRACT_MANAGE_HISTORY_DETAIL: '/contract/manage/:id/history/:log_id',

  CONTRACT_APPENDIX: '/contract/appendix',
  CONTRACT_APPENDIX_CREATE: '/contract/appendix/new',
  CONTRACT_APPENDIX_DETAIL: '/contract/appendix/:id',
  CONTRACT_APPENDIX_EDIT: '/contract/appendix/:id/edit',
  CONTRACT_APPENDIX_HISTORY: '/contract/appendix/:id/history',
  CONTRACT_APPENDIX_HISTORY_DETAIL: '/contract/appendix/:id/history/:log_id',

  // Contract Evaluation — unified per role (Manager / HR), form_type is a list filter.
  // Per SRS docs/srs/srs/docs/features/hrm/contract_evalution §3.1, BE endpoint is split
  // by role scope (`/me/`, `/manager/`, `/hr/`) — form_type là query param, không phải URL
  // segment. History endpoint cũng split theo role nên URL phải có role segment.
  // NV (Me) self-service do mobile xử lý — web chỉ khai báo route Manager + HR.
  CONTRACT_EVALUATION: '/contract/evaluation',

  // --- NV (Me) scope: do mobile xử lý — không khai báo route phía web ---

  // --- Manager scope (TP / GĐK): duyệt phiếu cấp dưới ---
  CONTRACT_EVALUATION_MANAGER: '/contract/evaluation/manager',
  CONTRACT_EVALUATION_MANAGER_DETAIL: '/contract/evaluation/manager/:id',
  CONTRACT_EVALUATION_MANAGER_EDIT: '/contract/evaluation/manager/:id/edit',
  CONTRACT_EVALUATION_MANAGER_HISTORY: '/contract/evaluation/manager/:id/history',
  CONTRACT_EVALUATION_MANAGER_HISTORY_DETAIL: '/contract/evaluation/manager/:id/history/:log_id',

  // --- HR scope: toàn quyền + force_create + reassign_approver + revoke_approval ---
  CONTRACT_EVALUATION_HR: '/contract/evaluation/hr',
  CONTRACT_EVALUATION_HR_CREATE: '/contract/evaluation/hr/new',
  CONTRACT_EVALUATION_HR_DETAIL: '/contract/evaluation/hr/:id',
  CONTRACT_EVALUATION_HR_EDIT: '/contract/evaluation/hr/:id/edit',
  CONTRACT_EVALUATION_HR_HISTORY: '/contract/evaluation/hr/:id/history',
  CONTRACT_EVALUATION_HR_HISTORY_DETAIL: '/contract/evaluation/hr/:id/history/:log_id',

  // =========================================
  PAYROLL: '/payroll',
  // -----------------------------------------
  PAYROLL_CONFIGURATION: '/payroll/configuration',
  TRAVEL_EXPENSE: '/payroll/travel-expense',
  TRAVEL_EXPENSE_CREATE: '/payroll/travel-expense/new',
  TRAVEL_EXPENSE_DETAIL: '/payroll/travel-expense/:id',
  TRAVEL_EXPENSE_EDIT: '/payroll/travel-expense/:id/edit',
  TRAVEL_EXPENSE_HISTORY: '/payroll/travel-expense/:id/history',
  TRAVEL_EXPENSE_HISTORY_DETAIL: '/payroll/travel-expense/:id/history/:log_id',

  RECOVERY_VOUCHER: '/payroll/recovery-voucher',
  RECOVERY_VOUCHER_CREATE: '/payroll/recovery-voucher/new',
  RECOVERY_VOUCHER_DETAIL: '/payroll/recovery-voucher/:id',
  RECOVERY_VOUCHER_EDIT: '/payroll/recovery-voucher/:id/edit',
  RECOVERY_VOUCHER_HISTORY: '/payroll/recovery-voucher/:id/history',
  RECOVERY_VOUCHER_HISTORY_DETAIL: '/payroll/recovery-voucher/:id/history/:log_id',

  SALES_REVENUE: '/payroll/sales-revenue',
  SALES_REVENUE_DETAIL: '/payroll/sales-revenue/:id',
  SALES_REVENUE_HISTORY: '/payroll/sales-revenue/:id/history',
  SALES_REVENUE_HISTORY_DETAIL: '/payroll/sales-revenue/:id/history/:log_id',

  PENALTY_MANAGEMENT: '/payroll/penalty-management',
  PENALTY_MANAGEMENT_CREATE: '/payroll/penalty-management/new',
  PENALTY_MANAGEMENT_DETAIL: '/payroll/penalty-management/:id',
  PENALTY_MANAGEMENT_EDIT: '/payroll/penalty-management/:id/edit',
  PENALTY_MANAGEMENT_HISTORY: '/payroll/penalty-management/:id/history',
  PENALTY_MANAGEMENT_HISTORY_DETAIL: '/payroll/penalty-management/:id/history/:log_id',

  PAYROLL_PERIOD: '/payroll/period',
  PAYROLL_PERIOD_DETAIL: '/payroll/period/:id',
  PAYROLL_PERIOD_PAYSLIPS: '/payroll/period/:id/payslips',
  PAYROLL_PERIOD_CREATE: '/payroll/period/create',
  PAYROLL_PERIOD_EDIT: '/payroll/period/:id/edit',
  PAYROLL_PERIOD_HISTORY: '/payroll/period/:id/history',
  PAYROLL_PERIOD_HISTORY_DETAIL: '/payroll/period/:id/history/:log_id',
  PAYROLL_PERIOD_DETAIL_EMPLOYEE: '/payroll/period/:id/employee/:employeeId',
  PAYROLL_PERIOD_EMPLOYEE_DETAIL: '/payroll/period/:id/employee/:employeeId',
  PAYROLL_PERIOD_PAYSLIP_HISTORY: '/payroll/period/:periodId/payslip/:id/history',
  PAYROLL_PERIOD_PAYSLIP_HISTORY_DETAIL: '/payroll/period/:periodId/payslip/:id/history/:log_id',

  // =========================================
  // Sub-group "Hợp đồng & giao dịch" = /project-admin/contract-transaction
  // (SALES_CONTRACTS_TRANSACTIONS tái dùng làm namespace nhóm; segment nhóm KHÔNG
  // có trang — đã vào FORBIDDEN_NAVIGATE_ROUTES). Segment feature dùng số ít.
  SALES_CONTRACTS_TRANSACTIONS: '/project-admin/contract-transaction',
  // -----------------------------------------
  DEAL: '/project-admin/contract-transaction/deal',
  DEAL_DETAIL: '/project-admin/contract-transaction/deal/:id',
  DEAL_HISTORY: '/project-admin/contract-transaction/deal/:id/history',
  DEAL_HISTORY_DETAIL: '/project-admin/contract-transaction/deal/:id/history/:log_id',

  DEPOSIT_CONTRACT: '/project-admin/contract-transaction/deposit-contract',
  DEPOSIT_CONTRACT_CREATE: '/project-admin/contract-transaction/deposit-contract/new',
  BOOKING_REFUND_DETAIL: '/project-admin/contract-transaction/booking-refund/:id',

  TRANSACTION_SHEET: '/project-admin/contract-transaction/transaction-sheet',
  TRANSACTION_SHEET_CREATE: '/project-admin/contract-transaction/transaction-sheet/new',
  TRANSACTION_SHEET_DETAIL: '/project-admin/contract-transaction/transaction-sheet/:id',
  TRANSACTION_SHEET_EDIT: '/project-admin/contract-transaction/transaction-sheet/:id/edit',
  TRANSACTION_SHEET_HISTORY: '/project-admin/contract-transaction/transaction-sheet/:id/history',

  DEPOSIT_CONTRACT_DETAIL: '/project-admin/contract-transaction/deposit-contract/:id',
  DEPOSIT_CONTRACT_EDIT: '/project-admin/contract-transaction/deposit-contract/:id/edit',
  DEPOSIT_CONTRACT_HISTORY: '/project-admin/contract-transaction/deposit-contract/:id/history',
  DEPOSIT_CONTRACT_HISTORY_DETAIL:
    '/project-admin/contract-transaction/deposit-contract/:id/history/:log_id',

  // Đối chiếu chủ đầu tư — các path này giờ trỏ vào bộ trang 2.0 (bản DUY NHẤT người dùng truy cập
  // được). Bản 1.0 đã bị rút khỏi menu + route; code v1 còn trong repo vì màn List 2.0 tái sử dụng
  // component list của v1 (xem docs/ai/domain/accounting-reconciliation.md).
  INVESTOR_RECONCILIATION: '/project-admin/contract-transaction/investor-reconciliation',
  INVESTOR_RECONCILIATION_CREATE: '/project-admin/contract-transaction/investor-reconciliation/new',
  INVESTOR_RECONCILIATION_DETAIL: '/project-admin/contract-transaction/investor-reconciliation/:id',
  // Chỉ còn để các trang v1 đã ngừng định tuyến compile được — KHÔNG có route đăng ký cho path này
  // (2.0 sửa thông tin chung ngay tại màn Chi tiết, không có màn Edit riêng).
  INVESTOR_RECONCILIATION_EDIT:
    '/project-admin/contract-transaction/investor-reconciliation/:id/edit',

  // =========================================
  F2_RECONCILIATION: '/project-admin/contract-transaction/f2-reconciliation',
  F2_RECONCILIATION_DETAIL: '/project-admin/contract-transaction/f2-reconciliation/:id',
  F2_RECONCILIATION_EDIT: '/project-admin/contract-transaction/f2-reconciliation/:id/edit',

  // =========================================
  CTV_RECONCILIATION: '/project-admin/contract-transaction/ctv-reconciliation',
  CTV_RECONCILIATION_DETAIL: '/project-admin/contract-transaction/ctv-reconciliation/:id',
  CTV_RECONCILIATION_EDIT: '/project-admin/contract-transaction/ctv-reconciliation/:id/edit',

  // =========================================
  FEE_SUPPORT_PROPOSAL: '/project-admin/contract-transaction/fee-support-proposal',
  FEE_SUPPORT_PROPOSAL_CREATE: '/project-admin/contract-transaction/fee-support-proposal/new',
  FEE_SUPPORT_PROPOSAL_DETAIL: '/project-admin/contract-transaction/fee-support-proposal/:id',

  // =========================================
  DECISIONS_PROPOSALS: '/decisions-proposals',
  // -----------------------------------------
  DECISION_MANAGEMENT: '/decisions-proposals/decisions',
  DECISION_MANAGEMENT_CREATE: '/decisions-proposals/decisions/new',
  DECISION_MANAGEMENT_DETAIL: '/decisions-proposals/decisions/:id',
  DECISION_MANAGEMENT_EDIT: '/decisions-proposals/decisions/:id/edit',
  DECISION_MANAGEMENT_HISTORY: '/decisions-proposals/decisions/:id/history',
  DECISION_MANAGEMENT_HISTORY_DETAIL: '/decisions-proposals/decisions/:id/history/:log_id',
  // -----------------------------------------
  PROPOSAL_MANAGEMENT: '/decisions-proposals/proposals',
  // -----------------------------------------
  PROPOSAL_LIST: '/decisions-proposals/proposals/list',
  PROPOSAL_MANAGE: '/decisions-proposals/proposals/manage',
  PROPOSAL_MANAGE_DETAIL: '/decisions-proposals/proposals/manage/:id',
  PROPOSAL_MANAGE_HISTORY: '/decisions-proposals/proposals/manage/:id/history',
  PROPOSAL_MANAGE_HISTORY_DETAIL: '/decisions-proposals/proposals/manage/:id/history/:log_id',
  // -----------------------------------------
  PROPOSAL_UNPAID_LEAVE: '/decisions-proposals/proposals/unpaid-leave',
  PROPOSAL_UNPAID_LEAVE_DETAIL: '/decisions-proposals/proposals/unpaid-leave/:id',
  PROPOSAL_UNPAID_LEAVE_HISTORY: '/decisions-proposals/proposals/unpaid-leave/:id/history',
  PROPOSAL_UNPAID_LEAVE_HISTORY_DETAIL:
    '/decisions-proposals/proposals/unpaid-leave/:id/history/:log_id',
  PROPOSAL_PAID_LEAVE: '/decisions-proposals/proposals/paid-leave',
  PROPOSAL_PAID_LEAVE_DETAIL: '/decisions-proposals/proposals/paid-leave/:id',
  PROPOSAL_PAID_LEAVE_HISTORY: '/decisions-proposals/proposals/paid-leave/:id/history',
  PROPOSAL_PAID_LEAVE_HISTORY_DETAIL:
    '/decisions-proposals/proposals/paid-leave/:id/history/:log_id',
  PROPOSAL_OVERTIME_WORK: '/decisions-proposals/proposals/overtime-work',
  PROPOSAL_OVERTIME_WORK_DETAIL: '/decisions-proposals/proposals/overtime-work/:id',
  PROPOSAL_OVERTIME_WORK_HISTORY: '/decisions-proposals/proposals/overtime-work/:id/history',
  PROPOSAL_OVERTIME_WORK_HISTORY_DETAIL:
    '/decisions-proposals/proposals/overtime-work/:id/history/:log_id',
  PROPOSAL_LATE_EXEMPTION: '/decisions-proposals/proposals/late-exemption',
  PROPOSAL_LATE_EXEMPTION_DETAIL: '/decisions-proposals/proposals/late-exemption/:id',
  PROPOSAL_LATE_EXEMPTION_HISTORY: '/decisions-proposals/proposals/late-exemption/:id/history',
  PROPOSAL_LATE_EXEMPTION_HISTORY_DETAIL:
    '/decisions-proposals/proposals/late-exemption/:id/history/:log_id',
  PROPOSAL_POST_MATERNITY_BENEFIT: '/decisions-proposals/proposals/post-maternity-benefits',
  PROPOSAL_POST_MATERNITY_BENEFIT_DETAIL:
    '/decisions-proposals/proposals/post-maternity-benefits/:id',
  PROPOSAL_POST_MATERNITY_BENEFIT_HISTORY:
    '/decisions-proposals/proposals/post-maternity-benefits/:id/history',
  PROPOSAL_POST_MATERNITY_BENEFIT_HISTORY_DETAIL:
    '/decisions-proposals/proposals/post-maternity-benefits/:id/history/:log_id',
  PROPOSAL_MATERNITY_LEAVE: '/decisions-proposals/proposals/maternity-leave',
  PROPOSAL_MATERNITY_LEAVE_DETAIL: '/decisions-proposals/proposals/maternity-leave/:id',
  PROPOSAL_MATERNITY_LEAVE_HISTORY: '/decisions-proposals/proposals/maternity-leave/:id/history',
  PROPOSAL_MATERNITY_LEAVE_HISTORY_DETAIL:
    '/decisions-proposals/proposals/maternity-leave/:id/history/:log_id',
  PROPOSAL_JOB_TRANSFER: '/decisions-proposals/proposals/job-transfer',
  PROPOSAL_JOB_TRANSFER_DETAIL: '/decisions-proposals/proposals/job-transfer/:id',
  PROPOSAL_JOB_TRANSFER_HISTORY: '/decisions-proposals/proposals/job-transfer/:id/history',
  PROPOSAL_JOB_TRANSFER_HISTORY_DETAIL:
    '/decisions-proposals/proposals/job-transfer/:id/history/:log_id',
  PROPOSAL_BULK_JOB_TRANSFER: '/decisions-proposals/proposals/bulk-job-transfer',
  PROPOSAL_BULK_JOB_TRANSFER_CREATE: '/decisions-proposals/proposals/bulk-job-transfer/new',
  PROPOSAL_BULK_JOB_TRANSFER_DETAIL: '/decisions-proposals/proposals/bulk-job-transfer/:id',
  PROPOSAL_BULK_JOB_TRANSFER_EDIT: '/decisions-proposals/proposals/bulk-job-transfer/:id/edit',
  PROPOSAL_BULK_JOB_TRANSFER_HISTORY:
    '/decisions-proposals/proposals/bulk-job-transfer/:id/history',
  PROPOSAL_BULK_JOB_TRANSFER_HISTORY_DETAIL:
    '/decisions-proposals/proposals/bulk-job-transfer/:id/history/:log_id',
  PROPOSAL_ASSET_ALLOCATION: '/decisions-proposals/proposals/asset-allocation',
  PROPOSAL_ASSET_ALLOCATION_DETAIL: '/decisions-proposals/proposals/asset-allocation/:id',
  PROPOSAL_ASSET_ALLOCATION_HISTORY: '/decisions-proposals/proposals/asset-allocation/:id/history',
  PROPOSAL_ASSET_ALLOCATION_HISTORY_DETAIL:
    '/decisions-proposals/proposals/asset-allocation/:id/history/:log_id',
  PROPOSAL_DEVICE_CHANGE: '/decisions-proposals/proposals/device-change',
  PROPOSAL_DEVICE_CHANGE_DETAIL: '/decisions-proposals/proposals/device-change/:id',
  PROPOSAL_DEVICE_CHANGE_HISTORY: '/decisions-proposals/proposals/device-change/:id/history',
  PROPOSAL_DEVICE_CHANGE_HISTORY_DETAIL:
    '/decisions-proposals/proposals/device-change/:id/history/:log_id',
  PROPOSAL_RETURN_TO_WORK: '/decisions-proposals/proposals/return-to-work',
  PROPOSAL_RETURN_TO_WORK_DETAIL: '/decisions-proposals/proposals/return-to-work/:id',
  PROPOSAL_RETURN_TO_WORK_HISTORY: '/decisions-proposals/proposals/return-to-work/:id/history',
  PROPOSAL_RETURN_TO_WORK_HISTORY_DETAIL:
    '/decisions-proposals/proposals/return-to-work/:id/history/:log_id',
  PROPOSAL_STATUTORY_LEAVE: '/decisions-proposals/proposals/statutory-leave',
  PROPOSAL_STATUTORY_LEAVE_DETAIL: '/decisions-proposals/proposals/statutory-leave/:id',
  PROPOSAL_STATUTORY_LEAVE_HISTORY: '/decisions-proposals/proposals/statutory-leave/:id/history',
  PROPOSAL_STATUTORY_LEAVE_HISTORY_DETAIL:
    '/decisions-proposals/proposals/statutory-leave/:id/history/:log_id',
  // =========================================
  // Khách hàng (feature dưới sub-group "Hợp đồng & giao dịch")
  CUSTOMER_MANAGER: '/project-admin/contract-transaction/customer',
  CUSTOMER_MANAGER_CREATE: '/project-admin/contract-transaction/customer/create',
  CUSTOMER_MANAGER_DETAIL: '/project-admin/contract-transaction/customer/:id',
  CUSTOMER_MANAGER_EDIT: '/project-admin/contract-transaction/customer/:id/edit',
  CUSTOMER_MANAGER_HISTORY: '/project-admin/contract-transaction/customer/:id/history',
  CUSTOMER_MANAGER_HISTORY_DETAIL:
    '/project-admin/contract-transaction/customer/:id/history/:log_id',
  // =========================================
  ELIBRARY: '/elibrary',
  // -----------------------------------------
  ELIBRARY_CATEGORY: '/elibrary/category',
  ELIBRARY_CATEGORY_CREATE: '/elibrary/category/create',
  ELIBRARY_CATEGORY_EDIT: '/elibrary/category/:id/edit',
  ELIBRARY_CATEGORY_DETAIL: '/elibrary/category/:id',
  ELIBRARY_MY_DOCUMENTS: '/elibrary/my-documents',
  ELIBRARY_DEPARTMENT_DOCUMENTS: '/elibrary/department-documents',
  ELIBRARY_COMPANY_DOCUMENTS: '/elibrary/company-documents',
  ELIBRARY_SHARED_WITH_ME_DOCUMENTS: '/elibrary/shared-with-me',
  ELIBRARY_ACCESS_REQUESTS: '/elibrary/access-requests',
  ELIBRARY_ITEM_ACCESS_REQUESTS: '/elibrary/items/:itemId/access-requests',
  ELIBRARY_DOCS_PUBLIC: '/docs/:token',

  // =========================================
  ACCOUNTING: '/accounting',
  // -----------------------------------------
  ACCOUNTING_COLLABORATOR: '/accounting/collaborator',
  // -----------------------------------------
  // ACCOUNTING — Collaborator (20.1)
  COLLABORATOR_MANAGEMENT: '/accounting/collaborator/manage',
  COLLABORATOR_CREATE: '/accounting/collaborator/manage/new',
  COLLABORATOR_DETAIL: '/accounting/collaborator/manage/:id',
  // Chứng chỉ môi giới (CTV)
  BROKER_CERTIFICATE_MANAGEMENT: '/accounting/broker-certificates',
  BROKER_CERTIFICATE_CREATE: '/accounting/broker-certificates/new',
  BROKER_CERTIFICATE_DETAIL: '/accounting/broker-certificates/:id',
  BROKER_CERTIFICATE_EDIT: '/accounting/broker-certificates/:id/edit',
  COLLABORATOR_EDIT: '/accounting/collaborator/manage/:id/edit',
  COLLABORATOR_HISTORY: '/accounting/collaborator/manage/:id/history',
  COLLABORATOR_HISTORY_DETAIL: '/accounting/collaborator/manage/:id/history/:log_id',
  // -----------------------------------------
  // ACCOUNTING — Collaborator Contract (20.2)
  COLLABORATOR_CONTRACT_MANAGEMENT: '/accounting/collaborator/contracts',
  COLLABORATOR_CONTRACT_CREATE: '/accounting/collaborator/contracts/new',
  COLLABORATOR_CONTRACT_DETAIL: '/accounting/collaborator/contracts/:id',
  COLLABORATOR_CONTRACT_EDIT: '/accounting/collaborator/contracts/:id/edit',
  COLLABORATOR_CONTRACT_HISTORY: '/accounting/collaborator/contracts/:id/history',
  COLLABORATOR_CONTRACT_HISTORY_DETAIL: '/accounting/collaborator/contracts/:id/history/:log_id',
  // -----------------------------------------
  // ACCOUNTING — Cấu hình (Config) — group-only namespace, no page rendered.
  // Groups the sidebar "Cấu hình" items: bank accounts, accounting periods,
  // KPI commission rules and SLK department targets, so the breadcrumb renders
  // "Kế toán / Cấu hình / ...".
  ACCOUNTING_CONFIG: '/accounting/config',

  // Company Bank Account (20.3)
  COMPANY_BANK_ACCOUNT_MANAGEMENT: '/accounting/config/bank-accounts',
  COMPANY_BANK_ACCOUNT_CREATE: '/accounting/config/bank-accounts/new',
  COMPANY_BANK_ACCOUNT_DETAIL: '/accounting/config/bank-accounts/:id',
  COMPANY_BANK_ACCOUNT_EDIT: '/accounting/config/bank-accounts/:id/edit',
  COMPANY_BANK_ACCOUNT_HISTORY: '/accounting/config/bank-accounts/:id/history',
  COMPANY_BANK_ACCOUNT_HISTORY_DETAIL: '/accounting/config/bank-accounts/:id/history/:log_id',
  // -----------------------------------------
  // ACCOUNTING — Accounting Period (Kỳ kế toán)
  ACCOUNTING_PERIOD_MANAGEMENT: '/accounting/config/periods',
  ACCOUNTING_PERIOD_CREATE: '/accounting/config/periods/new',
  ACCOUNTING_PERIOD_DETAIL: '/accounting/config/periods/:id',
  ACCOUNTING_PERIOD_EDIT: '/accounting/config/periods/:id/edit',
  ACCOUNTING_PERIOD_HISTORY: '/accounting/config/periods/:id/history',
  ACCOUNTING_PERIOD_HISTORY_DETAIL: '/accounting/config/periods/:id/history/:log_id',

  // -----------------------------------------
  // ACCOUNTING — Giao dịch (Transactions) — group-only namespace, no page rendered.
  // All transaction pages (vouchers, invoices, deal-period allocations) live under
  // this segment so the breadcrumb renders "Kế toán / Giao dịch / ...".
  ACCOUNTING_TRANSACTION: '/accounting/transactions',

  // Payment Voucher (20.5)
  PAYMENT_VOUCHER_MANAGEMENT: '/accounting/transactions/payment-vouchers',
  PAYMENT_VOUCHER_CREATE: '/accounting/transactions/payment-vouchers/new',
  PAYMENT_VOUCHER_DETAIL: '/accounting/transactions/payment-vouchers/:id',
  PAYMENT_VOUCHER_EDIT: '/accounting/transactions/payment-vouchers/:id/edit',
  PAYMENT_VOUCHER_HISTORY: '/accounting/transactions/payment-vouchers/:id/history',
  PAYMENT_VOUCHER_HISTORY_DETAIL: '/accounting/transactions/payment-vouchers/:id/history/:log_id',

  RECEIPT_VOUCHER: '/accounting/transactions/receipt-vouchers',
  RECEIPT_VOUCHER_CREATE: '/accounting/transactions/receipt-vouchers/new',
  RECEIPT_VOUCHER_DETAIL: '/accounting/transactions/receipt-vouchers/:id',
  RECEIPT_VOUCHER_EDIT: '/accounting/transactions/receipt-vouchers/:id/edit',

  COMMISSION_ADVANCE: '/accounting/commission-advances',
  COMMISSION_ADVANCE_CREATE: '/accounting/commission-advances/new',
  COMMISSION_ADVANCE_DETAIL: '/accounting/commission-advances/:id',
  COMMISSION_ADVANCE_EDIT: '/accounting/commission-advances/:id/edit',
  COMMISSION_ADVANCE_HISTORY: '/accounting/commission-advances/:id/history',
  COMMISSION_ADVANCE_HISTORY_DETAIL: '/accounting/commission-advances/:id/history/:log_id',

  SALES_INVOICE: '/accounting/transactions/sales-invoices',
  SALES_INVOICE_CREATE: '/accounting/transactions/sales-invoices/new',
  SALES_INVOICE_DETAIL: '/accounting/transactions/sales-invoices/:id',
  SALES_INVOICE_EDIT: '/accounting/transactions/sales-invoices/:id/edit',
  SALES_INVOICE_HISTORY: '/accounting/transactions/sales-invoices/:id/history',
  SALES_INVOICE_HISTORY_DETAIL: '/accounting/transactions/sales-invoices/:id/history/:log_id',

  INPUT_INVOICE: '/accounting/transactions/input-invoices',
  INPUT_INVOICE_CREATE: '/accounting/transactions/input-invoices/new',
  INPUT_INVOICE_DETAIL: '/accounting/transactions/input-invoices/:id',
  INPUT_INVOICE_EDIT: '/accounting/transactions/input-invoices/:id/edit',
  INPUT_INVOICE_HISTORY: '/accounting/transactions/input-invoices/:id/history',
  INPUT_INVOICE_HISTORY_DETAIL: '/accounting/transactions/input-invoices/:id/history/:log_id',

  // ACCOUNTING — Hoa hồng (Commission) — group-only namespace, no page rendered
  ACCOUNTING_COMMISSION: '/accounting/commissions',
  // Sidebar sub-groups "Hoa hồng sale" / "Hoa hồng quản lý" — each is a
  // namespace-only segment so the breadcrumb distinguishes the two groups.
  ACCOUNTING_COMMISSION_SALE: '/accounting/commission-sale',
  ACCOUNTING_COMMISSION_MANAGEMENT: '/accounting/commission-management',

  // Màn này thuộc nhóm sidebar "Hoa hồng quản lý" nên phải nằm dưới
  // ACCOUNTING_COMMISSION_MANAGEMENT — nằm nhầm dưới /commission-sale thì crumb cha
  // ra "Hoa hồng sale", lệch nhóm menu.
  COMMISSION_MANAGER_MONTHLY: '/accounting/commission-management/manager-monthly',
  COMMISSION_MANAGER_DETAIL: '/accounting/commission-management/manager-monthly/:id',

  DEAL_PERIOD_ALLOCATION: '/accounting/transactions/deal-period-allocations',
  DEAL_PERIOD_ALLOCATION_DETAIL: '/accounting/transactions/deal-period-allocations/:id',
  DEAL_PERIOD_ALLOCATION_HISTORY: '/accounting/transactions/deal-period-allocations/:id/history',
  DEAL_PERIOD_ALLOCATION_HISTORY_DETAIL:
    '/accounting/transactions/deal-period-allocations/:id/history/:log_id',

  MONTHLY_COMMISSION_SPLIT_SHEET: '/accounting/commission-sale/split-sheets',
  MONTHLY_COMMISSION_SPLIT_SHEET_DETAIL: '/accounting/commission-sale/split-sheets/:id',

  // ACCOUNTING — Commission Management (20.8.4)
  COMM_EMPLOYEE_PAYROLL: '/accounting/commission-management/employee-payroll',

  EMPLOYEE_PAYOUT_BATCH: '/accounting/commissions/employee-payout-batches',
  EMPLOYEE_PAYOUT_BATCH_CREATE: '/accounting/commissions/employee-payout-batches/new',
  EMPLOYEE_PAYOUT_BATCH_DETAIL: '/accounting/commissions/employee-payout-batches/:id',
  MONTHLY_COMMISSION_SUMMARY: '/accounting/commissions/monthly-commission-summaries',
  MONTHLY_COMMISSION_SUMMARY_DETAIL: '/accounting/commissions/monthly-commission-summaries/:id',

  IMPORTED_BONUS_BATCH: '/accounting/imported-bonuses',
  IMPORTED_BONUS_BATCH_DETAIL: '/accounting/imported-bonuses/:id',

  INVESTOR_ADVANCE: '/accounting/investor-advances',
  INVESTOR_ADVANCE_CREATE: '/accounting/investor-advances/create',

  INVESTOR_ADVANCE_DETAIL: '/accounting/investor-advances/:id',

  COMM_PAYMENT_LIST: '/accounting/comm-payment-batches',
  COMM_PAYMENT_CREATE: '/accounting/comm-payment-batches/new',

  SUPPORT_DEPT_COMMISSION_RATE: '/accounting/config/support-dept-commission-rates',
  KPI_COMMISSION_RULE: '/accounting/config/kpi-commission-rules',
  KPI_COMMISSION_RULE_CREATE: '/accounting/config/kpi-commission-rules/new',
  KPI_COMMISSION_RULE_DETAIL: '/accounting/config/kpi-commission-rules/:id',
  KPI_COMMISSION_RULE_EDIT: '/accounting/config/kpi-commission-rules/:id/edit',

  COMM_SLK_DEPT: '/accounting/config/slk-dept',

  COMMISSION_SALE_MONTHLY: '/accounting/commission-sale/sale-monthly',
  COMMISSION_SALE_MONTHLY_DETAIL: '/accounting/commission-sale/sale-monthly/:id',
  COMMISSION_F2_MONTHLY: '/accounting/commission-sale/f2-monthly',
  COMMISSION_F2_MONTHLY_DETAIL: '/accounting/commission-sale/f2-monthly/:id',
  COMMISSION_CTV_MONTHLY: '/accounting/commission-sale/ctv-monthly',
  COMMISSION_CTV_MONTHLY_DETAIL: '/accounting/commission-sale/ctv-monthly/:id',
  COMMISSION_HOLD: '/accounting/commission-sale/hold',
  // Group tạm giữ không có id riêng (BE gộp theo người nhận × kỳ) → URL mang đủ 4 mảnh khoá.
  COMMISSION_HOLD_DETAIL:
    '/accounting/commission-sale/hold/:beneficiaryType/:beneficiaryId/:year/:month',
  COMMISSION_SLK_MONTHLY: '/accounting/commission-sale/slk-monthly',
  COMMISSION_SLK_MONTHLY_DETAIL: '/accounting/commission-sale/slk-monthly/:id',
  COMMISSION_SLK_MONTHLY_POOL: '/accounting/commission-sale/slk-monthly/:id/pool/:poolKey',

  // MISSING COMMISSION ROUTES
  COMMISSION_BY_REVENUE: '/accounting/commission-management/by-revenue',
  COMMISSION_BY_REVENUE_DETAIL: '/accounting/commission-management/by-revenue/:id',

  DEPARTMENT_MONTHLY_KPI: '/accounting/commission-management/dept-monthly',
  DEPARTMENT_MONTHLY_KPI_DETAIL: '/accounting/commission-management/dept-monthly/:id',
  DEPARTMENT_MONTHLY_KPI_HISTORY: '/accounting/commission-management/dept-monthly/:id/history',

  PROMOTION_DISTRIBUTION_TRACKING: '/accounting/commission-management/promotion-distributions',
  PROMOTION_DISTRIBUTION_TRACKING_DETAIL:
    '/accounting/commission-management/promotion-distributions/:id',

  DIRECTOR_COMMISSION_TRACKING: '/accounting/commission-management/director-commissions',
  DIRECTOR_COMMISSION_TRACKING_DETAIL: '/accounting/commission-management/director-commissions/:id',

  // -----------------------------------------
  REPORT_ACCOUNTING: '/accounting/report',
  // _________________________________________
  REPORT_ACCOUNTING_ADVANCE: '/accounting/report/advance',
  REPORT_ACCOUNTING_INCOME_BY_RECIPIENT: '/accounting/report/income-by-recipient',
  REPORT_ACCOUNTING_INVESTOR_DEBT: '/accounting/report/investor-debt',
  REPORT_ACCOUNTING_F2_DEBT: '/accounting/report/f2-debt',
  REPORT_COMMISSION_PAYMENT_F2: '/accounting/report/f2-payment',
  REPORT_ACCOUNTING_COMMISSION_PAYMENT_F2: '/accounting/report/commission-payment-f2',
  REPORT_ACCOUNTING_PROJECT_RECEIVABLE: '/accounting/report/project-receivable',
  REPORT_ACCOUNTING_PARTNER_DEBT: '/accounting/report/partner-debt',
  REPORT_ACCOUNTING_INVESTOR_INVOICE_RECONCILIATION:
    '/accounting/report/investor-invoice-reconciliation',
  REPORT_ACCOUNTING_MANAGEMENT_COMMISSION_SUMMARY:
    '/accounting/report/management-commission-summary',
  REPORT_ACCOUNTING_INTERNAL_REPORT: '/accounting/report/internal-report',
  REPORT_ACCOUNTING_BRANCH_F2_REPORT: '/accounting/report/branch-f2-report',
  REPORT_ACCOUNTING_ANNUAL_TAX_INCOME: '/accounting/report/annual-tax-income',
  REPORT_ACCOUNTING_SALES_COMMISSION_PAYOUT: '/accounting/report/sales-commission-payout',
  REPORT_ACCOUNTING_LEGAL_ENTITY_COMMISSION_DEBT: '/accounting/report/legal-entity-commission-debt',
  REPORT_ACCOUNTING_LEGAL_ENTITY_INVOICE_DEBT: '/accounting/report/legal-entity-invoice-debt',
  REPORT_ACCOUNTING_COMMISSION_PAYABLE_REPORT: '/accounting/report/commission-payable-report',
  REPORT_ACCOUNTING_LAD_DEBT: '/accounting/report/lad-debt',
  REPORT_ACCOUNTING_PROJECT_MONEY_IN: '/accounting/report/project-money-in',
  REPORT_ACCOUNTING_REVENUE_BY_BRANCH: '/accounting/report/revenue-by-branch',
  REPORT_ACCOUNTING_UNITS_NOT_FULLY_PAID: '/accounting/report/units-not-fully-paid',
  REPORT_ACCOUNTING_INCOME_BY_SALESPERSON: '/accounting/report/income-by-salesperson',
  REPORT_ACCOUNTING_HHQL_BY_PROJECT: '/accounting/report/hhql-by-project',
  REPORT_ACCOUNTING_PROJECT_SUMMARY: '/accounting/report/project-summary',

  // CHAT
  CHAT: '/chat',
  CHAT_DETAIL: '/chat/:channelId',
  CHAT_GROUP_CHANNELS: '/chat/group-channels',
  // Error routes
  UNAUTHORIZED: '/unauthorized',
  NOT_FOUND: '/404',
} as const

// Route definition types
export type AppRoute = {
  path: TAppPath | ''
  title?: string
  children?: AppRoute[]
}

export const ADMIN_ROUTES: AppRoute[] = [
  // -------------------------------------
  {
    title: 'Sơ đồ tổ chức',
    path: APP_PATH.ORG_CHAR,
  },

  {
    title: 'Quản lý chi nhánh',
    path: APP_PATH.BRANCH_MANAGEMENT,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.BRANCH_MANAGEMENT_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.BRANCH_MANAGEMENT_EDIT,
  },
  {
    title: '',
    path: APP_PATH.BRANCH_MANAGEMENT_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.BRANCH_MANAGEMENT_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.BRANCH_MANAGEMENT_HISTORY_DETAIL,
  },

  {
    title: 'Quản lý khối',
    path: APP_PATH.BLOCK_MANAGEMENT,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.BLOCK_MANAGEMENT_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.BLOCK_MANAGEMENT_HISTORY_DETAIL,
  },

  {
    title: 'Quản lý phòng ban',
    path: APP_PATH.DEPARTMENT_MANAGEMENT,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.DEPARTMENT_CREATE_NEW,
  },
  {
    title: 'Chi tiết',
    path: APP_PATH.DEPARTMENT_MANAGEMENT_DETAIL,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.DEPARTMENT_MANAGEMENT_EDIT,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.DEPARTMENT_MANAGEMENT_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.DEPARTMENT_MANAGEMENT_HISTORY_DETAIL,
  },

  {
    title: 'Quản lý chức vụ',
    path: APP_PATH.POSITION_MANAGEMENT,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.POSITION_MANAGEMENT_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.POSITION_MANAGEMENT_EDIT,
  },
  {
    title: '',
    path: APP_PATH.POSITION_MANAGEMENT_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.POSITION_MANAGEMENT_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.POSITION_MANAGEMENT_HISTORY_DETAIL,
  },

  // -------------------------------------
  {
    title: 'Phân quyền',
    path: APP_PATH.PERMISSION,
  },
  {
    title: 'Quản lý quyền',
    path: APP_PATH.PERMISSION_MANAGEMENT,
  },

  {
    title: 'Quản lý vai trò',
    path: APP_PATH.PERMISSION_ROLE_MANAGEMENT,
  },
  {
    title: '',
    path: APP_PATH.PERMISSION_ROLE_MANAGEMENT_DETAIL,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.PERMISSION_ROLE_MANAGEMENT_EDIT,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.PERMISSION_ROLE_MANAGEMENT_CREATE,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.PERMISSION_ROLE_MANAGEMENT_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.PERMISSION_ROLE_MANAGEMENT_HISTORY_DETAIL,
  },

  // -------------------------------------
  {
    title: 'Quản lý nhân viên theo vai trò',
    path: APP_PATH.PERMISSION_EMPLOYEE_MANAGEMENT_BY_ROLE,
  },
  {
    title: 'Chỉnh sửa vai trò hàng loạt',
    path: APP_PATH.PERMISSION_EMPLOYEE_MANAGEMENT_BY_ROLE_BULK_EDIT,
  },

  // -------------------------------------
  {
    title: 'Theo dõi thao tác người dùng',
    path: APP_PATH.USER_ACTION_TRACKING,
  },
  {
    title: 'Chi tiết thao tác',
    path: APP_PATH.USER_ACTION_TRACKING_DETAIL,
  },
]

export const HRM_ROUTES: AppRoute[] = [
  // ====================================
  {
    title: 'Tuyển dụng',
    path: APP_PATH.RECRUITMENT,
  },
  // -------------------------------------

  {
    title: 'Kênh tuyển dụng',
    path: APP_PATH.RECRUITMENT_CHANNEL,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.RECRUITMENT_CHANNEL_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.RECRUITMENT_CHANNEL_EDIT,
  },
  {
    title: '',
    path: APP_PATH.RECRUITMENT_CHANNEL_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.RECRUITMENT_CHANNEL_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.RECRUITMENT_CHANNEL_HISTORY_DETAIL,
  },

  {
    title: 'Nguồn tuyển dụng',
    path: APP_PATH.RECRUITMENT_SOURCE,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.RECRUITMENT_SOURCE_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.RECRUITMENT_SOURCE_EDIT,
  },
  {
    title: '',
    path: APP_PATH.RECRUITMENT_SOURCE_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.RECRUITMENT_SOURCE_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.RECRUITMENT_SOURCE_HISTORY_DETAIL,
  },

  {
    title: 'Chi phí tuyển dụng',
    path: APP_PATH.RECRUITMENT_EXPENSE,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.RECRUITMENT_EXPENSE_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.RECRUITMENT_EXPENSE_EDIT,
  },
  {
    title: '',
    path: APP_PATH.RECRUITMENT_EXPENSE_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.RECRUITMENT_EXPENSE_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.RECRUITMENT_EXPENSE_HISTORY_DETAIL,
  },

  {
    title: 'Quản lý mô tả công việc',
    path: APP_PATH.RECRUITMENT_JOB_DESCRIPTION,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.RECRUITMENT_JOB_DESCRIPTION_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.RECRUITMENT_JOB_DESCRIPTION_EDIT,
  },
  {
    title: '',
    path: APP_PATH.RECRUITMENT_JOB_DESCRIPTION_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.RECRUITMENT_JOB_DESCRIPTION_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.RECRUITMENT_JOB_DESCRIPTION_HISTORY_DETAIL,
  },

  {
    title: 'Quản lý đề nghị tuyển dụng',
    path: APP_PATH.RECRUITMENT_REQUEST,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.RECRUITMENT_REQUEST_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.RECRUITMENT_REQUEST_EDIT,
  },
  {
    title: '',
    path: APP_PATH.RECRUITMENT_REQUEST_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.RECRUITMENT_REQUEST_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.RECRUITMENT_REQUEST_HISTORY_DETAIL,
  },

  {
    title: 'Quản lý ứng viên',
    path: APP_PATH.RECRUITMENT_CANDIDATE,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.RECRUITMENT_CANDIDATE_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.RECRUITMENT_CANDIDATE_EDIT,
  },
  {
    title: '',
    path: APP_PATH.RECRUITMENT_CANDIDATE_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.RECRUITMENT_CANDIDATE_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.RECRUITMENT_CANDIDATE_HISTORY_DETAIL,
  },

  {
    title: 'Lịch phỏng vấn',
    path: APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE_EDIT,
  },
  {
    title: '',
    path: APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE_HISTORY_DETAIL,
  },

  // ====================================
  {
    title: 'Nhân sự',
    path: APP_PATH.EMPLOYEE,
  },
  // ------------------------------------
  {
    title: 'Hồ sơ nhân viên',
    path: APP_PATH.EMPLOYEE_MANAGEMENT,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.EMPLOYEE_MANAGEMENT_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.EMPLOYEE_MANAGEMENT_EDIT,
  },
  {
    title: '',
    path: APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.EMPLOYEE_MANAGEMENT_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.EMPLOYEE_MANAGEMENT_HISTORY_DETAIL,
  },

  {
    title: 'Ban lãnh đạo',
    path: APP_PATH.EMPLOYEE_LEADERSHIP,
  },

  {
    title: 'Bằng cấp, chứng chỉ môi giới',
    path: APP_PATH.EMPLOYEE_CERTIFICATE,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.EMPLOYEE_CERTIFICATE_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.EMPLOYEE_CERTIFICATE_EDIT,
  },
  {
    title: '',
    path: APP_PATH.EMPLOYEE_CERTIFICATE_DETAIL,
  },
  {
    title: '',
    path: APP_PATH.EMPLOYEE_CERTIFICATE_DETAIL,
  },
  {
    title: '',
    path: APP_PATH.EMPLOYEE_CERTIFICATE_DETAIL,
  },

  {
    title: 'Quan hệ nhân thân',
    path: APP_PATH.EMPLOYEE_RELATION,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.EMPLOYEE_RELATION_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.EMPLOYEE_RELATION_EDIT,
  },
  {
    title: '',
    path: APP_PATH.EMPLOYEE_RELATION_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.EMPLOYEE_RELATION_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.EMPLOYEE_RELATION_HISTORY_DETAIL,
  },

  {
    title: 'Người phụ thuộc',
    path: APP_PATH.EMPLOYEE_DEPENDENT,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.EMPLOYEE_DEPENDENT_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.EMPLOYEE_DEPENDENT_EDIT,
  },
  {
    title: '',
    path: APP_PATH.EMPLOYEE_DEPENDENT_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.EMPLOYEE_DEPENDENT_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.EMPLOYEE_DEPENDENT_HISTORY_DETAIL,
  },

  {
    title: 'Nhân sự theo cấu trúc tổ chức',
    path: APP_PATH.EMPLOYEE_ORG_TREE,
  },

  {
    title: 'Số tài khoản ngân hàng của nhân sự',
    path: APP_PATH.EMPLOYEE_BANK_ACCOUNT,
  },

  {
    title: 'Lịch sử công tác',
    path: APP_PATH.EMPLOYEE_HISTORY,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.EMPLOYEE_HISTORY_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.EMPLOYEE_HISTORY_EDIT,
  },
  {
    title: '',
    path: APP_PATH.EMPLOYEE_HISTORY_DETAIL,
  },

  // ====================================
  {
    title: 'Quản lý quyết định/đề xuất',
    path: APP_PATH.DECISIONS_PROPOSALS,
  },
  // -------------------------------------
  {
    title: 'Quản lý quyết định',
    path: APP_PATH.DECISION_MANAGEMENT,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.DECISION_MANAGEMENT_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.DECISION_MANAGEMENT_EDIT,
  },
  {
    title: '',
    path: APP_PATH.DECISION_MANAGEMENT_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.DECISION_MANAGEMENT_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.DECISION_MANAGEMENT_HISTORY_DETAIL,
  },
  // -------------------------------------
  {
    title: 'Đề xuất',
    path: APP_PATH.PROPOSAL_MANAGEMENT,
  },
  {
    title: 'Danh sách cần duyệt',
    path: APP_PATH.PROPOSAL_MANAGE,
  },
  {
    title: '',
    path: APP_PATH.PROPOSAL_MANAGE_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.PROPOSAL_MANAGE_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.PROPOSAL_MANAGE_HISTORY_DETAIL,
  },
  {
    title: 'Toàn bộ đề xuất',
    path: APP_PATH.PROPOSAL_LIST,
  },
  // -------------------------------------
  {
    title: 'Nghỉ không lương',
    path: APP_PATH.PROPOSAL_UNPAID_LEAVE,
  },
  {
    title: '',
    path: APP_PATH.PROPOSAL_UNPAID_LEAVE_DETAIL,
  },
  {
    title: 'Nghỉ phép có lương',
    path: APP_PATH.PROPOSAL_PAID_LEAVE,
  },
  {
    title: 'Làm việc thêm giờ',
    path: APP_PATH.PROPOSAL_OVERTIME_WORK,
  },
  {
    title: 'Miễn trừ trễ',
    path: APP_PATH.PROPOSAL_LATE_EXEMPTION,
  },
  {
    title: 'Chế độ làm việc hậu thai sản',
    path: APP_PATH.PROPOSAL_POST_MATERNITY_BENEFIT,
  },
  {
    title: 'Hưởng chế độ thai sản',
    path: APP_PATH.PROPOSAL_MATERNITY_LEAVE,
  },
  {
    title: 'Điều chuyển công tác',
    path: APP_PATH.PROPOSAL_JOB_TRANSFER,
  },
  {
    title: 'Điều chuyển công tác hàng loạt',
    path: APP_PATH.PROPOSAL_BULK_JOB_TRANSFER,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.PROPOSAL_BULK_JOB_TRANSFER_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.PROPOSAL_BULK_JOB_TRANSFER_EDIT,
  },
  {
    title: 'Cấp tài sản',
    path: APP_PATH.PROPOSAL_ASSET_ALLOCATION,
  },
  {
    title: 'Đổi thiết bị',
    path: APP_PATH.PROPOSAL_DEVICE_CHANGE,
  },
  {
    title: 'Quay lại làm việc',
    path: APP_PATH.PROPOSAL_RETURN_TO_WORK,
  },
  {
    title: 'Chi tiết',
    path: APP_PATH.PROPOSAL_RETURN_TO_WORK_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.PROPOSAL_RETURN_TO_WORK_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.PROPOSAL_RETURN_TO_WORK_HISTORY_DETAIL,
  },
  {
    title: 'Nghỉ chế độ',
    path: APP_PATH.PROPOSAL_STATUTORY_LEAVE,
  },
  {
    title: 'Chi tiết',
    path: APP_PATH.PROPOSAL_STATUTORY_LEAVE_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.PROPOSAL_STATUTORY_LEAVE_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.PROPOSAL_STATUTORY_LEAVE_HISTORY_DETAIL,
  },

  // ====================================
  {
    title: 'Hợp đồng',
    path: APP_PATH.CONTRACT,
  },
  // -------------------------------------
  {
    title: 'Loại hợp đồng',
    path: APP_PATH.CONTRACT_TYPE,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.CONTRACT_TYPE_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.CONTRACT_TYPE_EDIT,
  },
  {
    title: '',
    path: APP_PATH.CONTRACT_TYPE_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.CONTRACT_TYPE_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.CONTRACT_TYPE_HISTORY_DETAIL,
  },
  // -------------------------------------
  {
    title: 'Quản lý hợp đồng',
    path: APP_PATH.CONTRACT_MANAGE,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.CONTRACT_MANAGE_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.CONTRACT_MANAGE_EDIT,
  },
  {
    title: '',
    path: APP_PATH.CONTRACT_MANAGE_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.CONTRACT_MANAGE_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.CONTRACT_MANAGE_HISTORY_DETAIL,
  },
  // -------------------------------------
  {
    title: 'Phụ lục hợp đồng',
    path: APP_PATH.CONTRACT_APPENDIX,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.CONTRACT_APPENDIX_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.CONTRACT_APPENDIX_EDIT,
  },
  {
    title: '',
    path: APP_PATH.CONTRACT_APPENDIX_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.CONTRACT_APPENDIX_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.CONTRACT_APPENDIX_HISTORY_DETAIL,
  },
  // -------------------------------------
  {
    title: 'Đánh giá hợp đồng',
    path: APP_PATH.CONTRACT_EVALUATION,
  },
  // --- NV (Me) scope do mobile xử lý — không có breadcrumb phía web ---

  // --- Manager scope ---
  {
    title: 'Phiếu cần duyệt',
    path: APP_PATH.CONTRACT_EVALUATION_MANAGER,
  },
  {
    title: '',
    path: APP_PATH.CONTRACT_EVALUATION_MANAGER_DETAIL,
  },
  {
    title: 'Cập nhật',
    path: APP_PATH.CONTRACT_EVALUATION_MANAGER_EDIT,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.CONTRACT_EVALUATION_MANAGER_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.CONTRACT_EVALUATION_MANAGER_HISTORY_DETAIL,
  },
  // --- HR scope ---
  {
    title: 'Quản lý phiếu (HR)',
    path: APP_PATH.CONTRACT_EVALUATION_HR,
  },
  {
    title: 'Tạo phiếu thủ công',
    path: APP_PATH.CONTRACT_EVALUATION_HR_CREATE,
  },
  {
    title: '',
    path: APP_PATH.CONTRACT_EVALUATION_HR_DETAIL,
  },
  {
    title: 'Cập nhật',
    path: APP_PATH.CONTRACT_EVALUATION_HR_EDIT,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.CONTRACT_EVALUATION_HR_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.CONTRACT_EVALUATION_HR_HISTORY_DETAIL,
  },
  // -------------------------------------

  // ====================================
]

export const REPORT_ROUTES: AppRoute[] = [
  {
    title: 'Báo cáo',
    path: APP_PATH.REPORT,
  },
  // =====================================
  {
    title: 'Tuyển dụng',
    path: APP_PATH.REPORT_RECRUITMENT,
  },
  // -------------------------------------
  {
    title: 'Báo cáo nguồn tuyển dụng',
    path: APP_PATH.REPORT_RECRUITMENT_SOURCE,
  },
  {
    title: 'Báo cáo tăng trưởng nhân sự',
    path: APP_PATH.REPORT_RECRUITMENT_STAFF_GROWTH_WEEKLY,
  },
  {
    title: 'Báo cáo kênh tuyển dụng',
    path: APP_PATH.REPORT_RECRUITMENT_CHANNEL,
  },
  {
    title: 'Báo cáo chi phí tuyển dụng theo nguồn',
    path: APP_PATH.REPORT_RECRUITMENT_EXPENSE_BY_SOURCE,
  },
  {
    title: 'Báo cáo chi phí tuyển dụng theo nhân sự',
    path: APP_PATH.REPORT_RECRUITMENT_EXPENSE_BY_STAFF,
  },
  {
    title: 'Báo cáo chi phí giới thiệu',
    path: APP_PATH.REPORT_RECRUITMENT_REFERRAL_EXPENSE,
  },
  {
    title: 'Báo cáo ứng viên nhận việc',
    path: APP_PATH.REPORT_RECRUITMENT_HIRED_CANDIDATE,
  },
  // =====================================
  {
    title: 'Nhân sự',
    path: APP_PATH.REPORT_STAFF,
  },
  // -------------------------------------
  {
    title: 'Báo cáo số lượng nghỉ việc',
    path: APP_PATH.REPORT_STAFF_TURNOVER,
  },
  {
    title: 'Báo cáo số lượng nhân sự',
    path: APP_PATH.REPORT_STAFF_STATISTICS,
  },
  {
    title: 'Báo cáo Tỉ lệ lý do nghỉ việc',
    path: APP_PATH.REPORT_STAFF_RESIGNED_REASON,
  },
  {
    title: 'Báo cáo Thâm niên nhân viên',
    path: APP_PATH.REPORT_STAFF_SENIORITY,
  },
  {
    title: 'Báo cáo chuyển đổi loại nhân viên',
    path: APP_PATH.REPORT_STAFF_TYPE_CONVERSION,
  },
  {
    title: 'Báo cáo đánh giá chất lượng nhân sự',
    path: APP_PATH.REPORT_STAFF_SALES_REVENUE,
  },
  {
    title: 'Báo cáo nhân sự vào - nghỉ',
    path: APP_PATH.REPORT_STAFF_IN_OUT,
  },
  {
    title: 'Báo cáo điều chuyển công tác',
    path: APP_PATH.REPORT_STAFF_JOB_TRANSFER,
  },
  // =====================================
  {
    title: 'Chấm công',
    path: APP_PATH.REPORT_ATTENDANCE,
  },
  // -------------------------------------
  {
    title: 'Thống kê chấm công theo phương thức',
    path: APP_PATH.REPORT_ATTENDANCE_METHOD,
  },
  {
    title: 'Thống kê chấm công theo dự án',
    path: APP_PATH.REPORT_ATTENDANCE_PROJECT,
  },
  {
    title: 'Thống kê chấm công theo đơn vị trên từng dự án',
    path: APP_PATH.REPORT_ATTENDANCE_PROJECT_UNIT,
  },
  {
    title: 'Báo cáo chưa chấm công',
    path: APP_PATH.REPORT_ATTENDANCE_UNCHECKIN,
  },
]

export const ATTENDANCE_ROUTES: AppRoute[] = [
  {
    title: 'Chấm công',
    path: APP_PATH.ATTENDANCE,
  },
  {
    title: 'Máy chấm công',
    path: APP_PATH.ATTENDANCE_DEVICE,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.ATTENDANCE_DEVICE_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.ATTENDANCE_DEVICE_EDIT,
  },
  {
    title: '',
    path: APP_PATH.ATTENDANCE_DEVICE_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.ATTENDANCE_DEVICE_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.ATTENDANCE_DEVICE_HISTORY_DETAIL,
  },
  {
    title: 'Wifi chấm công',
    path: APP_PATH.ATTENDANCE_WIFI_DEVICE,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.ATTENDANCE_WIFI_DEVICE_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.ATTENDANCE_WIFI_DEVICE_EDIT,
  },
  {
    title: '',
    path: APP_PATH.ATTENDANCE_WIFI_DEVICE_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.ATTENDANCE_WIFI_DEVICE_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.ATTENDANCE_WIFI_DEVICE_HISTORY_DETAIL,
  },
  {
    title: 'Lịch làm việc',
    path: APP_PATH.ATTENDANCE_WORKING_SCHEDULE,
  },
  {
    title: 'Bảng chấm công',
    path: APP_PATH.ATTENDANCE_TIMESHEET,
  },
  {
    title: 'Xác nhận công',
    path: APP_PATH.ATTENDANCE_TIMESHEET_COMPLAINT,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.ATTENDANCE_TIMESHEET_COMPLAINT_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.ATTENDANCE_TIMESHEET_COMPLAINT_HISTORY_DETAIL,
  },
  {
    title: 'Log chấm công',
    path: APP_PATH.ATTENDANCE_LOG,
  },
  {
    title: 'Chấm công khác',
    path: APP_PATH.ATTENDANCE_OTHER,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.ATTENDANCE_OTHER_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.ATTENDANCE_OTHER_HISTORY_DETAIL,
  },
  {
    title: 'Danh sách miễn chấm công',
    path: APP_PATH.ATTENDANCE_EXEMPTION,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.ATTENDANCE_EXEMPTION_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.ATTENDANCE_EXEMPTION_HISTORY_DETAIL,
  },
  {
    title: 'Ngày lễ',
    path: APP_PATH.HOLIDAY_MANAGEMENT,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.HOLIDAY_MANAGEMENT_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.HOLIDAY_MANAGEMENT_EDIT,
  },
  {
    title: '',
    path: APP_PATH.HOLIDAY_MANAGEMENT_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.HOLIDAY_MANAGEMENT_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.HOLIDAY_MANAGEMENT_HISTORY_DETAIL,
  },
  {
    title: 'Định vị dự án',
    path: APP_PATH.PROJECT_LOCATION_MANAGEMENT,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.PROJECT_LOCATION_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.PROJECT_LOCATION_EDIT,
  },
  {
    title: '',
    path: APP_PATH.PROJECT_LOCATION_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.PROJECT_LOCATION_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.PROJECT_LOCATION_HISTORY_DETAIL,
  },
  {
    title: 'Nhân sự chấm công hàng ngày',
    path: APP_PATH.ATTENDANCE_DAILY_TIMESHEET,
  },
]

export const PROJECT_ROUTES: AppRoute[] = [
  // ==================== namespace nhóm "Thư ký dự án" (breadcrumb) ====================
  {
    title: 'Thư ký dự án',
    path: APP_PATH.PROJECT_ADMIN,
  },
  {
    title: 'Báo cáo',
    path: APP_PATH.PROJECT_ADMIN_REPORT,
  },
  // Các title dưới đây PHẢI trùng khít nhãn menu (`menu-items.ts`) và prop `title` của
  // trang (H1) — xem quy tắc "Một tên cho một màn" trong docs/ai/conventions.md.
  {
    title: 'Tổng quan doanh thu theo tháng',
    path: APP_PATH.REPORT_SALES_OVERVIEW,
  },
  {
    title: 'Doanh số theo Khối kinh doanh',
    path: APP_PATH.REPORT_SALES_BY_DIVISION,
  },
  {
    title: 'Doanh số theo Chi nhánh',
    path: APP_PATH.REPORT_SALES_BY_BRANCH,
  },
  {
    title: 'Doanh số theo Phòng kinh doanh',
    path: APP_PATH.REPORT_SALES_BY_DEPARTMENT,
  },
  {
    title: 'Doanh số theo Dự án',
    path: APP_PATH.REPORT_SALES_BY_PROJECT,
  },
  {
    title: 'Ma trận Dự án x Khối kinh doanh',
    path: APP_PATH.REPORT_SALES_MATRIX,
  },
  {
    title: 'Thu - Chi tiền khách',
    path: APP_PATH.REPORT_SALES_CUSTOMER_CASH_FLOW,
  },
  {
    title: 'Thu - Chi tiền khách: chứng từ',
    path: APP_PATH.REPORT_SALES_CUSTOMER_CASH_DETAIL,
  },
  {
    title: 'Cọc cộng dồn theo Chi nhánh',
    path: APP_PATH.REPORT_SALES_DEPOSIT_CUMULATIVE_BY_BRANCH,
  },
  {
    title: 'Cọc cộng dồn theo Khối kinh doanh',
    path: APP_PATH.REPORT_SALES_DEPOSIT_CUMULATIVE_BY_BLOCK,
  },
  // ====================================
  {
    title: 'Dự án',
    path: APP_PATH.PROJECT,
  },
  // ------------------------------------
  {
    title: 'Quản lý dự án',
    path: APP_PATH.PROJECT_MANAGEMENT,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.PROJECT_MANAGEMENT_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.PROJECT_MANAGEMENT_EDIT,
  },
  {
    title: '',
    path: APP_PATH.PROJECT_MANAGEMENT_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.PROJECT_MANAGEMENT_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.PROJECT_MANAGEMENT_HISTORY_DETAIL,
  },
  {
    title: 'Tài liệu',
    path: APP_PATH.PROJECT_MANAGEMENT_DOCUMENTS,
  },
  {
    title: 'Hoàn tiền đặt chỗ',
    path: APP_PATH.PROJECT_REFUND_BOOKING,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.PROJECT_REFUND_BOOKING_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.PROJECT_REFUND_BOOKING_EDIT,
  },
  {
    title: 'Chi tiết đề nghị',
    path: APP_PATH.PROJECT_REFUND_BOOKING_DETAIL,
  },
  // ------------------------------------
  {
    title: 'Hợp đồng đặt chỗ',
    path: APP_PATH.PROJECT_BOOKING_CONTRACT,
  },
  {
    title: 'Tạo hợp đồng',
    path: APP_PATH.PROJECT_BOOKING_CONTRACT_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.PROJECT_BOOKING_CONTRACT_EDIT,
  },
  {
    title: 'Chi tiết hợp đồng',
    path: APP_PATH.PROJECT_BOOKING_CONTRACT_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.PROJECT_BOOKING_CONTRACT_HISTORY,
  },
  {
    title: 'Chi tiết lịch sử',
    path: APP_PATH.PROJECT_BOOKING_CONTRACT_HISTORY_DETAIL,
  },
  {
    title: 'Quản lý thông tin bán hàng',
    path: APP_PATH.PROJECT_SALE_ALLOCATIONS,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.PROJECT_SALE_ALLOCATIONS_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.PROJECT_SALE_ALLOCATIONS_EDIT,
  },
  {
    title: '',
    path: APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.PROJECT_SALE_ALLOCATIONS_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.PROJECT_SALE_ALLOCATIONS_HISTORY_DETAIL,
  },
  {
    title: 'Quản lý bất động sản',
    path: APP_PATH.PROJECT_PRODUCT_INVENTORIES,
  },
  {
    title: 'Thêm mới',
    path: APP_PATH.PROJECT_PRODUCT_INVENTORIES_CREATE,
  },
  {
    title: '',
    path: APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.PROJECT_PRODUCT_INVENTORIES_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.PROJECT_PRODUCT_INVENTORIES_HISTORY_DETAIL,
  },
  // ------------------------------------
  {
    title: 'Quản lý chủ đầu tư',
    path: APP_PATH.INVESTOR_MANAGEMENT,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.INVESTOR_MANAGEMENT_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.INVESTOR_MANAGEMENT_EDIT,
  },
  {
    title: '',
    path: APP_PATH.INVESTOR_MANAGEMENT_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.INVESTOR_MANAGEMENT_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.INVESTOR_MANAGEMENT_HISTORY_DETAIL,
  },
  // ------------------------------------
  {
    title: 'Quản lý sàn liên kết',
    path: APP_PATH.EXCHANGE_MANAGEMENT,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.EXCHANGE_MANAGEMENT_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.EXCHANGE_MANAGEMENT_EDIT,
  },
  {
    title: '',
    path: APP_PATH.EXCHANGE_MANAGEMENT_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.EXCHANGE_MANAGEMENT_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.EXCHANGE_MANAGEMENT_HISTORY_DETAIL,
  },
  // ------------------------------------
  {
    title: 'Quản lý nguồn sàn',
    path: APP_PATH.SOURCE_EXCHANGE_MANAGEMENT,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.SOURCE_EXCHANGE_MANAGEMENT_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.SOURCE_EXCHANGE_MANAGEMENT_EDIT,
  },
  {
    title: '',
    path: APP_PATH.SOURCE_EXCHANGE_MANAGEMENT_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.SOURCE_EXCHANGE_MANAGEMENT_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.SOURCE_EXCHANGE_MANAGEMENT_HISTORY_DETAIL,
  },
]

export const KPI_ROUTES: AppRoute[] = [
  // ====================================
  {
    title: 'Đánh giá KPI',
    path: APP_PATH.KPI,
  },
  // ------------------------------------
  {
    title: 'Cấu trúc KPI',
    path: APP_PATH.KPI_STRUCTURE,
  },
  {
    title: 'Tiêu chí đánh giá KPI',
    path: APP_PATH.KPI_CRITERIA,
  },
  {
    title: 'Phiếu đánh giá KPI theo kỳ',
    path: APP_PATH.KPI_PERIOD_EVALUATION,
  },
  {
    title: 'Danh sách đánh giá KPI',
    path: APP_PATH.KPI_PERIOD_EVALUATION_DETAIL,
  },
  {
    title: 'Phiếu đánh giá chi tiết',
    path: APP_PATH.KPI_ASSESSMENT_DETAIL,
  },
  {
    title: 'Phiếu đánh giá KPI theo đơn vị',
    path: APP_PATH.KPI_UNIT_EVALUATION,
  },

  {
    title: '',
    path: APP_PATH.KPI_UNIT_EVALUATION_DETAIL,
  },
  {
    title: 'Bảng tổng kết KPI theo kỳ',
    path: APP_PATH.KPI_PERIOD_SUMMARY,
  },
  {
    title: '',
    path: APP_PATH.KPI_PERIOD_SUMMARY_DETAIL,
  },
  {
    title: '',
    path: APP_PATH.KPI_PERIOD_SUMMARY_EMPLOYEE_DETAIL,
  },
]

export const PAYROLL_ROUTES: AppRoute[] = [
  // ====================================
  {
    title: 'Tính lương',
    path: APP_PATH.PAYROLL,
  },
  {
    path: APP_PATH.PAYROLL_PERIOD,
    title: 'Kỳ lương',
  },
  {
    path: APP_PATH.PAYROLL_PERIOD_CREATE,
    title: 'Tạo mới',
  },
  {
    path: APP_PATH.PAYROLL_PERIOD_DETAIL,
    title: 'Chi tiết kỳ lương',
  },
  {
    title: 'Lịch sử kỳ lương',
    path: APP_PATH.PAYROLL_PERIOD_HISTORY,
  },
  {
    title: 'Chi tiết lịch sử kỳ lương',
    path: APP_PATH.PAYROLL_PERIOD_HISTORY_DETAIL,
  },
  {
    title: 'Lịch sử phiếu lương',
    path: APP_PATH.PAYROLL_PERIOD_PAYSLIP_HISTORY,
  },
  {
    title: 'Chi tiết lịch sử phiếu lương',
    path: APP_PATH.PAYROLL_PERIOD_PAYSLIP_HISTORY_DETAIL,
  },
  // ------------------------------------
  {
    title: 'Cấu hình lương',
    path: APP_PATH.PAYROLL_CONFIGURATION,
  },
  {
    title: 'Công tác phí',
    path: APP_PATH.TRAVEL_EXPENSE,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.TRAVEL_EXPENSE_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.TRAVEL_EXPENSE_EDIT,
  },
  {
    title: '',
    path: APP_PATH.TRAVEL_EXPENSE_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.TRAVEL_EXPENSE_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.TRAVEL_EXPENSE_HISTORY_DETAIL,
  },
  {
    title: 'Truy thu/truy lĩnh',
    path: APP_PATH.RECOVERY_VOUCHER,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.RECOVERY_VOUCHER_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.RECOVERY_VOUCHER_EDIT,
  },
  {
    title: '',
    path: APP_PATH.RECOVERY_VOUCHER_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.RECOVERY_VOUCHER_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.RECOVERY_VOUCHER_HISTORY_DETAIL,
  },
  {
    title: 'Doanh thu kinh doanh',
    path: APP_PATH.SALES_REVENUE,
  },
  {
    title: '',
    path: APP_PATH.SALES_REVENUE_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.SALES_REVENUE_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.SALES_REVENUE_HISTORY_DETAIL,
  },
  {
    title: 'Đánh giá phiếu KPI',
    path: APP_PATH.KPI_ASSESSMENT_ASSESS,
  },
  {
    title: 'Phiếu đánh giá KPI theo đơn vị',
    path: APP_PATH.KPI_UNIT_EVALUATION,
  },
  {
    title: 'Bảng tổng kết KPI kỳ',
    path: APP_PATH.KPI_PERIOD_SUMMARY,
  },
  {
    title: 'Đánh giá nhân viên (Quản lý)',
    path: APP_PATH.KPI_MANAGER_PERIOD_EVALUATION,
  },
  {
    title: 'Danh sách đánh giá',
    path: APP_PATH.KPI_MANAGER_PERIOD_EVALUATION_DETAIL,
  },
  {
    title: 'Phiếu đánh giá',
    path: APP_PATH.KPI_MANAGER_ASSESSMENT_DETAIL,
  },
  {
    title: 'Đánh giá phiếu KPI',
    path: APP_PATH.KPI_MANAGER_ASSESSMENT_ASSESS,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.KPI_ASSESSMENT_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.KPI_ASSESSMENT_HISTORY_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.KPI_MANAGER_ASSESSMENT_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.KPI_MANAGER_ASSESSMENT_HISTORY_DETAIL,
  },
  {
    title: 'Xử phạt',
    path: APP_PATH.PENALTY_MANAGEMENT,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.PENALTY_MANAGEMENT_CREATE,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.PENALTY_MANAGEMENT_EDIT,
  },
  {
    title: '',
    path: APP_PATH.PENALTY_MANAGEMENT_DETAIL,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.PENALTY_MANAGEMENT_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.PENALTY_MANAGEMENT_HISTORY_DETAIL,
  },
]

export const ELIBRARY_ROUTES: AppRoute[] = [
  // ====================================
  {
    title: 'Thư viện điện tử',
    path: APP_PATH.ELIBRARY,
  },
  {
    path: APP_PATH.ELIBRARY_CATEGORY,
    title: 'Danh mục tài liệu',
  },
  {
    path: APP_PATH.ELIBRARY_MY_DOCUMENTS,
    title: 'Tài liệu cá nhân',
  },
  {
    path: APP_PATH.ELIBRARY_DEPARTMENT_DOCUMENTS,
    title: 'Tài liệu phòng ban',
  },
  {
    path: APP_PATH.ELIBRARY_COMPANY_DOCUMENTS,
    title: 'Tài liệu toàn công ty',
  },
  {
    path: APP_PATH.ELIBRARY_SHARED_WITH_ME_DOCUMENTS,
    title: 'Tài liệu chia sẻ với tôi',
  },
  {
    path: APP_PATH.ELIBRARY_ACCESS_REQUESTS,
    title: 'Yêu cầu truy cập',
  },
  {
    path: APP_PATH.ELIBRARY_ITEM_ACCESS_REQUESTS,
    title: 'Yêu cầu truy cập',
  },
  {
    path: APP_PATH.ELIBRARY_CATEGORY_CREATE,
    title: 'Tạo mới',
  },
  {
    path: APP_PATH.ELIBRARY_CATEGORY_EDIT,
    title: 'Chỉnh sửa',
  },
]

export const DEPOSIT_ROUTES: AppRoute[] = [
  // ====================================
  {
    path: APP_PATH.CUSTOMER_MANAGER,
    title: 'Quản lý khách hàng',
  },
  {
    path: APP_PATH.CUSTOMER_MANAGER_CREATE,
    title: 'Tạo mới',
  },
  {
    path: APP_PATH.CUSTOMER_MANAGER_EDIT,
    title: 'Chỉnh sửa',
  },
  {
    path: APP_PATH.CUSTOMER_MANAGER_HISTORY,
    title: 'Lịch sử',
  },
  {
    path: APP_PATH.CUSTOMER_MANAGER_HISTORY_DETAIL,
    title: 'Lịch sử chi tiết',
  },
]

export const SALE_ROUTES: AppRoute[] = [
  // ====================================
  {
    title: 'Phiếu thông tin giao dịch',
    path: APP_PATH.TRANSACTION_SHEET,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.TRANSACTION_SHEET_CREATE,
  },
  {
    title: 'Chi tiết',
    path: APP_PATH.TRANSACTION_SHEET_DETAIL,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.TRANSACTION_SHEET_EDIT,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.TRANSACTION_SHEET_HISTORY,
  },
  // ====================================
  {
    title: 'Đối chiếu chủ đầu tư',
    path: APP_PATH.INVESTOR_RECONCILIATION,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.INVESTOR_RECONCILIATION_CREATE,
  },
  {
    title: 'Chi tiết',
    path: APP_PATH.INVESTOR_RECONCILIATION_DETAIL,
  },
  // ------------------------------------
  {
    title: 'Đối chiếu F2',
    path: APP_PATH.F2_RECONCILIATION,
  },
  {
    title: 'Chi tiết',
    path: APP_PATH.F2_RECONCILIATION_DETAIL,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.F2_RECONCILIATION_EDIT,
  },
  // ------------------------------------
  {
    title: 'Đối chiếu CTV',
    path: APP_PATH.CTV_RECONCILIATION,
  },
  {
    title: 'Chi tiết',
    path: APP_PATH.CTV_RECONCILIATION_DETAIL,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.CTV_RECONCILIATION_EDIT,
  },
  // ------------------------------------
  {
    title: 'Hợp đồng & giao dịch',
    path: APP_PATH.SALES_CONTRACTS_TRANSACTIONS,
  },
  {
    title: 'Đề xuất hỗ trợ phí bán hàng',
    path: APP_PATH.FEE_SUPPORT_PROPOSAL,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.FEE_SUPPORT_PROPOSAL_CREATE,
  },
  {
    title: '',
    path: APP_PATH.FEE_SUPPORT_PROPOSAL_DETAIL,
  },
  // ------------------------------------
  {
    title: 'Danh sách giao dịch',
    path: APP_PATH.DEAL,
  },
  {
    path: APP_PATH.DEAL_DETAIL,
    title: 'Chi tiết',
  },
  {
    title: 'Hợp đồng đặt cọc',
    path: APP_PATH.DEPOSIT_CONTRACT,
  },
  {
    path: APP_PATH.DEPOSIT_CONTRACT_CREATE,
    title: 'Tạo mới',
  },
  {
    path: APP_PATH.DEPOSIT_CONTRACT_DETAIL,
    title: 'Chi tiết',
  },
  {
    path: APP_PATH.DEPOSIT_CONTRACT_EDIT,
    title: 'Chỉnh sửa',
  },
  {
    path: APP_PATH.DEPOSIT_CONTRACT_HISTORY,
    title: 'Lịch sử',
  },
  {
    path: APP_PATH.DEPOSIT_CONTRACT_HISTORY_DETAIL,
    title: 'Lịch sử chi tiết',
  },
]

export const ACCOUNTING_ROUTES: AppRoute[] = [
  {
    title: 'Kế toán',
    path: APP_PATH.ACCOUNTING,
  },
  // ===== Hoa hồng (group-only namespace) =====
  {
    title: 'Hoa hồng',
    path: APP_PATH.ACCOUNTING_COMMISSION,
  },
  // Sale / management groups live OUTSIDE /accounting/commissions (their own
  // top-level segments) so the breadcrumb is "Kế toán / Hoa hồng sale / ..."
  // with no extra "Hoa hồng" crumb.
  {
    title: 'Hoa hồng sale',
    path: APP_PATH.ACCOUNTING_COMMISSION_SALE,
  },
  {
    title: 'Hoa hồng quản lý',
    path: APP_PATH.ACCOUNTING_COMMISSION_MANAGEMENT,
  },
  // ===== HH theo tháng — Quản lý =====
  {
    // Nhãn phải trùng menu sidebar `menu-items.ts` — màn danh sách không tự truyền `title`
    // nên thiếu mục này thì cả H1 lẫn crumb cuối rơi về fallback segment ("Manager-monthly").
    title: 'HH theo tháng — Quản lý',
    path: APP_PATH.COMMISSION_MANAGER_MONTHLY,
  },
  {
    // Cấp cuối đến từ `idLabel` của trang detail — xem ghi chú ở DEAL_PERIOD_ALLOCATION_DETAIL.
    title: '',
    path: APP_PATH.COMMISSION_MANAGER_DETAIL,
  },
  // ===== Bảng theo dõi doanh thu Xúc tiến (20.8) =====
  {
    title: 'Bảng theo dõi doanh thu Xúc tiến',
    path: APP_PATH.PROMOTION_DISTRIBUTION_TRACKING,
  },
  {
    title: 'Chi tiết phân chia',
    path: APP_PATH.PROMOTION_DISTRIBUTION_TRACKING_DETAIL,
  },
  // ===== Hoa hồng Giám đốc dự án (20.8.7) =====
  {
    title: 'Hoa hồng Giám đốc dự án',
    path: APP_PATH.DIRECTOR_COMMISSION_TRACKING,
  },
  {
    title: 'Chi tiết',
    path: APP_PATH.DIRECTOR_COMMISSION_TRACKING_DETAIL,
  },
  // ===== Đối tác =====
  {
    title: 'Đối tác',
    path: APP_PATH.ACCOUNTING_COLLABORATOR,
  },
  // ===== Cộng tác viên (20.1) =====
  {
    title: 'Cộng tác viên',
    path: APP_PATH.COLLABORATOR_MANAGEMENT,
  },
  {
    title: 'Thêm Cộng tác viên',
    path: APP_PATH.COLLABORATOR_CREATE,
  },
  {
    title: 'Chi tiết',
    path: APP_PATH.COLLABORATOR_DETAIL,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.COLLABORATOR_EDIT,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.COLLABORATOR_HISTORY,
  },
  {
    title: 'Chi tiết lịch sử',
    path: APP_PATH.COLLABORATOR_HISTORY_DETAIL,
  },
  // ===== Hợp đồng CTV (20.2) =====
  {
    title: 'Hợp đồng CTV',
    path: APP_PATH.COLLABORATOR_CONTRACT_MANAGEMENT,
  },
  {
    title: 'Chi tiết',
    path: APP_PATH.COLLABORATOR_CONTRACT_DETAIL,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.COLLABORATOR_CONTRACT_EDIT,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.COLLABORATOR_CONTRACT_HISTORY,
  },
  {
    title: 'Chi tiết lịch sử',
    path: APP_PATH.COLLABORATOR_CONTRACT_HISTORY_DETAIL,
  },
  // ===== Cấu hình (Config namespace) =====
  {
    title: 'Cấu hình',
    path: APP_PATH.ACCOUNTING_CONFIG,
  },
  // ===== Tài khoản ngân hàng (20.3) =====
  {
    title: 'Tài khoản ngân hàng',
    path: APP_PATH.COMPANY_BANK_ACCOUNT_MANAGEMENT,
  },
  {
    title: 'Thêm tài khoản',
    path: APP_PATH.COMPANY_BANK_ACCOUNT_CREATE,
  },
  {
    title: 'Chi tiết',
    path: APP_PATH.COMPANY_BANK_ACCOUNT_DETAIL,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.COMPANY_BANK_ACCOUNT_EDIT,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.COMPANY_BANK_ACCOUNT_HISTORY,
  },
  {
    title: 'Chi tiết lịch sử',
    path: APP_PATH.COMPANY_BANK_ACCOUNT_HISTORY_DETAIL,
  },
  // ===== Kỳ kế toán =====
  {
    title: 'Kỳ kế toán',
    path: APP_PATH.ACCOUNTING_PERIOD_MANAGEMENT,
  },
  {
    title: 'Tạo kỳ kế toán',
    path: APP_PATH.ACCOUNTING_PERIOD_CREATE,
  },
  {
    title: 'Chi tiết',
    path: APP_PATH.ACCOUNTING_PERIOD_DETAIL,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.ACCOUNTING_PERIOD_EDIT,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.ACCOUNTING_PERIOD_HISTORY,
  },
  {
    title: 'Chi tiết lịch sử',
    path: APP_PATH.ACCOUNTING_PERIOD_HISTORY_DETAIL,
  },
  // ===== Định mức hoa hồng phòng hỗ trợ =====
  {
    title: 'Định mức hoa hồng phòng hỗ trợ',
    path: APP_PATH.SUPPORT_DEPT_COMMISSION_RATE,
  },
  // ===== Giao dịch (Transactions namespace) =====
  {
    title: 'Giao dịch',
    path: APP_PATH.ACCOUNTING_TRANSACTION,
  },
  {
    title: 'Phiếu chi',
    path: APP_PATH.PAYMENT_VOUCHER_MANAGEMENT,
  },
  {
    title: 'Tạo phiếu chi',
    path: APP_PATH.PAYMENT_VOUCHER_CREATE,
  },
  {
    title: 'Chi tiết',
    path: APP_PATH.PAYMENT_VOUCHER_DETAIL,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.PAYMENT_VOUCHER_EDIT,
  },
  {
    title: 'Lịch sử',
    path: APP_PATH.PAYMENT_VOUCHER_HISTORY,
  },
  {
    title: 'Chi tiết lịch sử',
    path: APP_PATH.PAYMENT_VOUCHER_HISTORY_DETAIL,
  },

  {
    title: 'Phiếu thu',
    path: APP_PATH.RECEIPT_VOUCHER,
  },
  {
    title: 'Tạo phiếu thu',
    path: APP_PATH.RECEIPT_VOUCHER_CREATE,
  },
  {
    title: 'Chi tiết phiếu thu',
    path: APP_PATH.RECEIPT_VOUCHER_DETAIL,
  },
  {
    title: 'Chỉnh sửa phiếu thu',
    path: APP_PATH.RECEIPT_VOUCHER_EDIT,
  },
  // ===== Phiếu tạm ứng (20.17) =====
  {
    title: 'Phiếu tạm ứng',
    path: APP_PATH.COMMISSION_ADVANCE,
  },
  // ===== Đợt thanh toán hoa hồng =====
  {
    title: 'Đợt thanh toán hoa hồng',
    path: APP_PATH.COMM_PAYMENT_LIST,
  },
  {
    title: 'Tạo đợt thanh toán hoa hồng',
    path: APP_PATH.COMM_PAYMENT_CREATE,
  },
  {
    title: 'Tạo đề xuất tạm ứng',
    path: APP_PATH.COMMISSION_ADVANCE_CREATE,
  },
  {
    title: 'Chi tiết đề xuất tạm ứng',
    path: APP_PATH.COMMISSION_ADVANCE_DETAIL,
  },
  {
    title: 'Chỉnh sửa đề xuất tạm ứng',
    path: APP_PATH.COMMISSION_ADVANCE_EDIT,
  },
  {
    title: 'Lịch sử thay đổi đề xuất tạm ứng',
    path: APP_PATH.COMMISSION_ADVANCE_HISTORY,
  },
  {
    title: 'Chi tiết lịch sử đề xuất tạm ứng',
    path: APP_PATH.COMMISSION_ADVANCE_HISTORY_DETAIL,
  },
  // ===== Hóa đơn bán ra =====
  {
    title: 'Hóa đơn bán ra',
    path: APP_PATH.SALES_INVOICE,
  },
  {
    title: 'Tạo mới',
    path: APP_PATH.SALES_INVOICE_CREATE,
  },
  {
    title: 'Chi tiết',
    path: APP_PATH.SALES_INVOICE_DETAIL,
  },
  {
    title: 'Chỉnh sửa',
    path: APP_PATH.SALES_INVOICE_EDIT,
  },
  {
    title: 'Lịch sử thay đổi',
    path: APP_PATH.SALES_INVOICE_HISTORY,
  },
  {
    title: 'Chi tiết',
    path: APP_PATH.SALES_INVOICE_HISTORY_DETAIL,
  },
  // ===== Hóa đơn đầu vào =====
  {
    title: 'Hóa đơn đầu vào',
    path: APP_PATH.INPUT_INVOICE,
  },
  {
    title: 'Tạo hóa đơn đầu vào',
    path: APP_PATH.INPUT_INVOICE_CREATE,
  },
  {
    title: 'Chi tiết hóa đơn đầu vào',
    path: APP_PATH.INPUT_INVOICE_DETAIL,
  },
  {
    title: 'Chỉnh sửa hóa đơn đầu vào',
    path: APP_PATH.INPUT_INVOICE_EDIT,
  },
  {
    title: 'Lịch sử thay đổi hóa đơn đầu vào',
    path: APP_PATH.INPUT_INVOICE_HISTORY,
  },
  {
    title: 'Chi tiết lịch sử hóa đơn đầu vào',
    path: APP_PATH.INPUT_INVOICE_HISTORY_DETAIL,
  },
  {
    // Trùng nhãn menu và tiêu đề màn danh sách — breadcrumb của màn chi tiết dựng từ chính
    // metadata này, nhãn lệch là người dùng thấy hai tên cho cùng một màn.
    title: 'Giao dịch tiền về đợt này',
    path: APP_PATH.DEAL_PERIOD_ALLOCATION,
  },
  {
    // Cấp cuối do page tự đặt qua `PageTitle.idLabel` (mã căn / mã deal), như mọi màn chi tiết khác.
    title: '',
    path: APP_PATH.DEAL_PERIOD_ALLOCATION_DETAIL,
  },
  {
    title: 'Lịch sử giao dịch tháng',
    path: APP_PATH.DEAL_PERIOD_ALLOCATION_HISTORY,
  },
  {
    title: 'Lịch sử chi tiết',
    path: APP_PATH.DEAL_PERIOD_ALLOCATION_HISTORY_DETAIL,
  },
  {
    title: 'Chia HH theo tháng',
    path: APP_PATH.MONTHLY_COMMISSION_SPLIT_SHEET,
  },
  {
    // Xem ghi chú ở DEAL_PERIOD_ALLOCATION_DETAIL — cấp cuối đến từ `idLabel`.
    title: '',
    path: APP_PATH.MONTHLY_COMMISSION_SPLIT_SHEET_DETAIL,
  },

  {
    // Cấp giữa của breadcrumb màn chi tiết/tạo mới đến từ đây. Màn list tự ghi đè cấp cuối
    // bằng prop `title` của PageTitle nên trước đây chỉ màn chi tiết lộ nhãn sai (CR 86eyj428y).
    title: 'Đợt đi tiền',
    path: APP_PATH.EMPLOYEE_PAYOUT_BATCH,
  },
  {
    title: 'Tạo đợt chi',
    path: APP_PATH.EMPLOYEE_PAYOUT_BATCH_CREATE,
  },
  {
    title: 'Chi tiết đợt chi',
    path: APP_PATH.EMPLOYEE_PAYOUT_BATCH_DETAIL,
  },
  {
    title: 'Đợt thưởng nhập ngoài',
    path: APP_PATH.IMPORTED_BONUS_BATCH,
  },
  {
    title: 'Chi tiết đợt thưởng',
    path: APP_PATH.IMPORTED_BONUS_BATCH_DETAIL,
  },
  {
    title: 'Quỹ tạm ứng thưởng CĐT theo dự án',
    path: APP_PATH.INVESTOR_ADVANCE,
  },
  {
    title: 'Khởi tạo tài khoản tạm ứng',
    path: APP_PATH.INVESTOR_ADVANCE_CREATE,
  },
  {
    title: 'Chi tiết quỹ tạm ứng chủ đầu tư',
    path: APP_PATH.INVESTOR_ADVANCE_DETAIL,
  },
  {
    title: 'Thanh toán hoa hồng',
    path: APP_PATH.COMM_PAYMENT_LIST,
  },
  {
    title: 'Tạo đợt thanh toán',
    path: APP_PATH.COMM_PAYMENT_CREATE,
  },
  // NEW MISSING COMMISSIONS
  {
    title: 'HH theo tháng — Sale',
    path: APP_PATH.COMMISSION_SALE_MONTHLY,
  },
  {
    title: 'Chi tiết HH theo tháng — Sale',
    path: APP_PATH.COMMISSION_SALE_MONTHLY_DETAIL,
  },
  {
    title: 'HH theo tháng — F2',
    path: APP_PATH.COMMISSION_F2_MONTHLY,
  },
  {
    title: 'Chi tiết HH theo tháng — F2',
    path: APP_PATH.COMMISSION_F2_MONTHLY_DETAIL,
  },
  {
    title: 'HH theo tháng — CTV',
    path: APP_PATH.COMMISSION_CTV_MONTHLY,
  },
  {
    title: 'Chi tiết HH theo tháng — CTV',
    path: APP_PATH.COMMISSION_CTV_MONTHLY_DETAIL,
  },
  {
    title: 'HH theo tháng — Sàn liên kết',
    path: APP_PATH.COMMISSION_SLK_MONTHLY,
  },
  {
    title: 'Chi tiết HH theo tháng — Sàn liên kết',
    path: APP_PATH.COMMISSION_SLK_MONTHLY_DETAIL,
  },
  {
    title: 'Chi tiết pool nguồn F2',
    path: APP_PATH.COMMISSION_SLK_MONTHLY_POOL,
  },
  {
    title: 'Hoa hồng theo doanh thu',
    path: APP_PATH.COMMISSION_BY_REVENUE,
  },
  {
    title: 'Tạm giữ HH Sale',
    path: APP_PATH.COMMISSION_HOLD,
  },
  {
    title: 'Chi tiết tạm giữ HH Sale',
    path: APP_PATH.COMMISSION_HOLD_DETAIL,
  },

  // ACCOUNTING REPORTS
  {
    title: 'Báo cáo',
    path: APP_PATH.REPORT_ACCOUNTING,
  },
  {
    title: 'Hoàn ứng / Tạm ứng',
    path: APP_PATH.REPORT_ACCOUNTING_ADVANCE,
  },
  {
    title: 'Thu nhập theo người thực nhận',
    path: APP_PATH.REPORT_ACCOUNTING_INCOME_BY_RECIPIENT,
  },
  {
    title: 'BC Công nợ chủ đầu tư',
    path: APP_PATH.REPORT_ACCOUNTING_INVESTOR_DEBT,
  },
  {
    title: 'BC Công nợ F2',
    path: APP_PATH.REPORT_ACCOUNTING_F2_DEBT,
  },
  {
    title: 'BC Công nợ dự án',
    path: APP_PATH.REPORT_ACCOUNTING_PROJECT_RECEIVABLE,
  },
  {
    title: 'BC Công nợ đối tác',
    path: APP_PATH.REPORT_ACCOUNTING_PARTNER_DEBT,
  },
  {
    title: 'BC Công nợ theo căn',
    path: APP_PATH.REPORT_ACCOUNTING_INVESTOR_INVOICE_RECONCILIATION,
  },
  {
    title: 'Bảng tổng hợp HHQL',
    path: APP_PATH.REPORT_ACCOUNTING_MANAGEMENT_COMMISSION_SUMMARY,
  },
  {
    title: 'Báo cáo nội bộ',
    path: APP_PATH.REPORT_ACCOUNTING_INTERNAL_REPORT,
  },
  {
    title: 'BC theo chi nhánh và F2',
    path: APP_PATH.REPORT_ACCOUNTING_BRANCH_F2_REPORT,
  },
  {
    title: 'BC tổng hợp thuế & thu nhập năm',
    path: APP_PATH.REPORT_ACCOUNTING_ANNUAL_TAX_INCOME,
  },
  {
    title: 'BC chi tiền hoa hồng bán hàng',
    path: APP_PATH.REPORT_ACCOUNTING_SALES_COMMISSION_PAYOUT,
  },
  {
    title: 'BC Công nợ hoa hồng pháp nhân',
    path: APP_PATH.REPORT_ACCOUNTING_LEGAL_ENTITY_COMMISSION_DEBT,
  },
  {
    title: 'BC Công nợ hóa đơn pháp nhân',
    path: APP_PATH.REPORT_ACCOUNTING_LEGAL_ENTITY_INVOICE_DEBT,
  },
  {
    title: 'BC Hoa hồng phải trả',
    path: APP_PATH.REPORT_ACCOUNTING_COMMISSION_PAYABLE_REPORT,
  },
  {
    title: 'Dự án về tiền',
    path: APP_PATH.REPORT_ACCOUNTING_PROJECT_MONEY_IN,
  },
  {
    title: 'Doanh thu theo chi nhánh',
    path: APP_PATH.REPORT_ACCOUNTING_REVENUE_BY_BRANCH,
  },
  {
    title: 'Căn chưa chi hết',
    path: APP_PATH.REPORT_ACCOUNTING_UNITS_NOT_FULLY_PAID,
  },
  {
    title: 'Thu nhập theo người đứng tên',
    path: APP_PATH.REPORT_ACCOUNTING_INCOME_BY_SALESPERSON,
  },
  {
    title: 'HHQL theo dự án',
    path: APP_PATH.REPORT_ACCOUNTING_HHQL_BY_PROJECT,
  },
  {
    title: 'Tổng hợp theo dự án',
    path: APP_PATH.REPORT_ACCOUNTING_PROJECT_SUMMARY,
  },
]

export const CHAT_ROUTES: AppRoute[] = [
  {
    title: 'Danh sách Group Channel',
    path: APP_PATH.CHAT_GROUP_CHANNELS,
  },
]

export const APP_ROUTES: AppRoute[] = [
  // Public pages with layout

  // Login routes with nested structure
  {
    path: APP_PATH.LOGIN,
    title: 'Đăng nhập',
    children: [
      {
        path: APP_PATH.LOGIN,
        title: 'Đăng nhập',
      },
      {
        path: APP_PATH.LOGIN_OTP,
        title: 'Xác thực OTP',
      },
      {
        path: APP_PATH.LOGIN_FORGOT_PASSWORD,
        title: 'Quên mật khẩu',
      },
      {
        path: APP_PATH.LOGIN_RENEW_PASSWORD,
        title: 'Đặt lại mật khẩu',
      },
    ],
  },
  {
    path: APP_PATH.UNAUTHORIZED,
    title: 'Không có quyền truy cập',
  },
  {
    path: APP_PATH.NOT_FOUND,
    title: 'Không tìm thấy trang',
  },

  // Authenticated pages (always with layout)
  {
    path: APP_PATH.DASHBOARD,
    title: 'Dashboard',
  },
  {
    path: APP_PATH.CHANGE_PASSWORD,
    title: 'Đổi mật khẩu',
  },

  ...ADMIN_ROUTES,

  ...HRM_ROUTES,

  ...REPORT_ROUTES,

  ...ATTENDANCE_ROUTES,

  ...PROJECT_ROUTES,

  ...KPI_ROUTES,

  ...PAYROLL_ROUTES,

  ...ELIBRARY_ROUTES,

  ...DEPOSIT_ROUTES,

  ...SALE_ROUTES,

  ...ACCOUNTING_ROUTES,

  ...CHAT_ROUTES,
]

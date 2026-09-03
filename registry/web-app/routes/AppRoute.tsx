import { lazy, Suspense } from 'react'

import { APP_PATH, APP_ROUTES, type AppRoute } from '@/routes/AppRoute.constant.ts'
import { FeatureGuard } from '@/routes/FeatureGuard'
import { PermissionGuard, withPermission } from '@/routes/PermissionGuard'
export { FeatureGuard, PermissionGuard, withPermission }
import { createBrowserRouter, Outlet, type RouteObject } from 'react-router-dom'

import { FullScreenLoading, PageLoading } from '@/components/Loading.tsx'
import IndexRedirect from '@/components/redirect/IndexRedirect'
import ProjectDocumentsRedirect from '@/components/redirect/ProjectDocumentsRedirect'
import AppLayout from '@/layouts/AppLayout.tsx'
import LoginLayout from '@/layouts/LoginLayout.tsx'
import { ErrorPage } from '@/pages/errors/ErrorPage'
import UnauthorizedPage from '@/pages/errors/UnauthorizedPage'
import AuthGuard from '@/routes/AuthGuard.tsx'

export type AppRouteObject = Omit<RouteObject, 'children'> & {
  permission?: string | string[]
  children?: AppRouteObject[]
}

function wrapRoutesWithPermission(routes: AppRouteObject[]): RouteObject[] {
  return routes.map((route) => {
    const { permission, element, children, ...rest } = route
    const permissionScopedElement = permission ? (
      <PermissionGuard permissions={permission}>{element}</PermissionGuard>
    ) : (
      element
    )

    // FeatureGuard bọc ngoài cùng để cụm tính năng bị tắt luôn thắng mọi kiểm tra quyền.
    // Route không khai báo `element` phải giữ nguyên `undefined` — react-router mặc định
    // render `<Outlet />` cho chúng, bọc lại sẽ làm mất route con.
    const wrappedElement = element ? (
      <FeatureGuard>{permissionScopedElement}</FeatureGuard>
    ) : (
      element
    )

    const wrappedChildren = children ? wrapRoutesWithPermission(children) : undefined

    return {
      ...rest,
      element: wrappedElement,
      children: wrappedChildren,
    } as RouteObject
  })
}

export function createAppRouter(routes: AppRouteObject[]) {
  return createBrowserRouter(wrapRoutesWithPermission(routes))
}

const CustomerPage = lazy(() => import('@/pages/authenticated/customer/CustomerPage'))
const CustomerCreatePage = lazy(() => import('@/pages/authenticated/customer/CustomerCreatePage'))
const CustomerEditPage = lazy(() => import('@/pages/authenticated/customer/CustomerEditPage'))
const CustomerDetailPage = lazy(() => import('@/pages/authenticated/customer/CustomerDetailPage'))

// Chat Workspace
const ChatPage = lazy(() => import('@/pages/authenticated/chat/ChatPage'))
const GroupChannelsPage = lazy(
  () => import('@/pages/authenticated/chat/group-channels/GroupChannelsPage')
)

// Accounting — Collaborator (20.1)
const CollaboratorPage = lazy(
  () => import('@/pages/authenticated/accounting/collaborators/CollaboratorPage')
)
const CollaboratorCreatePage = lazy(
  () => import('@/pages/authenticated/accounting/collaborators/CollaboratorCreatePage')
)
const CollaboratorEditPage = lazy(
  () => import('@/pages/authenticated/accounting/collaborators/CollaboratorEditPage')
)
const CollaboratorDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/collaborators/CollaboratorDetailPage')
)
// Accounting — Collaborator Contract (20.2)
const CollaboratorContractPage = lazy(
  () => import('@/pages/authenticated/accounting/collaborator-contracts/CollaboratorContractPage')
)
const CollaboratorContractDetailPage = lazy(
  () =>
    import('@/pages/authenticated/accounting/collaborator-contracts/CollaboratorContractDetailPage')
)
const CollaboratorContractEditPage = lazy(
  () =>
    import('@/pages/authenticated/accounting/collaborator-contracts/CollaboratorContractEditPage')
)
// Accounting — Company Bank Account (20.3)
const BankAccountPage = lazy(
  () => import('@/pages/authenticated/accounting/bank-accounts/BankAccountPage')
)
const BrokerCertificatePage = lazy(
  () => import('@/pages/authenticated/accounting/broker-certificates/BrokerCertificatePage')
)
const BrokerCertificateCreatePage = lazy(
  () => import('@/pages/authenticated/accounting/broker-certificates/BrokerCertificateCreatePage')
)
const BrokerCertificateDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/broker-certificates/BrokerCertificateDetailPage')
)
const BrokerCertificateEditPage = lazy(
  () => import('@/pages/authenticated/accounting/broker-certificates/BrokerCertificateEditPage')
)
const BankAccountCreatePage = lazy(
  () => import('@/pages/authenticated/accounting/bank-accounts/BankAccountCreatePage')
)
const BankAccountEditPage = lazy(
  () => import('@/pages/authenticated/accounting/bank-accounts/BankAccountEditPage')
)
const BankAccountDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/bank-accounts/BankAccountDetailPage')
)
// Accounting — Accounting Period
const AccountingPeriodPage = lazy(
  () => import('@/pages/authenticated/accounting/accounting-periods/AccountingPeriodPage')
)
const AccountingPeriodCreatePage = lazy(
  () => import('@/pages/authenticated/accounting/accounting-periods/AccountingPeriodCreatePage')
)
const AccountingPeriodEditPage = lazy(
  () => import('@/pages/authenticated/accounting/accounting-periods/AccountingPeriodEditPage')
)
const AccountingPeriodDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/accounting-periods/AccountingPeriodDetailPage')
)
// Accounting — Promotion Distribution Revenue Tracking (20.8)
const PromotionDistributionListPage = lazy(
  () =>
    import('@/pages/authenticated/accounting/promotion-distributions/PromotionDistributionListPage')
)
const PromotionDistributionDetailPage = lazy(
  () =>
    import(
      '@/pages/authenticated/accounting/promotion-distributions/PromotionDistributionDetailPage'
    )
)
// Accounting — Project Director Commission (20.8.7)
const DirectorCommissionListPage = lazy(
  () => import('@/pages/authenticated/accounting/director-commissions/DirectorCommissionListPage')
)
const DirectorCommissionDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/director-commissions/DirectorCommissionDetailPage')
)
// Accounting — Payment Voucher (20.5)
const PaymentVoucherPage = lazy(
  () => import('@/pages/authenticated/accounting/payment-vouchers/PaymentVoucherPage')
)
const PaymentVoucherCreatePage = lazy(
  () => import('@/pages/authenticated/accounting/payment-vouchers/PaymentVoucherCreatePage')
)
const PaymentVoucherDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/payment-vouchers/PaymentVoucherDetailPage')
)
const PaymentVoucherEditPage = lazy(
  () => import('@/pages/authenticated/accounting/payment-vouchers/PaymentVoucherEditPage')
)
const ReceiptVoucherListPage = lazy(
  () => import('@/pages/authenticated/accounting/receipt-vouchers/ReceiptVoucherListPage')
)
const ReceiptVoucherCreatePage = lazy(
  () => import('@/pages/authenticated/accounting/receipt-vouchers/ReceiptVoucherCreatePage')
)
const ReceiptVoucherDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/receipt-vouchers/ReceiptVoucherDetailPage')
)
const ReceiptVoucherEditPage = lazy(
  () => import('@/pages/authenticated/accounting/receipt-vouchers/ReceiptVoucherEditPage')
)
const CommissionAdvanceListPage = lazy(
  () => import('@/pages/authenticated/accounting/commission-advances/CommissionAdvanceListPage')
)
const CommissionAdvanceCreatePage = lazy(
  () => import('@/pages/authenticated/accounting/commission-advances/CommissionAdvanceCreatePage')
)
const CommissionAdvanceDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/commission-advances/CommissionAdvanceDetailPage')
)
const CommissionAdvanceEditPage = lazy(
  () => import('@/pages/authenticated/accounting/commission-advances/CommissionAdvanceEditPage')
)
const SalesInvoiceListPage = lazy(
  () => import('@/pages/authenticated/accounting/sales-invoices/SalesInvoiceListPage')
)

const SalesInvoiceCreatePage = lazy(
  () => import('@/pages/authenticated/accounting/sales-invoices/SalesInvoiceCreatePage')
)
const SalesInvoiceDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/sales-invoices/SalesInvoiceDetailPage')
)
const SalesInvoiceEditPage = lazy(
  () => import('@/pages/authenticated/accounting/sales-invoices/SalesInvoiceEditPage')
)
const InputInvoiceListPage = lazy(
  () => import('@/pages/authenticated/accounting/input-invoices/InputInvoiceListPage')
)
const InputInvoiceCreatePage = lazy(
  () => import('@/pages/authenticated/accounting/input-invoices/InputInvoiceCreatePage')
)
const InputInvoiceDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/input-invoices/InputInvoiceDetailPage')
)
const InputInvoiceEditPage = lazy(
  () => import('@/pages/authenticated/accounting/input-invoices/InputInvoiceEditPage')
)
const DealPeriodAllocationListPage = lazy(
  () =>
    import('@/pages/authenticated/accounting/deal-period-allocations/DealPeriodAllocationListPage')
)
const DealPeriodAllocationDetailPage = lazy(
  () =>
    import(
      '@/pages/authenticated/accounting/deal-period-allocations/DealPeriodAllocationDetailPage'
    )
)
const CommEmployeePage = lazy(
  () => import('@/pages/authenticated/accounting/commissions/CommEmployeePage')
)
const MonthlySummaryListPage = lazy(
  () => import('@/pages/authenticated/accounting/monthly-summaries/MonthlySummaryListPage')
)
const MonthlySummaryDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/monthly-summaries/MonthlySummaryDetailPage')
)
const EmployeePayoutBatchListPage = lazy(
  () =>
    import('@/pages/authenticated/accounting/employee-payout-batches/EmployeePayoutBatchListPage')
)
const EmployeePayoutBatchCreatePage = lazy(
  () =>
    import('@/pages/authenticated/accounting/employee-payout-batches/EmployeePayoutBatchCreatePage')
)
const EmployeePayoutBatchDetailPage = lazy(
  () =>
    import('@/pages/authenticated/accounting/employee-payout-batches/EmployeePayoutBatchDetailPage')
)
const ImportedBonusBatchListPage = lazy(
  () => import('@/pages/authenticated/accounting/imported-bonuses/ImportedBonusBatchListPage')
)
const ImportedBonusBatchDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/imported-bonuses/ImportedBonusBatchDetailPage')
)
const InvestorAdvanceListPage = lazy(
  () => import('@/pages/authenticated/accounting/investor-advances/InvestorAdvanceListPage')
)
const InvestorAdvanceCreatePage = lazy(
  () => import('@/pages/authenticated/accounting/investor-advances/InvestorAdvanceCreatePage')
)
const InvestorAdvanceDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/investor-advances/InvestorAdvanceDetailPage')
)
const CommissionHoldPage = lazy(
  () => import('@/pages/authenticated/accounting/commissions/CommissionHoldPage')
)
const CommissionHoldDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/commissions/CommissionHoldDetailPage')
)

const CommSLKDeptPage = lazy(
  () => import('@/pages/authenticated/accounting/commissions/CommSLKDeptPage')
)
const KpiCommissionRuleListPage = lazy(
  () => import('@/pages/authenticated/accounting/kpi-commission-rules/KpiCommissionRuleListPage')
)
const SupportDeptCommissionRateListPage = lazy(
  () =>
    import(
      '@/pages/authenticated/accounting/support-dept-commission-rates/SupportDeptCommissionRateListPage'
    )
)
const CommSaleMonthlyPage = lazy(
  () => import('@/pages/authenticated/accounting/commissions/CommSaleMonthlyPage')
)
const CommMgrMonthlyPage = lazy(
  () => import('@/pages/authenticated/accounting/commissions/CommMgrMonthlyPage')
)
const CommMgrDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/commissions/CommMgrDetailPage')
)

const CommissionByRevenuePage = lazy(
  () => import('@/pages/authenticated/accounting/commissions/CommissionByRevenuePage')
)
const CommissionByRevenueDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/commissions/CommissionByRevenueDetailPage')
)
const CommSaleMonthlyDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/commissions/CommSaleMonthlyDetailPage')
)
const CommF2MonthlyPage = lazy(
  () => import('@/pages/authenticated/accounting/commissions/CommF2MonthlyPage')
)
const CommF2MonthlyDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/commissions/CommF2MonthlyDetailPage')
)
const CommCtvMonthlyPage = lazy(
  () => import('@/pages/authenticated/accounting/commissions/CommCtvMonthlyPage')
)
const CommCtvMonthlyDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/commissions/CommCtvMonthlyDetailPage')
)
const CommSlkMonthlyPage = lazy(
  () => import('@/pages/authenticated/accounting/commissions/CommSlkMonthlyPage')
)
const CommSlkMonthlyDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/commissions/CommSlkMonthlyDetailPage')
)
const CommSlkMonthlyPoolDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/commissions/CommSlkMonthlyPoolDetailPage')
)
const CommissionSplitListPage = lazy(
  () => import('@/pages/authenticated/accounting/commission-splits/CommissionSplitListPage')
)
const CommissionSplitDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/commission-splits/CommissionSplitDetailPage')
)
const KpiCommissionRuleCreatePage = lazy(
  () => import('@/pages/authenticated/accounting/kpi-commission-rules/KpiCommissionRuleCreatePage')
)
const KpiCommissionRuleDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/kpi-commission-rules/KpiCommissionRuleDetailPage')
)
const KpiCommissionRuleEditPage = lazy(
  () => import('@/pages/authenticated/accounting/kpi-commission-rules/KpiCommissionRuleEditPage')
)
const DepartmentMonthlyKpiListPage = lazy(
  () => import('@/pages/authenticated/accounting/commissions/DepartmentMonthlyKpiListPage')
)
const DepartmentMonthlyKpiDetailPage = lazy(
  () => import('@/pages/authenticated/accounting/commissions/DepartmentMonthlyKpiDetailPage')
)
const DepartmentMonthlyKpiHistoryPage = lazy(
  () => import('@/pages/authenticated/accounting/commissions/DepartmentMonthlyKpiHistoryPage')
)
const DashboardRouter = lazy(() => import('@/pages/authenticated/dashboard/DashboardRouter'))
const DepartmentPage = lazy(() => import('@/pages/authenticated/org/department/DepartmentPage'))
const NotFoundPage = lazy(() => import('@/pages/errors/NotFoundPage'))
const ChangePasswordPage = lazy(() => import('@/pages/authenticated/auth/ChangePasswordPage'))
const UserActionTrackingPage = lazy(
  () => import('@/pages/authenticated/user-action-tracking/UserActionTrackingPage')
)
const PermissionManagementPage = lazy(
  () => import('@/pages/authenticated/permissions/permission-management/PermissionManagementPage')
)
const PermissionRoleManagementPage = lazy(
  () => import('@/pages/authenticated/permissions/permission-role/PermissionRoleManagementPage')
)
const PermissionRoleManagementDetailPage = lazy(
  () =>
    import('@/pages/authenticated/permissions/permission-role/PermissionRoleManagementDetailPage')
)
const PermissionRoleManagementEditPage = lazy(
  () => import('@/pages/authenticated/permissions/permission-role/PermissionRoleManagementEditPage')
)
const PermissionRoleManagementCreatePage = lazy(
  () =>
    import('@/pages/authenticated/permissions/permission-role/PermissionRoleManagementCreatePage')
)
const OrgBranchManagement = lazy(() => import('@/pages/authenticated/org/branch/BranchPage'))
const BranchCreatePage = lazy(() => import('@/pages/authenticated/org/branch/BranchCreatePage'))
const BranchDetailPage = lazy(() => import('@/pages/authenticated/org/branch/BranchDetailPage'))
const BranchEditPage = lazy(() => import('@/pages/authenticated/org/branch/BranchEditPage'))
const PositionCreatePage = lazy(
  () => import('@/pages/authenticated/org/position/PositionCreatePage')
)
const PositionPage = lazy(() => import('@/pages/authenticated/org/position/PositionPage'))
const PositionEditPage = lazy(() => import('@/pages/authenticated/org/position/PositionEditPage'))
const PositionDetailPage = lazy(
  () => import('@/pages/authenticated/org/position/PositionDetailPage')
)
const BlockPage = lazy(() => import('@/pages/authenticated/org/block/BlockPage'))
const BlockCreatePage = lazy(() => import('@/pages/authenticated/org/block/BlockCreatePage'))
const BlockEditPage = lazy(() => import('@/pages/authenticated/org/block/BlockEditPage'))
const BlockDetailPage = lazy(() => import('@/pages/authenticated/org/block/BlockDetailPage'))
const PermissionEmployeeManagementByRolePage = lazy(
  () =>
    import(
      '@/pages/authenticated/permissions/permission-employee-management-by-role/PermissionEmployeeManagementByRolePage'
    )
)
const PermissionEmployeeManagementByRoleBulkEditPage = lazy(
  () =>
    import(
      '@/pages/authenticated/permissions/permission-employee-management-by-role/PermissionEmployeeManagementByRoleBulkEditPage'
    )
)
const RecruitmentChannelPage = lazy(
  () => import('@/pages/authenticated/recruitment/channel/RecruitmentChannelPage')
)
const RecruitmentChannelDetailPage = lazy(
  () => import('@/pages/authenticated/recruitment/channel/RecruitmentChannelDetailPage')
)
const RecruitmentChannelEditPage = lazy(
  () => import('@/pages/authenticated/recruitment/channel/RecruitmentChannelEditPage')
)
const RecruitmentChannelCreatePage = lazy(
  () => import('@/pages/authenticated/recruitment/channel/RecruitmentChannelCreatePage')
)
const RecruitmentSourcePage = lazy(
  () => import('@/pages/authenticated/recruitment/source/RecruitmentSourcePage')
)
const RecruitmentSourceDetailPage = lazy(
  () => import('@/pages/authenticated/recruitment/source/RecruitmentSourceDetailPage')
)
const RecruitmentSourceEditPage = lazy(
  () => import('@/pages/authenticated/recruitment/source/RecruitmentSourceEditPage')
)
const RecruitmentSourceCreatePage = lazy(
  () => import('@/pages/authenticated/recruitment/source/RecruitmentSourceCreatePage')
)
const RecruitmentExpensePage = lazy(
  () => import('@/pages/authenticated/recruitment/expense/RecruitmentExpensePage')
)
const RecruitmentExpenseCreatePage = lazy(
  () => import('@/pages/authenticated/recruitment/expense/RecruitmentExpenseCreatePage')
)
const RecruitmentExpenseDetailPage = lazy(
  () => import('@/pages/authenticated/recruitment/expense/RecruitmentExpenseDetailPage')
)
const RecruitmentExpenseEditPage = lazy(
  () => import('@/pages/authenticated/recruitment/expense/RecruitmentExpenseEditPage')
)
const CreateNewDepartmentPage = lazy(
  () => import('@/pages/authenticated/org/department/DepartmentCreatePage')
)
const DepartmentDetailPage = lazy(
  () => import('@/pages/authenticated/org/department/DepartmentDetailPage')
)
const DepartmentEditPage = lazy(
  () => import('@/pages/authenticated/org/department/DepartmentEditPage')
)
const UserActionTrackingDetailPage = lazy(
  () => import('@/pages/authenticated/user-action-tracking/UserActionTrackingDetailPage')
)
const JobDescriptionPage = lazy(
  () => import('@/pages/authenticated/recruitment/job-description/JobDescriptionPage')
)
const JobDescriptionDetailPage = lazy(
  () => import('@/pages/authenticated/recruitment/job-description/JobDescriptionDetailPage')
)
const JobDescriptionCreatePage = lazy(
  () => import('@/pages/authenticated/recruitment/job-description/JobDescriptionCreatePage')
)
const RecruitmentRequestPage = lazy(
  () => import('@/pages/authenticated/recruitment/request/RecruitmentRequestPage')
)
const RecruitmentRequestDetailPage = lazy(
  () => import('@/pages/authenticated/recruitment/request/RecruitmentRequestDetailPage')
)
const JobDescriptionEditPage = lazy(
  () => import('@/pages/authenticated/recruitment/job-description/JobDescriptionEditPage')
)
const RecruitmentRequestCreatePage = lazy(
  () => import('@/pages/authenticated/recruitment/request/RecruitmentRequestCreatePage')
)
const RecruitmentRequestEditPage = lazy(
  () => import('@/pages/authenticated/recruitment/request/RecruitmentRequestEditPage')
)
const RecruitmentCandidatePage = lazy(
  () => import('@/pages/authenticated/recruitment/candidate/RecruitmentCandidatePage')
)
const RecruitmentCandidateDetailPage = lazy(
  () => import('@/pages/authenticated/recruitment/candidate/RecruitmentCandidateDetailPage')
)
const RecruitmentCandidateCreatePage = lazy(
  () => import('@/pages/authenticated/recruitment/candidate/RecruitmentCandidateCreatePage')
)
const RecruitmentCandidateEditPage = lazy(
  () => import('@/pages/authenticated/recruitment/candidate/RecruitmentCandidateEditPage')
)
const InterviewSchedulePage = lazy(
  () => import('@/pages/authenticated/recruitment/interview-schedule/InterviewSchedulePage')
)
const InterviewScheduleEditPage = lazy(
  () => import('@/pages/authenticated/recruitment/interview-schedule/InterviewScheduleEditPage')
)
const InterviewScheduleCreatePage = lazy(
  () => import('@/pages/authenticated/recruitment/interview-schedule/InterviewScheduleCreatePage')
)
const InterviewScheduleDetailPage = lazy(
  () => import('@/pages/authenticated/recruitment/interview-schedule/InterviewScheduleDetailPage')
)
const EmployeeManagementPage = lazy(
  () => import('@/pages/authenticated/employee/management/EmployeeManagementPage')
)
const EmployeeLeadershipPage = lazy(
  () => import('@/pages/authenticated/employee/leadership/EmployeeLeadershipPage')
)
const EmployeeBankAccountPage = lazy(
  () => import('@/pages/authenticated/employee/bank-account/EmployeeBankAccountPage')
)
const EmployeeManagementCreatePage = lazy(
  () => import('@/pages/authenticated/employee/management/EmployeeManagementCreatePage')
)
const EmployeeManagementDetailPage = lazy(
  () => import('@/pages/authenticated/employee/management/EmployeeManagementDetailPage')
)
const EmployeeManagementEditPage = lazy(
  () => import('@/pages/authenticated/employee/management/EmployeeManagementEditPage')
)
const ReportRecruitmentSourcePage = lazy(
  () => import('@/pages/authenticated/report/recruitment/ReportRecruitmentSourcePage')
)
const ReportRecruitmentChannelPage = lazy(
  () => import('@/pages/authenticated/report/recruitment/ReportRecruitmentChannelPage')
)
const ReportRecruitmentExpenseBySourcePage = lazy(
  () => import('@/pages/authenticated/report/recruitment/ReportRecruitmentExpenseBySourcePage.tsx')
)
const ReportRecruitmentExpenseByStaffPage = lazy(
  () => import('@/pages/authenticated/report/recruitment/ReportRecruitmentExpenseByStaffPage')
)
const ReportRecruitmentReferralCostPage = lazy(
  () => import('@/pages/authenticated/report/recruitment/ReportRecruitmentReferralCostPage')
)
const ReportRecruitmentHiredCandidatePage = lazy(
  () => import('@/pages/authenticated/report/recruitment/ReportRecruitmentHiredCandidatePage')
)
const ReportRecruitmentStaffGrowthPage = lazy(
  () => import('@/pages/authenticated/report/recruitment/ReportRecruitmentStaffGrowthPage')
)
const ReportAttendanceMethodPage = lazy(
  () => import('@/pages/authenticated/report/attendance/ReportAttendanceMethodPage')
)
const ReportAttendanceProjectPage = lazy(
  () => import('@/pages/authenticated/report/attendance/ReportAttendanceProjectPage')
)
const ReportAttendanceProjectOrgPage = lazy(
  () => import('@/pages/authenticated/report/attendance/ReportAttendanceProjectOrgPage')
)
const ReportAttendanceUncheckinPage = lazy(
  () => import('@/pages/authenticated/report/attendance/ReportAttendanceUncheckinPage')
)
const ReportStaffTurnoverPage = lazy(
  () => import('@/pages/authenticated/report/staff/ReportStaffTurnoverPage')
)
const EmployeeRelationPage = lazy(
  () => import('@/pages/authenticated/employee/relation/EmployeeRelationPage')
)
const EmployeeRelationCreatePage = lazy(
  () => import('@/pages/authenticated/employee/relation/EmployeeRelationCreatePage')
)
const EmployeeRelationDetailPage = lazy(
  () => import('@/pages/authenticated/employee/relation/EmployeeRelationDetailPage')
)
const EmployeeRelationEditPage = lazy(
  () => import('@/pages/authenticated/employee/relation/EmployeeRelationEditPage')
)
const EmployeeCertificateDetailPage = lazy(
  () => import('@/pages/authenticated/employee/certificate/EmployeeCertificateDetailPage')
)
const EmployeeCertificatePage = lazy(
  () => import('@/pages/authenticated/employee/certificate/EmployeeCertificatePage')
)
const EmployeeCertificateCreatePage = lazy(
  () => import('@/pages/authenticated/employee/certificate/EmployeeCertificateCreatePage')
)
const EmployeeCertificateEditPage = lazy(
  () => import('@/pages/authenticated/employee/certificate/EmployeeCertificateEditPage')
)
const EmployeeDependentPage = lazy(
  () => import('@/pages/authenticated/employee/dependent/EmployeeDependentPage')
)
const EmployeeDependentCreatePage = lazy(
  () => import('@/pages/authenticated/employee/dependent/EmployeeDependentCreatePage')
)
const EmployeeDependentDetailPage = lazy(
  () => import('@/pages/authenticated/employee/dependent/EmployeeDependentDetailPage')
)
const EmployeeDependentEditPage = lazy(
  () => import('@/pages/authenticated/employee/dependent/EmployeeDependentEditPage')
)
const EmployeeOrgTreePage = lazy(
  () => import('@/pages/authenticated/employee/org-tree/EmployeeOrgTreePage')
)
const AttendanceDevicePage = lazy(
  () => import('@/pages/authenticated/attendance/device/AttendanceDevicePage')
)
const AttendanceDeviceDetailPage = lazy(
  () => import('@/pages/authenticated/attendance/device/AttendanceDeviceDetailPage')
)
const AttendanceDeviceCreatePage = lazy(
  () => import('@/pages/authenticated/attendance/device/AttendanceDeviceCreatePage')
)
const AttendanceDeviceEditPage = lazy(
  () => import('@/pages/authenticated/attendance/device/AttendanceDeviceEditPage')
)
const AttendanceExemptionPage = lazy(
  () => import('@/pages/authenticated/attendance/exemption/AttendanceExemptionPage')
)
const WifiDevicePage = lazy(
  () => import('@/pages/authenticated/attendance/wifi-device/WifiDevicePage')
)
const WifiDeviceCreatePage = lazy(
  () => import('@/pages/authenticated/attendance/wifi-device/WifiDeviceCreatePage')
)
const WifiDeviceDetailPage = lazy(
  () => import('@/pages/authenticated/attendance/wifi-device/WifiDeviceDetailPage')
)
const WifiDeviceEditPage = lazy(
  () => import('@/pages/authenticated/attendance/wifi-device/WifiDeviceEditPage')
)
const WorkSchedulePage = lazy(
  () => import('@/pages/authenticated/attendance/work-schedule/WorkSchedulePage')
)

const TimesheetPage = lazy(() => import('@/pages/authenticated/attendance/timesheet/TimesheetPage'))
const TimesheetEntryDetailPage = lazy(
  () => import('@/pages/authenticated/attendance/timesheet/TimesheetEntryDetailPage')
)
const TimesheetComplaintPage = lazy(
  () => import('@/pages/authenticated/attendance/timesheet-complaint/TimesheetComplaintPage')
)
const TimesheetComplaintDetailPage = lazy(
  () => import('@/pages/authenticated/attendance/timesheet-complaint/TimesheetComplaintDetailPage')
)
const DailyTimesheetPage = lazy(
  () => import('@/pages/authenticated/attendance/daily-timesheet/DailyTimesheetPage')
)

import { ApiPaths } from '@/api/schema'
import BaseHistoriesPage from '@/pages/authenticated/object-history/BaseHistoriesPage'
import BaseHistoryDetailPage from '@/pages/authenticated/object-history/BaseHistoryDetailPage'
import ReportStaffResignedReasonPage from '@/pages/authenticated/report/staff/ReportStaffResignedReasonPage.tsx'
import ReportStaffSeniorityPage from '@/pages/authenticated/report/staff/ReportStaffSeniorityPage.tsx'
import ReportStaffStatisticsPage from '@/pages/authenticated/report/staff/ReportStaffStatisticsPage.tsx'
const ReportEmployeeTypeConversionPage = lazy(
  () => import('@/pages/authenticated/report/staff/ReportEmployeeTypeConversionPage')
)
const ReportStaffSalesRevenuePage = lazy(
  () => import('@/pages/authenticated/report/staff/ReportSalesRevenue.tsx')
)

const ReportSalesOverviewPage = lazy(
  () => import('@/pages/authenticated/report/sales/overview/ReportSalesOverviewPage')
)
const CustomerCashFlowPage = lazy(
  () => import('@/pages/authenticated/report/sales/customer-cash-flow/CustomerCashFlowPage')
)
const CustomerCashDetailPage = lazy(
  () => import('@/pages/authenticated/report/sales/customer-cash-detail/CustomerCashDetailPage')
)
const DepositCumulativeByBranchPage = lazy(
  () =>
    import(
      '@/pages/authenticated/report/sales/deposit-cumulative-by-branch/DepositCumulativeByBranchPage'
    )
)
const DepositCumulativeByBlockPage = lazy(
  () =>
    import(
      '@/pages/authenticated/report/sales/deposit-cumulative-by-block/DepositCumulativeByBlockPage'
    )
)
const ReportSalesByDivisionPage = lazy(
  () => import('@/pages/authenticated/report/sales/by-division/ReportSalesByDivisionPage')
)
const ReportSalesByDivisionDetailPage = lazy(
  () => import('@/pages/authenticated/report/sales/by-division/ReportSalesByDivisionDetailPage')
)
const ReportSalesByBranchPage = lazy(
  () => import('@/pages/authenticated/report/sales/by-branch/ReportSalesByBranchPage')
)
const ReportSalesByBranchDetailPage = lazy(
  () => import('@/pages/authenticated/report/sales/by-branch/ReportSalesByBranchDetailPage')
)
const ReportSalesByDepartmentPage = lazy(
  () => import('@/pages/authenticated/report/sales/by-department/ReportSalesByDepartmentPage')
)
const ReportSalesByDepartmentDetailPage = lazy(
  () => import('@/pages/authenticated/report/sales/by-department/ReportSalesByDepartmentDetailPage')
)
const ReportSalesByProjectPage = lazy(
  () => import('@/pages/authenticated/report/sales/by-project/ReportSalesByProjectPage')
)
const ReportSalesByProjectDetailPage = lazy(
  () => import('@/pages/authenticated/report/sales/by-project/ReportSalesByProjectDetailPage')
)
const ReportSalesMatrixPage = lazy(
  () => import('@/pages/authenticated/report/sales/matrix/ReportSalesMatrixPage')
)
const ReportAdvancePage = lazy(
  () => import('@/pages/authenticated/report/accounting/advance/ReportAdvancePage')
)
const ReportCommissionByRecipientPage = lazy(
  () =>
    import(
      '@/pages/authenticated/report/accounting/commission-by-recipient/ReportCommissionByRecipientPage'
    )
)
const ReportInvestorDebtPage = lazy(
  () => import('@/pages/authenticated/report/accounting/investor-debt/ReportInvestorDebtPage')
)
const ReportF2DebtPage = lazy(
  () => import('@/pages/authenticated/report/accounting/f2-debt/ReportF2DebtPage')
)
const ReportCommissionPaymentF2Page = lazy(
  () =>
    import(
      '@/pages/authenticated/report/accounting/commission-payment-f2/ReportCommissionPaymentF2Page'
    )
)
const ReportProjectReceivablePage = lazy(
  () =>
    import('@/pages/authenticated/report/accounting/project-receivable/ReportProjectReceivablePage')
)
const ReportPartnerDebtPage = lazy(
  () => import('@/pages/authenticated/report/accounting/partner-debt/ReportPartnerDebtPage')
)
const ReportInvestorInvoiceReconciliationPage = lazy(
  () =>
    import(
      '@/pages/authenticated/report/accounting/investor-invoice-reconciliation/ReportInvestorInvoiceReconciliationPage'
    )
)
const MgmtCommSummaryPage = lazy(
  () =>
    import(
      '@/pages/authenticated/report/accounting/management-commission-summary/MgmtCommSummaryPage'
    )
)
const InternalReportPage = lazy(
  () => import('@/pages/authenticated/report/accounting/internal-report/InternalReportPage')
)
const BranchF2ReportPage = lazy(
  () => import('@/pages/authenticated/report/accounting/branch-f2-report/BranchF2ReportPage')
)
const AnnualTaxIncomeReportPage = lazy(
  () =>
    import('@/pages/authenticated/report/accounting/annual-tax-income/AnnualTaxIncomeReportPage')
)
const SalesCommPayoutsReportPage = lazy(
  () =>
    import(
      '@/pages/authenticated/report/accounting/sales-commission-payouts/SalesCommPayoutsReportPage'
    )
)
const ProjectMoneyInReportPage = lazy(
  () => import('@/pages/authenticated/report/accounting/project-money-in/ProjectMoneyInReportPage')
)
const RevenueByBranchReportPage = lazy(
  () =>
    import('@/pages/authenticated/report/accounting/revenue-by-branch/RevenueByBranchReportPage')
)
const UnitsNotFullyPaidReportPage = lazy(
  () =>
    import(
      '@/pages/authenticated/report/accounting/units-not-fully-paid/UnitsNotFullyPaidReportPage'
    )
)
const IncomeBySalespersonReportPage = lazy(
  () =>
    import(
      '@/pages/authenticated/report/accounting/income-by-salesperson/IncomeBySalespersonReportPage'
    )
)
const HhqlByProjectReportPage = lazy(
  () => import('@/pages/authenticated/report/accounting/hhql-by-project/HhqlByProjectReportPage')
)
const ProjectSummaryReportPage = lazy(
  () => import('@/pages/authenticated/report/accounting/project-summary/ProjectSummaryReportPage')
)
const LegalEntityCommissionDebtPage = lazy(
  () => import('@/pages/authenticated/accounting/reports/LegalEntityCommissionDebtPage')
)
const LegalEntityInvoiceDebtPage = lazy(
  () => import('@/pages/authenticated/accounting/reports/LegalEntityInvoiceDebtPage')
)
const CommissionPayableReportPage = lazy(
  () => import('@/pages/authenticated/accounting/reports/CommissionPayableReportPage')
)
const LadDebtReportPage = lazy(
  () => import('@/pages/authenticated/report/accounting/lad-debt/LadDebtReportPage')
)

const ReportStaffInOutPage = lazy(
  () => import('@/pages/authenticated/report/staff/ReportStaffInOutPage')
)
const ReportJobTransferPage = lazy(
  () => import('@/pages/authenticated/report/staff/ReportJobTransferPage')
)
import ProjectManagementPage from '@/pages/authenticated/project/ProjectManagementPage'
import ProjectManagementCreatePage from '@/pages/authenticated/project/ProjectManagementCreatePage'
import ProjectManagementDetailPage from '@/pages/authenticated/project/ProjectManagementDetailPage'
import ProjectManagementEditPage from '@/pages/authenticated/project/ProjectManagementEditPage'
const SaleAllocationsPage = lazy(
  () => import('@/pages/authenticated/project/sale-allocations/SaleAllocationsPage')
)
const SaleAllocationCreatePage = lazy(
  () => import('@/pages/authenticated/project/sale-allocations/SaleAllocationCreatePage')
)
const SaleAllocationDetailPage = lazy(
  () => import('@/pages/authenticated/project/sale-allocations/SaleAllocationDetailPage')
)
const SaleAllocationEditPage = lazy(
  () => import('@/pages/authenticated/project/sale-allocations/SaleAllocationEditPage')
)
const SaleAllocationHistoryPage = lazy(
  () => import('@/pages/authenticated/project/sale-allocations/SaleAllocationHistoryPage')
)
const SaleAllocationTbcManagementCreatePage = lazy(
  () =>
    import('@/pages/authenticated/project/sale-allocations/SaleAllocationTbcManagementCreatePage')
)
const SaleAllocationTbcCommissionDetailPage = lazy(
  () =>
    import('@/pages/authenticated/project/sale-allocations/SaleAllocationTbcCommissionDetailPage')
)
const SaleAllocationTbcCommissionEditPage = lazy(
  () => import('@/pages/authenticated/project/sale-allocations/SaleAllocationTbcCommissionEditPage')
)
const SaleAllocationTbcCommissionCreatePage = lazy(
  () =>
    import('@/pages/authenticated/project/sale-allocations/SaleAllocationTbcCommissionCreatePage')
)
const SaleAllocationTbcF2CreatePage = lazy(
  () => import('@/pages/authenticated/project/sale-allocations/SaleAllocationTbcF2CreatePage')
)
const SaleAllocationTbcF2EditPage = lazy(
  () => import('@/pages/authenticated/project/sale-allocations/SaleAllocationTbcF2EditPage')
)
const SaleAllocationTbcManagementEditPage = lazy(
  () => import('@/pages/authenticated/project/sale-allocations/SaleAllocationTbcManagementEditPage')
)

const ProjectProductInventoryPage = lazy(
  () => import('@/pages/authenticated/project/product-inventories/ProjectProductInventoryPage')
)
const ProjectProductInventoryCreatePage = lazy(
  () =>
    import('@/pages/authenticated/project/product-inventories/ProjectProductInventoryCreatePage')
)

const ProjectProductInventoryDetailPage = lazy(
  () =>
    import('@/pages/authenticated/project/product-inventories/ProjectProductInventoryDetailPage')
)

const ProjectProductInventoryTbcCommissionCreatePage = lazy(
  () =>
    import(
      '@/pages/authenticated/project/product-inventories/ProjectProductInventoryTbcCommissionCreatePage'
    )
)
const ProjectProductInventoryTbcCommissionEditPage = lazy(
  () =>
    import(
      '@/pages/authenticated/project/product-inventories/ProjectProductInventoryTbcCommissionEditPage'
    )
)
const ProjectProductInventoryTbcManagementCreatePage = lazy(
  () =>
    import(
      '@/pages/authenticated/project/product-inventories/ProjectProductInventoryTbcManagementCreatePage'
    )
)
const ProjectProductInventoryTbcManagementEditPage = lazy(
  () =>
    import(
      '@/pages/authenticated/project/product-inventories/ProjectProductInventoryTbcManagementEditPage'
    )
)
const ProjectProductInventoryTbcF2CreatePage = lazy(
  () =>
    import(
      '@/pages/authenticated/project/product-inventories/ProjectProductInventoryTbcF2CreatePage'
    )
)
const ProjectProductInventoryTbcF2EditPage = lazy(
  () =>
    import('@/pages/authenticated/project/product-inventories/ProjectProductInventoryTbcF2EditPage')
)

const RefundBookingListPage = lazy(
  () => import('@/pages/authenticated/project/refund-booking/RefundBookingListPage')
)
const RefundBookingCreatePage = lazy(
  () => import('@/pages/authenticated/project/refund-booking/RefundBookingCreatePage')
)
const RefundBookingEditPage = lazy(
  () => import('@/pages/authenticated/project/refund-booking/RefundBookingEditPage')
)
const RefundBookingDetailPage = lazy(
  () => import('@/pages/authenticated/project/refund-booking/RefundBookingDetailPage')
)

const BookingContractListPage = lazy(
  () => import('@/pages/authenticated/project/booking-contract/BookingContractListPage')
)
const BookingContractCreatePage = lazy(
  () => import('@/pages/authenticated/project/booking-contract/BookingContractCreatePage')
)
const BookingContractEditPage = lazy(
  () => import('@/pages/authenticated/project/booking-contract/BookingContractEditPage')
)
const BookingContractDetailPage = lazy(
  () => import('@/pages/authenticated/project/booking-contract/BookingContractDetailPage')
)
const BookingContractHistoryPage = lazy(
  () => import('@/pages/authenticated/project/booking-contract/BookingContractHistoryPage')
)
const BookingContractHistoryDetailPage = lazy(
  () => import('@/pages/authenticated/project/booking-contract/BookingContractHistoryDetailPage')
)
const BookingContractRefundPage = lazy(
  () => import('@/pages/authenticated/project/booking-contract/BookingContractRefundPage')
)

const TransactionSheetListPage = lazy(
  () => import('@/pages/authenticated/sales/transaction-sheets/TransactionSheetListPage')
)
const TransactionSheetCreatePage = lazy(
  () => import('@/pages/authenticated/sales/transaction-sheets/TransactionSheetCreatePage')
)
const TransactionSheetEditPage = lazy(
  () => import('@/pages/authenticated/sales/transaction-sheets/TransactionSheetEditPage')
)
const TransactionSheetDetailPage = lazy(
  () => import('@/pages/authenticated/sales/transaction-sheets/TransactionSheetDetailPage')
)

const DealListPage = lazy(() => import('@/pages/authenticated/sales/deals/DealListPage'))
const DealDetailPage = lazy(() => import('@/pages/authenticated/sales/deals/DealDetailPage'))
const DealHistoryPage = lazy(() => import('@/pages/authenticated/sales/deals/DealHistoryPage'))

const DepositContractsPage = lazy(
  () => import('@/pages/authenticated/sales/deposit-contracts/DepositContractsPage')
)
const DepositContractCreatePage = lazy(
  () => import('@/pages/authenticated/sales/deposit-contracts/DepositContractCreatePage')
)
const DepositContractEditPage = lazy(
  () => import('@/pages/authenticated/sales/deposit-contracts/DepositContractEditPage')
)
const DepositContractDetailPage = lazy(
  () => import('@/pages/authenticated/sales/deposit-contracts/DepositContractDetailPage')
)
const DepositContractHistoryPage = lazy(
  () => import('@/pages/authenticated/sales/deposit-contracts/DepositContractHistoryPage')
)
const DepositContractHistoryDetailPage = lazy(
  () => import('@/pages/authenticated/sales/deposit-contracts/DepositContractHistoryDetailPage')
)

// Bản 1.0 (List/Create/Detail/Edit trong folder investor-reconciliations) đã ngừng định tuyến —
// chỉ còn bộ 2.0 dưới đây. Code v1 vẫn ở trong repo vì màn List 2.0 tái sử dụng component list v1.
const InvestorReconciliationListPageV2 = lazy(
  () =>
    import(
      '@/pages/authenticated/sales/investor-reconciliations-v2/InvestorReconciliationListPageV2'
    )
)
const InvestorReconciliationCreatePageV2 = lazy(
  () =>
    import(
      '@/pages/authenticated/sales/investor-reconciliations-v2/InvestorReconciliationCreatePageV2'
    )
)
const InvestorReconciliationDetailPageV2 = lazy(
  () =>
    import(
      '@/pages/authenticated/sales/investor-reconciliations-v2/InvestorReconciliationDetailPageV2'
    )
)

const F2ReconciliationListPage = lazy(
  () => import('@/pages/authenticated/sales/f2-reconciliations/F2ReconciliationListPage')
)
const F2ReconciliationDetailPage = lazy(
  () => import('@/pages/authenticated/sales/f2-reconciliations/F2ReconciliationDetailPage')
)
const F2ReconciliationEditPage = lazy(
  () => import('@/pages/authenticated/sales/f2-reconciliations/F2ReconciliationEditPage')
)

const CTVReconciliationListPage = lazy(
  () => import('@/pages/authenticated/sales/ctv-reconciliations/CTVReconciliationListPage')
)
const CTVReconciliationDetailPage = lazy(
  () => import('@/pages/authenticated/sales/ctv-reconciliations/CTVReconciliationDetailPage')
)
const CTVReconciliationEditPage = lazy(
  () => import('@/pages/authenticated/sales/ctv-reconciliations/CTVReconciliationEditPage')
)

const FeeSupportRequestListPage = lazy(
  () => import('@/pages/authenticated/sales/fee-support-requests/FeeSupportRequestListPage')
)
const FeeSupportRequestDetailPage = lazy(
  () => import('@/pages/authenticated/sales/fee-support-requests/FeeSupportRequestDetailPage')
)
const FeeSupportRequestCreatePage = lazy(
  () => import('@/pages/authenticated/sales/fee-support-requests/FeeSupportRequestCreatePage')
)

const InvestorManagementPage = lazy(
  () => import('@/pages/authenticated/investor/InvestorManagementPage')
)
const InvestorManagementCreatePage = lazy(
  () => import('@/pages/authenticated/investor/InvestorManagementCreatePage')
)
const InvestorManagementDetailPage = lazy(
  () => import('@/pages/authenticated/investor/InvestorManagementDetailPage')
)
const InvestorManagementEditPage = lazy(
  () => import('@/pages/authenticated/investor/InvestorManagementEditPage')
)

// Exchange Module
const ExchangeManagementPage = lazy(
  () => import('@/pages/authenticated/exchange/ExchangeManagementPage')
)
const ExchangeManagementCreatePage = lazy(
  () => import('@/pages/authenticated/exchange/ExchangeManagementCreatePage')
)
const ExchangeManagementDetailPage = lazy(
  () => import('@/pages/authenticated/exchange/ExchangeManagementDetailPage')
)
const ExchangeManagementHistoryPage = lazy(
  () => import('@/pages/authenticated/exchange/ExchangeManagementHistoryPage')
)
const ExchangeManagementHistoryDetailPage = lazy(
  () => import('@/pages/authenticated/exchange/ExchangeManagementHistoryDetailPage')
)
const ExchangeManagementEditPage = lazy(
  () => import('@/pages/authenticated/exchange/ExchangeManagementEditPage')
)

import HolidayManagementCreatePage from '@/pages/authenticated/attendance/holiday/HolidayManagementCreatePage'
import HolidayManagementDetailPage from '@/pages/authenticated/attendance/holiday/HolidayManagementDetailPage'
import HolidayManagementEditPage from '@/pages/authenticated/attendance/holiday/HolidayManagementEditPage'
import HolidayManagementPage from '@/pages/authenticated/attendance/holiday/HolidayManagementPage'
import DecisionCreatePage from '@/pages/authenticated/decision-and-proposal/decision/DecisionCreatePage'
import DecisionDetailPage from '@/pages/authenticated/decision-and-proposal/decision/DecisionDetailPage'
import DecisionListPage from '@/pages/authenticated/decision-and-proposal/decision/DecisionListPage'
import ProposalListPage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalListPage'
import ProposalVerifierManagePage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalVerifierManagePage.tsx'
const ProposalManageDetailPage = lazy(
  () => import('@/pages/authenticated/decision-and-proposal/proposal/ProposalVerifierDetailPage')
)
const ProposalHistoriesPage = lazy(
  () => import('@/pages/authenticated/decision-and-proposal/proposal/ProposalHistoriesPage')
)
const ProposalHistoryDetailPage = lazy(
  () => import('@/pages/authenticated/decision-and-proposal/proposal/ProposalHistoryDetailPage')
)
import ContractAppendixCreatePage from '@/pages/authenticated/contract/contract-appendix/ContractAppendixCreatePage'
import ContractAppendixDetailPage from '@/pages/authenticated/contract/contract-appendix/ContractAppendixDetailPage'
import ContractAppendixEditPage from '@/pages/authenticated/contract/contract-appendix/ContractAppendixEditPage'
import ContractAppendixPage from '@/pages/authenticated/contract/contract-appendix/ContractAppendixPage'
import ContractManageCreatePage from '@/pages/authenticated/contract/contract-manage/ContractManageCreatePage'
import ContractManageDetailPage from '@/pages/authenticated/contract/contract-manage/ContractManageDetailPage'
import ContractManageEditPage from '@/pages/authenticated/contract/contract-manage/ContractManageEditPage'
import ContractManagePage from '@/pages/authenticated/contract/contract-manage/ContractManagePage'
import ContractTypeCreatePage from '@/pages/authenticated/contract/contract-type/ContractTypeCreatePage'
import ContractTypeDetailPage from '@/pages/authenticated/contract/contract-type/ContractTypeDetailPage'
import ContractTypeEditPage from '@/pages/authenticated/contract/contract-type/ContractTypeEditPage'
import ContractTypePage from '@/pages/authenticated/contract/contract-type/ContractTypePage'
import DecisionEditPage from '@/pages/authenticated/decision-and-proposal/decision/DecisionEditPage'
import ProposalLateExemptionDetailPage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalLateExemptionDetailPage'
import ProposalLateExemptionPage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalLateExemptionPage'
import ProposalOvertimeWorkDetailPage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalOvertimeWorkDetailPage'
import ProposalOvertimeWorkPage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalOvertimeWorkPage'
import ProposalPaidLeaveDetailPage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalPaidLeaveDetailPage'
import ProposalPaidLeavePage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalPaidLeavePage'
import ProposalPostMaternityBenefitPage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalPostMaternityBenefitPage'
import ProposalReturnToWorkDetailPage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalReturnToWorkDetailPage'
import ProposalPostMaternityBenefitDetailPage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalPostMaternityBenefitDetailPage'
import ProposalMaternityLeavePage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalMaternityLeavePage'
import ProposalMaternityLeaveDetailPage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalMaternityLeaveDetailPage'
import ProposalJobTransferPage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalJobTransferPage'
import ProposalJobTransferDetailPage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalJobTransferDetailPage'
import ProposalBulkJobTransferPage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalBulkJobTransferPage'
import ProposalBulkJobTransferCreatePage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalBulkJobTransferCreatePage'
import ProposalBulkJobTransferDetailPage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalBulkJobTransferDetailPage'
import ProposalBulkJobTransferEditPage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalBulkJobTransferEditPage'
import ProposalAssetAllocationPage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalAssetAllocationPage'
import ProposalAssetAllocationDetailPage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalAssetAllocationDetailPage'
import ProposalDeviceChangePage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalDeviceChangePage'
import ProposalDeviceChangeDetailPage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalDeviceChangeDetailPage'
import ProposalReturnToWorkPage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalReturnToWorkPage'
import ProposalStatutoryLeavePage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalStatutoryLeavePage'
import ProposalStatutoryLeaveDetailPage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalStatutoryLeaveDetailPage'
import ProposalUnpaidLeaveDetailPage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalUnpaidLeaveDetailPage.tsx'
import ProposalUnpaidLeavePage from '@/pages/authenticated/decision-and-proposal/proposal/ProposalUnpaidLeavePage'

// Contract Evaluation — unified per role (Manager / HR). form_type là filter
// trên list page (BRD §6 mockup), không phải URL segment. History endpoint split theo
// role per FSD §3.1 nên URL phải có role segment.
// NV (Me) self-service do mobile xử lý — không khai báo route phía web.
const ContractEvaluationManagerPage = lazy(
  () =>
    import(
      '@/pages/authenticated/contract/contract-evaluation/manager/ContractEvaluationManagerPage'
    )
)
const ContractEvaluationManagerDetailPage = lazy(
  () =>
    import(
      '@/pages/authenticated/contract/contract-evaluation/manager/ContractEvaluationManagerDetailPage'
    )
)
const ContractEvaluationManagerEditPage = lazy(
  () =>
    import(
      '@/pages/authenticated/contract/contract-evaluation/manager/ContractEvaluationManagerEditPage'
    )
)
const ContractEvaluationHrPage = lazy(
  () => import('@/pages/authenticated/contract/contract-evaluation/hr/ContractEvaluationHrPage')
)
const ContractEvaluationHrCreatePage = lazy(
  () =>
    import('@/pages/authenticated/contract/contract-evaluation/hr/ContractEvaluationHrCreatePage')
)
const ContractEvaluationHrDetailPage = lazy(
  () =>
    import('@/pages/authenticated/contract/contract-evaluation/hr/ContractEvaluationHrDetailPage')
)
const ContractEvaluationHrEditPage = lazy(
  () => import('@/pages/authenticated/contract/contract-evaluation/hr/ContractEvaluationHrEditPage')
)

const ProjectLocationListPage = lazy(
  () => import('@/pages/authenticated/attendance/project-location/ProjectLocationListPage.tsx')
)
const ProjectLocationCreatePage = lazy(
  () => import('@/pages/authenticated/attendance/project-location/ProjectLocationCreatePage.tsx')
)
const ProjectLocationEditPage = lazy(
  () => import('@/pages/authenticated/attendance/project-location/ProjectLocationEditPage.tsx')
)

const ProjectLocationDetailPage = lazy(
  () => import('@/pages/authenticated/attendance/project-location/ProjectLocationDetailPage.tsx')
)

const KPIStructurePage = lazy(() => import('@/pages/authenticated/kpi/structure/KPIStructurePage'))
const KPICriteriaPage = lazy(() => import('@/pages/authenticated/kpi/criteria/KPICriteriaPage'))
const PeriodEvaluationPage = lazy(
  () => import('@/pages/authenticated/kpi/period-evaluation/PeriodEvaluationPage')
)
const KPIPeriodSummaryPage = lazy(
  () => import('@/pages/authenticated/kpi/period-summary/KPIPeriodSummaryPage')
)
const KPIPeriodSummaryDetailPage = lazy(
  () => import('@/pages/authenticated/kpi/period-summary/KPIPeriodSummaryDetailPage')
)
const KPIPeriodSummaryEmployeeDetailPage = lazy(
  () => import('@/pages/authenticated/kpi/period-summary/KPIPeriodSummaryEmployeeDetailPage')
)
const ManagerPeriodEvaluationPage = lazy(
  () => import('@/pages/authenticated/kpi/manager-assessment/ManagerPeriodEvaluationPage')
)
const KPIUnitEvaluationPage = lazy(
  () => import('@/pages/authenticated/kpi/unit-evaluation/KPIUnitEvaluationPage')
)
const KPIPeriodEvaluationDetailPage = lazy(
  () => import('@/pages/authenticated/kpi/period-evaluation/KPIPeriodEvaluationDetailPage')
)
const KPIUnitEvaluationDetailPage = lazy(
  () => import('@/pages/authenticated/kpi/unit-evaluation/KPIUnitEvaluationDetailPage')
)
const AssessmentDetailPage = lazy(
  () => import('@/pages/authenticated/kpi/assessment/AssessmentDetailPage')
)
const ManagerKPIAssessmentPage = lazy(
  () => import('@/pages/authenticated/kpi/manager-assessment/ManagerKPIAssessmentPage')
)

const PayrollConfigurationPage = lazy(
  () => import('@/pages/authenticated/payroll/payroll-configuration/PayrollConfigurationPage')
)
const TravelExpensePage = lazy(
  () => import('@/pages/authenticated/payroll/travel-expense/TravelExpensePage')
)
const TravelExpenseCreatePage = lazy(
  () => import('@/pages/authenticated/payroll/travel-expense/TravelExpenseCreatePage')
)
const TravelExpenseDetailPage = lazy(
  () => import('@/pages/authenticated/payroll/travel-expense/TravelExpenseDetailPage')
)
const TravelExpenseEditPage = lazy(
  () => import('@/pages/authenticated/payroll/travel-expense/TravelExpenseEditPage')
)
const RecoveryVoucherPage = lazy(
  () => import('@/pages/authenticated/payroll/recovery-voucher/RecoveryVoucherPage')
)
const RecoveryVoucherCreatePage = lazy(
  () => import('@/pages/authenticated/payroll/recovery-voucher/RecoveryVoucherCreatePage')
)
const RecoveryVoucherDetailPage = lazy(
  () => import('@/pages/authenticated/payroll/recovery-voucher/RecoveryVoucherDetailPage')
)
const RecoveryVoucherEditPage = lazy(
  () => import('@/pages/authenticated/payroll/recovery-voucher/RecoveryVoucherEditPage')
)
const SalesRevenuePage = lazy(
  () => import('@/pages/authenticated/payroll/sales-revenue/SalesRevenuePage')
)
const SalesRevenueDetailPage = lazy(
  () => import('@/pages/authenticated/payroll/sales-revenue/SalesRevenueDetailPage')
)
const PenaltyManagementPage = lazy(
  () => import('@/pages/authenticated/payroll/penalty-management/PenaltyManagementPage')
)
const PenaltyManagementCreatePage = lazy(
  () => import('@/pages/authenticated/payroll/penalty-management/PenaltyManagementCreatePage')
)
const PenaltyManagementDetailPage = lazy(
  () => import('@/pages/authenticated/payroll/penalty-management/PenaltyManagementDetailPage')
)
const PenaltyManagementEditPage = lazy(
  () => import('@/pages/authenticated/payroll/penalty-management/PenaltyManagementEditPage')
)
const OtherAttendanceListPage = lazy(
  () => import('@/pages/authenticated/attendance/other-attendance/OtherAttendanceListPage.tsx')
)
const AttendanceLogPage = lazy(
  () => import('@/pages/authenticated/attendance/attendance-log/AttendanceLogPage')
)

const PayrollPeriodPage = lazy(
  () => import('@/pages/authenticated/payroll/period/PayrollPeriodPage')
)
const PayrollPeriodDashboardPage = lazy(
  () => import('@/pages/authenticated/payroll/period/PayrollPeriodDashboardPage')
)
const PayrollPeriodPayslipListPage = lazy(
  () => import('@/pages/authenticated/payroll/period/PayrollPeriodPayslipListPage')
)
const PayrollPeriodEmployeeDetailPage = lazy(
  () => import('@/pages/authenticated/payroll/period/PayrollPeriodEmployeeDetailPage')
)

const PayrollPeriodCreatePage = lazy(
  () => import('@/pages/authenticated/payroll/period/PayrollPeriodCreatePage')
)
const PayrollPeriodEditPage = lazy(
  () => import('@/pages/authenticated/payroll/period/PayrollPeriodEditPage')
)

const CategoryPage = lazy(() => import('@/pages/authenticated/elibrary/category/CategoryPage'))
const AccessRequestsPage = lazy(
  () => import('@/pages/authenticated/elibrary/access-requests/AccessRequestsPage')
)
const CategoryCreatePage = lazy(
  () => import('@/pages/authenticated/elibrary/category/CategoryCreatePage')
)
const CategoryEditPage = lazy(
  () => import('@/pages/authenticated/elibrary/category/CategoryEditPage')
)
const CategoryDetailPage = lazy(
  () => import('@/pages/authenticated/elibrary/category/CategoryDetailPage')
)

const PersonalDocumentsPage = lazy(
  () => import('@/pages/authenticated/elibrary/personal/PersonalDocumentsPage')
)
const DepartmentDocumentsPage = lazy(
  () => import('@/pages/authenticated/elibrary/department/DepartmentDocumentsPage')
)
const CompanyDocumentsPage = lazy(
  () => import('@/pages/authenticated/elibrary/company/CompanyDocumentsPage')
)
const SharedWithMeDocumentsPage = lazy(
  () => import('@/pages/authenticated/elibrary/shared-with-me/SharedWithMeDocumentsPage')
)
// Lazy load all pages for better performance
// const HomePage = lazy(() => import('@/pages/public/with-layout/HomePage'))
const LoginForm = lazy(() => import('@/features/auth/login/LoginForm'))
// NOTE: OTP flow is currently disabled - login returns tokens directly
// OtpForm is preserved for future use if business logic changes
// const OtpForm = lazy(() => import('@/features/auth/otp/OtpForm'))
const ForgotPasswordForm = lazy(() => import('@/features/auth/forgot-password/ForgotPasswordForm'))
const RenewPasswordForm = lazy(() => import('@/features/auth/renew-password/RenewPasswordForm'))
// const DevelopmentInProgressPage = lazy(
//   () => import('@/pages/public/with-layout/development-in-progress/DevelopmentInProgressPage')
// )

// Route scope constants
export const ROUTE_SCOPE = {
  PUBLIC: 'public',
  AUTH: 'auth',
} as const

/**
 * Extract route titles from APP_ROUTES for breadcrumb generation
 * Supports up to 3 levels of nested routes
 */
export function getRouteTitles(): Record<string, string> {
  const routeTitles: Record<string, string> = {}

  function extractTitles(routes: AppRoute[], parentPath = '') {
    routes.forEach((route) => {
      const fullPath = parentPath + route.path
      if (route.title) {
        routeTitles[fullPath] = route.title
      }
      if (route.children) {
        extractTitles(route.children, fullPath)
      }
    })
  }

  extractTitles(APP_ROUTES)

  return routeTitles
}

/**
 * Generate breadcrumb items from current pathname
 * Supports up to 3 levels of nested routes
 */
export function generateBreadcrumbItems(
  pathname: string
): Array<{ label: string; href?: string; isCurrentPage?: boolean }> {
  const routeTitles = getRouteTitles()
  const pathSegments = pathname.split('/').filter(Boolean)

  const breadcrumbItems: Array<{ label: string; href?: string; isCurrentPage?: boolean }> = []

  // Add home/dashboard as first item
  breadcrumbItems.push({
    label: 'Bảng điều khiển',
    href: '/',
    isCurrentPage: pathname === '/',
  })

  if (pathname === '/') {
    return breadcrumbItems
  }

  // Build breadcrumb path progressively
  let currentPath = ''
  for (let i = 0; i < pathSegments.length; i++) {
    currentPath += '/' + pathSegments[i]

    // Check if this path has a title
    const title = routeTitles[currentPath]
    if (title) {
      const isLastItem = i === pathSegments.length - 1
      breadcrumbItems.push({
        label: title,
        href: isLastItem ? undefined : currentPath,
        isCurrentPage: isLastItem,
      })
    }
  }

  return breadcrumbItems
}

/**
 * Match dynamic route and return title
 * Example: /permission/role-management/1/edit -> matches /permission/role-management/:id/edit
 */
export function getDynamicRouteTitle(pathname: string): string | null {
  const routeTitles = getRouteTitles()

  // Try exact match first
  if (routeTitles[pathname]) {
    return routeTitles[pathname]
  }

  // Try dynamic route matching
  for (const [routePath, title] of Object.entries(routeTitles)) {
    if (routePath.includes(':')) {
      const routePattern = routePath.replace(/:[^/]+/g, '[^/]+')
      const regex = new RegExp(`^${routePattern}$`)
      if (regex.test(pathname)) {
        return title
      }
    }
  }

  return null
}

/**
 * Application router configuration using createAppRouter
 * Routes are generated from route definitions using simplified factory pattern
 * Provides better performance with lazy loading and separated responsibilities
 */
const PublicDocumentViewerPage = lazy(() => import('@/pages/public/PublicDocumentViewerPage'))

export const appRouter = createAppRouter([
  {
    path: '/',
    errorElement: <ErrorPage />,
    children: [
      {
        path: APP_PATH.LOGIN,
        element: (
          <AuthGuard guestOnly>
            <LoginLayout />
          </AuthGuard>
        ),
        children: [
          {
            index: true,
            path: APP_PATH.LOGIN,
            element: <LoginForm />,
          },
          // NOTE: OTP flow is currently disabled - login returns tokens directly
          // OTP route is preserved for future use if business logic changes
          // {
          //   path: APP_PATH.LOGIN_OTP,
          //   element: <OtpForm />,
          // },
          {
            path: APP_PATH.LOGIN_RENEW_PASSWORD,
            element: <RenewPasswordForm />,
          },
          {
            path: APP_PATH.LOGIN_FORGOT_PASSWORD,
            element: <ForgotPasswordForm />,
          },
        ],
      },
      {
        // Public elibrary share-link viewer — no AuthGuard so cả khách lẫn user
        // đã đăng nhập đều xem được (authMiddleware tự gắn token nếu có).
        path: APP_PATH.DOCS_PREVIEW,
        element: (
          <Suspense fallback={<FullScreenLoading message="Đang tải tài liệu..." />}>
            <PublicDocumentViewerPage />
          </Suspense>
        ),
      },

      {
        path: '/',
        element: (
          <AuthGuard>
            <Suspense fallback={<PageLoading />}>
              <AppLayout />
            </Suspense>
          </AuthGuard>
        ),
        children: [
          // -------------------------------------
          {
            path: APP_PATH.DASHBOARD,
            // Một cửa vào cho mọi vai trò — router tự chọn preset, không có submenu.
            element: <DashboardRouter />,
          },

          // -------------------------------------
          {
            path: APP_PATH.CHANGE_PASSWORD,
            element: <ChangePasswordPage />,
          },

          // -------------------------------------
          {
            path: APP_PATH.ORG_CHAR,
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <IndexRedirect redirectTo={APP_PATH.BRANCH_MANAGEMENT} />,
              },
              {
                path: APP_PATH.BRANCH_MANAGEMENT,
                element: <Outlet />,
                children: [
                  { index: true, element: <OrgBranchManagement />, permission: 'branch.list' },
                  {
                    path: APP_PATH.BRANCH_MANAGEMENT_CREATE,
                    element: <BranchCreatePage />,
                    permission: 'branch.create',
                  },
                  {
                    path: APP_PATH.BRANCH_MANAGEMENT_DETAIL,
                    element: <BranchDetailPage />,
                    permission: 'branch.retrieve',
                  },
                  {
                    path: APP_PATH.BRANCH_MANAGEMENT_EDIT,
                    element: <BranchEditPage />,
                    permission: 'branch.update',
                  },
                  {
                    path: APP_PATH.BRANCH_MANAGEMENT_HISTORY,
                    element: <BaseHistoriesPage path={ApiPaths.hrm_branches_histories_retrieve} />,
                    permission: 'branch.histories',
                  },
                  {
                    path: APP_PATH.BRANCH_MANAGEMENT_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage path={ApiPaths.hrm_branches_history_retrieve} />
                    ),
                    permission: 'branch.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.BLOCK_MANAGEMENT,
                element: <Outlet />,
                children: [
                  { index: true, element: <BlockPage />, permission: 'block.list' },
                  {
                    path: APP_PATH.BLOCK_MANAGEMENT_CREATE,
                    element: <BlockCreatePage />,
                    permission: 'block.create',
                  },
                  {
                    path: APP_PATH.BLOCK_MANAGEMENT_DETAIL,
                    element: <BlockDetailPage />,
                    permission: 'block.retrieve',
                  },
                  {
                    path: APP_PATH.BLOCK_MANAGEMENT_EDIT,
                    element: <BlockEditPage />,
                    permission: 'block.update',
                  },
                  {
                    path: APP_PATH.BLOCK_MANAGEMENT_HISTORY,
                    element: <BaseHistoriesPage path={ApiPaths.hrm_blocks_histories_retrieve} />,
                    permission: 'block.histories',
                  },
                  {
                    path: APP_PATH.BLOCK_MANAGEMENT_HISTORY_DETAIL,
                    element: <BaseHistoryDetailPage path={ApiPaths.hrm_blocks_history_retrieve} />,
                    permission: 'block.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.DEPARTMENT_MANAGEMENT,
                element: <Outlet />,
                children: [
                  { index: true, element: <DepartmentPage />, permission: 'department.list' },
                  {
                    path: APP_PATH.DEPARTMENT_CREATE_NEW,
                    element: <CreateNewDepartmentPage />,
                    permission: 'department.create',
                  },
                  {
                    path: APP_PATH.DEPARTMENT_MANAGEMENT_DETAIL,
                    element: <DepartmentDetailPage />,
                    permission: 'department.retrieve',
                  },
                  {
                    path: APP_PATH.DEPARTMENT_MANAGEMENT_EDIT,
                    element: <DepartmentEditPage />,
                    permission: 'department.update',
                  },
                  {
                    path: APP_PATH.DEPARTMENT_MANAGEMENT_HISTORY,
                    element: (
                      <BaseHistoriesPage path={ApiPaths.hrm_departments_histories_retrieve} />
                    ),
                    permission: 'department.histories',
                  },
                  {
                    path: APP_PATH.DEPARTMENT_MANAGEMENT_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage path={ApiPaths.hrm_departments_history_retrieve} />
                    ),
                    permission: 'department.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.POSITION_MANAGEMENT,
                element: <Outlet />,
                children: [
                  { index: true, element: <PositionPage />, permission: 'position.list' },
                  {
                    path: APP_PATH.POSITION_MANAGEMENT_CREATE,
                    element: <PositionCreatePage />,
                    permission: 'position.create',
                  },
                  {
                    path: APP_PATH.POSITION_MANAGEMENT_DETAIL,
                    element: <PositionDetailPage />,
                    permission: 'position.retrieve',
                  },
                  {
                    path: APP_PATH.POSITION_MANAGEMENT_HISTORY,
                    element: <BaseHistoriesPage path={ApiPaths.hrm_positions_histories_retrieve} />,
                    permission: 'position.histories',
                  },
                  {
                    path: APP_PATH.POSITION_MANAGEMENT_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage path={ApiPaths.hrm_positions_history_retrieve} />
                    ),
                    permission: 'position.history_detail',
                  },
                  {
                    path: APP_PATH.POSITION_MANAGEMENT_EDIT,
                    element: <PositionEditPage />,
                    permission: 'position.update',
                  },
                ],
              },
            ],
          },

          // -------------------------------------
          {
            path: APP_PATH.PERMISSION,
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <IndexRedirect redirectTo={APP_PATH.PERMISSION_MANAGEMENT} />,
              },
              {
                path: APP_PATH.PERMISSION_MANAGEMENT,
                element: <PermissionManagementPage />,
                permission: 'permission.list',
              },
              {
                path: APP_PATH.PERMISSION_ROLE_MANAGEMENT,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <PermissionRoleManagementPage />,
                    permission: 'role.list',
                  },
                  {
                    path: APP_PATH.PERMISSION_ROLE_MANAGEMENT_DETAIL,
                    element: <PermissionRoleManagementDetailPage />,
                    permission: 'role.retrieve',
                  },
                  {
                    path: APP_PATH.PERMISSION_ROLE_MANAGEMENT_EDIT,
                    element: <PermissionRoleManagementEditPage />,
                    permission: 'role.update',
                  },
                  {
                    path: APP_PATH.PERMISSION_ROLE_MANAGEMENT_CREATE,
                    element: <PermissionRoleManagementCreatePage />,
                    permission: 'role.create',
                  },
                  {
                    path: APP_PATH.PERMISSION_ROLE_MANAGEMENT_HISTORY,
                    element: <BaseHistoriesPage path={ApiPaths.roles_histories_retrieve} />,
                    permission: 'role.histories',
                  },
                  {
                    path: APP_PATH.PERMISSION_ROLE_MANAGEMENT_HISTORY_DETAIL,
                    element: <BaseHistoryDetailPage path={ApiPaths.roles_history_retrieve} />,
                    permission: 'role.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.PERMISSION_EMPLOYEE_MANAGEMENT_BY_ROLE,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <PermissionEmployeeManagementByRolePage />,
                    permission: 'employee_role.list',
                  },
                  {
                    path: APP_PATH.PERMISSION_EMPLOYEE_MANAGEMENT_BY_ROLE_BULK_EDIT,
                    element: <PermissionEmployeeManagementByRoleBulkEditPage />,
                    permission: 'employee_role.bulk_update_roles',
                  },
                ],
              },
            ],
          },

          // -------------------------------------
          {
            path: APP_PATH.USER_ACTION_TRACKING,
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <UserActionTrackingPage />,
                permission: 'audit_logging.search',
              },
              {
                path: APP_PATH.USER_ACTION_TRACKING_DETAIL,
                element: <UserActionTrackingDetailPage />,
                permission: 'audit_logging.get_detail',
              },
            ],
          },

          // -------------------------------------
          //  HRM Module
          // -------------------------------------
          {
            path: APP_PATH.RECRUITMENT,
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <IndexRedirect redirectTo={APP_PATH.RECRUITMENT_CHANNEL} />,
              },
              {
                path: APP_PATH.RECRUITMENT_CHANNEL,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <RecruitmentChannelPage />,
                    permission: 'recruitment_channel.list',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_CHANNEL_CREATE,
                    element: <RecruitmentChannelCreatePage />,
                    permission: 'recruitment_channel.create',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_CHANNEL_DETAIL,
                    element: <RecruitmentChannelDetailPage />,
                    permission: 'recruitment_channel.retrieve',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_CHANNEL_EDIT,
                    element: <RecruitmentChannelEditPage />,
                    permission: 'recruitment_channel.update',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_CHANNEL_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.hrm_recruitment_channels_histories_retrieve}
                      />
                    ),
                    permission: 'recruitment_channel.histories',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_CHANNEL_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.hrm_recruitment_channels_history_retrieve}
                      />
                    ),
                    permission: 'recruitment_channel.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.RECRUITMENT_SOURCE,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <RecruitmentSourcePage />,
                    permission: 'recruitment_source.list',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_SOURCE_CREATE,
                    element: <RecruitmentSourceCreatePage />,
                    permission: 'recruitment_source.create',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_SOURCE_DETAIL,
                    element: <RecruitmentSourceDetailPage />,
                    permission: 'recruitment_source.retrieve',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_SOURCE_EDIT,
                    element: <RecruitmentSourceEditPage />,
                    permission: 'recruitment_source.update',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_SOURCE_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.hrm_recruitment_sources_histories_retrieve}
                      />
                    ),
                    permission: 'recruitment_source.histories',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_SOURCE_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.hrm_recruitment_sources_history_retrieve}
                      />
                    ),
                    permission: 'recruitment_source.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.RECRUITMENT_JOB_DESCRIPTION,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <JobDescriptionPage />,
                    permission: 'job_description.list',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_JOB_DESCRIPTION_CREATE,
                    element: <JobDescriptionCreatePage />,
                    permission: 'job_description.create',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_JOB_DESCRIPTION_DETAIL,
                    element: <JobDescriptionDetailPage />,
                    permission: 'job_description.retrieve',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_JOB_DESCRIPTION_EDIT,
                    element: <JobDescriptionEditPage />,
                    permission: 'job_description.update',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_JOB_DESCRIPTION_HISTORY,
                    element: (
                      <BaseHistoriesPage path={ApiPaths.hrm_job_descriptions_histories_retrieve} />
                    ),
                    permission: 'job_description.histories',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_JOB_DESCRIPTION_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.hrm_job_descriptions_history_retrieve}
                      />
                    ),
                    permission: 'job_description.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.RECRUITMENT_REQUEST,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <RecruitmentRequestPage />,
                    permission: 'recruitment_request.list',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_REQUEST_CREATE,
                    element: <RecruitmentRequestCreatePage />,
                    permission: 'recruitment_request.create',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_REQUEST_DETAIL,
                    element: <RecruitmentRequestDetailPage />,
                    permission: 'recruitment_request.retrieve',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_REQUEST_EDIT,
                    element: <RecruitmentRequestEditPage />,
                    permission: 'recruitment_request.update',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_REQUEST_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.hrm_recruitment_requests_histories_retrieve}
                      />
                    ),
                    permission: 'recruitment_request.histories',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_REQUEST_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.hrm_recruitment_requests_history_retrieve}
                      />
                    ),
                    permission: 'recruitment_request.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.RECRUITMENT_EXPENSE,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <RecruitmentExpensePage />,
                    permission: 'recruitment_expense.list',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_EXPENSE_CREATE,
                    element: <RecruitmentExpenseCreatePage />,
                    permission: 'recruitment_expense.create',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_EXPENSE_DETAIL,
                    element: <RecruitmentExpenseDetailPage />,
                    permission: 'recruitment_expense.retrieve',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_EXPENSE_EDIT,
                    element: <RecruitmentExpenseEditPage />,
                    permission: 'recruitment_expense.update',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_EXPENSE_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.hrm_recruitment_expenses_histories_retrieve}
                      />
                    ),
                    permission: 'recruitment_expense.histories',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_EXPENSE_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.hrm_recruitment_expenses_history_retrieve}
                      />
                    ),
                    permission: 'recruitment_expense.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.RECRUITMENT_CANDIDATE,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <RecruitmentCandidatePage />,
                    permission: 'recruitment_candidate.list',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_CANDIDATE_CREATE,
                    element: <RecruitmentCandidateCreatePage />,
                    permission: 'recruitment_candidate.create',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_CANDIDATE_DETAIL,
                    element: <RecruitmentCandidateDetailPage />,
                    permission: 'recruitment_candidate.retrieve',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_CANDIDATE_EDIT,
                    element: <RecruitmentCandidateEditPage />,
                    permission: 'recruitment_candidate.update',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_CANDIDATE_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.hrm_recruitment_candidates_histories_retrieve}
                      />
                    ),
                    permission: 'recruitment_candidate.histories',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_CANDIDATE_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.hrm_recruitment_candidates_history_retrieve}
                      />
                    ),
                    permission: 'recruitment_candidate.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <InterviewSchedulePage />,
                    permission: 'interview_schedule.list',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE_CREATE,
                    element: <InterviewScheduleCreatePage />,
                    permission: 'interview_schedule.create',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE_DETAIL,
                    element: <InterviewScheduleDetailPage />,
                    permission: 'interview_schedule.retrieve',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE_EDIT,
                    element: <InterviewScheduleEditPage />,
                    permission: 'interview_schedule.update',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.hrm_interview_schedules_histories_retrieve}
                      />
                    ),
                    permission: 'interview_schedule.histories',
                  },
                  {
                    path: APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.hrm_interview_schedules_history_retrieve}
                      />
                    ),
                    permission: 'interview_schedule.history_detail',
                  },
                ],
              },
            ],
          },

          // -------------------------------------
          // KPI Module
          {
            path: APP_PATH.KPI,
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <IndexRedirect redirectTo={APP_PATH.KPI_STRUCTURE} />,
              },
              {
                path: APP_PATH.KPI_STRUCTURE,
                element: <KPIStructurePage />,
                permission: 'payroll.kpi_config',
              },
              {
                path: APP_PATH.KPI_CRITERIA,
                element: <KPICriteriaPage />,
                permission: 'kpi_criterion.list',
              },
              {
                path: APP_PATH.KPI_PERIOD_EVALUATION,
                element: <PeriodEvaluationPage />,
                permission: 'kpi_assessment_period.list',
              },
              {
                path: APP_PATH.KPI_PERIOD_EVALUATION_DETAIL,
                element: <KPIPeriodEvaluationDetailPage />,
                permission: 'kpi_assessment_period.retrieve',
              },
              {
                path: APP_PATH.KPI_ASSESSMENT_DETAIL,
                element: <AssessmentDetailPage />,
                permission: 'employee_kpi_assessment.retrieve',
              },
              {
                path: APP_PATH.KPI_ASSESSMENT_ASSESS,
                element: <AssessmentDetailPage />,
                permission: 'employee_kpi_assessment.update',
              },
              {
                path: APP_PATH.KPI_ASSESSMENT_HISTORY,
                element: (
                  <BaseHistoriesPage
                    path={ApiPaths.payroll_kpi_assessments_employees_histories_retrieve}
                  />
                ),
                permission: 'employee_kpi_assessment.histories',
              },
              {
                path: APP_PATH.KPI_ASSESSMENT_HISTORY_DETAIL,
                element: (
                  <BaseHistoryDetailPage
                    path={ApiPaths.payroll_kpi_assessments_employees_history_retrieve}
                  />
                ),
                permission: 'employee_kpi_assessment.history_detail',
              },
              {
                path: APP_PATH.KPI_PERIOD_SUMMARY,
                element: <KPIPeriodSummaryPage />,
                permission: 'kpi_assessment_period.summary',
              },
              {
                path: APP_PATH.KPI_PERIOD_SUMMARY_DETAIL,
                element: <KPIPeriodSummaryDetailPage />,
                permission: 'kpi_assessment_period.summary',
              },
              {
                path: APP_PATH.KPI_PERIOD_SUMMARY_EMPLOYEE_DETAIL,
                element: <KPIPeriodSummaryEmployeeDetailPage />,
                permission: 'kpi_assessment_period.summary',
              },
              {
                path: APP_PATH.KPI_UNIT_EVALUATION,
                element: <KPIUnitEvaluationPage />,
                permission: 'kpi_assessment_period.list',
              },
              {
                path: APP_PATH.KPI_UNIT_EVALUATION_DETAIL,
                element: <KPIUnitEvaluationDetailPage />,
                permission: 'department_kpi_assessment.retrieve',
              },
              {
                path: APP_PATH.KPI_MANAGER_PERIOD_EVALUATION,
                element: <ManagerPeriodEvaluationPage />,
                permission: 'employee_manager_assessment.list',
              },
              {
                path: APP_PATH.KPI_MANAGER_PERIOD_EVALUATION_DETAIL,
                element: <ManagerKPIAssessmentPage />,
                permission: 'employee_manager_assessment.retrieve',
              },
              {
                path: APP_PATH.KPI_MANAGER_ASSESSMENT_DETAIL,
                element: <AssessmentDetailPage />,
                permission: 'employee_manager_assessment.retrieve',
              },
              {
                path: APP_PATH.KPI_MANAGER_ASSESSMENT_ASSESS,
                element: <AssessmentDetailPage />,
                permission: 'employee_manager_assessment.partial_update',
              },
              {
                path: APP_PATH.KPI_MANAGER_ASSESSMENT_HISTORY,
                element: (
                  <BaseHistoriesPage
                    path={ApiPaths.payroll_kpi_assessments_employees_histories_retrieve}
                  />
                ),
                permission: 'employee_kpi_assessment.histories',
              },
              {
                path: APP_PATH.KPI_MANAGER_ASSESSMENT_HISTORY_DETAIL,
                element: (
                  <BaseHistoryDetailPage
                    path={ApiPaths.payroll_kpi_assessments_employees_history_retrieve}
                  />
                ),
                permission: 'employee_kpi_assessment.history_detail',
              },
            ],
          },

          // -------------------------------------
          // Decision Management
          {
            path: APP_PATH.DECISIONS_PROPOSALS,
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <IndexRedirect redirectTo={APP_PATH.DECISION_MANAGEMENT} />,
              },
              {
                path: APP_PATH.DECISION_MANAGEMENT,
                element: <Outlet />,
                children: [
                  { index: true, element: <DecisionListPage />, permission: 'decision.list' },
                  {
                    path: APP_PATH.DECISION_MANAGEMENT_CREATE,
                    element: <DecisionCreatePage />,
                    permission: 'decision.create',
                  },
                  {
                    path: APP_PATH.DECISION_MANAGEMENT_DETAIL,
                    element: <DecisionDetailPage />,
                    permission: 'decision.retrieve',
                  },
                  {
                    path: APP_PATH.DECISION_MANAGEMENT_EDIT,
                    element: <DecisionEditPage />,
                    permission: 'decision.update',
                  },
                  {
                    path: APP_PATH.DECISION_MANAGEMENT_HISTORY,
                    element: <BaseHistoriesPage path={ApiPaths.hrm_decisions_histories_retrieve} />,
                    permission: 'decision.histories',
                  },
                  {
                    path: APP_PATH.DECISION_MANAGEMENT_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage path={ApiPaths.hrm_decisions_history_retrieve} />
                    ),
                    permission: 'decision.history_detail',
                  },
                ],
              },
              // Proposal Management
              {
                path: APP_PATH.PROPOSAL_MANAGEMENT,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <IndexRedirect redirectTo={APP_PATH.PROPOSAL_UNPAID_LEAVE} />,
                  },
                  {
                    path: APP_PATH.PROPOSAL_MANAGE,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <ProposalVerifierManagePage />,
                        permission: 'proposal_verifier.mine',
                      },
                      {
                        path: APP_PATH.PROPOSAL_MANAGE_DETAIL,
                        element: <ProposalManageDetailPage />,
                        permission: 'proposal_verifier.retrieve',
                      },
                      {
                        path: APP_PATH.PROPOSAL_MANAGE_HISTORY,
                        element: <ProposalHistoriesPage />,
                        permission: 'proposal_verifier.histories',
                      },
                      {
                        path: APP_PATH.PROPOSAL_MANAGE_HISTORY_DETAIL,
                        element: <ProposalHistoryDetailPage />,
                        permission: 'proposal_verifier.history_detail',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.PROPOSAL_LIST,
                    element: <ProposalListPage />,
                    permission: 'proposal.list',
                  },
                  {
                    path: APP_PATH.PROPOSAL_UNPAID_LEAVE,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <ProposalUnpaidLeavePage />,
                        permission: 'proposal_unpaid_leave.list',
                      },
                      {
                        path: APP_PATH.PROPOSAL_UNPAID_LEAVE_DETAIL,
                        element: <ProposalUnpaidLeaveDetailPage />,
                        permission: 'proposal_unpaid_leave.retrieve',
                      },
                      {
                        path: APP_PATH.PROPOSAL_UNPAID_LEAVE_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.hrm_proposals_unpaid_leave_histories_retrieve}
                          />
                        ),
                        permission: 'proposal_unpaid_leave.histories',
                      },
                      {
                        path: APP_PATH.PROPOSAL_UNPAID_LEAVE_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.hrm_proposals_unpaid_leave_history_retrieve}
                          />
                        ),
                        permission: 'proposal_unpaid_leave.history_detail',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.PROPOSAL_PAID_LEAVE,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <ProposalPaidLeavePage />,
                        permission: 'proposal_paid_leave.list',
                      },
                      {
                        path: APP_PATH.PROPOSAL_PAID_LEAVE_DETAIL,
                        element: <ProposalPaidLeaveDetailPage />,
                        permission: 'proposal_paid_leave.retrieve',
                      },
                      {
                        path: APP_PATH.PROPOSAL_PAID_LEAVE_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.hrm_proposals_paid_leave_histories_retrieve}
                          />
                        ),
                        permission: 'proposal_paid_leave.histories',
                      },
                      {
                        path: APP_PATH.PROPOSAL_PAID_LEAVE_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.hrm_proposals_paid_leave_history_retrieve}
                          />
                        ),
                        permission: 'proposal_paid_leave.history_detail',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.PROPOSAL_OVERTIME_WORK,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <ProposalOvertimeWorkPage />,
                        permission: 'proposal_overtime_work.list',
                      },
                      {
                        path: APP_PATH.PROPOSAL_OVERTIME_WORK_DETAIL,
                        element: <ProposalOvertimeWorkDetailPage />,
                        permission: 'proposal_overtime_work.retrieve',
                      },
                      {
                        path: APP_PATH.PROPOSAL_OVERTIME_WORK_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.hrm_proposals_overtime_work_histories_retrieve}
                          />
                        ),
                        permission: 'proposal_overtime_work.histories',
                      },
                      {
                        path: APP_PATH.PROPOSAL_OVERTIME_WORK_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.hrm_proposals_overtime_work_history_retrieve}
                          />
                        ),
                        permission: 'proposal_overtime_work.history_detail',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.PROPOSAL_LATE_EXEMPTION,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <ProposalLateExemptionPage />,
                        permission: 'proposal_late_exemption.list',
                      },
                      {
                        path: APP_PATH.PROPOSAL_LATE_EXEMPTION_DETAIL,
                        element: <ProposalLateExemptionDetailPage />,
                        permission: 'proposal_late_exemption.retrieve',
                      },
                      {
                        path: APP_PATH.PROPOSAL_LATE_EXEMPTION_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.hrm_proposals_late_exemption_histories_retrieve}
                          />
                        ),
                        permission: 'proposal_late_exemption.histories',
                      },
                      {
                        path: APP_PATH.PROPOSAL_LATE_EXEMPTION_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.hrm_proposals_late_exemption_history_retrieve}
                          />
                        ),
                        permission: 'proposal_late_exemption.history_detail',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.PROPOSAL_POST_MATERNITY_BENEFIT,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <ProposalPostMaternityBenefitPage />,
                        permission: 'proposal_post_maternity_benefits.list',
                      },
                      {
                        path: APP_PATH.PROPOSAL_POST_MATERNITY_BENEFIT_DETAIL,
                        element: <ProposalPostMaternityBenefitDetailPage />,
                        permission: 'proposal_post_maternity_benefits.retrieve',
                      },
                      {
                        path: APP_PATH.PROPOSAL_POST_MATERNITY_BENEFIT_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.hrm_proposals_post_maternity_benefits_histories_retrieve}
                          />
                        ),
                        permission: 'proposal_post_maternity_benefits.histories',
                      },
                      {
                        path: APP_PATH.PROPOSAL_POST_MATERNITY_BENEFIT_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.hrm_proposals_post_maternity_benefits_history_retrieve}
                          />
                        ),
                        permission: 'proposal_post_maternity_benefits.history_detail',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.PROPOSAL_MATERNITY_LEAVE,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <ProposalMaternityLeavePage />,
                        permission: 'proposal_maternity_leave.list',
                      },
                      {
                        path: APP_PATH.PROPOSAL_MATERNITY_LEAVE_DETAIL,
                        element: <ProposalMaternityLeaveDetailPage />,
                        permission: 'proposal_maternity_leave.retrieve',
                      },
                      {
                        path: APP_PATH.PROPOSAL_MATERNITY_LEAVE_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.hrm_proposals_maternity_leave_histories_retrieve}
                          />
                        ),
                        permission: 'proposal_maternity_leave.histories',
                      },
                      {
                        path: APP_PATH.PROPOSAL_MATERNITY_LEAVE_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.hrm_proposals_maternity_leave_history_retrieve}
                          />
                        ),
                        permission: 'proposal_maternity_leave.history_detail',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.PROPOSAL_JOB_TRANSFER,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <ProposalJobTransferPage />,
                        permission: 'proposal_job_transfer.list',
                      },
                      {
                        path: APP_PATH.PROPOSAL_JOB_TRANSFER_DETAIL,
                        element: <ProposalJobTransferDetailPage />,
                        permission: 'proposal_job_transfer.retrieve',
                      },
                      {
                        path: APP_PATH.PROPOSAL_JOB_TRANSFER_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.hrm_proposals_job_transfer_histories_retrieve}
                          />
                        ),
                        permission: 'proposal_job_transfer.histories',
                      },
                      {
                        path: APP_PATH.PROPOSAL_JOB_TRANSFER_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.hrm_proposals_job_transfer_history_retrieve}
                          />
                        ),
                        permission: 'proposal_job_transfer.history_detail',
                      },
                    ],
                  },
                  // --------------------------------
                  {
                    path: APP_PATH.PROPOSAL_BULK_JOB_TRANSFER,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <ProposalBulkJobTransferPage />,
                        permission: 'proposal_bulk_job_transfer.list',
                      },
                      {
                        path: APP_PATH.PROPOSAL_BULK_JOB_TRANSFER_CREATE,
                        element: <ProposalBulkJobTransferCreatePage />,
                        permission: 'proposal_bulk_job_transfer.create',
                      },
                      {
                        path: APP_PATH.PROPOSAL_BULK_JOB_TRANSFER_DETAIL,
                        element: <ProposalBulkJobTransferDetailPage />,
                        permission: 'proposal_bulk_job_transfer.retrieve',
                      },
                      {
                        path: APP_PATH.PROPOSAL_BULK_JOB_TRANSFER_EDIT,
                        element: <ProposalBulkJobTransferEditPage />,
                        permission: 'proposal_bulk_job_transfer.update',
                      },
                      {
                        path: APP_PATH.PROPOSAL_BULK_JOB_TRANSFER_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.hrm_proposals_bulk_job_transfer_histories_retrieve}
                          />
                        ),
                        permission: 'proposal_bulk_job_transfer.histories',
                      },
                      {
                        path: APP_PATH.PROPOSAL_BULK_JOB_TRANSFER_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.hrm_proposals_bulk_job_transfer_history_retrieve}
                          />
                        ),
                        permission: 'proposal_bulk_job_transfer.history_detail',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.PROPOSAL_ASSET_ALLOCATION,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <ProposalAssetAllocationPage />,
                        permission: 'proposal_asset_allocation.list',
                      },
                      {
                        path: APP_PATH.PROPOSAL_ASSET_ALLOCATION_DETAIL,
                        element: <ProposalAssetAllocationDetailPage />,
                        permission: 'proposal_asset_allocation.retrieve',
                      },
                      {
                        path: APP_PATH.PROPOSAL_ASSET_ALLOCATION_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.hrm_proposals_asset_allocation_histories_retrieve}
                          />
                        ),
                        permission: 'proposal_asset_allocation.histories',
                      },
                      {
                        path: APP_PATH.PROPOSAL_ASSET_ALLOCATION_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.hrm_proposals_asset_allocation_history_retrieve}
                          />
                        ),
                        permission: 'proposal_asset_allocation.history_detail',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.PROPOSAL_DEVICE_CHANGE,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <ProposalDeviceChangePage />,
                        permission: 'proposal_device_change.list',
                      },
                      {
                        path: APP_PATH.PROPOSAL_DEVICE_CHANGE_DETAIL,
                        element: <ProposalDeviceChangeDetailPage />,
                        permission: 'proposal_device_change.retrieve',
                      },
                      {
                        path: APP_PATH.PROPOSAL_DEVICE_CHANGE_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.hrm_proposals_device_change_histories_retrieve}
                          />
                        ),
                        permission: 'proposal_device_change.histories',
                      },
                      {
                        path: APP_PATH.PROPOSAL_DEVICE_CHANGE_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.hrm_proposals_device_change_history_retrieve}
                          />
                        ),
                        permission: 'proposal_device_change.history_detail',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.PROPOSAL_RETURN_TO_WORK,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <ProposalReturnToWorkPage />,
                        permission: 'proposal_return_to_work.list',
                      },
                      {
                        path: APP_PATH.PROPOSAL_RETURN_TO_WORK_DETAIL,
                        element: <ProposalReturnToWorkDetailPage />,
                        permission: 'proposal_return_to_work.retrieve',
                      },
                      {
                        path: APP_PATH.PROPOSAL_RETURN_TO_WORK_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.hrm_proposals_return_to_work_histories_retrieve}
                          />
                        ),
                        permission: 'proposal_return_to_work.histories',
                      },
                      {
                        path: APP_PATH.PROPOSAL_RETURN_TO_WORK_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.hrm_proposals_return_to_work_history_retrieve}
                          />
                        ),
                        permission: 'proposal_return_to_work.history_detail',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.PROPOSAL_STATUTORY_LEAVE,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <ProposalStatutoryLeavePage />,
                        permission: 'proposal_statutory_leave.list',
                      },
                      {
                        path: APP_PATH.PROPOSAL_STATUTORY_LEAVE_DETAIL,
                        element: <ProposalStatutoryLeaveDetailPage />,
                        permission: 'proposal_statutory_leave.retrieve',
                      },
                      {
                        path: APP_PATH.PROPOSAL_STATUTORY_LEAVE_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.hrm_proposals_statutory_leave_histories_retrieve}
                          />
                        ),
                        permission: 'proposal_statutory_leave.histories',
                      },
                      {
                        path: APP_PATH.PROPOSAL_STATUTORY_LEAVE_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.hrm_proposals_statutory_leave_history_retrieve}
                          />
                        ),
                        permission: 'proposal_statutory_leave.history_detail',
                      },
                    ],
                  },
                ],
              },
            ],
          },

          // -------------------------------------
          // Contract Management
          {
            path: APP_PATH.CONTRACT,
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <IndexRedirect redirectTo={APP_PATH.CONTRACT_TYPE} />,
              },
              {
                path: APP_PATH.CONTRACT_TYPE,
                element: <Outlet />,
                children: [
                  { index: true, element: <ContractTypePage />, permission: 'contract_type.list' },
                  {
                    path: APP_PATH.CONTRACT_TYPE_CREATE,
                    element: <ContractTypeCreatePage />,
                    permission: 'contract_type.create',
                  },
                  {
                    path: APP_PATH.CONTRACT_TYPE_DETAIL,
                    element: <ContractTypeDetailPage />,
                    permission: 'contract_type.retrieve',
                  },
                  {
                    path: APP_PATH.CONTRACT_TYPE_EDIT,
                    element: <ContractTypeEditPage />,
                    permission: 'contract_type.update',
                  },
                  {
                    path: APP_PATH.CONTRACT_TYPE_HISTORY,
                    element: (
                      <BaseHistoriesPage path={ApiPaths.hrm_contract_types_histories_retrieve} />
                    ),
                    permission: 'contract_type.histories',
                  },
                  {
                    path: APP_PATH.CONTRACT_TYPE_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage path={ApiPaths.hrm_contract_types_history_retrieve} />
                    ),
                    permission: 'contract_type.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.CONTRACT_MANAGE,
                element: <Outlet />,
                children: [
                  { index: true, element: <ContractManagePage />, permission: 'contract.list' },
                  {
                    path: APP_PATH.CONTRACT_MANAGE_CREATE,
                    element: <ContractManageCreatePage />,
                    permission: 'contract.create',
                  },
                  {
                    path: APP_PATH.CONTRACT_MANAGE_DETAIL,
                    element: <ContractManageDetailPage />,
                    permission: 'contract.retrieve',
                  },
                  {
                    path: APP_PATH.CONTRACT_MANAGE_EDIT,
                    element: <ContractManageEditPage />,
                    permission: 'contract.update',
                  },
                  {
                    path: APP_PATH.CONTRACT_MANAGE_HISTORY,
                    element: <BaseHistoriesPage path={ApiPaths.hrm_contracts_histories_retrieve} />,
                    permission: 'contract.histories',
                  },
                  {
                    path: APP_PATH.CONTRACT_MANAGE_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage path={ApiPaths.hrm_contracts_history_retrieve} />
                    ),
                    permission: 'contract.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.CONTRACT_APPENDIX,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <ContractAppendixPage />,
                    permission: 'contract_appendix.list',
                  },
                  {
                    path: APP_PATH.CONTRACT_APPENDIX_CREATE,
                    element: <ContractAppendixCreatePage />,
                    permission: 'contract_appendix.create',
                  },
                  {
                    path: APP_PATH.CONTRACT_APPENDIX_DETAIL,
                    element: <ContractAppendixDetailPage />,
                    permission: 'contract_appendix.retrieve',
                  },
                  {
                    path: APP_PATH.CONTRACT_APPENDIX_EDIT,
                    element: <ContractAppendixEditPage />,
                    permission: 'contract_appendix.update',
                  },
                  {
                    path: APP_PATH.CONTRACT_APPENDIX_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.hrm_contract_appendices_histories_retrieve}
                      />
                    ),
                    permission: 'contract_appendix.histories',
                  },
                  {
                    path: APP_PATH.CONTRACT_APPENDIX_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.hrm_contract_appendices_history_retrieve}
                      />
                    ),
                    permission: 'contract_appendix.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.CONTRACT_EVALUATION_MANAGER,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <ContractEvaluationManagerPage />,
                    permission: 'contract_evaluation_manager.list',
                  },
                  {
                    path: APP_PATH.CONTRACT_EVALUATION_MANAGER_DETAIL,
                    element: <ContractEvaluationManagerDetailPage />,
                    permission: 'contract_evaluation_manager.retrieve',
                  },
                  {
                    path: APP_PATH.CONTRACT_EVALUATION_MANAGER_EDIT,
                    element: <ContractEvaluationManagerEditPage />,
                    permission: 'contract_evaluation_manager.partial_update',
                  },
                  {
                    path: APP_PATH.CONTRACT_EVALUATION_MANAGER_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.hrm_contract_evaluations_manager_histories_retrieve}
                      />
                    ),
                    permission: 'contract_evaluation_manager.histories',
                  },
                  {
                    path: APP_PATH.CONTRACT_EVALUATION_MANAGER_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.hrm_contract_evaluations_manager_history_retrieve}
                      />
                    ),
                    permission: 'contract_evaluation_manager.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.CONTRACT_EVALUATION_HR,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <ContractEvaluationHrPage />,
                    permission: 'contract_evaluation_hr.list',
                  },
                  {
                    path: APP_PATH.CONTRACT_EVALUATION_HR_CREATE,
                    element: <ContractEvaluationHrCreatePage />,
                    permission: 'contract_evaluation_hr.force_create',
                  },
                  {
                    path: APP_PATH.CONTRACT_EVALUATION_HR_DETAIL,
                    element: <ContractEvaluationHrDetailPage />,
                    permission: 'contract_evaluation_hr.retrieve',
                  },
                  {
                    path: APP_PATH.CONTRACT_EVALUATION_HR_EDIT,
                    element: <ContractEvaluationHrEditPage />,
                    permission: 'contract_evaluation_hr.partial_update',
                  },
                  {
                    path: APP_PATH.CONTRACT_EVALUATION_HR_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.hrm_contract_evaluations_hr_histories_retrieve}
                      />
                    ),
                    permission: 'contract_evaluation_hr.histories',
                  },
                  {
                    path: APP_PATH.CONTRACT_EVALUATION_HR_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.hrm_contract_evaluations_hr_history_retrieve}
                      />
                    ),
                    permission: 'contract_evaluation_hr.history_detail',
                  },
                ],
              },
            ],
          },

          // -------------------------------------
          // Payroll Module
          {
            path: APP_PATH.PAYROLL,
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <IndexRedirect redirectTo={APP_PATH.PAYROLL_PERIOD} />,
              },
              {
                path: APP_PATH.PAYROLL_PERIOD,
                element: <Outlet />,
                children: [
                  { index: true, element: <PayrollPeriodPage />, permission: 'salary_period.list' },
                  {
                    path: APP_PATH.PAYROLL_PERIOD_DETAIL,
                    element: <PayrollPeriodDashboardPage />,
                    permission: 'salary_period.retrieve',
                  },
                  {
                    path: APP_PATH.PAYROLL_PERIOD_PAYSLIPS,
                    element: <PayrollPeriodPayslipListPage />,
                    permission: 'salary_period.retrieve',
                  },
                  {
                    path: APP_PATH.PAYROLL_PERIOD_CREATE,
                    element: <PayrollPeriodCreatePage />,
                    permission: 'salary_period.create',
                  },
                  {
                    path: APP_PATH.PAYROLL_PERIOD_EDIT,
                    element: <PayrollPeriodEditPage />,
                    permission: 'salary_period.update',
                  },
                  {
                    path: APP_PATH.PAYROLL_PERIOD_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.payroll_salary_periods_histories_retrieve}
                      />
                    ),
                    permission: 'salary_period.histories',
                  },
                  {
                    path: APP_PATH.PAYROLL_PERIOD_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.payroll_salary_periods_history_retrieve}
                      />
                    ),
                    permission: 'salary_period.history_detail',
                  },
                  {
                    path: APP_PATH.PAYROLL_PERIOD_DETAIL_EMPLOYEE,
                    element: <PayrollPeriodEmployeeDetailPage />,
                    // Màn đọc phiếu lương của một nhân viên qua GET /api/payroll/payroll-slips/{id}/.
                    // Mã cũ bị chú thích lại (`payroll_period.retrieve`) không tồn tại ở cả schema lẫn
                    // danh mục quyền BE — họ mã đúng là `payroll_slip.*` / `salary_period.*`.
                    permission: 'payroll_slip.retrieve',
                  },
                  {
                    path: APP_PATH.PAYROLL_PERIOD_PAYSLIP_HISTORY,
                    element: (
                      <BaseHistoriesPage path={ApiPaths.payroll_payroll_slips_histories_retrieve} />
                    ),
                    permission: 'payroll_slip.histories',
                  },
                  {
                    path: APP_PATH.PAYROLL_PERIOD_PAYSLIP_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.payroll_payroll_slips_history_retrieve}
                      />
                    ),
                    permission: 'payroll_slip.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.PAYROLL_CONFIGURATION,
                element: <PayrollConfigurationPage />,
                // Khớp mã quyền của GET /api/payroll/salary-config/ và mục menu "Cấu hình lương".
                permission: 'payroll.view_salary_config',
              },
              {
                path: APP_PATH.TRAVEL_EXPENSE,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <TravelExpensePage />,
                    permission: 'payroll.travel_expense.list',
                  },
                  {
                    path: APP_PATH.TRAVEL_EXPENSE_CREATE,
                    element: <TravelExpenseCreatePage />,
                    permission: 'payroll.travel_expense.create',
                  },
                  {
                    path: APP_PATH.TRAVEL_EXPENSE_DETAIL,
                    element: <TravelExpenseDetailPage />,
                    permission: 'payroll.travel_expense.retrieve',
                  },
                  {
                    path: APP_PATH.TRAVEL_EXPENSE_EDIT,
                    element: <TravelExpenseEditPage />,
                    permission: 'payroll.travel_expense.update',
                  },
                  {
                    path: APP_PATH.TRAVEL_EXPENSE_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.payroll_travel_expenses_histories_retrieve}
                      />
                    ),
                    permission: 'payroll.travel_expense.histories',
                  },
                  {
                    path: APP_PATH.TRAVEL_EXPENSE_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.payroll_travel_expenses_history_retrieve}
                      />
                    ),
                    permission: 'payroll.travel_expense.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.RECOVERY_VOUCHER,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <RecoveryVoucherPage />,
                    permission: 'payroll.recovery_voucher.list',
                  },
                  {
                    path: APP_PATH.RECOVERY_VOUCHER_CREATE,
                    element: <RecoveryVoucherCreatePage />,
                    permission: 'payroll.recovery_voucher.create',
                  },
                  {
                    path: APP_PATH.RECOVERY_VOUCHER_DETAIL,
                    element: <RecoveryVoucherDetailPage />,
                    permission: 'payroll.recovery_voucher.retrieve',
                  },
                  {
                    path: APP_PATH.RECOVERY_VOUCHER_EDIT,
                    element: <RecoveryVoucherEditPage />,
                    permission: 'payroll.recovery_voucher.update',
                  },
                  {
                    path: APP_PATH.RECOVERY_VOUCHER_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.payroll_recovery_vouchers_histories_retrieve}
                      />
                    ),
                    permission: 'payroll.recovery_voucher.histories',
                  },
                  {
                    path: APP_PATH.RECOVERY_VOUCHER_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.payroll_recovery_vouchers_history_retrieve}
                      />
                    ),
                    permission: 'payroll.recovery_voucher.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.SALES_REVENUE,
                element: <Outlet />,
                children: [
                  { index: true, element: <SalesRevenuePage />, permission: 'sales_revenue.list' },
                  {
                    path: APP_PATH.SALES_REVENUE_DETAIL,
                    element: <SalesRevenueDetailPage />,
                    permission: 'sales_revenue.retrieve',
                  },
                  {
                    path: APP_PATH.SALES_REVENUE_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.payroll_sales_revenues_histories_retrieve}
                      />
                    ),
                    permission: 'sales_revenue.histories',
                  },
                  {
                    path: APP_PATH.SALES_REVENUE_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.payroll_sales_revenues_history_retrieve}
                      />
                    ),
                    permission: 'sales_revenue.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.PENALTY_MANAGEMENT,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <PenaltyManagementPage />,
                    permission: 'payroll.penalty_ticket.list',
                  },
                  {
                    path: APP_PATH.PENALTY_MANAGEMENT_CREATE,
                    element: <PenaltyManagementCreatePage />,
                    permission: 'payroll.penalty_ticket.create',
                  },
                  {
                    path: APP_PATH.PENALTY_MANAGEMENT_DETAIL,
                    element: <PenaltyManagementDetailPage />,
                    permission: 'payroll.penalty_ticket.retrieve',
                  },
                  {
                    path: APP_PATH.PENALTY_MANAGEMENT_EDIT,
                    element: <PenaltyManagementEditPage />,
                    permission: 'payroll.penalty_ticket.update',
                  },
                  {
                    path: APP_PATH.PENALTY_MANAGEMENT_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.payroll_penalty_tickets_histories_retrieve}
                      />
                    ),
                    permission: 'payroll.penalty_ticket.histories',
                  },
                  {
                    path: APP_PATH.PENALTY_MANAGEMENT_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.payroll_penalty_tickets_history_retrieve}
                      />
                    ),
                    permission: 'payroll.penalty_ticket.history_detail',
                  },
                ],
              },
            ],
          },

          // -------------------------------------
          {
            path: APP_PATH.EMPLOYEE,
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <IndexRedirect redirectTo={APP_PATH.EMPLOYEE_MANAGEMENT} />,
              },
              {
                path: APP_PATH.EMPLOYEE_MANAGEMENT,
                element: <Outlet />,
                children: [
                  { index: true, element: <EmployeeManagementPage />, permission: 'employee.list' },
                  {
                    path: APP_PATH.EMPLOYEE_MANAGEMENT_CREATE,
                    element: <EmployeeManagementCreatePage />,
                    permission: 'employee.create',
                  },
                  {
                    path: APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL,
                    element: <EmployeeManagementDetailPage />,
                    permission: 'employee.retrieve',
                  },
                  {
                    path: APP_PATH.EMPLOYEE_MANAGEMENT_EDIT,
                    element: <EmployeeManagementEditPage />,
                    permission: 'employee.update',
                  },
                  {
                    path: APP_PATH.EMPLOYEE_MANAGEMENT_HISTORY,
                    element: <BaseHistoriesPage path={ApiPaths.hrm_employees_histories_retrieve} />,
                    permission: 'employee.histories',
                  },
                  {
                    path: APP_PATH.EMPLOYEE_MANAGEMENT_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage path={ApiPaths.hrm_employees_history_retrieve} />
                    ),
                    permission: 'employee.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.EMPLOYEE_LEADERSHIP,
                element: <EmployeeLeadershipPage />,
                permission: 'employee.leader_list',
              },
              {
                path: APP_PATH.EMPLOYEE_BANK_ACCOUNT,
                element: <EmployeeBankAccountPage />,
                permission: 'employee_bank_account.list',
              },
              {
                path: APP_PATH.EMPLOYEE_CERTIFICATE,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <EmployeeCertificatePage />,
                    permission: 'employee_certificate.list',
                  },
                  {
                    path: APP_PATH.EMPLOYEE_CERTIFICATE_CREATE,
                    element: <EmployeeCertificateCreatePage />,
                    permission: 'employee_certificate.create',
                  },
                  {
                    path: APP_PATH.EMPLOYEE_CERTIFICATE_DETAIL,
                    element: <EmployeeCertificateDetailPage />,
                    permission: 'employee_certificate.retrieve',
                  },
                  {
                    path: APP_PATH.EMPLOYEE_CERTIFICATE_EDIT,
                    element: <EmployeeCertificateEditPage />,
                    permission: 'employee_certificate.update',
                  },
                  {
                    path: APP_PATH.EMPLOYEE_CERTIFICATE_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.hrm_employee_certificates_histories_retrieve}
                      />
                    ),
                    permission: 'employee_certificate.histories',
                  },
                  {
                    path: APP_PATH.EMPLOYEE_CERTIFICATE_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.hrm_employee_certificates_history_retrieve}
                      />
                    ),
                    permission: 'employee_certificate.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.EMPLOYEE_RELATION,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <EmployeeRelationPage />,
                    permission: 'employee_relationship.list',
                  },
                  {
                    path: APP_PATH.EMPLOYEE_RELATION_CREATE,
                    element: <EmployeeRelationCreatePage />,
                    permission: 'employee_relationship.create',
                  },
                  {
                    path: APP_PATH.EMPLOYEE_RELATION_DETAIL,
                    element: <EmployeeRelationDetailPage />,
                    permission: 'employee_relationship.retrieve',
                  },
                  {
                    path: APP_PATH.EMPLOYEE_RELATION_EDIT,
                    element: <EmployeeRelationEditPage />,
                    permission: 'employee_relationship.update',
                  },
                  {
                    path: APP_PATH.EMPLOYEE_RELATION_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.hrm_employee_relationships_histories_retrieve}
                      />
                    ),
                    permission: 'employee_relationship.histories',
                  },
                  {
                    path: APP_PATH.EMPLOYEE_RELATION_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.hrm_employee_relationships_history_retrieve}
                      />
                    ),
                    permission: 'employee_relationship.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.EMPLOYEE_DEPENDENT,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <EmployeeDependentPage />,
                    permission: 'employee_dependent.list',
                  },
                  {
                    path: APP_PATH.EMPLOYEE_DEPENDENT_CREATE,
                    element: <EmployeeDependentCreatePage />,
                    permission: 'employee_dependent.create',
                  },
                  {
                    path: APP_PATH.EMPLOYEE_DEPENDENT_DETAIL,
                    element: <EmployeeDependentDetailPage />,
                    permission: 'employee_dependent.retrieve',
                  },
                  {
                    path: APP_PATH.EMPLOYEE_DEPENDENT_EDIT,
                    element: <EmployeeDependentEditPage />,
                    permission: 'employee_dependent.update',
                  },
                  {
                    path: APP_PATH.EMPLOYEE_DEPENDENT_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.hrm_employee_dependents_histories_retrieve}
                      />
                    ),
                    permission: 'employee_dependent.histories',
                  },
                  {
                    path: APP_PATH.EMPLOYEE_DEPENDENT_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.hrm_employee_dependents_history_retrieve}
                      />
                    ),
                    permission: 'employee_dependent.history_detail',
                  },
                ],
              },
              // Nhân viên theo cấu trúc tổ chức (org-tree) — gộp vào Outlet EMPLOYEE
              {
                path: APP_PATH.EMPLOYEE_ORG_TREE,
                element: <EmployeeOrgTreePage />,
                permission: 'employee.list',
              },
            ],
          },

          // -------------------------------------
          {
            path: APP_PATH.REPORT,
            element: <Outlet />,
            children: [
              {
                index: true,
                element: (
                  <IndexRedirect redirectTo={APP_PATH.REPORT_RECRUITMENT_STAFF_GROWTH_WEEKLY} />
                ),
              },
              {
                path: APP_PATH.REPORT_RECRUITMENT,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: (
                      <IndexRedirect redirectTo={APP_PATH.REPORT_RECRUITMENT_STAFF_GROWTH_WEEKLY} />
                    ),
                  },
                  {
                    path: APP_PATH.REPORT_RECRUITMENT_STAFF_GROWTH_WEEKLY,
                    element: <ReportRecruitmentStaffGrowthPage />,
                    permission: 'recruitment_reports.staff_growth',
                  },
                  {
                    path: APP_PATH.REPORT_RECRUITMENT_SOURCE,
                    element: <ReportRecruitmentSourcePage />,
                    permission: 'recruitment_reports.recruitment_source',
                  },
                  {
                    path: APP_PATH.REPORT_RECRUITMENT_CHANNEL,
                    element: <ReportRecruitmentChannelPage />,
                    permission: 'recruitment_reports.recruitment_channel',
                  },
                  {
                    path: APP_PATH.REPORT_RECRUITMENT_EXPENSE_BY_SOURCE,
                    element: <ReportRecruitmentExpenseBySourcePage />,
                    permission: 'recruitment_reports.cost_by_source',
                  },
                  {
                    path: APP_PATH.REPORT_RECRUITMENT_EXPENSE_BY_STAFF,
                    element: <ReportRecruitmentExpenseByStaffPage />,
                    permission: 'recruitment_reports.cost_by_payer',
                  },
                  {
                    path: APP_PATH.REPORT_RECRUITMENT_REFERRAL_EXPENSE,
                    element: <ReportRecruitmentReferralCostPage />,
                    permission: 'recruitment_reports.referral_cost',
                  },
                  {
                    path: APP_PATH.REPORT_RECRUITMENT_HIRED_CANDIDATE,
                    element: <ReportRecruitmentHiredCandidatePage />,
                    permission: 'recruitment_reports.hired_candidate',
                  },
                ],
              },
              {
                path: APP_PATH.REPORT_STAFF,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <IndexRedirect redirectTo={APP_PATH.REPORT_STAFF_TURNOVER} />,
                  },
                  {
                    path: APP_PATH.REPORT_STAFF_TURNOVER,
                    element: <ReportStaffTurnoverPage />,
                    permission: 'employee_reports.employee_resigned_breakdown',
                  },
                  {
                    path: APP_PATH.REPORT_STAFF_STATISTICS,
                    element: <ReportStaffStatisticsPage />,
                    permission: 'employee_reports.employee_status_breakdown',
                  },
                  {
                    path: APP_PATH.REPORT_STAFF_RESIGNED_REASON,
                    element: <ReportStaffResignedReasonPage />,
                    permission: 'employee_reports.employee_resigned_reasons_summary',
                  },
                  {
                    path: APP_PATH.REPORT_STAFF_SENIORITY,
                    element: <ReportStaffSeniorityPage />,
                    permission: 'employee_seniority_report.list',
                  },
                  {
                    path: APP_PATH.REPORT_STAFF_TYPE_CONVERSION,
                    element: <ReportEmployeeTypeConversionPage />,
                    permission: 'employee_type_conversion_report.list',
                  },
                  {
                    path: APP_PATH.REPORT_STAFF_SALES_REVENUE,
                    element: <ReportStaffSalesRevenuePage />,
                    permission: 'sales_revenue_report.list',
                  },
                  {
                    path: APP_PATH.REPORT_STAFF_IN_OUT,
                    element: <ReportStaffInOutPage />,
                    permission: 'employee_reports.staff_in_out_report',
                  },
                  {
                    path: APP_PATH.REPORT_STAFF_JOB_TRANSFER,
                    element: <ReportJobTransferPage />,
                    permission: 'job_transfer_report.list',
                  },
                ],
              },

              {
                path: APP_PATH.REPORT_ATTENDANCE,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <IndexRedirect redirectTo={APP_PATH.REPORT_ATTENDANCE_METHOD} />,
                  },
                  {
                    path: APP_PATH.REPORT_ATTENDANCE_METHOD,
                    element: <ReportAttendanceMethodPage />,
                    permission: 'recruitment_reports.by_method',
                  },
                  {
                    path: APP_PATH.REPORT_ATTENDANCE_PROJECT,
                    element: <ReportAttendanceProjectPage />,
                    permission: 'recruitment_reports.by_project',
                  },
                  {
                    path: APP_PATH.REPORT_ATTENDANCE_PROJECT_UNIT,
                    element: <ReportAttendanceProjectOrgPage />,
                    permission: 'recruitment_reports.by_project_organization',
                  },
                  {
                    path: APP_PATH.REPORT_ATTENDANCE_UNCHECKIN,
                    element: <ReportAttendanceUncheckinPage />,
                    permission: 'recruitment_reports.by_uncheckin',
                  },
                ],
              },
            ],
          },

          // Attendance Module
          {
            path: APP_PATH.ATTENDANCE,
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <IndexRedirect redirectTo={APP_PATH.ATTENDANCE_DEVICE} />,
              },
              {
                path: APP_PATH.ATTENDANCE_DEVICE,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <AttendanceDevicePage />,
                    permission: 'attendance_device.list',
                  },
                  {
                    path: APP_PATH.ATTENDANCE_DEVICE_CREATE,
                    element: <AttendanceDeviceCreatePage />,
                    permission: 'attendance_device.create',
                  },
                  {
                    path: APP_PATH.ATTENDANCE_DEVICE_DETAIL,
                    element: <AttendanceDeviceDetailPage />,
                    permission: 'attendance_device.retrieve',
                  },
                  {
                    path: APP_PATH.ATTENDANCE_DEVICE_EDIT,
                    element: <AttendanceDeviceEditPage />,
                    permission: 'attendance_device.update',
                  },
                  {
                    path: APP_PATH.ATTENDANCE_DEVICE_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.hrm_attendance_devices_histories_retrieve}
                      />
                    ),
                    permission: 'attendance_device.histories',
                  },
                  {
                    path: APP_PATH.ATTENDANCE_DEVICE_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.hrm_attendance_devices_history_retrieve}
                      />
                    ),
                    permission: 'attendance_device.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.ATTENDANCE_WIFI_DEVICE,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <WifiDevicePage />,
                    permission: 'wifi_attendance_device.list',
                  },
                  {
                    path: APP_PATH.ATTENDANCE_WIFI_DEVICE_CREATE,
                    element: <WifiDeviceCreatePage />,
                    permission: 'wifi_attendance_device.create',
                  },
                  {
                    path: APP_PATH.ATTENDANCE_WIFI_DEVICE_DETAIL,
                    element: <WifiDeviceDetailPage />,
                    permission: 'wifi_attendance_device.retrieve',
                  },
                  {
                    path: APP_PATH.ATTENDANCE_WIFI_DEVICE_EDIT,
                    element: <WifiDeviceEditPage />,
                    permission: 'wifi_attendance_device.update',
                  },
                  {
                    path: APP_PATH.ATTENDANCE_WIFI_DEVICE_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.hrm_attendance_wifi_devices_histories_retrieve}
                      />
                    ),
                    permission: 'wifi_attendance_device.histories',
                  },
                  {
                    path: APP_PATH.ATTENDANCE_WIFI_DEVICE_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.hrm_attendance_wifi_devices_history_retrieve}
                      />
                    ),
                    permission: 'wifi_attendance_device.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.HOLIDAY_MANAGEMENT,
                element: <Outlet />,
                children: [
                  { index: true, element: <HolidayManagementPage />, permission: 'holiday.list' },
                  {
                    path: APP_PATH.HOLIDAY_MANAGEMENT_CREATE,
                    element: <HolidayManagementCreatePage />,
                    permission: 'holiday.create',
                  },
                  {
                    path: APP_PATH.HOLIDAY_MANAGEMENT_DETAIL,
                    element: <HolidayManagementDetailPage />,
                    permission: 'holiday.retrieve',
                  },
                  {
                    path: APP_PATH.HOLIDAY_MANAGEMENT_EDIT,
                    element: <HolidayManagementEditPage />,
                    permission: 'holiday.update',
                  },
                  {
                    path: APP_PATH.HOLIDAY_MANAGEMENT_HISTORY,
                    element: <BaseHistoriesPage path={ApiPaths.hrm_holidays_histories_retrieve} />,
                    permission: 'holiday.histories',
                  },
                  {
                    path: APP_PATH.HOLIDAY_MANAGEMENT_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage path={ApiPaths.hrm_holidays_history_retrieve} />
                    ),
                    permission: 'holiday.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.ATTENDANCE_WORKING_SCHEDULE,
                element: <WorkSchedulePage />,
                // CỐ Ý không khai `permission`: lịch làm việc là dữ liệu tra cứu chung, mọi tài khoản
                // đã đăng nhập đều được xem — chỉ cần chốt chặn đăng nhập của `AuthGuard`. BE cũng
                // theo đúng chủ đích này: `WorkScheduleViewSet` không khai `permission_prefix` nên
                // không sinh mã quyền nào (docs/srs/.../hrm/6.4-work-schedule/fsd.md §3.3).
                // Đừng "sửa" bằng cách thêm mã tự đặt — ClickUp 86eyg6p32 đã kết luận không phải bug.
              },
              {
                path: APP_PATH.ATTENDANCE_TIMESHEET,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: (
                      <Suspense fallback={<PageLoading />}>
                        <TimesheetPage />
                      </Suspense>
                    ),
                    permission: 'timesheet.list',
                  },
                  {
                    path: APP_PATH.ATTENDANCE_TIMESHEET_DETAIL,
                    element: (
                      <Suspense fallback={<PageLoading />}>
                        <TimesheetEntryDetailPage />
                      </Suspense>
                    ),
                    permission: 'timesheet.retrieve',
                  },
                  {
                    path: APP_PATH.ATTENDANCE_TIMESHEET_HISTORY,
                    element: (
                      <BaseHistoriesPage path={ApiPaths.hrm_timesheet_entries_histories_retrieve} />
                    ),
                    permission: 'timesheet.histories',
                  },
                  {
                    path: APP_PATH.ATTENDANCE_TIMESHEET_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.hrm_timesheet_entries_history_retrieve}
                      />
                    ),
                    permission: 'timesheet.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.ATTENDANCE_TIMESHEET_COMPLAINT,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: (
                      <Suspense fallback={<PageLoading />}>
                        <TimesheetComplaintPage />
                      </Suspense>
                    ),
                    permission: 'proposal_timesheet_entry_complaint.list',
                  },
                  {
                    path: APP_PATH.ATTENDANCE_TIMESHEET_COMPLAINT_DETAIL,
                    element: (
                      <Suspense fallback={<PageLoading />}>
                        <TimesheetComplaintDetailPage />
                      </Suspense>
                    ),
                    permission: 'proposal_timesheet_entry_complaint.retrieve',
                  },
                  {
                    path: APP_PATH.ATTENDANCE_TIMESHEET_COMPLAINT_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.hrm_proposals_timesheet_entry_complaint_histories_retrieve}
                      />
                    ),
                    permission: 'proposal_timesheet_entry_complaint.reject',
                  },
                  {
                    path: APP_PATH.ATTENDANCE_TIMESHEET_COMPLAINT_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.hrm_proposals_timesheet_entry_complaint_history_retrieve}
                      />
                    ),
                    permission: 'proposal_timesheet_entry_complaint.reject',
                  },
                ],
              },
              {
                path: APP_PATH.ATTENDANCE_DAILY_TIMESHEET,
                element: (
                  <Suspense fallback={<PageLoading />}>
                    <DailyTimesheetPage />
                  </Suspense>
                ),
                permission: 'timesheet_daily_entry.list',
              },
              {
                path: APP_PATH.ATTENDANCE_LOG,
                element: <AttendanceLogPage />,
                permission: 'attendance_record.first_attendance',
              },
              {
                path: APP_PATH.ATTENDANCE_OTHER,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <OtherAttendanceListPage />,
                    permission: 'attendance_record.list',
                  },
                  {
                    path: APP_PATH.ATTENDANCE_OTHER_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.hrm_attendance_records_histories_retrieve}
                      />
                    ),
                    permission: 'attendance_record.histories',
                  },
                  {
                    path: APP_PATH.ATTENDANCE_OTHER_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.hrm_attendance_records_history_retrieve}
                      />
                    ),
                    permission: 'attendance_record.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.ATTENDANCE_EXEMPTION,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <AttendanceExemptionPage />,
                    permission: 'attendance_exemption.list',
                  },
                  {
                    path: APP_PATH.ATTENDANCE_EXEMPTION_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.hrm_attendance_exemptions_histories_retrieve}
                      />
                    ),
                    permission: 'attendance_exemption.histories',
                  },
                  {
                    path: APP_PATH.ATTENDANCE_EXEMPTION_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.hrm_attendance_exemptions_history_retrieve}
                      />
                    ),
                    permission: 'attendance_exemption.history_detail',
                  },
                ],
              },
              {
                path: APP_PATH.PROJECT_LOCATION_MANAGEMENT,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <ProjectLocationListPage />,
                    permission: 'attendance_geolocation.list',
                  },
                  {
                    path: APP_PATH.PROJECT_LOCATION_CREATE,
                    element: <ProjectLocationCreatePage />,
                    permission: 'attendance_geolocation.create',
                  },
                  {
                    path: APP_PATH.PROJECT_LOCATION_EDIT,
                    element: <ProjectLocationEditPage />,
                    permission: 'attendance_geolocation.update',
                  },
                  {
                    path: APP_PATH.PROJECT_LOCATION_DETAIL,
                    element: <ProjectLocationDetailPage />,
                    permission: 'attendance_geolocation.retrieve',
                  },
                  {
                    path: APP_PATH.PROJECT_LOCATION_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.hrm_attendance_geolocations_histories_retrieve}
                      />
                    ),
                    permission: 'attendance_geolocation.histories',
                  },
                  {
                    path: APP_PATH.PROJECT_LOCATION_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.hrm_attendance_geolocations_history_retrieve}
                      />
                    ),
                    permission: 'attendance_geolocation.history_detail',
                  },
                ],
              },
            ],
          },

          // ===================== "Thư ký dự án" (Project Admin) — base Outlet cha-con =====================
          {
            path: APP_PATH.PROJECT_ADMIN,
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <IndexRedirect redirectTo={APP_PATH.PROJECT_MANAGEMENT} />,
              },
              // ---------- Sub-group "Dự án" ----------
              {
                path: APP_PATH.PROJECT,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <IndexRedirect redirectTo={APP_PATH.PROJECT_MANAGEMENT} />,
                  },
                  {
                    path: APP_PATH.PROJECT_MANAGEMENT,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <ProjectManagementPage />,
                        permission: 'project.list',
                      },
                      {
                        path: APP_PATH.PROJECT_MANAGEMENT_CREATE,
                        element: <ProjectManagementCreatePage />,
                        permission: 'project.create',
                      },
                      {
                        path: APP_PATH.PROJECT_MANAGEMENT_DETAIL,
                        element: <ProjectManagementDetailPage />,
                        permission: 'project.retrieve',
                      },
                      {
                        path: APP_PATH.PROJECT_MANAGEMENT_DOCUMENTS,
                        element: <ProjectDocumentsRedirect />,
                        permission: 'project_document.list',
                      },
                      {
                        path: APP_PATH.PROJECT_MANAGEMENT_EDIT,
                        element: <ProjectManagementEditPage />,
                        permission: 'project.update',
                      },
                      {
                        path: APP_PATH.PROJECT_MANAGEMENT_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.realestate_projects_histories_retrieve}
                          />
                        ),
                        permission: 'project.histories',
                      },
                      {
                        path: APP_PATH.PROJECT_MANAGEMENT_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.realestate_projects_history_retrieve}
                          />
                        ),
                        permission: 'project.history_detail',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.PROJECT_SALE_ALLOCATIONS,
                    element: <Outlet />,
                    children: [
                      { index: true, element: <SaleAllocationsPage />, permission: 'project.list' },
                      {
                        path: APP_PATH.PROJECT_SALE_ALLOCATIONS_CREATE,
                        element: <SaleAllocationCreatePage />,
                        permission: 'project.create',
                      },
                      {
                        path: APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL,
                        element: <SaleAllocationDetailPage />,
                        permission: 'project.retrieve',
                      },
                      {
                        path: APP_PATH.PROJECT_SALE_ALLOCATIONS_EDIT,
                        element: <SaleAllocationEditPage />,
                        permission: 'project.update',
                      },
                      {
                        path: APP_PATH.PROJECT_SA_TBC_MANAGEMENT_CREATE,
                        element: <SaleAllocationTbcManagementCreatePage />,
                        permission: 'project.update',
                      },
                      {
                        path: APP_PATH.PROJECT_SA_TBC_MANAGEMENT_EDIT,
                        element: <SaleAllocationTbcManagementEditPage />,
                        permission: 'project.update',
                      },
                      {
                        path: APP_PATH.PROJECT_SA_TBC_COMMISSION_CREATE,
                        element: <SaleAllocationTbcCommissionCreatePage />,
                        permission: 'project.update',
                      },
                      {
                        path: APP_PATH.PROJECT_SA_TBC_COMMISSION_DETAIL,
                        element: <SaleAllocationTbcCommissionDetailPage />,
                        permission: 'project.retrieve',
                      },
                      {
                        path: APP_PATH.PROJECT_SA_TBC_COMMISSION_EDIT,
                        element: <SaleAllocationTbcCommissionEditPage />,
                        permission: 'project.update',
                      },
                      {
                        path: APP_PATH.PROJECT_SA_TBC_F2_CREATE,
                        element: <SaleAllocationTbcF2CreatePage />,
                        permission: 'project.update',
                      },
                      {
                        path: APP_PATH.PROJECT_SA_TBC_F2_EDIT,
                        element: <SaleAllocationTbcF2EditPage />,
                        permission: 'project.update',
                      },
                      {
                        path: APP_PATH.PROJECT_SALE_ALLOCATIONS_HISTORY,
                        element: <SaleAllocationHistoryPage />,
                        permission: 'project.histories',
                      },
                      {
                        path: APP_PATH.PROJECT_SALE_ALLOCATIONS_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={'/api/realestate/sales-allocations/{id}/history/{log_id}/'}
                          />
                        ),
                        permission: 'project.history_detail',
                      },
                    ],
                  },
                  // Project Product Inventories (flat, PI-scoped)
                  {
                    path: APP_PATH.PROJECT_PRODUCT_INVENTORIES,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <ProjectProductInventoryPage />,
                        permission: 'project.list',
                      },
                      {
                        path: APP_PATH.PROJECT_PRODUCT_INVENTORIES_CREATE,
                        element: <ProjectProductInventoryCreatePage />,
                        permission: 'project.create',
                      },
                      {
                        path: APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL,
                        element: <ProjectProductInventoryDetailPage />,
                        permission: 'project.retrieve',
                      },
                      {
                        path: APP_PATH.PROJECT_PRODUCT_INVENTORIES_TBC_CREATE,
                        element: <ProjectProductInventoryTbcCommissionCreatePage />,
                        permission: 'project.update',
                      },
                      {
                        path: APP_PATH.PROJECT_PRODUCT_INVENTORIES_TBC_EDIT,
                        element: <ProjectProductInventoryTbcCommissionEditPage />,
                        permission: 'project.update',
                      },
                      {
                        path: APP_PATH.PROJECT_PRODUCT_INVENTORIES_MANAGEMENT_CREATE,
                        element: <ProjectProductInventoryTbcManagementCreatePage />,
                        permission: 'project.update',
                      },
                      {
                        path: APP_PATH.PROJECT_PRODUCT_INVENTORIES_MANAGEMENT_EDIT,
                        element: <ProjectProductInventoryTbcManagementEditPage />,
                        permission: 'project.update',
                      },
                      {
                        path: APP_PATH.PROJECT_PRODUCT_INVENTORIES_F2_CREATE,
                        element: <ProjectProductInventoryTbcF2CreatePage />,
                        permission: 'project.update',
                      },
                      {
                        path: APP_PATH.PROJECT_PRODUCT_INVENTORIES_F2_EDIT,
                        element: <ProjectProductInventoryTbcF2EditPage />,
                        permission: 'project.update',
                      },
                      {
                        path: APP_PATH.PROJECT_PRODUCT_INVENTORIES_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={'/api/realestate/product-inventories/{id}/histories/'}
                          />
                        ),
                        permission: 'project.histories',
                      },
                      {
                        path: APP_PATH.PROJECT_PRODUCT_INVENTORIES_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={'/api/realestate/product-inventories/{id}/history/{log_id}/'}
                          />
                        ),
                        permission: 'project.history_detail',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.INVESTOR_MANAGEMENT,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <InvestorManagementPage />,
                        permission: 'investor.list',
                      },
                      {
                        path: APP_PATH.INVESTOR_MANAGEMENT_CREATE,
                        element: <InvestorManagementCreatePage />,
                        permission: 'investor.create',
                      },
                      {
                        path: APP_PATH.INVESTOR_MANAGEMENT_DETAIL,
                        element: <InvestorManagementDetailPage />,
                        permission: 'investor.retrieve',
                      },
                      {
                        path: APP_PATH.INVESTOR_MANAGEMENT_EDIT,
                        element: <InvestorManagementEditPage />,
                        permission: 'investor.update',
                      },
                      {
                        path: APP_PATH.INVESTOR_MANAGEMENT_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.realestate_investors_histories_retrieve}
                          />
                        ),
                        permission: 'investor.histories',
                      },
                      {
                        path: APP_PATH.INVESTOR_MANAGEMENT_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.realestate_investors_history_retrieve}
                          />
                        ),
                        permission: 'investor.history_detail',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.EXCHANGE_MANAGEMENT,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <ExchangeManagementPage type="f2" />,
                        permission: 'exchange.list',
                      },
                      {
                        path: APP_PATH.EXCHANGE_MANAGEMENT_CREATE,
                        element: <ExchangeManagementCreatePage type="f2" />,
                        permission: 'exchange.create',
                      },
                      {
                        path: APP_PATH.EXCHANGE_MANAGEMENT_DETAIL,
                        element: <ExchangeManagementDetailPage type="f2" />,
                        permission: 'exchange.retrieve',
                      },
                      {
                        path: APP_PATH.EXCHANGE_MANAGEMENT_EDIT,
                        element: <ExchangeManagementEditPage type="f2" />,
                        permission: 'exchange.update',
                      },
                      {
                        path: APP_PATH.EXCHANGE_MANAGEMENT_HISTORY,
                        element: <ExchangeManagementHistoryPage type="f2" />,
                        permission: 'exchange.histories',
                      },
                      {
                        path: APP_PATH.EXCHANGE_MANAGEMENT_HISTORY_DETAIL,
                        element: <ExchangeManagementHistoryDetailPage type="f2" />,
                        permission: 'exchange.history_detail',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.SOURCE_EXCHANGE_MANAGEMENT,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <ExchangeManagementPage type="f0" />,
                        permission: 'exchange.list',
                      },
                      {
                        path: APP_PATH.SOURCE_EXCHANGE_MANAGEMENT_CREATE,
                        element: <ExchangeManagementCreatePage type="f0" />,
                        permission: 'exchange.create',
                      },
                      {
                        path: APP_PATH.SOURCE_EXCHANGE_MANAGEMENT_DETAIL,
                        element: <ExchangeManagementDetailPage type="f0" />,
                        permission: 'exchange.retrieve',
                      },
                      {
                        path: APP_PATH.SOURCE_EXCHANGE_MANAGEMENT_EDIT,
                        element: <ExchangeManagementEditPage type="f0" />,
                        permission: 'exchange.update',
                      },
                      {
                        path: APP_PATH.SOURCE_EXCHANGE_MANAGEMENT_HISTORY,
                        element: <ExchangeManagementHistoryPage type="f0" />,
                        permission: 'exchange.histories',
                      },
                      {
                        path: APP_PATH.SOURCE_EXCHANGE_MANAGEMENT_HISTORY_DETAIL,
                        element: <ExchangeManagementHistoryDetailPage type="f0" />,
                        permission: 'exchange.history_detail',
                      },
                    ],
                  },
                ],
              },
              // ---------- Sub-group "Hợp đồng & giao dịch" ----------
              {
                path: APP_PATH.SALES_CONTRACTS_TRANSACTIONS,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <IndexRedirect redirectTo={APP_PATH.DEAL} />,
                  },
                  {
                    path: APP_PATH.CUSTOMER_MANAGER,
                    element: <Outlet />,
                    children: [
                      { index: true, element: <CustomerPage />, permission: 'customer.list' },
                      {
                        path: APP_PATH.CUSTOMER_MANAGER_CREATE,
                        element: <CustomerCreatePage />,
                        permission: 'customer.create',
                      },
                      {
                        path: APP_PATH.CUSTOMER_MANAGER_DETAIL,
                        element: <CustomerDetailPage />,
                        permission: 'customer.retrieve',
                      },
                      {
                        path: APP_PATH.CUSTOMER_MANAGER_EDIT,
                        element: <CustomerEditPage />,
                        permission: 'customer.update',
                      },
                      {
                        path: APP_PATH.CUSTOMER_MANAGER_HISTORY,
                        element: (
                          <BaseHistoriesPage path={ApiPaths.sales_customers_histories_retrieve} />
                        ),
                        permission: 'customer.histories',
                      },
                      {
                        path: APP_PATH.CUSTOMER_MANAGER_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage path={ApiPaths.sales_customers_history_retrieve} />
                        ),
                        permission: 'customer.history_detail',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.PROJECT_REFUND_BOOKING,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <RefundBookingListPage />,
                        permission: 'booking_refund.list',
                      },
                      {
                        path: APP_PATH.PROJECT_REFUND_BOOKING_CREATE,
                        element: <RefundBookingCreatePage />,
                        permission: 'booking_refund.create',
                      },
                      {
                        path: APP_PATH.PROJECT_REFUND_BOOKING_DETAIL,
                        element: <RefundBookingDetailPage />,
                        permission: 'booking_refund.retrieve',
                      },
                      {
                        path: APP_PATH.PROJECT_REFUND_BOOKING_EDIT,
                        element: <RefundBookingEditPage />,
                        permission: 'booking_refund.update',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.PROJECT_BOOKING_CONTRACT,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <BookingContractListPage />,
                        permission: 'booking.list',
                      },
                      {
                        path: APP_PATH.PROJECT_BOOKING_CONTRACT_CREATE,
                        element: <BookingContractCreatePage />,
                        permission: 'booking.create',
                      },
                      {
                        path: APP_PATH.PROJECT_BOOKING_CONTRACT_DETAIL,
                        element: <BookingContractDetailPage />,
                        permission: 'booking.retrieve',
                      },
                      {
                        path: APP_PATH.PROJECT_BOOKING_CONTRACT_EDIT,
                        element: <BookingContractEditPage />,
                        permission: 'booking.update',
                      },
                      {
                        path: APP_PATH.PROJECT_BOOKING_CONTRACT_REFUND,
                        element: <BookingContractRefundPage />,
                        permission: 'booking_refund.create',
                      },
                      {
                        path: APP_PATH.PROJECT_BOOKING_CONTRACT_HISTORY,
                        element: <BookingContractHistoryPage />,
                        permission: 'booking.histories',
                      },
                      {
                        path: APP_PATH.PROJECT_BOOKING_CONTRACT_HISTORY_DETAIL,
                        element: <BookingContractHistoryDetailPage />,
                        permission: 'booking.history_detail',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.TRANSACTION_SHEET,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <TransactionSheetListPage />,
                        permission: 'transaction_sheet.list',
                      },
                      {
                        path: APP_PATH.TRANSACTION_SHEET_CREATE,
                        element: <TransactionSheetCreatePage />,
                        permission: 'transaction_sheet.create',
                      },
                      {
                        path: APP_PATH.TRANSACTION_SHEET_DETAIL,
                        element: <TransactionSheetDetailPage />,
                        permission: 'transaction_sheet.retrieve',
                      },
                      {
                        path: APP_PATH.TRANSACTION_SHEET_EDIT,
                        element: <TransactionSheetEditPage />,
                        permission: 'transaction_sheet.update',
                      },
                      {
                        path: APP_PATH.TRANSACTION_SHEET_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.sales_transaction_sheets_histories_retrieve}
                          />
                        ),
                        permission: 'transaction_sheet.histories',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.DEAL,
                    element: <Outlet />,
                    children: [
                      { index: true, element: <DealListPage />, permission: 'deal.list' },
                      {
                        path: APP_PATH.DEAL_DETAIL,
                        element: <DealDetailPage />,
                        permission: 'deal.retrieve',
                      },
                      {
                        path: APP_PATH.DEAL_HISTORY,
                        element: <DealHistoryPage />,
                        permission: 'deal.retrieve',
                      },
                      {
                        path: APP_PATH.DEAL_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage path="/api/sales/deals/{id}/history/{log_id}/" />
                        ),
                        permission: 'deal.retrieve',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.DEPOSIT_CONTRACT,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <DepositContractsPage />,
                        permission: 'deposit_contract.list',
                      },
                      {
                        path: APP_PATH.DEPOSIT_CONTRACT_CREATE,
                        element: <DepositContractCreatePage />,
                        permission: 'deposit_contract.create',
                      },
                      {
                        path: APP_PATH.DEPOSIT_CONTRACT_DETAIL,
                        element: <DepositContractDetailPage />,
                        permission: 'deposit_contract.retrieve',
                      },
                      {
                        path: APP_PATH.DEPOSIT_CONTRACT_EDIT,
                        element: <DepositContractEditPage />,
                        permission: 'deposit_contract.update',
                      },
                      {
                        path: APP_PATH.DEPOSIT_CONTRACT_HISTORY,
                        element: <DepositContractHistoryPage />,
                        permission: 'deposit_contract.histories',
                      },
                      {
                        path: APP_PATH.DEPOSIT_CONTRACT_HISTORY_DETAIL,
                        element: <DepositContractHistoryDetailPage />,
                        permission: 'deposit_contract.history_detail',
                      },
                    ],
                  },
                  {
                    // Đối chiếu chủ đầu tư — chỉ còn bộ trang 2.0, đứng trên path chuẩn (không còn
                    // hậu tố -v2). Bản 1.0 đã ngừng định tuyến; nhóm quyền giữ nguyên
                    // investor_reconciliation_sheet.* (xem docs/ai/domain/accounting-reconciliation.md).
                    path: APP_PATH.INVESTOR_RECONCILIATION,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <InvestorReconciliationListPageV2 />,
                        permission: 'investor_reconciliation_sheet.list',
                      },
                      {
                        path: APP_PATH.INVESTOR_RECONCILIATION_CREATE,
                        element: <InvestorReconciliationCreatePageV2 />,
                        permission: 'investor_reconciliation_sheet.create',
                      },
                      {
                        path: APP_PATH.INVESTOR_RECONCILIATION_DETAIL,
                        element: <InvestorReconciliationDetailPageV2 />,
                        permission: 'investor_reconciliation_sheet.retrieve',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.F2_RECONCILIATION,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <F2ReconciliationListPage />,
                        permission: 'f2_reconciliation_sheet.list',
                      },
                      {
                        path: APP_PATH.F2_RECONCILIATION_DETAIL,
                        element: <F2ReconciliationDetailPage />,
                        permission: 'f2_reconciliation_sheet.retrieve',
                      },
                      {
                        path: APP_PATH.F2_RECONCILIATION_EDIT,
                        element: <F2ReconciliationEditPage />,
                        permission: 'f2_reconciliation_sheet.update',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.CTV_RECONCILIATION,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <CTVReconciliationListPage />,
                        permission: 'ctv_reconciliation.list',
                      },
                      {
                        path: APP_PATH.CTV_RECONCILIATION_DETAIL,
                        element: <CTVReconciliationDetailPage />,
                        permission: 'ctv_reconciliation.retrieve',
                      },
                      {
                        path: APP_PATH.CTV_RECONCILIATION_EDIT,
                        element: <CTVReconciliationEditPage />,
                        permission: 'ctv_reconciliation_sheet.update',
                      },
                    ],
                  },
                  {
                    path: APP_PATH.FEE_SUPPORT_PROPOSAL,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <FeeSupportRequestListPage />,
                        permission: 'fee_support.list',
                      },
                      {
                        path: APP_PATH.FEE_SUPPORT_PROPOSAL_CREATE,
                        element: <FeeSupportRequestCreatePage />,
                        permission: 'fee_support.create',
                      },
                      {
                        path: APP_PATH.FEE_SUPPORT_PROPOSAL_DETAIL,
                        element: <FeeSupportRequestDetailPage />,
                        permission: 'fee_support.retrieve',
                      },
                    ],
                  },
                ],
              },
              // ---------- Sub-group "Báo cáo" ----------
              {
                path: APP_PATH.PROJECT_ADMIN_REPORT,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <IndexRedirect redirectTo={APP_PATH.REPORT_SALES_OVERVIEW} />,
                  },
                  {
                    path: APP_PATH.REPORT_SALES_OVERVIEW,
                    element: <ReportSalesOverviewPage />,
                    permission: 'sales.admindashboard.revenue_trend',
                  },
                  {
                    path: APP_PATH.REPORT_SALES_BY_DIVISION,
                    element: <ReportSalesByDivisionPage />,
                    permission: 'reports.tkkdrevenuegoodsblock.get',
                  },
                  {
                    path: APP_PATH.REPORT_SALES_BY_DIVISION_DETAIL,
                    element: <ReportSalesByDivisionDetailPage />,
                    permission: 'reports.tkkdrevenuegoodsblock.get',
                  },
                  {
                    path: APP_PATH.REPORT_SALES_BY_BRANCH,
                    element: <ReportSalesByBranchPage />,
                    permission: 'reports.tkkdrevenuegoodsbranch.get',
                  },
                  {
                    path: APP_PATH.REPORT_SALES_BY_BRANCH_DETAIL,
                    element: <ReportSalesByBranchDetailPage />,
                    permission: 'reports.tkkdrevenuegoodsbranch.get',
                  },
                  {
                    path: APP_PATH.REPORT_SALES_BY_DEPARTMENT,
                    element: <ReportSalesByDepartmentPage />,
                    permission: 'reports.tkkdrevenuegoodsdept.get',
                  },
                  {
                    path: APP_PATH.REPORT_SALES_BY_DEPARTMENT_DETAIL,
                    element: <ReportSalesByDepartmentDetailPage />,
                    permission: 'reports.tkkdrevenuegoodsdept.get',
                  },
                  {
                    path: APP_PATH.REPORT_SALES_BY_PROJECT,
                    element: <ReportSalesByProjectPage />,
                    permission: 'reports.tkkdrevenuegoodsproject.get',
                  },
                  {
                    path: APP_PATH.REPORT_SALES_BY_PROJECT_DETAIL,
                    element: <ReportSalesByProjectDetailPage />,
                    permission: 'reports.tkkdrevenuegoodsproject.get',
                  },
                  {
                    path: APP_PATH.REPORT_SALES_MATRIX,
                    element: <ReportSalesMatrixPage />,
                  },
                  {
                    path: APP_PATH.REPORT_SALES_CUSTOMER_CASH_FLOW,
                    element: <CustomerCashFlowPage />,
                    permission: 'reports.customercashflow.get',
                  },
                  {
                    path: APP_PATH.REPORT_SALES_CUSTOMER_CASH_DETAIL,
                    element: <CustomerCashDetailPage />,
                    permission: 'reports.customercashdetail.get',
                  },
                  {
                    path: APP_PATH.REPORT_SALES_DEPOSIT_CUMULATIVE_BY_BRANCH,
                    element: <DepositCumulativeByBranchPage />,
                    permission: 'reports.tkkddepositcumulativebranch.get',
                  },
                  {
                    path: APP_PATH.REPORT_SALES_DEPOSIT_CUMULATIVE_BY_BLOCK,
                    element: <DepositCumulativeByBlockPage />,
                    permission: 'reports.tkkddepositcumulativeblock.get',
                  },
                ],
              },
            ],
          },

          // ===================== Elibrary Module — base Outlet cha-con =====================
          {
            path: APP_PATH.ELIBRARY,
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <IndexRedirect redirectTo={APP_PATH.ELIBRARY_MY_DOCUMENTS} />,
              },
              {
                path: APP_PATH.ELIBRARY_CATEGORY,
                element: <Outlet />,
                children: [
                  { index: true, element: <CategoryPage />, permission: 'elibrary_category.list' },
                  {
                    path: APP_PATH.ELIBRARY_CATEGORY_CREATE,
                    element: <CategoryCreatePage />,
                    permission: 'elibrary_category.create',
                  },
                  {
                    path: APP_PATH.ELIBRARY_CATEGORY_EDIT,
                    element: <CategoryEditPage />,
                    permission: 'elibrary_category.update',
                  },
                  {
                    path: APP_PATH.ELIBRARY_CATEGORY_DETAIL,
                    element: <CategoryDetailPage />,
                    permission: 'elibrary_category.retrieve',
                  },
                ],
              },
              {
                path: APP_PATH.ELIBRARY_MY_DOCUMENTS,
                element: <PersonalDocumentsPage />,
                permission: 'elibrary_item.my_documents',
              },
              {
                path: APP_PATH.ELIBRARY_DEPARTMENT_DOCUMENTS,
                element: <DepartmentDocumentsPage />,
                permission: 'elibrary_item.department_documents',
              },
              {
                path: APP_PATH.ELIBRARY_COMPANY_DOCUMENTS,
                element: <CompanyDocumentsPage />,
                permission: 'elibrary_item.list',
              },
              {
                path: APP_PATH.ELIBRARY_SHARED_WITH_ME_DOCUMENTS,
                element: <SharedWithMeDocumentsPage />,
                permission: 'elibrary_item.shared_with_me',
              },
              {
                path: APP_PATH.ELIBRARY_ACCESS_REQUESTS,
                element: <AccessRequestsPage />,
                permission: 'elibrary_access_request.list',
              },
              {
                path: APP_PATH.ELIBRARY_ITEM_ACCESS_REQUESTS,
                element: <AccessRequestsPage />,
                permission: 'elibrary_access_request.list',
              },
            ],
          },

          // Accounting Module
          {
            path: APP_PATH.ACCOUNTING,
            element: <Outlet />,
            children: [
              {
                index: true,
                element: <IndexRedirect redirectTo={APP_PATH.COLLABORATOR_MANAGEMENT} />,
              },

              {
                path: APP_PATH.ACCOUNTING_CONFIG,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: (
                      <IndexRedirect redirectTo={APP_PATH.COMPANY_BANK_ACCOUNT_MANAGEMENT} />
                    ),
                  },

                  // Accounting — Cấu hình: Company Bank Account (20.3)
                  {
                    path: APP_PATH.COMPANY_BANK_ACCOUNT_MANAGEMENT,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <BankAccountPage />,
                        permission: 'companybankaccount.list',
                      },

                      {
                        path: APP_PATH.COMPANY_BANK_ACCOUNT_CREATE,
                        element: <BankAccountCreatePage />,
                        permission: 'companybankaccount.create',
                      },
                      {
                        path: APP_PATH.COMPANY_BANK_ACCOUNT_DETAIL,
                        element: <BankAccountDetailPage />,
                        permission: 'companybankaccount.retrieve',
                      },
                      {
                        path: APP_PATH.COMPANY_BANK_ACCOUNT_EDIT,
                        element: <BankAccountEditPage />,
                        permission: 'companybankaccount.update',
                      },
                      {
                        path: APP_PATH.COMPANY_BANK_ACCOUNT_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.accounting_bank_accounts_histories_retrieve}
                          />
                        ),
                        permission: 'companybankaccount.histories',
                      },
                      {
                        path: APP_PATH.COMPANY_BANK_ACCOUNT_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.accounting_bank_accounts_history_retrieve}
                          />
                        ),
                        permission: 'companybankaccount.history_detail',
                      },
                    ],
                  },

                  // Accounting — Accounting Period
                  {
                    path: APP_PATH.ACCOUNTING_PERIOD_MANAGEMENT,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <AccountingPeriodPage />,
                        permission: 'accountingperiod.list',
                      },
                      {
                        path: APP_PATH.ACCOUNTING_PERIOD_CREATE,
                        element: <AccountingPeriodCreatePage />,
                        permission: 'accountingperiod.create',
                      },
                      {
                        path: APP_PATH.ACCOUNTING_PERIOD_DETAIL,
                        element: <AccountingPeriodDetailPage />,
                        permission: 'accountingperiod.retrieve',
                      },
                      {
                        path: APP_PATH.ACCOUNTING_PERIOD_EDIT,
                        element: <AccountingPeriodEditPage />,
                        permission: 'accountingperiod.update',
                      },
                      {
                        path: APP_PATH.ACCOUNTING_PERIOD_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.accounting_accounting_periods_histories_retrieve}
                          />
                        ),
                        permission: 'accountingperiod.histories',
                      },
                      {
                        path: APP_PATH.ACCOUNTING_PERIOD_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.accounting_accounting_periods_history_retrieve}
                          />
                        ),
                        permission: 'accountingperiod.history_detail',
                      },
                    ],
                  },

                  {
                    path: APP_PATH.SUPPORT_DEPT_COMMISSION_RATE,
                    element: <SupportDeptCommissionRateListPage />,
                    permission: 'supportdeptcommissionrateconfig.list',
                  },

                  {
                    path: APP_PATH.KPI_COMMISSION_RULE,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <KpiCommissionRuleListPage />,
                        permission: 'kpicommissionstructure.list',
                      },

                      {
                        path: APP_PATH.KPI_COMMISSION_RULE_CREATE,
                        element: <KpiCommissionRuleCreatePage />,
                        permission: 'kpicommissionstructure.create',
                      },
                      {
                        path: APP_PATH.KPI_COMMISSION_RULE_DETAIL,
                        element: <KpiCommissionRuleDetailPage />,
                        permission: 'kpicommissionstructure.retrieve',
                      },
                      {
                        path: APP_PATH.KPI_COMMISSION_RULE_EDIT,
                        element: <KpiCommissionRuleEditPage />,
                        permission: 'kpicommissionstructure.update',
                      },
                    ],
                  },

                  {
                    path: APP_PATH.COMM_SLK_DEPT,
                    element: <CommSLKDeptPage />,
                    permission: 'linkedexchangetarget.list',
                  },
                ],
              },

              {
                path: APP_PATH.ACCOUNTING_COLLABORATOR,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <IndexRedirect redirectTo={APP_PATH.COLLABORATOR_MANAGEMENT} />,
                  },

                  // Accounting — Collaborator (20.1)
                  {
                    path: APP_PATH.COLLABORATOR_MANAGEMENT,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <CollaboratorPage />,
                        permission: 'collaborator.list',
                      },

                      {
                        path: APP_PATH.COLLABORATOR_CREATE,
                        element: <CollaboratorCreatePage />,
                        permission: 'collaborator.create',
                      },
                      {
                        path: APP_PATH.COLLABORATOR_DETAIL,
                        element: <CollaboratorDetailPage />,
                        permission: 'collaborator.retrieve',
                      },
                      {
                        path: APP_PATH.COLLABORATOR_EDIT,
                        element: <CollaboratorEditPage />,
                        permission: 'collaborator.update',
                      },
                      {
                        path: APP_PATH.COLLABORATOR_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.sales_collaborators_histories_retrieve}
                          />
                        ),
                        permission: 'collaborator.histories',
                      },
                      {
                        path: APP_PATH.COLLABORATOR_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.sales_collaborators_history_retrieve}
                          />
                        ),
                        permission: 'collaborator.history_detail',
                      },
                    ],
                  },

                  // Accounting — Collaborator Contract (20.2) — supports contract creation splits dialog
                  {
                    path: APP_PATH.COLLABORATOR_CONTRACT_MANAGEMENT,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <CollaboratorContractPage />,
                        permission: 'collaborator_contract.list',
                      },
                      {
                        path: APP_PATH.COLLABORATOR_CONTRACT_DETAIL,
                        element: <CollaboratorContractDetailPage />,
                        permission: 'collaborator_contract.retrieve',
                      },
                      {
                        path: APP_PATH.COLLABORATOR_CONTRACT_EDIT,
                        element: <CollaboratorContractEditPage />,
                        permission: 'collaborator_contract.update',
                      },
                      {
                        path: APP_PATH.COLLABORATOR_CONTRACT_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.sales_collaborator_contracts_histories_retrieve}
                          />
                        ),
                        permission: 'collaborator_contract.histories',
                      },
                      {
                        path: APP_PATH.COLLABORATOR_CONTRACT_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.sales_collaborator_contracts_history_retrieve}
                          />
                        ),
                        permission: 'collaborator_contract.history_detail',
                      },
                    ],
                  },
                ],
              },

              // Accounting — Broker Certificate (CTV)
              {
                path: APP_PATH.BROKER_CERTIFICATE_MANAGEMENT,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <BrokerCertificatePage />,
                    permission: 'brokercertificate.list',
                  },
                  {
                    path: APP_PATH.BROKER_CERTIFICATE_CREATE,
                    element: <BrokerCertificateCreatePage />,
                    permission: 'brokercertificate.create',
                  },
                  {
                    path: APP_PATH.BROKER_CERTIFICATE_DETAIL,
                    element: <BrokerCertificateDetailPage />,
                    permission: 'brokercertificate.retrieve',
                  },
                  {
                    path: APP_PATH.BROKER_CERTIFICATE_EDIT,
                    element: <BrokerCertificateEditPage />,
                    permission: 'brokercertificate.update',
                  },
                ],
              },

              {
                path: APP_PATH.ACCOUNTING_TRANSACTION,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <IndexRedirect redirectTo={APP_PATH.SALES_INVOICE} />,
                  },

                  {
                    path: APP_PATH.SALES_INVOICE,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <SalesInvoiceListPage />,
                        permission: 'salesinvoice.list',
                      },
                      {
                        path: APP_PATH.SALES_INVOICE_CREATE,
                        element: <SalesInvoiceCreatePage />,
                        permission: 'salesinvoice.create',
                      },
                      {
                        path: APP_PATH.SALES_INVOICE_DETAIL,
                        element: <SalesInvoiceDetailPage />,
                        permission: 'salesinvoice.retrieve',
                      },
                      {
                        path: APP_PATH.SALES_INVOICE_EDIT,
                        element: <SalesInvoiceEditPage />,
                        permission: 'salesinvoice.update',
                      },
                      {
                        path: APP_PATH.SALES_INVOICE_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.accounting_sales_invoices_histories_retrieve}
                          />
                        ),
                        permission: 'salesinvoice.histories',
                      },
                      {
                        path: APP_PATH.SALES_INVOICE_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.accounting_sales_invoices_history_retrieve}
                          />
                        ),
                        permission: 'salesinvoice.history_detail',
                      },
                    ],
                  },

                  {
                    path: APP_PATH.INPUT_INVOICE,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <InputInvoiceListPage />,
                        permission: 'inputinvoice.list',
                      },
                      {
                        path: APP_PATH.INPUT_INVOICE_CREATE,
                        element: <InputInvoiceCreatePage />,
                        permission: 'inputinvoice.create',
                      },
                      {
                        path: APP_PATH.INPUT_INVOICE_DETAIL,
                        element: <InputInvoiceDetailPage />,
                        permission: 'inputinvoice.retrieve',
                      },
                      {
                        path: APP_PATH.INPUT_INVOICE_EDIT,
                        element: <InputInvoiceEditPage />,
                        permission: 'inputinvoice.update',
                      },
                      {
                        path: APP_PATH.INPUT_INVOICE_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.accounting_input_invoices_histories_retrieve}
                          />
                        ),
                        permission: 'inputinvoice.histories',
                      },
                      {
                        path: APP_PATH.INPUT_INVOICE_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.accounting_input_invoices_history_retrieve}
                          />
                        ),
                        permission: 'inputinvoice.history_detail',
                      },
                    ],
                  },

                  {
                    path: APP_PATH.RECEIPT_VOUCHER,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <ReceiptVoucherListPage />,
                        permission: 'receiptvoucher.list',
                      },
                      {
                        path: APP_PATH.RECEIPT_VOUCHER_CREATE,
                        element: <ReceiptVoucherCreatePage />,
                        permission: 'receiptvoucher.create',
                      },
                      {
                        path: APP_PATH.RECEIPT_VOUCHER_DETAIL,
                        element: <ReceiptVoucherDetailPage />,
                        permission: 'receiptvoucher.retrieve',
                      },
                      {
                        path: APP_PATH.RECEIPT_VOUCHER_EDIT,
                        element: <ReceiptVoucherEditPage />,
                        permission: 'receiptvoucher.update',
                      },
                    ],
                  },

                  // Accounting — Payment Voucher (20.5)
                  {
                    path: APP_PATH.PAYMENT_VOUCHER_MANAGEMENT,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <PaymentVoucherPage />,
                        permission: 'paymentvoucher.list',
                      },
                      {
                        path: APP_PATH.PAYMENT_VOUCHER_CREATE,
                        element: <PaymentVoucherCreatePage />,
                        permission: 'paymentvoucher.create',
                      },
                      {
                        path: APP_PATH.PAYMENT_VOUCHER_DETAIL,
                        element: <PaymentVoucherDetailPage />,
                        permission: 'paymentvoucher.retrieve',
                      },
                      {
                        path: APP_PATH.PAYMENT_VOUCHER_EDIT,
                        element: <PaymentVoucherEditPage />,
                        permission: 'paymentvoucher.update',
                      },
                      {
                        path: APP_PATH.PAYMENT_VOUCHER_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.accounting_payment_vouchers_histories_retrieve}
                          />
                        ),
                        permission: 'paymentvoucher.histories',
                      },
                      {
                        path: APP_PATH.PAYMENT_VOUCHER_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.accounting_payment_vouchers_history_retrieve}
                          />
                        ),
                        permission: 'paymentvoucher.history_detail',
                      },
                    ],
                  },

                  {
                    path: APP_PATH.DEAL_PERIOD_ALLOCATION,
                    element: <Outlet />,
                    children: [
                      // Gated on `admin_preview`, NOT `list`/`retrieve`: those two are shared with
                      // "Chia HH theo tháng" (split-sheets), so granting them to open this screen
                      // would silently expose that one too.
                      {
                        index: true,
                        element: <DealPeriodAllocationListPage />,
                        permission: 'dealperiodworksheet.admin_preview',
                      },
                      {
                        path: APP_PATH.DEAL_PERIOD_ALLOCATION_DETAIL,
                        element: <DealPeriodAllocationDetailPage />,
                        permission: 'dealperiodworksheet.admin_preview',
                      },
                      {
                        path: APP_PATH.DEAL_PERIOD_ALLOCATION_HISTORY,
                        element: (
                          <BaseHistoriesPage
                            path={ApiPaths.accounting_deal_period_allocations_histories_retrieve}
                          />
                        ),
                        permission: 'dealperiodallocation.histories',
                      },
                      {
                        path: APP_PATH.DEAL_PERIOD_ALLOCATION_HISTORY_DETAIL,
                        element: (
                          <BaseHistoryDetailPage
                            path={ApiPaths.accounting_deal_period_allocations_history_retrieve}
                          />
                        ),
                        permission: 'dealperiodallocation.history_detail',
                      },
                    ],
                  },
                ],
              },

              {
                path: APP_PATH.ACCOUNTING_COMMISSION_SALE,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <IndexRedirect redirectTo={APP_PATH.MONTHLY_COMMISSION_SPLIT_SHEET} />,
                  },

                  {
                    path: APP_PATH.MONTHLY_COMMISSION_SPLIT_SHEET,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <CommissionSplitListPage />,
                        permission: 'dealperiodworksheet.list',
                      },
                      {
                        path: APP_PATH.MONTHLY_COMMISSION_SPLIT_SHEET_DETAIL,
                        element: <CommissionSplitDetailPage />,
                        permission: 'dealperiodworksheet.retrieve',
                      },
                    ],
                  },

                  {
                    path: APP_PATH.COMMISSION_SALE_MONTHLY,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <CommSaleMonthlyPage />,
                        permission: 'salesmonthlycommissionsummary.list',
                      },
                      {
                        path: APP_PATH.COMMISSION_SALE_MONTHLY_DETAIL,
                        element: <CommSaleMonthlyDetailPage />,
                        permission: 'salesmonthlycommissionsummary.retrieve',
                      },
                    ],
                  },

                  {
                    path: APP_PATH.COMMISSION_F2_MONTHLY,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <CommF2MonthlyPage />,
                        permission: 'f2monthlycommissionsummary.list',
                      },
                      {
                        path: APP_PATH.COMMISSION_F2_MONTHLY_DETAIL,
                        element: <CommF2MonthlyDetailPage />,
                        permission: 'f2monthlycommissionsummary.retrieve',
                      },
                    ],
                  },

                  {
                    path: APP_PATH.COMMISSION_CTV_MONTHLY,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <CommCtvMonthlyPage />,
                        permission: 'collaboratormonthlycommissionsummary.list',
                      },
                      {
                        path: APP_PATH.COMMISSION_CTV_MONTHLY_DETAIL,
                        element: <CommCtvMonthlyDetailPage />,
                        permission: 'collaboratormonthlycommissionsummary.retrieve',
                      },
                    ],
                  },

                  {
                    path: APP_PATH.COMMISSION_SLK_MONTHLY,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <CommSlkMonthlyPage />,
                        permission: 'linkedexchangemonthlycommission.list',
                      },
                      {
                        path: APP_PATH.COMMISSION_SLK_MONTHLY_DETAIL,
                        element: <CommSlkMonthlyDetailPage />,
                        permission: 'linkedexchangemonthlycommission.retrieve',
                      },
                      {
                        path: APP_PATH.COMMISSION_SLK_MONTHLY_POOL,
                        element: <CommSlkMonthlyPoolDetailPage />,
                        // Read access gates the page; editing the ratios is gated
                        // in-component (canEditSplits) + on the BE set-source-splits
                        // endpoint. Gating the route by set_source_splits would lock
                        // read-only viewers (linked/confirmed pools) out entirely.
                        permission: 'linkedexchangemonthlycommission.retrieve',
                      },
                    ],
                  },

                  {
                    path: APP_PATH.COMMISSION_HOLD,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <CommissionHoldPage />,
                        permission: 'commissionhold.list',
                      },
                      {
                        // Chi tiết đọc cùng endpoint `grouped` với list (không có endpoint
                        // retrieve theo group) nên gate bằng đúng quyền của list.
                        path: APP_PATH.COMMISSION_HOLD_DETAIL,
                        element: <CommissionHoldDetailPage />,
                        permission: 'commissionhold.list',
                      },
                    ],
                  },
                ],
              },

              {
                path: APP_PATH.ACCOUNTING_COMMISSION_MANAGEMENT,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: (
                      <IndexRedirect redirectTo={APP_PATH.PROMOTION_DISTRIBUTION_TRACKING} />
                    ),
                  },

                  {
                    path: APP_PATH.PROMOTION_DISTRIBUTION_TRACKING,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <PromotionDistributionListPage />,
                        permission: 'promotion_distribution.list',
                      },

                      {
                        path: APP_PATH.PROMOTION_DISTRIBUTION_TRACKING_DETAIL,
                        element: <PromotionDistributionDetailPage />,
                        permission: 'promotion_distribution.retrieve',
                      },
                    ],
                  },

                  {
                    path: APP_PATH.COMMISSION_MANAGER_MONTHLY,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <CommMgrMonthlyPage />,
                        permission: 'managementmonthlycommissionsummary.list',
                      },
                      {
                        path: APP_PATH.COMMISSION_MANAGER_DETAIL,
                        element: <CommMgrDetailPage />,
                        permission: 'managementmonthlycommissionsummary.retrieve',
                      },
                    ],
                  },

                  {
                    path: APP_PATH.DIRECTOR_COMMISSION_TRACKING,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <DirectorCommissionListPage />,
                        permission: 'project_director_commission.list',
                      },
                      {
                        path: APP_PATH.DIRECTOR_COMMISSION_TRACKING_DETAIL,
                        element: <DirectorCommissionDetailPage />,
                        permission: 'project_director_commission.retrieve',
                      },
                    ],
                  },

                  {
                    path: APP_PATH.COMM_EMPLOYEE_PAYROLL,
                    element: <CommEmployeePage />,
                    permission: 'employeemonthlycommissionsummary.list',
                  },

                  {
                    path: APP_PATH.COMMISSION_BY_REVENUE,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <CommissionByRevenuePage />,
                        // Hai màn này đọc `accounting_department_monthly_kpi_*`, KHÔNG đọc
                        // department-commission-pool — quyền phải khớp resource thật sự gọi.
                        permission: 'departmentmonthlykpi.list',
                      },
                      {
                        path: APP_PATH.COMMISSION_BY_REVENUE_DETAIL,
                        element: <CommissionByRevenueDetailPage />,
                        permission: 'departmentmonthlykpi.retrieve',
                      },
                    ],
                  },

                  {
                    path: APP_PATH.DEPARTMENT_MONTHLY_KPI,
                    element: <Outlet />,
                    children: [
                      {
                        index: true,
                        element: <DepartmentMonthlyKpiListPage />,
                        permission: 'departmentcommissionpool.list',
                      },
                      {
                        path: APP_PATH.DEPARTMENT_MONTHLY_KPI_DETAIL,
                        element: <DepartmentMonthlyKpiDetailPage />,
                        permission: 'departmentcommissionpool.retrieve',
                      },
                      {
                        path: APP_PATH.DEPARTMENT_MONTHLY_KPI_HISTORY,
                        element: <DepartmentMonthlyKpiHistoryPage />,
                        permission: 'departmentcommissionpool.retrieve',
                      },
                    ],
                  },
                ],
              },

              {
                path: APP_PATH.EMPLOYEE_PAYOUT_BATCH,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <EmployeePayoutBatchListPage />,
                    permission: 'employeepayoutbatch.list',
                  },
                  {
                    path: APP_PATH.EMPLOYEE_PAYOUT_BATCH_CREATE,
                    element: <EmployeePayoutBatchCreatePage />,
                    permission: 'employeepayoutbatch.create',
                  },
                  {
                    path: APP_PATH.EMPLOYEE_PAYOUT_BATCH_DETAIL,
                    element: <EmployeePayoutBatchDetailPage />,
                    permission: 'employeepayoutbatch.retrieve',
                  },
                ],
              },

              {
                path: APP_PATH.MONTHLY_COMMISSION_SUMMARY,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <MonthlySummaryListPage />,
                    permission: 'employeemonthlycommissionsummary.list',
                  },
                  {
                    path: APP_PATH.MONTHLY_COMMISSION_SUMMARY_DETAIL,
                    element: <MonthlySummaryDetailPage />,
                    permission: 'employeemonthlycommissionsummary.retrieve',
                  },
                ],
              },

              {
                path: APP_PATH.COMMISSION_ADVANCE,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <CommissionAdvanceListPage />,
                    permission: 'commissionadvance.list',
                  },
                  {
                    path: APP_PATH.COMMISSION_ADVANCE_CREATE,
                    element: <CommissionAdvanceCreatePage />,
                    permission: 'commissionadvance.create',
                  },
                  {
                    path: APP_PATH.COMMISSION_ADVANCE_DETAIL,
                    element: <CommissionAdvanceDetailPage />,
                    permission: 'commissionadvance.retrieve',
                  },
                  {
                    path: APP_PATH.COMMISSION_ADVANCE_EDIT,
                    element: <CommissionAdvanceEditPage />,
                    permission: 'commissionadvance.update',
                  },
                  {
                    path: APP_PATH.COMMISSION_ADVANCE_HISTORY,
                    element: (
                      <BaseHistoriesPage
                        path={ApiPaths.accounting_commission_advances_histories_retrieve}
                      />
                    ),
                    permission: 'commissionadvance.histories',
                  },
                  {
                    path: APP_PATH.COMMISSION_ADVANCE_HISTORY_DETAIL,
                    element: (
                      <BaseHistoryDetailPage
                        path={ApiPaths.accounting_commission_advances_history_retrieve}
                      />
                    ),
                    permission: 'commissionadvance.history_detail',
                  },
                ],
              },

              {
                path: APP_PATH.IMPORTED_BONUS_BATCH,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <ImportedBonusBatchListPage />,
                    permission: 'imported_bonus_batch.list',
                  },
                  {
                    path: APP_PATH.IMPORTED_BONUS_BATCH_DETAIL,
                    element: <ImportedBonusBatchDetailPage />,
                    permission: 'imported_bonus_batch.retrieve',
                  },
                ],
              },

              {
                path: APP_PATH.INVESTOR_ADVANCE,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <InvestorAdvanceListPage />,
                    permission: 'investor_advance_account.list',
                  },
                  {
                    path: APP_PATH.INVESTOR_ADVANCE_CREATE,
                    element: <InvestorAdvanceCreatePage />,
                    permission: 'investor_advance_account.create',
                  },
                  {
                    path: APP_PATH.INVESTOR_ADVANCE_DETAIL,
                    element: <InvestorAdvanceDetailPage />,
                    permission: 'investor_advance_account.retrieve',
                  },
                ],
              },

              {
                path: APP_PATH.REPORT_ACCOUNTING,
                element: <Outlet />,
                children: [
                  {
                    index: true,
                    element: <IndexRedirect redirectTo={APP_PATH.REPORT_ACCOUNTING_ADVANCE} />,
                  },

                  {
                    path: APP_PATH.REPORT_ACCOUNTING_ADVANCE,
                    element: <ReportAdvancePage />,
                    permission: 'reports.advancesettlement.get',
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_INCOME_BY_RECIPIENT,
                    element: <ReportCommissionByRecipientPage />,
                    permission: 'reports.incomebyrecipient.get',
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_INVESTOR_DEBT,
                    element: <ReportInvestorDebtPage />,
                    permission: 'reports.debt.get',
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_F2_DEBT,
                    element: <ReportF2DebtPage />,
                    permission: 'reports.f2debt.get',
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_COMMISSION_PAYMENT_F2,
                    element: <ReportCommissionPaymentF2Page />,
                    permission: 'reports.f2paymentlist.get',
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_PROJECT_RECEIVABLE,
                    element: <ReportProjectReceivablePage />,
                    permission: 'reports.projectreceivable.get',
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_PARTNER_DEBT,
                    element: <ReportPartnerDebtPage />,
                    permission: 'reports.partnerdebt.get',
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_INVESTOR_INVOICE_RECONCILIATION,
                    element: <ReportInvestorInvoiceReconciliationPage />,
                    permission: 'reports.investorinvoice.get',
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_MANAGEMENT_COMMISSION_SUMMARY,
                    element: <MgmtCommSummaryPage />,
                    permission: 'commissionpayroll.list',
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_INTERNAL_REPORT,
                    element: <InternalReportPage />,
                    permission: 'reports.totalreceivables.get',
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_BRANCH_F2_REPORT,
                    element: <BranchF2ReportPage />,
                    permission: ['reports.partnerdebt.get', 'reports.f2debt.get'],
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_ANNUAL_TAX_INCOME,
                    element: <AnnualTaxIncomeReportPage />,
                    permission: 'reports.beneficiarycommission.get',
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_SALES_COMMISSION_PAYOUT,
                    element: <SalesCommPayoutsReportPage />,
                    permission: 'reports.salescommissionpayout.get',
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_PROJECT_MONEY_IN,
                    element: <ProjectMoneyInReportPage />,
                    permission: 'reports.projectmoneyin.get',
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_REVENUE_BY_BRANCH,
                    element: <RevenueByBranchReportPage />,
                    permission: 'reports.revenuebybranch.get',
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_UNITS_NOT_FULLY_PAID,
                    element: <UnitsNotFullyPaidReportPage />,
                    permission: 'reports.unitsnotfullypaid.get',
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_INCOME_BY_SALESPERSON,
                    element: <IncomeBySalespersonReportPage />,
                    permission: 'reports.incomebysalesperson.get',
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_HHQL_BY_PROJECT,
                    element: <HhqlByProjectReportPage />,
                    permission: 'reports.hhqlbyproject.get',
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_PROJECT_SUMMARY,
                    element: <ProjectSummaryReportPage />,
                    permission: 'reports.projectsummary.get',
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_LEGAL_ENTITY_COMMISSION_DEBT,
                    element: <LegalEntityCommissionDebtPage />,
                    permission: 'reports.legalentitycommissiondebt.get',
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_LEGAL_ENTITY_INVOICE_DEBT,
                    element: <LegalEntityInvoiceDebtPage />,
                    permission: 'reports.legalentityinvoicedebt.get',
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_COMMISSION_PAYABLE_REPORT,
                    element: <CommissionPayableReportPage />,
                    permission: 'reports.commissionpayable.get',
                  },
                  {
                    path: APP_PATH.REPORT_ACCOUNTING_LAD_DEBT,
                    element: <LadDebtReportPage />,
                    permission: 'reports.laddebt.get',
                  },
                  {
                    path: APP_PATH.REPORT_COMMISSION_PAYMENT_F2,
                    element: <ReportCommissionPaymentF2Page />,
                    permission: 'reports.f2paymentlist.get',
                  },
                ],
              },
            ],
          },

          // CHAT
          {
            path: APP_PATH.CHAT,
            element: <Outlet />,
            children: [
              {
                index: true,
                element: (
                  <Suspense fallback={<PageLoading />}>
                    <ChatPage />
                  </Suspense>
                ),
              },
              {
                path: APP_PATH.CHAT_DETAIL,
                element: (
                  <Suspense fallback={<PageLoading />}>
                    <ChatPage />
                  </Suspense>
                ),
              },
              {
                path: APP_PATH.CHAT_GROUP_CHANNELS,
                element: <GroupChannelsPage />,
                permission: 'chat_channel.list',
              },
            ],
          },
        ],
      },

      // Catch-all route for 404 (any unmatched path)
      {
        path: APP_PATH.UNAUTHORIZED,
        element: <UnauthorizedPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])

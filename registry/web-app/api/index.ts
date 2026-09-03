// Export all API-related modules
export { apiClient } from './client'
export { queryClient } from './react-query-client'
export { BaseApiService } from './base-service'
export type { ApiResponse, PaginationParams, ApiError } from './base-service'
export type { paths, components, operations } from './schema.ts'

// Export service factory for DI
export { serviceFactory, ServiceFactory } from './service-factory'

// Export service classes (not instances to avoid early instantiation)
export { AuthService, getAuthService } from '@/services/auth-service'
export { NotificationService, getNotificationService } from '@/services/notification-service'
// HrmService has been split into feature-specific services
// Import from @/features/*/services/ instead
export { RoleService, getRoleService } from '@/services/role-service'
export { PermissionService, getPermissionService } from '@/services/permission-service'
export { ConstantsService, getConstantsService } from '@/services/constants-service'
export { AuditLogService, getAuditLogService } from '@/services/audit-log-service'

// Export hooks
export { useApiQuery, useApiMutation, useInvalidateQueries } from '@/hooks/useApiQuery'

// Auth hooks
export {
  useLogin,
  useVerifyOtp,
  useChangePassword,
  useForgotPassword,
  useForgotPasswordVerifyOtp,
  useForgotPasswordChangePassword,
  useRefreshToken,
  useVerifyToken,
} from '@/services/auth-service'

// Notification hooks
export {
  useNotifications,
  useMarkNotificationAsRead,
  useMarkAllNotificationsAsRead,
} from '@/services/notification-service'

// HRM hooks - Organization
export {
  useBranches,
  useBranch,
  useCreateBranch,
  useUpdateBranch,
  usePartialUpdateBranch,
  useDeleteBranch,
} from '@/features/org/services/branch-service'

export {
  useBlocks,
  useBlock,
  useCreateBlock,
  useUpdateBlock,
  usePartialUpdateBlock,
  useDeleteBlock,
} from '@/features/org/services/block-service'

export {
  useDepartments,
  useDepartment,
  useCreateDepartment,
  useUpdateDepartment,
  usePartialUpdateDepartment,
  useDeleteDepartment,
  useDepartmentFunctionChoices,
  useDepartmentManagementChoices,
  useDepartmentTree,
} from '@/features/org/services/department-service'

export {
  usePositions,
  usePosition,
  useCreatePosition,
  useUpdatePosition,
  usePartialUpdatePosition,
  useDeletePosition,
} from '@/features/org/services/position-service'

// HRM hooks - Contract
export {
  useContracts,
  useContract,
  useCreateContract,
  useUpdateContract,
  usePartialUpdateContract,
  useUpdateContractInsurance,
  useDeleteContract,
  usePublishContract,
} from '@/features/contract/services/contract-service'

export {
  useContractAppendices,
  useContractAppendix,
  useCreateContractAppendix,
  useUpdateContractAppendix,
  usePartialUpdateContractAppendix,
  useDeleteContractAppendix,
  usePublishContractAppendix,
  useStartContractAppendixImport,
  useContractAppendixImportTemplate,
  useExportContractAppendices,
} from '@/features/contract/services/contract-appendix-service'

// HRM hooks - Proposals (leave types)
export {
  useProposalsMaternityLeave,
  useProposalMaternityLeave,
  useProposalsPostMaternityBenefits,
  useProposalPostMaternityBenefits,
} from '@/features/decision-and-proposal/services/proposal-leave-service'

// HRM hooks - Proposals (misc types)
export {
  useProposalsAssetAllocation,
  useProposalAssetAllocation,
  useProposalsJobTransfer,
  useProposalJobTransfer,
  useProposalsLateExemption,
  useProposalLateExemption,
  useProposalsOvertimeWork,
  useProposalOvertimeWork,
} from '@/features/decision-and-proposal/services/proposal-misc-service'

// HRM hooks - Employees
export { useEmployees, useEmployeesDropdown } from '@/features/employee/services/employee-service'

export {
  useExportEmployeeRelationships,
  useStartEmployeeRelationshipsImport,
  useEmployeeRelationshipsImportTemplate,
} from '@/features/employee/services/employee-relationship-service'

// HRM hooks - Payroll
export {
  useSalesRevenueReports,
  useSalesRevenueReportsChart,
  useExportSalesRevenueReports,
} from '@/features/payroll/services/sales-revenue-service'

// Role hooks
export {
  useRoles,
  useRole,
  useCreateRole,
  useUpdateRole,
  usePartialUpdateRole,
  useDeleteRole,
  useCloneRole,
} from '@/services/role-service'

// Permission hooks
export { usePermissions, usePermission } from '@/services/permission-service'

// Constants hooks
export { useConstants } from '@/services/constants-service'

// Audit Log hooks
export { useAuditLogDetail, useAuditLogSearch } from '@/services/audit-log-service'

// Sales hooks - Customers, Bookings, Booking Refunds
export {
  useCustomers,
  useCustomer,
  useCreateCustomer,
  useUpdateCustomer,
  usePartialUpdateCustomer,
  useDeleteCustomer,
  useCustomerDropdown,
  useStartCustomerImport,
  useCustomerImportTemplate,
  useBookings,
  useBooking,
  useCreateBooking,
  useUpdateBooking,
  usePartialUpdateBooking,
  useDeleteBooking,
  useApproveBooking,
  useAdminLeadApproveBooking,
  useRejectBooking,
  useBookingDropdown,
  useBookingRefunds,
  useBookingRefund,
  useCreateBookingRefund,
  useUpdateBookingRefund,
  usePartialUpdateBookingRefund,
  useDeleteBookingRefund,
  useApproveBookingRefund,
  useRejectBookingRefund,
} from '@/services/sales-service'

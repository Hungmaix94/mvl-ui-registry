export * from './auth-service'
export * from './notification-service'
export * from './role-service'
export * from './permission-service'
export * from './constants-service'
// export * from './audit-log-service' // Commented out to avoid duplicate exports with hrm-service
export * from './province-service'
export * from './administrative-unit-service'
export * from './export-service'
export * from './file-service'
export * from './document-service'
export * from './user-service'
export * from './mail-service'
export * from './realestate-service'
export * from './sales-service'
export * from './elibrary-service'

// Re-export from feature services for backward compatibility
// Employee
export {
  // Types
  type Employee,
  type EmployeeRequest,
  type PatchedEmployeeRequest,
  type PaginatedEmployeeList,
  type EmployeeDropdown,
  type PaginatedEmployeeDropdownList,
  type EmployeeAvatarRequest,
  type GetEmployeesParams,
  type GetEmployeesDropdownParams,
  type GetEmployeesExportParams,
  // Service
  EmployeeService,
  getEmployeeService,
  // Hooks
  useEmployees,
  useEmployee,
  useEmployeesDropdown,
  useCreateEmployee,
  useUpdateEmployee,
  usePartialUpdateEmployee,
  useDeleteEmployee,
  useUpdateEmployeeAvatar,
  useExportEmployees,
  useEmployeeImportTemplate,
  useStartEmployeeImport,
} from '@/features/employee/services/employee-service'

export {
  // Types
  type EmployeeActiveActionRequest,
  type EmployeeMaternityLeaveActionRequest,
  type LinkCandidateRequest,
  type EmployeeResignedActionRequest,
  // Service
  EmployeeActionService,
  getEmployeeActionService,
  // Hooks
  useActiveEmployee,
  useMaternityLeaveEmployee,
  useLinkCandidateToEmployee,
  useResignedEmployee,
} from '@/features/employee/services/employee-action-service'

export {
  // Types
  type EmployeeWorkHistory,
  type EmployeeWorkHistoryRequest,
  type PatchedEmployeeWorkHistoryRequest,
  type PaginatedEmployeeWorkHistoryList,
  type GetEmployeeWorkHistoriesParams,
  // Service
  EmployeeWorkHistoryService,
  getEmployeeWorkHistoryService,
  // Hooks
  useEmployeeWorkHistories,
  useEmployeeWorkHistory,
  useUpdateEmployeeWorkHistory,
  useDeleteEmployeeWorkHistory,
} from '@/features/employee/services/employee-work-history-service'

export * from '@/features/employee/services/employee-role-service'

// Organization
export * from '@/features/org/services/branch-service'
export * from '@/features/org/services/block-service'
export * from '@/features/org/services/department-service'
export * from '@/features/org/services/position-service'

// Attendance
export * from '@/features/attendance/services/timesheet-service'
// Note: attendance-geolocation-service has duplicate useExportAttendanceGeolocations with export-service
// export * from '@/features/attendance/services/attendance-geolocation-service'

// Recruitment
export * from '@/features/recruitment/services/recruitment-candidate-service'
export * from '@/features/recruitment/services/job-description-service'
export * from '@/features/recruitment/services/interview-service'

// Proposals
export * from '@/features/decision-and-proposal/services/proposal-base-service'
export * from '@/features/decision-and-proposal/services/proposal-misc-service'

// Payroll
export * from '@/features/payroll/services/salary-period-service'
export * from '@/features/payroll/services/sales-revenue-service'

// Reports (excluding EmployeeResignedReasonSummary which is in employee-action-service)
export {
  // Types
  type HiredCandidateReportAggregated,
  type RecruitmentChannelReportAggregated,
  type RecruitmentCostReportAggregated,
  type RecruitmentSourceReportAggregated,
  type ReferralCostEmployee,
  type ReferralCostReportAggregated,
  type StaffGrowthReportAggregated,
  type EmployeeStatusBreakdownReportAggregated,
  type EmployeeSeniority,
  type EmployeeTypeConversionBranchItem,
  type PaginatedEmployeeTypeConversionBranchItemList,
  type GetHiredCandidateReportParams,
  type GetRecruitmentChannelReportParams,
  type GetRecruitmentCostReportParams,
  type GetRecruitmentSourceReportParams,
  type GetReferralCostReportParams,
  type GetStaffGrowthReportParams,
  type GetEmployeeResignedBreakdownReportParams,
  type GetEmployeeStatusBreakdownReportParams,
  type GetEmployeeResignedReasonSummaryReportParams,
  type GetEmployeeSeniorityReportParams,
  type GetEmployeeSeniorityReportExportParams,
  type GetEmployeeTypeConversionReportParams,
  type GetEmployeeTypeConversionReportExportParams,
  type EmployeeResignedReasonSummary,
  // Service
  HrmReportService,
  getHrmReportService,
  // Hooks
  useHiredCandidateReport,
  useRecruitmentChannelReport,
  useRecruitmentCostReport,
  useRecruitmentSourceReport,
  useReferralCostReport,
  useStaffGrowthReport,
  useEmployeeResignedBreakdownReport,
  useEmployeeStatusBreakdownReport,
  useEmployeeResignedReasonSummaryReport,
  useEmployeeSeniorityReport,
  useExportEmployeeSeniorityReport,
  useEmployeeTypeConversionReport,
  useExportEmployeeTypeConversionReport,
} from '@/features/report/services/hrm-report-service'

export * from '@/features/report/services/attendance-report-service'

// Dashboard
export * from '@/features/dashboard/services/dashboard-service'

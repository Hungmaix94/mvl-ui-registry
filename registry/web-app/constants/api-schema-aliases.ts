// Stable aliases for @/api/schema enums whose generated name shifts across `yarn api:generate`
// regens (openapi-typescript dedupes structurally-identical query-param shapes and names the
// type after whichever path currently wins). Import the alias below everywhere instead of the
// raw generated name — when a regen renames the export, fix the re-export here only.
export {
  PathsApiHrmProposalsTimesheetEntryComplaintGetParametersQueryExclude_proposal_type as ProposalType,
  PathsApiHrmProposalsTimesheetEntryComplaintGetParametersQueryProposal_status as ProposalStatus,
  PathsApiHrmProposalsTimesheetEntryComplaintGetParametersQueryVerifiers__status as ProposalVerifierStatus,
  PathsApiAccountingDirectorCommissionsExportGetParametersQueryDelivery as ExportDelivery,
  PathsApiSalesDepositContractsGetParametersQueryApproval_status as DepositContractApprovalStatus,
  // Bàn duyệt của luồng "Duyệt nhiều" (CR STT35). Tên sinh ra theo component + property
  // (`BulkApproveApproved.step`), nhưng `--dedupe-enums` vẫn có thể đổi tên nếu sau này
  // xuất hiện enum khác trùng đúng ba giá trị này — nên vẫn đi qua alias.
  BulkApproveApprovedStep as BulkApproveStepValue,
  PathsApiSalesTransactionSheetsExportGetParametersQueryApproval_status as TransactionSheetApprovalStatus,
  PathsApiPayrollPenaltyTicketsGetParametersQueryStatus as PenaltyTicketStatus,
  PathsApiRealestateProductInventoriesDropdownGetParametersQueryStatus__in as ProductStatus,
  // Regen 2026-07-27: canonical shifted from `PathsApiSalesDealsGetParametersQuery*`
  // sang biến thể `...DealsExport...` (openapi-typescript chọn path thắng khác đi).
  PathsApiSalesDealsExportGetParametersQueryStatus as DealStatus,
  // CR STT51 (86eymm0hq): deal khai doanh thu theo PHẦN TRĂM hay theo SỐ TIỀN CỐ ĐỊNH. Cột
  // "Phí doanh thu" của 2 bảng worksheet rẽ nhánh theo enum này — xem `worksheet-fee-cells.ts`.
  PathsApiSalesDealsExportGetParametersQueryRevenue_mode as DealRevenueMode,
  // Recon sheets (CĐT/F2/CTV) dùng chung một enum trạng thái: draft/pending/confirmed/voided.
  PathsApiSalesCtvReconciliationSheetsExportGetParametersQueryStatus as ReconciliationStatus,
  PathsApiSalesInvestorReconciliationSheetsExportGetParametersQuerySource_type as ReconciliationSourceType,
  PathsApiSalesCollaboratorContractsExportGetParametersQueryStatus as CollaboratorContractStatus,
  PathsApiSalesCollaboratorContractsExportGetParametersQueryCtv_line_type as CtvLineType,
  PathsApiRealestateProjectsGetParametersQueryStatus as ProjectStatus,
  PatchedProjectRequestPhase as ProjectPhase,
  PathsApiSalesFeeSupportRequestsExportGetParametersQueryOrigin as FeeSupportRequestOrigin,
  PathsApiSalesFeeSupportRequestsExportGetParametersQueryStatus as FeeSupportRequestStatus,
  // Regen 2026-08-13: canonical shifted từ `FeeSupportRequestDocument_status` sang biến thể
  // `...FeeSupportRequestsExport...` (cùng 4 member, path thắng đổi). Giữ nguyên tên local cũ
  // để các call-site trong feature fee-support-requests không phải đổi theo.
  PathsApiSalesFeeSupportRequestsExportGetParametersQueryDocument_status as FeeSupportRequestDocument_status,
  // Regen 2026-08-03: canonical shifted từ `InvestorBonusAdvanceLinePit_method`
  // sang `MonthlyBeneficiaryCommissionSummaryPit_method` (cùng shape, path thắng đổi).
  MonthlyBeneficiaryCommissionSummaryPit_method as PitMethod,

  // ── Đợt 2026-08-13: gom NỐT toàn bộ enum `Paths*` còn import trực tiếp ─────────────────
  // Trước đợt này chỉ 1/53 enum `Paths*` đi qua lớp alias; 52 cái còn lại nằm rải rác ~197
  // vị trí import, nên mỗi lần `yarn api:generate` đổi "path thắng" là vỡ hàng loạt file
  // không liên quan tới feature đang làm. ESLint `no-restricted-imports` giữ trạng thái này.

  // accounting — commission & KPI
  // Đổi tên 2026-08-25 (ClickUp 86eyqgf5k): `comm-payroll/{role}/` nay cũng nhận `status`, nên
  // `--dedupe-enums` chọn nó làm "path thắng" thay cho `monthly-summaries/sales/`. Bốn giá trị
  // giữ nguyên (DRAFT · CONFIRMED · EMAIL_SENT · PAID) — thuần đổi tên, đúng lớp lỗi mà file
  // alias này sinh ra để nuốt: một dòng ở đây thay vì vỡ mọi nơi import tên cũ.
  PathsApiAccountingCommPayrollRoleGetParametersQueryStatus as MonthlySummaryStatus,
  PathsApiAccountingCommissionHoldsGetParametersQueryStatus as CommissionHoldStatus,
  PathsApiAccountingCommissionHoldsGetParametersQueryBeneficiary_type as CommissionHoldBeneficiaryType,
  PathsApiAccountingCommissionHoldsGetParametersQueryTax_base as CommissionHoldTaxBase,
  PathsApiAccountingCommissionHoldsGetParametersQueryHold_reason as CommissionHoldReason,
  PathsApiAccountingKpiAssignmentsGetParametersQueryStatus as KpiAssignmentStatus,
  PathsApiAccountingKpiAssignmentsGetParametersQueryRole as KpiAssignmentRole,
  PathsApiAccountingKpiCommissionStructuresGetParametersQueryStatus as KpiCommissionStructureStatus,
  PathsApiAccountingDepartmentCommissionPoolsGetParametersQueryStatus as DepartmentCommissionPoolStatus,
  PathsApiAccountingDepartmentCommissionPoolsGetParametersQuerySplit_status as DepartmentCommissionPoolSplitStatus,
  PathsApiAccountingDepartmentCommissionsGetParametersQuerySource as DepartmentCommissionSource,
  PathsApiAccountingPayoutSplitLinesGetParametersQueryStatus as PayoutSplitLineStatus,
  PathsApiAccountingEmployeePayoutBatchesGetParametersQueryStatus as EmployeePayoutBatchStatus,
  PathsApiAccountingPromotionDistributionsGetParametersQueryStatus as PromotionDistributionStatus,
  PathsApiAccountingDealPeriodAllocationsGetParametersQueryStatus as DealPeriodAllocationStatus,
  PathsApiAccountingDealPaymentSuspensionsGetParametersQueryStatus as DealPaymentSuspensionStatus,

  // accounting — hoá đơn & chứng từ
  PathsApiAccountingInputInvoicesGetParametersQueryStatus as InputInvoiceStatus,
  PathsApiAccountingSalesInvoicesGetParametersQueryStatus as SalesInvoiceStatus,
  PathsApiAccountingReceiptVouchersGetParametersQueryStatus as ReceiptVoucherStatus,
  PathsApiAccountingReceiptVouchersGetParametersQueryPayment_method as VoucherPaymentMethod,
  PathsApiAccountingPaymentVouchersGetParametersQueryPayee_type as PaymentVoucherPayeeType,

  // sales
  PathsApiSalesCustomersGetParametersQueryCustomer_type as CustomerType,
  PathsApiSalesDepositContractsGetParametersQueryPayment_method as DepositContractPaymentMethod,
  PathsApiSalesBookingsGetParametersQueryBooking_status as BookingStatus,
  PathsApiSalesReportsCustomerCashDetailGetParametersQueryTransfer_to_account as BookingTransferToAccount,
  PathsApiSalesBookingRefundsGetParametersQueryStatus as BookingRefundStatus,
  PathsApiSalesF2ReconciliationsGetParametersQueryF2_source as F2Source,
  PathsApiSalesCommissionAdjustmentBatchesIdF2sGetParametersQueryStatus as LadF2Status,
  PathsApiSalesAdminDashboardExportRevenueTrendGetParametersQueryGroup as DashboardPerformanceGroup,
  PathsApiSalesAdminDashboardExportPerformanceGetParametersQueryGroup_org as DashboardPerformanceGroupOrg,
  PathsApiSalesAdminDashboardExportPerformanceGetParametersQueryOrg_activity as DashboardOrgActivity,

  // hrm — nhân sự & hợp đồng
  PathsApiHrmEmployeesGetParametersQueryStatus as EmployeeStatus,
  PathsApiHrmEmployeesGetParametersQueryEmployee_type as EmployeeType,
  PathsApiHrmEmployeesGetParametersQueryGender as EmployeeGender,
  PathsApiHrmEmployeesGetParametersQueryCode_type as EmployeeCodeType,
  PathsApiHrmEmployeeCertificatesGetParametersQueryCertificate_type as EmployeeCertificateType,
  PathsApiHrmEmployeesIdTermination_emailPreviewPostParametersQueryUse_real as TerminationEmailUseReal,
  PathsApiHrmContractEvaluationsHrGetParametersQueryStatus as ContractEvaluationStatus,
  PathsApiHrmContractEvaluationsHrGetParametersQueryForm_type as ContractEvaluationFormType,
  PathsApiHrmContractEvaluationsHrGetParametersQueryDisplay_status as ContractEvaluationDisplayStatus,
  PathsApiHrmContractsImport_templateGetParametersQueryMode as ContractImportMode,

  // hrm — chấm công & báo cáo
  PathsApiHrmTimesheetDailyEntriesGetParametersQueryStatus as DailyTimesheetStatus,
  PathsApiHrmTimesheetDailyEntriesGetParametersQueryFirst_log_method as TimesheetLogMethod,
  PathsApiHrmTimesheetsGetParametersQueryEmployee_salary_type as EmployeeSalaryType,
  PathsApiHrmAttendanceRecordsGetParametersQueryApprove_status as AttendanceApproveStatus,
  PathsApiHrmReportsHiredCandidateGetParametersQueryPeriod_type as RecruitmentReportPeriodType,
  PathsApiHrmReportsCostByPayerGetParametersQueryPayment_status as ReportPaymentStatus,

  // payroll
  PathsApiPayrollRecoveryVouchersGetParametersQueryVoucher_type as RecoveryVoucherType,
  PathsApiPayrollKpiPeriodsTaskStatusTask_idGetResponses200ContentApplicationJsonDataState as KpiTaskState,

  // elibrary / project documents
  PathsApiElibraryItemsGetParametersQueryVisibility as ElibraryVisibility,
  PathsApiElibraryItemsGetParametersQueryNode_type as ElibraryNodeType,
  PathsApiElibraryItemsGetParametersQueryFolder_type as ElibraryFolderType,

  // realestate
  PathsApiRealestateProjectsProject_pkStaffCommissionRatesGetParametersQueryRole as StaffCommissionRateRole,

  // ── Đợt 2 cùng ngày: repo dùng SONG SONG hai specifier ────────────────────────────────
  // `from '@/api/schema'` VÀ `from '@/api/schema.ts'` (có đuôi). Đợt quét đầu chỉ khớp
  // dạng không đuôi nên sót 46 enum nữa trên 107 file. Khi rà lại, PHẢI grep cả hai dạng.

  // hrm — nhân sự
  PathsApiHrmEmployeesGetParametersQueryMarital_status as EmployeeMaritalStatus,
  PathsApiHrmEmployeesGetParametersQueryDocument_submission_status as EmployeeDocumentSubmissionStatus,
  PathsApiHrmEmployeeCertificatesGetParametersQueryStatus as EmployeeCertificateStatus,
  PathsApiHrmBlocksExportGetParametersQueryBlock_type as BlockType,
  PathsApiHrmProposalsJobTransferGetParametersQueryTransfer_status as JobTransferStatus,

  // hrm — hợp đồng
  PathsApiHrmContractsGetParametersQueryStatus as ContractStatus,
  PathsApiHrmContractsGetParametersQueryCreation_source as ContractCreationSource,
  PathsApiHrmContractsIdExportDocumentGetParametersQueryTemplate as ContractExportTemplate,
  PathsApiHrmContractTypesGetParametersQueryDuration_type as ContractDurationType,
  PathsApiHrmContractTypesGetParametersQueryWorking_time_type as ContractWorkingTimeType,

  // hrm — chấm công
  PathsApiHrmAttendanceExemptionsGetParametersQueryStatus as AttendanceExemptionStatus,
  PathsApiHrmAttendanceRecordsGetParametersQueryConfirmation_status as AttendanceConfirmationStatus,

  // tuyển dụng
  PathsApiHrmRecruitmentCandidatesGetParametersQueryStatus as RecruitmentCandidateStatus,
  PathsApiHrmRecruitmentCandidatesGetParametersQueryEmployee_type as RecruitmentCandidateEmployeeType,
  PathsApiHrmRecruitmentRequestsGetParametersQueryStatus as RecruitmentRequestStatus,
  PathsApiHrmRecruitmentRequestsGetParametersQueryRecruitment_type as RecruitmentRequestType,
  PathsApiHrmRecruitmentRequestsIdExportDocumentGetParametersQueryType as RecruitmentRequestExportType,
  PathsApiHrmRecruitmentChannelsGetParametersQueryBelong_to as RecruitmentChannelBelongTo,
  PathsApiHrmRecruitmentExpensesGetParametersQueryPayment_statuses as RecruitmentExpensePaymentStatus,
  PathsApiHrmInterviewSchedulesGetParametersQueryInterview_type as InterviewType,
  PathsApiHrmReportsEmployeeResignedBreakdownGetParametersQueryPeriod_type as ResignedBreakdownPeriodType,

  // payroll
  PathsApiPayrollRecoveryVouchersGetParametersQueryStatus as RecoveryVoucherStatus,
  PathsApiPayrollTravelExpensesGetParametersQueryExpense_type as TravelExpenseType,

  // accounting — chứng chỉ môi giới CTV
  PathsApiAccountingBrokerCertificatesGetParametersQueryStatus as BrokerCertificateStatus,
  PathsApiAccountingBrokerCertificatesGetParametersQueryCert_type as BrokerCertificateType,

  // elibrary — access request
  PathsApiElibraryAccessRequestsGetParametersQueryStatus as ElibraryAccessRequestStatus,
  PathsApiElibraryAccessRequestsGetParametersQueryRole as ElibraryAccessRequestRole,

  // sales / hệ thống
  PathsApiSalesCustomersGetParametersQueryGender as CustomerGender,
  PathsApiAuditLogsSearchGetParametersQuerySort_order as AuditLogSortOrder,

  // realestate — trạng thái duyệt cấu hình Phí và Thưởng (TBC lõi, ClickUp 86exm4ud9).
  // Tên sinh theo component + property (`TimeBoundCommission.approval_status`), nhưng vẫn đi
  // qua alias: `--dedupe-enums` sẽ đổi tên nếu về sau có enum khác trùng đúng sáu giá trị này.
  TimeBoundCommissionApproval_status as TbcApprovalStatus,

  // accounting — báo cáo 21.5 (công nợ CĐT theo Lô áp dụng)
  PathsApiAccountingReportsInvestorDebtByLadGetParametersQueryView as LadDebtReportView,
  PathsApiAccountingReportsInvestorDebtByLadGetParametersQueryRate_source as LadDebtRateSource,

  // accounting — khấu trừ hoa hồng (rổ thu nhập bị trừ + nhóm lý do)
  PathsApiAccountingCommissionDeductionsGetParametersQuerySource_bucket as CommissionDeductionSourceBucket,
  PathsApiAccountingCommissionDeductionsGetParametersQueryReason_kind as CommissionDeductionReasonKind,
} from '@/api/schema'

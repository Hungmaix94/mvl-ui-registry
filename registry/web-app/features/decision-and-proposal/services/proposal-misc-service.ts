import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'
import type { ProposalApproveRequest, ProposalRejectRequest } from './proposal-base-service'

// ===== TYPE DEFINITIONS =====
// Device Change
export type ProposalDeviceChange = components['schemas']['ProposalDeviceChange']
export type PaginatedProposalDeviceChangeList =
  components['schemas']['PaginatedProposalDeviceChangeList']
export type GetProposalsDeviceChangeParams =
  paths['/api/hrm/proposals/device-change/']['get']['parameters']['query']
export type GetProposalsDeviceChangeExportParams =
  paths['/api/hrm/proposals/device-change/export/']['get']['parameters']['query']

// Asset Allocation
export type ProposalAssetAllocation = components['schemas']['ProposalAssetAllocation']
export type ProposalAssetAllocationApproveRequest =
  components['schemas']['ProposalAssetAllocationApproveRequest']
export type ProposalAssetAllocationApproveItemRequest =
  components['schemas']['ProposalAssetAllocationApproveItemRequest']
export type PaginatedProposalAssetAllocationList =
  components['schemas']['PaginatedProposalAssetAllocationList']
export type GetProposalsAssetAllocationParams =
  paths['/api/hrm/proposals/asset-allocation/']['get']['parameters']['query']
export type GetProposalsAssetAllocationExportParams =
  paths['/api/hrm/proposals/asset-allocation/export/']['get']['parameters']['query']

// Overtime Work
export type ProposalOvertimeWork = components['schemas']['ProposalOvertimeWork']
export type PaginatedProposalOvertimeWorkList =
  components['schemas']['PaginatedProposalOvertimeWorkList']
export type GetProposalsOvertimeWorkParams =
  paths['/api/hrm/proposals/overtime-work/']['get']['parameters']['query']
export type GetProposalsOvertimeWorkExportParams =
  paths['/api/hrm/proposals/overtime-work/export/']['get']['parameters']['query']
export type ProposalOvertimeWorkApproveRequest =
  components['schemas']['ProposalOvertimeWorkApproveRequest']
export type ProposalOvertimeApproveEntryRequest =
  components['schemas']['ProposalOvertimeApproveEntryRequest']

// Late Exemption
export type ProposalLateExemption = components['schemas']['ProposalLateExemption']
export type PaginatedProposalLateExemptionList =
  components['schemas']['PaginatedProposalLateExemptionList']
export type GetProposalsLateExemptionParams =
  paths['/api/hrm/proposals/late-exemption/']['get']['parameters']['query']
export type GetProposalsLateExemptionExportParams =
  paths['/api/hrm/proposals/late-exemption/export/']['get']['parameters']['query']

// Job Transfer
export type ProposalJobTransfer = components['schemas']['ProposalJobTransfer']
export type PaginatedProposalJobTransferList =
  components['schemas']['PaginatedProposalJobTransferList']
export type GetProposalsJobTransferParams =
  paths['/api/hrm/proposals/job-transfer/']['get']['parameters']['query']
export type GetProposalsJobTransferExportParams =
  paths['/api/hrm/proposals/job-transfer/export/']['get']['parameters']['query']

// Bulk Job Transfer
export type ProposalBulkJobTransfer = components['schemas']['ProposalBulkJobTransfer']
export type ProposalBulkJobTransferRequest = components['schemas']['ProposalBulkJobTransferRequest']
export type ProposalJobTransferLineInputRequest =
  components['schemas']['ProposalJobTransferLineInputRequest']
export type PaginatedProposalBulkJobTransferList =
  components['schemas']['PaginatedProposalBulkJobTransferList']
export type GetProposalsBulkJobTransferParams =
  paths['/api/hrm/proposals/bulk-job-transfer/']['get']['parameters']['query']
export type GetProposalsBulkJobTransferExportParams =
  paths['/api/hrm/proposals/bulk-job-transfer/export/']['get']['parameters']['query']

// Timesheet Entry Complaint
export type ProposalTimesheetEntryComplaint =
  components['schemas']['ProposalTimesheetEntryComplaint']
export type ProposalTimesheetEntryComplaintApproveRequest =
  components['schemas']['ProposalTimesheetEntryComplaintApproveRequest']
export type ProposalTimesheetEntryComplaintRejectRequest =
  components['schemas']['ProposalTimesheetEntryComplaintRejectRequest']
export type PaginatedProposalTimesheetEntryComplaintList =
  components['schemas']['PaginatedProposalTimesheetEntryComplaintList']
export type GetProposalsTimesheetEntryComplaintParams =
  paths['/api/hrm/proposals/timesheet-entry-complaint/']['get']['parameters']['query']
export type GetProposalsTimesheetEntryComplaintExportParams =
  paths['/api/hrm/proposals/timesheet-entry-complaint/export/']['get']['parameters']['query']

// Return to Work
export type ProposalReturnToWork = components['schemas']['ProposalReturnToWork']
export type PaginatedProposalReturnToWorkList =
  components['schemas']['PaginatedProposalReturnToWorkList']
export type GetProposalsReturnToWorkParams =
  paths['/api/hrm/proposals/return-to-work/']['get']['parameters']['query']
export type GetProposalsReturnToWorkExportParams =
  paths['/api/hrm/proposals/return-to-work/export/']['get']['parameters']['query']

// Statutory Leave
export type ProposalStatutoryLeave = components['schemas']['ProposalStatutoryLeave']
export type PaginatedProposalStatutoryLeaveList =
  components['schemas']['PaginatedProposalStatutoryLeaveList']
export type GetProposalsStatutoryLeaveParams =
  paths['/api/hrm/proposals/statutory-leave/']['get']['parameters']['query']
export type GetProposalsStatutoryLeaveExportParams =
  paths['/api/hrm/proposals/statutory-leave/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class ProposalMiscService extends BaseApiService {
  // ===== DEVICE CHANGE =====
  async getProposalsDeviceChange(params?: GetProposalsDeviceChangeParams) {
    return await this.getPaginated(ApiPaths.hrm_proposals_device_change_list, params)
  }

  async getProposalDeviceChange(id: number) {
    return await this.get(ApiPaths.hrm_proposals_device_change_retrieve, { path: { id } })
  }

  async getProposalDeviceChangeHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_proposals_device_change_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getProposalDeviceChangeHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_proposals_device_change_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async approveProposalDeviceChange(id: number, data?: ProposalApproveRequest) {
    return await this.post(ApiPaths.hrm_proposals_device_change_approve_create, data || {}, {
      path: { id },
    })
  }

  async rejectProposalDeviceChange(id: number, data: ProposalRejectRequest) {
    return await this.post(ApiPaths.hrm_proposals_device_change_reject_create, data, {
      path: { id },
    })
  }

  async exportProposalsDeviceChange(params?: GetProposalsDeviceChangeExportParams) {
    return await this.get(ApiPaths.hrm_proposals_device_change_export_retrieve, { query: params })
  }

  // ===== ASSET ALLOCATION =====
  async getProposalsAssetAllocation(params?: GetProposalsAssetAllocationParams) {
    return await this.getPaginated(ApiPaths.hrm_proposals_asset_allocation_list, params)
  }

  async getProposalAssetAllocation(id: number) {
    return await this.get(ApiPaths.hrm_proposals_asset_allocation_retrieve, { path: { id } })
  }

  async getProposalAssetAllocationHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_proposals_asset_allocation_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getProposalAssetAllocationHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_proposals_asset_allocation_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async approveProposalAssetAllocation(id: number, data?: ProposalAssetAllocationApproveRequest) {
    return await this.post(ApiPaths.hrm_proposals_asset_allocation_approve_create, data || {}, {
      path: { id },
    })
  }

  async rejectProposalAssetAllocation(id: number, data: ProposalRejectRequest) {
    return await this.post(ApiPaths.hrm_proposals_asset_allocation_reject_create, data, {
      path: { id },
    })
  }

  async exportProposalsAssetAllocation(params?: GetProposalsAssetAllocationExportParams) {
    return await this.get(ApiPaths.hrm_proposals_asset_allocation_export_retrieve, {
      query: params,
    })
  }

  // ===== OVERTIME WORK =====
  async getProposalsOvertimeWork(params?: GetProposalsOvertimeWorkParams) {
    return await this.getPaginated(ApiPaths.hrm_proposals_overtime_work_list, params)
  }

  async getProposalOvertimeWork(id: number) {
    return await this.get(ApiPaths.hrm_proposals_overtime_work_retrieve, { path: { id } })
  }

  async getProposalOvertimeWorkHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_proposals_overtime_work_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getProposalOvertimeWorkHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_proposals_overtime_work_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async approveProposalOvertimeWork(id: number, data?: ProposalOvertimeWorkApproveRequest) {
    return await this.post(ApiPaths.hrm_proposals_overtime_work_approve_create, data || {}, {
      path: { id },
    })
  }

  async rejectProposalOvertimeWork(id: number, data: ProposalRejectRequest) {
    return await this.post(ApiPaths.hrm_proposals_overtime_work_reject_create, data, {
      path: { id },
    })
  }

  async exportProposalsOvertimeWork(params?: GetProposalsOvertimeWorkExportParams) {
    return await this.get(ApiPaths.hrm_proposals_overtime_work_export_retrieve, { query: params })
  }

  // ===== LATE EXEMPTION =====
  async getProposalsLateExemption(params?: GetProposalsLateExemptionParams) {
    return await this.getPaginated(ApiPaths.hrm_proposals_late_exemption_list, params)
  }

  async getProposalLateExemption(id: number) {
    return await this.get(ApiPaths.hrm_proposals_late_exemption_retrieve, { path: { id } })
  }

  async getProposalLateExemptionHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_proposals_late_exemption_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getProposalLateExemptionHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_proposals_late_exemption_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async approveProposalLateExemption(id: number, data?: ProposalApproveRequest) {
    return await this.post(ApiPaths.hrm_proposals_late_exemption_approve_create, data || {}, {
      path: { id },
    })
  }

  async rejectProposalLateExemption(id: number, data: ProposalRejectRequest) {
    return await this.post(ApiPaths.hrm_proposals_late_exemption_reject_create, data, {
      path: { id },
    })
  }

  async exportProposalsLateExemption(params?: GetProposalsLateExemptionExportParams) {
    return await this.get(ApiPaths.hrm_proposals_late_exemption_export_retrieve, { query: params })
  }

  // ===== JOB TRANSFER =====
  async getProposalsJobTransfer(params?: GetProposalsJobTransferParams) {
    return await this.getPaginated(ApiPaths.hrm_proposals_job_transfer_list, params)
  }

  async getProposalJobTransfer(id: number) {
    return await this.get(ApiPaths.hrm_proposals_job_transfer_retrieve, { path: { id } })
  }

  async getProposalJobTransferHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_proposals_job_transfer_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getProposalJobTransferHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_proposals_job_transfer_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async approveProposalJobTransfer(id: number, data?: ProposalApproveRequest) {
    return await this.post(ApiPaths.hrm_proposals_job_transfer_approve_create, data || {}, {
      path: { id },
    })
  }

  async rejectProposalJobTransfer(id: number, data: ProposalRejectRequest) {
    return await this.post(ApiPaths.hrm_proposals_job_transfer_reject_create, data, {
      path: { id },
    })
  }

  async exportProposalsJobTransfer(params?: GetProposalsJobTransferExportParams) {
    return await this.get(ApiPaths.hrm_proposals_job_transfer_export_retrieve, { query: params })
  }

  // ===== BULK JOB TRANSFER =====
  async getProposalsBulkJobTransfer(params?: GetProposalsBulkJobTransferParams) {
    return await this.getPaginated(ApiPaths.hrm_proposals_bulk_job_transfer_list, params)
  }

  async getProposalBulkJobTransfer(id: number) {
    return await this.get(ApiPaths.hrm_proposals_bulk_job_transfer_retrieve, { path: { id } })
  }

  async getProposalBulkJobTransferHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_proposals_bulk_job_transfer_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getProposalBulkJobTransferHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_proposals_bulk_job_transfer_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async createProposalBulkJobTransfer(data: ProposalBulkJobTransferRequest) {
    return await this.post(ApiPaths.hrm_proposals_bulk_job_transfer_create, data)
  }

  async updateProposalBulkJobTransfer(id: number, data: ProposalBulkJobTransferRequest) {
    return await this.put(ApiPaths.hrm_proposals_bulk_job_transfer_update, data, {
      path: { id },
    })
  }

  async approveProposalBulkJobTransfer(id: number, data?: ProposalApproveRequest) {
    return await this.post(ApiPaths.hrm_proposals_bulk_job_transfer_approve_create, data || {}, {
      path: { id },
    })
  }

  async rejectProposalBulkJobTransfer(id: number, data: ProposalRejectRequest) {
    return await this.post(ApiPaths.hrm_proposals_bulk_job_transfer_reject_create, data, {
      path: { id },
    })
  }

  async exportProposalsBulkJobTransfer(params?: GetProposalsBulkJobTransferExportParams) {
    return await this.get(ApiPaths.hrm_proposals_bulk_job_transfer_export_retrieve, {
      query: params,
    })
  }

  // ===== TIMESHEET ENTRY COMPLAINT =====
  async getProposalsTimesheetEntryComplaint(params?: GetProposalsTimesheetEntryComplaintParams) {
    return await this.getPaginated(ApiPaths.hrm_proposals_timesheet_entry_complaint_list, params)
  }

  async getProposalTimesheetEntryComplaint(id: number) {
    return await this.get(ApiPaths.hrm_proposals_timesheet_entry_complaint_retrieve, {
      path: { id },
    })
  }

  async getProposalTimesheetEntryComplaintHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_proposals_timesheet_entry_complaint_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getProposalTimesheetEntryComplaintHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_proposals_timesheet_entry_complaint_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async approveProposalTimesheetEntryComplaint(
    id: number,
    requestData: ProposalTimesheetEntryComplaintApproveRequest
  ) {
    return await this.post(
      ApiPaths.hrm_proposals_timesheet_entry_complaint_approve_create,
      requestData,
      { path: { id } }
    )
  }

  async rejectProposalTimesheetEntryComplaint(
    id: number,
    requestData: ProposalTimesheetEntryComplaintRejectRequest
  ) {
    return await this.post(
      ApiPaths.hrm_proposals_timesheet_entry_complaint_reject_create,
      requestData,
      { path: { id } }
    )
  }

  async exportProposalsTimesheetEntryComplaint(
    params?: GetProposalsTimesheetEntryComplaintExportParams
  ) {
    return await this.get(ApiPaths.hrm_proposals_timesheet_entry_complaint_export_retrieve, {
      query: params,
    })
  }

  // ===== RETURN TO WORK =====
  async getProposalsReturnToWork(params?: GetProposalsReturnToWorkParams) {
    return await this.getPaginated(ApiPaths.hrm_proposals_return_to_work_list, params)
  }

  async getProposalReturnToWork(id: number) {
    return await this.get(ApiPaths.hrm_proposals_return_to_work_retrieve, { path: { id } })
  }

  async getProposalReturnToWorkHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_proposals_return_to_work_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getProposalReturnToWorkHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_proposals_return_to_work_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async approveProposalReturnToWork(id: number, data?: ProposalApproveRequest) {
    return await this.post(ApiPaths.hrm_proposals_return_to_work_approve_create, data || {}, {
      path: { id },
    })
  }

  async rejectProposalReturnToWork(id: number, data: ProposalRejectRequest) {
    return await this.post(ApiPaths.hrm_proposals_return_to_work_reject_create, data, {
      path: { id },
    })
  }

  async exportProposalsReturnToWork(params?: GetProposalsReturnToWorkExportParams) {
    return await this.get(ApiPaths.hrm_proposals_return_to_work_export_retrieve, {
      query: params,
    })
  }

  // ===== STATUTORY LEAVE =====
  async getProposalsStatutoryLeave(params?: GetProposalsStatutoryLeaveParams) {
    return await this.getPaginated(ApiPaths.hrm_proposals_statutory_leave_list, params)
  }

  async getProposalStatutoryLeave(id: number) {
    return await this.get(ApiPaths.hrm_proposals_statutory_leave_retrieve, { path: { id } })
  }

  async getProposalStatutoryLeaveHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_proposals_statutory_leave_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getProposalStatutoryLeaveHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_proposals_statutory_leave_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async approveProposalStatutoryLeave(id: number, data?: ProposalApproveRequest) {
    return await this.post(ApiPaths.hrm_proposals_statutory_leave_approve_create, data || {}, {
      path: { id },
    })
  }

  async rejectProposalStatutoryLeave(id: number, data: ProposalRejectRequest) {
    return await this.post(ApiPaths.hrm_proposals_statutory_leave_reject_create, data, {
      path: { id },
    })
  }

  async exportProposalsStatutoryLeave(params?: GetProposalsStatutoryLeaveExportParams) {
    return await this.get(ApiPaths.hrm_proposals_statutory_leave_export_retrieve, {
      query: params,
    })
  }
}

// ===== SERVICE SINGLETON =====
let _proposalMiscService: ProposalMiscService | null = null

export function getProposalMiscService(): ProposalMiscService {
  if (!_proposalMiscService) {
    _proposalMiscService = new ProposalMiscService()
  }
  return _proposalMiscService
}

// ===== REACT QUERY HOOKS =====
// ===== DEVICE CHANGE HOOKS =====
export function useProposalsDeviceChange(
  params?: GetProposalsDeviceChangeParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_DEVICE_CHANGE.LIST(params || {}),
    () => getProposalMiscService().getProposalsDeviceChange(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useProposalDeviceChange(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_DEVICE_CHANGE.DETAIL(id),
    () => getProposalMiscService().getProposalDeviceChange(id),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useApproveProposalDeviceChange() {
  return useApiMutation(({ id, data }: { id: number; data?: ProposalApproveRequest }) =>
    getProposalMiscService().approveProposalDeviceChange(id, data)
  )
}

export function useRejectProposalDeviceChange() {
  return useApiMutation(({ id, data }: { id: number; data: ProposalRejectRequest }) =>
    getProposalMiscService().rejectProposalDeviceChange(id, data)
  )
}

export function useExportProposalsDeviceChange() {
  return useApiMutation((params?: GetProposalsDeviceChangeExportParams) =>
    getProposalMiscService().exportProposalsDeviceChange(params)
  )
}

// ===== ASSET ALLOCATION HOOKS =====
export function useProposalsAssetAllocation(
  params?: GetProposalsAssetAllocationParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_ASSET_ALLOCATION.LIST(params || {}),
    () => getProposalMiscService().getProposalsAssetAllocation(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useProposalAssetAllocation(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_ASSET_ALLOCATION.DETAIL(id),
    () => getProposalMiscService().getProposalAssetAllocation(id),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useApproveProposalAssetAllocation() {
  return useApiMutation(
    ({ id, data }: { id: number; data?: ProposalAssetAllocationApproveRequest }) =>
      getProposalMiscService().approveProposalAssetAllocation(id, data)
  )
}

export function useRejectProposalAssetAllocation() {
  return useApiMutation(({ id, data }: { id: number; data: ProposalRejectRequest }) =>
    getProposalMiscService().rejectProposalAssetAllocation(id, data)
  )
}

export function useExportProposalsAssetAllocation() {
  return useApiMutation((params?: GetProposalsAssetAllocationExportParams) =>
    getProposalMiscService().exportProposalsAssetAllocation(params)
  )
}

// ===== OVERTIME WORK HOOKS =====
export function useProposalsOvertimeWork(
  params?: GetProposalsOvertimeWorkParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_OVERTIME_WORK.LIST(params || {}),
    () => getProposalMiscService().getProposalsOvertimeWork(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useProposalOvertimeWork(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_OVERTIME_WORK.DETAIL(id),
    () => getProposalMiscService().getProposalOvertimeWork(id),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useApproveProposalOvertimeWork() {
  return useApiMutation(({ id, data }: { id: number; data?: ProposalOvertimeWorkApproveRequest }) =>
    getProposalMiscService().approveProposalOvertimeWork(id, data)
  )
}

export function useRejectProposalOvertimeWork() {
  return useApiMutation(({ id, data }: { id: number; data: ProposalRejectRequest }) =>
    getProposalMiscService().rejectProposalOvertimeWork(id, data)
  )
}

export function useExportProposalsOvertimeWork() {
  return useApiMutation((params?: GetProposalsOvertimeWorkExportParams) =>
    getProposalMiscService().exportProposalsOvertimeWork(params)
  )
}

// ===== LATE EXEMPTION HOOKS =====
export function useProposalsLateExemption(
  params?: GetProposalsLateExemptionParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_LATE_EXEMPTION.LIST(params || {}),
    () => getProposalMiscService().getProposalsLateExemption(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useProposalLateExemption(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_LATE_EXEMPTION.DETAIL(id),
    () => getProposalMiscService().getProposalLateExemption(id),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useApproveProposalLateExemption() {
  return useApiMutation(({ id, data }: { id: number; data?: ProposalApproveRequest }) =>
    getProposalMiscService().approveProposalLateExemption(id, data)
  )
}

export function useRejectProposalLateExemption() {
  return useApiMutation(({ id, data }: { id: number; data: ProposalRejectRequest }) =>
    getProposalMiscService().rejectProposalLateExemption(id, data)
  )
}

export function useExportProposalsLateExemption() {
  return useApiMutation((params?: GetProposalsLateExemptionExportParams) =>
    getProposalMiscService().exportProposalsLateExemption(params)
  )
}

// ===== JOB TRANSFER HOOKS =====
export function useProposalsJobTransfer(
  params?: GetProposalsJobTransferParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_JOB_TRANSFER.LIST(params || {}),
    () => getProposalMiscService().getProposalsJobTransfer(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useProposalJobTransfer(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_JOB_TRANSFER.DETAIL(id),
    () => getProposalMiscService().getProposalJobTransfer(id),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useApproveProposalJobTransfer() {
  return useApiMutation(({ id, data }: { id: number; data?: ProposalApproveRequest }) =>
    getProposalMiscService().approveProposalJobTransfer(id, data)
  )
}

export function useRejectProposalJobTransfer() {
  return useApiMutation(({ id, data }: { id: number; data: ProposalRejectRequest }) =>
    getProposalMiscService().rejectProposalJobTransfer(id, data)
  )
}

export function useExportProposalsJobTransfer() {
  return useApiMutation((params?: GetProposalsJobTransferExportParams) =>
    getProposalMiscService().exportProposalsJobTransfer(params)
  )
}

// ===== BULK JOB TRANSFER HOOKS =====
export function useProposalsBulkJobTransfer(
  params?: GetProposalsBulkJobTransferParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_BULK_JOB_TRANSFER.LIST(params || {}),
    () => getProposalMiscService().getProposalsBulkJobTransfer(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useProposalBulkJobTransfer(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_BULK_JOB_TRANSFER.DETAIL(id),
    () => getProposalMiscService().getProposalBulkJobTransfer(id),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateProposalBulkJobTransfer() {
  return useApiMutation((data: ProposalBulkJobTransferRequest) =>
    getProposalMiscService().createProposalBulkJobTransfer(data)
  )
}

export function useUpdateProposalBulkJobTransfer() {
  return useApiMutation(({ id, data }: { id: number; data: ProposalBulkJobTransferRequest }) =>
    getProposalMiscService().updateProposalBulkJobTransfer(id, data)
  )
}

export function useApproveProposalBulkJobTransfer() {
  return useApiMutation(({ id, data }: { id: number; data?: ProposalApproveRequest }) =>
    getProposalMiscService().approveProposalBulkJobTransfer(id, data)
  )
}

export function useRejectProposalBulkJobTransfer() {
  return useApiMutation(({ id, data }: { id: number; data: ProposalRejectRequest }) =>
    getProposalMiscService().rejectProposalBulkJobTransfer(id, data)
  )
}

export function useExportProposalsBulkJobTransfer() {
  return useApiMutation((params?: GetProposalsBulkJobTransferExportParams) =>
    getProposalMiscService().exportProposalsBulkJobTransfer(params)
  )
}

// ===== TIMESHEET ENTRY COMPLAINT HOOKS =====
export function useProposalsTimesheetEntryComplaint(
  params?: GetProposalsTimesheetEntryComplaintParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_TIMESHEET_ENTRY_COMPLAINT.LIST(params || {}),
    () => getProposalMiscService().getProposalsTimesheetEntryComplaint(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useProposalTimesheetEntryComplaint(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_TIMESHEET_ENTRY_COMPLAINT.DETAIL(id),
    () => getProposalMiscService().getProposalTimesheetEntryComplaint(id),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useApproveProposalTimesheetEntryComplaint() {
  return useApiMutation(
    ({ id, data }: { id: number; data: ProposalTimesheetEntryComplaintApproveRequest }) =>
      getProposalMiscService().approveProposalTimesheetEntryComplaint(id, data)
  )
}

export function useRejectProposalTimesheetEntryComplaint() {
  return useApiMutation(
    ({ id, data }: { id: number; data: ProposalTimesheetEntryComplaintRejectRequest }) =>
      getProposalMiscService().rejectProposalTimesheetEntryComplaint(id, data)
  )
}

export function useExportProposalsTimesheetEntryComplaint() {
  return useApiMutation((params?: GetProposalsTimesheetEntryComplaintExportParams) =>
    getProposalMiscService().exportProposalsTimesheetEntryComplaint(params)
  )
}

// ===== RETURN TO WORK HOOKS =====
export function useProposalsReturnToWork(
  params?: GetProposalsReturnToWorkParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_RETURN_TO_WORK.LIST(params || {}),
    () => getProposalMiscService().getProposalsReturnToWork(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useProposalReturnToWork(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_RETURN_TO_WORK.DETAIL(id),
    () => getProposalMiscService().getProposalReturnToWork(id),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useApproveProposalReturnToWork() {
  return useApiMutation(({ id, data }: { id: number; data?: ProposalApproveRequest }) =>
    getProposalMiscService().approveProposalReturnToWork(id, data)
  )
}

export function useRejectProposalReturnToWork() {
  return useApiMutation(({ id, data }: { id: number; data: ProposalRejectRequest }) =>
    getProposalMiscService().rejectProposalReturnToWork(id, data)
  )
}

export function useExportProposalsReturnToWork() {
  return useApiMutation((params?: GetProposalsReturnToWorkExportParams) =>
    getProposalMiscService().exportProposalsReturnToWork(params)
  )
}

// ===== STATUTORY LEAVE HOOKS =====
export function useProposalsStatutoryLeave(
  params?: GetProposalsStatutoryLeaveParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_STATUTORY_LEAVE.LIST(params || {}),
    () => getProposalMiscService().getProposalsStatutoryLeave(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useProposalStatutoryLeave(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_STATUTORY_LEAVE.DETAIL(id),
    () => getProposalMiscService().getProposalStatutoryLeave(id),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useApproveProposalStatutoryLeave() {
  return useApiMutation(({ id, data }: { id: number; data?: ProposalApproveRequest }) =>
    getProposalMiscService().approveProposalStatutoryLeave(id, data)
  )
}

export function useRejectProposalStatutoryLeave() {
  return useApiMutation(({ id, data }: { id: number; data: ProposalRejectRequest }) =>
    getProposalMiscService().rejectProposalStatutoryLeave(id, data)
  )
}

export function useExportProposalsStatutoryLeave() {
  return useApiMutation((params?: GetProposalsStatutoryLeaveExportParams) =>
    getProposalMiscService().exportProposalsStatutoryLeave(params)
  )
}

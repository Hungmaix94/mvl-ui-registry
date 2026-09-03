import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type { HistoriesParams } from '@/types/hrm-types'
import type { ProposalApproveRequest, ProposalRejectRequest } from './proposal-base-service'

// ===== TYPE DEFINITIONS =====
// Paid Leave
export type ProposalPaidLeave = components['schemas']['ProposalPaidLeave']
export type PaginatedProposalPaidLeaveList = components['schemas']['PaginatedProposalPaidLeaveList']
export type GetProposalsPaidLeaveParams =
  paths['/api/hrm/proposals/paid-leave/']['get']['parameters']['query']
export type GetProposalsPaidLeaveExportParams =
  paths['/api/hrm/proposals/paid-leave/export/']['get']['parameters']['query']

// Unpaid Leave
export type ProposalUnpaidLeave = components['schemas']['ProposalUnpaidLeave']
export type PaginatedProposalUnpaidLeaveList =
  components['schemas']['PaginatedProposalUnpaidLeaveList']
export type GetProposalsUnpaidLeaveParams =
  paths['/api/hrm/proposals/unpaid-leave/']['get']['parameters']['query']
export type GetProposalsUnpaidLeaveExportParams =
  paths['/api/hrm/proposals/unpaid-leave/export/']['get']['parameters']['query']

// Maternity Leave
export type ProposalMaternityLeave = components['schemas']['ProposalMaternityLeave']
export type PaginatedProposalMaternityLeaveList =
  components['schemas']['PaginatedProposalMaternityLeaveList']
export type GetProposalsMaternityLeaveParams =
  paths['/api/hrm/proposals/maternity-leave/']['get']['parameters']['query']
export type GetProposalsMaternityLeaveExportParams =
  paths['/api/hrm/proposals/maternity-leave/export/']['get']['parameters']['query']

// Post Maternity Benefits
export type ProposalPostMaternityBenefits = components['schemas']['ProposalPostMaternityBenefits']
export type PaginatedProposalPostMaternityBenefitsList =
  components['schemas']['PaginatedProposalPostMaternityBenefitsList']
export type GetProposalsPostMaternityBenefitsParams =
  paths['/api/hrm/proposals/post-maternity-benefits/']['get']['parameters']['query']
export type GetProposalsPostMaternityBenefitsExportParams =
  paths['/api/hrm/proposals/post-maternity-benefits/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class ProposalLeaveService extends BaseApiService {
  // ===== PAID LEAVE =====
  async getProposalsPaidLeave(params?: GetProposalsPaidLeaveParams) {
    return await this.getPaginated(ApiPaths.hrm_proposals_paid_leave_list, params)
  }

  async getProposalPaidLeave(id: number) {
    return await this.get(ApiPaths.hrm_proposals_paid_leave_retrieve, { path: { id } })
  }

  async getProposalPaidLeaveHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_proposals_paid_leave_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getProposalPaidLeaveHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_proposals_paid_leave_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async approveProposalPaidLeave(id: number, data?: ProposalApproveRequest) {
    return await this.post(ApiPaths.hrm_proposals_paid_leave_approve_create, data || {}, {
      path: { id },
    })
  }

  async rejectProposalPaidLeave(id: number, data: ProposalRejectRequest) {
    return await this.post(ApiPaths.hrm_proposals_paid_leave_reject_create, data, { path: { id } })
  }

  async exportProposalsPaidLeave(params?: GetProposalsPaidLeaveExportParams) {
    return await this.get(ApiPaths.hrm_proposals_paid_leave_export_retrieve, { query: params })
  }

  // ===== UNPAID LEAVE =====
  async getProposalsUnpaidLeave(params?: GetProposalsUnpaidLeaveParams) {
    return await this.getPaginated(ApiPaths.hrm_proposals_unpaid_leave_list, params)
  }

  async getProposalUnpaidLeave(id: number) {
    return await this.get(ApiPaths.hrm_proposals_unpaid_leave_retrieve, { path: { id } })
  }

  async getProposalUnpaidLeaveHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_proposals_unpaid_leave_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getProposalUnpaidLeaveHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_proposals_unpaid_leave_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async approveProposalUnpaidLeave(id: number, data?: ProposalApproveRequest) {
    return await this.post(ApiPaths.hrm_proposals_unpaid_leave_approve_create, data || {}, {
      path: { id },
    })
  }

  async rejectProposalUnpaidLeave(id: number, data: ProposalRejectRequest) {
    return await this.post(ApiPaths.hrm_proposals_unpaid_leave_reject_create, data, {
      path: { id },
    })
  }

  async exportProposalsUnpaidLeave(params?: GetProposalsUnpaidLeaveExportParams) {
    return await this.get(ApiPaths.hrm_proposals_unpaid_leave_export_retrieve, { query: params })
  }

  // ===== MATERNITY LEAVE =====
  async getProposalsMaternityLeave(params?: GetProposalsMaternityLeaveParams) {
    return await this.getPaginated(ApiPaths.hrm_proposals_maternity_leave_list, params)
  }

  async getProposalMaternityLeave(id: number) {
    return await this.get(ApiPaths.hrm_proposals_maternity_leave_retrieve, { path: { id } })
  }

  async getProposalMaternityLeaveHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_proposals_maternity_leave_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getProposalMaternityLeaveHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_proposals_maternity_leave_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async approveProposalMaternityLeave(id: number, data?: ProposalApproveRequest) {
    return await this.post(ApiPaths.hrm_proposals_maternity_leave_approve_create, data || {}, {
      path: { id },
    })
  }

  async rejectProposalMaternityLeave(id: number, data: ProposalRejectRequest) {
    return await this.post(ApiPaths.hrm_proposals_maternity_leave_reject_create, data, {
      path: { id },
    })
  }

  async exportProposalsMaternityLeave(params?: GetProposalsMaternityLeaveExportParams) {
    return await this.get(ApiPaths.hrm_proposals_maternity_leave_export_retrieve, { query: params })
  }

  // ===== POST MATERNITY BENEFITS =====
  async getProposalsPostMaternityBenefits(params?: GetProposalsPostMaternityBenefitsParams) {
    return await this.getPaginated(ApiPaths.hrm_proposals_post_maternity_benefits_list, params)
  }

  async getProposalPostMaternityBenefits(id: number) {
    return await this.get(ApiPaths.hrm_proposals_post_maternity_benefits_retrieve, { path: { id } })
  }

  async getProposalPostMaternityBenefitsHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_proposals_post_maternity_benefits_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getProposalPostMaternityBenefitsHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_proposals_post_maternity_benefits_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  async approveProposalPostMaternityBenefits(id: number, data?: ProposalApproveRequest) {
    return await this.post(
      ApiPaths.hrm_proposals_post_maternity_benefits_approve_create,
      data || {},
      { path: { id } }
    )
  }

  async rejectProposalPostMaternityBenefits(id: number, data: ProposalRejectRequest) {
    return await this.post(ApiPaths.hrm_proposals_post_maternity_benefits_reject_create, data, {
      path: { id },
    })
  }

  async exportProposalsPostMaternityBenefits(
    params?: GetProposalsPostMaternityBenefitsExportParams
  ) {
    return await this.get(ApiPaths.hrm_proposals_post_maternity_benefits_export_retrieve, {
      query: params,
    })
  }
}

// ===== SERVICE SINGLETON =====
let _proposalLeaveService: ProposalLeaveService | null = null

export function getProposalLeaveService(): ProposalLeaveService {
  if (!_proposalLeaveService) {
    _proposalLeaveService = new ProposalLeaveService()
  }
  return _proposalLeaveService
}

// ===== REACT QUERY HOOKS =====
// ===== PAID LEAVE HOOKS =====
export function useProposalsPaidLeave(
  params?: GetProposalsPaidLeaveParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_PAID_LEAVE.LIST(params || {}),
    () => getProposalLeaveService().getProposalsPaidLeave(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useProposalPaidLeave(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_PAID_LEAVE.DETAIL(id),
    () => getProposalLeaveService().getProposalPaidLeave(id),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useApproveProposalPaidLeave() {
  return useApiMutation(({ id, data }: { id: number; data?: ProposalApproveRequest }) =>
    getProposalLeaveService().approveProposalPaidLeave(id, data)
  )
}

export function useRejectProposalPaidLeave() {
  return useApiMutation(({ id, data }: { id: number; data: ProposalRejectRequest }) =>
    getProposalLeaveService().rejectProposalPaidLeave(id, data)
  )
}

export function useExportProposalsPaidLeave() {
  return useApiMutation((params?: GetProposalsPaidLeaveExportParams) =>
    getProposalLeaveService().exportProposalsPaidLeave(params)
  )
}

// ===== UNPAID LEAVE HOOKS =====
export function useProposalsUnpaidLeave(
  params?: GetProposalsUnpaidLeaveParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_UNPAID_LEAVE.LIST(params || {}),
    () => getProposalLeaveService().getProposalsUnpaidLeave(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useProposalUnpaidLeave(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_UNPAID_LEAVE.DETAIL(id),
    () => getProposalLeaveService().getProposalUnpaidLeave(id),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useApproveProposalUnpaidLeave() {
  return useApiMutation(({ id, data }: { id: number; data?: ProposalApproveRequest }) =>
    getProposalLeaveService().approveProposalUnpaidLeave(id, data)
  )
}

export function useRejectProposalUnpaidLeave() {
  return useApiMutation(({ id, data }: { id: number; data: ProposalRejectRequest }) =>
    getProposalLeaveService().rejectProposalUnpaidLeave(id, data)
  )
}

export function useExportProposalsUnpaidLeave() {
  return useApiMutation((params?: GetProposalsUnpaidLeaveExportParams) =>
    getProposalLeaveService().exportProposalsUnpaidLeave(params)
  )
}

// ===== MATERNITY LEAVE HOOKS =====
export function useProposalsMaternityLeave(
  params?: GetProposalsMaternityLeaveParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_MATERNITY_LEAVE.LIST(params || {}),
    () => getProposalLeaveService().getProposalsMaternityLeave(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useProposalMaternityLeave(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_MATERNITY_LEAVE.DETAIL(id),
    () => getProposalLeaveService().getProposalMaternityLeave(id),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useApproveProposalMaternityLeave() {
  return useApiMutation(({ id, data }: { id: number; data?: ProposalApproveRequest }) =>
    getProposalLeaveService().approveProposalMaternityLeave(id, data)
  )
}

export function useRejectProposalMaternityLeave() {
  return useApiMutation(({ id, data }: { id: number; data: ProposalRejectRequest }) =>
    getProposalLeaveService().rejectProposalMaternityLeave(id, data)
  )
}

export function useExportProposalsMaternityLeave() {
  return useApiMutation((params?: GetProposalsMaternityLeaveExportParams) =>
    getProposalLeaveService().exportProposalsMaternityLeave(params)
  )
}

// ===== POST MATERNITY BENEFITS HOOKS =====
export function useProposalsPostMaternityBenefits(
  params?: GetProposalsPostMaternityBenefitsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_POST_MATERNITY_BENEFITS.LIST(params || {}),
    () => getProposalLeaveService().getProposalsPostMaternityBenefits(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useProposalPostMaternityBenefits(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS_POST_MATERNITY_BENEFITS.DETAIL(id),
    () => getProposalLeaveService().getProposalPostMaternityBenefits(id),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useApproveProposalPostMaternityBenefits() {
  return useApiMutation(({ id, data }: { id: number; data?: ProposalApproveRequest }) =>
    getProposalLeaveService().approveProposalPostMaternityBenefits(id, data)
  )
}

export function useRejectProposalPostMaternityBenefits() {
  return useApiMutation(({ id, data }: { id: number; data: ProposalRejectRequest }) =>
    getProposalLeaveService().rejectProposalPostMaternityBenefits(id, data)
  )
}

export function useExportProposalsPostMaternityBenefits() {
  return useApiMutation((params?: GetProposalsPostMaternityBenefitsExportParams) =>
    getProposalLeaveService().exportProposalsPostMaternityBenefits(params)
  )
}

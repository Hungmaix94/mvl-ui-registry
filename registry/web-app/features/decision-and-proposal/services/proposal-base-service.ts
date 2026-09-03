import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { useQueryClient } from '@tanstack/react-query'
import type { HistoriesParams } from '@/types/hrm-types'

// ===== TYPE DEFINITIONS =====
export type Proposal = components['schemas']['Proposal']
export type ProposalApproveRequest = components['schemas']['ProposalApproveRequest']
export type ProposalRejectRequest = components['schemas']['ProposalRejectRequest']
export type GetProposalsParams = paths['/api/hrm/proposals/']['get']['parameters']['query']

export type ProposalCombined = components['schemas']['ProposalCombined']
export type PaginatedProposalCombinedList = components['schemas']['PaginatedProposalCombinedList']

// Proposal Verifiers
export type ProposalVerifier = components['schemas']['ProposalVerifier']
export type ProposalVerifierNeedVerification =
  components['schemas']['ProposalVerifierNeedVerification']
export type PaginatedProposalVerifierNeedVerificationList =
  components['schemas']['PaginatedProposalVerifierNeedVerificationList']
export type PaginatedProposalVerifierListList =
  components['schemas']['PaginatedProposalVerifierListList']
export type GetProposalVerifiersParams =
  paths['/api/hrm/proposal-verifiers/']['get']['parameters']['query']
export type GetProposalVerifiersMineParams =
  paths['/api/hrm/proposal-verifiers/mine/']['get']['parameters']['query']
export type GetProposalVerifiersMineExportParams =
  paths['/api/hrm/proposal-verifiers/mine/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class ProposalBaseService extends BaseApiService {
  // ===== PROPOSALS =====
  async getProposals(params?: GetProposalsParams) {
    return await this.getPaginated(ApiPaths.hrm_proposals_list, params)
  }

  async getProposal(id: number) {
    return await this.get(ApiPaths.hrm_proposals_retrieve, { path: { id } })
  }

  async approveProposal(id: number, data?: ProposalApproveRequest) {
    return await this.post(ApiPaths.hrm_proposals_approve_create, data || {}, {
      path: { id },
    })
  }

  async rejectProposal(id: number, data: ProposalRejectRequest) {
    return await this.post(ApiPaths.hrm_proposals_reject_create, data, { path: { id } })
  }

  async getProposalHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_proposals_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getProposalHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_proposals_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  // ===== PROPOSAL VERIFIERS =====
  async getProposalVerifiers(params?: GetProposalVerifiersParams) {
    return await this.getPaginated(ApiPaths.hrm_proposal_verifiers_list, params)
  }

  async getProposalVerifier(id: number) {
    return await this.get(ApiPaths.hrm_proposal_verifiers_retrieve, { path: { id } })
  }

  async verifyProposalVerifier(id: number, note?: string) {
    return await this.post(
      ApiPaths.hrm_proposal_verifiers_verify_create,
      { note },
      { path: { id } }
    )
  }

  async rejectProposalVerifier(id: number, note?: string) {
    return await this.post(
      ApiPaths.hrm_proposal_verifiers_reject_create,
      { note },
      { path: { id } }
    )
  }

  async exportProposalVerifiers(params?: { async?: boolean; delivery?: string; fields?: string }) {
    return await this.get(ApiPaths.hrm_proposal_verifiers_export_retrieve, { query: params })
  }

  async getProposalVerifiersMine(params?: GetProposalVerifiersMineParams) {
    return await this.getPaginated(ApiPaths.hrm_proposal_verifiers_mine_list, params)
  }

  async exportProposalVerifiersMine(params?: {
    async?: boolean
    delivery?: string
    fields?: string
  }) {
    return await this.get(ApiPaths.hrm_proposal_verifiers_mine_export_retrieve, { query: params })
  }

  async getProposalVerifierHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.hrm_proposal_verifiers_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getProposalVerifierHistoryDetail(id: number, logId: string) {
    return await this.get(ApiPaths.hrm_proposal_verifiers_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

// ===== SERVICE SINGLETON =====
let _proposalBaseService: ProposalBaseService | null = null

export function getProposalBaseService(): ProposalBaseService {
  if (!_proposalBaseService) {
    _proposalBaseService = new ProposalBaseService()
  }
  return _proposalBaseService
}

// ===== REACT QUERY HOOKS =====
export function useProposals(params?: GetProposalsParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS.LIST(params || {}),
    () => getProposalBaseService().getProposals(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useProposal(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSALS.DETAIL(id),
    () => getProposalBaseService().getProposal(id),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useApproveProposal() {
  const queryClient = useQueryClient()
  return useApiMutation(
    ({ id, data }: { id: number; data?: ProposalApproveRequest }) =>
      getProposalBaseService().approveProposal(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HRM.PROPOSALS.LIST({}) })
      },
    }
  )
}

export function useRejectProposal() {
  const queryClient = useQueryClient()
  return useApiMutation(
    ({ id, data }: { id: number; data: ProposalRejectRequest }) =>
      getProposalBaseService().rejectProposal(id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HRM.PROPOSALS.LIST({}) })
      },
    }
  )
}

// ===== PROPOSAL VERIFIERS HOOKS =====
export function useProposalVerifiers(
  params?: GetProposalVerifiersParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSAL_VERIFIERS.LIST(params || {}),
    () => getProposalBaseService().getProposalVerifiers(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useProposalVerifier(id: number) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSAL_VERIFIERS.DETAIL(id),
    () => getProposalBaseService().getProposalVerifier(id),
    { enabled: !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useVerifyProposalVerifier() {
  const queryClient = useQueryClient()
  return useApiMutation(
    ({ id, data }: { id: number; data: { note?: string | null } }) =>
      getProposalBaseService().verifyProposalVerifier(id, data.note ?? undefined),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HRM.PROPOSAL_VERIFIERS.LIST({}) })
      },
    }
  )
}

export function useRejectProposalVerifier() {
  const queryClient = useQueryClient()
  return useApiMutation(
    ({ id, data }: { id: number; data: { note: string } }) =>
      getProposalBaseService().rejectProposalVerifier(id, data.note),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.HRM.PROPOSAL_VERIFIERS.LIST({}) })
      },
    }
  )
}

export function useProposalVerifiersMine(
  params?: GetProposalVerifiersMineParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.HRM.PROPOSAL_VERIFIERS.MINE(params || {}),
    () => getProposalBaseService().getProposalVerifiersMine(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useExportProposalVerifiersMine(
  params?: GetProposalVerifiersMineExportParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['hrm', 'proposal-verifiers', 'mine', 'export', JSON.stringify(params || {})],
    () => getProposalBaseService().exportProposalVerifiersMine(params),
    { staleTime: 0, enabled: options?.enabled ?? true }
  )
}

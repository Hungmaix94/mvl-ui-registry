import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { useExport } from '@/hooks/useExport'
import type { HistoriesParams } from '@/types/hrm-types'
import { useQueryClient } from '@tanstack/react-query'

// ===== TYPE DEFINITIONS =====
export type PenaltyTicket = components['schemas']['PenaltyTicket']
export type PenaltyTicketRequest = components['schemas']['PenaltyTicketRequest']
export type PenaltyTicketUpdate = components['schemas']['PenaltyTicketUpdate']
export type PenaltyTicketUpdateRequest = components['schemas']['PenaltyTicketUpdateRequest']
export type PatchedPenaltyTicketUpdateRequest =
  components['schemas']['PatchedPenaltyTicketUpdateRequest']
export type PaginatedPenaltyTicketList = components['schemas']['PaginatedPenaltyTicketList']
export type BulkUpdatePenaltyTicketStatusRequest = components['schemas']['BulkUpdateStatusRequest']

export type GetPenaltyTicketsParams =
  paths['/api/payroll/penalty-tickets/']['get']['parameters']['query']
export type GetPenaltyTicketsExportParams =
  paths['/api/payroll/penalty-tickets/export/']['get']['parameters']['query']

// ===== SERVICE CLASS =====
export class PenaltyTicketService extends BaseApiService {
  /**
   * Get all penalty tickets
   */
  async getPenaltyTickets(params?: GetPenaltyTicketsParams) {
    return await this.getPaginated(ApiPaths.payroll_penalty_tickets_list, params)
  }

  /**
   * Create a new penalty ticket
   */
  async createPenaltyTicket(data: PenaltyTicketRequest) {
    return await this.post(ApiPaths.payroll_penalty_tickets_create, data)
  }

  /**
   * Get penalty ticket by ID
   */
  async getPenaltyTicket(id: number) {
    return await this.get(ApiPaths.payroll_penalty_tickets_retrieve, {
      path: { id },
    })
  }

  /**
   * Update penalty ticket
   */
  async updatePenaltyTicket(id: number, data: PenaltyTicketUpdateRequest) {
    return await this.put(ApiPaths.payroll_penalty_tickets_update, data, { path: { id } })
  }

  /**
   * Partially update penalty ticket
   */
  async partialUpdatePenaltyTicket(id: number, data: PatchedPenaltyTicketUpdateRequest) {
    return await this.patch(ApiPaths.payroll_penalty_tickets_partial_update, data, {
      path: { id },
    })
  }

  /**
   * Delete penalty ticket
   */
  async deletePenaltyTicket(id: number) {
    return await this.delete(ApiPaths.payroll_penalty_tickets_destroy, { path: { id } })
  }

  /**
   * Bulk update penalty ticket payment status
   */
  async bulkUpdatePenaltyTicketStatus(data: BulkUpdatePenaltyTicketStatusRequest) {
    return await this.post(ApiPaths.payroll_penalty_tickets_bulk_update_status_create, data)
  }

  /**
   * Get penalty ticket histories
   */
  async getPenaltyTicketHistories(id: number, params?: HistoriesParams) {
    return await this.get(ApiPaths.payroll_penalty_tickets_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  /**
   * Get penalty ticket history detail
   */
  async getPenaltyTicketHistory(id: number, logId: string) {
    return await this.get(ApiPaths.payroll_penalty_tickets_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  /**
   * Export penalty tickets to XLSX
   */
  async exportPenaltyTickets(params?: GetPenaltyTicketsExportParams) {
    return await this.get(ApiPaths.payroll_penalty_tickets_export_retrieve, {
      query: params,
    })
  }
}

// ===== SERVICE SINGLETON =====
let _penaltyTicketService: PenaltyTicketService | null = null

export function getPenaltyTicketService(): PenaltyTicketService {
  if (!_penaltyTicketService) {
    _penaltyTicketService = new PenaltyTicketService()
  }
  return _penaltyTicketService
}

// ===== REACT QUERY HOOKS =====
export function usePenaltyTickets(
  params?: GetPenaltyTicketsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.PENALTY_TICKETS.LIST(params || {}),
    () => getPenaltyTicketService().getPenaltyTickets(params),
    {
      staleTime: 1000 * 60 * 5, // 5 minutes
      ...options,
    }
  )
}

export function usePenaltyTicket(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.PENALTY_TICKETS.DETAIL(id),
    () => getPenaltyTicketService().getPenaltyTicket(id),
    {
      enabled: options?.enabled !== false && !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useCreatePenaltyTicket() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (data: PenaltyTicketRequest) => getPenaltyTicketService().createPenaltyTicket(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['payroll', 'penalty-tickets', 'list'],
        })
      },
    }
  )
}

export function useUpdatePenaltyTicket() {
  const queryClient = useQueryClient()
  return useApiMutation(
    ({ id, data }: { id: number; data: PenaltyTicketUpdateRequest }) =>
      getPenaltyTicketService().updatePenaltyTicket(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.PENALTY_TICKETS.DETAIL(variables.id),
        })
        queryClient.invalidateQueries({
          queryKey: ['payroll', 'penalty-tickets', 'list'],
        })
      },
    }
  )
}

export function usePartialUpdatePenaltyTicket() {
  const queryClient = useQueryClient()
  return useApiMutation(
    ({ id, data }: { id: number; data: PatchedPenaltyTicketUpdateRequest }) =>
      getPenaltyTicketService().partialUpdatePenaltyTicket(id, data),
    {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.PAYROLL.PENALTY_TICKETS.DETAIL(variables.id),
        })
        queryClient.invalidateQueries({
          queryKey: ['payroll', 'penalty-tickets', 'list'],
        })
      },
    }
  )
}

export function useDeletePenaltyTicket() {
  const queryClient = useQueryClient()
  return useApiMutation((id: number) => getPenaltyTicketService().deletePenaltyTicket(id), {
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['payroll', 'penalty-tickets', 'list'],
      })
    },
  })
}

export function useBulkUpdatePenaltyTicketStatus() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (data: BulkUpdatePenaltyTicketStatusRequest) =>
      getPenaltyTicketService().bulkUpdatePenaltyTicketStatus(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['payroll', 'penalty-tickets', 'list'],
        })
      },
    }
  )
}

export function usePenaltyTicketHistories(id: number, params?: HistoriesParams) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.PENALTY_TICKETS.HISTORIES(id, params || {}),
    () => getPenaltyTicketService().getPenaltyTicketHistories(id, params),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function usePenaltyTicketHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.PAYROLL.PENALTY_TICKETS.HISTORY_DETAIL(id, logId),
    () => getPenaltyTicketService().getPenaltyTicketHistory(id, logId),
    {
      enabled: options?.enabled !== false && !!id && !!logId,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  )
}

export function useExportPenaltyTickets() {
  return useExport({
    exportFunction: (params?: GetPenaltyTicketsExportParams) =>
      getPenaltyTicketService().exportPenaltyTickets(params),
    defaultFilename: 'penalty-tickets',
  })
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { BaseApiService } from '@/api/base-service'
import type { components, operations } from '@/api/schema'
import { ApiPaths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'

import { type TransactionSheet } from '../types/transaction-sheet'

type GetTransactionSheetsParams = operations['sales_transaction_sheets_list']['parameters']['query']

export type TransactionSaleType = NonNullable<components['schemas']['TransactionSale']['sale_type']>
type TransactionSheetRequest = components['schemas']['TransactionSheetRequest']
type PatchedTransactionSheetRequest = components['schemas']['PatchedTransactionSheetRequest']

export class TransactionSheetService extends BaseApiService {
  public async getTransactionSheets(params?: GetTransactionSheetsParams) {
    return await this.getPaginated(ApiPaths.sales_transaction_sheets_list, params)
  }

  public async getTransactionSheet(id: number) {
    return await this.get(ApiPaths.sales_transaction_sheets_retrieve, {
      path: { id },
    })
  }

  public async createTransactionSheet(data: TransactionSheetRequest): Promise<TransactionSheet> {
    return await this.post(ApiPaths.sales_transaction_sheets_list, data)
  }

  public async updateTransactionSheet({
    id,
    data,
  }: {
    id: number
    data: PatchedTransactionSheetRequest
  }): Promise<TransactionSheet> {
    return await this.patch(ApiPaths.sales_transaction_sheets_partial_update, data, {
      path: { id },
    })
  }

  public async approveTransactionSheet({ id, note }: { id: number; note?: string }) {
    return await this.post(
      ApiPaths.sales_transaction_sheets_approve_create,
      { note: note || '' } as any,
      {
        path: { id },
      }
    )
  }

  public async adminLeadApproveTransactionSheet({
    id,
    is_approved,
    note,
  }: {
    id: number
    is_approved: boolean
    note?: string
  }) {
    return await this.post(
      ApiPaths.sales_transaction_sheets_admin_lead_approve_create,
      { is_approved, note: note || '' } as any,
      {
        path: { id },
      }
    )
  }

  public async managerConfirmTransactionSheet({
    id,
    is_approved,
    note,
  }: {
    id: number
    is_approved: boolean
    note?: string
  }) {
    return await this.post(
      ApiPaths.sales_transaction_sheets_manager_confirm_create,
      { is_approved, note: note || '' } as any,
      {
        path: { id },
      }
    )
  }

  public async rejectTransactionSheet({ id, note }: { id: number; note: string }) {
    return await this.post(ApiPaths.sales_transaction_sheets_reject_create, { note } as any, {
      path: { id },
    })
  }

  public async getTransactionSheetDropdown(
    params?: operations['sales_transaction_sheets_dropdown_list']['parameters']['query']
  ) {
    return await this.getPaginated(ApiPaths.sales_transaction_sheets_dropdown_list, params)
  }
  public async deleteTransactionSheet(id: number): Promise<void> {
    return await this.delete(ApiPaths.sales_transaction_sheets_destroy, {
      path: { id },
    })
  }
}

export const transactionSheetService = new TransactionSheetService()
const TRANSACTION_SHEET_LIST_QUERY_KEY = ['sales', 'transaction-sheets', 'list'] as const

export const useTransactionSheets = (
  params?: GetTransactionSheetsParams,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: QUERY_KEYS.SALES.TRANSACTION_SHEETS.LIST((params as Record<string, unknown>) || {}),
    queryFn: () => transactionSheetService.getTransactionSheets(params),
    enabled,
  })
}

export const useTransactionSheet = (id?: number, enabled: boolean = true) => {
  return useQuery({
    queryKey: QUERY_KEYS.SALES.TRANSACTION_SHEETS.DETAIL(id as number),
    queryFn: () => transactionSheetService.getTransactionSheet(id as number),
    enabled: enabled && !!id,
  })
}

export const useCreateTransactionSheet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: TransactionSheetRequest) =>
      transactionSheetService.createTransactionSheet(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTION_SHEET_LIST_QUERY_KEY })
    },
  })
}

export const useUpdateTransactionSheet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: { id: number; data: PatchedTransactionSheetRequest }) =>
      transactionSheetService.updateTransactionSheet(variables),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TRANSACTION_SHEET_LIST_QUERY_KEY })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.SALES.TRANSACTION_SHEETS.DETAIL(variables.id),
      })
    },
  })
}

export const useDeleteTransactionSheet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => transactionSheetService.deleteTransactionSheet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTION_SHEET_LIST_QUERY_KEY })
    },
  })
}

export const useApproveTransactionSheet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: { id: number; note?: string }) =>
      transactionSheetService.approveTransactionSheet(variables),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TRANSACTION_SHEET_LIST_QUERY_KEY })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.SALES.TRANSACTION_SHEETS.DETAIL(variables.id),
      })
    },
  })
}

export const useAdminLeadApproveTransactionSheet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: { id: number; is_approved: boolean; note?: string }) =>
      transactionSheetService.adminLeadApproveTransactionSheet(variables),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TRANSACTION_SHEET_LIST_QUERY_KEY })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.SALES.TRANSACTION_SHEETS.DETAIL(variables.id),
      })
    },
  })
}

export const useManagerConfirmTransactionSheet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: { id: number; is_approved: boolean; note?: string }) =>
      transactionSheetService.managerConfirmTransactionSheet(variables),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TRANSACTION_SHEET_LIST_QUERY_KEY })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.SALES.TRANSACTION_SHEETS.DETAIL(variables.id),
      })
    },
  })
}

export const useRejectTransactionSheet = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (variables: { id: number; note: string }) =>
      transactionSheetService.rejectTransactionSheet(variables),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: TRANSACTION_SHEET_LIST_QUERY_KEY })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.SALES.TRANSACTION_SHEETS.DETAIL(variables.id),
      })
    },
  })
}

type GetTransactionSheetDropdownParams =
  operations['sales_transaction_sheets_dropdown_list']['parameters']['query']

export const useTransactionSheetDropdown = (
  params?: GetTransactionSheetDropdownParams,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: QUERY_KEYS.SALES.TRANSACTION_SHEETS.DROPDOWN(params || {}),
    queryFn: () => transactionSheetService.getTransactionSheetDropdown(params),
    enabled,
  })
}

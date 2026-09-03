import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import { useQueryClient } from '@tanstack/react-query'
import { DealPaymentSuspensionStatus } from '@/constants/api-schema-aliases'

export type DealPaymentSuspension = components['schemas']['DealPaymentSuspension']
export type DealPaymentSuspensionCreateRequest =
  components['schemas']['DealPaymentSuspensionCreateRequest']
export type DealPaymentSuspensionReleaseRequest =
  components['schemas']['DealPaymentSuspensionReleaseRequest']

class DealPaymentSuspensionsService extends BaseApiService {
  async createSuspension(payload: DealPaymentSuspensionCreateRequest) {
    return await this.post(ApiPaths.accounting_deal_payment_suspensions_create, payload)
  }

  async releaseSuspension(pbtvId: number | string, payload: DealPaymentSuspensionReleaseRequest) {
    const activeSuspension = await this.getActiveSuspensionForPbtv(Number(pbtvId))
    if (!activeSuspension) {
      throw new Error('Không tìm thấy yêu cầu tạm ngưng đang hoạt động cho giao dịch này.')
    }
    return await this.post(ApiPaths.accounting_deal_payment_suspensions_release_create, payload, {
      path: { id: Number(activeSuspension.id) },
    })
  }

  async getActiveSuspensionForPbtv(pbtvId: number) {
    const res = await this.get(ApiPaths.accounting_deal_payment_suspensions_list, {
      query: {
        pbtv_id: pbtvId,
        status: DealPaymentSuspensionStatus.ACTIVE,
      } as any,
    })
    return res?.results?.[0]
  }

  async getSuspension(id: number) {
    return await this.get(ApiPaths.accounting_deal_payment_suspensions_retrieve, {
      path: { id },
    })
  }

  async getSuspensions(
    params?: paths['/api/accounting/deal-payment-suspensions/']['get']['parameters']['query']
  ) {
    return await this.get(ApiPaths.accounting_deal_payment_suspensions_list, {
      query: params,
    })
  }
}

let _service: DealPaymentSuspensionsService | null = null

export function getDealPaymentSuspensionsService(): DealPaymentSuspensionsService {
  if (!_service) _service = new DealPaymentSuspensionsService()
  return _service
}

export function useCreatePaymentSuspension() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (payload: DealPaymentSuspensionCreateRequest) =>
      getDealPaymentSuspensionsService().createSuspension(payload),
    {
      onSuccess: () => {
        // Invalidate list to reflect the new state
        queryClient.invalidateQueries({
          queryKey: ['accounting', 'commission-splits'],
        })
        queryClient.invalidateQueries({
          queryKey: ['accounting', 'deal-period-allocation-worksheets'],
        })
      },
    }
  )
}

export function useReleasePaymentSuspension() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (variables: { pbtv_id: number; payload: DealPaymentSuspensionReleaseRequest }) =>
      getDealPaymentSuspensionsService().releaseSuspension(variables.pbtv_id, variables.payload),
    {
      onSuccess: () => {
        // Invalidate list to reflect the new state
        queryClient.invalidateQueries({
          queryKey: ['accounting', 'commission-splits'],
        })
        queryClient.invalidateQueries({
          queryKey: ['accounting', 'deal-period-allocation-worksheets'],
        })
      },
    }
  )
}

export function useDealPaymentSuspension(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DEAL_PAYMENT_SUSPENSIONS.DETAIL(id),
    () => getDealPaymentSuspensionsService().getSuspension(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useDealPaymentSuspensions(
  params?: paths['/api/accounting/deal-payment-suspensions/']['get']['parameters']['query'],
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.DEAL_PAYMENT_SUSPENSIONS.LIST(params || {}),
    () => getDealPaymentSuspensionsService().getSuspensions(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

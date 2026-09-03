import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type BrokerCertificate = components['schemas']['BrokerCertificate']
export type BrokerCertificateRequest = components['schemas']['BrokerCertificateRequest']
export type PatchedBrokerCertificateRequest =
  components['schemas']['PatchedBrokerCertificateRequest']
export type GetBrokerCertificatesParams = NonNullable<
  paths['/api/accounting/broker-certificates/']['get']['parameters']['query']
>
export type BrokerCertificateRevokeRequest = components['schemas']['BrokerCertificateRevokeRequest']
export type GetBrokerCertificatesExpiringSoonParams = NonNullable<
  paths['/api/accounting/broker-certificates/expiring_soon/']['get']['parameters']['query']
>

class BrokerCertificateService extends BaseApiService {
  async getBrokerCertificates(params?: GetBrokerCertificatesParams) {
    return await this.getPaginated(ApiPaths.accounting_broker_certificates_list, params)
  }

  async createBrokerCertificate(data: BrokerCertificateRequest) {
    return await this.post(ApiPaths.accounting_broker_certificates_create, data)
  }

  async getBrokerCertificate(id: number) {
    return await this.get(ApiPaths.accounting_broker_certificates_retrieve, { path: { id } })
  }

  async updateBrokerCertificate(id: number, data: BrokerCertificateRequest) {
    return await this.put(ApiPaths.accounting_broker_certificates_update, data, { path: { id } })
  }

  async partialUpdateBrokerCertificate(id: number, data: PatchedBrokerCertificateRequest) {
    return await this.patch(ApiPaths.accounting_broker_certificates_partial_update, data, {
      path: { id },
    })
  }

  async deleteBrokerCertificate(id: number) {
    return await this.delete(ApiPaths.accounting_broker_certificates_destroy, { path: { id } })
  }

  async revokeBrokerCertificate(id: number, data: BrokerCertificateRevokeRequest) {
    return await this.post(ApiPaths.accounting_broker_certificates_revoke_create, data, {
      path: { id },
    })
  }

  async getBrokerCertificatesExpiringSoon(params?: GetBrokerCertificatesExpiringSoonParams) {
    return await this.getPaginated(
      ApiPaths.accounting_broker_certificates_expiring_soon_list,
      params
    )
  }

  async getBrokerCertificateHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_broker_certificates_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getBrokerCertificateHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_broker_certificates_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

let _service: BrokerCertificateService | null = null

export function getBrokerCertificateService(): BrokerCertificateService {
  if (!_service) _service = new BrokerCertificateService()
  return _service
}

export function useBrokerCertificates(
  params?: GetBrokerCertificatesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.BROKER_CERTIFICATES.LIST(params || {}),
    () => getBrokerCertificateService().getBrokerCertificates(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useBrokerCertificate(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.BROKER_CERTIFICATES.DETAIL(id),
    () => getBrokerCertificateService().getBrokerCertificate(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateBrokerCertificate() {
  return useApiMutation((data: BrokerCertificateRequest) =>
    getBrokerCertificateService().createBrokerCertificate(data)
  )
}

export function useUpdateBrokerCertificate() {
  return useApiMutation((variables: { id: number; data: BrokerCertificateRequest }) =>
    getBrokerCertificateService().updateBrokerCertificate(variables.id, variables.data)
  )
}

export function usePartialUpdateBrokerCertificate() {
  return useApiMutation((variables: { id: number; data: PatchedBrokerCertificateRequest }) =>
    getBrokerCertificateService().partialUpdateBrokerCertificate(variables.id, variables.data)
  )
}

export function useDeleteBrokerCertificate() {
  return useApiMutation((id: number) => getBrokerCertificateService().deleteBrokerCertificate(id))
}

export function useRevokeBrokerCertificate() {
  return useApiMutation((variables: { id: number; data: BrokerCertificateRevokeRequest }) =>
    getBrokerCertificateService().revokeBrokerCertificate(variables.id, variables.data)
  )
}

export function useBrokerCertificatesExpiringSoon(
  params?: GetBrokerCertificatesExpiringSoonParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.BROKER_CERTIFICATES.EXPIRING_SOON(params || {}),
    () => getBrokerCertificateService().getBrokerCertificatesExpiringSoon(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useBrokerCertificateHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.BROKER_CERTIFICATES.HISTORIES(id, params || {}),
    () => getBrokerCertificateService().getBrokerCertificateHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useBrokerCertificateHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.BROKER_CERTIFICATES.HISTORY_DETAIL(id, logId),
    () => getBrokerCertificateService().getBrokerCertificateHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

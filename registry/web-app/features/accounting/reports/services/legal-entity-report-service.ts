import { BaseApiService } from '@/api/base-service'
import type {
  GetLegalEntityCommissionDebtParams,
  GetLegalEntityInvoiceDebtParams,
  LegalEntityCommissionDebtResponse,
  LegalEntityInvoiceDebtResponse,
} from '@/api/schema-accounting-reports-compat'
import { useApiQuery } from '@/hooks/useApiQuery'

/** Xem `schema-accounting-reports-compat.ts` — type tạm cho nhóm report bị mất annotation. */
export type {
  GetLegalEntityCommissionDebtParams,
  GetLegalEntityInvoiceDebtParams,
  LegalEntityCommissionDebtResponse,
  LegalEntityCommissionDebtRow,
  LegalEntityInvoiceDebtResponse,
  LegalEntityInvoiceDebtRow,
} from '@/api/schema-accounting-reports-compat'

class LegalEntityReportService extends BaseApiService {
  async getCommissionDebt(
    params?: GetLegalEntityCommissionDebtParams
  ): Promise<LegalEntityCommissionDebtResponse> {
    const response = await this.get(
      '/api/accounting/reports/legal-entity-commission-debt/' as any,
      {
        query: params,
      }
    )
    return (response || { results: [] }) as any
  }

  async getInvoiceDebt(
    params?: GetLegalEntityInvoiceDebtParams
  ): Promise<LegalEntityInvoiceDebtResponse> {
    const response = await this.get('/api/accounting/reports/legal-entity-invoice-debt/' as any, {
      query: params,
    })
    return (response || { results: [] }) as any
  }
}

let _service: LegalEntityReportService | null = null

export function getLegalEntityReportService(): LegalEntityReportService {
  if (!_service) _service = new LegalEntityReportService()
  return _service
}

export function useLegalEntityCommissionDebt(
  params?: GetLegalEntityCommissionDebtParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery<LegalEntityCommissionDebtResponse>(
    ['accounting', 'reports', 'legal-entity-commission-debt', JSON.stringify(params || {})],
    () => getLegalEntityReportService().getCommissionDebt(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useLegalEntityInvoiceDebt(
  params?: GetLegalEntityInvoiceDebtParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery<LegalEntityInvoiceDebtResponse>(
    ['accounting', 'reports', 'legal-entity-invoice-debt', JSON.stringify(params || {})],
    () => getLegalEntityReportService().getInvoiceDebt(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

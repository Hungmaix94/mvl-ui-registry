import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiQuery } from '@/hooks/useApiQuery'

export type DepositCumulativeResponse = components['schemas']['DepositCumulativeResponse']
export type DepositCumulativeWeek = components['schemas']['DepositCumulativeWeek']

/**
 * API params for the deposit-cumulative reports. `year`+`month` are required by BE
 * (they define the Mon-Sun week columns); the builder returns `undefined` until both
 * are present so callers can disable the query. `branch`/`block`/`department` are the
 * optional org-chart scope (resolved via the deposit contract's source department).
 */
export type DepositCumulativeParams = {
  year?: number
  month?: number
  branch?: number
  block?: number
  department?: number
  /** Independent filter (AND-able), keyed off active TransactionSheet.created date. */
  transaction_sheet_date_from?: string
  transaction_sheet_date_to?: string
}

class DepositCumulativeService extends BaseApiService {
  async getByBranch(params: DepositCumulativeParams) {
    return await this.get(ApiPaths.sales_reports_deposit_cumulative_by_branch_retrieve, {
      query: params,
    })
  }

  async getByBlock(params: DepositCumulativeParams) {
    return await this.get(ApiPaths.sales_reports_deposit_cumulative_by_block_retrieve, {
      query: params,
    })
  }

  private async downloadXlsx(
    path: ApiPaths,
    query: Record<string, unknown>,
    filename: string
  ): Promise<void> {
    const response = (await (this.client.GET as never as (path: string, init: unknown) => unknown)(
      path,
      { params: { query }, parseAs: 'blob' }
    )) as { data?: Blob; error?: unknown }

    if (response.error) throw response.error

    const blob = response.data as Blob
    const url = window.URL.createObjectURL(new Blob([blob]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  async exportByBranch(
    params: DepositCumulativeParams,
    filename = 'deposit-cumulative-by-branch.xlsx'
  ): Promise<void> {
    await this.downloadXlsx(
      ApiPaths.sales_reports_deposit_cumulative_by_branch_retrieve,
      { ...params, export: 'xlsx' },
      filename
    )
  }

  async exportByBlock(
    params: DepositCumulativeParams,
    filename = 'deposit-cumulative-by-block.xlsx'
  ): Promise<void> {
    await this.downloadXlsx(
      ApiPaths.sales_reports_deposit_cumulative_by_block_retrieve,
      { ...params, export: 'xlsx' },
      filename
    )
  }
}

let _service: DepositCumulativeService | null = null

export function getDepositCumulativeService(): DepositCumulativeService {
  if (!_service) _service = new DepositCumulativeService()
  return _service
}

// `buildDepositCumulativeParams` already returns `undefined` until year+month are set,
// so the hooks gate on `!!params` only.
export function useDepositCumulativeByBranch(
  params: DepositCumulativeParams | undefined,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.DEPOSIT_CUMULATIVE.BY_BRANCH(params ?? {}),
    () => getDepositCumulativeService().getByBranch(params!),
    { enabled: (options?.enabled ?? true) && !!params }
  )
}

export function useDepositCumulativeByBlock(
  params: DepositCumulativeParams | undefined,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.DEPOSIT_CUMULATIVE.BY_BLOCK(params ?? {}),
    () => getDepositCumulativeService().getByBlock(params!),
    { enabled: (options?.enabled ?? true) && !!params }
  )
}

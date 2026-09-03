import { parsePositiveInt } from '@/utils/common'
import { LadDebtRateSource } from '@/constants/api-schema-aliases'

/**
 * 21.5 — Công nợ CĐT theo Lô áp dụng. `project_id`/`investor_id` áp dụng cho cả 2 tab;
 * `deal_id`/`rate_source` chỉ có tác dụng ở tab "Theo giao dịch" (BE bỏ qua ở tab dự án, D9).
 */
export type LadDebtFilterValues = {
  projectId: number | null
  investorId: number | null
  dealId: number | null
  rateSource: LadDebtRateSource | null
  hasOutstanding: boolean
}

export const LAD_DEBT_DEFAULT_FILTER_VALUES: LadDebtFilterValues = {
  projectId: null,
  investorId: null,
  dealId: null,
  rateSource: null,
  hasOutstanding: false,
}

export const RATE_SOURCE_LABELS: Record<LadDebtRateSource, string> = {
  [LadDebtRateSource.pending_lad]: 'Lô áp dụng đang chờ duyệt',
  [LadDebtRateSource.current_config]: 'Cấu hình hoa hồng hiện tại',
  [LadDebtRateSource.no_basis]: 'Chưa có căn cứ tính',
}

const RATE_SOURCE_VALUES = new Set<string>(Object.values(LadDebtRateSource))

export function parseLadDebtFilters(params: URLSearchParams): LadDebtFilterValues {
  const rateSourceRaw = params.get('rate_source')
  return {
    projectId: parsePositiveInt(params.get('project_id')) ?? null,
    investorId: parsePositiveInt(params.get('investor_id')) ?? null,
    dealId: parsePositiveInt(params.get('deal_id')) ?? null,
    rateSource:
      rateSourceRaw && RATE_SOURCE_VALUES.has(rateSourceRaw)
        ? (rateSourceRaw as LadDebtRateSource)
        : null,
    hasOutstanding: params.get('has_outstanding') === '1',
  }
}

export function buildLadDebtFilterParams(
  prev: URLSearchParams,
  values: LadDebtFilterValues
): URLSearchParams {
  const next = new URLSearchParams(prev)

  const setOrDelete = (key: string, value: string | null) => {
    if (value) next.set(key, value)
    else next.delete(key)
  }

  setOrDelete('project_id', values.projectId ? String(values.projectId) : null)
  setOrDelete('investor_id', values.investorId ? String(values.investorId) : null)
  setOrDelete('deal_id', values.dealId ? String(values.dealId) : null)
  setOrDelete('rate_source', values.rateSource)
  setOrDelete('has_outstanding', values.hasOutstanding ? '1' : null)

  return next
}

export function countActiveLadDebtFilters(params: URLSearchParams): number {
  let count = 0
  if (params.get('project_id')) count++
  if (params.get('investor_id')) count++
  if (params.get('deal_id')) count++
  if (params.get('rate_source')) count++
  if (params.get('has_outstanding') === '1') count++
  return count
}

import type { TkkdRevenueGoodsParams } from '@/features/sales/tkkd-reports/services/tkkd-report-service'
import { RecruitmentReportPeriodType as ApiPeriodType } from '@/constants/api-schema-aliases'

/** UI-side period mode. Mapped to the schema enum only when building the API params. */
export type TkkdPeriodType = 'month' | 'week'

export type TkkdReportFilterInput = {
  periodType: TkkdPeriodType
  year?: number
  month?: number
  week?: string
  contractDateFrom?: string
  contractDateTo?: string
  /** Ngày làm phiếu TTGD — bộ lọc ĐỘC LẬP với contractDateFrom/To, cộng thêm (AND). */
  transactionSheetDateFrom?: string
  transactionSheetDateTo?: string
  branch?: number
  block?: number
  department?: number
}

/**
 * Pure builder for the API params from filter state. Returns `undefined` when the
 * required period key is missing (week mode needs `week`; month mode needs
 * `year`+`month`), which callers use to disable the query.
 *
 * Kept free of any React runtime import so it is unit-testable in isolation.
 */
export function buildTkkdReportParams(
  input: TkkdReportFilterInput
): TkkdRevenueGoodsParams | undefined {
  const org = {
    ...(input.branch ? { branch: input.branch } : {}),
    ...(input.block ? { block: input.block } : {}),
    ...(input.department ? { department: input.department } : {}),
    ...(input.contractDateFrom ? { contract_date_from: input.contractDateFrom } : {}),
    ...(input.contractDateTo ? { contract_date_to: input.contractDateTo } : {}),
    ...(input.transactionSheetDateFrom
      ? { transaction_sheet_date_from: input.transactionSheetDateFrom }
      : {}),
    ...(input.transactionSheetDateTo
      ? { transaction_sheet_date_to: input.transactionSheetDateTo }
      : {}),
  }
  if (input.periodType === 'week') {
    if (!input.week) return undefined
    return { period_type: ApiPeriodType.week, week: input.week, ...org }
  }
  if (!input.year || !input.month) return undefined
  return { year: input.year, month: input.month, ...org }
}

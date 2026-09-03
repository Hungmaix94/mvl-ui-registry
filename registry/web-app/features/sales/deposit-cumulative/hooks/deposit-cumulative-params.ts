import type { DepositCumulativeParams } from '@/features/sales/deposit-cumulative/services/deposit-cumulative-service'

export type DepositCumulativeFilterInput = {
  year?: number
  month?: number
  branch?: number
  block?: number
  department?: number
  /** Ngày làm phiếu TTGD — bộ lọc ĐỘC LẬP, cộng thêm (AND), không ghi đè bộ lọc nào khác. */
  transactionSheetDateFrom?: string
  transactionSheetDateTo?: string
}

/**
 * Pure builder for the deposit-cumulative API params. Returns `undefined` when
 * `year` or `month` is missing (both are required by BE — they define the report's
 * week columns), which callers use to disable the query. Falsy org ids are omitted.
 *
 * Kept free of any React runtime import so it is unit-testable in isolation.
 */
export function buildDepositCumulativeParams(
  input: DepositCumulativeFilterInput
): DepositCumulativeParams | undefined {
  if (!input.year || !input.month) return undefined
  return {
    year: input.year,
    month: input.month,
    ...(input.branch ? { branch: input.branch } : {}),
    ...(input.block ? { block: input.block } : {}),
    ...(input.department ? { department: input.department } : {}),
    ...(input.transactionSheetDateFrom
      ? { transaction_sheet_date_from: input.transactionSheetDateFrom }
      : {}),
    ...(input.transactionSheetDateTo
      ? { transaction_sheet_date_to: input.transactionSheetDateTo }
      : {}),
  }
}

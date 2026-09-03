import { ReportPaymentStatus as ReportPaymentStatus } from '@/constants/api-schema-aliases'
/**
 * Payment-status filter shared by the recruitment cost reports (cost-by-payer,
 * cost-by-source, referral-cost). The backend reuses one enum for all of them:
 * `PAID` (đã chi) / `EXPECTED` (dự kiến) / `ALL` (tổng = đã chi + dự kiến).
 *
 * Labels live here (not in `useAppConstant`) because the server-side
 * `RecruitmentExpensePaymentStatus` constant only covers PAID/EXPECTED — it has
 * no `ALL` entry — so it cannot drive the 3-option report filter.
 */
export { ReportPaymentStatus }

export const REPORT_PAYMENT_STATUS_LABEL: Record<ReportPaymentStatus, string> = {
  [ReportPaymentStatus.PAID]: 'Đã chi',
  [ReportPaymentStatus.EXPECTED]: 'Dự kiến',
  [ReportPaymentStatus.ALL]: 'Tổng (đã chi + dự kiến)',
}

export const REPORT_PAYMENT_STATUS_OPTIONS: ReadonlyArray<{
  value: ReportPaymentStatus
  label: string
}> = [
  { value: ReportPaymentStatus.PAID, label: REPORT_PAYMENT_STATUS_LABEL[ReportPaymentStatus.PAID] },
  {
    value: ReportPaymentStatus.EXPECTED,
    label: REPORT_PAYMENT_STATUS_LABEL[ReportPaymentStatus.EXPECTED],
  },
  { value: ReportPaymentStatus.ALL, label: REPORT_PAYMENT_STATUS_LABEL[ReportPaymentStatus.ALL] },
]

/**
 * Narrow an arbitrary URL/string value to a valid {@link ReportPaymentStatus},
 * returning the typed enum member (or `undefined`). Avoids `as` casting at call
 * sites when reading the value out of search params.
 */
export function parseReportPaymentStatus(
  raw: string | null | undefined
): ReportPaymentStatus | undefined {
  if (!raw) return undefined
  return Object.values(ReportPaymentStatus).find((value) => String(value) === raw)
}

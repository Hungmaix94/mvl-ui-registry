import { MonthlySummaryStatus as MonthlyStatus } from '@/constants/api-schema-aliases'
export function canShowConfirmMonthlyButton(status: string | null | undefined): boolean {
  return status === MonthlyStatus.DRAFT || status === 'DRAFT'
}

export function hasAdvanceDeductionAction(actions: Array<{ label: string }>): boolean {
  return actions.some((a) => a.label === 'Trừ hoàn ứng')
}

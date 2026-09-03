import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { MonthlySummaryStatus as MonthlyBeneficiaryCommissionSummaryStatus } from '@/constants/api-schema-aliases'

const STATUS_VARIANTS: Record<MonthlyBeneficiaryCommissionSummaryStatus, ColoredValueVariant> = {
  [MonthlyBeneficiaryCommissionSummaryStatus.DRAFT]: ColoredValueVariant.GREY,
  [MonthlyBeneficiaryCommissionSummaryStatus.CONFIRMED]: ColoredValueVariant.BLUE,
  // Regen 2026-07-27: BE thêm EMAIL_SENT — bước trung gian sau CONFIRMED, trước
  // PAID (đã gửi phiếu, chờ chi) nên dùng ORANGE như các trạng thái "đang chờ".
  [MonthlyBeneficiaryCommissionSummaryStatus.EMAIL_SENT]: ColoredValueVariant.ORANGE,
  [MonthlyBeneficiaryCommissionSummaryStatus.PAID]: ColoredValueVariant.GREEN,
}

type Props = {
  status: MonthlyBeneficiaryCommissionSummaryStatus | string
  className?: string
}

export function MonthlySummaryStatusBadge({ status, className }: Props) {
  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.MONTHLY_BENEFICIARY_COMMISSION_SUMMARY_STATUS_CHOICES],
  })

  const statusLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.MONTHLY_BENEFICIARY_COMMISSION_SUMMARY_STATUS_CHOICES
  ) as Record<string, string> | null

  const label = statusLabels?.[status] ?? status

  const variant =
    STATUS_VARIANTS[status as MonthlyBeneficiaryCommissionSummaryStatus] ?? ColoredValueVariant.GREY

  return <Chip label={label} variant={variant} size="small" className={className} />
}

export default MonthlySummaryStatusBadge

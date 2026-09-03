import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'

const STATUS_VARIANTS: Record<string, ColoredValueVariant> = {
  draft: ColoredValueVariant.GREY,
  pending_alloc: ColoredValueVariant.YELLOW,
  allocated: ColoredValueVariant.BLUE,
  paid: ColoredValueVariant.GREEN,
  confirmed: ColoredValueVariant.BLUE,
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'Chờ chốt',
  pending_alloc: 'Chờ phân bổ',
  allocated: 'Đã phân bổ',
  paid: 'Đã chi NV',
  confirmed: 'Đã xác nhận',
}

type Props = {
  status: string
  className?: string
}

export function DepartmentMonthlyKpiStatusBadge({ status, className }: Props) {
  const label = STATUS_LABELS[status] ?? status
  const variant = STATUS_VARIANTS[status] ?? ColoredValueVariant.GREY

  return <Chip label={label} variant={variant} size="small" className={className} />
}

export default DepartmentMonthlyKpiStatusBadge

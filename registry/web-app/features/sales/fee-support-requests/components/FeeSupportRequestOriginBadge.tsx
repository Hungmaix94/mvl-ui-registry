import { ColoredValueVariant } from '@/api/schema'
import { Chip } from '@/components/ui'

import {
  FEE_SUPPORT_ORIGIN_LABEL,
  FEE_SUPPORT_ORIGIN_VARIANT,
  FeeSupportRequestOrigin,
} from '../constants/fee-support-request-constants'

type Props = {
  origin: FeeSupportRequestOrigin | undefined
  className?: string
}

/** Nguồn tạo phiếu (D19). Nhãn local vì BE chưa có app-constant Origin — xem constants. */
export function FeeSupportRequestOriginBadge({ origin, className }: Props) {
  if (!origin) return null

  return (
    <Chip
      label={FEE_SUPPORT_ORIGIN_LABEL[origin] ?? origin}
      variant={FEE_SUPPORT_ORIGIN_VARIANT[origin] ?? ColoredValueVariant.GREY}
      size="small"
      className={className}
    />
  )
}

export default FeeSupportRequestOriginBadge

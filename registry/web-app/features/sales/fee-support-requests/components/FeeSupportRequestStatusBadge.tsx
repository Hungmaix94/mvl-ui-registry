import { ColoredValueVariant } from '@/api/schema'
import { Chip } from '@/components/ui'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'

import {
  FEE_SUPPORT_STATUS_VARIANT,
  FeeSupportRequestStatus,
} from '../constants/fee-support-request-constants'

type Props = {
  status: FeeSupportRequestStatus
  className?: string
}

/** Nhãn trạng thái từ server (app-constant), FE chỉ giữ map màu. */
export function FeeSupportRequestStatusBadge({ status, className }: Props) {
  const { keysMap } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.FEE_SUPPORT_REQUEST.STATUS_CHOICES],
  })

  const labelMap = keysMap.get(APP_CONSTANT_KEY.SALES.FEE_SUPPORT_REQUEST.STATUS_CHOICES) as
    | Record<string, string>
    | undefined

  if (!status) return null

  const label = labelMap?.[status] ?? status
  const variant = FEE_SUPPORT_STATUS_VARIANT[status] ?? ColoredValueVariant.GREY

  return <Chip label={label} variant={variant} size="small" className={className} />
}

export default FeeSupportRequestStatusBadge

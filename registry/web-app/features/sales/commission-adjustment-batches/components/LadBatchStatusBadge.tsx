import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import useAppConstant from '@/hooks/useAppConstant'
import {
  LAD_STATUS_APP_CONSTANT_KEY,
  LAD_STATUS_VARIANT,
  LadBatchStatus,
} from '../constants/lad-constants'

interface LadBatchStatusBadgeProps {
  status: LadBatchStatus | string | null | undefined
  className?: string
  /** Show the leading status dot (mockup pill style). Default true. */
  showDot?: boolean
}

/**
 * Status chip for a LAD batch. Labels come from the backend `app_constants`
 * (DealCommissionAdjustmentBatch_Status) via {@link useAppConstant}; colour from
 * {@link LAD_STATUS_VARIANT}. Rendered via the shared {@link Chip} (tinted background + dot) so the
 * pill is colour-filled, not just coloured text — matches the list + detail mockups.
 */
export function LadBatchStatusBadge({
  status,
  className,
  showDot = true,
}: LadBatchStatusBadgeProps) {
  const { keysMap } = useAppConstant({ module: 'sales', keys: [LAD_STATUS_APP_CONSTANT_KEY] })
  if (!status) return null
  const key = status as LadBatchStatus
  const labels = keysMap.get(LAD_STATUS_APP_CONSTANT_KEY) as Record<string, string> | undefined
  const label = (labels?.[status] ?? String(status)).toUpperCase()
  const variant = LAD_STATUS_VARIANT[key] ?? ColoredValueVariant.GREY
  return (
    <Chip label={label} variant={variant} size="small" showDot={showDot} className={className} />
  )
}

export default LadBatchStatusBadge

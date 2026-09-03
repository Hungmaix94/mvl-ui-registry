import { ColoredValueVariant, type components } from '@/api/schema'
import Chip from '@/components/ui/chip/Chip'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'

type ColoredValue = components['schemas']['ColoredValue']

type ContractEvaluationStatusBadgeProps = {
  /**
   * The `colored_status` field returned by the API.
   * If absent we fall back to looking the label up in app-constants by the raw status string.
   */
  coloredStatus?: ColoredValue | null
  /**
   * The enum value to resolve the human label for — takes priority over `coloredStatus.value`.
   * For evaluations pass the typed `display_status` field; the chip color still comes from
   * `coloredStatus.variant`. When omitted, the label falls back to `coloredStatus.value`
   * (used by approver rows, which only carry `colored_status`).
   */
  status?: string | null
  /**
   * app-constant key to resolve the human label. Defaults to the evaluation display
   * status map (`ContractEvaluationDisplayStatus`) — the user-facing workflow status
   * that backs `colored_status` (adds `waiting_evaluation` / `waiting_block_director`
   * over the internal `status` enum). Pass `CONTRACT_EVALUATION_APPROVER_STATUS` when
   * rendering an approver-row status — its enum (pending/approved/rejected/skipped) is
   * a different set than the evaluation status.
   */
  labelKey?: string
  className?: string
}

/**
 * Renders the workflow status of a Contract Evaluation as a Chip.
 * - Label: resolved from the explicit `status` value (e.g. `display_status`) via `useAppConstant`,
 *   falling back to `coloredStatus.value`, then the raw value.
 * - Color: always from the backend-supplied `coloredStatus.variant` (grey when absent).
 * - Renders an em-dash when no value is available.
 */
const ContractEvaluationStatusBadge = ({
  coloredStatus,
  status,
  labelKey = APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_DISPLAY_STATUS,
  className,
}: ContractEvaluationStatusBadgeProps) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [labelKey],
  })

  const statusLabels = keysMap.get(labelKey) as Record<string, string> | undefined

  // Explicit `status` (e.g. display_status) wins for the label; `coloredStatus.value` is the fallback.
  const labelSourceValue = status ?? coloredStatus?.value ?? null
  const resolvedLabel =
    (labelSourceValue && statusLabels?.[labelSourceValue]) ?? labelSourceValue ?? '-'

  if (!labelSourceValue) {
    return <span className="text-content-dark-3">-</span>
  }

  return (
    <Chip
      label={resolvedLabel}
      variant={coloredStatus?.variant ?? ColoredValueVariant.GREY}
      size="small"
      className={className}
    />
  )
}

export default ContractEvaluationStatusBadge

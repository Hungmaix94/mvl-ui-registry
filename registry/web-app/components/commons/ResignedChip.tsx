import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'

type ResignedChipProps = {
  /** BE `is_working` flag (false = resigned). Null/undefined/true → no chip. */
  isWorking?: boolean | null
  /** Server-translated status label (e.g. "Đã nghỉ việc"). No hardcoded VN label here. */
  statusDisplay?: string | null
  className?: string
}

/**
 * Red chip flagging a payee/recipient who has resigned. Rendered only when the
 * server says the person is not working AND provides a translated status label,
 * so the label never falls back to a hardcoded Vietnamese string.
 */
const ResignedChip = ({ isWorking, statusDisplay, className }: ResignedChipProps) => {
  if (isWorking !== false || !statusDisplay) return null
  return (
    <Chip
      variant={ColoredValueVariant.RED}
      label={statusDisplay}
      size="small"
      className={className}
    />
  )
}

export default ResignedChip

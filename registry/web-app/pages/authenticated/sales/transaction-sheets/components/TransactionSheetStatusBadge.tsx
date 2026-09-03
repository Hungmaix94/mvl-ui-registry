import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import {
  TransactionSheetStatus,
  TRANSACTION_SHEET_STATUS,
} from '@/features/sales/transaction-sheets/types/transaction-sheet'

const STATUS_VARIANTS: Record<TransactionSheetStatus, ColoredValueVariant> = {
  [TransactionSheetStatus.PENDING_CONFIRM]: ColoredValueVariant.BLUE,
  [TransactionSheetStatus.PENDING_MANAGER]: ColoredValueVariant.ORANGE,
  [TransactionSheetStatus.PENDING_ADMIN]: ColoredValueVariant.YELLOW,
  [TransactionSheetStatus.PENDING_ADMIN_LEAD]: ColoredValueVariant.YELLOW,
  [TransactionSheetStatus.APPROVED]: ColoredValueVariant.GREEN,
  [TransactionSheetStatus.REJECTED]: ColoredValueVariant.RED,
}

export const TransactionSheetStatusBadge = ({
  status,
  className,
}: {
  status: TransactionSheetStatus
  className?: string
}) => {
  if (!status) return null

  const label = TRANSACTION_SHEET_STATUS[status] || status
  const variant = STATUS_VARIANTS[status] || ColoredValueVariant.GREY

  return <Chip label={label} variant={variant} size="small" className={className} />
}

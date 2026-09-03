import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

/**
 * Full ladder vocabulary of `CommissionAdvanceRequest.status`.
 *
 * A web-created advance now enters at PENDING_ADMIN_LEAD (the TKKD-lead step is mandatory —
 * the creator no longer approves their own request) and climbs to PENDING_ACCOUNTANT before
 * the accountant's APPROVED. A mobile-created advance starts three tiers earlier. DRAFT is
 * left for investor-bonus batch children and legacy rows.
 */
export enum CommissionAdvanceStatus {
  DRAFT = 'DRAFT',
  PENDING_CONFIRMATION = 'PENDING_CONFIRMATION',
  PENDING_MANAGER = 'PENDING_MANAGER',
  PENDING_ADMIN = 'PENDING_ADMIN',
  PENDING_ADMIN_LEAD = 'PENDING_ADMIN_LEAD',
  PENDING_ACCOUNTANT = 'PENDING_ACCOUNTANT',
  APPROVED = 'APPROVED',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  RECOVERED = 'RECOVERED',
  /** Returned for rework by the TKKD-lead or the accountant — still editable, then resubmit. */
  REJECTED = 'REJECTED',
  /** Terminal — unlike REJECTED, cannot be revived. */
  CANCELLED = 'CANCELLED',
}

/** Every tier the advance is still climbing the approval ladder (nothing disbursed yet). */
export const PENDING_LADDER_STATUSES: readonly CommissionAdvanceStatus[] = [
  CommissionAdvanceStatus.PENDING_CONFIRMATION,
  CommissionAdvanceStatus.PENDING_MANAGER,
  CommissionAdvanceStatus.PENDING_ADMIN,
  CommissionAdvanceStatus.PENDING_ADMIN_LEAD,
  CommissionAdvanceStatus.PENDING_ACCOUNTANT,
]

const STATUS_VARIANTS: Record<CommissionAdvanceStatus, ColoredValueVariant> = {
  [CommissionAdvanceStatus.DRAFT]: ColoredValueVariant.ORANGE,
  [CommissionAdvanceStatus.PENDING_CONFIRMATION]: ColoredValueVariant.YELLOW,
  [CommissionAdvanceStatus.PENDING_MANAGER]: ColoredValueVariant.YELLOW,
  [CommissionAdvanceStatus.PENDING_ADMIN]: ColoredValueVariant.YELLOW,
  [CommissionAdvanceStatus.PENDING_ADMIN_LEAD]: ColoredValueVariant.ORANGE,
  [CommissionAdvanceStatus.PENDING_ACCOUNTANT]: ColoredValueVariant.ORANGE,
  [CommissionAdvanceStatus.APPROVED]: ColoredValueVariant.BLUE,
  [CommissionAdvanceStatus.PARTIAL]: ColoredValueVariant.BLUE,
  [CommissionAdvanceStatus.PAID]: ColoredValueVariant.GREEN,
  [CommissionAdvanceStatus.RECOVERED]: ColoredValueVariant.PURPLE,
  [CommissionAdvanceStatus.REJECTED]: ColoredValueVariant.RED,
  [CommissionAdvanceStatus.CANCELLED]: ColoredValueVariant.GREY,
}

/** Fallbacks for when the app-constants API has not caught up with a new choice yet. */
const STATUS_LABEL_FALLBACKS: Partial<Record<CommissionAdvanceStatus, string>> = {
  [CommissionAdvanceStatus.PENDING_CONFIRMATION]: 'Chờ người nhận xác nhận',
  [CommissionAdvanceStatus.PENDING_MANAGER]: 'Chờ trưởng phòng duyệt',
  [CommissionAdvanceStatus.PENDING_ADMIN]: 'Chờ TKKD duyệt',
  [CommissionAdvanceStatus.PENDING_ADMIN_LEAD]: 'Chờ TP TKKD duyệt',
  [CommissionAdvanceStatus.PENDING_ACCOUNTANT]: 'Chờ kế toán duyệt',
  [CommissionAdvanceStatus.PARTIAL]: 'Đã chi một phần',
  [CommissionAdvanceStatus.REJECTED]: 'Bị trả về',
  [CommissionAdvanceStatus.CANCELLED]: 'Đã huỷ',
}

type Props = {
  status?: string
}

export const CommissionAdvanceStatusBadge = ({ status }: Props) => {
  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_ADVANCE_REQUEST_STATUS_CHOICES],
  })

  if (!status) return null

  const statusLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.COMMISSION_ADVANCE_REQUEST_STATUS_CHOICES
  ) as Record<string, string> | null

  const s = status as CommissionAdvanceStatus
  let label = statusLabels?.[status] ?? STATUS_LABEL_FALLBACKS[s] ?? status

  if (status === CommissionAdvanceStatus.DRAFT && label === 'Bản nháp') {
    label = 'Chờ duyệt'
  }
  if (status === CommissionAdvanceStatus.PAID && label === 'Paid') {
    label = 'Đã chi'
  }
  if (status === CommissionAdvanceStatus.RECOVERED && label === 'Recovered') {
    label = 'Đã thu hồi'
  }

  const variant = STATUS_VARIANTS[s] || ColoredValueVariant.GREY

  return <Chip label={label} variant={variant} size="small" />
}

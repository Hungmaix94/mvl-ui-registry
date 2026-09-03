import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { formatCurrencyVND } from '@/utils/common'
import { F2_COLLABORATOR_KINDS } from './commission-constants'

export type RecipientKind = 'employee' | 'collaborator' | 'exchange' | 'department' | 'position'

type RecipientLike = {
  recipient_kind?: string | null
  employee?: { id: number | string; fullname?: string; name?: string } | null
  collaborator?: { id: number | string; name?: string } | null
  exchange?: { id: number | string; name?: string } | null
  department?: { id: number | string; name?: string } | null
  position?: { id: number | string; name?: string } | null
}

const RECIPIENT_KIND_ORDER: RecipientKind[] = [
  'employee',
  'collaborator',
  'exchange',
  'department',
  'position',
]

export function getRecipientIdentity(
  share: RecipientLike | null | undefined
): { kind: RecipientKind; id: string } | undefined {
  if (!share) return undefined

  let preferredKind: RecipientKind | null = null
  const RK = APP_CONSTANT_KEY.SALES.DEAL.RECIPIENT_KIND
  if (share.recipient_kind === RK.CTV_WITH_SOURCE || share.recipient_kind === RK.F2_AGENCY) {
    preferredKind = 'collaborator'
  } else if (share.recipient_kind === RK.F2_EXCHANGE) {
    preferredKind = 'exchange'
  } else if (share.recipient_kind && !F2_COLLABORATOR_KINDS.has(share.recipient_kind as any)) {
    preferredKind = 'employee'
  }

  if (!preferredKind && (share as any).sale_type) {
    const st = (share as any).sale_type
    if (st === 'collaborator') {
      preferredKind = 'collaborator'
    } else if (st === 'partner' || st === 'exchange') {
      preferredKind = 'exchange'
    } else {
      preferredKind = 'employee'
    }
  }

  if (preferredKind && share[preferredKind]?.id != null) {
    return { kind: preferredKind, id: String(share[preferredKind]!.id) }
  }

  for (const kind of RECIPIENT_KIND_ORDER) {
    const ref = share[kind]
    if (ref?.id != null) return { kind, id: String(ref.id) }
  }
  return undefined
}

export function getParticipantName(share: RecipientLike | null | undefined): string {
  if (!share) return 'Không xác định'

  const identity = getRecipientIdentity(share)
  if (identity) {
    if (identity.kind === 'employee') {
      const emp = share.employee
      return emp?.fullname || emp?.name || 'Không xác định'
    }
    const ref = share[identity.kind]
    if (ref) {
      return (ref as any).name || 'Không xác định'
    }
  }

  return (
    share.employee?.fullname ||
    share.collaborator?.name ||
    share.exchange?.name ||
    share.department?.name ||
    share.position?.name ||
    'Không xác định'
  )
}

export function getRecipientKey(share: RecipientLike | null | undefined): string {
  const identity = getRecipientIdentity(share)
  if (identity) return `${identity.kind}_${identity.id}`
  return `name_${getParticipantName(share)}`
}

export function formatAmt(value?: string | number | null): string {
  if (!value && value !== 0) return '—'
  return formatCurrencyVND(Number(value))
}
export function cleanDecimalString(val: string, maxDecimals: number = 3): string {
  let cleaned = val.replace(/[^0-9.,]/g, '')
  const firstSeparatorIndex = cleaned.search(/[.,]/)
  if (firstSeparatorIndex !== -1) {
    const separator = cleaned[firstSeparatorIndex]
    const before = cleaned.slice(0, firstSeparatorIndex)
    let after = cleaned.slice(firstSeparatorIndex + 1).replace(/[.,]/g, '')
    if (after.length > maxDecimals) {
      after = after.slice(0, maxDecimals)
    }
    cleaned = before + separator + after
  }
  const normalized = cleaned.replace(',', '.')
  if (Number(normalized) > 100) {
    return '100'
  }
  return cleaned
}

export function isSaleRecipient(share: RecipientLike | null | undefined): boolean {
  const identity = getRecipientIdentity(share)
  if (!identity) return false
  return identity.kind === 'employee' || identity.kind === 'collaborator'
}

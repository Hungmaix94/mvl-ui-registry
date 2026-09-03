import { CommissionAdvanceStatus } from '@/features/accounting/commission-advances/components/CommissionAdvanceStatusBadge'

/**
 * Pure status predicates that decide which row/detail actions a commission advance offers.
 *
 * Kept out of the components so the ladder-gating rules can be unit-tested directly and stay in
 * sync between the list table and the detail page. Permission gating (CASL `ability.can`) is layered
 * on top of these at the call site — these functions only answer "does the status allow it".
 *
 * The approval ladder (see CommissionAdvanceStatusBadge): a web-created advance enters at
 * PENDING_ADMIN_LEAD; a mobile-created one starts lower and passes through PENDING_ADMIN (the TKKD
 * step) first.
 */

/** The accountant's `approve` accepts PENDING_ACCOUNTANT plus legacy / investor-bonus DRAFT rows. */
export const isAwaitingAccountant = (status: string) =>
  status === CommissionAdvanceStatus.PENDING_ACCOUNTANT || status === CommissionAdvanceStatus.DRAFT

/** TKKD step — reached only by a mobile-initiated advance (PENDING_ADMIN -> PENDING_ADMIN_LEAD). */
export const isAdminApprovable = (status: string) =>
  status === CommissionAdvanceStatus.PENDING_ADMIN

/**
 * Rejectable while the advance still sits on a web-side ladder tier the actor can act on. The
 * backend `reject` accepts every pending ladder tier — including PENDING_ADMIN — so the TKKD can
 * turn a mobile-initiated advance back at their step, not only approve it.
 */
export const isRejectable = (status: string) =>
  isAdminApprovable(status) ||
  status === CommissionAdvanceStatus.PENDING_ADMIN_LEAD ||
  isAwaitingAccountant(status)

/**
 * Deletable/removable from the web. Deliberately EXCLUDES PENDING_ADMIN: at that tier the advance
 * belongs to its mobile creator and the backend guards delete to the creator only — offering it to
 * a TKKD would just surface a button the API rejects.
 */
export const isDeletable = (status: string) =>
  status === CommissionAdvanceStatus.PENDING_ADMIN_LEAD ||
  isAwaitingAccountant(status) ||
  status === CommissionAdvanceStatus.REJECTED

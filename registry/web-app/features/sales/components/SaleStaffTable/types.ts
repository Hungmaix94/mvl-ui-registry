import type { ReactNode } from 'react'

/**
 * Normalized row data – computed by each parent context
 * before passing to the shared presentational table.
 */
export type SaleStaffTableRow = {
  /** field.id from useFieldArray – used as React key */
  id: string
  /** Human-readable sale type label */
  saleTypeLabel: string
  /** Display name of the person (employee / exchange / collaborator) */
  personLabel: string
  /** Sub-label: branch – department, shown for internal (MV) employees */
  branchDeptLabel?: string
  /** Whether this row counts as line revenue */
  countAsLineRevenue?: boolean | null
  /** Participation percentage (0-100, already parsed to number) */
  percentage: number
  /** Fee calculation price for this row (already resolved) */
  feeCalculationPriceDisplay: number
  /** Revenue display: amount or percentage string */
  revenueDisplay: string
  /** Formatted DT cá nhân – null means "no product selected" */
  thanhTienDTCaNhan: number | null
  /** Formatted hoa hong – null means "no product selected" */
  thanhTienHoaHong: number | null
  /** Commission value for read-only display */
  commissionDisplay: string
  /** Error message from Zod / RHF for the personnel field */
  personnelError?: string
}

export type SaleStaffTableProps = {
  isReadOnly: boolean
  isAmtCommission: boolean
  revenueType: 'pct' | 'amt'

  /** Pre-computed rows; index maps 1:1 to useFieldArray fields */
  rows: SaleStaffTableRow[]

  // ─── Footer totals ───────────────────────────────────────────────
  totalPercentage: number
  totalDTCaNhan: number
  totalHoaHong: number
  totalDealCommission: number | string
  /** When false, financial totals are hidden (e.g. no product selected) */
  canShowFinancials?: boolean

  // ─── Render props for form-bound cells ───────────────────────────
  /** Renders the editable participation-% cell for given row index */
  renderParticipationCell: (index: number, row: SaleStaffTableRow) => ReactNode
  /** Renders the editable commission cell for given row index */
  renderCommissionCell: (index: number, row: SaleStaffTableRow) => ReactNode

  // ─── Callbacks ───────────────────────────────────────────────────
  onAdd: () => void
  onEdit: (index: number) => void
  onRemove: (index: number) => void

  // ─── Validation errors display ───────────────────────────────────
  formArrayErrors?: unknown
}

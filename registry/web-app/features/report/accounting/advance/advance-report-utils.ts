import type { AdvanceSettlementRow } from '@/features/accounting/reports/services/report-service'

export type AdvanceRowEmployee = {
  key: string
  id?: number
  code?: string
  fullname?: string
}

/**
 * One recipient line of an advance, carrying the money that belongs to that person alone.
 *
 * The row's own `paid_amount` / `recovered_amount` are the whole advance's, so an advance
 * shared between three people cannot say who still owes what without these.
 */
export type AdvanceRecipientLine = {
  key: string
  employee: AdvanceRowEmployee | null
  paidAmount: number
  recoveredAmount: number
  remainingAmount: number
}

type NestedEmployee = AdvanceSettlementRow['requester_employee']

function toRowEmployee(employee: NestedEmployee, key: string): AdvanceRowEmployee | null {
  if (!employee) return null
  return { key, id: employee.id, code: employee.code, fullname: employee.fullname }
}

/** Money arrives as a decimal string; `null` and `''` both mean "no figure", not zero-ish junk. */
function toAmount(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === '') return 0
  const amount = Number(value)
  return Number.isFinite(amount) ? amount : 0
}

/**
 * The people a row is about.
 *
 * A row is one advance REQUEST, so a request paid out to several people yields all of them.
 * `requester_employee` is the fallback for rows with no recipient lines at all — the same rule
 * the backend follows when it filters and exports this report.
 */
export function getAdvanceRowEmployees(row: AdvanceSettlementRow): AdvanceRowEmployee[] {
  const recipients = Array.isArray(row.recipient_lines) ? row.recipient_lines : []
  const fromRecipients = recipients
    .map((line, idx) => toRowEmployee(line.recipient_employee, String(line.id ?? idx)))
    .filter((employee): employee is AdvanceRowEmployee => employee !== null)

  if (fromRecipients.length > 0) return fromRecipients

  const requester = toRowEmployee(row.requester_employee, `requester-${row.id}`)
  return requester ? [requester] : []
}

/**
 * The advance's recipient lines, each with its own paid / recovered / remaining figures.
 *
 * `remainingAmount` is derived here rather than read from the payload because the backend
 * only publishes the outstanding balance of the whole advance — the same subtraction the
 * CÒN LẠI column already does one level up.
 */
export function getAdvanceRecipientLines(row: AdvanceSettlementRow): AdvanceRecipientLine[] {
  const recipients = Array.isArray(row.recipient_lines) ? row.recipient_lines : []
  return recipients.map((line, idx) => {
    const key = String(line.id ?? idx)
    const paidAmount = toAmount(line.paid_amount)
    const recoveredAmount = toAmount(line.recovered_amount)
    return {
      key,
      employee: toRowEmployee(line.recipient_employee, key),
      paidAmount,
      recoveredAmount,
      remainingAmount: paidAmount - recoveredAmount,
    }
  })
}

/**
 * Whether the advance has to break into one sub-row per recipient.
 *
 * A single recipient is shown on the advance's own row — an expander that reveals the one
 * name already sitting there is a click that buys nothing.
 */
export function hasAdvanceRecipientBreakdown(row: AdvanceSettlementRow): boolean {
  return (Array.isArray(row.recipient_lines) ? row.recipient_lines.length : 0) > 1
}

/** Date the advance was settled (hoàn tạm ứng); null until something has been recovered. */
export function getAdvanceSettlementDate(row: AdvanceSettlementRow): string | undefined {
  return row.settlement_date ?? undefined
}

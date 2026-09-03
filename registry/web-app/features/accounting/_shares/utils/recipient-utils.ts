export const RECIPIENT_DEFAULT_NAME = 'Không xác định'
export const RECIPIENT_DEFAULT_ROLE = 'Khác'
export const RECIPIENT_EMPLOYEE_DEFAULT_ROLE = 'SALE'
export const RECIPIENT_EMPLOYEE_DEFAULT_NAME = 'Nhân viên'
export const RECIPIENT_COLLABORATOR_ROLE = 'CTV'
export const RECIPIENT_COLLABORATOR_DEFAULT_NAME = 'Cộng tác viên'
export const RECIPIENT_EXCHANGE_ROLE = 'SÀN F2'
export const RECIPIENT_EXCHANGE_DEFAULT_NAME = 'Sàn liên kết'
export const RECIPIENT_COLLABORATOR_LABEL = 'CTV ngoài'
export const RECIPIENT_EXCHANGE_LABEL = 'Sàn F2'

export function getRecipientInfo(
  line: any,
  employeesMap: Record<number, any> = {},
  collaboratorsMap: Record<number, any> = {},
  exchangesMap: Record<number, any> = {}
) {
  let name = RECIPIENT_DEFAULT_NAME
  let code = ''
  let role = RECIPIENT_DEFAULT_ROLE

  if (line.recipient_employee) {
    const emp =
      typeof line.recipient_employee === 'object' && line.recipient_employee !== null
        ? line.recipient_employee
        : line.recipient_employee_detail || employeesMap[line.recipient_employee]
    name = emp?.fullname || RECIPIENT_EMPLOYEE_DEFAULT_NAME
    code = emp?.code || ''
    role = emp?.position?.name || RECIPIENT_EMPLOYEE_DEFAULT_ROLE
  } else if (line.recipient_collaborator) {
    const col =
      typeof line.recipient_collaborator === 'object' && line.recipient_collaborator !== null
        ? line.recipient_collaborator
        : line.recipient_collaborator_detail || collaboratorsMap[line.recipient_collaborator]
    name = col?.name || RECIPIENT_COLLABORATOR_DEFAULT_NAME
    code = col?.code || ''
    role = RECIPIENT_COLLABORATOR_ROLE
  } else if (line.recipient_exchange) {
    const ex =
      typeof line.recipient_exchange === 'object' && line.recipient_exchange !== null
        ? line.recipient_exchange
        : line.recipient_exchange_detail || exchangesMap[line.recipient_exchange]
    name = ex?.name || RECIPIENT_EXCHANGE_DEFAULT_NAME
    code = ex?.code || ''
    role = RECIPIENT_EXCHANGE_ROLE
  }
  return { name, code, role }
}

/**
 * Read a money string into a number, keeping its SIGN.
 *
 * Used to be `replace(/\D/g, '')`, which deleted the minus sign along with everything else:
 * `"-800000"` came back as `800000`, and `"-800000.00"` as `80000000` — wrong sign and a
 * hundred times too big. That was harmless while only the fee-deduction bucket carried
 * negative money (it is read through its own magnitude path), but since the outflow clawback
 * (2026-08-06) an ordinary sale/F2/KPI amount can be negative too, and these values are sent
 * straight back to the BE.
 *
 * A dot means two different things depending on where the string came from — the VND inputs
 * group thousands with it (`"1.200.000"`) while the API sends it as a decimal point
 * (`"-800000.00"`) — so it is resolved per dot rather than by deleting them all: a dot
 * followed by exactly three digits and then another dot or the end is grouping, anything
 * else is a decimal separator.
 */
export function parseNumberSafe(val: string | number | null | undefined): number {
  if (val === undefined || val === null) return 0
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0
  const raw = String(val).trim()
  if (raw === '') return 0
  const isNegative = raw.startsWith('-')
  const digitsAndDots = raw.replace(/[^\d.]/g, '')
  const withoutGrouping = digitsAndDots.replace(/\.(?=\d{3}(?:\.|$))/g, '')
  const parsed = Number(withoutGrouping)
  if (!Number.isFinite(parsed) || parsed === 0) return 0
  return isNegative ? -parsed : parsed
}

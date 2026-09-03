export const LEADERSHIP_CSV_HEADER = 'position,fullname'
export const HR_CONTACT_CSV_HEADER = 'business_line,fullname,phone,email'

export type LeadershipCsvRow = {
  position: string
  fullName: string
}

export type HrContactCsvRow = {
  businessLine: string
  fullName: string
  phone: string
  email: string
}

export function parseLeadershipCsv(csv?: string | null): LeadershipCsvRow[] {
  if (!csv) return []

  const lines = csv
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const dataLines =
    lines.length > 0 && lines[0].toLowerCase() === LEADERSHIP_CSV_HEADER ? lines.slice(1) : lines

  return dataLines
    .map((line) => {
      const cols = line.split(',')
      const position = cols[0]?.trim() ?? ''
      const fullName = cols[1]?.trim() ?? ''

      return { position, fullName }
    })
    .filter((row) => row.position !== '' || row.fullName !== '')
}

export function serializeLeadershipCsv(rows: LeadershipCsvRow[]): string | undefined {
  const normalizedRows = rows
    .map((row) => ({
      position: row.position.trim(),
      fullName: row.fullName.trim(),
    }))
    .filter((row) => row.position !== '' || row.fullName !== '')

  if (normalizedRows.length === 0) return undefined

  const dataLines = normalizedRows.map((row) => `${row.position},${row.fullName}`).join('\n')
  return `${LEADERSHIP_CSV_HEADER}\n${dataLines}`
}

export function parseHrContactCsv(csv?: string | null): HrContactCsvRow[] {
  if (!csv) return []

  const lines = csv
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const dataLines =
    lines.length > 0 && lines[0].toLowerCase() === HR_CONTACT_CSV_HEADER ? lines.slice(1) : lines

  return dataLines
    .map((line) => {
      const cols = line.split(',')

      const businessLine = cols[0]?.trim() ?? ''
      const fullName = cols[1]?.trim() ?? ''
      const phone = cols[2]?.trim() ?? ''
      const email = cols[3]?.trim() ?? ''

      return {
        businessLine,
        fullName,
        phone,
        email,
      }
    })
    .filter((row) => row.businessLine || row.fullName || row.phone || row.email)
}

export function serializeHrContactCsv(rows: HrContactCsvRow[]): string | undefined {
  const normalizedRows = rows
    .map((row) => ({
      businessLine: row.businessLine.trim(),
      fullName: row.fullName.trim(),
      phone: row.phone.trim(),
      email: row.email.trim(),
    }))
    .filter((row) => row.businessLine || row.fullName || row.phone || row.email)

  if (normalizedRows.length === 0) return undefined

  const dataLines = normalizedRows
    .map((row) => `${row.businessLine},${row.fullName},${row.phone},${row.email}`)
    .join('\n')
  return `${HR_CONTACT_CSV_HEADER}\n${dataLines}`
}

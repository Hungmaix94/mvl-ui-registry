import Papa from 'papaparse'

import type {
  ImportParsedResult,
  ImportResultRecord,
  ImportColumnStructure,
} from '@/types/hrm-import'

/**
 * Detects if CSV has attendance exemption 2-row header (sub-row with S,C,S,C pattern).
 */
function hasAttendanceExemptionTwoRowHeader(rows: string[][]): boolean {
  if (rows.length < 2) return false
  const subRow = rows[1] ?? []
  const values = subRow.map((c) => (c ?? '').trim()).filter(Boolean)
  if (values.length < 4) return false
  const firstFour = values.slice(0, 4)
  return (
    firstFour[0] === 'S' && firstFour[1] === 'C' && firstFour[2] === 'S' && firstFour[3] === 'C'
  )
}

/** Day column pattern: 01-31 */
const DAY_HEADER_REGEX = /^(0?[1-9]|1\d|2\d|30|31)$/

/** Accepted variants for the "Họ và tên" / "Họ tên" column header from API/CSV */
const NAME_HEADER_VARIANTS = ['Họ tên', 'Họ và tên']

/**
 * Detects single-row attendance exemption header: Mã nhân viên, Họ tên/Họ và tên, 01,, 02,, ... (value in empty column).
 */
function hasAttendanceExemptionSingleRowHeader(rows: string[][]): boolean {
  if (rows.length < 1) return false
  const mainRow = (rows[0] ?? []).map((c) => (c ?? '').trim())
  if (mainRow[0] !== 'Mã nhân viên' || !NAME_HEADER_VARIANTS.includes(mainRow[1] ?? ''))
    return false
  if (mainRow.length < 4) return false
  let hasDayPair = false
  for (let i = 2; i + 1 < mainRow.length; i += 2) {
    const day = mainRow[i]
    const next = mainRow[i + 1]
    if (DAY_HEADER_REGEX.test(day) && next === '') {
      hasDayPair = true
      break
    }
  }
  return hasDayPair
}

/**
 * Detect columns-per-day for single-row header: 2 = (day, value) or 3 = (day, S, C).
 * Returns 3 if pattern 01, "", "", 02 is found; 2 if 01, "", 02.
 */
function getSingleRowColumnsPerDay(mainRow: string[]): 2 | 3 {
  if (mainRow.length < 8) return 2
  if (DAY_HEADER_REGEX.test(mainRow[2] ?? '') && DAY_HEADER_REGEX.test(mainRow[5] ?? '')) {
    const v3 = (mainRow[3] ?? '').trim()
    const v4 = (mainRow[4] ?? '').trim()
    if (v3 === '' && v4 === '') return 3
  }
  return 2
}

/**
 * Parse single-row header format. Each day has either 2 cols (day, value) or 3 cols (day, S, C).
 * Values V/P are in the columns after the day number. Build S and C columns per day.
 */
function parseAttendanceExemptionSingleRowFormat(rows: string[][]): ImportParsedResult {
  const mainRow = (rows[0] ?? []).map((c) => (c ?? '').trim())
  const rawDataRows = rows.slice(1)
  const colsPerDay = getSingleRowColumnsPerDay(mainRow)
  const headers: string[] = ['Mã nhân viên', 'Họ tên']
  const valueColumnByKey: Record<string, number> = {}

  for (let i = 2; i + colsPerDay <= mainRow.length; i += colsPerDay) {
    const day = mainRow[i]
    if (!DAY_HEADER_REGEX.test(day)) break
    const dayNorm = day.padStart(2, '0')
    headers.push(`${dayNorm}_S`, `${dayNorm}_C`)
    if (colsPerDay === 3) {
      valueColumnByKey[`${dayNorm}_S`] = i + 1
      valueColumnByKey[`${dayNorm}_C`] = i + 2
    } else {
      valueColumnByKey[`${dayNorm}_S`] = i
      valueColumnByKey[`${dayNorm}_C`] = i + 1
    }
  }

  const dayKeys = headers.filter(
    (h) => h !== 'Mã nhân viên' && h !== 'Họ tên' && (h.endsWith('_S') || h.endsWith('_C'))
  )
  const parentDays = [...new Set(dayKeys.map((k) => k.replace(/_[SC]$/, '')))].sort()

  const columnStructure: ImportColumnStructure[] = [
    { type: 'standalone', header: 'Mã nhân viên', accessorKey: 'Mã nhân viên' },
    { type: 'standalone', header: 'Họ tên', accessorKey: 'Họ tên' },
  ]
  for (const day of parentDays) {
    const children: Array<{ header: string; accessorKey: string }> = [
      { header: 'S', accessorKey: `${day}_S` },
      { header: 'C', accessorKey: `${day}_C` },
    ]
    columnStructure.push({
      type: 'group',
      parentHeader: day,
      children,
    })
  }

  const records: ImportResultRecord[] = rawDataRows
    .filter((row: string[]) => {
      const values = (row ?? []).map((c) => (c ?? '').trim())
      return values.some((v) => v.length > 0)
    })
    .map((row: string[]) => {
      const record: ImportResultRecord = {}
      record['Mã nhân viên'] = (row[0] ?? '').trim()
      record['Họ tên'] = (row[1] ?? '').trim()
      for (const key of dayKeys) {
        const colIdx = valueColumnByKey[key]
        record[key] = colIdx !== undefined ? (row[colIdx] ?? '').trim() : ''
      }
      return record
    })

  return {
    headers,
    rows: records,
    columnStructure,
  }
}

/**
 * Parses attendance exemption CSV with 2-row header format:
 * Row 1: Main labels (Mã nhân viên, Họ tên, 01, , 02, , ... 31, , Import Error)
 * Row 2: Sub labels ( , , S, C, S, C, ... S, C, Mã nhân viên)
 * Merges to headers like "Mã nhân viên", "Họ tên", "01 (S)", "01 (C)", ..., "Import Error"
 * Falls back to standard parsing if 2-row format not detected.
 */
export function parseAttendanceExemptionCsvContent(content: string): ImportParsedResult {
  const parsed = Papa.parse<string[]>(content, {
    header: false,
    skipEmptyLines: false,
  })

  if (parsed.errors.length > 0) {
    const [firstError] = parsed.errors
    throw new Error(firstError.message || 'Không thể đọc dữ liệu CSV')
  }

  const rows = parsed.data ?? []
  if (hasAttendanceExemptionTwoRowHeader(rows)) {
    return parseAttendanceExemptionTwoRowFormat(rows)
  }
  if (hasAttendanceExemptionSingleRowHeader(rows)) {
    return parseAttendanceExemptionSingleRowFormat(rows)
  }
  return parseCsvContent(content)
}

function parseAttendanceExemptionTwoRowFormat(rows: string[][]): ImportParsedResult {
  const mainRow = rows[0] ?? []
  const subRow = rows[1] ?? []
  const rawDataRows = rows.slice(2)

  const headers: string[] = []
  const columnStructure: ImportColumnStructure[] = []
  let currentMain = ''
  const maxCols = Math.max(mainRow.length, subRow.length)
  let currentGroupChildren: Array<{ header: string; accessorKey: string }> | null = null

  for (let i = 0; i < maxCols; i++) {
    const main = (mainRow[i] ?? '').trim()
    const sub = (subRow[i] ?? '').trim()
    if (main) currentMain = main
    let header: string
    if (sub) {
      header = currentMain ? `${currentMain} (${sub})` : sub
    } else {
      header = currentMain || `Cột ${i + 1}`
    }
    headers.push(header)
  }

  const seen = new Set<string>()
  const normalizedHeaders = headers.map((h, i) => {
    let label = h.trim() || `Cột ${i + 1}`
    let key = label
    let suffix = 0
    while (seen.has(key)) {
      suffix++
      key = `${label}_${suffix}`
    }
    seen.add(key)
    return key
  })

  currentMain = ''
  for (let i = 0; i < maxCols; i++) {
    const main = (mainRow[i] ?? '').trim()
    const sub = (subRow[i] ?? '').trim()
    const prevMain = currentMain
    if (main) currentMain = main
    const accessorKey = normalizedHeaders[i] ?? `Cột ${i + 1}`

    if (sub) {
      if (
        currentMain &&
        prevMain !== currentMain &&
        currentGroupChildren &&
        currentGroupChildren.length > 0
      ) {
        columnStructure.push({
          type: 'group',
          parentHeader: prevMain,
          children: currentGroupChildren,
        })
        currentGroupChildren = []
      }
      if (currentMain) {
        if (!currentGroupChildren) currentGroupChildren = []
        currentGroupChildren.push({ header: sub, accessorKey })
      } else {
        columnStructure.push({ type: 'standalone', header: sub, accessorKey })
      }
    } else {
      if (currentGroupChildren && currentGroupChildren.length > 0) {
        columnStructure.push({
          type: 'group',
          parentHeader: currentMain,
          children: currentGroupChildren,
        })
        currentGroupChildren = null
      }
      columnStructure.push({ type: 'standalone', header: currentMain || accessorKey, accessorKey })
    }
  }
  if (currentGroupChildren && currentGroupChildren.length > 0 && currentMain) {
    columnStructure.push({
      type: 'group',
      parentHeader: currentMain,
      children: currentGroupChildren,
    })
  }

  const records: ImportResultRecord[] = rawDataRows
    .filter((row: string[]) => {
      const values = (row ?? []).map((c) => (c ?? '').trim())
      return values.some((v) => v.length > 0)
    })
    .map((row: string[]) => {
      const record: ImportResultRecord = {}
      normalizedHeaders.forEach((header, idx) => {
        record[header] = (row[idx] ?? '').trim()
      })
      return record
    })

  return {
    headers: normalizedHeaders,
    rows: records,
    columnStructure,
  }
}

export function parseCsvContent(content: string): ImportParsedResult {
  const parsed = Papa.parse<ImportResultRecord>(content, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header: string) => header.trim(),
  })

  if (parsed.errors.length > 0) {
    const [firstError] = parsed.errors
    throw new Error(firstError.message || 'Không thể đọc dữ liệu CSV')
  }

  const headers = (parsed.meta.fields ?? []).filter(
    (field: string | undefined): field is string =>
      typeof field === 'string' && field.trim().length > 0
  )

  const rows = (parsed.data ?? []).map((row: ImportResultRecord) => {
    const record: ImportResultRecord = {}
    headers.forEach((header: string) => {
      record[header] = row?.[header] ?? ''
    })
    return record
  })

  return {
    headers,
    rows,
  }
}

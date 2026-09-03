import * as XLSX from 'xlsx'

export type ColumnDef<T> = {
  key: keyof T | string
  header: string
  width?: number
}

export type GroupedHeaderDef = {
  title: string
  colSpan?: number
  rowSpan?: number
  children?: GroupedHeaderDef[]
}

export type SheetConfig<T> = {
  name: string
  data: T[]
  columns?: ColumnDef<T>[]
  groupedHeaders?: GroupedHeaderDef[]
  mergedCells?: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }>
}

export type ExportExcelParams<T = any> = {
  fileName: string
  sheets: SheetConfig<T>[]
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

function collectCellsAtLevel(node: GroupedHeaderDef, targetLevel: number): GroupedHeaderDef[] {
  // For level 1, return direct children
  if (targetLevel === 1 && node.children) {
    return node.children
  }
  // For deeper levels, recursively collect from children
  if (node.children && targetLevel > 1) {
    const result: GroupedHeaderDef[] = []
    node.children.forEach((child) => {
      result.push(...collectCellsAtLevel(child, targetLevel - 1))
    })
    return result
  }
  return []
}

function buildGroupedHeaderRows(groupedHeaders: GroupedHeaderDef[]): GroupedHeaderDef[][] {
  if (!groupedHeaders || groupedHeaders.length === 0) return []

  // Build rows by BFS levels
  const rows: GroupedHeaderDef[][] = []
  const dfs = (nodes: GroupedHeaderDef[], level: number): number => {
    rows[level] = rows[level] || []
    let span = 0
    nodes.forEach((n) => {
      if (n.children && n.children.length > 0) {
        const childSpan = dfs(n.children, level + 1)
        rows[level].push({ ...n, colSpan: childSpan })
        span += childSpan
      } else {
        rows[level].push({ ...n, colSpan: 1 })
        span += 1
      }
    })
    return span
  }
  dfs(groupedHeaders, 0)

  // Calculate rowSpan for cells without children
  const maxDepth = rows.length
  rows.forEach((row) => {
    row.forEach((cell) => {
      if (!cell.children || cell.children.length === 0) {
        cell.rowSpan = maxDepth
      }
    })
  })

  // If we have more than 1 row, build sub-rows including empty cells for nodes without children
  if (rows.length > 1) {
    // For each level after 0, add cells for all nodes
    for (let level = 1; level < rows.length; level++) {
      const newRow: GroupedHeaderDef[] = []

      groupedHeaders.forEach((node) => {
        if (node.children && node.children.length > 0) {
          // Node has children, add children cells for this level
          const childCells = collectCellsAtLevel(node, level)
          newRow.push(...childCells)
        } else {
          // Node has no children, add empty cell to maintain column alignment
          newRow.push({ title: '', colSpan: 1 })
        }
      })

      rows[level] = newRow
    }
  }

  return rows
}

function buildGroupedHeaders(groupedHeaders: GroupedHeaderDef[]): string[][] {
  const rows = buildGroupedHeaderRows(groupedHeaders)
  // Convert to string array - need to expand cells with colSpan > 1
  const result = rows.map((row) => {
    const expandedRow: string[] = []
    row.forEach((cell) => {
      const colSpan = cell.colSpan || 1
      // Add the title once, followed by empty strings for remaining columns
      expandedRow.push(cell.title)
      for (let i = 1; i < colSpan; i++) {
        expandedRow.push('')
      }
    })
    return expandedRow
  })
  return result
}

function buildMergedCells(
  groupedHeaders: GroupedHeaderDef[],
  startRow: number
): Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> {
  if (!groupedHeaders || groupedHeaders.length === 0) return []

  const mergedCells: Array<{ s: { r: number; c: number }; e: { r: number; c: number } }> = []
  const rows = buildGroupedHeaderRows(groupedHeaders)

  // Build merged cells
  rows.forEach((row, rowIdx) => {
    let colIdx = 0
    row.forEach((cell) => {
      const colSpan = cell.colSpan || 1
      const rowSpan = cell.rowSpan || 1

      if (colSpan > 1 || rowSpan > 1) {
        mergedCells.push({
          s: { r: startRow + rowIdx, c: colIdx },
          e: { r: startRow + rowIdx + rowSpan - 1, c: colIdx + colSpan - 1 },
        })
      }

      colIdx += colSpan
    })
  })

  return mergedCells
}

export default function exportExcel<T = any>({ fileName, sheets }: ExportExcelParams<T>) {
  const workbook = XLSX.utils.book_new()

  sheets.forEach((sheet) => {
    let worksheet: XLSX.WorkSheet

    if (sheet.columns && sheet.columns.length > 0) {
      let aoa: any[][]

      if (sheet.groupedHeaders && sheet.groupedHeaders.length > 0) {
        // Build grouped headers
        const groupedHeaderRows = buildGroupedHeaders(sheet.groupedHeaders)
        const rows = sheet.data.map((row: any) =>
          sheet.columns!.map((c) => {
            const key = c.key as string
            const value = row?.[key]
            return value ?? ''
          })
        )

        aoa = [...groupedHeaderRows, ...rows]
        worksheet = XLSX.utils.aoa_to_sheet(aoa)

        // Add merged cells
        const mergedCells = buildMergedCells(sheet.groupedHeaders, 0)
        if (mergedCells.length > 0) {
          worksheet['!merges'] = mergedCells
        }
      } else {
        // Simple header
        const headers = sheet.columns.map((c) => c.header)
        const rows = sheet.data.map((row: any) =>
          sheet.columns!.map((c) => {
            const key = c.key as string
            const value = row?.[key]
            return value ?? ''
          })
        )

        aoa = [headers, ...rows]
        worksheet = XLSX.utils.aoa_to_sheet(aoa)

        // Use custom merged cells if provided
        if (sheet.mergedCells && sheet.mergedCells.length > 0) {
          worksheet['!merges'] = sheet.mergedCells
        }
      }

      worksheet['!cols'] = sheet.columns.map((c) => ({
        wch: c.width ?? Math.max(12, c.header.length + 2),
      }))
    } else {
      worksheet = XLSX.utils.json_to_sheet(sheet.data as any, { skipHeader: false })
    }

    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name || 'Sheet1')
  })

  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' })
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  downloadBlob(blob, `${fileName}.xlsx`)
}

import { useMemo, type RefObject } from 'react'
import romansLib from 'romans'
import { TableTree, type GroupedHeader } from '@/components/ui/table-tree/TableTree'
import type {
  RecruitmentCostBySourceReport,
  RecruitmentCostBySourceReportItem,
} from '@/features/report/services/hrm-report-service'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { formatCurrencyVND } from '@/utils/common'

function toRoman(num: number): string {
  return (romansLib as { romanize?: (n: number) => string })?.romanize?.(num) ?? String(num)
}

/** Table row: schema item with months flattened to m{i}_total/count/avg + UI fields for grouping/rowSpan */
type ExpenseRow = {
  id: string
  level: 1 | 2
  stt: number | string | ''
  branch: string
  source: string
  channel: string
  _sourceRowSpan?: number
  isBranchRow?: boolean
  isSummary?: boolean
  [key: string]: string | number | boolean | undefined
}

type ReportRecruitmentExpenseTableProps = {
  data?: RecruitmentCostBySourceReport
  isLoading: boolean
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

function buildExpenseColumns(months: string[]) {
  const cols: any[] = [
    {
      id: 'stt',
      header: '',
      cell: (row: ExpenseRow) => {
        if (row.isSummary === true) return ''
        if (row.isBranchRow) return String(row.stt ?? '')
        return row._sourceRowSpan ? String(row.stt ?? '') : ''
      },
      meta: {
        frozen: true,
        width: '80px',
        align: 'center',
        cellStyle: (row: ExpenseRow) => (row._sourceRowSpan ? { verticalAlign: 'middle' } : {}),
      },
    },
    {
      id: 'branch',
      header: '',
      cell: (row: ExpenseRow) => (row.isBranchRow ? row.branch : ''),
      meta: {
        frozen: true,
        width: '180px',
        align: 'left',
      },
    },
    {
      id: 'source',
      header: '',
      cell: (row: ExpenseRow) => {
        if (row.isSummary === true) return row.source
        if (row.isBranchRow) return ''
        return row._sourceRowSpan ? row.source : ''
      },
      meta: {
        frozen: true,
        width: '250px',
        align: 'left',
        cellStyle: (row: ExpenseRow) => (row._sourceRowSpan ? { verticalAlign: 'middle' } : {}),
      },
    },
    {
      id: 'channel',
      header: '',
      cell: (row: ExpenseRow) => (row.isBranchRow || row.isSummary ? '' : row.channel),
      meta: { frozen: true, width: '220px', align: 'left' },
    },
  ]

  // Separate "Tổng" from other months
  const totalIndex = months.findIndex((m) => m === 'Tổng')
  const otherMonthsWithIndices = months
    .map((month, index) => ({ month, index }))
    .filter(({ month }) => month !== 'Tổng')

  // Sort other months chronologically (oldest first)
  const sortedOtherMonths = otherMonthsWithIndices
    .map(({ month, index }) => {
      // Parse "YYYY-MM" format
      if (month.match(/^\d{4}-\d{2}$/)) {
        const [year, monthNum] = month.split('-').map(Number)
        return { index, month, sortKey: year * 12 + monthNum }
      }
      // Fallback for other formats
      return { index, month, sortKey: 0 }
    })
    .sort((a, b) => a.sortKey - b.sortKey)

  // Build columns: Total first, then sorted months
  const orderedIndices =
    totalIndex >= 0
      ? [totalIndex, ...sortedOtherMonths.map((m) => m.index)]
      : sortedOtherMonths.map((m) => m.index)

  orderedIndices.forEach((originalIdx) => {
    cols.push(
      {
        id: `m${originalIdx}_total`,
        header: '',
        cell: (row: ExpenseRow) => {
          const value = row[`m${originalIdx}_total`]
          return value !== null && value !== undefined ? formatCurrencyVND(String(value)) : '-'
        },
        meta: { width: '150px', align: 'right' },
      },
      {
        id: `m${originalIdx}_count`,
        header: '',
        cell: (row: ExpenseRow) => row[`m${originalIdx}_count`] ?? '-',
        meta: { width: '80px', align: 'right' },
      },
      {
        id: `m${originalIdx}_avg`,
        header: '',
        cell: (row: ExpenseRow) => {
          const value = row[`m${originalIdx}_avg`]
          return value !== null && value !== undefined ? formatCurrencyVND(String(value)) : '-'
        },
        meta: { width: '150px', align: 'right' },
      }
    )
  })

  return cols
}

function buildGroupedHeaders(months: string[]): GroupedHeader[] {
  const headers: GroupedHeader[] = [
    { id: 'stt', title: 'STT', colSpan: 1, align: 'center' },
    { id: 'branch', title: 'Chi nhánh', colSpan: 1, align: 'left' },
    { id: 'source', title: 'Nguồn', colSpan: 1, align: 'left' },
    { id: 'channel', title: 'Kênh tuyển dụng', colSpan: 1, align: 'left' },
  ]

  // Separate "Tổng" from other months
  const totalIndex = months.findIndex((m) => m === 'Tổng')
  const otherMonthsWithIndices = months
    .map((month, index) => ({ month, index }))
    .filter(({ month }) => month !== 'Tổng')

  // Sort other months chronologically (oldest first)
  const sortedOtherMonths = otherMonthsWithIndices
    .map(({ month, index }) => {
      // Parse "YYYY-MM" format
      if (month.match(/^\d{4}-\d{2}$/)) {
        const [year, monthNum] = month.split('-').map(Number)
        return { index, label: month, sortKey: year * 12 + monthNum }
      }
      // Fallback for other formats
      return { index, label: month, sortKey: 0 }
    })
    .sort((a, b) => a.sortKey - b.sortKey)

  // Build headers: Total first, then sorted months
  const orderedMonths =
    totalIndex >= 0
      ? [{ index: totalIndex, label: 'Tổng' }, ...sortedOtherMonths]
      : sortedOtherMonths

  orderedMonths.forEach(({ index: originalIdx, label }) => {
    headers.push({
      id: `month_${originalIdx}`,
      title: label,
      align: 'center',
      children: [
        { id: `m${originalIdx}_total`, title: 'Tổng chi phí', colSpan: 1 },
        { id: `m${originalIdx}_count`, title: 'SL', colSpan: 1 },
        { id: `m${originalIdx}_avg`, title: 'Chi phí trung bình', colSpan: 1 },
      ],
    })
  })

  return headers
}

function groupItemsByBranch(
  items: RecruitmentCostBySourceReportItem[]
): Array<{ branch: string; items: RecruitmentCostBySourceReportItem[] }> {
  const map = new Map<string, RecruitmentCostBySourceReportItem[]>()
  for (const item of items || []) {
    const branchName = (item?.branch ?? '').trim() || '-'
    if (!map.has(branchName)) map.set(branchName, [])
    map.get(branchName)!.push(item)
  }
  return Array.from(map.entries()).map(([branch, items]) => ({ branch, items }))
}

function groupItemsBySource(
  items: RecruitmentCostBySourceReportItem[]
): Array<{ source: string; items: RecruitmentCostBySourceReportItem[] }> {
  const map = new Map<string, RecruitmentCostBySourceReportItem[]>()
  for (const item of items || []) {
    const sourceName = (item?.source ?? '').trim() || '-'
    if (!map.has(sourceName)) map.set(sourceName, [])
    map.get(sourceName)!.push(item)
  }
  return Array.from(map.entries()).map(([source, items]) => ({ source, items }))
}

function buildExpenseRows(
  months: string[],
  items: RecruitmentCostBySourceReportItem[]
): ExpenseRow[] {
  const result: ExpenseRow[] = []
  const branchGroups = groupItemsByBranch(items)

  for (let branchIdx = 0; branchIdx < branchGroups.length; branchIdx++) {
    const { branch, items: branchItems } = branchGroups[branchIdx]

    // Branch header row totals
    const sumTotal = new Array(months.length).fill(0)
    const sumCount = new Array(months.length).fill(0)
    branchItems.forEach((item) => {
      months.forEach((_, i) => {
        const monthData = item.months?.[i]
        if (!monthData) return
        const totalNumber = Number(monthData.total ?? 0)
        if (!Number.isNaN(totalNumber)) sumTotal[i] += totalNumber
        const countNumber = monthData.count ?? 0
        if (typeof countNumber === 'number' && !Number.isNaN(countNumber))
          sumCount[i] += countNumber
      })
    })

    const branchRow: ExpenseRow = {
      id: `branch-${branchIdx}`,
      level: 1,
      stt: toRoman(branchIdx + 1),
      branch,
      source: '',
      channel: '',
      isBranchRow: true,
    }
    months.forEach((_, i) => {
      const total = sumTotal[i]
      const count = sumCount[i]
      branchRow[`m${i}_total`] = total
      branchRow[`m${i}_count`] = count
      branchRow[`m${i}_avg`] = count > 0 ? Math.round(total / count) : 0
    })
    result.push(branchRow)

    // Source + channel rows inside branch
    const sourceGroups = groupItemsBySource(branchItems)
    for (let sourceIdx = 0; sourceIdx < sourceGroups.length; sourceIdx++) {
      const { source, items: sourceItems } = sourceGroups[sourceIdx]

      for (let chIdx = 0; chIdx < sourceItems.length; chIdx++) {
        const item = sourceItems[chIdx]

        const row: ExpenseRow = {
          id: `detail-${branchIdx}-${sourceIdx}-${chIdx}`,
          level: 2,
          stt: chIdx === 0 ? sourceIdx + 1 : '',
          branch: '',
          source: chIdx === 0 ? source : '',
          channel: item?.channel ?? '-',
        }

        if (chIdx === 0) {
          // RowSpan STT + Nguồn theo nhóm cùng `source` (trong 1 `branch`)
          row._sourceRowSpan = sourceItems.length
        }

        months.forEach((_, i) => {
          const m = item?.months?.[i] || {}
          row[`m${i}_total`] = m.total ?? '0'
          row[`m${i}_count`] = m.count ?? 0
          row[`m${i}_avg`] = m.avg != null ? Math.round(Number(m.avg)) : 0
        })

        result.push(row)
      }
    }
  }

  return result
}

function buildExpenseSummaryRow(
  months: string[],
  items: RecruitmentCostBySourceReportItem[]
): ExpenseRow | undefined {
  if (!months?.length || !items?.length) return undefined

  const sumTotal = new Array(months.length).fill(0)
  const sumCount = new Array(months.length).fill(0)

  items.forEach((item) => {
    months.forEach((_, i) => {
      const monthData = item.months?.[i]
      if (!monthData) return

      const totalNumber = Number(monthData.total ?? 0)
      if (!Number.isNaN(totalNumber)) {
        sumTotal[i] += totalNumber
      }

      const countNumber = monthData.count ?? 0
      if (typeof countNumber === 'number' && !Number.isNaN(countNumber)) {
        sumCount[i] += countNumber
      }
    })
  })

  const hasAnyValue = sumTotal.some((value) => value !== 0) || sumCount.some((value) => value !== 0)
  if (!hasAnyValue) return undefined

  const summaryRow: ExpenseRow = {
    id: 'summary',
    level: 1,
    stt: '',
    branch: '',
    source: 'Tổng cộng',
    channel: '',
    isSummary: true,
  }

  months.forEach((_, i) => {
    const total = sumTotal[i]
    const count = sumCount[i]
    const avg = count > 0 ? Math.round(total / count) : 0

    summaryRow[`m${i}_total`] = total
    summaryRow[`m${i}_count`] = count
    summaryRow[`m${i}_avg`] = avg
  })

  return summaryRow
}

const ReportRecruitmentExpenseTable = ({
  data,
  isLoading,
  scrollContainerRef,
}: ReportRecruitmentExpenseTableProps) => {
  // Map source_type -> label via constants (hrm module)
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.RECRUITMENT.SOURCE.TYPE],
  })

  const months: string[] = useMemo(() => data?.months || [], [data?.months])
  const items = useMemo(() => data?.data || [], [data?.data])

  const columns = useMemo(() => buildExpenseColumns(months), [months])
  const groupedHeaders = useMemo(() => buildGroupedHeaders(months), [months])
  const rows = useMemo(() => buildExpenseRows(months, items), [months, items])
  const summaryRow = useMemo(() => buildExpenseSummaryRow(months, items), [months, items])

  const sourcesMap = useMemo(() => {
    if (keysMap.has(APP_CONSTANT_KEY.RECRUITMENT.SOURCE.TYPE)) {
      return keysMap.get(APP_CONSTANT_KEY.RECRUITMENT.SOURCE.TYPE) || {}
    }
    return {}
  }, [keysMap])

  const mappedRows = useMemo(() => {
    if (!rows?.length) return rows

    return rows.map((r) => ({
      ...r,
      source: sourcesMap[r.source] || r.source,
    }))
  }, [rows, sourcesMap])

  const displayRows = useMemo(() => {
    if (!mappedRows?.length) return summaryRow ? [summaryRow] : []
    if (!summaryRow) return mappedRows

    return [...mappedRows, summaryRow]
  }, [mappedRows, summaryRow])

  const getCellRowSpan = useMemo(() => {
    return (row: ExpenseRow, colIdx: number): number | undefined => {
      if (row.isSummary === true) return undefined
      // STT (colIdx=0) + Nguồn (colIdx=2)
      if (colIdx === 0 || colIdx === 2) return row._sourceRowSpan
      return undefined
    }
  }, [])

  const getRowClassName = useMemo(() => {
    return (row: ExpenseRow): string | undefined => {
      if (row.isBranchRow) return 'bg-background-6 text-content-dark-1 typo-body-base-semibold'
      if (row.isSummary) return 'bg-background-2 text-content-dark-1 typo-body-base-semibold'
      return undefined
    }
  }, [])

  return (
    <TableTree
      data={displayRows ?? []}
      columns={columns as any}
      groupedHeaders={groupedHeaders}
      isLoading={isLoading}
      density="comfortable"
      enableColspanMerging={false}
      customLevel2RowClassName="bg-background-1 text-content-dark-1"
      getCellRowSpan={getCellRowSpan}
      scrollContainerRef={scrollContainerRef}
      getRowClassName={getRowClassName}
    />
  )
}

export default ReportRecruitmentExpenseTable

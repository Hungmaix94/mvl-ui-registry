import { useMemo, type RefObject } from 'react'
import romansLib from 'romans'
import { TableTree, type GroupedHeader } from '@/components/ui/table-tree/TableTree'
import type {
  RecruitmentCostByPayerReport,
  RecruitmentCostByPayerReportItem,
} from '@/features/report/services/hrm-report-service'
import { formatCurrencyVND } from '@/utils/common'

function toRoman(num: number): string {
  return (romansLib as { romanize?: (n: number) => string })?.romanize?.(num) ?? String(num)
}

type ExpenseByStaffRow = {
  id: string
  level: 0 | 1 | 2
  stt: number | string | ''
  branch: string
  employee: string
  channel: string
  [key: string]: string | number
}

type ReportRecruitmentExpenseByStaffTableProps = {
  data?: RecruitmentCostByPayerReport
  isLoading: boolean
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

function buildExpenseColumns(months: string[]) {
  const cols: Array<{
    id: string
    header: string
    cell: (row: ExpenseByStaffRow) => string | number
    meta: { frozen?: boolean; width: string; align: string }
  }> = [
    {
      id: 'stt',
      header: '',
      cell: (row: ExpenseByStaffRow) =>
        (row as any).isSummary ? '' : row.stt === '' ? '' : (row.stt ?? '-'),
      meta: { frozen: true, width: '80px', align: 'center' },
    },
    {
      id: 'branch',
      header: '',
      cell: (row: ExpenseByStaffRow) => (row.branch !== '' ? row.branch : ''),
      meta: { frozen: true, width: '180px', align: 'left' },
    },
    {
      id: 'employee',
      header: '',
      cell: (row: ExpenseByStaffRow) => row.employee,
      meta: { frozen: true, width: '250px', align: 'left' },
    },
    {
      id: 'channel',
      header: '',
      cell: (row: ExpenseByStaffRow) => row.channel,
      meta: { frozen: true, width: '200px', align: 'left' },
    },
  ]

  const totalIndex = months.findIndex((m) => m === 'Tổng')
  const otherMonthsWithIndices = months
    .map((month, index) => ({ month, index }))
    .filter(({ month }) => month !== 'Tổng')

  const sortedOtherMonths = otherMonthsWithIndices
    .map(({ month, index }) => {
      if (month.match(/^\d{4}-\d{2}$/)) {
        const [year, monthNum] = month.split('-').map(Number)
        return { index, month, sortKey: year * 12 + monthNum }
      }
      return { index, month, sortKey: 0 }
    })
    .sort((a, b) => a.sortKey - b.sortKey)

  const orderedIndices =
    totalIndex >= 0
      ? [totalIndex, ...sortedOtherMonths.map((m) => m.index)]
      : sortedOtherMonths.map((m) => m.index)

  orderedIndices.forEach((originalIdx) => {
    cols.push(
      {
        id: `m${originalIdx}_total`,
        header: '',
        cell: (row: ExpenseByStaffRow) => {
          const value = row[`m${originalIdx}_total`]
          return value !== null && value !== undefined ? formatCurrencyVND(value) : '-'
        },
        meta: { width: '150px', align: 'right' },
      },
      {
        id: `m${originalIdx}_count`,
        header: '',
        cell: (row: ExpenseByStaffRow) => row[`m${originalIdx}_count`] ?? '-',
        meta: { width: '80px', align: 'right' },
      },
      {
        id: `m${originalIdx}_avg`,
        header: '',
        cell: (row: ExpenseByStaffRow) => {
          const value = row[`m${originalIdx}_avg`]
          return value !== null && value !== undefined ? formatCurrencyVND(value) : '-'
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
    { id: 'employee', title: 'Nhân viên', colSpan: 1, align: 'left' },
    { id: 'channel', title: 'Kênh', colSpan: 1, align: 'left' },
  ]

  const totalIndex = months.findIndex((m) => m === 'Tổng')
  const otherMonthsWithIndices = months
    .map((month, index) => ({ month, index }))
    .filter(({ month }) => month !== 'Tổng')

  const sortedOtherMonths = otherMonthsWithIndices
    .map(({ month, index }) => {
      if (month.match(/^\d{4}-\d{2}$/)) {
        const [year, monthNum] = month.split('-').map(Number)
        return { index, label: month, sortKey: year * 12 + monthNum }
      }
      return { index, label: month, sortKey: 0 }
    })
    .sort((a, b) => a.sortKey - b.sortKey)

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

/** Group items by payer_branch preserving order of first occurrence */
function groupItemsByBranch(
  items: RecruitmentCostByPayerReportItem[]
): Array<{ branchKey: string; branchName: string; items: RecruitmentCostByPayerReportItem[] }> {
  const groups: Array<{
    branchKey: string
    branchName: string
    items: RecruitmentCostByPayerReportItem[]
  }> = []
  const seen = new Set<string>()

  for (const item of items || []) {
    const branchName = (item.payer_branch ?? '').trim() || '-'
    const branchKey = branchName

    if (!seen.has(branchKey)) {
      seen.add(branchKey)
      groups.push({ branchKey, branchName, items: [] })
    }
    const group = groups.find((g) => g.branchKey === branchKey)
    if (group) group.items.push(item)
  }

  return groups
}

function buildExpenseRowsGroupedByBranch(
  months: string[],
  items: RecruitmentCostByPayerReportItem[]
): ExpenseByStaffRow[] {
  const groups = groupItemsByBranch(items)
  const result: ExpenseByStaffRow[] = []
  let detailRowId = 0

  for (let branchIdx = 0; branchIdx < groups.length; branchIdx++) {
    const { branchKey, branchName, items: groupItems } = groups[branchIdx]

    const sumTotal = new Array(months.length).fill(0)
    const sumCount = new Array(months.length).fill(0)
    groupItems.forEach((item) => {
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

    const branchRow: ExpenseByStaffRow = {
      id: `branch-${branchKey}-${branchIdx}`,
      level: 1,
      stt: toRoman(branchIdx + 1),
      branch: branchName,
      employee: '',
      channel: '',
    }
    months.forEach((_, i) => {
      const total = sumTotal[i]
      const count = sumCount[i]
      branchRow[`m${i}_total`] = total
      branchRow[`m${i}_count`] = count
      branchRow[`m${i}_avg`] = count > 0 ? Math.round(total / count) : 0
    })
    ;(branchRow as any).isBranchRow = true
    result.push(branchRow)

    groupItems.forEach((item, detailIdx) => {
      const employeeLabel = [item.payer_code, item.payer_name].filter(Boolean).join(' - ') || '-'
      const row: ExpenseByStaffRow = {
        id: `detail-${detailRowId++}`,
        level: 2,
        stt: detailIdx + 1,
        branch: '',
        employee: employeeLabel,
        channel: item.channel ?? '-',
      }
      months.forEach((_, i) => {
        const m = item?.months?.[i] || {}
        row[`m${i}_total`] = m.total ?? '0'
        row[`m${i}_count`] = m.count ?? 0
        row[`m${i}_avg`] = m.avg != null ? Math.round(Number(m.avg)) : 0
      })
      result.push(row)
    })
  }

  return result
}

function buildExpenseSummaryRowByStaff(
  months: string[],
  items: RecruitmentCostByPayerReportItem[]
): ExpenseByStaffRow | undefined {
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

  const summaryRow: ExpenseByStaffRow = {
    id: 'summary',
    level: 1,
    stt: 0,
    branch: '',
    employee: 'Tổng cộng',
    channel: '',
  }

  months.forEach((_, i) => {
    const total = sumTotal[i]
    const count = sumCount[i]
    const avg = count > 0 ? Math.round(total / count) : 0

    summaryRow[`m${i}_total`] = total
    summaryRow[`m${i}_count`] = count
    summaryRow[`m${i}_avg`] = avg
  })
  ;(summaryRow as any).isSummary = true

  return summaryRow
}

const ReportRecruitmentExpenseByStaffTable = ({
  data,
  isLoading,
  scrollContainerRef,
}: ReportRecruitmentExpenseByStaffTableProps) => {
  const months: string[] = useMemo(() => data?.months || [], [data?.months])
  const items = useMemo(() => data?.data || [], [data?.data])

  const columns = useMemo(() => buildExpenseColumns(months), [months])
  const groupedHeaders = useMemo(() => buildGroupedHeaders(months), [months])
  const rows = useMemo(() => buildExpenseRowsGroupedByBranch(months, items), [months, items])
  const summaryRow = useMemo(() => buildExpenseSummaryRowByStaff(months, items), [months, items])

  const displayRows = useMemo(() => {
    if (!rows?.length) return summaryRow ? [summaryRow] : []
    return summaryRow ? [...rows, summaryRow] : rows
  }, [rows, summaryRow])

  const getRowClassName = useMemo(() => {
    return (row: ExpenseByStaffRow): string | undefined => {
      if ((row as any).isBranchRow)
        return 'bg-background-6 text-content-dark-1 typo-body-base-semibold'
      if ((row as any).isSummary)
        return 'bg-background-2 text-content-dark-1 typo-body-base-semibold'
      return undefined
    }
  }, [])

  return (
    <TableTree
      data={displayRows ?? []}
      columns={columns as never}
      groupedHeaders={groupedHeaders}
      isLoading={isLoading}
      density="comfortable"
      enableColspanMerging={false}
      customLevel2RowClassName="bg-background-1 text-content-dark-1"
      getRowClassName={getRowClassName}
      scrollContainerRef={scrollContainerRef}
    />
  )
}

export default ReportRecruitmentExpenseByStaffTable

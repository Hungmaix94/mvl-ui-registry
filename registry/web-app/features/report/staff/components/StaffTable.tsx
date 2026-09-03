import { useMemo } from 'react'
import { TableTree } from '@/components/ui/table-tree/TableTree.tsx'
import { EmployeeStatusBreakdownReportAggregated } from '@/services'
import { ORG_LEVEL } from '@/features/report/staff/constants'
import { buildColumns, flattenTree, TreeRow } from '@/features/report/staff/utils/treeTransform.ts'
import exportExcel from '@/utils/excel.ts'

const SUMMARY_NAME = 'tổng'

const getNameColumnHeader = (orgLevel: ORG_LEVEL) => {
  switch (orgLevel) {
    case ORG_LEVEL.BRANCH:
      return 'Chi nhánh'
    case ORG_LEVEL.BLOCK:
      return 'Chi nhánh - Khối'
    case ORG_LEVEL.DEPARTMENT:
    default:
      return 'Chi nhánh - Khối - Phòng ban'
  }
}

const buildRowsForOrgLevel = (
  data: EmployeeStatusBreakdownReportAggregated | undefined,
  orgLevel: ORG_LEVEL
) => {
  const timeHeaders = data?.time_headers || []
  const treeNodes = data?.data || []
  const allRows = flattenTree(timeHeaders, treeNodes)

  let filtered: TreeRow[] = []

  switch (orgLevel) {
    case ORG_LEVEL.BRANCH:
      filtered = allRows.filter((row) => row.type === 'branch')
      break
    case ORG_LEVEL.BLOCK:
      filtered = allRows.filter((row) => row.type === 'branch' || row.type === 'block')
      break
    case ORG_LEVEL.DEPARTMENT:
      filtered = allRows
      break
  }

  if (filtered.length > 0) {
    const existingSummaryIndex = filtered.findIndex(
      (row) => row.name?.trim().toLowerCase() === SUMMARY_NAME
    )

    if (existingSummaryIndex >= 0) {
      filtered = filtered.map((row, index) =>
        index === existingSummaryIndex ? { ...row, isSummary: true } : row
      )
    } else {
      const branchRows = filtered.filter((row) => row.type === 'branch')
      const summaryStatistics = timeHeaders.map((_, index) => {
        const sum = branchRows.reduce((total, row) => total + (row.statistics[index] || 0), 0)
        return Math.round(sum * 100) / 100
      })

      filtered.push({
        id: 'summary',
        level: 1,
        type: 'branch',
        name: 'Tổng',
        statistics: summaryStatistics,
        isSummary: true,
      })
    }
  }

  return {
    timeHeaders,
    rows: filtered,
  }
}

const StaffTable = ({
  data,
  orgLevel,
}: {
  data?: EmployeeStatusBreakdownReportAggregated
  orgLevel: ORG_LEVEL
}) => {
  const nameColumnHeader = useMemo(() => getNameColumnHeader(orgLevel), [orgLevel])
  const { timeHeaders, rows: filteredRows } = useMemo(
    () => buildRowsForOrgLevel(data, orgLevel),
    [data, orgLevel]
  )

  const columns = useMemo(
    () => buildColumns(timeHeaders, orgLevel, nameColumnHeader),
    [timeHeaders, orgLevel, nameColumnHeader]
  )

  const customLevel1RowClassName = useMemo(() => {
    if (orgLevel === ORG_LEVEL.BRANCH) {
      return '!text-content-dark-1'
    }
    return 'bg-background-6 text-action-primary-red-default typo-body-base-semibold'
  }, [orgLevel])

  return (
    <TableTree
      data={filteredRows}
      columns={columns}
      isLoading={false}
      density="comfortable"
      enableColspanMerging={false}
      customLevel1RowClassName={customLevel1RowClassName}
      customLevel2RowClassName={
        orgLevel === ORG_LEVEL.BRANCH
          ? undefined
          : 'bg-background-2 text-content-dark-1 typo-body-base-semibold'
      }
      className={'px-0'}
    />
  )
}

export default StaffTable

type StaffTurnoverExportOptions = {
  data?: EmployeeStatusBreakdownReportAggregated
  orgLevel: ORG_LEVEL
  fileName: string
  sheetName?: string
  periodLabel?: string
  dateRangeLabel?: string
}

export const exportStaffTurnoverTable = ({
  data,
  orgLevel,
  fileName,
  sheetName = 'Báo cáo',
  periodLabel,
  dateRangeLabel,
}: StaffTurnoverExportOptions) => {
  const { timeHeaders, rows } = buildRowsForOrgLevel(data, orgLevel)
  const nameColumnHeader = getNameColumnHeader(orgLevel)

  const columns = [
    { key: 'name', header: nameColumnHeader },
    ...timeHeaders.map((header, index) => ({
      key: `col_${index}`,
      header,
    })),
  ]

  const exportRows = rows.map((row) => {
    const record: Record<string, string | number> = {
      name: row.name,
    }

    timeHeaders.forEach((_, index) => {
      record[`col_${index}`] = row.statistics[index] ?? 0
    })

    return record
  })

  const metadataRows: Record<string, string>[] = []
  if (periodLabel) {
    metadataRows.push({
      name: `Kỳ báo cáo: ${periodLabel}`,
    })
  }
  if (dateRangeLabel) {
    metadataRows.push({
      name: `Khoảng thời gian: ${dateRangeLabel}`,
    })
  }

  exportExcel({
    fileName,
    sheets: [
      {
        name: sheetName,
        data: [...metadataRows, ...exportRows],
        columns,
      },
    ],
  })
}

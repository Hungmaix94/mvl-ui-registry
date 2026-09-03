import { useMemo, type RefObject } from 'react'
import { TableTree } from '@/components/ui/table-tree/TableTree'
import type { RecruitmentChannelReportAggregated } from '@/features/report/services/hrm-report-service'
import {
  buildColumns,
  flattenTree,
} from '@/features/report/recruitment/resource/utils/treeTransform'

type ReportRecruitmentChannelTableProps = {
  data?: RecruitmentChannelReportAggregated
  isLoading: boolean
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

const ReportRecruitmentChannelTable = ({
  data,
  isLoading,
  scrollContainerRef,
}: ReportRecruitmentChannelTableProps) => {
  const channels: string[] = useMemo(() => data?.channels || [], [data?.channels])
  const treeNodes = useMemo(() => data?.data || [], [data?.data])

  const columns = useMemo(() => buildColumns(channels), [channels])
  const rows = useMemo(() => flattenTree(channels, treeNodes), [channels, treeNodes])

  const rowsWithSummary = useMemo(() => {
    if (!rows?.length) return rows

    // Only sum branch-level rows (Chi nhánh)
    const branchRows = rows.filter((row) => row.type === 'branch')
    if (!branchRows.length) return rows

    const statisticsLength = branchRows[0].statistics?.length ?? 0
    if (!statisticsLength) return rows

    const totals = new Array(statisticsLength).fill(0)

    branchRows.forEach((row) => {
      for (let i = 0; i < statisticsLength; i += 1) {
        const value = row.statistics?.[i] ?? 0
        if (typeof value === 'number' && !Number.isNaN(value)) {
          totals[i] += value
        }
      }
    })

    const summaryRow = {
      id: 'summary',
      level: 1,
      type: 'branch',
      name: 'Tổng cộng',
      stt: '',
      statistics: totals,
      isSummary: true,
    } as (typeof rows)[number] & { isSummary: boolean }

    return [...rows, summaryRow]
  }, [rows])

  return (
    <TableTree
      data={rowsWithSummary ?? rows}
      columns={columns}
      isLoading={isLoading}
      density="comfortable"
      enableColspanMerging={false}
      customLevel2RowClassName="bg-background-2 text-content-dark-1 typo-body-base-semibold"
      scrollContainerRef={scrollContainerRef}
    />
  )
}

export default ReportRecruitmentChannelTable

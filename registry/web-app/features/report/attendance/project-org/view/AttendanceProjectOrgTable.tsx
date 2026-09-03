import { useEffect, useMemo, type RefObject } from 'react'
import { TableTree } from '@/components/ui/table-tree/TableTree'
import type { TreeColumn } from '@/components/ui/table-tree/TableTree'
import {
  type GetAttendanceByProjectOrganizationReportParams,
  useAttendanceByProjectOrganizationReport,
  type AttendanceProjectOrgReportAggregration,
} from '@/features/report/services/attendance-report-service'
import romansLib from 'romans'
import { cn } from '@/utils'

type AttendanceProjectOrgRow = {
  id: string
  level: 1 | 2 | 3
  type: 'branch' | 'block' | 'department'
  name: string
  stt?: string | number
  count: number
  isSummary?: boolean
}

type AttendanceProjectOrgTableProps = {
  filters: GetAttendanceByProjectOrganizationReportParams
  onDataLoaded?: (data?: AttendanceProjectOrgReportAggregration) => void
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

function flattenTree(
  nodes: AttendanceProjectOrgReportAggregration['children']
): AttendanceProjectOrgRow[] {
  const rows: AttendanceProjectOrgRow[] = []

  nodes?.forEach((branchNode, branchIdx) => {
    const branchId = `b-${branchIdx}`
    rows.push({
      id: branchId,
      level: 1,
      type: 'branch',
      name: branchNode.name,
      stt: '',
      count: branchNode.count ?? 0,
    })

    let blockCounter = 0
    branchNode.children?.forEach((blockNode, blockIdx) => {
      blockCounter += 1
      const roman = (romansLib as any)?.romanize
        ? (romansLib as any).romanize(blockCounter) + '.'
        : String(blockCounter)

      const blockId = `${branchId}-bl-${blockIdx}`
      rows.push({
        id: blockId,
        level: 2,
        type: 'block',
        name: blockNode.name,
        stt: roman,
        count: blockNode.count ?? 0,
      })

      let deptCounter = 0
      blockNode.children?.forEach((deptNode, deptIdx) => {
        deptCounter += 1
        rows.push({
          id: `${blockId}-dp-${deptIdx}`,
          level: 3,
          type: 'department',
          name: deptNode.name,
          stt: deptCounter,
          count: deptNode.count ?? 0,
        })
      })
    })
  })

  return rows
}

const AttendanceProjectOrgTable = ({
  filters,
  onDataLoaded,
  scrollContainerRef,
}: AttendanceProjectOrgTableProps) => {
  const { data: report, isLoading } = useAttendanceByProjectOrganizationReport(filters)

  useEffect(() => {
    onDataLoaded?.(report)
  }, [report, onDataLoaded])

  const rows: AttendanceProjectOrgRow[] = useMemo(() => {
    const dataRows = flattenTree(report?.children || [])

    const totalRow: AttendanceProjectOrgRow = {
      id: 'total',
      level: 1,
      type: 'branch',
      isSummary: true,
      stt: '',
      name: 'Tổng',
      count: report?.total ?? 0,
    }

    return [...dataRows, totalRow]
  }, [report?.children, report?.total])

  const columns: TreeColumn<AttendanceProjectOrgRow>[] = useMemo(
    () => [
      {
        id: 'stt',
        header: <span className="typo-body-base-semibold text-content-dark-1">STT</span>,
        cell: (row: AttendanceProjectOrgRow) => (
          <span
            className={cn(
              row.level === 1 &&
                !row.isSummary &&
                'typo-body-base-semibold text-action-primary-red-default',
              row.isSummary && 'typo-body-base-semibold text-content-dark-1'
            )}
          >
            {row.stt}
          </span>
        ),
        meta: {
          frozen: true,
          width: '80px',
          align: 'center' as const,
        },
      },
      {
        id: 'name',
        header: <span className="typo-body-base-semibold text-content-dark-1">Phòng ban</span>,
        cell: (row: AttendanceProjectOrgRow) => (
          <span
            className={cn(
              'truncate',
              row.level === 1 &&
                !row.isSummary &&
                'typo-body-base-semibold text-action-primary-red-default',
              row.isSummary && 'typo-body-base-semibold text-content-dark-1',
              row.level === 2 && 'typo-body-base-semibold text-content-dark-1',
              row.level === 3 && 'pl-9'
            )}
            title={row.name}
          >
            {row.name}
          </span>
        ),
        meta: {
          frozen: true,
          width: '360px',
          align: 'left' as const,
        },
      },
      {
        id: 'count',
        header: <span className="typo-body-base-semibold text-content-dark-1">Số lượng</span>,
        cell: (row: AttendanceProjectOrgRow) => (
          <span
            className={cn(
              row.level === 1 &&
                !row.isSummary &&
                'typo-body-base-semibold text-action-primary-red-default',
              row.isSummary && 'typo-body-base-semibold text-content-dark-1',
              row.level === 2 && 'typo-body-base-semibold text-content-dark-1'
            )}
          >
            {row.count}
          </span>
        ),
        meta: {
          align: 'center' as const,
        },
      },
    ],
    []
  )

  return (
    <TableTree
      data={rows}
      columns={columns}
      isLoading={isLoading}
      density="comfortable"
      enableColspanMerging={false}
      customLevel1RowClassName={undefined}
      customLevel2RowClassName={'bg-background-2'}
      scrollContainerRef={scrollContainerRef}
    />
  )
}

export default AttendanceProjectOrgTable

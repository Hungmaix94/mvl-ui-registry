import { useEffect, useMemo, type ReactNode, type RefObject } from 'react'
import { Link } from 'react-router-dom'
import { TableTree } from '@/components/ui/table-tree/TableTree'
import {
  type GetAttendanceByProjectReportParams,
  useAttendanceByProjectReport,
  type AttendanceProjectReportAggregration,
} from '@/features/report/services/attendance-report-service'
import { APP_PATH } from '@/routes'
import { formatReportNumber } from '@/utils/common'
import ProjectDetailLink from '@/components/commons/ProjectDetailLink'
import {
  ATTENDANCE_PROJECT_REPORT_HEADERS,
  buildAttendanceProjectReportRows,
  type AttendanceProjectReportRow,
} from '@/features/report/attendance/project/utils/attendance-project-report'
import { TimesheetLogMethod as FirstLogMethod } from '@/constants/api-schema-aliases'

type AttendanceProjectTableRow = AttendanceProjectReportRow & {
  level: number
  isSummary: boolean
  countHref?: string
}

type AttendanceProjectColumn = {
  id: string
  header: string
  cell: (row: AttendanceProjectTableRow) => ReactNode
  meta: {
    frozen?: boolean
    width?: string
    align?: 'left' | 'center' | 'right'
  }
}

type AttendanceProjectTableProps = {
  filters: GetAttendanceByProjectReportParams
  onDataLoaded?: (data?: AttendanceProjectReportAggregration) => void
  scrollContainerRef?: RefObject<HTMLDivElement | null>
}

const AttendanceProjectTable = ({
  filters,
  onDataLoaded,
  scrollContainerRef,
}: AttendanceProjectTableProps) => {
  const { data: report, isLoading } = useAttendanceByProjectReport(filters)

  useEffect(() => {
    onDataLoaded?.(report)
  }, [report, onDataLoaded])

  // Khi lọc đúng 1 ngày cụ thể → số lượng trỏ sang màn chấm công hàng ngày,
  // filter sẵn phương thức GPS + dự án tương ứng của dòng.
  const fromDate = filters?.from_date
  const toDate = filters?.to_date
  const isSingleDay = !!fromDate && fromDate === toDate

  const rows: AttendanceProjectTableRow[] = useMemo(() => {
    return buildAttendanceProjectReportRows(report).map((row) => {
      // Khi lọc đúng 1 ngày, số lượt check-in trỏ sang màn chấm công hàng ngày
      // (filter sẵn GPS + dự án của dòng). Chỉ áp dụng cho dòng dự án.
      const countHref =
        isSingleDay && row.kind === 'project' && row.projectId
          ? `${APP_PATH.ATTENDANCE_DAILY_TIMESHEET}?date=${fromDate}` +
            `&first_log_method=${FirstLogMethod.geolocation}&first_log_project=${row.projectId}`
          : undefined
      return {
        ...row,
        level: 0,
        isSummary: row.kind !== 'project',
        countHref,
      }
    })
  }, [report, isSingleDay, fromDate])

  const columns = useMemo<AttendanceProjectColumn[]>(
    () => [
      {
        id: 'stt',
        header: ATTENDANCE_PROJECT_REPORT_HEADERS.STT,
        cell: (row) => row.stt,
        meta: {
          frozen: true,
          width: '80px',
          align: 'center' as const,
        },
      },
      {
        id: 'projectName',
        header: ATTENDANCE_PROJECT_REPORT_HEADERS.PROJECT,
        cell: (row) =>
          row.projectId && row.projectCode ? (
            <span
              className="typo-body-base-regular text-content-dark-1 text-wrap"
              title={row.label}
            >
              <ProjectDetailLink projectId={row.projectId} title={row.label}>
                {row.projectCode}
              </ProjectDetailLink>
              {row.projectName ? ` - ${row.projectName}` : ''}
            </span>
          ) : (
            <span
              className="typo-body-base-regular text-content-dark-1 text-wrap"
              title={row.label}
            >
              {row.label}
            </span>
          ),
        meta: {
          frozen: true,
          width: '500px',
          align: 'left' as const,
        },
      },
      {
        id: 'count',
        // 1 ngày → "Số lượt check-in"; nhiều ngày → "Số lượt check-in trung bình/ngày".
        header: isSingleDay
          ? ATTENDANCE_PROJECT_REPORT_HEADERS.SINGLE_DAY_CHECKIN
          : ATTENDANCE_PROJECT_REPORT_HEADERS.AVG_CHECKIN,
        cell: (row) =>
          row.countHref ? (
            <Link to={row.countHref} className="text-action-primary-red-default hover:underline">
              {formatReportNumber(row.count)}
            </Link>
          ) : (
            formatReportNumber(row.count)
          ),
        meta: {
          align: 'center' as const,
          width: '200px',
        },
      },
      // Cột "Số lượt check-in tổng" chỉ hiển thị khi khoảng lọc nhiều hơn 1 ngày.
      ...(isSingleDay
        ? []
        : [
            {
              id: 'totalCount',
              header: ATTENDANCE_PROJECT_REPORT_HEADERS.TOTAL_CHECKIN,
              cell: (row: AttendanceProjectTableRow) => formatReportNumber(row.totalCount),
              meta: {
                align: 'center' as const,
                width: '200px',
              },
            } as AttendanceProjectColumn,
          ]),
    ],
    [isSingleDay]
  )

  return (
    <TableTree
      data={rows}
      columns={columns as any}
      isLoading={isLoading}
      density="comfortable"
      customLevel1RowClassName={undefined}
      customLevel2RowClassName={'bg-background-2'}
      scrollContainerRef={scrollContainerRef}
    />
  )
}

export default AttendanceProjectTable

import { useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { useNavigate } from 'react-router-dom'
import { Table, TableAction } from '@/components/ui'
import { IconEye } from '@/assets/icons'
import {
  useInterviewSchedules,
  type InterviewSchedule,
} from '@/features/recruitment/services/interview-service'
import { formatDate } from '@/utils/date-utils.ts'
import { APP_PATH } from '@/routes/AppRoute.constant.ts'
import { useAbility } from '@/lib/ability.ts'

type InterviewLogRow = {
  id: number
  round: string
  interviewerNames: string
  location: string
  time: string
  note?: string | null
}

type InterviewLogTableProps = {
  candidateId: number
}

const DEFAULT_PAGE_SIZE = 50

export default function InterviewLogTable({ candidateId }: InterviewLogTableProps) {
  const navigate = useNavigate()
  const ability = useAbility()

  const { data: interviewSchedulesData, isLoading } = useInterviewSchedules({
    recruitment_candidate_id: candidateId,
    page: 1,
    page_size: DEFAULT_PAGE_SIZE,
    ordering: '-time',
  })

  const interviewLogs: InterviewLogRow[] = useMemo(() => {
    const schedules: InterviewSchedule[] = interviewSchedulesData?.results || []

    return schedules.map((schedule) => {
      const interviewerNames =
        schedule.interviewers
          ?.map((interviewer) => interviewer.fullname)
          .filter(Boolean)
          .join(', ') || '-'

      return {
        id: schedule.id,
        round: schedule.title || '-',
        interviewerNames,
        location: schedule.location || '-',
        time: schedule.time,
        note: schedule.note,
      }
    })
  }, [interviewSchedulesData?.results])

  const columns: ColumnDef<InterviewLogRow>[] = useMemo(
    () => [
      {
        accessorKey: 'round',
        header: 'Vòng phỏng vấn',
        meta: {
          width: 'w-[160px]',
        },
      },
      {
        accessorKey: 'interviewerNames',
        header: 'Người phỏng vấn',
        cell: ({ getValue }) => getValue<string>() || '-',
        meta: {
          width: 'w-[220px]',
        },
      },
      {
        accessorKey: 'location',
        header: 'Địa điểm',
        cell: ({ getValue }) => getValue<string>() || '-',
        meta: {
          width: 'w-[320px]',
        },
      },
      {
        accessorKey: 'time',
        header: 'Thời gian',
        cell: ({ getValue }) => formatDate(getValue<string>()),
        meta: {
          width: 'w-[140px]',
        },
      },
      {
        accessorKey: 'note',
        header: 'Ghi chú',
        cell: ({ getValue }) => getValue<string>() || 'N/A',
        meta: {
          width: 'flex-1',
        },
      },
    ],
    []
  )

  const rowActions: TableAction<InterviewLogRow>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye />,
        onClick: (row) => {
          navigate(APP_PATH.RECRUITMENT_INTERVIEW_SCHEDULE_DETAIL.replace(':id', String(row.id)))
        },
        show: () => ability.can('retrieve', 'interview_candidate'),
      },
    ],
    [navigate, ability]
  )

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex w-full items-center justify-start">
        <h2 className="typo-body-xl-semibold text-content-dark-1">Danh sách các vòng phỏng vấn</h2>
      </div>

      {(isLoading || interviewLogs.length > 0) && (
        <Table
          data={interviewLogs}
          columns={columns}
          enablePagination={false}
          enableSorting={false}
          showSTT={false}
          showActions
          rowActions={rowActions}
          className="border-0 p-0"
          isLoading={isLoading}
          emptyMessage="Chưa có vòng phỏng vấn nào"
        />
      )}
    </div>
  )
}

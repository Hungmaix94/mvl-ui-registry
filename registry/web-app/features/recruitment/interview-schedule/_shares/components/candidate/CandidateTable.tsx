import { useMemo } from 'react'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { ColumnDef, Table, TableAction, Button } from '@/components/ui'
import { IconPencilsimple, IconTrash, IconPlus } from '@/assets/icons'
import {
  type InterviewSchedule,
  useInterviewCandidates,
  type InterviewCandidate,
} from '@/features/recruitment/services/interview-service'
import { useCandidateAdd } from '@/features/recruitment/interview-schedule/_shares/hooks/useCandidateAdd.tsx'
import { useCandidateEdit } from '@/features/recruitment/interview-schedule/_shares/hooks/useCandidateEdit.tsx'
import { useCandidateDelete } from '@/features/recruitment/interview-schedule/_shares/hooks/useCandidateDelete.tsx'
import { useAbility } from '@/lib/ability.ts'

interface CandidateTableProps {
  schedule: InterviewSchedule
}

export default function CandidateTable({ schedule }: CandidateTableProps) {
  const ability = useAbility()

  // Fetch candidates for this interview schedule
  const { data: candidatesResponse, isLoading } = useInterviewCandidates({
    interview_schedule_id: schedule.id,
  })
  const candidates = useMemo(() => candidatesResponse?.results || [], [candidatesResponse?.results])

  // Hook for adding candidates
  const { openAddCandidateDialog } = useCandidateAdd()

  // Hook for editing candidates
  const { openEditCandidateDialog } = useCandidateEdit()

  // Hook for deleting candidates
  const { openDeleteCandidateDialog } = useCandidateDelete()

  // Format datetime for multiline display (HH:mm:ss \n DD/MM/YYYY)
  const formatDateTime = (dateString: string | null | undefined) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    const timeStr = format(date, 'HH:mm:ss')
    const dateStr = format(date, DATE_FORMAT)
    return (
      <div className="text-start">
        <div className="text-content-dark-1 text-sm">{timeStr}</div>
        <div className="text-content-dark-1 text-sm">{dateStr}</div>
      </div>
    )
  }

  // Define columns according to Figma design
  const columns: ColumnDef<InterviewCandidate>[] = useMemo(
    () => [
      {
        accessorKey: 'recruitment_candidate.code',
        id: 'code',
        header: 'Mã ƯV',
        cell: ({ getValue }) => {
          const code = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm" title={code}>
              {code || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[100px]',
        },
      },
      {
        accessorKey: 'recruitment_candidate.name',
        id: 'name',
        header: 'Họ và tên',
        cell: ({ getValue }) => {
          const name = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words" title={name}>
              {name || '-'}
            </span>
          )
        },
        meta: {
          width: 'flex-1',
        },
      },
      {
        accessorKey: 'recruitment_candidate.citizen_id',
        id: 'citizen_id',
        header: 'CCCD',
        cell: ({ getValue }) => {
          const citizenId = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm" title={citizenId}>
              {citizenId || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[120px]',
        },
      },
      {
        accessorKey: 'recruitment_candidate.phone',
        id: 'phone',
        header: 'SĐT',
        cell: ({ getValue }) => {
          const phone = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm" title={phone}>
              {phone || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[120px]',
        },
      },
      {
        accessorKey: 'recruitment_candidate.email',
        id: 'email',
        header: 'Email',
        cell: ({ getValue }) => {
          const email = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words" title={email}>
              {email || '-'}
            </span>
          )
        },
        meta: {
          width: 'flex-1',
        },
      },
      {
        accessorKey: 'interview_time',
        id: 'interview_time',
        header: 'Thời gian PV',
        cell: ({ getValue }) => {
          const interviewTime = getValue() as string
          return formatDateTime(interviewTime)
        },
        meta: {
          width: 'w-[140px]',
        },
        className: 'text-start',
      },
      {
        accessorKey: 'email_sent_at',
        id: 'email_sent_at',
        header: 'Thời gian gửi mail lần cuối',
        cell: ({ getValue }) => {
          const emailSentAt = getValue() as string
          return formatDateTime(emailSentAt)
        },
        meta: {
          width: 'w-[140px]',
        },
      },
    ],
    []
  )

  // Define row actions
  const actions: TableAction<InterviewCandidate>[] = useMemo(
    () => [
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) => {
          openEditCandidateDialog(schedule, record)
        },
        show: () => ability.can('update', 'interview_candidate'),
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => {
          openDeleteCandidateDialog(record)
        },
        show: () => ability.can('destroy', 'interview_candidate'),
      },
    ],
    [openEditCandidateDialog, openDeleteCandidateDialog, schedule, ability]
  )

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex w-full items-center justify-between">
        <h2 className="typo-body-xl-semibold text-content-dark-1">Danh sách ứng viên</h2>
        {ability.can('create', 'interview_candidate') ? (
          <>
            <Button
              variant="secondary"
              iconOnly
              size="small"
              leftIcon={<IconPlus />}
              onClick={() => openAddCandidateDialog(schedule)}
            />
          </>
        ) : (
          <>&nbsp;</>
        )}
      </div>

      {/* Only render table if there's data */}
      {candidates && candidates.length > 0 && (
        <Table
          data={candidates}
          columns={columns}
          showSTT={false}
          showActions
          rowActions={actions}
          enableSorting={false}
          enablePagination={false}
          isLoading={isLoading}
          emptyMessage="Không có ứng viên nào"
          className={'p-0'}
        />
      )}
    </div>
  )
}

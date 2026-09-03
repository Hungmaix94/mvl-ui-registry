import { useMemo } from 'react'
import { ColumnDef, Table, TableAction, Button } from '@/components/ui'
import { IconPencilsimple, IconTrash, IconPlus } from '@/assets/icons'
import type {
  InterviewSchedule,
  InterviewScheduleEmployeeNested,
} from '@/features/recruitment/services/interview-service'
import { useInterviewerDialogAdd } from '@/features/recruitment/interview-schedule/_shares/hooks/useInterviewerDialogAdd.tsx'
import { useInterviewerDialogEdit } from '@/features/recruitment/interview-schedule/_shares/hooks/useInterviewerDialogEdit.tsx'
import { useInterviewerDelete } from '@/features/recruitment/interview-schedule/_shares/hooks/useInterviewerDelete.tsx'
import { useAbility } from '@/lib/ability.ts'

interface InterviewerTableProps {
  interviewers: InterviewScheduleEmployeeNested[]
  schedule: InterviewSchedule
}

export default function InterviewerTable({ interviewers, schedule }: InterviewerTableProps) {
  const ability = useAbility()

  const { openAddInterviewerDialog } = useInterviewerDialogAdd()
  const { openEditInterviewerDialog } = useInterviewerDialogEdit()
  const { confirmDeleteInterviewer } = useInterviewerDelete()
  // Define columns according to Figma design
  const columns: ColumnDef<InterviewScheduleEmployeeNested>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        id: 'code',
        header: 'Mã NV',
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
        accessorKey: 'fullname',
        id: 'fullname',
        header: 'Họ và tên',
        cell: ({ getValue }) => {
          const fullname = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words" title={fullname}>
              {fullname || '-'}
            </span>
          )
        },
        meta: {
          width: 'flex-1',
        },
      },
      {
        accessorKey: 'position_name',
        id: 'position',
        header: 'Chức vụ',
        cell: ({ getValue }) => {
          const position = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm" title={position}>
              {position || '-'}
            </span>
          )
        },
        meta: {
          width: 'flex-1',
        },
      },
      {
        accessorKey: 'branch_name',
        id: 'branch_name',
        header: 'Chi nhánh',
        cell: ({ getValue }) => {
          const branchName = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words" title={branchName}>
              {branchName || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[150px]',
        },
      },
      {
        accessorKey: 'block_name',
        id: 'block_name',
        header: 'Khối',
        cell: ({ getValue }) => {
          const blockName = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words" title={blockName}>
              {blockName || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[150px]',
        },
      },
      {
        accessorKey: 'department_name',
        id: 'department_name',
        header: 'Phòng ban',
        cell: ({ getValue }) => {
          const departmentName = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words" title={departmentName}>
              {departmentName || '-'}
            </span>
          )
        },
        meta: {
          width: 'w-[150px]',
        },
      },
    ],
    []
  )

  // Define row actions
  const actions: TableAction<InterviewScheduleEmployeeNested>[] = useMemo(
    () => [
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) => openEditInterviewerDialog(schedule, record),
        show: () => ability.can('update_interviewers', 'interview_schedule'),
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) =>
          confirmDeleteInterviewer(
            schedule.id,
            record.id,
            interviewers,
            record.fullname || record.code || 'người phỏng vấn'
          ),
        show: () => ability.can('update_interviewers', 'interview_schedule'),
      },
    ],
    [schedule, openEditInterviewerDialog, confirmDeleteInterviewer, interviewers, ability]
  )

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex w-full items-center justify-between">
        <h2 className="typo-body-xl-semibold text-content-dark-1">Danh sách người phỏng vấn</h2>
        {ability.can('update_interviewers', 'interview_schedule') ? (
          <>
            <Button
              variant="secondary"
              iconOnly
              size="small"
              leftIcon={<IconPlus />}
              onClick={() => openAddInterviewerDialog(schedule)}
            />
          </>
        ) : (
          <>&nbsp;</>
        )}
      </div>

      {/* Only render table if there's data */}
      {interviewers && interviewers.length > 0 && (
        <Table
          data={interviewers}
          columns={columns}
          showSTT
          showActions
          rowActions={actions}
          enableSorting={false}
          enablePagination={false}
          isLoading={false}
          emptyMessage="Không có người phỏng vấn nào"
          className={'p-0'}
        />
      )}
    </div>
  )
}

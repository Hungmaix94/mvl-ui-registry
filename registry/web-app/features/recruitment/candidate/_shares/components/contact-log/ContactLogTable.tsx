import { Button, Table, TableAction } from '@/components/ui'
import { IconPencilsimple, IconPlus, IconTrash } from '@/assets/icons'
import { ColumnDef } from '@tanstack/react-table'
import {
  PaginatedRecruitmentCandidateContactLogList,
  type RecruitmentCandidate,
  useRecruitmentCandidateContactLogs,
} from '@/services'
import { useCallback, useMemo } from 'react'
import { Text } from '@radix-ui/themes'
import { ArrayElementReadonly } from '@/types'
import { useContactLogAdd } from '@/features/recruitment/candidate/_shares/hooks/useContactLogAdd.tsx'
import { useContactLogEdit } from '@/features/recruitment/candidate/_shares/hooks/useContactLogEdit.tsx'
import { useContactLogDelete } from '@/features/recruitment/candidate/_shares/hooks/useContactLogDelete.tsx'
import { formatDate } from '@/utils/date-utils.ts'
import { useAbility } from '@/lib/ability.ts'

type ContactLogData = ArrayElementReadonly<PaginatedRecruitmentCandidateContactLogList['results']>

interface ContactLogTableProps {
  candidate: RecruitmentCandidate
}

export default function ContactLogTable({ candidate }: ContactLogTableProps) {
  const ability = useAbility()

  // Fetch contact logs data
  const { data: contactLogsResponse } = useRecruitmentCandidateContactLogs({
    recruitment_candidate: candidate.id,
  })
  const contactLogs = useMemo(
    () => contactLogsResponse?.results || [],
    [contactLogsResponse?.results]
  )

  // Dialog hook for adding contact logs
  const { openAddContactLogDialog } = useContactLogAdd()

  // Dialog hook for editing contact logs
  const { openEditContactLogDialog } = useContactLogEdit()

  // Dialog hook for deleting contact logs
  const { openDeleteDialog } = useContactLogDelete()

  const columns: ColumnDef<ContactLogData>[] = [
    {
      accessorKey: 'employee',
      header: 'Người liên hệ',
      meta: {
        width: '260px',
      },
      cell: ({ getValue }) => {
        const emp = getValue() as any
        return emp?.fullname || emp?.code || '-'
      },
    },
    {
      accessorKey: 'date',
      header: 'Ngày liên hệ',
      cell: ({ getValue }) => formatDate(getValue() as string),
      meta: {
        width: '260px',
        sortable: true,
      },
    },
    {
      accessorKey: 'method',
      header: 'Phương thức',
      meta: {
        width: '260px',
        sortable: true,
      },
    },
    {
      accessorKey: 'note',
      header: 'Ghi chú',
      cell: ({ getValue }) => getValue() || 'N/A',
      meta: {
        width: 'flex-1',
      },
    },
  ]

  const rowActions: TableAction<ContactLogData>[] = [
    {
      label: 'Chỉnh sửa',
      icon: <IconPencilsimple size={16} />,
      onClick: (row: ContactLogData) => {
        openEditContactLogDialog(candidate, row)
      },
      show: () => ability.can('update', 'recruitment_candidate_contact_log'),
    },
    {
      label: 'Xoá',
      variant: 'danger' as const,
      icon: <IconTrash size={16} className="text-action-primary-red-default" />,
      onClick: (row: ContactLogData) => {
        openDeleteDialog(row)
      },
      show: () => ability.can('destroy', 'recruitment_candidate_contact_log'),
    },
  ]

  const onClickAddContactLog = useCallback(() => {
    openAddContactLogDialog(candidate)
  }, [openAddContactLogDialog, candidate])

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex w-full items-center justify-between">
        <Text className="typo-body-xl-semibold text-content-dark-1">Danh sách các lần liên hệ</Text>
        {ability.can('create', 'recruitment_candidate_contact_log') ? (
          <Button
            variant="secondary"
            iconOnly
            size="small"
            leftIcon={<IconPlus />}
            onClick={onClickAddContactLog}
          />
        ) : (
          <>&nbsp;</>
        )}
      </div>

      {/* Only render table if there's data */}
      {contactLogs && contactLogs.length > 0 && (
        <Table
          data={contactLogs}
          columns={columns}
          showActions
          rowActions={rowActions}
          enablePagination={false}
          enableSorting
          showSTT={false}
          className="border-0 p-0"
        />
      )}
    </div>
  )
}

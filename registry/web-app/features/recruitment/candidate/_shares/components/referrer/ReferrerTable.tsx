import { Button, Table, TableAction } from '@/components/ui'
import { IconPencilsimple, IconPlus, IconTrash } from '@/assets/icons'
import { ColumnDef } from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'
import type { RecruitmentCandidate } from '@/services'
import { Text } from '@radix-ui/themes'
import { useReferrerDialogAdd } from '@/features/recruitment/candidate/_shares/hooks/useReferrerDialogAdd.tsx'
import { useReferrerDialogEdit } from '@/features/recruitment/candidate/_shares/hooks/useReferrerDialogEdit.tsx'
import { useReferrerDelete } from '@/features/recruitment/candidate/_shares/hooks/useReferrerDelete.tsx'
import { useAbility } from '@/lib/ability.ts'

type Referrer = RecruitmentCandidate['referrer']

export default function ReferrerTable({ candidate }: { candidate: RecruitmentCandidate }) {
  const ability = useAbility()

  const { openAddReferrerDialog } = useReferrerDialogAdd()
  const { openEditReferrerDialog } = useReferrerDialogEdit()
  const { deleteReferrer, isDeleting } = useReferrerDelete()

  const referrers = useMemo((): Array<Referrer> => {
    if (candidate?.referrer) {
      return [candidate.referrer]
    }
    return []
  }, [candidate?.referrer])

  const columns: ColumnDef<Referrer>[] = [
    {
      accessorKey: 'code',
      header: 'Mã nhân viên',
      meta: {
        width: '260px',
      },
    },
    {
      accessorKey: 'fullname',
      header: 'Họ và tên',
      meta: {
        width: '260px',
      },
    },
    {
      accessorKey: 'department',
      header: 'Phòng ban',
      cell: ({ getValue }) => {
        const department = getValue() as any
        return department?.name || '-'
      },
      meta: {
        width: 'flex-1',
      },
    },
  ]

  const rowActions: TableAction<Referrer>[] = [
    {
      label: 'Chỉnh sửa',
      icon: <IconPencilsimple size={16} />,
      onClick: () => {
        openEditReferrerDialog(candidate)
      },
      show: () => ability.can('update_referrer', 'recruitment_candidate'),
    },
    {
      label: 'Xoá',
      variant: 'danger',
      icon: <IconTrash size={16} className="text-action-primary-red-default" />,
      onClick: () => {
        deleteReferrer(candidate)
      },
      show: () => !isDeleting || ability.can('destroy', 'recruitment_candidate'),
    },
  ]

  const onClickAddReferrer = useCallback(() => {
    openAddReferrerDialog(candidate)
  }, [openAddReferrerDialog, candidate])

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex w-full items-center justify-between">
        <Text className="typo-body-xl-semibold text-content-dark-1">Người giới thiệu</Text>
        {referrers.length === 0 && ability.can('update_referrer', 'recruitment_candidate') ? (
          <Button
            variant="secondary"
            iconOnly
            size="small"
            leftIcon={<IconPlus />}
            onClick={onClickAddReferrer}
          />
        ) : (
          <>&nbsp;</>
        )}
      </div>

      {/* Only render table if there's data */}
      {referrers.length > 0 && (
        <Table
          data={referrers}
          columns={columns}
          showActions
          rowActions={rowActions}
          enablePagination={false}
          enableSorting={false}
          showSTT={false}
          className="border-0 p-0"
        />
      )}
    </div>
  )
}

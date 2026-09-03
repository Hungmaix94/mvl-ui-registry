import { Button, Table, TableAction } from '@/components/ui'
import { IconPencilsimple, IconPlus, IconTrash } from '@/assets/icons'
import { ColumnDef } from '@tanstack/react-table'
import { useCallback, useMemo } from 'react'
import type { RecruitmentCandidate } from '@/features/recruitment/services/recruitment-candidate-service'
import { Text } from '@radix-ui/themes'
import { useContactPersonDialogAdd } from '@/features/recruitment/candidate/_shares/hooks/useContactPersonDialogAdd.tsx'
import { useContactPersonDialogEdit } from '@/features/recruitment/candidate/_shares/hooks/useContactPersonDialogEdit.tsx'
import { useContactPersonDelete } from '@/features/recruitment/candidate/_shares/hooks/useContactPersonDelete.tsx'
import { useAbility } from '@/lib/ability.ts'

type ContactPerson = NonNullable<RecruitmentCandidate['contact_person']>

export default function ContactPersonTable({ candidate }: { candidate: RecruitmentCandidate }) {
  const ability = useAbility()

  const { openAddContactPersonDialog } = useContactPersonDialogAdd()
  const { openEditContactPersonDialog } = useContactPersonDialogEdit()
  const { deleteContactPerson, isDeleting } = useContactPersonDelete()

  const contactPersons = useMemo((): ContactPerson[] => {
    if (candidate?.contact_person) {
      return [candidate.contact_person]
    }
    return []
  }, [candidate?.contact_person])

  const columns: ColumnDef<ContactPerson>[] = [
    { accessorKey: 'code', header: 'Mã nhân viên', meta: { width: '260px' } },
    { accessorKey: 'fullname', header: 'Họ và tên', meta: { width: '260px' } },
    {
      accessorKey: 'department',
      header: 'Phòng ban',
      cell: ({ getValue }) => {
        const department = getValue() as { name?: string } | undefined
        return department?.name || '-'
      },
      meta: { width: 'flex-1' },
    },
  ]

  const rowActions: TableAction<ContactPerson>[] = [
    {
      label: 'Chỉnh sửa',
      icon: <IconPencilsimple size={16} />,
      onClick: () => openEditContactPersonDialog(candidate),
      show: () => ability.can('update', 'recruitment_candidate'),
    },
    {
      label: 'Xoá',
      variant: 'danger',
      icon: <IconTrash size={16} className="text-action-primary-red-default" />,
      onClick: () => deleteContactPerson(candidate),
      show: () => ability.can('update', 'recruitment_candidate') && !isDeleting,
    },
  ]

  const onClickAddContactPerson = useCallback(() => {
    openAddContactPersonDialog(candidate)
  }, [openAddContactPersonDialog, candidate])

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex w-full items-center justify-between">
        <Text className="typo-body-xl-semibold text-content-dark-1">Người liên hệ</Text>
        {contactPersons.length === 0 && ability.can('update', 'recruitment_candidate') ? (
          <Button
            variant="secondary"
            iconOnly
            size="small"
            leftIcon={<IconPlus />}
            onClick={onClickAddContactPerson}
          />
        ) : (
          <>&nbsp;</>
        )}
      </div>

      {contactPersons.length > 0 && (
        <Table
          data={contactPersons}
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

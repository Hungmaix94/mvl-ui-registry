import { useCallback } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { ColumnDef } from '@tanstack/react-table'

import { Button, Table, type TableAction } from '@/components/ui'
import {
  useBranchContactInfos,
  type BranchContactInfo,
} from '@/features/org/services/branch-service'
import { useAbility } from '@/lib/ability.ts'
import { IconPencilsimple, IconTrash, IconPlus } from '@/assets/icons'
import { useBranchContactInfoDelete } from '@/features/org/branch/_shares/hooks/useBranchContactInfoDelete.tsx'
import { useBranchContactInfoAdd } from '@/features/org/branch/_shares/hooks/useBranchContactInfoAdd.tsx'

interface BranchContactInfoSectionProps {
  branchId: number
}

export const BranchContactInfoSection = ({ branchId }: BranchContactInfoSectionProps) => {
  const ability = useAbility()
  const { openDeleteDialog } = useBranchContactInfoDelete(branchId)
  const { openAddDialog, openEditDialog } = useBranchContactInfoAdd(branchId)

  const { data: contactInfosResponse, isLoading } = useBranchContactInfos({ branch: branchId })
  const contactInfos = contactInfosResponse?.results || []

  const handleAdd = useCallback(() => {
    openAddDialog()
  }, [openAddDialog])

  const handleEdit = useCallback(
    (contactInfo: BranchContactInfo) => {
      openEditDialog(contactInfo)
    },
    [openEditDialog]
  )

  const handleDelete = useCallback(
    (contactInfoId: number) => {
      openDeleteDialog(contactInfoId)
    },
    [openDeleteDialog]
  )

  const columns: ColumnDef<BranchContactInfo>[] = [
    {
      accessorKey: 'business_line',
      header: 'Lĩnh vực kinh doanh',
      cell: ({ row }) => row.original.business_line || '-',
      meta: {
        width: 'w-[200px]',
      },
    },
    {
      accessorKey: 'name',
      header: 'Tên liên hệ',
      cell: ({ row }) => row.original.name || '-',
      meta: {
        width: 'w-[200px]',
      },
    },
    {
      accessorKey: 'phone_number',
      header: 'Số điện thoại',
      cell: ({ row }) => row.original.phone_number || '-',
      meta: {
        width: 'w-[150px]',
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => row.original.email || '-',
      meta: {
        width: 'flex-1',
      },
    },
  ]

  const actions: TableAction<BranchContactInfo>[] = []

  if (ability.can('update', 'branch')) {
    actions.push({
      label: 'Chỉnh sửa',
      icon: <IconPencilsimple />,
      onClick: handleEdit,
    })
  }

  if (ability.can('destroy', 'branch')) {
    actions.push({
      label: 'Xóa',
      icon: <IconTrash className="text-action-primary-red-default" />,
      variant: 'danger',
      onClick: (contactInfo) => handleDelete(contactInfo.id || 0),
    })
  }

  return (
    <>
      <Flex direction="column" gap="5" className="bg-background-1 rounded-lg">
        <Flex justify="between" align="center">
          <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin liên hệ</Text>
          {ability.can('create', 'branch') && (
            <Button variant="secondary" className="bg-neutral-30 h-9 w-9 p-2.5" onClick={handleAdd}>
              <IconPlus className="h-4 w-4" />
            </Button>
          )}
        </Flex>

        {contactInfos.length > 0 && (
          <Table
            columns={columns}
            data={contactInfos}
            showSTT={false}
            rowActions={actions}
            showActions
            isLoading={isLoading}
            className="px-0"
            enablePagination={false}
          />
        )}
      </Flex>
    </>
  )
}

export default BranchContactInfoSection

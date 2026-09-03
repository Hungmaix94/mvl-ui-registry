import { useCallback } from 'react'
import { Button, Table, TableAction } from '@/components/ui'
import { IconPencilsimple, IconPlus, IconTrash } from '@/assets/icons'
import { ColumnDef } from '@tanstack/react-table'
import { Text } from '@radix-ui/themes'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  ReferrerFormFieldDialog,
  type ReferrerFormFieldDialogSavePayload,
} from './ReferrerFormFieldDialog.tsx'

type ReferrerDisplay = {
  code: string
  fullname: string
  department_name: string
}

type ReferrerRow = {
  code: string
  fullname: string
  department: { name: string }
}

type ReferrerFormFieldProps = {
  referrerId: number | null
  referrerDisplay: ReferrerDisplay | null | undefined
  onReferrerChange: (referrerId: number | null, referrerDisplay: ReferrerDisplay | null) => void
}

export default function ReferrerFormField({
  referrerId,
  referrerDisplay,
  onReferrerChange,
}: ReferrerFormFieldProps) {
  const { displayFormContent } = useDialog()

  const referrers: ReferrerRow[] = referrerId
    ? [
        {
          code: referrerDisplay?.code ?? '',
          fullname: referrerDisplay?.fullname ?? '',
          department: { name: referrerDisplay?.department_name ?? '' },
        },
      ]
    : []

  const columns: ColumnDef<ReferrerRow>[] = [
    { accessorKey: 'code', header: 'Mã nhân viên', meta: { width: '260px' } },
    { accessorKey: 'fullname', header: 'Họ và tên', meta: { width: '260px' } },
    {
      accessorKey: 'department',
      header: 'Phòng ban',
      cell: ({ getValue }) => (getValue() as { name?: string })?.name || '-',
      meta: { width: 'flex-1' },
    },
  ]

  const handleEdit = useCallback(() => {
    if (!referrerId) return
    displayFormContent({
      size: 'lg',
      title: 'Chỉnh sửa người giới thiệu',
      content: (
        <ReferrerFormFieldDialog
          mode="edit"
          initialValues={{
            employee_id: referrerId,
            code: referrerDisplay?.code,
            fullname: referrerDisplay?.fullname,
            department_name: referrerDisplay?.department_name,
          }}
          onSave={(payload: ReferrerFormFieldDialogSavePayload) => {
            onReferrerChange(payload.employee_id, {
              code: payload.code,
              fullname: payload.fullname,
              department_name: payload.department_name,
            })
          }}
        />
      ),
      hideFooter: true,
      dialogContentClassName: 'p-0',
    })
  }, [displayFormContent, onReferrerChange, referrerId, referrerDisplay])

  const rowActions: TableAction<ReferrerRow>[] = [
    {
      label: 'Chỉnh sửa',
      icon: <IconPencilsimple size={16} />,
      onClick: handleEdit,
    },
    {
      label: 'Xoá',
      variant: 'danger',
      icon: <IconTrash size={16} className="text-action-primary-red-default" />,
      onClick: () => onReferrerChange(null, null),
    },
  ]

  const handleAdd = useCallback(() => {
    displayFormContent({
      size: 'lg',
      title: 'Thêm người giới thiệu',
      content: (
        <ReferrerFormFieldDialog
          mode="add"
          onSave={(payload: ReferrerFormFieldDialogSavePayload) => {
            onReferrerChange(payload.employee_id, {
              code: payload.code,
              fullname: payload.fullname,
              department_name: payload.department_name,
            })
          }}
        />
      ),
      hideFooter: true,
      dialogContentClassName: 'p-0',
    })
  }, [displayFormContent, onReferrerChange])

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex w-full items-center justify-between">
        <Text className="typo-body-xl-semibold text-content-dark-1">Người giới thiệu</Text>
        {referrers.length === 0 ? (
          <Button
            type="button"
            variant="secondary"
            iconOnly
            size="small"
            leftIcon={<IconPlus />}
            onClick={handleAdd}
          />
        ) : (
          <>&nbsp;</>
        )}
      </div>
      {referrers.length > 0 && (
        <Table
          data={referrers}
          columns={columns}
          rowActions={rowActions}
          showActions
          enablePagination={false}
          enableSorting={false}
          showSTT={false}
          className="border-0 p-0"
        />
      )}
    </div>
  )
}

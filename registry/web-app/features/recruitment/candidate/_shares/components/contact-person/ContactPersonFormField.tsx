import { useCallback } from 'react'
import { Button, Table, TableAction } from '@/components/ui'
import { IconPencilsimple, IconPlus, IconTrash } from '@/assets/icons'
import { ColumnDef } from '@tanstack/react-table'
import { Text } from '@radix-ui/themes'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  ContactPersonFormFieldDialog,
  type ContactPersonFormFieldDialogSavePayload,
} from './ContactPersonFormFieldDialog.tsx'

type ContactPersonDisplay = {
  code: string
  fullname: string
  department_name: string
}

type ContactPersonRow = {
  code: string
  fullname: string
  department: { name: string }
}

type ContactPersonFormFieldProps = {
  contactPersonId: number | null
  contactPersonDisplay: ContactPersonDisplay | null | undefined
  onContactPersonChange: (
    contactPersonId: number | null,
    contactPersonDisplay: ContactPersonDisplay | null
  ) => void
}

export default function ContactPersonFormField({
  contactPersonId,
  contactPersonDisplay,
  onContactPersonChange,
}: ContactPersonFormFieldProps) {
  const { displayFormContent } = useDialog()

  const contactPersons: ContactPersonRow[] = contactPersonId
    ? [
        {
          code: contactPersonDisplay?.code ?? '',
          fullname: contactPersonDisplay?.fullname ?? '',
          department: { name: contactPersonDisplay?.department_name ?? '' },
        },
      ]
    : []

  const columns: ColumnDef<ContactPersonRow>[] = [
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
    if (!contactPersonId) return
    displayFormContent({
      size: 'lg',
      title: 'Chỉnh sửa người liên hệ',
      content: (
        <ContactPersonFormFieldDialog
          mode="edit"
          initialValues={{
            employee_id: contactPersonId,
            code: contactPersonDisplay?.code,
            fullname: contactPersonDisplay?.fullname,
            department_name: contactPersonDisplay?.department_name,
          }}
          onSave={(payload: ContactPersonFormFieldDialogSavePayload) => {
            onContactPersonChange(payload.employee_id, {
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
  }, [displayFormContent, onContactPersonChange, contactPersonId, contactPersonDisplay])

  const rowActions: TableAction<ContactPersonRow>[] = [
    {
      label: 'Chỉnh sửa',
      icon: <IconPencilsimple size={16} />,
      onClick: handleEdit,
    },
    {
      label: 'Xoá',
      variant: 'danger',
      icon: <IconTrash size={16} className="text-action-primary-red-default" />,
      onClick: () => onContactPersonChange(null, null),
    },
  ]

  const handleAdd = useCallback(() => {
    displayFormContent({
      size: 'lg',
      title: 'Thêm người liên hệ',
      content: (
        <ContactPersonFormFieldDialog
          mode="add"
          onSave={(payload: ContactPersonFormFieldDialogSavePayload) => {
            onContactPersonChange(payload.employee_id, {
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
  }, [displayFormContent, onContactPersonChange])

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex w-full items-center justify-between">
        <Text className="typo-body-xl-semibold text-content-dark-1">Người liên hệ</Text>
        {contactPersons.length === 0 ? (
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
      {contactPersons.length > 0 && (
        <Table
          data={contactPersons}
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

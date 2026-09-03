import { useCallback } from 'react'
import { Button, Table, TableAction } from '@/components/ui'
import { IconPencilsimple, IconPlus, IconTrash } from '@/assets/icons'
import { ColumnDef } from '@tanstack/react-table'
import { Text } from '@radix-ui/themes'
import { useDialog } from '@/hooks/useDialog.ts'
import {
  ContactLogFormFieldDialog,
  type ContactLogFormFieldDialogSavePayload,
  type ContactLogFormFieldItem,
} from './ContactLogFormFieldDialog.tsx'
import { formatDate } from '@/utils/date-utils.ts'

type ContactLogRow = ContactLogFormFieldItem & {
  employee_name: string
  _index: number
}

type ContactLogFormFieldProps = {
  contactLogs: ContactLogFormFieldItem[]
  contactLogsDisplay: { employee_name: string }[] | undefined
  onContactLogsChange: (
    logs: ContactLogFormFieldItem[],
    display: { employee_name: string }[]
  ) => void
}

export default function ContactLogFormField({
  contactLogs,
  contactLogsDisplay,
  onContactLogsChange,
}: ContactLogFormFieldProps) {
  const { displayFormContent } = useDialog()

  const rows: ContactLogRow[] = (contactLogs ?? []).map((log, i) => ({
    ...log,
    employee_name: contactLogsDisplay?.[i]?.employee_name ?? '',
    _index: i,
  }))

  const columns: ColumnDef<ContactLogRow>[] = [
    {
      accessorKey: 'employee_name',
      header: 'Người liên hệ',
      cell: ({ getValue }) => getValue() || '-',
      meta: { width: '260px' },
    },
    {
      accessorKey: 'date',
      header: 'Ngày liên hệ',
      cell: ({ getValue }) => formatDate(getValue() as string),
      meta: { width: '260px' },
    },
    { accessorKey: 'method', header: 'Phương thức', meta: { width: '260px' } },
    {
      accessorKey: 'note',
      header: 'Ghi chú',
      cell: ({ getValue }) => (getValue() as string) || 'N/A',
      meta: { width: 'flex-1' },
    },
  ]

  const handleAdd = useCallback(() => {
    displayFormContent({
      size: 'lg',
      title: 'Thêm lần liên hệ',
      content: (
        <ContactLogFormFieldDialog
          mode="add"
          onSave={(payload: ContactLogFormFieldDialogSavePayload) => {
            const newLogs = [
              ...(contactLogs ?? []),
              {
                employee_id: payload.employee_id,
                date: payload.date,
                method: payload.method,
                note: payload.note,
              },
            ]
            const newDisplay = [
              ...(contactLogsDisplay ?? []),
              { employee_name: payload.employee_name },
            ]
            onContactLogsChange(newLogs, newDisplay)
          }}
        />
      ),
      hideFooter: true,
      dialogContentClassName: 'p-0',
    })
  }, [displayFormContent, contactLogs, contactLogsDisplay, onContactLogsChange])

  const handleEdit = useCallback(
    (row: ContactLogRow) => {
      const idx = row._index
      displayFormContent({
        size: 'lg',
        title: 'Sửa lần liên hệ',
        content: (
          <ContactLogFormFieldDialog
            mode="edit"
            initialValues={{
              ...contactLogs[idx],
              employee_name: contactLogsDisplay?.[idx]?.employee_name,
            }}
            onSave={(payload: ContactLogFormFieldDialogSavePayload) => {
              const newLogs = [...(contactLogs ?? [])]
              const newDisplay = [...(contactLogsDisplay ?? [])]
              newLogs[idx] = {
                employee_id: payload.employee_id,
                date: payload.date,
                method: payload.method,
                note: payload.note,
              }
              newDisplay[idx] = { employee_name: payload.employee_name }
              onContactLogsChange(newLogs, newDisplay)
            }}
          />
        ),
        hideFooter: true,
        dialogContentClassName: 'p-0',
      })
    },
    [displayFormContent, contactLogs, contactLogsDisplay, onContactLogsChange]
  )

  const handleDelete = useCallback(
    (row: ContactLogRow) => {
      const idx = row._index
      const newLogs = (contactLogs ?? []).filter((_, i) => i !== idx)
      const newDisplay = (contactLogsDisplay ?? []).filter((_, i) => i !== idx)
      onContactLogsChange(newLogs, newDisplay)
    },
    [contactLogs, contactLogsDisplay, onContactLogsChange]
  )

  const rowActions: TableAction<ContactLogRow>[] = [
    {
      label: 'Chỉnh sửa',
      icon: <IconPencilsimple size={16} />,
      onClick: (row) => handleEdit(row),
    },
    {
      label: 'Xoá',
      variant: 'danger',
      icon: <IconTrash size={16} className="text-action-primary-red-default" />,
      onClick: (row) => handleDelete(row),
    },
  ]

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex w-full items-center justify-between">
        <Text className="typo-body-xl-semibold text-content-dark-1">Danh sách các lần liên hệ</Text>
        <Button
          variant="secondary"
          iconOnly
          size="small"
          leftIcon={<IconPlus />}
          onClick={handleAdd}
        />
      </div>
      {rows.length > 0 && (
        <Table
          data={rows}
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

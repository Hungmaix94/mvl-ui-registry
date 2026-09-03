import { useMemo } from 'react'
import { type Employee } from '@/features/employee/services/employee-service'
import { Table } from '@/components/ui'
import type { ColumnDef } from '@tanstack/react-table'
import { formatDate } from '@/utils/date-utils.ts'
import TerminationEmailPreview from './TerminationEmailPreview.tsx'

type TerminationEmailDialogProps = {
  employee: Employee
}

export default function TerminationEmailDialog({ employee }: TerminationEmailDialogProps) {
  const columns: ColumnDef<Employee>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã NV',
        meta: { width: 'w-[100px]' },
        cell: ({ getValue }) => {
          const code = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm" title={code}>
              {code || '-'}
            </span>
          )
        },
      },
      {
        accessorKey: 'fullname',
        header: 'Họ và tên',
        meta: { width: 'flex-1' },
        cell: ({ getValue }) => {
          const fullname = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words" title={fullname}>
              {fullname || '-'}
            </span>
          )
        },
      },
      {
        accessorKey: 'department',
        header: 'Phòng ban',
        meta: { width: 'w-[180px]' },
        cell: ({ row }) => {
          const department = row.original.department
          const departmentName = typeof department === 'object' ? department?.name : department
          return (
            <span className="text-content-dark-1 text-sm break-words" title={departmentName || ''}>
              {departmentName || '-'}
            </span>
          )
        },
      },
      {
        accessorKey: 'resignation_start_date',
        header: 'Ngày nghỉ việc',
        meta: { width: 'w-[130px]' },
        cell: ({ getValue }) => {
          const value = getValue() as string | undefined
          return <span className="text-content-dark-1 text-sm">{formatDate(value)}</span>
        },
      },
      {
        accessorKey: 'personal_email',
        header: 'Email cá nhân',
        meta: { width: 'flex-1' },
        cell: ({ getValue }) => {
          const email = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm break-words" title={email}>
              {email || '-'}
            </span>
          )
        },
      },
    ],
    []
  )

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-0.5">
          <span className="typo-body-base-semibold text-content-dark-2">Gửi đến nhân viên:</span>
        </div>
        <Table
          data={[employee]}
          columns={columns}
          showSTT={false}
          showActions={false}
          enablePagination={false}
          enableSorting={false}
          isLoading={false}
          className="px-0 pb-4"
        />
      </div>

      <div className="bg-border-1 h-px w-full" />

      <TerminationEmailPreview employee={employee} />
    </div>
  )
}

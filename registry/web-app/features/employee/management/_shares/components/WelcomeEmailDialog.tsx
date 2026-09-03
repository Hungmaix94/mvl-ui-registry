import { useMemo } from 'react'
import { type Employee } from '@/features/employee/services/employee-service'
import { Table } from '@/components/ui'
import type { ColumnDef } from '@tanstack/react-table'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import EmailPreview from './EmailPreview.tsx'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'

type WelcomeEmailDialogProps = {
  employee: Employee
}

export default function WelcomeEmailDialog({ employee }: WelcomeEmailDialogProps) {
  // Define table columns for employee information
  const columns: ColumnDef<Employee>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã NV',
        meta: {
          width: 'w-[100px]',
        },
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
        meta: {
          width: 'flex-1',
        },
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
        meta: {
          width: 'w-[180px]',
        },
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
        accessorKey: 'start_date',
        header: 'Ngày bắt đầu',
        meta: {
          width: 'w-[130px]',
        },
        cell: ({ getValue }) => {
          const startDate = getValue() as string | undefined
          if (!startDate) return <span className="text-content-dark-1 text-sm">-</span>
          try {
            const formattedDate = format(new Date(startDate), DATE_FORMAT)
            return (
              <span className="text-content-dark-1 text-sm" title={formattedDate}>
                {formattedDate}
              </span>
            )
          } catch {
            return <span className="text-content-dark-1 text-sm">-</span>
          }
        },
      },
      {
        accessorKey: 'personal_email',
        header: 'Email cá nhân',
        meta: {
          width: 'flex-1',
        },
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
      {/* Employee Information Table */}
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

      {/* Separator */}
      <SeparatorHorizontal />

      {/* Email Preview */}
      <EmailPreview employee={employee} />
    </div>
  )
}

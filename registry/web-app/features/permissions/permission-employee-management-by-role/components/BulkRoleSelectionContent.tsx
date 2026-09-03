import { useMemo, useState, useImperativeHandle, forwardRef } from 'react'
import Select from '@/components/ui/select/Select.tsx'
import Table from '@/components/ui/table/Table.tsx'
import { useRoleSelect } from '@/hooks/useRoleSelect.ts'
import { PAGE_SIZE } from '@/constants/table'
import type { EmployeeRole } from '../types.ts'
import type { ColumnDef } from '@tanstack/react-table'

type BulkRoleSelectionContentProps = {
  selectedEmployees: EmployeeRole[]
}

export type BulkRoleSelectionContentRef = {
  getSelectedRoleId: () => string
  hasValidSelection: () => boolean
}

const BulkRoleSelectionContent = forwardRef<
  BulkRoleSelectionContentRef,
  BulkRoleSelectionContentProps
>(({ selectedEmployees }, ref) => {
  const [newRoleId, setNewRoleId] = useState<string | number | null>(null)
  const { loadRoleOptions, loadInitialRoleOptions } = useRoleSelect({ pageSize: PAGE_SIZE })

  useImperativeHandle(
    ref,
    () => ({
      getSelectedRoleId: () => (newRoleId ? String(newRoleId) : ''),
      hasValidSelection: () => newRoleId !== null && newRoleId !== undefined,
    }),
    [newRoleId]
  )

  const columns: ColumnDef<EmployeeRole>[] = useMemo(
    () => [
      {
        accessorKey: 'employee_code',
        header: 'Mã',
        meta: {
          width: '100px',
        },
        cell: ({ row }) => (
          <span className="truncate" title={row.original.employee_code || ''}>
            {row.original.employee_code || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'employee_name',
        header: 'Tên',
        meta: {
          width: '180px',
        },
        cell: ({ row }) => (
          <span className="truncate" title={row.original.employee_name || ''}>
            {row.original.employee_name || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'role_name',
        header: 'Vai trò',
        meta: {
          width: '150px',
        },
        cell: ({ row }) => (
          <span className="truncate" title={row.original.role_name || ''}>
            {row.original.role_name || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'branch_name',
        header: 'Chi nhánh',
        meta: {
          width: '180px',
        },
        cell: ({ row }) => (
          <span className="truncate" title={row.original.branch_name || ''}>
            {row.original.branch_name || '-'}
          </span>
        ),
      },
      {
        accessorKey: 'position_name',
        header: 'Chức vụ',
        meta: {
          width: 'auto',
        },
        cell: ({ row }) => (
          <span className="truncate" title={row.original.position_name || ''}>
            {row.original.position_name || '-'}
          </span>
        ),
      },
    ],
    []
  )

  return (
    <div className="">
      {/* Selected Employees Table */}
      <div className="max-h-[400px] overflow-y-auto">
        <Table<EmployeeRole>
          data={selectedEmployees}
          columns={columns}
          enablePagination={false}
          enableRowSelection={false}
          showSTT={true}
          density="comfortable"
          emptyMessage="Không có nhân viên nào được chọn"
          className="border-0 px-0"
        />
      </div>

      {/* Role Selection */}
      <Select
        value={newRoleId ?? undefined}
        onChange={(value) => setNewRoleId(Array.isArray(value) ? null : value)}
        required
        label="Vai trò mới"
        placeholder="Chọn vai trò"
        loadOptions={loadRoleOptions}
        loadInitialOptions={loadInitialRoleOptions}
        pageSize={PAGE_SIZE}
        enableSearch
        searchPlaceholder="Tìm kiếm vai trò..."
        debounceMs={300}
        wrapperClassName="pt-6"
      />
    </div>
  )
})

BulkRoleSelectionContent.displayName = 'BulkRoleSelectionContent'

export default BulkRoleSelectionContent

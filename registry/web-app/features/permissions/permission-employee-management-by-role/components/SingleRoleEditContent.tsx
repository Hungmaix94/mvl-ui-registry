import { useState, useImperativeHandle, forwardRef } from 'react'
import Select from '@/components/ui/select/Select.tsx'
import Table from '@/components/ui/table/Table.tsx'
import { useRoleSelect } from '@/hooks/useRoleSelect.ts'
import { PAGE_SIZE } from '@/constants/table'
import type { EmployeeRole } from '../types.ts'
import type { ColumnDef } from '@tanstack/react-table'

type SingleRoleEditContentProps = {
  employee: EmployeeRole
  initialRoleId?: string | number | null
}

export type SingleRoleEditContentRef = {
  getSelectedRoleId: () => string
  getInitialRoleId: () => string
  hasValidSelection: () => boolean
}

const SingleRoleEditContent = forwardRef<SingleRoleEditContentRef, SingleRoleEditContentProps>(
  ({ employee, initialRoleId }, ref) => {
    const [newRoleId, setNewRoleId] = useState<string | number | null>(initialRoleId ?? null)
    const { loadRoleOptions, loadInitialRoleOptions } = useRoleSelect({ pageSize: PAGE_SIZE })

    useImperativeHandle(
      ref,
      () => ({
        getSelectedRoleId: () => (newRoleId ? String(newRoleId) : ''),
        getInitialRoleId: () => (initialRoleId ? String(initialRoleId) : ''),
        hasValidSelection: () => {
          if (newRoleId === null || newRoleId === undefined) return false
          if (initialRoleId === null || initialRoleId === undefined) return true
          return String(newRoleId) !== String(initialRoleId)
        },
      }),
      [newRoleId, initialRoleId]
    )

    // Table columns definition
    const columns: ColumnDef<EmployeeRole>[] = [
      {
        accessorKey: 'employee_code',
        header: 'Mã',
        meta: { width: '100px' },
      },
      {
        accessorKey: 'employee_name',
        header: 'Tên',
        meta: { width: '180px' },
      },
      {
        accessorKey: 'role_name',
        header: 'Vai trò',
        meta: { width: '120px' },
      },
      {
        accessorKey: 'branch_name',
        header: 'Chi nhánh',
        meta: { width: '180px' },
      },
      {
        accessorKey: 'position_name',
        header: 'Chức vụ',
        meta: { width: 'auto' },
      },
    ]

    return (
      <div className="space-y-6">
        {/* Employee Info Table */}
        <Table<EmployeeRole>
          data={[employee]}
          columns={columns}
          showSTT
          enablePagination={false}
          enableRowSelection={false}
          density="comfortable"
          emptyMessage="Không có dữ liệu"
          className="border-0 px-0"
        />

        {/* Role Selection */}
        <div className="space-y-2">
          <Select
            value={newRoleId ?? undefined}
            onChange={(value) => setNewRoleId(Array.isArray(value) ? null : value)}
            required
            label="Vai trò mới"
            placeholder="Chọn vai trò mới"
            loadOptions={loadRoleOptions}
            loadInitialOptions={loadInitialRoleOptions}
            pageSize={PAGE_SIZE}
            enableSearch
            searchPlaceholder="Tìm kiếm vai trò..."
            debounceMs={300}
          />
        </div>
      </div>
    )
  }
)

SingleRoleEditContent.displayName = 'SingleRoleEditContent'

export default SingleRoleEditContent

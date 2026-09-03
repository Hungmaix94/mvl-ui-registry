import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, ColumnDef, TableAction } from '@/components/ui'
import { IconEye } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import {
  type EmployeeDependent,
  useEmployeeDependents,
} from '@/features/employee/services/employee-dependent-service'
import { formatDate } from '@/utils/date-utils.ts'

type DependentTabProps = {
  employee?: { id: number }
}

const DependentTab = ({ employee }: DependentTabProps) => {
  const navigate = useNavigate()

  // Fetch dependents for the specific employee
  const { data: dependentsData, isLoading } = useEmployeeDependents({
    employee: employee?.id,
  })

  const dependents = useMemo(() => dependentsData?.results || [], [dependentsData?.results])

  // Define table columns matching Figma design
  const columns: ColumnDef<EmployeeDependent>[] = useMemo(
    () => [
      {
        accessorKey: 'dependent_name',
        id: 'dependent_name',
        header: 'Tên người phụ thuộc',
        cell: ({ getValue }) => {
          const value = getValue() as string | undefined
          return (
            <span className="text-content-dark-1 truncate text-sm" title={value || '-'}>
              {value || '-'}
            </span>
          )
        },
        meta: { width: 'flex-1', sortable: false },
      },
      {
        accessorKey: 'relationship_display',
        id: 'relationship_display',
        header: 'Mối quan hệ',
        cell: ({ getValue }) => {
          const value = getValue() as string | undefined
          return (
            <span className="text-content-dark-1 truncate text-sm" title={value || '-'}>
              {value || '-'}
            </span>
          )
        },
        meta: { width: 'w-[300px]', sortable: false },
      },
      {
        accessorKey: 'effective_date',
        id: 'effective_date',
        header: 'Ngày hiệu lực',
        cell: ({ getValue }) => {
          const dateString = getValue() as string | null | undefined
          const formattedDate = formatDate(dateString)
          return (
            <span className="text-content-dark-1 text-sm" title={formattedDate}>
              {formattedDate}
            </span>
          )
        },
        meta: { width: 'w-[300px]', sortable: false },
      },
    ],
    []
  )

  // Define row actions
  const actions: TableAction<EmployeeDependent>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) => {
          navigate(APP_PATH.EMPLOYEE_DEPENDENT_DETAIL.replace(':id', String(record.id)), {
            state: { fromEmployeeDetail: employee?.id },
          })
        },
      },
    ],
    [navigate, employee?.id]
  )

  return (
    <Table
      data={dependents}
      columns={columns}
      showSTT={false}
      showActions
      rowActions={actions}
      enablePagination
      enableSorting={false}
      isLoading={isLoading}
      className="flex-1 px-0"
    />
  )
}

export default DependentTab

import { useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, ColumnDef, TableAction } from '@/components/ui'
import { IconEye } from '@/assets/icons'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { APP_PATH } from '@/routes'
import {
  type EmployeeRelationship,
  useEmployeeRelationships,
} from '@/features/employee/services/employee-relationship-service'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'

type RelationTabProps = {
  employee?: { id: number }
}

const RelationTab = ({ employee }: RelationTabProps) => {
  const navigate = useNavigate()

  // Fetch relation type constants
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.EMPLOYEE_RELATIONSHIP.RELATION_TYPE],
  })

  // Fetch relationships for the specific employee
  const { data: relationshipsData, isLoading } = useEmployeeRelationships({
    employee: employee?.id,
  })

  const relationships = useMemo(
    () => relationshipsData?.results || [],
    [relationshipsData?.results]
  )

  // Get relation type mapping
  const relationTypeMapping = useMemo(() => {
    return keysMap.get(APP_CONSTANT_KEY.EMPLOYEE_RELATIONSHIP.RELATION_TYPE) || {}
  }, [keysMap])

  // Format relation type display text
  const formatRelationType = useCallback(
    (relationType: string | undefined) => {
      if (!relationType) return '-'
      return relationTypeMapping[relationType] || relationType
    },
    [relationTypeMapping]
  )

  // Define table columns matching Figma design
  const columns: ColumnDef<EmployeeRelationship>[] = useMemo(
    () => [
      {
        accessorKey: 'relative_name',
        id: 'relative_name',
        header: 'Tên người thân',
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
        accessorKey: 'relation_type',
        id: 'relation_type',
        header: 'Mối quan hệ',
        cell: ({ getValue }) => {
          const relationType = getValue() as string | undefined
          const displayText = formatRelationType(relationType)
          return (
            <span className="text-content-dark-1 truncate text-sm" title={displayText}>
              {displayText}
            </span>
          )
        },
        meta: { width: 'w-[250px]', sortable: false },
      },
      {
        accessorKey: 'date_of_birth',
        id: 'date_of_birth',
        header: 'Ngày sinh',
        cell: ({ getValue }) => {
          const dateString = getValue() as string | null | undefined
          const formattedDate = dateString ? format(new Date(dateString), DATE_FORMAT) : '-'
          return (
            <span className="text-content-dark-1 text-sm" title={formattedDate}>
              {formattedDate}
            </span>
          )
        },
        meta: { width: 'w-[200px]', sortable: false },
      },
      {
        accessorKey: 'occupation',
        id: 'occupation',
        header: 'Nghề nghiệp',
        cell: ({ getValue }) => {
          const value = getValue() as string | null | undefined
          return (
            <span className="text-content-dark-1 truncate text-sm" title={value || '-'}>
              {value || '-'}
            </span>
          )
        },
        meta: { width: 'w-[200px]', sortable: false },
      },
    ],
    [formatRelationType]
  )

  // Define row actions
  const actions: TableAction<EmployeeRelationship>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) => {
          navigate(APP_PATH.EMPLOYEE_RELATION_DETAIL.replace(':id', String(record.id)))
        },
      },
    ],
    [navigate]
  )

  return (
    <Table
      data={relationships}
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

export default RelationTab

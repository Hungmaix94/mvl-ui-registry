import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flex } from '@radix-ui/themes'
import { ColumnDef, Table, TableAction } from '@/components/ui'
import { IconEye, IconPencilsimple } from '@/assets/icons'
import { useAbility, parsePermissionCode } from '@/lib/ability'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { formatDate } from '@/utils/date-utils'
import ContractEvaluationStatusBadge from '../_shares/components/ContractEvaluationStatusBadge'
import {
  CONTRACT_EVALUATION_PERMISSIONS,
  CONTRACT_EVALUATION_ROLE,
  type ContractEvaluationRole,
} from '../_shares/constants/contract-evaluation-constants'
import { getEvaluationRoutePaths } from '../_shares/utils/contract-evaluation-route-utils'
import type { components } from '@/api/schema'

type ContractEvaluationListItem = components['schemas']['ContractEvaluationList']

type ContractEvaluationTableProps = {
  data: ContractEvaluationListItem[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  role: ContractEvaluationRole
  onClearFilter?: () => void
  hasFilter?: boolean
}

const PERMISSIONS_BY_ROLE = {
  [CONTRACT_EVALUATION_ROLE.MANAGER]: CONTRACT_EVALUATION_PERMISSIONS.MANAGER,
  [CONTRACT_EVALUATION_ROLE.HR]: CONTRACT_EVALUATION_PERMISSIONS.HR,
} as const

const ContractEvaluationTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  role,
}: ContractEvaluationTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const can = useMemo(
    () => (code: string) => {
      const parsed = parsePermissionCode(code)
      return parsed ? ability.can(parsed.action, parsed.subject) : false
    },
    [ability]
  )

  const permissions = PERMISSIONS_BY_ROLE[role]

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_FORM_TYPE],
  })

  const formTypeLabels = keysMap.get(APP_CONSTANT_KEY.HRM.CONTRACT_EVALUATION_FORM_TYPE) as
    | Record<string, string>
    | undefined

  const routePaths = useMemo(() => getEvaluationRoutePaths(role), [role])
  const detailPath = routePaths.detail
  const editPath = routePaths.edit

  const columns: ColumnDef<ContractEvaluationListItem>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã phiếu',
        meta: { width: 'w-[140px]', sortable: true },
        cell: ({ getValue }) => {
          const code = getValue() as string | null
          return (
            <span className="text-content-dark-1 text-sm" title={code || ''}>
              {code || '-'}
            </span>
          )
        },
      },
      {
        accessorKey: 'employee',
        header: 'Nhân viên',
        meta: { width: '180px' },
        cell: ({ row }) => {
          const employee = row.original.employee
          return (
            <Flex direction="column" className="text-content-dark-1 text-sm">
              <span>{employee?.code ?? '-'}</span>
              <span>{employee?.fullname ?? '-'}</span>
            </Flex>
          )
        },
      },
      {
        accessorKey: 'form_type',
        header: 'Loại phiếu',
        meta: { width: 'w-[140px]' },
        cell: ({ row }) => (
          <span className="text-content-dark-1 text-sm">
            {formTypeLabels?.[row.original.form_type] ?? row.original.form_type}
          </span>
        ),
      },
      {
        accessorKey: 'deadline',
        header: 'Hạn',
        meta: { width: 'w-[120px]', sortable: true },
        cell: ({ getValue }) => (
          <span className="text-content-dark-1 text-sm">
            {formatDate(getValue() as string | null)}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        meta: { width: 'w-[150px]' },
        cell: ({ row }) => (
          <ContractEvaluationStatusBadge
            coloredStatus={row.original.colored_status}
            status={row.original.display_status}
          />
        ),
      },
      {
        accessorKey: 'created_at',
        header: 'Tạo lúc',
        meta: { width: 'w-[120px]', sortable: true },
        cell: ({ getValue }) => (
          <span className="text-content-dark-1 text-sm">
            {formatDate(getValue() as string | null)}
          </span>
        ),
      },
    ],
    [formTypeLabels]
  )

  const actions: TableAction<ContractEvaluationListItem>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) => navigate(detailPath.replace(':id', String(record.id))),
        show: () => can(permissions.RETRIEVE),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) => navigate(editPath.replace(':id', String(record.id))),
        show: (record) => !!record.allow_actions?.edit && can(permissions.PARTIAL_UPDATE),
      },
    ],
    [navigate, detailPath, editPath, can, permissions]
  )

  if (error) {
    return <span className="text-action-primary-red-default">Đã có lỗi khi tải danh sách.</span>
  }

  return (
    <Table
      data={data}
      columns={columns}
      showSTT
      showActions
      rowActions={actions}
      enableSorting
      manualPagination
      manualSorting
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      onSortingChange={onSortingChange}
      isLoading={isLoading}
      disableInnerOverflow
      paginationPosition="static"
      className="flex-1"
    />
  )
}

export default ContractEvaluationTable

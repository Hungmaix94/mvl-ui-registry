import { useMemo } from 'react'
import { ColumnDef, Table, TableAction, Chip } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { type ContractAppendixList } from '@/features/contract/services/contract-appendix-service'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { ColoredValueVariant } from '@/api/schema.ts'
import { useAbility } from '@/lib/ability.ts'
import { Flex } from '@radix-ui/themes'
import { ContractStatus } from '@/constants/api-schema-aliases'

type ContractAppendixTableProps = {
  data: ContractAppendixList[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteContractAppendix?: (record: ContractAppendixList) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const ContractAppendixTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeleteContractAppendix,
  onClearFilter,
  hasFilter,
}: ContractAppendixTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  // Get status mapping from constants
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS],
  })

  // Define columns according to Figma design
  const columns: ColumnDef<ContractAppendixList>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã phụ lục hợp đồng',
        meta: {
          width: 'w-[180px]',
          sortable: true,
        },
        cell: ({ getValue }) => {
          const code = getValue() as string | null
          return (
            <span className="text-content-dark-1 truncate text-sm" title={code || ''}>
              {code || '-'}
            </span>
          )
        },
      },
      {
        accessorKey: 'contract_number',
        header: 'Số phụ lục hợp đồng',
        meta: {
          width: 'w-[180px]',
          sortable: true,
        },
        cell: ({ row }) => {
          const contractNumber = row?.original?.contract_number || ''
          return (
            <span className="text-content-dark-1 truncate text-sm" title={contractNumber}>
              {contractNumber}
            </span>
          )
        },
      },
      {
        accessorKey: 'employee',
        header: 'Nhân viên',
        meta: {
          width: '150px',
        },
        cell: ({ row }) => {
          const employee = row.original.employee
          const employeeCode = employee?.code || '-'
          const employeeName = employee?.fullname || '-'
          const title = `Mã: ${employeeCode}\nHọ và tên: ${employeeName}`
          return (
            <Flex direction={'column'} title={title} className="text-content-dark-1 text-sm">
              <span>{employeeCode}</span>
              <span>{employeeName}</span>
            </Flex>
          )
        },
      },
      {
        accessorKey: 'sign_date',
        header: 'Ngày ký',
        meta: {
          width: 'w-[120px]',
          sortable: true,
        },
        cell: ({ getValue }) => {
          const date = getValue() as string | null
          if (!date) return <span className="text-content-dark-1 text-sm">-</span>
          try {
            const formattedDate = format(new Date(date), DATE_FORMAT)
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
        accessorKey: 'effective_date',
        header: 'Ngày hiệu lực',
        meta: {
          width: 'w-[120px]',
          sortable: true,
        },
        cell: ({ getValue }) => {
          const date = getValue() as string | null
          if (!date) return <span className="text-content-dark-1 text-sm">-</span>
          try {
            const formattedDate = format(new Date(date), DATE_FORMAT)
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
        accessorKey: 'status',
        header: 'Trạng thái',
        meta: {
          width: 'w-[110px]',
        },
        cell: ({ row }) => {
          const contractAppendix = row.original
          const coloredStatus = contractAppendix.colored_status
          const status = contractAppendix.status

          // Map status to label from constants
          let statusLabel = coloredStatus?.value || status || '-'
          if (keysMapOptions.has(APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS)) {
            const options = keysMapOptions.get(APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS) || []
            const option = options.find(
              (opt: { value: string; label: string }) => opt.value === status
            )
            if (option) {
              statusLabel = option.label
            }
          }

          // Get variant from colored_status
          if (!coloredStatus) return <span className="text-content-dark-1 text-sm">-</span>

          const variant =
            coloredStatus.variant === 'RED'
              ? ColoredValueVariant.RED
              : coloredStatus.variant === 'GREEN'
                ? ColoredValueVariant.GREEN
                : coloredStatus.variant === 'YELLOW'
                  ? ColoredValueVariant.YELLOW
                  : ColoredValueVariant.GREY

          return (
            <div className="flex items-center justify-center">
              <Chip label={statusLabel} variant={variant} size="small" />
            </div>
          )
        },
      },
    ],
    [keysMapOptions]
  )

  // Define row actions
  const actions: TableAction<ContractAppendixList>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.CONTRACT_APPENDIX_DETAIL.replace(':id', String(record.id))}`),
        show: () => ability.can('retrieve', 'contract_appendix'),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.CONTRACT_APPENDIX_EDIT.replace(':id', String(record.id))}`),
        show: (record) =>
          record?.status === ContractStatus.draft && ability.can('update', 'contract_appendix'),
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => {
          onDeleteContractAppendix?.(record)
        },
        show: (record) =>
          record?.status === ContractStatus.draft && ability.can('destroy', 'contract_appendix'),
      },
    ],
    [onDeleteContractAppendix, navigate, ability]
  )

  // Handle sorting change - convert to URL format
  const handleSortingChange = (field: string, direction: 'asc' | 'desc' | null) => {
    onSortingChange(field, direction)
  }

  if (error) {
    return <TableError />
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
      onSortingChange={handleSortingChange}
      isLoading={isLoading}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      emptyMessage="Không có phụ lục hợp đồng nào"
      className="flex-1"
    />
  )
}

export default ContractAppendixTable

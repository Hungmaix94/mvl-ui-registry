import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Table, Chip, ColumnDef, TableAction } from '@/components/ui'
import { IconEye } from '@/assets/icons'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { APP_PATH } from '@/routes'
import {
  useContracts,
  type ContractList,
  type GetContractsParams,
} from '@/features/contract/services/contract-service'
import { ColoredValueVariant } from '@/api/schema.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'

type ContractTabProps = {
  employee?: { id: number }
}

const ContractTab = ({ employee }: ContractTabProps) => {
  const navigate = useNavigate()

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS],
  })

  // Fetch contracts for the specific employee
  const apiParams = useMemo<GetContractsParams>(
    () => ({
      employee: employee?.id,
    }),
    [employee?.id]
  )

  const { data: contractsData, isLoading } = useContracts(apiParams, !!employee?.id)

  const contracts = useMemo(() => contractsData?.results || [], [contractsData?.results])

  // Define table columns
  const columns: ColumnDef<ContractList>[] = useMemo(
    () => [
      {
        accessorKey: 'contract_type',
        id: 'contract_type',
        header: 'Tên loại hợp đồng',
        cell: ({ row }) => {
          const contractType = row.original.contract_type
          const contractTypeName = contractType?.name || '-'
          return (
            <span className="text-content-dark-1 text-sm" title={contractTypeName}>
              {contractTypeName}
            </span>
          )
        },
        meta: { width: 'w-[200px]', sortable: false },
      },
      {
        accessorKey: 'contract_number',
        id: 'contract_number',
        header: 'Số hợp đồng',
        cell: ({ getValue }) => {
          const contractNumber = getValue() as string | null
          return (
            <span className="text-content-dark-1 text-sm" title={contractNumber || ''}>
              {contractNumber || '-'}
            </span>
          )
        },
        meta: { width: 'w-[150px]', sortable: false },
      },
      {
        accessorKey: 'sign_date',
        id: 'sign_date',
        header: 'Ngày ký',
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
        meta: { width: 'w-[120px]', sortable: false },
      },
      {
        accessorKey: 'effective_date',
        id: 'effective_date',
        header: 'Ngày hiệu lực',
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
        meta: { width: 'w-[120px]', sortable: false },
      },
      {
        accessorKey: 'expiration_date',
        id: 'expiration_date',
        header: 'Ngày hết hiệu lực',
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
        meta: { width: 'w-[150px]', sortable: false },
      },
      {
        accessorKey: 'status',
        id: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => {
          const contract = row.original
          const coloredStatus = contract.colored_status
          const status = contract.status

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

          if (!coloredStatus) {
            return (
              <Chip label="-" variant={ColoredValueVariant.GREY} size="small" type="outlined" />
            )
          }
          return (
            <Chip
              label={statusLabel}
              variant={coloredStatus.variant as ColoredValueVariant}
              size="small"
              type="outlined"
            />
          )
        },
        meta: { width: 'w-[150px]', sortable: false, align: 'center' },
      },
    ],
    [keysMapOptions]
  )

  // Define row actions
  const actions: TableAction<ContractList>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.CONTRACT_MANAGE_DETAIL.replace(':id', String(record.id))}`),
      },
    ],
    [navigate]
  )

  return (
    <Table
      data={contracts}
      columns={columns}
      showSTT={false}
      showActions
      rowActions={actions}
      enablePagination={false}
      enableSorting={false}
      isLoading={isLoading}
      emptyMessage="Không có hợp đồng"
      className="flex-1 px-0"
    />
  )
}

export default ContractTab

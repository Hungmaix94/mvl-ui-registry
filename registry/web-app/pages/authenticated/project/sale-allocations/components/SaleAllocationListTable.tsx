import { useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'

import { ColoredValueVariant } from '@/api/schema.ts'
import {
  IconEye,
  IconGear,
  IconCoin,
  IconChartpie,
  IconHandshake,
  IconUser,
  IconHouse,
  IconTrash,
} from '@/assets/icons'
import { Chip, type ColumnDef, Table, type TableAction } from '@/components/ui'
import { ReferenceCode } from '@/components/commons'
import TableError from '@/components/ui/table/TableError'
import { useSalesAllocationOptions } from '@/features/project/sale-allocations/hooks/useSalesAllocationOptions'
import type { SalesAllocation } from '@/features/project/sale-allocations/types/sales-allocation'
import { useAbility } from '@/lib/ability.ts'
import { APP_PATH } from '@/routes'
import { PROJECT_DETAIL_TAB } from '@/constants/project'

const PHASE_VARIANTS: Record<string, ColoredValueVariant> = {
  preparation: ColoredValueVariant.BLUE,
  selling: ColoredValueVariant.GREEN,
  handover: ColoredValueVariant.ORANGE,
  completed: ColoredValueVariant.GREY,
  suspended: ColoredValueVariant.RED,
  cancelled: ColoredValueVariant.RED,
}

type SalesAllocationListTableProps = {
  data: SalesAllocation[]
  isLoading: boolean
  error?: unknown
  pageCount?: number
  currentPage?: number
  totalRecords?: number
  pageSize?: number
  onPaginationChange?: (page: number, pageSize: number) => void
  onDelete?: (record: SalesAllocation) => void
}

const SaleAllocationListTable = ({
  data,
  isLoading,
  error,
  pageCount,
  currentPage,
  totalRecords,
  pageSize,
  onPaginationChange,
  onDelete,
}: SalesAllocationListTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()
  const { getPhaseLabel, getSourceTypeLabel } = useSalesAllocationOptions()

  const columns: ColumnDef<SalesAllocation>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã TT bán hàng',
        size: 180,
        cell: ({ row }) => (
          <ReferenceCode
            code={row.original.code}
            linkTo={APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(
              ':id',
              String(row.original.id)
            )}
          />
        ),
        meta: { width: 'w-[180px]', sortable: true },
      },
      {
        accessorKey: 'name',
        header: 'Tên TT bán hàng',
        size: 240,
        cell: ({ row }) => row.original.name || '-',
        meta: { width: 'w-[240px]', sortable: true },
      },
      {
        accessorKey: 'project',
        header: 'Dự án',
        size: 280,
        cell: ({ row }) => {
          const detail = row.original.project
          if (!detail?.name) return '-'
          return (
            <Link
              to={APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(':id', String(detail.id))}
              className="text-action-primary-default font-medium hover:underline"
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              {detail.name}
            </Link>
          )
        },
        meta: { width: 'w-[280px]', sortable: true },
      },
      {
        accessorKey: 'source_exchange',
        header: 'Nguồn hàng',
        size: 200,
        cell: ({ row }) => {
          const sa = row.original
          return sa.source_type === 'F0'
            ? (sa.source_exchange?.name ?? '-')
            : (sa.investor?.name ?? '-')
        },
        meta: { width: 'w-[200px]' },
      },
      {
        accessorKey: 'source_type',
        header: 'Nguồn',
        size: 160,
        cell: ({ row }) => {
          const t = row.original.source_type
          return t ? getSourceTypeLabel(t) || t : '-'
        },
        meta: { width: 'w-[160px]', sortable: true },
      },
      {
        accessorKey: 'phase',
        header: 'Giai đoạn',
        size: 160,
        cell: ({ row }) => {
          const phase = row.original.phase
          if (!phase) return '-'
          const label = getPhaseLabel(phase) || phase
          const variant = PHASE_VARIANTS[phase.toLowerCase()] || ColoredValueVariant.GREY
          return <Chip label={label} variant={variant} size="small" />
        },
        meta: { width: 'w-[160px]', sortable: true },
      },

      {
        accessorKey: 'updated_at',
        header: 'Ngày cập nhật',
        size: 160,
        cell: ({ row }) =>
          row.original.updated_at ? format(new Date(row.original.updated_at), 'dd/MM/yyyy') : '-',
        meta: { width: 'w-[160px]', sortable: true },
      },
    ],
    [getPhaseLabel, getSourceTypeLabel]
  )

  const actions: TableAction<SalesAllocation>[] = useMemo(() => {
    const tableActions: TableAction<SalesAllocation>[] = []

    if (ability.can('retrieve', 'project')) {
      tableActions.push({
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) => {
          navigate(APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(':id', String(record.id)), {
            state: { from: window.location.pathname + window.location.search },
          })
        },
      })
    }

    if (ability.can('create', 'product_inventory')) {
      tableActions.push({
        label: 'Tạo Bất động sản',
        icon: <IconHouse size={16} />,
        onClick: (record) => {
          navigate(`${APP_PATH.PROJECT_PRODUCT_INVENTORIES_CREATE}?saId=${record.id}`, {
            state: { from: window.location.pathname + window.location.search },
          })
        },
      })
    }

    if (ability.can('update', 'sales_allocation')) {
      tableActions.push({
        label: 'Thông tin chung',
        icon: <IconGear size={16} />,
        onClick: (record) => {
          navigate(
            APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(':id', String(record.id)) +
              '?isEditmode=true&tab=general',
            {
              state: { from: window.location.pathname + window.location.search },
            }
          )
        },
      })

      tableActions.push({
        label: 'Phí và Thưởng',
        icon: <IconCoin size={16} />,
        onClick: (record) => {
          navigate(
            APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(':id', String(record.id)) +
              '?isEditmode=true&tab=tbc',
            {
              state: { from: window.location.pathname + window.location.search },
            }
          )
        },
      })

      tableActions.push({
        label: 'Thưởng HH quản lý',
        icon: <IconChartpie size={16} />,
        onClick: (record) => {
          navigate(
            APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(':id', String(record.id)) +
              '?isEditmode=true&tab=targets',
            {
              state: { from: window.location.pathname + window.location.search },
            }
          )
        },
      })

      tableActions.push({
        label: 'Sàn liên kết',
        icon: <IconHandshake size={16} />,
        onClick: (record) => {
          navigate(
            APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(':id', String(record.id)) +
              '?isEditmode=true&tab=f2',
            {
              state: { from: window.location.pathname + window.location.search },
            }
          )
        },
      })

      tableActions.push({
        label: 'HH KD bộ phận ĐT - PT dự án',
        icon: <IconUser size={16} />,
        onClick: (record) => {
          const projectId = record.project?.id
          if (!projectId) return
          navigate(
            APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(':id', String(projectId)) +
              `?tab=${PROJECT_DETAIL_TAB.COMMISSION}`,
            {
              state: { from: window.location.pathname + window.location.search },
            }
          )
        },
      })
    }

    if (ability.can('destroy', 'project')) {
      tableActions.push({
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => onDelete?.(record),
      })
    }

    return tableActions
  }, [ability, onDelete, navigate])

  if (error) return <TableError />

  return (
    <Table
      data={data}
      columns={columns}
      showSTT
      showActions
      rowActions={actions}
      manualPagination
      pageCount={pageCount}
      totalRecords={totalRecords}
      pageSize={pageSize}
      currentPageIndex={currentPage ? currentPage - 1 : 0}
      onPaginationChange={(newPageIdx, size) => onPaginationChange?.(newPageIdx + 1, size)}
      isLoading={isLoading}
      className="flex-1"
      disableInnerOverflow
      paginationPosition="static"
      stickyHeader
    />
  )
}

export default SaleAllocationListTable

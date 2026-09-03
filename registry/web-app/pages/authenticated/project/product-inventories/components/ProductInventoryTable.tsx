import { useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import type { SortingState } from '@tanstack/react-table'

import { ColoredValueVariant } from '@/api/schema.ts'
import { STATUS_VARIANTS } from '@/features/project/sale-allocations/hooks/useProductOptions'
import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { Chip, type ColumnDef, Table, type TableAction } from '@/components/ui'
import { cn } from '@/utils'
import { formatNumber } from '@/utils/common'
import { formatCodeNameLabel } from '@/utils/string-utils'
import TableError from '@/components/ui/table/TableError'
import { ReferenceCode } from '@/components/commons'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { useAbility } from '@/lib/ability.ts'
import { APP_PATH } from '@/routes'

type ProductInventoryListTableProps = {
  data: any[] // Using 'any' as generic DTO representation for listing
  isLoading: boolean
  error?: unknown
  pageCount?: number
  currentPage?: number
  pageSize?: number
  totalRecords?: number
  showUnitNumberEyeIcon?: boolean
  sortingState?: SortingState
  onPaginationChange?: (page: number, pageSize: number) => void
  onSortingChange?: (field: string, direction: 'asc' | 'desc' | null) => void
  onDelete?: (record: any) => void
  className?: string
  /**
   * Bộ ba của trang danh sách. **Opt-in** vì bảng này còn nhúng trong `SaleAllocationInventories`
   * (khối con trong màn Phân bổ sale) — ở đó không có khung trang chặn chiều cao để ghim vào,
   * và một thanh phân trang `fixed bottom-0` sẽ đè lên phần còn lại của màn.
   */
  stickyHeader?: boolean
  disableInnerOverflow?: boolean
  paginationPosition?: 'fixed' | 'static' | 'inline'
}

const ProductInventoryTable = ({
  stickyHeader = false,
  disableInnerOverflow = false,
  paginationPosition,
  data,
  isLoading,
  error,
  pageCount,
  currentPage,
  pageSize,
  totalRecords,
  showUnitNumberEyeIcon = false,
  sortingState,
  onPaginationChange,
  onSortingChange,
  onDelete,
  className,
}: ProductInventoryListTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const piDetailPath = (record: { id: number | string }) =>
    APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL.replace(':id', String(record.id))

  const { keysMapOptions } = useAppConstant({
    module: 'realestate',
    keys: [APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_STATUS_CHOICES],
  })

  const statusOptions =
    keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_STATUS_CHOICES) || []

  const getStatusLabel = (val: string | number) =>
    statusOptions.find((opt) => String(opt.value) === String(val))?.label || val

  const columns: ColumnDef<any>[] = useMemo(
    () => [
      {
        accessorKey: 'unit_number',
        header: 'Mã bất động sản',
        size: 180,
        meta: { width: 'w-[180px]', sortable: true },
        cell: ({ row }) => {
          const detail = row.original
          const label = detail.unit_number || detail.code
          return (
            <div className="flex items-center gap-1.5 overflow-hidden">
              <ReferenceCode code={label} linkTo={detail.id ? piDetailPath(detail) : undefined} />
              {showUnitNumberEyeIcon && detail.id && (
                <button
                  type="button"
                  className="hover:text-brand-primary flex shrink-0 items-center justify-center rounded p-0.5 text-gray-400 transition-colors hover:bg-gray-100"
                  title="Xem chi tiết"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(piDetailPath(detail), {
                      state: { from: window.location.pathname + window.location.search },
                    })
                  }}
                >
                  <IconEye size={16} />
                </button>
              )}
            </div>
          )
        },
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
              onClick={(e) => e.stopPropagation()}
            >
              {detail.name}
            </Link>
          )
        },
        meta: { width: 'w-[280px]', sortable: true },
      },
      {
        id: 'sales_allocation__name',
        accessorFn: (row) => row.sales_allocation?.name,
        header: 'Thông tin bán hàng',
        size: 280,
        cell: ({ row }) => {
          const detail = row.original.sales_allocation
          // Nhãn `Mã - Tên` cho khớp ô "Chọn thông tin bán hàng" (ClickUp 86eyqwr9u):
          // tên bảng hàng bị trùng nhau nhiều, mã mới là thứ phân biệt được.
          const label = formatCodeNameLabel(detail?.code, detail?.name)
          if (!detail || !label) return '-'
          return (
            <Link
              to={APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(':id', String(detail.id))}
              className="text-action-primary-default font-medium hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {label}
            </Link>
          )
        },
        meta: { width: 'w-[280px]', sortable: true },
      },
      {
        accessorKey: 'area',
        header: 'Diện tích (m²)',
        size: 160,
        cell: ({ row }) => (row.original.area ? formatNumber(Number(row.original.area)) : '-'),
        meta: { width: 'w-[160px]', sortable: true },
      },
      {
        accessorKey: 'listed_price',
        header: 'Đơn giá (VNĐ)',
        size: 180,
        cell: ({ row }) =>
          row.original.listed_price ? formatNumber(Number(row.original.listed_price)) : '-',
        meta: { width: 'w-[180px]', sortable: true },
      },
      {
        id: 'status_label',
        accessorFn: (row) => row.status,
        header: 'Trạng thái',
        size: 160,
        cell: ({ row }) => {
          const statusVal = row.original.status
          if (!statusVal) return '-'
          const label = getStatusLabel(statusVal) || statusVal
          // In JS, constants are often strings or numbers.
          // Let's use a default variant if the precise status key isn't mapped
          const variant = STATUS_VARIANTS[statusVal] || ColoredValueVariant.GREY
          return <Chip label={label} variant={variant} size="small" />
        },
        meta: { width: 'w-[160px]', sortable: true },
      },
    ],
    [getStatusLabel]
  )

  const actions: TableAction<any>[] = useMemo(() => {
    const tableActions: TableAction<any>[] = []

    if (ability.can('retrieve', 'project')) {
      tableActions.push({
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) => {
          navigate(piDetailPath(record), {
            state: { from: window.location.pathname + window.location.search },
          })
        },
      })
    }

    if (ability.can('update', 'project')) {
      tableActions.push({
        label: 'Chỉnh sửa chung',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) => {
          navigate(piDetailPath(record) + '?isEditmode=true&tab=general', {
            state: { from: window.location.pathname + window.location.search },
          })
        },
      })

      tableActions.push({
        label: 'Cấu hình phí & thưởng',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) => {
          navigate(piDetailPath(record) + '?isEditmode=true&tab=tbc', {
            state: { from: window.location.pathname + window.location.search },
          })
        },
      })

      tableActions.push({
        label: 'Phân bổ chỉ tiêu',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) => {
          navigate(piDetailPath(record) + '?isEditmode=true&tab=targets', {
            state: { from: window.location.pathname + window.location.search },
          })
        },
      })

      tableActions.push({
        label: 'Cấu hình sàn liên kết',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) => {
          navigate(piDetailPath(record) + '?isEditmode=true&tab=f2', {
            state: { from: window.location.pathname + window.location.search },
          })
        },
      })
    }

    // Gate theo đúng quyền mà hành động này GỌI TỚI. Các mục ở trên đều là điều hướng sang trang
    // product-inventory, mà những route đó khai `permission: 'project.*'` (AppRoute.tsx) nên chúng
    // gate bằng subject `project` là khớp. Riêng "Xoá" gọi thẳng API, và cả hai endpoint xoá căn
    // (phẳng lẫn scoped theo bảng hàng) đều đòi `product_inventory.destroy` — subject khác hẳn,
    // vì `parsePermissionCode` cắt subject = phần trước dấu chấm cuối.
    // Đo trên 57 vai trò thật (19/08): 6 vai trò Kế toán có `product_inventory.destroy` mà thiếu
    // `project.destroy` nên trước đây KHÔNG thấy nút dù BE cho xoá; 6 vai trò HCNS thì ngược lại,
    // thấy nút rồi ăn 403. Đừng "đồng bộ" mục này về `project` cho giống các mục trên.
    if (ability.can('destroy', 'product_inventory')) {
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
      stickyHeader={stickyHeader}
      disableInnerOverflow={disableInnerOverflow}
      paginationPosition={paginationPosition}
      data={data}
      columns={columns}
      showSTT
      showActions
      rowActions={actions}
      manualPagination
      pageCount={pageCount}
      currentPageIndex={currentPage ? currentPage - 1 : 0}
      pageSize={pageSize}
      onPaginationChange={onPaginationChange}
      manualSorting
      sortingState={sortingState}
      onSortingChange={onSortingChange}
      isLoading={isLoading}
      totalRecords={totalRecords}
      className={cn('flex-1', className)}
    />
  )
}

export default ProductInventoryTable

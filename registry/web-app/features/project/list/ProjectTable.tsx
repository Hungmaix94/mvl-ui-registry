import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'

import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { type ColumnDef, Table, type TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { APP_PATH } from '@/routes'
import type { Project } from '@/services/realestate-service.ts'
import { useAbility } from '@/lib/ability.ts'
import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { useColumnConfig } from '@/hooks/useColumnConfig.ts'
import type { ColumnConfig } from '@/types/table.ts'
import { DATE_FORMAT } from '@/constants/date-format'
import { formatCurrencyVND, formatPercent } from '@/utils/common'
import { Flex } from '@radix-ui/themes'

type ProjectTableProps = {
  data: Project[]
  isLoading: boolean
  error: unknown
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteProject?: (project: Project) => void
  onClearFilter?: () => void
  hasFilter: boolean
  isShowTableColumnConfig?: boolean
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const d = new Date(value)
  return isNaN(d.getTime()) ? '-' : format(d, DATE_FORMAT)
}

const ProjectTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeleteProject,
  onClearFilter,
  hasFilter,
  isShowTableColumnConfig,
}: ProjectTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  const { keysMap } = useAppConstant({
    keys: [
      APP_CONSTANT_KEY.REALESTATE.PROJECT_STATUS,
      APP_CONSTANT_KEY.REALESTATE.PROJECT_PROJECT_TYPE_CHOICES,
      APP_CONSTANT_KEY.REALESTATE.PROJECT_PHASE_CHOICES,
      APP_CONSTANT_KEY.REALESTATE.PROJECT_SOURCE_TYPE_CHOICES,
    ],
    module: 'realestate',
  })

  const statusLabels = useMemo(() => {
    const m = keysMap.get(APP_CONSTANT_KEY.REALESTATE.PROJECT_STATUS)
    if (m && typeof m === 'object' && !Array.isArray(m)) return m as Record<string, string>
    return {} as Record<string, string>
  }, [keysMap])

  const projectTypeLabels = useMemo(() => {
    const m = keysMap.get(APP_CONSTANT_KEY.REALESTATE.PROJECT_PROJECT_TYPE_CHOICES)
    if (m && typeof m === 'object' && !Array.isArray(m)) return m as Record<string, string>
    return {} as Record<string, string>
  }, [keysMap])

  const phaseLabels = useMemo(() => {
    const m = keysMap.get(APP_CONSTANT_KEY.REALESTATE.PROJECT_PHASE_CHOICES)
    if (m && typeof m === 'object' && !Array.isArray(m)) return m as Record<string, string>
    return {} as Record<string, string>
  }, [keysMap])

  const sourceTypeLabels = useMemo(() => {
    const m = keysMap.get(APP_CONSTANT_KEY.REALESTATE.PROJECT_SOURCE_TYPE_CHOICES)
    if (m && typeof m === 'object' && !Array.isArray(m)) return m as Record<string, string>
    return {} as Record<string, string>
  }, [keysMap])

  const statusVariants: Record<string, ColoredValueVariant> = {
    active: ColoredValueVariant.GREEN,
    inactive: ColoredValueVariant.RED,
    completed: ColoredValueVariant.BLUE,
  }

  const allColumnDefs: ColumnDef<Project>[] = useMemo(
    () => [
      {
        id: 'code',
        accessorKey: 'code',
        header: 'Mã dự án',
        size: 160,
        meta: { width: 'w-[160px]', sortable: true, frozen: true },
      },
      {
        id: 'name',
        accessorKey: 'name',
        header: 'Tên dự án',
        size: 280,
        cell: ({ row }) => {
          const detailPath = APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(
            ':id',
            String(row.original.id)
          )
          return (
            <div className="group/name flex h-full items-center justify-between gap-2">
              <span className="flex-1">{row.original.name}</span>
              {ability.can('retrieve', 'project') && (
                <div
                  className="text-action-primary-blue-default hover:text-action-primary-blue-hover hover:bg-action-primary-blue-bg cursor-pointer rounded p-1 opacity-0 transition-opacity group-hover/name:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(detailPath, {
                      state: { from: window.location.pathname + window.location.search },
                    })
                  }}
                  title="Xem chi tiết dự án"
                >
                  <IconEye size={18} />
                </div>
              )}
            </div>
          )
        },
        meta: { width: 'w-[280px]', sortable: true, frozen: true },
      },
      {
        id: 'investor',
        accessorKey: 'investor',
        header: 'Chủ đầu tư',
        size: 280,
        cell: ({ row }) => {
          const investor = row.original.investor
          if (!investor) return '-'
          const code = investor.code ?? '-'
          const name = investor.name ?? '-'
          return (
            <>
              <Flex
                direction={'column'}
                title={`Mã: ${code} \nTên: ${name}`}
                className="text-content-dark-2 typo-body-sm"
              >
                <div>
                  <b>Mã:</b>&nbsp;{code}
                </div>
                <div>
                  <b>Tên:</b>&nbsp;{name}
                </div>
              </Flex>
            </>
          )
        },
        meta: { width: 'w-[280px]' },
      },
      {
        id: 'project_type',
        accessorKey: 'project_type',
        header: 'Loại dự án',
        size: 180,
        cell: ({ row }) => {
          const v = row.original.project_type
          const label = v ? (projectTypeLabels[v] ?? v) : '-'
          return (
            <span className="text-content-dark-2 typo-body-base" title={label}>
              {label}
            </span>
          )
        },
        meta: { width: 'w-[180px]' },
      },
      {
        id: 'phase',
        accessorKey: 'phase',
        header: 'Giai đoạn hiện tại',
        size: 180,
        cell: ({ row }) => {
          const v = row.original.phase
          const label = v ? (phaseLabels[v] ?? v) : '-'
          return (
            <span className="text-content-dark-2 typo-body-base" title={label}>
              {label}
            </span>
          )
        },
        meta: { width: 'w-[180px]' },
      },
      {
        id: 'source_type',
        accessorKey: 'source_type',
        header: 'Loại nguồn sản phẩm',
        size: 260,
        cell: ({ row }) => {
          const v = row.original.source_type
          const label = v ? (sourceTypeLabels[v] ?? v) : '-'
          return (
            <span className="text-content-dark-2 typo-body-base" title={label}>
              {label}
            </span>
          )
        },
        meta: { width: 'w-[260px]' },
      },
      {
        id: 'status',
        accessorKey: 'status',
        header: 'Trạng thái',
        size: 160,
        cell: ({ row }) => {
          const status = row.original.status
          if (!status) return '-'
          const label = statusLabels[status] || status
          const variant = statusVariants[status] || ColoredValueVariant.GREY
          return <Chip label={label} variant={variant} size="small" />
        },
        meta: { width: 'w-[160px]' },
      },
      {
        id: 'f2_exchanges',
        accessorKey: 'f2_exchanges',
        header: 'Linked exchanges',
        size: 240,
        cell: ({ row }) => {
          const arr = row.original.f2_exchanges
          if (!arr || !arr.length) return '-'
          const text = arr.join(', ')
          return (
            <span className="text-content-dark-2 typo-body-base" title={text}>
              {text}
            </span>
          )
        },
        meta: { width: 'w-[240px]' },
      },
      {
        id: 'project_director',
        accessorKey: 'project_director',
        header: 'Giám đốc dự án',
        size: 220,
        cell: ({ row }) => {
          const v = row.original.project_director
          const display = v ? `${v.code ?? ''} - ${v.fullname ?? ''}` : '-'
          return (
            <span
              className="text-content-dark-2 typo-body-base"
              title={display !== '-' ? display : undefined}
            >
              {display}
            </span>
          )
        },
        meta: { width: 'w-[220px]' },
      },
      {
        id: 'project_secretary',
        accessorKey: 'project_secretary',
        header: 'Thư ký dự án',
        size: 220,
        cell: ({ row }) => {
          const v = row.original.project_secretary
          const display = v ? `${v.code ?? ''} - ${v.fullname ?? ''}` : '-'
          return (
            <span
              className="text-content-dark-2 typo-body-base"
              title={display !== '-' ? display : undefined}
            >
              {display}
            </span>
          )
        },
        meta: { width: 'w-[220px]' },
      },
      {
        id: 'address',
        accessorKey: 'address',
        header: 'Địa chỉ',
        size: 280,
        cell: ({ row }) => {
          const v = row.original.address || '-'
          return (
            <span className="text-content-dark-2 typo-body-base" title={v}>
              {v}
            </span>
          )
        },
        meta: { width: 'w-[280px]' },
      },
      {
        id: 'description',
        accessorKey: 'description',
        header: 'Mô tả',
        size: 280,
        cell: ({ row }) => {
          const v = row.original.description || '-'
          return (
            <span className="text-content-dark-2 typo-body-base" title={v}>
              {v}
            </span>
          )
        },
        meta: { width: 'w-[280px]' },
      },
      {
        id: 'planned_start_date',
        accessorKey: 'planned_start_date',
        header: 'Ngày bắt đầu dự kiến',
        size: 180,
        cell: ({ row }) => (
          <span className="text-content-dark-2 typo-body-base">
            {formatDate(row.original.planned_start_date)}
          </span>
        ),
        meta: { width: 'w-[180px]' },
      },
      {
        id: 'planned_end_date',
        accessorKey: 'planned_end_date',
        header: 'Ngày kết thúc dự kiến',
        size: 180,
        cell: ({ row }) => (
          <span className="text-content-dark-2 typo-body-base">
            {formatDate(row.original.planned_end_date)}
          </span>
        ),
        meta: { width: 'w-[180px]' },
      },
      {
        id: 'sale_open_date',
        accessorKey: 'sale_open_date',
        header: 'Ngày mở bán',
        size: 180,
        cell: ({ row }) => (
          <span className="text-content-dark-2 typo-body-base">
            {formatDate(row.original.sale_open_date)}
          </span>
        ),
        meta: { width: 'w-[180px]' },
      },
      {
        id: 'total_units',
        accessorKey: 'total_units',
        header: 'Tổng số căn',
        size: 140,
        cell: ({ row }) => {
          const v = row.original.total_units
          return (
            <span className="text-content-dark-2 typo-body-base">
              {v !== null && v !== undefined ? String(v) : '-'}
            </span>
          )
        },
        meta: { width: 'w-[140px]' },
      },
      {
        id: 'avg_price_estimate',
        accessorKey: 'avg_price_estimate',
        header: 'Giá bán ước tính bình quân (VND)',
        size: 240,
        cell: ({ row }) => {
          const v = row.original.avg_price_estimate
          return (
            <span className="text-content-dark-2 typo-body-base">
              {v != null && v !== '' ? formatCurrencyVND(String(v)) : '-'}
            </span>
          )
        },
        meta: { width: 'w-[240px]' },
      },
      {
        id: 'pct_relationship',
        accessorKey: 'pct_relationship',
        header: 'Quan hệ điều phối (%)',
        size: 180,
        cell: ({ row }) => (
          <span className="text-content-dark-2 typo-body-base">
            {formatPercent(row.original.pct_relationship)}
          </span>
        ),
        meta: { width: 'w-[180px]' },
      },
      {
        id: 'pct_planning',
        accessorKey: 'pct_planning',
        header: 'Lập kế hoạch / đàm phán / ký kết (%)',
        size: 280,
        cell: ({ row }) => (
          <span className="text-content-dark-2 typo-body-base">
            {formatPercent(row.original.pct_planning)}
          </span>
        ),
        meta: { width: 'w-[280px]' },
      },
      {
        id: 'pct_packaging',
        accessorKey: 'pct_packaging',
        header: 'Đóng gói sản phẩm (%)',
        size: 200,
        cell: ({ row }) => (
          <span className="text-content-dark-2 typo-body-base">
            {formatPercent(row.original.pct_packaging)}
          </span>
        ),
        meta: { width: 'w-[200px]' },
      },
      {
        id: 'pct_sales_support',
        accessorKey: 'pct_sales_support',
        header: 'Hỗ trợ bán hàng (%)',
        size: 200,
        cell: ({ row }) => (
          <span className="text-content-dark-2 typo-body-base">
            {formatPercent(row.original.pct_sales_support)}
          </span>
        ),
        meta: { width: 'w-[200px]' },
      },
      {
        id: 'pct_coordination',
        accessorKey: 'pct_coordination',
        header: 'Điều phối dự án chung (%)',
        size: 200,
        cell: ({ row }) => (
          <span className="text-content-dark-2 typo-body-base">
            {formatPercent(row.original.pct_coordination)}
          </span>
        ),
        meta: { width: 'w-[200px]' },
      },
    ],
    [statusLabels, statusVariants, projectTypeLabels, phaseLabels, sourceTypeLabels]
  )

  const defaultColumnConfig: ColumnConfig[] = useMemo(
    () => [
      { id: 'code', label: 'Mã dự án', visible: true, order: 0, frozen: true },
      { id: 'name', label: 'Tên dự án', visible: true, order: 1, frozen: true },
      { id: 'investor', label: 'Chủ đầu tư (Mã - Tên)', visible: true, order: 2 },
      { id: 'project_type', label: 'Loại dự án', visible: true, order: 3 },
      { id: 'phase', label: 'Giai đoạn hiện tại', visible: true, order: 4 },
      { id: 'source_type', label: 'Loại nguồn sản phẩm', visible: true, order: 5 },
      { id: 'status', label: 'Trạng thái', visible: true, order: 6 },
      { id: 'f2_exchanges', label: 'Linked exchanges', visible: false, order: 7 },
      { id: 'project_director', label: 'Giám đốc dự án', visible: false, order: 8 },
      { id: 'project_secretary', label: 'Thư ký dự án', visible: false, order: 9 },
      { id: 'address', label: 'Địa chỉ', visible: true, order: 10 },
      { id: 'description', label: 'Mô tả', visible: false, order: 11 },
      { id: 'planned_start_date', label: 'Ngày bắt đầu dự kiến', visible: false, order: 12 },
      { id: 'planned_end_date', label: 'Ngày kết thúc dự kiến', visible: false, order: 13 },
      { id: 'sale_open_date', label: 'Ngày mở bán', visible: false, order: 14 },
      { id: 'total_units', label: 'Tổng số căn', visible: false, order: 15 },
      {
        id: 'avg_price_estimate',
        label: 'Giá bán ước tính bình quân (VND)',
        visible: false,
        order: 16,
      },
      { id: 'pct_relationship', label: 'Quan hệ điều phối (%)', visible: false, order: 17 },
      {
        id: 'pct_planning',
        label: 'Lập kế hoạch / đàm phán / ký kết (%)',
        visible: false,
        order: 18,
      },
      { id: 'pct_packaging', label: 'Đóng gói sản phẩm (%)', visible: false, order: 19 },
      { id: 'pct_sales_support', label: 'Hỗ trợ bán hàng (%)', visible: false, order: 20 },
      { id: 'pct_coordination', label: 'Điều phối dự án chung (%)', visible: false, order: 21 },
    ],
    []
  )

  const {
    columns: columnConfig,
    handleApply,
    handleReset,
  } = useColumnConfig(defaultColumnConfig, { storageKey: 'project' })

  const visibleColumns = useMemo(() => {
    return columnConfig
      .filter((c) => c.visible)
      .sort((a, b) => a.order - b.order)
      .map((c) =>
        allColumnDefs.find(
          (d) =>
            (d as ColumnDef<Project> & { id?: string }).id === c.id ||
            (d as ColumnDef<Project> & { accessorKey?: string }).accessorKey === c.id
        )
      )
      .filter(Boolean) as ColumnDef<Project>[]
  }, [columnConfig, allColumnDefs])

  const actions: TableAction<Project>[] = useMemo(() => {
    const tableActions: TableAction<Project>[] = []

    if (ability.can('retrieve', 'project')) {
      tableActions.push({
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) => {
          const detailPath = APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(':id', String(record.id))
          navigate(detailPath, {
            state: { from: window.location.pathname + window.location.search },
          })
        },
      })
    }

    if (ability.can('update', 'project')) {
      tableActions.push({
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) => {
          const editPath = APP_PATH.PROJECT_MANAGEMENT_EDIT.replace(':id', String(record.id))
          navigate(editPath, {
            state: { from: window.location.pathname + window.location.search },
          })
        },
      })
    }

    if (ability.can('destroy', 'project')) {
      tableActions.push({
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => {
          onDeleteProject?.(record)
        },
      })
    }

    return tableActions
  }, [ability, onDeleteProject, navigate])

  if (error) {
    return <TableError />
  }

  return (
    <Table
      data={data}
      columns={visibleColumns}
      showSTT
      sttFrozen
      showActions
      rowActions={actions}
      enableSorting
      manualSorting
      manualPagination
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      onSortingChange={onSortingChange}
      isLoading={isLoading}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      isShowTableColumnConfig={isShowTableColumnConfig}
      columnConfig={columnConfig}
      onColumnConfigApply={handleApply}
      onColumnConfigReset={handleReset}
      disableInnerOverflow
      paginationPosition="static"
      stickyHeader
      className="flex-1"
      emptyMessage="Không có dữ liệu"
    />
  )
}

export default ProjectTable

import { useMemo, useEffect } from 'react'
import type { SortingState } from '@tanstack/react-table'
import { ColumnDef, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import type { components } from '@/api/schema.ts'
import { APP_PATH } from '@/routes'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { Chip } from '@/components/ui'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { useAbility } from '@/lib/ability.ts'
import { formatCurrencyVND } from '@/utils/common.ts'
import { EmployeeProfileLink } from '@/components/commons'
import { useColumnConfig } from '@/hooks/useColumnConfig.ts'
import type { ColumnConfig } from '@/types/table.ts'
import { ContractStatus, ContractCreationSource } from '@/constants/api-schema-aliases'

type ContractListItem = components['schemas']['ContractList']

// Nhãn nguồn tạo hợp đồng (schema không có app-constant key riêng → map cục bộ theo enum)
const CREATION_SOURCE_LABEL: Record<string, string> = {
  [ContractCreationSource.manual]: 'Tạo thủ công',
  [ContractCreationSource.auto_recontract]: 'Tự động (Phiếu tái ký)',
}

type ContractTableProps = {
  data: ContractListItem[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  ordering?: string
  onDeleteContract?: (contract: ContractListItem) => void
  onClearFilter?: () => void
  hasFilter?: boolean
  isShowTableColumnConfig?: boolean
}

const ContractTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  ordering,
  onDeleteContract,
  onClearFilter,
  hasFilter,
  isShowTableColumnConfig,
}: ContractTableProps) => {
  const navigate = useNavigate()
  const ability = useAbility()

  // Reflect the active server-side ordering in the header sort indicators.
  // URL ordering uses a `-` prefix for descending; the field equals the column id.
  const sortingState = useMemo<SortingState>(() => {
    if (!ordering) return []
    const field = ordering.split(',')[0]?.trim()
    if (!field) return []
    const desc = field.startsWith('-')
    return [{ id: desc ? field.slice(1) : field, desc }]
  }, [ordering])

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS],
  })

  const mapKeyStatus = useMemo(
    () => keysMap.get(APP_CONSTANT_KEY.HRM.CONTRACT_CONTRACT_STATUS) || {},
    [keysMap]
  )

  // Define all available columns (visibility controlled via column config)
  const allColumnDefs: ColumnDef<ContractListItem>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã hợp đồng',
        meta: {
          width: 'w-[90px]',
          sortable: true,
        },
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
        accessorKey: 'contract_number',
        header: 'Số hợp đồng',
        meta: {
          width: 'w-[130px]',
          sortable: true,
        },
        cell: ({ getValue }) => {
          const contractNumber = getValue() as string
          return (
            <span className="text-content-dark-1 text-sm" title={contractNumber || ''}>
              {contractNumber || '-'}
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
            <EmployeeProfileLink
              employeeId={employee?.id}
              title={title}
              className="flex flex-col text-sm"
            >
              <span>{employeeCode}</span>
              <span>{employeeName}</span>
            </EmployeeProfileLink>
          )
        },
      },
      {
        accessorKey: 'contract_type',
        header: 'Loại hợp đồng',
        meta: {
          width: 'w-[190px]',
        },
        cell: ({ row }) => {
          const contractType = row.original.contract_type
          const contractTypeName = contractType?.name || '-'
          return (
            <span className="text-content-dark-1 text-sm" title={contractTypeName}>
              {contractTypeName}
            </span>
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
        accessorKey: 'expiration_date',
        header: 'Ngày hết hạn',
        meta: {
          width: 'w-[110px]',
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
        accessorKey: 'base_salary',
        header: 'Mức lương cơ bản',
        meta: {
          width: 'w-[150px]',
        },
        cell: ({ getValue }) => {
          const raw = getValue() as string | null | undefined
          const text = raw ? formatCurrencyVND(parseFloat(raw)) : '-'
          return (
            <span className="text-content-dark-1 text-sm" title={text}>
              {text}
            </span>
          )
        },
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        meta: {
          width: 'w-[110px]',
          sortable: true,
        },
        cell: ({ row }) => {
          return (
            <Chip
              size="small"
              label={mapKeyStatus[row.original.colored_status.value] || '-'}
              variant={row.original.colored_status.variant}
            />
          )
        },
      },
      {
        accessorKey: 'creation_source',
        header: 'Nguồn tạo',
        meta: {
          width: 'w-[170px]',
        },
        cell: ({ row }) => {
          const value = row.original.creation_source
          const label = CREATION_SOURCE_LABEL[value] ?? row.original.creation_source_display ?? '-'
          return (
            <span className="text-content-dark-1 text-sm" title={label}>
              {label}
            </span>
          )
        },
      },
    ],
    [mapKeyStatus]
  )

  // Default column configuration (sign_date hidden by default; user can re-enable)
  const defaultColumnConfig: ColumnConfig[] = useMemo(
    () => [
      { id: 'code', label: 'Mã hợp đồng', visible: true, order: 0 },
      { id: 'contract_number', label: 'Số hợp đồng', visible: true, order: 1 },
      { id: 'employee', label: 'Nhân viên', visible: true, order: 2 },
      { id: 'contract_type', label: 'Loại hợp đồng', visible: true, order: 3 },
      { id: 'sign_date', label: 'Ngày ký', visible: false, order: 4 },
      { id: 'effective_date', label: 'Ngày hiệu lực', visible: true, order: 5 },
      { id: 'expiration_date', label: 'Ngày hết hạn', visible: true, order: 6 },
      { id: 'base_salary', label: 'Mức lương cơ bản', visible: true, order: 7 },
      { id: 'status', label: 'Trạng thái', visible: true, order: 8 },
      { id: 'creation_source', label: 'Nguồn tạo', visible: true, order: 9 },
    ],
    []
  )

  // Column configuration hook (persisted per-user in localStorage)
  const {
    columns: columnConfig,
    handleApply,
    handleReset,
  } = useColumnConfig(defaultColumnConfig, { storageKey: 'contract' })

  // Filter and order columns based on config
  const visibleColumns = useMemo(() => {
    return columnConfig
      .filter((c) => c.visible)
      .sort((a, b) => a.order - b.order)
      .map((c) =>
        allColumnDefs.find((d) => (d as any).id === c.id || (d as any).accessorKey === c.id)
      )
      .filter(Boolean) as ColumnDef<ContractListItem>[]
  }, [columnConfig, allColumnDefs])

  // Define row actions
  const actions: TableAction<ContractListItem>[] = useMemo(
    () => [
      // View detail - always visible
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.CONTRACT_MANAGE_DETAIL.replace(':id', String(record.id))}`),
        show: () => ability.can('retrieve', 'contract'),
      },
      // Edit - show when status is not expired
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.CONTRACT_MANAGE_EDIT.replace(':id', String(record.id))}`),
        show: (record) =>
          record.status !== ContractStatus.expired && ability.can('update', 'contract'),
      },
      // Delete - only show if status is draft
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => {
          onDeleteContract?.(record)
        },
        show: (record) =>
          record.status === ContractStatus.draft && ability.can('destroy', 'contract'),
      },
    ],
    [onDeleteContract, navigate, ability]
  )

  // Handle sorting change - convert to URL format
  const handleSortingChange = (field: string, direction: 'asc' | 'desc' | null) => {
    onSortingChange(field, direction)
  }

  // Sticky header logic - find scroll container from page level
  useEffect(() => {
    let cleanup: (() => void) | null = null

    const timeoutId = setTimeout(() => {
      const scrollContainer = document.querySelector(
        '[class*="overflow-x-auto"][class*="overflow-y-auto"]'
      ) as HTMLElement
      if (!scrollContainer) return

      const table = scrollContainer.querySelector('table') as HTMLElement
      if (!table) return

      const thead = table.querySelector('thead') as HTMLElement
      if (!thead) return

      const navBar = document.querySelector('[data-name="Header"]') as HTMLElement

      const updateStickyTop = () => {
        if (!scrollContainer || !navBar) return

        const scrollContainerRect = scrollContainer.getBoundingClientRect()
        const navBarRect = navBar.getBoundingClientRect()
        const scrollContainerTop = scrollContainerRect.top
        const navBarBottom = navBarRect.bottom

        let topOffset = 0
        if (scrollContainerTop < navBarBottom) {
          topOffset = Math.max(0, navBarBottom - scrollContainerTop)
        }

        thead.style.top = `${topOffset}px`
      }

      updateStickyTop()

      const scrollHandler = () => {
        updateStickyTop()
      }
      scrollContainer.addEventListener('scroll', scrollHandler)
      window.addEventListener('scroll', scrollHandler)
      window.addEventListener('resize', updateStickyTop)

      cleanup = () => {
        scrollContainer.removeEventListener('scroll', scrollHandler)
        window.removeEventListener('scroll', scrollHandler)
        window.removeEventListener('resize', updateStickyTop)
      }
    }, 100)

    return () => {
      clearTimeout(timeoutId)
      if (cleanup) {
        cleanup()
      }
    }
  }, [data])

  if (error) {
    return <TableError />
  }

  return (
    <Table
      data={data}
      columns={visibleColumns}
      isShowTableColumnConfig={isShowTableColumnConfig}
      columnConfig={columnConfig}
      onColumnConfigApply={handleApply}
      onColumnConfigReset={handleReset}
      showSTT
      showActions
      rowActions={actions}
      enableSorting
      manualPagination
      manualSorting
      sortingState={sortingState}
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      onSortingChange={handleSortingChange}
      isLoading={isLoading}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      disableInnerOverflow={true}
      paginationPosition="static"
      className="flex-1"
    />
  )
}

export default ContractTable

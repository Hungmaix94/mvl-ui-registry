import { useMemo, useEffect } from 'react'
import { Chip, ColumnDef, Table, TableAction } from '@/components/ui'
import TableError from '@/components/ui/table/TableError'
import { IconEye, IconPencilsimple, IconTrash } from '@/assets/icons'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { type RecruitmentRequest } from '@/features/recruitment/services/recruitment-request-service'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { ColoredValueVariant } from '@/api/schema.ts'

type RecruitmentRequestTableProps = {
  data: RecruitmentRequest[]
  isLoading: boolean
  error: Error | null
  pageCount: number
  pageSize: number
  currentPage: number
  totalRecords: number
  ordering?: string
  onPaginationChange: (pageIndex: number, newPageSize: number) => void
  onSortingChange: (field: string, direction: 'asc' | 'desc' | null) => void
  onDeleteRecruitmentRequest?: (record: RecruitmentRequest) => void
  onClearFilter?: () => void
  hasFilter?: boolean
}

const RecruitmentRequestTable = ({
  data,
  isLoading,
  error,
  pageCount,
  pageSize,
  currentPage,
  totalRecords,
  onPaginationChange,
  onSortingChange,
  onDeleteRecruitmentRequest,
  onClearFilter,
  hasFilter,
}: RecruitmentRequestTableProps) => {
  const navigate = useNavigate()

  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.RECRUITMENT.REQUEST.TYPE, APP_CONSTANT_KEY.RECRUITMENT.REQUEST.STATUS],
  })
  const getRecruitmentTypeMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.RECRUITMENT.REQUEST.TYPE)
      ? keysMap.get(APP_CONSTANT_KEY.RECRUITMENT.REQUEST.TYPE) || {}
      : {}
  }, [keysMap])

  const getStatusMapping = useMemo(() => {
    return keysMap.has(APP_CONSTANT_KEY.RECRUITMENT.REQUEST.STATUS)
      ? keysMap.get(APP_CONSTANT_KEY.RECRUITMENT.REQUEST.STATUS) || {}
      : {}
  }, [keysMap])

  // Columns
  const columns: ColumnDef<RecruitmentRequest>[] = useMemo(
    () => [
      {
        accessorKey: 'code',
        header: 'Mã đề nghị',
        meta: { width: 'w-[140px]', sortable: true },
      },
      {
        accessorKey: 'name',
        header: 'Tên đề nghị',
        meta: { width: 'w-[240px]', sortable: true },
      },
      {
        accessorKey: 'department_name',
        header: 'Phòng ban',
        meta: { width: 'w-[180px]' },
      },
      {
        accessorKey: 'position_name',
        header: 'Vị trí tuyển dụng',
        meta: { width: 'w-[180px]' },
      },
      {
        accessorKey: 'created_at',
        header: 'Ngày tạo',
        cell: ({ getValue }) => {
          const date = getValue() as string | undefined
          return <span>{date ? new Date(date).toLocaleDateString('vi-VN') : '-'}</span>
        },
        meta: { width: 'w-[120px]', sortable: true },
      },
      {
        accessorKey: 'number_of_positions',
        header: 'SL tuyển dụng',
        cell: ({ getValue }) => {
          const value = getValue() as number | string | undefined
          return <span>{value ?? '-'}</span>
        },
        meta: { width: 'w-[120px]' },
      },
      {
        accessorKey: 'number_of_candidates',
        header: 'SL ứng viên',
        cell: ({ getValue }) => {
          const value = getValue() as number | undefined
          return <span>{value ?? 0}</span>
        },
        meta: { width: 'w-[120px]' },
      },
      {
        accessorKey: 'number_of_hires',
        header: 'SL nhận việc',
        cell: ({ getValue }) => {
          const value = getValue() as number | undefined
          return <span>{value ?? 0}</span>
        },
        meta: { width: 'w-[120px]' },
      },
      {
        accessorKey: 'colored_recruitment_type',
        header: 'Loại tuyển dụng',
        cell: ({ getValue }) => {
          const colored = getValue() as { value?: string; variant?: string } | undefined
          if (!colored?.value)
            return <Chip label="-" variant={ColoredValueVariant.GREY} size="small" />

          // Map API value to constants display value
          const displayValue = getRecruitmentTypeMapping[colored.value] || colored.value

          return <Chip label={displayValue} variant={colored.variant as any} size="small" />
        },
        meta: { width: 'w-[140px]' },
      },
      {
        accessorKey: 'colored_status',
        header: 'Trạng thái',
        cell: ({ getValue }) => {
          const colored = getValue() as { value?: string; variant?: string } | undefined
          if (!colored?.value)
            return <Chip label="-" variant={ColoredValueVariant.GREY} size="small" />

          // Map API value to constants display value
          const displayValue = getStatusMapping[colored.value] || colored.value

          return <Chip label={displayValue} variant={colored.variant as any} size="small" />
        },
        meta: { width: 'w-[140px]', sortable: true },
      },
    ],
    [getRecruitmentTypeMapping, getStatusMapping]
  )

  // Row actions
  const actions: TableAction<RecruitmentRequest>[] = useMemo(
    () => [
      {
        label: 'Xem chi tiết',
        icon: <IconEye size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.RECRUITMENT_REQUEST_DETAIL.replace(':id', String(record.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
      },
      {
        label: 'Chỉnh sửa',
        icon: <IconPencilsimple size={16} />,
        onClick: (record) =>
          navigate(`${APP_PATH.RECRUITMENT_REQUEST_EDIT.replace(':id', String(record.id))}`, {
            state: { from: window.location.pathname + window.location.search },
          }),
      },
      {
        label: 'Xoá',
        icon: <IconTrash size={16} className="text-action-primary-red-default" />,
        variant: 'danger',
        onClick: (record) => onDeleteRecruitmentRequest?.(record),
        show: (record) => record.colored_status?.value === 'DRAFT',
      },
    ],
    [navigate, onDeleteRecruitmentRequest]
  )

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

  // Check if error is "Invalid page" - treat as empty data instead of showing error
  const isInvalidPageError = useMemo(() => {
    if (!error) return false
    const errorObj =
      (error as any)?.error || (error as any)?.server || (error as any)?.response?.data?.error
    return (
      errorObj?.type === 'client_error' &&
      Array.isArray(errorObj?.errors) &&
      errorObj.errors.some(
        (err: any) => err.code === 'not_found' && err.detail?.includes('Invalid page')
      )
    )
  }, [error])

  // For "Invalid page" error, treat as empty data (table will show empty state)
  // For other errors, show error message
  if (error && !isInvalidPageError) {
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
      enablePagination
      manualPagination
      manualSorting
      pageCount={pageCount}
      pageSize={pageSize}
      currentPageIndex={currentPage - 1}
      totalRecords={totalRecords}
      onPaginationChange={onPaginationChange}
      onSortingChange={onSortingChange}
      isLoading={isLoading}
      hasFilter={hasFilter}
      onClearFilter={onClearFilter}
      disableInnerOverflow={true}
      paginationPosition="static"
      className="flex-1"
    />
  )
}

export default RecruitmentRequestTable

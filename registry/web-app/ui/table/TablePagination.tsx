import { Table } from '@tanstack/react-table'
import { Button } from '../../ui/button'
import { Select } from '../../ui/select'
import { IconCaretleft, IconCaretright } from '../../icons/arrows'
import { useCallback, useMemo, type Ref } from 'react'
import { cn } from '@/utils'
import { PAGE_SIZES } from '../../constants/table.ts'
import { useSidebar } from '../../ui/sidebar/sidebar.tsx'

interface TablePaginationProps<TData> {
  table: Table<TData>
  pageSizeOptions?: number[]
  showPageNumbers?: boolean
  totalRecords?: number
  onPageSizeChange?: (pageSize: number) => void
  position?: 'fixed' | 'static' | 'inline'
  variant?: 'default' | 'simple'
  /**
   * Ref to the root element. Used by `Table` to measure the fixed bar's height so the
   * sticky summary row can sit above it instead of underneath.
   */
  rootRef?: Ref<HTMLDivElement>
}

function TablePagination<TData>({
  table,
  pageSizeOptions = PAGE_SIZES,
  showPageNumbers = true,
  totalRecords,
  onPageSizeChange,
  position = 'fixed',
  variant = 'default',
  rootRef,
}: TablePaginationProps<TData>) {
  const { open } = useSidebar()

  const {
    getCanPreviousPage,
    getCanNextPage,
    getPageCount,
    getState,
    setPageSize,
    previousPage,
    nextPage,
    setPageIndex,
  } = table

  const { pagination } = getState()
  const { pageIndex, pageSize } = pagination

  const pageCount = getPageCount()
  const canPreviousPage = getCanPreviousPage()
  const canNextPage = getCanNextPage()

  // Calculate page info - use totalRecords from API if available, otherwise use filtered rows
  const totalRows = totalRecords ?? table.getFilteredRowModel().rows.length

  // Page size options for select
  const pageSizeSelectOptions = pageSizeOptions.map((size) => ({
    label: `${size}`,
    value: size.toString(),
  }))

  const pages = useMemo(() => {
    const noPages: (number | 'ellipsis')[] = []

    if (pageCount <= 7) {
      // Show all pages if 7 or fewer
      for (let i = 0; i < pageCount; i++) {
        noPages.push(i)
      }
    } else {
      // Always show first page
      noPages.push(0)

      if (pageIndex <= 3) {
        // Show pages 1-5, then ellipsis, then last
        for (let i = 1; i <= 4; i++) {
          noPages.push(i)
        }
        noPages.push('ellipsis')
        noPages.push(pageCount - 1)
      } else if (pageIndex >= pageCount - 4) {
        // Show first, ellipsis, then last 5 pages
        noPages.push('ellipsis')
        for (let i = pageCount - 5; i < pageCount; i++) {
          noPages.push(i)
        }
      } else {
        // Show first, ellipsis, current-1, current, current+1, ellipsis, last
        noPages.push('ellipsis')
        for (let i = pageIndex - 1; i <= pageIndex + 1; i++) {
          noPages.push(i)
        }
        noPages.push('ellipsis')
        noPages.push(pageCount - 1)
      }
    }

    return noPages
  }, [pageCount, pageIndex])
  const onChangePageSize = useCallback(
    (option: string | number | (string | number)[] | null) => {
      if (!option || Array.isArray(option)) {
        return
      }

      const newPageSize = Number(option)
      setPageSize(newPageSize)

      // Call parent callback to trigger API call
      if (onPageSizeChange) {
        onPageSizeChange(newPageSize)
      }
    },
    [setPageSize, onPageSizeChange]
  )

  const _renderPageNumbers = useCallback(() => {
    if (!showPageNumbers) {
      return
    }

    return (
      <div className="flex items-center gap-2">
        {pages.map((page, index) => {
          if (page === 'ellipsis') {
            return (
              <span
                key={`ellipsis-${index}`}
                className={cn('px-2', 'text-content-dark-3', 'typo-body-sm-medium')}
              >
                ...
              </span>
            )
          }

          const isActive = page === pageIndex
          return (
            <Button
              key={page}
              variant={isActive ? 'primary' : 'secondary-border'}
              size="small"
              onClick={() => setPageIndex(page)}
              className={cn(
                'h-[33px] w-[33px]',
                'border-none',
                'typo-body-sm-medium',
                isActive
                  ? 'bg-action-primary-red-default hover:bg-action-primary-red-hover ' +
                      'text-white'
                  : 'text-content-dark-2 bg-transparent hover:bg-transparent'
              )}
              childrenClassName={'min-w-[40px]'}
            >
              {page + 1}
            </Button>
          )
        })}
      </div>
    )
  }, [showPageNumbers, pages, pageIndex, setPageIndex])

  if (totalRows === 0) {
    return null
  }

  const isFixed = position === 'fixed'

  return (
    <div
      ref={rootRef}
      className={cn(
        isFixed ? 'fixed bottom-0' : 'relative w-full',
        'flex flex-col items-center gap-3 px-10 pt-[9px] pb-[10px] md:flex-row',
        variant === 'simple' ? 'justify-end' : 'justify-between',
        'bg-content-light-1',
        variant === 'simple'
          ? 'border-none pt-0'
          : 'border-border-1 border border-x-0 border-t-[1px] border-b-0',
        'z-20',
        // Responsive width based on sidebar state
        isFixed
          ? open
            ? 'w-[calc(100%-var(--sidebar-width))]'
            : 'w-full md:w-[calc(100%-var(--sidebar-width-icon))]'
          : 'w-full'
      )}
    >
      {/* Left side - Page size info */}
      {variant !== 'simple' && (
        <div className="flex items-center gap-2">
          <span className="text-content-dark-3 text-xs font-medium text-nowrap">Hiển thị</span>
          <Select
            value={pageSize.toString()}
            onChange={onChangePageSize}
            options={pageSizeSelectOptions}
            className={cn('h-[34px] w-20', 'typo-body-sm-medium', 'text-content-dark-3')}
            title={'Chọn số bản ghi'}
            clearable={false}
            iconSize={14}
          />
          <span className="text-content-dark-3 text-xs font-medium text-nowrap">
            / {totalRows} bản ghi
          </span>
        </div>
      )}

      {/* Right side - Navigation */}
      <div className="flex items-center gap-3">
        {/* Previous button */}
        <Button
          variant="secondary-border"
          size="small"
          iconOnly
          leftIcon={<IconCaretleft size={14} />}
          disabled={!canPreviousPage}
          onClick={previousPage}
          className="bg-data-light-grey-hover hover:bg-data-light-grey-hover disabled:bg-data-light-grey-default h-[33px] w-[33px] border-none"
        />

        {/* Page numbers */}
        {_renderPageNumbers()}

        {/* Next button */}
        <Button
          variant="secondary-border"
          size="small"
          iconOnly
          disabled={!canNextPage}
          leftIcon={<IconCaretright size={14} />}
          onClick={nextPage}
          className="bg-data-light-grey-hover hover:bg-data-light-grey-hover disabled:bg-data-light-grey-default h-[33px] w-[33px] border-none"
        />
      </div>
    </div>
  )
}

export { TablePagination }

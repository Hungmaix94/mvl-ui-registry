import { useMemo } from 'react'
import { Button, Select } from '../../ui'
import { IconCaretleft, IconCaretright } from '../../icons/arrows'
import { PAGE_SIZES } from '../../constants/table'
import { cn } from '@/utils'
import { useSidebar } from '../../ui/sidebar/sidebar.tsx'

type TimesheetPaginationProps = {
  page: number
  pageSize: number
  totalRecords: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  position?: 'fixed' | 'static'
}

export default function TimesheetPagination({
  page,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  position = 'fixed',
}: TimesheetPaginationProps) {
  const { open } = useSidebar()
  const pageCount = useMemo(() => {
    return Math.ceil(totalRecords / pageSize)
  }, [totalRecords, pageSize])

  const canPreviousPage = page > 0
  const canNextPage = page < pageCount - 1

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

      if (page <= 3) {
        // Show pages 1-5, then ellipsis, then last
        for (let i = 1; i <= 4; i++) {
          noPages.push(i)
        }
        noPages.push('ellipsis')
        noPages.push(pageCount - 1)
      } else if (page >= pageCount - 4) {
        // Show first, ellipsis, then last 5 pages
        noPages.push('ellipsis')
        for (let i = pageCount - 5; i < pageCount; i++) {
          noPages.push(i)
        }
      } else {
        // Show first, ellipsis, current-1, current, current+1, ellipsis, last
        noPages.push('ellipsis')
        for (let i = page - 1; i <= page + 1; i++) {
          noPages.push(i)
        }
        noPages.push('ellipsis')
        noPages.push(pageCount - 1)
      }
    }

    return noPages
  }, [pageCount, page])

  const pageSizeOptions = useMemo(
    () => PAGE_SIZES.map((size) => ({ value: size, label: `${size}` })),
    []
  )

  const handlePageSizeChange = (value: string | number | (string | number)[] | null) => {
    if (!value || Array.isArray(value)) {
      return
    }
    const newPageSize = Number(value)
    // onPageSizeChange will handle resetting to page 0 with the new page size
    onPageSizeChange(newPageSize)
  }

  if (totalRecords === 0) {
    return null
  }

  const isFixed = position === 'fixed'

  return (
    <div
      className={cn(
        isFixed ? 'fixed bottom-0' : 'relative w-full',
        'flex flex-col items-center justify-between gap-3 lg:flex-row',
        'py-2.5 pr-10 pl-0',
        'border-border-1 border border-x-0 border-t-[1px] border-b-0',
        'bg-content-light-1',
        'z-20',
        // Responsive width based on sidebar state
        isFixed
          ? open
            ? 'w-[calc(100%-var(--sidebar-width))]'
            : 'w-[calc(100%-var(--sidebar-width-icon))]'
          : 'w-full'
      )}
    >
      <div className="flex items-center gap-2 pl-10">
        <span className="text-content-dark-3 typo-body-sm-medium text-nowrap">
          Hiển thị mỗi trang
        </span>
        <Select
          value={pageSizeOptions.find((opt) => opt.value === pageSize)?.value}
          onChange={handlePageSizeChange}
          options={pageSizeOptions}
          className={cn('h-[34px] w-20', 'text-content-dark-3 typo-body-sm-medium')}
          title={'Chọn số bản ghi'}
          clearable={false}
          iconSize={14}
        />
        <span className="text-content-dark-3 typo-body-sm-medium text-nowrap">
          / {totalRecords} bản ghi
        </span>
      </div>

      {/* Right side - Navigation */}
      <div className="flex items-center gap-3">
        {/* Previous button */}
        <Button
          variant="secondary-border"
          size="small"
          iconOnly
          leftIcon={<IconCaretleft size={14} />}
          disabled={!canPreviousPage}
          onClick={() => onPageChange(page - 1)}
          className="bg-data-light-grey-hover hover:bg-data-light-grey-hover disabled:bg-data-light-grey-default h-[33px] w-[33px] border-none"
        />

        {/* Page numbers */}
        <div className="flex items-center gap-2">
          {pages.map((pageNum, index) => {
            if (pageNum === 'ellipsis') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="text-content-dark-3 typo-body-sm-medium px-2"
                >
                  ...
                </span>
              )
            }

            const isActive = pageNum === page
            return (
              <Button
                key={pageNum}
                variant={isActive ? 'primary' : 'secondary-border'}
                size="small"
                onClick={() => onPageChange(pageNum)}
                className={cn(
                  'h-[33px] w-[33px]',
                  'border-none',
                  'typo-body-sm-medium',
                  isActive
                    ? 'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white'
                    : 'text-content-dark-2 bg-transparent hover:bg-transparent'
                )}
                childrenClassName={'min-w-[40px]'}
              >
                {pageNum + 1}
              </Button>
            )
          })}
        </div>

        {/* Next button */}
        <Button
          variant="secondary-border"
          size="small"
          iconOnly
          disabled={!canNextPage}
          leftIcon={<IconCaretright size={14} />}
          onClick={() => onPageChange(page + 1)}
          className="bg-data-light-grey-hover hover:bg-data-light-grey-hover disabled:bg-data-light-grey-default h-[33px] w-[33px] border-none"
        />
      </div>
    </div>
  )
}

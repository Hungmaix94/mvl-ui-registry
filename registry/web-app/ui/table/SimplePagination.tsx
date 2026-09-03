import { Button } from '../../ui/button'
import { Select } from '../../ui/select'
import { IconCaretleft, IconCaretright } from '../../icons/arrows'
import { useCallback, useMemo } from 'react'
import { cn } from '@/utils'
import { PAGE_SIZES } from '../../constants/table.ts'
import { useSidebar } from '../../ui/sidebar/sidebar.tsx'

interface SimplePaginationProps {
  currentPage: number
  pageSize: number
  totalRecords: number
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  pageSizeOptions?: number[]
  showPageNumbers?: boolean
  position?: 'fixed' | 'static'
}

function SimplePagination({
  currentPage, // 1-based index usually passed from API, but internally we might use 0-based for logic if needed
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = PAGE_SIZES,
  showPageNumbers = true,
  position = 'fixed',
}: SimplePaginationProps) {
  const { open } = useSidebar()

  // Convert 1-based currentPage to 0-based pageIndex for calculation logic
  const pageIndex = currentPage - 1
  const pageCount = Math.ceil(totalRecords / pageSize)
  const canPreviousPage = pageIndex > 0
  const canNextPage = pageIndex < pageCount - 1

  // Page size options for select
  const pageSizeSelectOptions = pageSizeOptions.map((size) => ({
    label: `${size}`,
    value: size.toString(),
  }))

  const pages = useMemo(() => {
    const noPages: (number | 'ellipsis')[] = []

    if (pageCount <= 7) {
      for (let i = 0; i < pageCount; i++) {
        noPages.push(i)
      }
    } else {
      noPages.push(0)
      if (pageIndex <= 3) {
        for (let i = 1; i <= 4; i++) {
          noPages.push(i)
        }
        noPages.push('ellipsis')
        noPages.push(pageCount - 1)
      } else if (pageIndex >= pageCount - 4) {
        noPages.push('ellipsis')
        for (let i = pageCount - 5; i < pageCount; i++) {
          noPages.push(i)
        }
      } else {
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
      if (onPageSizeChange) {
        onPageSizeChange(newPageSize)
      }
    },
    [onPageSizeChange]
  )

  const handlePageChange = (newPageIndex: number) => {
    onPageChange(newPageIndex + 1) // Convert back to 1-based
  }

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
              onClick={() => handlePageChange(page)}
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
  }, [showPageNumbers, pages, pageIndex, onPageChange])

  if (totalRecords === 0) {
    return null
  }

  const isFixed = position === 'fixed'

  return (
    <div
      className={cn(
        isFixed ? 'fixed bottom-0' : 'relative w-full',
        'flex flex-col items-center justify-between gap-3 px-10 pt-[9px] pb-[10px] md:flex-row',
        'bg-content-light-1',
        'border-border-1 border border-x-0 border-t-[1px] border-b-0',
        'z-20',
        isFixed
          ? open
            ? 'w-[calc(100%-var(--sidebar-width))]'
            : 'w-full md:w-[calc(100%-var(--sidebar-width-icon))]'
          : 'w-full'
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-content-dark-3 text-xs font-medium text-nowrap">
          Hiển thị mỗi trang
        </span>
        <Select
          value={pageSizeOptions.find((opt) => opt === pageSize)}
          onChange={onChangePageSize}
          options={pageSizeSelectOptions}
          className={cn('h-[34px] w-20', 'typo-body-sm-medium', 'text-content-dark-3')}
          title={'Chọn số bản ghi'}
          clearable={false}
          iconSize={14}
        />
        <span className="text-content-dark-3 text-xs font-medium text-nowrap">
          / {totalRecords} bản ghi
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="secondary-border"
          size="small"
          iconOnly
          leftIcon={<IconCaretleft size={14} />}
          disabled={!canPreviousPage}
          onClick={() => handlePageChange(pageIndex - 1)}
          className="bg-data-light-grey-hover hover:bg-data-light-grey-hover disabled:bg-data-light-grey-default h-[33px] w-[33px] border-none"
        />

        {_renderPageNumbers()}

        <Button
          variant="secondary-border"
          size="small"
          iconOnly
          disabled={!canNextPage}
          leftIcon={<IconCaretright size={14} />}
          onClick={() => handlePageChange(pageIndex + 1)}
          className="bg-data-light-grey-hover hover:bg-data-light-grey-hover disabled:bg-data-light-grey-default h-[33px] w-[33px] border-none"
        />
      </div>
    </div>
  )
}

export { SimplePagination }

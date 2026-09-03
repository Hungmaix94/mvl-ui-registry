import { useCallback, useState, useRef, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useDebounceValue } from 'usehooks-ts'

import { PageTitle } from '@/components/ui'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import { APP_PATH } from '@/routes'
import { PAGE_SIZE } from '@/constants/table'

import TransactionSheetListTable from './components/TransactionSheetListTable'
import TransactionSheetFilter, {
  TransactionSheetFilterRef,
} from './components/TransactionSheetFilter'
import AppDialog from '@/components/dialog/AppDialog'
import { TransactionSheetApprovalStatus } from '@/constants/api-schema-aliases.ts'
import { useAbility } from '@/lib/ability'
import {
  buildFilterValuesFromUrl,
  buildUrlParamsFromFilterValues,
  countActiveFilters,
} from '@/features/sales/transaction-sheets/utils/transaction-sheet-filter-params'

import { useTransactionSheets } from '@/features/sales/transaction-sheets/services/transaction-sheet-service'

const TransactionSheetListPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAbility()
  const [isUrlReady, setIsUrlReady] = useState(false)

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const formRef = useRef<TransactionSheetFilterRef>(null)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const prevDebouncedSearchRef = useRef<string>('')

  // Initialize URL with default page on mount
  useEffect(() => {
    const defaultParams = new URLSearchParams(searchParams)
    let isModified = false

    if (!defaultParams.has('page')) {
      defaultParams.set('page', '1')
      isModified = true
    }

    if (isModified) {
      setSearchParams(defaultParams, { replace: true })
    }

    setIsUrlReady(true)
  }, []) // Only run on mount

  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || ''
    // Only update searchInput if URL search changed, not from user typing
    if (urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
  }, [searchParams]) // ONLY searchParams, not searchInput/debouncedSearch

  useEffect(() => {
    if (!isUrlReady) return

    // Only sync to URL if debouncedSearch actually changed
    if (prevDebouncedSearchRef.current === debouncedSearch) return
    prevDebouncedSearchRef.current = debouncedSearch

    // Use functional updater to avoid needing searchParams in deps
    setSearchParams((prev) => {
      const currentSearch = new URLSearchParams(prev).get('search') || ''
      if (debouncedSearch !== currentSearch) {
        const newParams = new URLSearchParams(prev)
        if (debouncedSearch) {
          newParams.set('search', debouncedSearch)
        } else {
          newParams.delete('search')
        }
        newParams.set('page', '1')
        return newParams
      }
      return prev
    })
  }, [debouncedSearch, isUrlReady]) // Remove searchParams from deps

  const page = Number(searchParams.get('page')) || 1
  const pageSizeParam = searchParams.get('page_size')
  const pageSize = pageSizeParam ? parseInt(pageSizeParam, 10) : PAGE_SIZE

  const currentFilters = useMemo(() => buildFilterValuesFromUrl(searchParams), [searchParams])

  const apiFilters = useMemo(() => {
    const cleaned: Record<string, unknown> = {}

    Array.from(searchParams.entries()).forEach(([key, value]) => {
      if (!['page', 'page_size', 'ordering'].includes(key)) {
        cleaned[key] = value
      }
    })

    if (cleaned.status) {
      cleaned.approval_status = cleaned.status as TransactionSheetApprovalStatus
      delete cleaned.status
    }

    // Deep-link from the admin dashboard queue card — only the approval stage the
    // signed-in user may act on. Must NOT go through the status→approval_status
    // remap above; the backend derives the stages from the caller's permissions.
    if (cleaned.awaiting_me === 'true' || cleaned.awaiting_me === 'false') {
      cleaned.awaiting_me = cleaned.awaiting_me === 'true'
    }

    if (cleaned.project) cleaned.project = Number(cleaned.project)
    if (cleaned.investor) cleaned.investor = Number(cleaned.investor)
    if (cleaned.has_f2 === 'true' || cleaned.has_f2 === 'false') {
      cleaned.has_f2 = cleaned.has_f2 === 'true'
    }

    return cleaned
  }, [searchParams])

  const { openExportDialog } = useAccountingListExport(
    '/api/sales/transaction-sheets/export/',
    'bang-ke-giao-dich.xlsx'
  )
  const handleExport = useCallback(() => {
    openExportDialog(apiFilters)
  }, [apiFilters, openExportDialog])

  const {
    data: listResponse,
    isLoading,
    error,
  } = useTransactionSheets(
    {
      page,
      page_size: pageSize,
      ...apiFilters,
    },
    isUrlReady
  )

  const handleOpenFilterDialog = useCallback(() => setIsFilterDialogOpen(true), [])
  const handleCloseFilterDialog = useCallback(() => setIsFilterDialogOpen(false), [])

  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return

    const newParams = buildUrlParamsFromFilterValues(formData, searchParams.get('search'))

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.TRANSACTION_SHEET_CREATE)
  }, [navigate])

  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

  const handlePageChange = useCallback(
    (newPage: number, newPageSize: number) => {
      setSearchParams((prev) => {
        const newParams = new URLSearchParams(prev)
        const currentPage = Number(newParams.get('page') || '1')
        const currentPageSize = Number(newParams.get('page_size') || PAGE_SIZE)

        if (currentPage === newPage && currentPageSize === newPageSize) {
          return prev
        }

        newParams.set('page', String(newPage))
        newParams.set('page_size', String(newPageSize))
        return newParams
      })
    },
    [setSearchParams]
  )

  const activeFilterCount = useMemo(() => countActiveFilters(currentFilters), [currentFilters])

  return (
    // Khung chuẩn của trang danh sách (AGENTS.md): `h-full` + `overflow-hidden` để chiều cao bị
    // CHẶN, nhờ đó div bọc bảng bên dưới mới có scrollport riêng — `sticky top-0` của hàng tiêu
    // đề chỉ bám theo scrollport gần nhất, không có nó thì cả trang cuộn và tiêu đề trôi mất.
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        handleSearch={handleSearch}
        searchPlaceholder="Tìm theo mã TTGD, khách hàng"
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleExportBtnFull={handleExport}
        titleExportBtnIcon="Xuất Excel"
        handleCreateNew={ability.can('create', 'transaction_sheet') ? handleCreateNew : undefined}
        searchClassName="!w-[350px]"
      />

      <div className="flex flex-grow flex-col gap-4 overflow-hidden pt-4 pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <TransactionSheetListTable
            stickyHeader
            data={listResponse?.results ?? []}
            isLoading={isLoading}
            error={error}
            totalRecords={listResponse?.count ?? 0}
            pageSize={pageSize}
            pageCount={listResponse?.count ? Math.ceil(listResponse.count / pageSize) : 0}
            currentPage={page}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* Filter Dialog */}
      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <TransactionSheetFilter
            ref={formRef}
            initialValues={currentFilters}
            isOpen={isFilterDialogOpen}
          />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </div>
  )
}

export default TransactionSheetListPage

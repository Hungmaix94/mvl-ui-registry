import { PageTitle } from '@/components/ui'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Flex } from '@radix-ui/themes'
import { useSearchParams } from 'react-router-dom'
import { useDebounceValue } from 'usehooks-ts'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import EmployeeBankAccountTable from '@/features/employee/bank-account-list/components/EmployeeBankAccountTable.tsx'
import EmployeeBankAccountFilterForm, {
  ACCOUNT_TYPE_FILTER,
  type AccountTypeFilter,
  type EmployeeBankAccountFilterFormData,
  type EmployeeBankAccountFilterFormRef,
} from '@/features/employee/bank-account-list/components/EmployeeBankAccountFilterForm.tsx'
import {
  type GetEmployeeBankAccountsExportParams,
  type GetEmployeeBankAccountsParams,
} from '@/features/employee/services/employee-bank-account-service'
import { useEmployeeBankAccountExport } from '@/features/employee/bank-account-list/hooks/useEmployeeBankAccountExport.tsx'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import { useAbility } from '@/lib/ability.ts'

const VALID_ACCOUNT_TYPE_VALUES: string[] = Object.values(ACCOUNT_TYPE_FILTER)

function parseFilterParamsFromUrl(
  searchParams: URLSearchParams
): EmployeeBankAccountFilterFormData {
  const params: EmployeeBankAccountFilterFormData = {}

  const bank = parsePositiveInt(searchParams.get('bank'))
  if (bank) params.bank = bank

  const isPrimary = searchParams.get('is_primary')
  if (isPrimary && VALID_ACCOUNT_TYPE_VALUES.includes(isPrimary)) {
    params.is_primary = isPrimary as AccountTypeFilter
  }

  return params
}

function buildApiParamsFromUrl(
  searchParams: URLSearchParams
): NonNullable<GetEmployeeBankAccountsParams> {
  const params: NonNullable<GetEmployeeBankAccountsParams> = {}

  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  params.page_size =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const ordering = searchParams.get('ordering')
  if (ordering) params.ordering = ordering

  const search = searchParams.get('search')
  if (search) params.search = search

  const bank = parsePositiveInt(searchParams.get('bank'))
  if (bank) params.bank = bank

  const isPrimary = searchParams.get('is_primary')
  if (isPrimary === ACCOUNT_TYPE_FILTER.PRIMARY) params.is_primary = true
  else if (isPrimary === ACCOUNT_TYPE_FILTER.NON_PRIMARY) params.is_primary = false

  return params
}

function serializeFiltersToUrl(
  values: EmployeeBankAccountFilterFormData,
  baseParams: URLSearchParams
): URLSearchParams {
  const newParams = new URLSearchParams()

  // Reset to page 1 when filter changes; preserve page size + non-filter params
  newParams.set('page', '1')
  const pageSizeFromUrl = parsePositiveInt(baseParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  newParams.set('page_size', String(safePageSize))

  const search = baseParams.get('search')
  if (search) newParams.set('search', search)

  const ordering = baseParams.get('ordering')
  if (ordering) newParams.set('ordering', ordering)

  if (values.bank) newParams.set('bank', String(values.bank))
  if (values.is_primary) newParams.set('is_primary', values.is_primary)

  return newParams
}

function buildEmployeeBankAccountsExportParamsFromListQuery(
  apiParams: NonNullable<GetEmployeeBankAccountsParams> | undefined
): GetEmployeeBankAccountsExportParams {
  const exportParams: GetEmployeeBankAccountsExportParams = {}

  if (apiParams) {
    if (apiParams.bank) exportParams.bank = apiParams.bank
    if (apiParams.is_primary !== undefined) exportParams.is_primary = apiParams.is_primary
    if (apiParams.search && apiParams.search.trim() !== '') {
      exportParams.search = apiParams.search
    }
  }

  return exportParams
}

const EmployeeBankAccountPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAbility()
  const formRef = useRef<EmployeeBankAccountFilterFormRef>(null)

  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openExportDialog } = useEmployeeBankAccountExport()

  // Initialize URL with pagination defaults if missing
  useEffect(() => {
    const hasPage = searchParams.has('page')
    const hasPageSize = searchParams.has('page_size')

    if (!hasPage || !hasPageSize) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    }

    setIsUrlReady(true)
  }, []) // Only run once on mount

  // Sync search input when URL changes (e.g., browser back/forward)
  useEffect(() => {
    const urlSearchTerm = searchParams.get('search') || ''
    if (urlSearchTerm !== searchInput && urlSearchTerm !== debouncedSearch) {
      setSearchInput(urlSearchTerm)
    }
  }, [searchParams])

  // Update URL when debounced search changes
  useEffect(() => {
    if (!isUrlReady) return

    const currentSearchTerm = searchParams.get('search') || ''
    if (debouncedSearch !== currentSearchTerm) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedSearch) {
        newParams.set('search', debouncedSearch)
      } else {
        newParams.delete('search')
      }
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedSearch, isUrlReady])

  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildApiParamsFromUrl(searchParams)
  }, [searchParams, isUrlReady])

  const currentFilterParams = useMemo(() => parseFilterParamsFromUrl(searchParams), [searchParams])

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilterParams.bank) count++
    if (currentFilterParams.is_primary) count++
    return count
  }, [currentFilterParams])

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleSortingChange = useCallback(
    (field: string, direction: 'asc' | 'desc' | null) => {
      const newParams = new URLSearchParams(searchParams)
      if (!field || !direction) {
        newParams.delete('ordering')
      } else {
        newParams.set('ordering', direction === 'desc' ? `-${field}` : field)
      }
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleSearch = useCallback((query: string) => {
    setSearchInput(query)
  }, [])

  const handleOpenFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(true)
  }, [])

  const handleCloseFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(false)
  }, [])

  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return

    const newParams = serializeFiltersToUrl(formData, searchParams)
    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [searchParams, setSearchParams])

  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  // Handle export
  const handleExport = useCallback(() => {
    openExportDialog(buildEmployeeBankAccountsExportParamsFromListQuery(apiParams))
  }, [openExportDialog, apiParams])

  return (
    <>
      <PageTitle
        handleSearch={handleSearch}
        searchPlaceholder="Tìm kiếm theo mã, tên nhân viên, số tài khoản"
        searchClassName={'!w-[350px]'}
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleExportBtnFull={
          ability.can('export', 'employee_bank_account') ? handleExport : undefined
        }
      />

      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <EmployeeBankAccountTable
            apiParams={apiParams}
            currentPage={currentPage}
            pageSize={pageSize}
            onPaginationChange={handlePaginationChange}
            onSortingChange={handleSortingChange}
            onClearFilter={handleClearAll}
            hasFilter={!!searchInput || activeFilterCount > 0}
            isUrlReady={isUrlReady}
          />
        </div>
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <EmployeeBankAccountFilterForm
            ref={formRef}
            initialValues={currentFilterParams}
            isOpen={isFilterDialogOpen}
          />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default EmployeeBankAccountPage

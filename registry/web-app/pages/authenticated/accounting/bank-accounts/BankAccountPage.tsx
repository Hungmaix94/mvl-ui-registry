import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import { PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import { useAbility } from '@/lib/ability.ts'
import { APP_PATH } from '@/routes'
import BankAccountTable from '@/features/accounting/bank-accounts/view/BankAccountTable.tsx'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import BankAccountFilterForm, {
  type BankAccountFilterFormRef,
} from '@/features/accounting/bank-accounts/_shares/components/BankAccountFilterForm.tsx'
import {
  type BankAccountFilterValues,
  DEFAULT_BANK_ACCOUNT_FILTER_VALUES,
} from '@/features/accounting/bank-accounts/types/bank-account-types'
import {
  type GetBankAccountsParams,
  useBankAccounts,
} from '@/features/accounting/bank-accounts/services/bank-account-service'
import { useBankAccountSetDefault } from '@/features/accounting/bank-accounts/_shares/hooks/useBankAccountSetDefault.tsx'
import { useBankAccountToggleActive } from '@/features/accounting/bank-accounts/_shares/hooks/useBankAccountToggleActive.tsx'

type FilterParams = {
  branch?: string | null
  is_active?: string | null
  is_default?: string | null
}

function buildApiParamsFromUrl(searchParams: URLSearchParams): GetBankAccountsParams {
  const params: GetBankAccountsParams = {}

  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  const branch = parsePositiveInt(searchParams.get('branch'))
  if (branch) params.branch = branch

  const isActive = searchParams.get('is_active')
  if (isActive === 'true') params.is_active = true
  else if (isActive === 'false') params.is_active = false

  const isDefault = searchParams.get('is_default')
  if (isDefault === 'true') params.is_default = true
  else if (isDefault === 'false') params.is_default = false

  const ordering = searchParams.get('ordering')
  if (ordering) params.ordering = ordering

  return params
}

function parseFilterParamsFromUrl(searchParams: URLSearchParams): FilterParams {
  const params: FilterParams = {}
  const branch = searchParams.get('branch')
  if (branch) params.branch = branch
  const isActive = searchParams.get('is_active')
  if (isActive) params.is_active = isActive
  const isDefault = searchParams.get('is_default')
  if (isDefault) params.is_default = isDefault
  return params
}

export default function BankAccountPage() {
  const navigate = useNavigate()
  const ability = useAbility()
  const [searchParams, setSearchParams] = useSearchParams()
  const filterFormRef = useRef<BankAccountFilterFormRef>(null)

  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [shouldShowConfig, setShouldShowConfig] = useState(false)

  const { openSetDefaultDialog } = useBankAccountSetDefault()
  const { openToggleDialog } = useBankAccountToggleActive()

  // Initialize URL defaults
  useEffect(() => {
    const actualUrlParams = new URLSearchParams(window.location.search)
    const isUrlEmpty = actualUrlParams.toString() === '' && searchParams.toString() === ''
    const hasPage = searchParams.has('page') || actualUrlParams.has('page')
    const hasPageSize = searchParams.has('page_size') || actualUrlParams.has('page_size')

    if (isUrlEmpty) {
      const newParams = new URLSearchParams()
      newParams.set('page', '1')
      newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    } else if (!hasPage || !hasPageSize) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
      setSearchParams(newParams, { replace: true })
    }
    setIsUrlReady(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildApiParamsFromUrl(searchParams)
  }, [searchParams, isUrlReady])

  const { data, isLoading, error, isFetching, isRefetching } = useBankAccounts(apiParams, {
    enabled: isUrlReady && !!apiParams,
  })

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/bank-accounts/export/',
    'tai-khoan-ngan-hang.xlsx'
  )
  const handleExport = useCallback(() => {
    const { page: _page, page_size: _pageSize, ...filters } = apiParams ?? {}
    openExportDialog(filters)
  }, [apiParams, openExportDialog])

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = data?.results ?? []
    const count = data?.count ?? 0
    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [data, pageSize])

  const currentFilterParams = useMemo(() => parseFilterParamsFromUrl(searchParams), [searchParams])

  const filterBadgeCount = useMemo(
    () =>
      Object.values(currentFilterParams).filter((v) => v !== null && v !== undefined && v !== '')
        .length,
    [currentFilterParams]
  )

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.COMPANY_BANK_ACCOUNT_CREATE, {
      state: { from: window.location.pathname + window.location.search },
    })
  }, [navigate])

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })

      const mainEl = document.querySelector('main')
      if (mainEl) mainEl.scrollTop = 0
      else window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [searchParams, setSearchParams]
  )

  const handleClearAll = useCallback(() => {
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  const handleOpenFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(true)
  }, [])

  const handleCloseFilterDialog = useCallback(() => {
    setIsFilterDialogOpen(false)
  }, [])

  const handleClearFilterInDialog = useCallback(() => {
    filterFormRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData) return

    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))

    if (formData.branch) newParams.set('branch', String(formData.branch))
    if (formData.is_active) newParams.set('is_active', String(formData.is_active))
    if (formData.is_default) newParams.set('is_default', String(formData.is_default))

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [pageSize, setSearchParams])

  const formInitialValues: Partial<BankAccountFilterValues> = useMemo(
    () => ({
      ...DEFAULT_BANK_ACCOUNT_FILTER_VALUES,
      branch: currentFilterParams.branch ? Number(currentFilterParams.branch) : null,
      is_active:
        currentFilterParams.is_active === 'true' || currentFilterParams.is_active === 'false'
          ? (currentFilterParams.is_active as 'true' | 'false')
          : null,
      is_default:
        currentFilterParams.is_default === 'true' || currentFilterParams.is_default === 'false'
          ? (currentFilterParams.is_default as 'true' | 'false')
          : null,
    }),
    [currentFilterParams]
  )

  const isTableLoading = isLoading || isFetching || isRefetching
  const hasFilter = filterBadgeCount > 0

  // Reset trigger after a short delay to allow dialog to open
  useEffect(() => {
    if (shouldShowConfig) {
      const timer = setTimeout(() => {
        setShouldShowConfig(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [shouldShowConfig])

  // No search input: `accounting_bank_accounts_list` does not expose a `search`
  // query param, so we omit the field entirely (no fake/disabled input).
  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Tài khoản ngân hàng"
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={filterBadgeCount}
        handleConfigTableColumn={() => setShouldShowConfig(true)}
        handleExportBtnFull={handleExport}
        titleExportBtnIcon="Xuất Excel"
        handleCreateNew={ability.can('create', 'companybankaccount') ? handleCreateNew : undefined}
        titleCreateNew="Thêm tài khoản"
      />
      <div className="flex flex-grow flex-col gap-6 overflow-y-auto pt-4 pb-6">
        <BankAccountTable
          data={tableData}
          isLoading={isTableLoading}
          error={error as Error | null}
          pageCount={pageCount}
          pageSize={pageSize}
          currentPage={currentPage}
          totalRecords={totalRecords}
          onPaginationChange={handlePaginationChange}
          onSetDefault={openSetDefaultDialog}
          onToggleActive={openToggleDialog}
          onClearFilter={handleClearAll}
          hasFilter={hasFilter}
          isShowTableColumnConfig={shouldShowConfig}
        />
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={<BankAccountFilterForm ref={filterFormRef} initialValues={formInitialValues} />}
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </div>
  )
}

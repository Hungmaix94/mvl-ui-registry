import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { RecoveryVoucherTable } from '@/features/payroll/recovery-voucher'
import RecoveryVoucherFilterForm, {
  type RecoveryVoucherFilterFormRef,
  type RecoveryVoucherFilterForm as FilterFormType,
} from '@/features/payroll/recovery-voucher/_shares/components/RecoveryVoucherFilterForm.tsx'
import { useRecoveryVoucherDelete } from '@/features/payroll/recovery-voucher/_shares/hooks/useRecoveryVoucherDelete.tsx'
import { useRecoveryVoucherExport } from '@/features/payroll/recovery-voucher/_shares/hooks/useRecoveryVoucherExport.tsx'
import {
  useRecoveryVouchers,
  type RecoveryVoucher,
} from '@/features/payroll/services/recovery-voucher-service'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability.ts'
import { useDebounceValue } from 'usehooks-ts'
import { parse, format } from 'date-fns'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { parsePositiveInt } from '@/utils/common.ts'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import { RecoveryVoucherStatus, RecoveryVoucherType } from '@/constants/api-schema-aliases'
type FilterParams = {
  month?: Date
  branch_id?: number
  block_id?: number
  department_id?: number
  voucher_types?: RecoveryVoucherType[]
  statuses?: RecoveryVoucherStatus[]
}

const enumVoucherTypes = Object.values(RecoveryVoucherType) as string[]
const enumStatuses = Object.values(RecoveryVoucherStatus) as string[]

const parseMultiEnum = (value: string | null, allowed: string[]) => {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => allowed.includes(item))
}

function parseFilterParamsFromUrl(searchParams: URLSearchParams): FilterParams {
  const params: FilterParams = {}

  const month = searchParams.get('month')
  if (month) {
    try {
      params.month = parse(month, 'MM/yyyy', new Date())
    } catch {
      // ignore invalid month
    }
  }

  const branchId = parsePositiveInt(searchParams.get('branch'))
  if (branchId) params.branch_id = branchId

  const blockId = parsePositiveInt(searchParams.get('block'))
  if (blockId) params.block_id = blockId

  const departmentId = parsePositiveInt(searchParams.get('department'))
  if (departmentId) params.department_id = departmentId

  const voucherTypes = parseMultiEnum(searchParams.get('voucher_type'), enumVoucherTypes)
  if (voucherTypes.length) params.voucher_types = voucherTypes as any

  const statuses = parseMultiEnum(searchParams.get('status'), enumStatuses)
  if (statuses.length) params.statuses = statuses as any

  return params
}

function buildApiParamsFromUrl(searchParams: URLSearchParams): Record<string, any> {
  const params: Record<string, any> = {}

  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  const ordering = searchParams.get('ordering')
  if (ordering) {
    params.ordering = ordering
  }

  const search = searchParams.get('search')
  if (search) {
    params.search = search
  }

  const month = searchParams.get('month')
  if (month) {
    params.month = month
  }

  return params
}

const RecoveryVoucherPage = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const formRef = useRef<RecoveryVoucherFilterFormRef>(null)
  const ability = useAbility()

  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  const initialSearchTerm = searchParams.get('search') || ''
  const [searchInput, setSearchInput] = useState(initialSearchTerm)
  const [debouncedSearch] = useDebounceValue(searchInput, 500)

  const { openDeleteDialog } = useRecoveryVoucherDelete()
  const { openExportDialog } = useRecoveryVoucherExport()

  useEffect(() => {
    if (!isUrlReady) {
      const hasParams = searchParams.toString().length > 0
      if (!hasParams) {
        const defaultParams = new URLSearchParams()
        defaultParams.set('page', '1')
        defaultParams.set('page_size', String(PAGE_SIZE))
        setSearchParams(defaultParams, { replace: true })
      }
      setIsUrlReady(true)
    }
  }, [isUrlReady, searchParams, setSearchParams])

  useEffect(() => {
    if (isUrlReady) {
      const newParams = new URLSearchParams(searchParams)
      if (debouncedSearch) {
        newParams.set('search', debouncedSearch)
        newParams.set('page', '1')
      } else {
        newParams.delete('search')
        newParams.set('page', '1')
      }
      setSearchParams(newParams, { replace: true })
    }
  }, [debouncedSearch, isUrlReady])

  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined

    const baseParams = buildApiParamsFromUrl(searchParams)

    const branchId = parsePositiveInt(searchParams.get('branch'))
    if (branchId) baseParams.branch = branchId

    const blockId = parsePositiveInt(searchParams.get('block'))
    if (blockId) baseParams.block = blockId

    const departmentId = parsePositiveInt(searchParams.get('department'))
    if (departmentId) baseParams.department = departmentId

    const voucherTypes = parseMultiEnum(searchParams.get('voucher_type'), enumVoucherTypes)
    if (voucherTypes.length === 1) {
      baseParams.voucher_type = voucherTypes[0]
    }

    const statuses = parseMultiEnum(searchParams.get('status'), enumStatuses)
    if (statuses.length === 1) {
      baseParams.status = statuses[0]
    }

    return baseParams
  }, [isUrlReady, searchParams])

  const {
    data: voucherData,
    isLoading,
    error,
    isFetching,
    isRefetching,
  } = useRecoveryVouchers(apiParams as any, {
    enabled: !!apiParams,
  })

  const currentFilterParams = useMemo(() => parseFilterParamsFromUrl(searchParams), [searchParams])

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  const currentOrdering = searchParams.get('ordering') || undefined

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
      if (direction === null) {
        newParams.delete('ordering')
      } else {
        const orderingValue = direction === 'desc' ? `-${field}` : field
        newParams.set('ordering', orderingValue)
      }
      newParams.set('page', '1')
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleOpenFilterDialog = useCallback(() => setIsFilterDialogOpen(true), [])
  const handleCloseFilterDialog = useCallback(() => setIsFilterDialogOpen(false), [])

  const handleClearFilterInDialog = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues?.()
    if (!formData) return

    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))

    const search = searchParams.get('search')
    if (search) newParams.set('search', search)

    const ordering = searchParams.get('ordering')
    if (ordering) newParams.set('ordering', ordering)

    if (formData.month) {
      newParams.set('month', format(formData.month, 'MM/yyyy'))
    }

    if (formData.branch_id) newParams.set('branch', String(formData.branch_id))
    if (formData.block_id) newParams.set('block', String(formData.block_id))
    if (formData.department_id) newParams.set('department', String(formData.department_id))

    if (formData.voucher_types && formData.voucher_types.length > 0) {
      newParams.set('voucher_type', formData.voucher_types.join(','))
    }

    if (formData.statuses && formData.statuses.length > 0) {
      newParams.set('status', formData.statuses.join(','))
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [pageSize, searchParams, setSearchParams])

  const handleClearAll = useCallback(() => {
    setSearchInput('')
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.RECOVERY_VOUCHER_CREATE, {
      state: { from: window.location.pathname + window.location.search },
    })
  }, [navigate])

  const handleDeleteVoucher = useCallback(
    (voucher: RecoveryVoucher) => {
      openDeleteDialog(voucher)
    },
    [openDeleteDialog]
  )

  const handleExport = useCallback(() => {
    openExportDialog(searchInput, currentFilterParams as FilterFormType)
  }, [openExportDialog, searchInput, currentFilterParams])

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (currentFilterParams.month) count++
    if (currentFilterParams.branch_id) count++
    if (currentFilterParams.block_id) count++
    if (currentFilterParams.department_id) count++

    const voucherTypesCount = currentFilterParams.voucher_types?.length || 0
    if (voucherTypesCount > 0 && voucherTypesCount < enumVoucherTypes.length) count++

    const statusesCount = currentFilterParams.statuses?.length || 0
    if (statusesCount > 0 && statusesCount < enumStatuses.length) count++

    return count
  }, [currentFilterParams])

  const { tableData, pageCount, totalRecords } = useMemo(() => {
    const results = voucherData?.results ?? []
    const count = voucherData?.count ?? 0

    return {
      tableData: results,
      pageCount: Math.ceil(count / pageSize) || 1,
      totalRecords: count,
    }
  }, [voucherData, pageSize])

  const isTableLoading = isLoading || isFetching || isRefetching

  const formInitialValues = useMemo(() => {
    return {
      month: currentFilterParams.month || undefined,
      branch_id: currentFilterParams.branch_id || undefined,
      block_id: currentFilterParams.block_id || undefined,
      department_id: currentFilterParams.department_id || undefined,
      voucher_types: currentFilterParams.voucher_types || [],
      statuses: currentFilterParams.statuses || [],
    }
  }, [currentFilterParams])

  return (
    <>
      <PageTitle
        searchPlaceholder="Tìm kiếm theo tên, mã phiếu"
        searchClassName="!w-[350px]"
        handleSearch={setSearchInput}
        searchValue={searchInput}
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleCreateNew={
          ability.can('create', 'payroll.recovery_voucher') ? handleCreateNew : undefined
        }
        handleExportBtnFull={
          ability.can('export', 'payroll.recovery_voucher') ? handleExport : undefined
        }
      />
      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <RecoveryVoucherTable
            data={tableData}
            isLoading={isTableLoading}
            error={error}
            pageCount={pageCount}
            pageSize={pageSize}
            currentPage={currentPage}
            totalRecords={totalRecords}
            ordering={currentOrdering}
            onPaginationChange={handlePaginationChange}
            onSortingChange={handleSortingChange}
            onDeleteRecoveryVoucher={handleDeleteVoucher}
            onClearFilter={handleClearAll}
            hasFilter={!!searchInput || activeFilterCount > 0}
          />
        </div>
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={<RecoveryVoucherFilterForm ref={formRef} initialValues={formInitialValues} />}
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={handleCloseFilterDialog}
      />
    </>
  )
}

export default RecoveryVoucherPage

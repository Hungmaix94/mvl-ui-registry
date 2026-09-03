import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { APP_PATH } from '@/routes'
import { Button, PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import { useDialog } from '@/hooks/useDialog'
import toastService from '@/services/toast-service'
import { useAuth } from '@/store'
import { hasPermission } from '@/utils/auth'
import {
  useDepartmentCommissionPools,
  useRebuildDepartmentCommissionPools,
  DepartmentCommissionPool,
} from '@/features/accounting/department-commission-pools/services/department-commission-pools-service'
import { useDeptPoolImportUploadDialog } from '@/features/accounting/department-commission-pools/hooks/useDeptPoolImportUploadDialog'
import {
  useAllAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import AccountingPeriodSelect from '@/features/accounting/accounting-periods/components/AccountingPeriodSelect'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import { DepartmentMonthlyKpiTable } from '@/features/accounting/department-monthly-kpi/components/DepartmentMonthlyKpiTable'
import DepartmentMonthlyKpiFilter, {
  DepartmentMonthlyKpiFilterRef,
} from '@/features/accounting/department-monthly-kpi/components/DepartmentMonthlyKpiFilter'
import { QUERY_KEYS } from '@/constants'
import { PAGE_SIZE } from '@/constants/table'
import {
  applyDepartmentMonthlyKpiFilterToParams,
  buildDepartmentMonthlyKpiApiParams,
  countDepartmentMonthlyKpiActiveFilters,
  getDepartmentMonthlyKpiFilterValues,
} from '@/features/accounting/department-monthly-kpi/utils/department-monthly-kpi-filter-params'

export function DepartmentMonthlyKpiListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const [isUrlReady, setIsUrlReady] = useState(false)

  const filterFormRef = useRef<DepartmentMonthlyKpiFilterRef>(null)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)

  const { data: allPeriods } = useAllAccountingPeriods()
  const { data: currentPeriod, isLoading: isLoadingCurrent } = useCurrentAccountingPeriod()
  const periods = allPeriods ?? []

  const apiParams = useMemo(() => buildDepartmentMonthlyKpiApiParams(searchParams), [searchParams])
  const currentFilterParams = useMemo(
    () => getDepartmentMonthlyKpiFilterValues(searchParams),
    [searchParams]
  )

  const activePeriod = useMemo(() => {
    if (apiParams.year && apiParams.month) {
      return periods.find((p) => p.year === apiParams.year && p.month === apiParams.month) ?? null
    }
    return null
  }, [periods, apiParams.year, apiParams.month])
  const activePeriodId = activePeriod?.id ?? null

  useEffect(() => {
    if (periods.length === 0 || isLoadingCurrent) return

    const hasPage = searchParams.has('page')
    const hasPageSize = searchParams.has('page_size')
    const hasYear = searchParams.has('year')
    const hasMonth = searchParams.has('month')

    if (!hasPage || !hasPageSize || !hasYear || !hasMonth) {
      const newParams = new URLSearchParams(searchParams)
      if (!hasPage) newParams.set('page', '1')
      if (!hasPageSize) newParams.set('page_size', String(PAGE_SIZE))
      if (!hasYear || !hasMonth) {
        const defaultPeriod = currentPeriod ?? periods[0]
        if (defaultPeriod) {
          newParams.set('year', String(defaultPeriod.year))
          newParams.set('month', String(defaultPeriod.month))
        }
      }
      setSearchParams(newParams, { replace: true })
    } else {
      setIsUrlReady(true)
    }
  }, [periods, currentPeriod, isLoadingCurrent, searchParams, setSearchParams])

  const handlePeriodSelect = useCallback(
    (periodId: number) => {
      const period = periods.find((p) => p.id === periodId)
      if (period) {
        const newParams = new URLSearchParams(searchParams)
        newParams.set('page', '1')
        newParams.set('year', String(period.year))
        newParams.set('month', String(period.month))
        setSearchParams(newParams, { replace: true })
      }
    },
    [periods, searchParams, setSearchParams]
  )

  const filterBadgeCount = useMemo(
    () => countDepartmentMonthlyKpiActiveFilters(searchParams),
    [searchParams]
  )

  const queryFilters = useMemo(
    () => ({
      accounting_period: activePeriodId || undefined,
      branch: apiParams.branch,
      block: apiParams.block,
      department: apiParams.department,
      status: apiParams.status,
      split_status: apiParams.split_status,
    }),
    [activePeriodId, apiParams]
  )

  const {
    data: apiData,
    isLoading,
    isError,
    refetch,
  } = useDepartmentCommissionPools(
    { ...queryFilters, page: apiParams.page, page_size: apiParams.page_size },
    { enabled: isUrlReady && !!activePeriodId }
  )

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/department-commission-pools/export/',
    'kpi-phong-theo-thang.xlsx'
  )
  const handleExport = useCallback(() => {
    openExportDialog(queryFilters)
  }, [openExportDialog, queryFilters])

  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData) return
    setSearchParams(
      applyDepartmentMonthlyKpiFilterToParams(searchParams, formData, apiParams.page_size),
      { replace: true }
    )
    setIsFilterDialogOpen(false)
  }, [apiParams.page_size, searchParams, setSearchParams])

  const handleClearFilterInDialog = useCallback(() => {
    filterFormRef.current?.clearForm()
  }, [])

  const handlePaginationChange = useCallback(
    (page: number, pageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      // Đổi số dòng/trang thì phải về trang 1 — trang cũ có thể vượt tổng số trang mới.
      newParams.set('page', pageSize !== apiParams.page_size ? '1' : String(page))
      newParams.set('page_size', String(pageSize))
      setSearchParams(newParams, { replace: true })
    },
    [apiParams.page_size, searchParams, setSearchParams]
  )

  const rows = apiData?.results ?? []
  const totalRecords = apiData?.count ?? 0
  const pageCount = Math.ceil(totalRecords / apiParams.page_size)

  const queryClient = useQueryClient()
  const { openUploadDialog } = useDeptPoolImportUploadDialog()

  const handleViewDetail = useCallback(
    (row: DepartmentCommissionPool) => {
      navigate(APP_PATH.DEPARTMENT_MONTHLY_KPI_DETAIL.replace(':id', String(row.id)))
    },
    [navigate]
  )

  const { user } = useAuth()
  const canRebuild = useMemo(
    () => hasPermission(user?.permissions || [], 'departmentcommissionpool.rebuild'),
    [user?.permissions]
  )
  const { displayConfirm } = useDialog()
  const rebuildMutation = useRebuildDepartmentCommissionPools()

  const handleRebuild = useCallback(() => {
    const { year, month } = apiParams
    if (!year || !month) {
      toastService.error('Vui lòng chọn kỳ kế toán trước khi tính lại')
      return
    }
    displayConfirm({
      title: 'Tính lại HH phòng ban',
      content: `Tính lại hoa hồng các phòng ban cho kỳ ${month}/${year} theo cấu hình tỷ lệ hiện tại? Chỉ các pool đang ở trạng thái Bản nháp được cập nhật (pool đã xác nhận giữ nguyên).`,
      confirmText: 'Tính lại',
      cancelText: 'Huỷ',
      onConfirm: async () => {
        try {
          const result = await rebuildMutation.mutateAsync({ year, month })
          toastService.success(
            `Đã tính lại ${result.rebuilt} pool phòng ban cho kỳ ${month}/${year}`
          )
          // Prefix-invalidate every dept-pool list/detail query (LIST key ends with the
          // serialized params, so an exact key would miss the currently-filtered list).
          queryClient.invalidateQueries({
            queryKey: ['accounting', 'department-commission-pools'],
          })
        } catch {
          toastService.error('Tính lại HH phòng ban thất bại')
        }
      },
    })
  }, [apiParams, displayConfirm, rebuildMutation, queryClient])

  const handleImportLines = useCallback(
    async (row: DepartmentCommissionPool) => {
      try {
        await openUploadDialog(row.id)
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.ACCOUNTING.DEPARTMENT_COMMISSION_POOLS.LIST({}),
        })
      } catch {
        // Dialog cancelled or import error handled inside hook
      }
    },
    [openUploadDialog, queryClient]
  )

  const handleImportLinesFromHeader = useCallback(async () => {
    try {
      await openUploadDialog(undefined, activePeriodId || undefined)
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.DEPARTMENT_COMMISSION_POOLS.LIST({}),
      })
    } catch {
      // Dialog cancelled or import error handled inside hook
    }
  }, [openUploadDialog, activePeriodId, queryClient])

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Hoa hồng quản lý khối back"
        breadcrumb={[
          { label: 'Kế toán', href: '/accounting/dashboard' },
          { label: 'Hoa hồng quản lý' },
          { label: 'Hoa hồng quản lý khối back' },
        ]}
        handleFilter={() => setIsFilterDialogOpen(true)}
        filterBadgeCount={filterBadgeCount}
        handleExportBtnFull={handleExport}
        titleExportBtnIcon="Xuất Excel"
        handleImportBtnFull={handleImportLinesFromHeader}
        customActions={
          canRebuild ? (
            <Button
              variant="secondary-border"
              onClick={handleRebuild}
              loading={rebuildMutation.isPending}
            >
              Tính lại HH phòng ban
            </Button>
          ) : undefined
        }
        toolbarLeftContent={
          <AccountingPeriodSelect
            periods={periods}
            selectedPeriodId={activePeriodId}
            onSelect={handlePeriodSelect}
          />
        }
      />

      <div className="flex flex-grow flex-col gap-4 overflow-hidden pt-4 pb-6">
        {/* Lọc phía server: danh sách rỗng do lỗi API trông y hệt "không có dữ liệu",
            nên phải nói rõ là hỏng chứ không để user tưởng kỳ này không có pool nào. */}
        {isError && (
          <div className="px-7">
            <div className="border-data-red-default bg-data-red-light text-content-dark-1 flex items-center justify-between gap-4 rounded-lg border px-5 py-3 text-sm">
              <span>Không tải được danh sách hoa hồng phòng ban. Vui lòng thử lại.</span>
              <Button variant="secondary-border" onClick={() => refetch()}>
                Thử lại
              </Button>
            </div>
          </div>
        )}

        {/* Vùng cuộn chuẩn của trang danh sách. `useStickyTableHeader` tìm container bằng
            `[class*="overflow-x-auto"][class*="overflow-y-auto"]` — thiếu wrapper này thì hook
            bail im lặng và header không ghim (đúng lỗi đã đo được trên browser). */}
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-0">
          <DepartmentMonthlyKpiTable
            data={rows}
            isLoading={isLoading}
            hasFilter={filterBadgeCount > 0}
            pageCount={pageCount}
            pageSize={apiParams.page_size}
            currentPage={apiParams.page}
            totalRecords={totalRecords}
            onPaginationChange={handlePaginationChange}
            onViewDetail={handleViewDetail}
            onImportLines={handleImportLines}
            activePeriod={activePeriod}
          />
        </div>
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <DepartmentMonthlyKpiFilter ref={filterFormRef} initialValues={currentFilterParams} />
        }
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
      />
    </div>
  )
}

export default DepartmentMonthlyKpiListPage

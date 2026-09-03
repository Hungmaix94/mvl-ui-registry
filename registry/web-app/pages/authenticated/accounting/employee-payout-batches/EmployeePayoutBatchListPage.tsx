import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'

import { PageTitle } from '@/components/ui'
import { APP_PATH } from '@/routes'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table'
import { parsePositiveInt } from '@/utils/common'
import { formatDateToApi, parseDateFromApi, parseMonthFromApi } from '@/utils/date-utils'

import { useQueryClient } from '@tanstack/react-query'
import AppDialog from '@/components/dialog/AppDialog'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import {
  useEmployeePayoutBatches,
  useDeleteEmployeePayoutBatch,
  type EmployeeCommissionPayoutBatch,
  type GetEmployeePayoutBatchesParams,
} from '@/features/accounting/employee-payout-batches/services/employee-payout-batch-service'
import EmployeePayoutBatchTable from '@/features/accounting/employee-payout-batches/components/EmployeePayoutBatchTable'
import EmployeePayoutBatchFilter, {
  type EmployeePayoutBatchFilterFormData,
  type EmployeePayoutBatchFilterRef,
} from '@/features/accounting/employee-payout-batches/components/EmployeePayoutBatchFilter'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import { EmployeePayoutBatchStatus as EmployeeCommissionPayoutBatchStatus } from '@/constants/api-schema-aliases'

// ── Helpers ──────────────────────────────────────────────────────────────────

const VALID_STATUSES = new Set<string>(Object.values(EmployeeCommissionPayoutBatchStatus))

function buildApiParams(
  searchParams: URLSearchParams,
  page: number,
  pageSize: number
): GetEmployeePayoutBatchesParams {
  const params: GetEmployeePayoutBatchesParams = { page, page_size: pageSize }

  const year = parsePositiveInt(searchParams.get('year'))
  const month = parsePositiveInt(searchParams.get('month'))
  // Kỳ tháng chỉ có nghĩa khi đủ cả hai — gửi lẻ một vế sẽ lọc sai (mọi tháng 5 của mọi năm).
  if (year && month) {
    params.year = year
    params.month = month
  }

  const batchDateAfter = searchParams.get('batch_date_after')
  if (batchDateAfter) params.batch_date_after = batchDateAfter

  const batchDateBefore = searchParams.get('batch_date_before')
  if (batchDateBefore) params.batch_date_before = batchDateBefore

  const status = searchParams.get('status')
  // Chặn giá trị lạ từ URL gõ tay: BE trả 400 cho status ngoài enum, làm hỏng cả trang.
  if (status && VALID_STATUSES.has(status)) {
    params.status = status as EmployeeCommissionPayoutBatchStatus
  }

  return params
}

function getFilterValues(searchParams: URLSearchParams): EmployeePayoutBatchFilterFormData {
  const year = parsePositiveInt(searchParams.get('year'))
  const month = parsePositiveInt(searchParams.get('month'))
  const status = searchParams.get('status')

  return {
    period: year && month ? (parseMonthFromApi(`${month}/${year}`) ?? null) : null,
    batchDateFrom: parseDateFromApi(searchParams.get('batch_date_after')) ?? null,
    batchDateTo: parseDateFromApi(searchParams.get('batch_date_before')) ?? null,
    status: status && VALID_STATUSES.has(status) ? status : '',
  }
}

function countActiveFilters(searchParams: URLSearchParams): number {
  // Badge đếm theo Ô TRONG DIALOG, không theo số query param: kỳ tháng chiếm `year`+`month` và
  // khoảng ngày chiếm `batch_date_after`+`batch_date_before`, nhưng mỗi thứ chỉ là MỘT tiêu chí.
  // Đếm theo param sẽ ra badge 4 trong khi người dùng chỉ thấy 3 ô — lệch ngay trước mắt họ.
  const hasPeriod = !!searchParams.get('year') && !!searchParams.get('month')
  const hasBatchDateRange =
    !!searchParams.get('batch_date_after') || !!searchParams.get('batch_date_before')
  const hasStatus = !!searchParams.get('status')

  return [hasPeriod, hasBatchDateRange, hasStatus].filter(Boolean).length
}

// ── Component ────────────────────────────────────────────────────────────────

const EmployeePayoutBatchListPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isUrlReady, setIsUrlReady] = useState(false)
  const [shouldShowConfig, setShouldShowConfig] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [filterDialogOpenKey, setFilterDialogOpenKey] = useState(0)
  const [deletingRecord, setDeletingRecord] = useState<EmployeeCommissionPayoutBatch | null>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const formRef = useRef<EmployeePayoutBatchFilterRef>(null)

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
  }, [])

  // Reset trigger after a short delay to allow dialog to open
  useEffect(() => {
    if (shouldShowConfig) {
      const timer = setTimeout(() => {
        setShouldShowConfig(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [shouldShowConfig])

  const currentPage = parsePositiveInt(searchParams.get('page')) ?? 1
  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const pageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE

  // Khoá theo chuỗi query để `useMemo` không phải so sánh chính object `searchParams` (mỗi render
  // là một instance mới) — cùng cách InputInvoiceListPage đang làm.
  const searchQueryKey = searchParams.toString()

  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildApiParams(new URLSearchParams(searchQueryKey), currentPage, pageSize)
  }, [isUrlReady, searchQueryKey, currentPage, pageSize])

  const currentFilters = useMemo(
    () => getFilterValues(new URLSearchParams(searchQueryKey)),
    [searchQueryKey]
  )

  const activeFilterCount = useMemo(
    () => countActiveFilters(new URLSearchParams(searchQueryKey)),
    [searchQueryKey]
  )

  const {
    data: listResponse,
    isLoading,
    error,
  } = useEmployeePayoutBatches(apiParams, { enabled: isUrlReady && !!apiParams })

  const { mutateAsync: deleteBatch, isPending: isDeleting } = useDeleteEmployeePayoutBatch()

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/employee-payout-batches/export/',
    'dot-chi-tra-nhan-vien.xlsx'
  )
  const handleExport = useCallback(() => {
    const { page: _page, page_size: _pageSize, ...filters } = apiParams ?? {}
    openExportDialog(filters)
  }, [apiParams, openExportDialog])

  const handleOpenFilterDialog = useCallback(() => {
    setFilterDialogOpenKey((k) => k + 1)
    setIsFilterDialogOpen(true)
  }, [])

  const handleClearFilter = useCallback(() => {
    formRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = formRef.current?.getValues()
    if (!formData) return

    // Dựng lại từ đầu rồi chép sang các param không thuộc bộ lọc: bỏ sót bước xoá thì tiêu chí
    // vừa được gỡ vẫn nằm lại trên URL và tiếp tục lọc.
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))

    const ordering = searchParams.get('ordering')
    if (ordering) newParams.set('ordering', ordering)

    if (formData.period) {
      newParams.set('year', String(formData.period.getFullYear()))
      newParams.set('month', String(formData.period.getMonth() + 1))
    }

    const from = formatDateToApi(formData.batchDateFrom ?? undefined)
    if (from) newParams.set('batch_date_after', from)

    const to = formatDateToApi(formData.batchDateTo ?? undefined)
    if (to) newParams.set('batch_date_before', to)

    if (formData.status) newParams.set('status', formData.status)

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [pageSize, searchParams, setSearchParams])

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const nextPage = pageIndex + 1
      const urlPage = parsePositiveInt(searchParams.get('page')) ?? 1
      const urlPageSizeRaw = parsePositiveInt(searchParams.get('page_size'))
      const effectiveUrlPageSize =
        urlPageSizeRaw && PAGE_SIZES.includes(urlPageSizeRaw) ? urlPageSizeRaw : PAGE_SIZE
      if (nextPage === urlPage && newPageSize === effectiveUrlPageSize) return

      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(nextPage))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleConfirmDelete = useCallback(async () => {
    if (!deletingRecord) return
    try {
      await deleteBatch(deletingRecord.id)
      queryClient.invalidateQueries({
        queryKey: ['accounting', 'employee-payout-batches'],
      })
      toastService.success(`Xóa đợt chi ${deletingRecord.code} thành công`)
      setDeletingRecord(null)
    } catch (err) {
      toastService.error(extractErrorMessage(err))
      throw err
    }
  }, [deletingRecord, deleteBatch, queryClient])

  const totalRecords = listResponse?.count ?? 0
  const pageCount = pageSize ? Math.ceil(totalRecords / pageSize) : 0

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Đợt đi tiền"
        handleFilter={handleOpenFilterDialog}
        filterBadgeCount={activeFilterCount}
        handleConfigTableColumn={() => setShouldShowConfig(true)}
        handleExportBtnFull={handleExport}
        titleExportBtnIcon="Xuất Excel"
        handleCreateNew={() => navigate(APP_PATH.EMPLOYEE_PAYOUT_BATCH_CREATE)}
        titleCreateNew="Tạo đợt chi"
      />

      <div className="flex flex-grow flex-col gap-4 overflow-hidden pt-4 pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto pb-10">
          <EmployeePayoutBatchTable
            data={listResponse?.results ?? []}
            isLoading={isLoading}
            error={error}
            totalRecords={totalRecords}
            pageSize={pageSize}
            pageCount={pageCount}
            currentPageIndex={currentPage - 1}
            onPaginationChange={handlePaginationChange}
            isShowTableColumnConfig={shouldShowConfig}
            onDelete={(record) => setDeletingRecord(record)}
          />
        </div>
      </div>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={
          <EmployeePayoutBatchFilter
            key={String(filterDialogOpenKey)}
            ref={formRef}
            initialValues={currentFilters}
          />
        }
        onClearFilter={handleClearFilter}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
      />

      <AppDialog
        open={!!deletingRecord}
        onOpenChange={(open) => {
          if (!open) setDeletingRecord(null)
        }}
        title="Xác nhận xóa đợt chi"
        variant="alert"
        confirmText="Xóa"
        loading={isDeleting}
        onCancel={() => setDeletingRecord(null)}
        onConfirm={handleConfirmDelete}
        content={
          // `AppAlertDialog` bọc content trong div trần, không padding cũng không căn giữa, nên
          // content phải tự bù `px-6 text-center` cho khớp tiêu đề và cụm nút.
          <p className="text-content-dark-2 px-6 text-center text-sm">
            Bạn có chắc chắn muốn xóa đợt chi{' '}
            <strong className="text-content-dark-1 font-semibold">{deletingRecord?.code}</strong>{' '}
            không? Hành động này không thể hoàn tác.
          </p>
        }
      />
    </div>
  )
}

export default EmployeePayoutBatchListPage

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Flex } from '@radix-ui/themes'
import { PAGE_SIZE, PAGE_SIZES } from '@/constants/table.ts'
import { QUERY_KEYS } from '@/constants'
import { parsePositiveInt } from '@/utils/common.ts'
import { PageTitle } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog.tsx'
import { useAbility } from '@/lib/ability.ts'
import { useDialog } from '@/hooks/useDialog.ts'
import CancelPaymentVoucherDialogContent, {
  type CancelPaymentVoucherDialogContentRef,
} from '@/features/accounting/payment-vouchers/_shares/components/CancelPaymentVoucherDialogContent'
import { APP_PATH } from '@/routes'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'
import {
  type GetPaymentVouchersParams,
  type PaymentVoucher,
  usePaymentVouchers,
  useCancelPaymentVoucher,
  useDeletePaymentVoucher,
  usePaymentVoucherSummary,
} from '@/features/accounting/payment-vouchers/services/payment-voucher-service.ts'
import type { PaymentVoucherFilterValues } from '@/features/accounting/payment-vouchers/types/payment-voucher-types.ts'
import { PayeeType } from '@/features/accounting/payment-vouchers/constants/payment-voucher-constants.ts'
import PaymentVoucherTable from '@/features/accounting/payment-vouchers/view/PaymentVoucherTable'
import { PostPaymentVoucherDialog } from '@/features/accounting/payment-vouchers/_shares/components/PostPaymentVoucherDialog'
import PaymentVoucherFilterForm, {
  type PaymentVoucherFilterFormRef,
} from '@/features/accounting/payment-vouchers/_shares/components/PaymentVoucherFilterForm'

type FilterParams = {
  status?: string | null
  payment_method?: string | null
  payee_type?: string | null
  payee_employee?: string | null
  payee_collaborator?: string | null
  payee_exchange?: string | null
  voucher_date_after?: string | null
  voucher_date_before?: string | null
}

// Map loại đối tác → query param người chi (BE chỉ hỗ trợ 3 loại; SUPPLIER không có param).
const PAYEE_RECIPIENT_PARAM: Partial<
  Record<PayeeType, 'payee_employee' | 'payee_collaborator' | 'payee_exchange'>
> = {
  [PayeeType.EMPLOYEE]: 'payee_employee',
  [PayeeType.COLLABORATOR]: 'payee_collaborator',
  [PayeeType.EXCHANGE]: 'payee_exchange',
}

function buildApiParamsFromUrl(searchParams: URLSearchParams): GetPaymentVouchersParams {
  const params: GetPaymentVouchersParams = {}

  const page = parsePositiveInt(searchParams.get('page'))
  if (page) params.page = page

  const pageSizeFromUrl = parsePositiveInt(searchParams.get('page_size'))
  const safePageSize =
    pageSizeFromUrl && PAGE_SIZES.includes(pageSizeFromUrl) ? pageSizeFromUrl : PAGE_SIZE
  params.page_size = safePageSize

  const status = searchParams.get('status')
  if (status) params.status = status as GetPaymentVouchersParams['status']

  const paymentMethod = searchParams.get('payment_method')
  if (paymentMethod)
    params.payment_method = paymentMethod as GetPaymentVouchersParams['payment_method']

  const payeeType = searchParams.get('payee_type')
  if (payeeType) params.payee_type = payeeType as GetPaymentVouchersParams['payee_type']

  const payeeEmployee = parsePositiveInt(searchParams.get('payee_employee'))
  if (payeeEmployee) params.payee_employee = payeeEmployee

  const payeeCollaborator = parsePositiveInt(searchParams.get('payee_collaborator'))
  if (payeeCollaborator) params.payee_collaborator = payeeCollaborator

  const payeeExchange = parsePositiveInt(searchParams.get('payee_exchange'))
  if (payeeExchange) params.payee_exchange = payeeExchange

  const voucherDateAfter = searchParams.get('voucher_date_after')
  if (voucherDateAfter) params.voucher_date_after = voucherDateAfter

  const voucherDateBefore = searchParams.get('voucher_date_before')
  if (voucherDateBefore) params.voucher_date_before = voucherDateBefore

  return params
}

function parseFilterParamsFromUrl(searchParams: URLSearchParams): FilterParams {
  return {
    status: searchParams.get('status'),
    payment_method: searchParams.get('payment_method'),
    payee_type: searchParams.get('payee_type'),
    payee_employee: searchParams.get('payee_employee'),
    payee_collaborator: searchParams.get('payee_collaborator'),
    payee_exchange: searchParams.get('payee_exchange'),
    voucher_date_after: searchParams.get('voucher_date_after'),
    voucher_date_before: searchParams.get('voucher_date_before'),
  }
}

export default function PaymentVoucherPage() {
  const navigate = useNavigate()
  const ability = useAbility()
  const queryClient = useQueryClient()
  const { displayConfirm, displayCustom, setLoading } = useDialog()
  const [searchParams, setSearchParams] = useSearchParams()
  const filterFormRef = useRef<PaymentVoucherFilterFormRef>(null)
  const cancelDialogRef = useRef<CancelPaymentVoucherDialogContentRef>(null)

  const [isUrlReady, setIsUrlReady] = useState(false)
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false)
  const [postVoucher, setPostVoucher] = useState<PaymentVoucher | null>(null)
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false)
  const [shouldShowConfig, setShouldShowConfig] = useState(false)

  const cancelMutation = useCancelPaymentVoucher()
  const deleteMutation = useDeletePaymentVoucher()

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

  // Reset trigger after a short delay to allow dialog to open
  useEffect(() => {
    if (shouldShowConfig) {
      const timer = setTimeout(() => {
        setShouldShowConfig(false)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [shouldShowConfig])

  const apiParams = useMemo(() => {
    if (!isUrlReady) return undefined
    return buildApiParamsFromUrl(searchParams)
  }, [searchParams, isUrlReady])

  const { data, isLoading, error, isFetching, isRefetching } = usePaymentVouchers(apiParams, {
    enabled: isUrlReady && !!apiParams,
  })

  // Totals for the sticky footer. Separate endpoint, fetched in parallel — the table paints
  // as soon as the page arrives and the footer fills in after. Keyed on filters only, so
  // changing page never refetches it.
  const { data: summaryResponse } = usePaymentVoucherSummary(apiParams, {
    enabled: isUrlReady && !!apiParams,
  })

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

  const filterBadgeCount = useMemo(() => {
    let count = 0
    if (currentFilterParams.status) count++
    if (currentFilterParams.payment_method) count++
    if (currentFilterParams.payee_type) count++
    if (
      currentFilterParams.payee_employee ||
      currentFilterParams.payee_collaborator ||
      currentFilterParams.payee_exchange
    )
      count++
    // Khoảng ngày là MỘT tiêu chí lọc, dù có mặt cả hai đầu mút.
    if (currentFilterParams.voucher_date_after || currentFilterParams.voucher_date_before) count++
    return count
  }, [currentFilterParams])

  const handleCreateNew = useCallback(() => {
    navigate(APP_PATH.PAYMENT_VOUCHER_CREATE)
  }, [navigate])

  const handlePaginationChange = useCallback(
    (pageIndex: number, newPageSize: number) => {
      const newParams = new URLSearchParams(searchParams)
      newParams.set('page', String(pageIndex + 1))
      newParams.set('page_size', String(newPageSize))
      setSearchParams(newParams, { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleClearAll = useCallback(() => {
    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(PAGE_SIZE))
    setSearchParams(newParams, { replace: true })
  }, [setSearchParams])

  const handleClearFilterInDialog = useCallback(() => {
    filterFormRef.current?.clearForm()
  }, [])

  const handleApplyFilter = useCallback(() => {
    const formData = filterFormRef.current?.getValues()
    if (!formData) return

    const newParams = new URLSearchParams()
    newParams.set('page', '1')
    newParams.set('page_size', String(pageSize))

    if (formData.status) newParams.set('status', String(formData.status))
    if (formData.payment_method) newParams.set('payment_method', String(formData.payment_method))
    if (formData.payee_type) {
      newParams.set('payee_type', String(formData.payee_type))
      // Chỉ gửi người chi khớp loại đối tác đang chọn (bỏ giá trị cũ của loại khác).
      const recipientParam = PAYEE_RECIPIENT_PARAM[formData.payee_type]
      if (recipientParam) {
        const recipientValue = formData[recipientParam]
        if (recipientValue) newParams.set(recipientParam, String(recipientValue))
      }
    }
    if (formData.voucher_date_after) {
      newParams.set('voucher_date_after', formatDateToApi(formData.voucher_date_after))
    }
    if (formData.voucher_date_before) {
      newParams.set('voucher_date_before', formatDateToApi(formData.voucher_date_before))
    }

    setSearchParams(newParams, { replace: true })
    setIsFilterDialogOpen(false)
  }, [setSearchParams, pageSize])

  const formInitialValues: Partial<PaymentVoucherFilterValues> = useMemo(
    () => ({
      status: (currentFilterParams.status as PaymentVoucherFilterValues['status']) ?? null,
      payment_method:
        (currentFilterParams.payment_method as PaymentVoucherFilterValues['payment_method']) ??
        null,
      payee_type:
        (currentFilterParams.payee_type as PaymentVoucherFilterValues['payee_type']) ?? null,
      payee_employee: currentFilterParams.payee_employee ?? null,
      payee_collaborator: currentFilterParams.payee_collaborator ?? null,
      payee_exchange: currentFilterParams.payee_exchange ?? null,
      voucher_date_after: parseDateFromApi(currentFilterParams.voucher_date_after) ?? null,
      voucher_date_before: parseDateFromApi(currentFilterParams.voucher_date_before) ?? null,
    }),
    [currentFilterParams]
  )

  const handlePost = useCallback((voucher: PaymentVoucher) => {
    setPostVoucher(voucher)
    setIsPostDialogOpen(true)
  }, [])

  const handleDelete = useCallback(
    (id: number) => {
      displayConfirm({
        title: 'Xóa phiếu chi nháp',
        content: 'Bạn có chắc muốn xóa phiếu chi nháp này? Hành động này không thể hoàn tác.',
        onConfirm: async () => {
          await deleteMutation.mutateAsync(id)
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.ACCOUNTING.PAYMENT_VOUCHERS.LIST({}),
          })
        },
      })
    },
    [displayConfirm, deleteMutation, queryClient]
  )

  const handleCancel = useCallback(
    (id: number) => {
      cancelDialogRef.current = null

      displayCustom({
        title: 'Hủy phiếu chi',
        content: (
          <CancelPaymentVoucherDialogContent
            ref={(ref) => {
              cancelDialogRef.current = ref
            }}
          />
        ),
        confirmText: 'Hủy phiếu',
        cancelText: 'Đóng',
        confirmButtonClassName:
          'bg-action-primary-red-default hover:bg-action-primary-red-hover text-white',
        size: 'lg',
        disableBackdropClose: true,
        onConfirm: async () => {
          const data = cancelDialogRef.current?.getData()
          if (!data) {
            const error = new Error('Validation failed')
            ;(error as any).isValidationError = true
            throw error
          }

          setLoading(true)
          try {
            await cancelMutation.mutateAsync({
              id,
              data: { reason: data.cancel_reason },
            })
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.ACCOUNTING.PAYMENT_VOUCHERS.LIST({}),
            })
          } finally {
            setLoading(false)
          }
        },
      })
    },
    [displayCustom, setLoading, cancelMutation, queryClient]
  )

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/payment-vouchers/export/',
    'phieu-chi.xlsx'
  )
  const handleExportBtnFull = useCallback(() => {
    if (!apiParams) return
    const { page: _page, page_size: _pageSize, ...filters } = apiParams as Record<string, unknown>
    openExportDialog(filters)
  }, [apiParams, openExportDialog])

  const isTableLoading = isLoading || isFetching || isRefetching
  const hasFilter = filterBadgeCount > 0

  return (
    <>
      <PageTitle
        title="Phiếu chi"
        handleFilter={() => setIsFilterDialogOpen(true)}
        filterBadgeCount={filterBadgeCount}
        handleConfigTableColumn={() => setShouldShowConfig(true)}
        handleExportBtnFull={handleExportBtnFull}
        titleExportBtnIcon="Xuất Excel"
        handleCreateNew={ability.can('create', 'paymentvoucher') ? handleCreateNew : undefined}
        titleCreateNew="Tạo phiếu chi"
      />
      <Flex flexGrow={'1'} direction="column" gap="0" className="pb-6">
        <div className="flex-1 overflow-x-auto overflow-y-auto border-solid pt-0 pb-10">
          <PaymentVoucherTable
            data={tableData}
            isLoading={isTableLoading}
            error={error as Error | null}
            pageCount={pageCount}
            pageSize={pageSize}
            currentPage={currentPage}
            totalRecords={totalRecords}
            onPaginationChange={handlePaginationChange}
            onPost={(record) => handlePost(record)}
            onCancel={(record) => handleCancel(record.id)}
            onDelete={(record) => handleDelete(record.id)}
            onClearFilter={handleClearAll}
            hasFilter={hasFilter}
            isShowTableColumnConfig={shouldShowConfig}
            summary={summaryResponse}
            summaryRowCount={summaryResponse?.row_count}
          />
        </div>
      </Flex>

      <AppDialog
        variant="filter"
        open={isFilterDialogOpen}
        onOpenChange={setIsFilterDialogOpen}
        content={<PaymentVoucherFilterForm ref={filterFormRef} initialValues={formInitialValues} />}
        onClearFilter={handleClearFilterInDialog}
        onConfirm={handleApplyFilter}
        onCancel={() => setIsFilterDialogOpen(false)}
      />

      <PostPaymentVoucherDialog
        voucher={postVoucher}
        open={isPostDialogOpen}
        onOpenChange={setIsPostDialogOpen}
      />
    </>
  )
}

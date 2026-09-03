import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'

import { Tabs } from '@radix-ui/themes'
import { Button, PageTitle, TextArea } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { useDialog } from '@/hooks/useDialog'
import { QUERY_KEYS } from '@/constants'
import { z } from 'zod'
import { useForm, FormProvider, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import AppDialog from '@/components/dialog/AppDialog'
import toastService from '@/services/toast-service'
import { handleApiError, isNotFoundError } from '@/utils/error-utils'

import { FileText } from 'lucide-react'
import {
  usePaymentVoucher,
  useCancelPaymentVoucher,
  useDeletePaymentVoucher,
  usePaymentVoucherHistories,
} from '@/features/accounting/payment-vouchers/services/payment-voucher-service'
import {
  PAYMENT_VOUCHER_CONSTANT_KEYS,
  PAYMENT_VOUCHER_CONSTANT_MODULE,
  PaymentVoucherStatus,
} from '@/features/accounting/payment-vouchers/constants/payment-voucher-constants'
import { PostPaymentVoucherDialog } from '@/features/accounting/payment-vouchers/_shares/components/PostPaymentVoucherDialog'
import {
  getSalesInvoiceService,
  type SalesInvoice,
} from '@/features/accounting/sales-invoices/services/sales-invoice-service'
import {
  getInputInvoiceService,
  type InputInvoice,
} from '@/features/accounting/input-invoices/services/input-invoice-service'

import { PaymentVoucherGeneralTab } from './components/PaymentVoucherGeneralTab'
import {
  PaymentVoucherAllocationTab,
  countAllocationRows,
} from './components/PaymentVoucherAllocationTab'
import { PaymentVoucherOffsetTab } from './components/PaymentVoucherOffsetTab'
import { PaymentVoucherHistoryTab } from './components/PaymentVoucherHistoryTab'

const PaymentVoucherDetailPage = () => {
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAbility()
  const queryClient = useQueryClient()

  const { keysMap } = useAppConstant({
    module: PAYMENT_VOUCHER_CONSTANT_MODULE,
    keys: [
      PAYMENT_VOUCHER_CONSTANT_KEYS.PAYEE_TYPE,
      PAYMENT_VOUCHER_CONSTANT_KEYS.PAYMENT_METHOD,
      PAYMENT_VOUCHER_CONSTANT_KEYS.LINE_KIND,
    ],
  })

  const payeeTypeChoices = keysMap.get(PAYMENT_VOUCHER_CONSTANT_KEYS.PAYEE_TYPE) as Record<
    string,
    string
  > | null

  const paymentMethodChoices = keysMap.get(PAYMENT_VOUCHER_CONSTANT_KEYS.PAYMENT_METHOD) as Record<
    string,
    string
  > | null

  const lineKindChoices = keysMap.get(PAYMENT_VOUCHER_CONSTANT_KEYS.LINE_KIND) as Record<
    string,
    string
  > | null

  const activeTab = searchParams.get('tab') || 'general'
  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val })
  }

  const { data: record, isLoading, error } = usePaymentVoucher(id, { enabled: !!id })
  const { mutateAsync: cancelVoucher, isPending: isCancelling } = useCancelPaymentVoucher()
  const { data: historiesData, isLoading: isLoadingHistories } = usePaymentVoucherHistories(
    id,
    {},
    { enabled: !!id }
  )

  const [inputInvoicesMap, setInputInvoicesMap] = useState<Record<number, InputInvoice>>({})
  const [salesInvoicesMap, setSalesInvoicesMap] = useState<Record<number, SalesInvoice>>({})

  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false)
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false)

  const cancelFormSchema = z.object({
    reason: z.string().trim().min(1, 'Vui lòng nhập lý do hủy phiếu.'),
  })

  const cancelForm = useForm<z.infer<typeof cancelFormSchema>>({
    resolver: zodResolver(cancelFormSchema),
    mode: 'onTouched',
    defaultValues: { reason: '' },
  })

  const handleOpenCancelDialog = useCallback(() => {
    cancelForm.reset({ reason: '' })
    setIsCancelDialogOpen(true)
  }, [cancelForm])

  useEffect(() => {
    if (!record) return

    const fetchDetails = async () => {
      try {
        const inputIds = record.invoices?.map((inv) => inv.input_invoice).filter(Boolean) || []
        const salesIds =
          record.offset_invoices?.map((inv) => inv.sales_invoice).filter(Boolean) || []

        const inputService = getInputInvoiceService()
        const salesService = getSalesInvoiceService()

        const inputPromises = inputIds.map(async (inputId: number) => {
          try {
            const inv = await inputService.getInputInvoice(inputId)
            return { id: inputId, data: inv }
          } catch (e) {
            console.error('Error fetching input invoice', inputId, e)
            return null
          }
        })

        const salesPromises = salesIds.map(async (salesId: number) => {
          try {
            const inv = await salesService.getSalesInvoice(salesId)
            return { id: salesId, data: inv }
          } catch (e) {
            console.error('Error fetching sales invoice', salesId, e)
            return null
          }
        })

        const [inputResults, salesResults] = await Promise.all([
          Promise.all(inputPromises),
          Promise.all(salesPromises),
        ])

        const nextInputMap: Record<number, InputInvoice> = {}
        inputResults.forEach((res) => {
          if (res) nextInputMap[res.id] = res.data
        })

        const nextSalesMap: Record<number, SalesInvoice> = {}
        salesResults.forEach((res) => {
          if (res) nextSalesMap[res.id] = res.data
        })

        setInputInvoicesMap(nextInputMap)
        setSalesInvoicesMap(nextSalesMap)
      } catch (err) {
        console.error('Error resolving invoices details', err)
      }
    }

    fetchDetails()
  }, [record])

  const handleEdit = useCallback(() => {
    navigate(APP_PATH.PAYMENT_VOUCHER_EDIT.replace(':id', String(id)))
  }, [navigate, id])

  const handleOpenPostDialog = useCallback(() => {
    setIsPostDialogOpen(true)
  }, [])

  const invalidateVoucher = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTING.PAYMENT_VOUCHERS.DETAIL(id) })
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTING.PAYMENT_VOUCHERS.LIST({}) })
  }, [queryClient, id])

  const onConfirmCancel = async () => {
    const isValid = await cancelForm.trigger()
    if (!isValid) {
      throw { isValidationError: true }
    }
    const values = cancelForm.getValues()
    try {
      await cancelVoucher({
        id,
        data: { reason: values.reason },
      })
      invalidateVoucher()
      toastService.success('Huỷ phiếu chi thành công')
      setIsCancelDialogOpen(false)
    } catch (err) {
      handleApiError(err, cancelForm.setError as any, {
        reason: 'reason',
      })
      throw { isApiError: true }
    }
  }

  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !record
  }, [isLoading, error, record])

  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  // Xóa nháp lived only in the list's row menu, so anyone who opened a draft to check it
  // had to navigate back out to throw it away.
  const deleteMutation = useDeletePaymentVoucher()
  const { displayConfirm } = useDialog()
  const handleDeleteDraft = useCallback(() => {
    displayConfirm({
      title: 'Xóa phiếu chi nháp',
      content: 'Bạn có chắc muốn xóa phiếu chi nháp này? Hành động này không thể hoàn tác.',
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(id)
          queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.ACCOUNTING.PAYMENT_VOUCHERS.LIST({}),
          })
          toastService.success('Đã xóa phiếu chi nháp')
          navigate(APP_PATH.PAYMENT_VOUCHER_MANAGEMENT)
        } catch (error) {
          handleApiError(error)
        }
      },
    })
  }, [displayConfirm, deleteMutation, id, queryClient, navigate])

  const isDraft = record?.status === PaymentVoucherStatus.DRAFT
  const isPosted = record?.status === PaymentVoucherStatus.POSTED

  return (
    <>
      <PageTitle
        idLabel={record?.code ?? '-'}
        title={`Phiếu chi ${record?.code ?? ''}`}
        enableBackButton
        handleEdit={ability.can('update', 'paymentvoucher') && isDraft ? handleEdit : undefined}
        customActions={
          isDraft ? (
            <div className="flex gap-2">
              {ability.can('destroy', 'paymentvoucher') && (
                <Button
                  variant="secondary-border"
                  onClick={handleDeleteDraft}
                  disabled={deleteMutation.isPending}
                  loading={deleteMutation.isPending}
                >
                  Xóa nháp
                </Button>
              )}
              {ability.can('post_voucher', 'paymentvoucher') && (
                <Button variant="primary" onClick={handleOpenPostDialog}>
                  Ghi sổ
                </Button>
              )}
            </div>
          ) : isPosted ? (
            <div className="flex gap-2">
              {ability.can('cancel', 'paymentvoucher') && (
                <Button
                  variant="secondary-border"
                  onClick={handleOpenCancelDialog}
                  disabled={isCancelling}
                  loading={isCancelling}
                >
                  Huỷ phiếu
                </Button>
              )}
            </div>
          ) : undefined
        }
      />

      <DetailPageWrapper
        isLoading={isLoading}
        isError={isError}
        isNotFound={isNotFound}
        hasPermission={ability.can('retrieve', 'paymentvoucher')}
      >
        {record && (
          <div className="px-7 py-6">
            <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
              <Tabs.List size="2" className="border-border-1 mb-5 flex gap-2 border-b pb-px">
                <Tabs.Trigger
                  value="general"
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
                >
                  <FileText className="h-4 w-4" />
                  Thông tin phiếu
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="allocation"
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
                >
                  Phân bổ thanh toán (Dự chi)
                  <span className="bg-neutral-30 text-content-dark-3 ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold">
                    {countAllocationRows(record)}
                  </span>
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="offset"
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
                >
                  Cấn trừ công nợ
                  <span className="bg-neutral-30 text-content-dark-3 ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold">
                    {record.offset_invoices?.length || 0}
                  </span>
                </Tabs.Trigger>
                <Tabs.Trigger
                  value="status_history"
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium"
                >
                  Cập nhật trạng thái
                  <span className="bg-neutral-30 text-content-dark-3 ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold">
                    {historiesData?.results?.length ?? 0}
                  </span>
                </Tabs.Trigger>
              </Tabs.List>

              <div className="w-full">
                {/* ── Tab 1: General Info ── */}
                <Tabs.Content value="general" className="outline-none">
                  <PaymentVoucherGeneralTab
                    record={record}
                    inputInvoicesMap={inputInvoicesMap}
                    paymentMethodChoices={paymentMethodChoices}
                    payeeTypeChoices={payeeTypeChoices}
                  />
                </Tabs.Content>

                {/* ── Tab 2: Allocation (Phân bổ thanh toán - Full Width) ── */}
                <Tabs.Content value="allocation" className="outline-none">
                  <PaymentVoucherAllocationTab
                    record={record}
                    inputInvoicesMap={inputInvoicesMap}
                    lineKindChoices={lineKindChoices}
                  />
                </Tabs.Content>

                {/* ── Tab 3: Offset Invoices (Cấn trừ - Full Width) ── */}
                <Tabs.Content value="offset" className="outline-none">
                  <PaymentVoucherOffsetTab record={record} salesInvoicesMap={salesInvoicesMap} />
                </Tabs.Content>

                {/* ── Tab 4: Status History (Cập nhật trạng thái - Full Width) ── */}
                <Tabs.Content value="status_history" className="outline-none">
                  <PaymentVoucherHistoryTab
                    historiesData={historiesData}
                    isLoadingHistories={isLoadingHistories}
                  />
                </Tabs.Content>
              </div>
            </Tabs.Root>
          </div>
        )}
      </DetailPageWrapper>

      <PostPaymentVoucherDialog
        voucher={record ?? null}
        open={isPostDialogOpen}
        onOpenChange={setIsPostDialogOpen}
      />

      <AppDialog
        variant="custom"
        isHideCancelButton={false}
        onCancel={() => setIsCancelDialogOpen(false)}
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        title="Hủy phiếu chi"
        content={
          <div className="flex min-w-[450px] flex-col gap-4 py-4">
            <FormProvider {...cancelForm}>
              <Controller
                control={cancelForm.control}
                name="reason"
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <TextArea
                    onChange={onChange}
                    value={value ?? ''}
                    error={error?.message}
                    required={true}
                    label="Lý do hủy phiếu"
                    placeholder="Nhập lý do hủy phiếu..."
                    rows={4}
                  />
                )}
              />
            </FormProvider>
          </div>
        }
        onConfirm={onConfirmCancel}
        confirmText="Xác nhận hủy"
      />
    </>
  )
}

export default PaymentVoucherDetailPage

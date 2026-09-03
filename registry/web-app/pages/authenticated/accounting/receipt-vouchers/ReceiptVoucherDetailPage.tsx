import { useCallback, useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  useDealPeriodAllocations,
  usePartialUpdateDealPeriodAllocation,
} from '@/features/accounting/deal-period-allocations/services/deal-period-allocation-service'

import { Tabs } from '@radix-ui/themes'
import { Button, PageTitle, TextArea } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { QUERY_KEYS } from '@/constants'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { z } from 'zod'
import { useForm, FormProvider, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import AppDialog from '@/components/dialog/AppDialog'
import toastService from '@/services/toast-service'
import { extractErrorMessage, handleApiError } from '@/utils/error-utils'

import { FileText } from 'lucide-react'
import {
  useReceiptVoucher,
  useCancelReceiptVoucher,
  useReceiptVoucherHistories,
  usePartialUpdateReceiptVoucher,
  useUpdateReceiptVoucherInvoiceLines,
  ReceiptVoucherStatus,
} from '@/features/accounting/receipt-vouchers/services/receipt-voucher-service'
import { PostReceiptVoucherDialog } from '@/features/accounting/receipt-vouchers/_shares/components/PostReceiptVoucherDialog'
import {
  getSalesInvoiceService,
  type SalesInvoice,
} from '@/features/accounting/sales-invoices/services/sales-invoice-service'
import {
  getInputInvoiceService,
  type InputInvoice,
} from '@/features/accounting/input-invoices/services/input-invoice-service'

import { ReceiptVoucherGeneralTab } from './components/ReceiptVoucherGeneralTab'
import { ReceiptVoucherAllocationTab } from './components/ReceiptVoucherAllocationTab'
import { ReceiptVoucherOffsetTab } from './components/ReceiptVoucherOffsetTab'
import { ReceiptVoucherHistoryTab } from './components/ReceiptVoucherHistoryTab'

const ReceiptVoucherDetailPage = () => {
  const { id: idStr } = useParams<{ id: string }>()
  const id = Number(idStr)
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAbility()
  const queryClient = useQueryClient()

  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [
      APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE_CHOICES,
      APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYMENT_METHOD_CHOICES,
      APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_STATUS_CHOICES,
    ],
  })

  const payerTypeChoices = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE_CHOICES
  ) as Record<string, string> | null

  const paymentMethodChoices = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYMENT_METHOD_CHOICES
  ) as Record<string, string> | null

  const activeTab = searchParams.get('tab') || 'general'
  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val })
  }

  const { data: record, isLoading, error } = useReceiptVoucher(id, { enabled: !!id })
  const { mutateAsync: cancelVoucher, isPending: isCancelling } = useCancelReceiptVoucher()
  const { data: historiesData, isLoading: isLoadingHistories } = useReceiptVoucherHistories(
    id,
    {},
    { enabled: !!id }
  )

  const [salesInvoicesMap, setSalesInvoicesMap] = useState<Record<number, SalesInvoice>>({})
  const [inputInvoicesMap, setInputInvoicesMap] = useState<Record<number, InputInvoice>>({})

  const { mutateAsync: partialUpdateVoucher } = usePartialUpdateReceiptVoucher()
  const { mutateAsync: updateReceiptVoucherInvoiceLines } = useUpdateReceiptVoucherInvoiceLines()
  const { mutateAsync: partialUpdateDealPeriodAllocation } = usePartialUpdateDealPeriodAllocation()
  const [editedAllocations, setEditedAllocations] = useState<Record<string, number | string>>({})
  const [lockedUnits, setLockedUnits] = useState<Record<string, boolean>>({})
  const [deletedUnits] = useState<Record<string, boolean>>({})

  const { data: dealAllocationsData } = useDealPeriodAllocations(
    { receipt_voucher: id },
    { enabled: !!id }
  )
  const dealAllocations = dealAllocationsData?.results || []

  const allocationsByVoucherLine = useMemo(() => {
    const map: Record<number, any> = {}
    dealAllocations.forEach((allocation: any) => {
      if (allocation.receipt_voucher_line) {
        map[allocation.receipt_voucher_line] = allocation
      }
    })
    return map
  }, [dealAllocations])

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
    if (!record?.invoices || Object.keys(salesInvoicesMap).length === 0) return

    const initialAllocations: Record<string, number | string> = {}
    const initialLocks: Record<string, boolean> = {}

    record.invoices.forEach((inv: any) => {
      const detail = salesInvoicesMap[inv.sales_invoice]
      if (!detail) return

      const lines = detail.lines || []
      lines.forEach((line: any, lineIdx: number) => {
        const rowKey = `${inv.sales_invoice}-${lineIdx}`
        const existingLine =
          inv.lines?.find((x: any) => x.sales_invoice_line === line.id) ||
          (lines.length === 1 && line.id === 0 ? inv.lines?.[0] : null)

        let allocatedAmt = 0
        if (existingLine) {
          allocatedAmt = Number(existingLine.allocated_amount) || 0
        } else {
          if (lines.length <= 1) {
            allocatedAmt = Number(inv.allocated_amount) || 0
          } else {
            allocatedAmt = 0
          }
        }
        initialAllocations[rowKey] = allocatedAmt
        initialLocks[rowKey] = false
      })
    })

    setEditedAllocations((prev) => ({ ...initialAllocations, ...prev }))
    setLockedUnits((prev) => ({ ...initialLocks, ...prev }))
  }, [record?.invoices, salesInvoicesMap, allocationsByVoucherLine])

  const handleSaveAllocation = async (rowKey?: string) => {
    if (!record) return
    try {
      // Calculate totalAllocated first
      let totalAllocated = 0
      record.invoices?.forEach((inv: any) => {
        const detail = salesInvoicesMap[inv.sales_invoice]
        if (detail && detail.lines && detail.lines.length > 0) {
          detail.lines.forEach((_: any, idx: number) => {
            const rKey = `${inv.sales_invoice}-${idx}`
            if (!deletedUnits[rKey]) {
              totalAllocated += Number(editedAllocations[rKey] ?? 0)
            }
          })
        } else {
          const rKey = `${inv.sales_invoice}-0`
          if (!deletedUnits[rKey]) {
            totalAllocated += Number(editedAllocations[rKey] ?? 0)
          }
        }
      })

      const updatedInvoices = (record.invoices || [])
        .map((inv: any) => {
          let totalAllocForInvoice = 0
          const detail = salesInvoicesMap[inv.sales_invoice]

          if (detail && detail.lines && detail.lines.length > 0) {
            detail.lines.forEach((_: any, idx: number) => {
              const rKey = `${inv.sales_invoice}-${idx}`
              if (!deletedUnits[rKey]) {
                totalAllocForInvoice += Number(editedAllocations[rKey] ?? 0)
              }
            })
          } else {
            const rKey = `${inv.sales_invoice}-0`
            if (!deletedUnits[rKey]) {
              totalAllocForInvoice = Number(editedAllocations[rKey] ?? 0)
            }
          }

          return {
            sales_invoice: inv.sales_invoice,
            allocated_amount: String(totalAllocForInvoice),
          }
        })
        // `!== 0`, KHÔNG phải `> 0`: một hoá đơn chỉ mang dòng "Chênh lệch làm tròn" âm (BE PR #3239)
        // cộng ra số ÂM, và `> 0` sẽ lặng lẽ loại nó khỏi payload ⇒ mất hẳn khoản chênh lệch.
        .filter((inv: any) => Number(inv.allocated_amount) !== 0)

      const updatedVoucher = await partialUpdateVoucher({
        id,
        data: {
          invoices: updatedInvoices,
        },
      })

      const invoicesToUpdate = updatedVoucher?.invoices || record.invoices || []

      const updateLinesPromises = invoicesToUpdate.map(async (inv: any) => {
        const detail = salesInvoicesMap[inv.sales_invoice]
        if (!detail || !detail.lines || detail.lines.length === 0) return

        const linesPayload = detail.lines.map((line: any, idx: number) => {
          const rKey = `${inv.sales_invoice}-${idx}`
          const allocatedAmt = deletedUnits[rKey] ? 0 : Number(editedAllocations[rKey] ?? 0)
          return {
            sales_invoice_line: line.id,
            allocated_amount: String(allocatedAmt),
          }
        })

        await updateReceiptVoucherInvoiceLines({
          id,
          rvInvId: inv.id,
          data: {
            lines: linesPayload,
          },
        })
      })

      await Promise.all(updateLinesPromises)

      // Update distribution percentages for each line
      const updatePctsPromises = invoicesToUpdate.flatMap((inv: any) => {
        const detail = salesInvoicesMap[inv.sales_invoice]
        if (!detail || !detail.lines || detail.lines.length === 0) return []

        return detail.lines.map(async (line: any, idx: number) => {
          const rowKey = `${inv.sales_invoice}-${idx}`
          const vl = inv.lines?.find((x: any) => x.sales_invoice_line === line.id)
          const allocation = vl ? allocationsByVoucherLine[vl.id] : null
          if (allocation?.id) {
            const currentAllocatedVal = deletedUnits[rowKey]
              ? 0
              : Number(editedAllocations[rowKey] ?? 0)
            const pct = totalAllocated > 0 ? (currentAllocatedVal / totalAllocated) * 100 : 0
            await partialUpdateDealPeriodAllocation({
              id: allocation.id,
              data: {
                distribution_pct: pct.toFixed(4),
              },
            })
          }
        })
      })

      await Promise.all(updatePctsPromises)

      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.RECEIPT_VOUCHERS.DETAIL(id),
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.DEAL_PERIOD_ALLOCATIONS.LIST({ receipt_voucher: id }),
      })

      if (rowKey) {
        toastService.success(`Lưu phân bổ thành công`)
      } else {
        toastService.success('Đồng bộ số tiền phân bổ thành công')
      }
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  useEffect(() => {
    if (!record) return

    const fetchDetails = async () => {
      try {
        const salesIds = record.invoices?.map((inv: any) => inv.sales_invoice).filter(Boolean) || []
        const inputIds =
          record.offset_invoices?.map((inv: any) => inv.input_invoice).filter(Boolean) || []

        const salesService = getSalesInvoiceService()
        const inputService = getInputInvoiceService()

        const salesPromises = salesIds.map(async (salesId: number) => {
          try {
            const inv = await salesService.getSalesInvoice(salesId)
            return { id: salesId, data: inv }
          } catch (e) {
            console.error('Error fetching sales invoice', salesId, e)
            return null
          }
        })

        const inputPromises = inputIds.map(async (inputId: number) => {
          try {
            const inv = await inputService.getInputInvoice(inputId)
            return { id: inputId, data: inv }
          } catch (e) {
            console.error('Error fetching input invoice', inputId, e)
            return null
          }
        })

        const [salesResults, inputResults] = await Promise.all([
          Promise.all(salesPromises),
          Promise.all(inputPromises),
        ])

        const nextSalesMap: Record<number, SalesInvoice> = {}
        salesResults.forEach((res) => {
          if (res) nextSalesMap[res.id] = res.data
        })

        const nextInputMap: Record<number, InputInvoice> = {}
        inputResults.forEach((res) => {
          if (res) nextInputMap[res.id] = res.data
        })

        setSalesInvoicesMap(nextSalesMap)
        setInputInvoicesMap(nextInputMap)
      } catch (err) {
        console.error('Error resolving invoices details', err)
      }
    }

    fetchDetails()
  }, [record])

  const handleEdit = useCallback(() => {
    navigate(APP_PATH.RECEIPT_VOUCHER_EDIT.replace(':id', String(id)))
  }, [navigate, id])

  const handleOpenPostDialog = useCallback(() => {
    setIsPostDialogOpen(true)
  }, [])

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
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.ACCOUNTING.RECEIPT_VOUCHERS.DETAIL(id) })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.DEAL_PERIOD_ALLOCATIONS.LIST({ receipt_voucher: id }),
      })
      toastService.success('Huỷ phiếu thu thành công')
      setIsCancelDialogOpen(false)
    } catch (err) {
      handleApiError(err, cancelForm.setError as any, {
        reason: 'reason',
      })
      throw { isApiError: true }
    }
  }

  const isDraft = record?.status === ReceiptVoucherStatus.DRAFT
  const isPosted = record?.status === ReceiptVoucherStatus.POSTED

  return (
    <>
      <PageTitle
        idLabel={record?.code ?? '-'}
        title={`Phiếu thu ${record?.code ?? ''}`}
        enableBackButton
        handleEdit={ability.can('update', 'receiptvoucher') && isDraft ? handleEdit : undefined}
        customActions={
          isDraft ? (
            <div className="flex gap-2">
              {ability.can('update', 'receiptvoucher') && (
                <Button variant="primary" onClick={handleOpenPostDialog}>
                  Ghi sổ
                </Button>
              )}
            </div>
          ) : isPosted ? (
            <div className="flex gap-2">
              {ability.can('update', 'receiptvoucher') && (
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
        isError={!!error}
        isNotFound={!isLoading && !error && !record}
        hasPermission={ability.can('retrieve', 'receiptvoucher')}
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
                  Phân bổ theo căn (Dự chi)
                  <span className="bg-neutral-30 text-content-dark-3 ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-semibold">
                    {record.invoices?.length || 0}
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
                {/* ── Tab 1: General Info (Only this tab uses the 2-column grid layout to prevent squishing other tabs) ── */}
                <Tabs.Content value="general" className="outline-none">
                  <ReceiptVoucherGeneralTab
                    record={record}
                    salesInvoicesMap={salesInvoicesMap}
                    paymentMethodChoices={paymentMethodChoices}
                    payerTypeChoices={payerTypeChoices}
                  />
                </Tabs.Content>

                {/* ── Tab 2: Allocated Invoices (Phân bổ căn - Full Width) ── */}
                <Tabs.Content value="allocation" className="outline-none">
                  <ReceiptVoucherAllocationTab
                    record={record}
                    salesInvoicesMap={salesInvoicesMap}
                    editedAllocations={editedAllocations}
                    setEditedAllocations={setEditedAllocations}
                    lockedUnits={lockedUnits}
                    deletedUnits={deletedUnits}
                    handleSaveAllocation={handleSaveAllocation}
                    allocationsByVoucherLine={allocationsByVoucherLine}
                  />
                </Tabs.Content>

                {/* ── Tab 3: Offset Invoices (Cấn trừ - Full Width) ── */}
                <Tabs.Content value="offset" className="outline-none">
                  <ReceiptVoucherOffsetTab record={record} inputInvoicesMap={inputInvoicesMap} />
                </Tabs.Content>

                {/* ── Tab 4: Status History (Cập nhật trạng thái - Full Width) ── */}
                <Tabs.Content value="status_history" className="outline-none">
                  <ReceiptVoucherHistoryTab
                    historiesData={historiesData}
                    isLoadingHistories={isLoadingHistories}
                  />
                </Tabs.Content>
              </div>
            </Tabs.Root>
          </div>
        )}
      </DetailPageWrapper>

      <PostReceiptVoucherDialog
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
        title="Hủy phiếu thu"
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

export default ReceiptVoucherDetailPage

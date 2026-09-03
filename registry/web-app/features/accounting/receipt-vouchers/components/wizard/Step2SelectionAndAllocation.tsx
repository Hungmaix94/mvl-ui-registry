import { useMemo } from 'react'
import {
  Control,
  Controller,
  UseFormRegister,
  UseFormGetValues,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form'
import { StepCard } from './StepCard'
import { FileUpload } from '@/components/ui/file-upload/FileUpload'
import { IconWarningcircle } from '@/assets/icons'
import type { SalesInvoice } from '@/features/accounting/sales-invoices/services/sales-invoice-service'
import type { ReceiptVoucherFormValues } from '../../schemas/receipt-voucher-schema'
import { useReceiptVoucherAllocation } from '../../hooks/useReceiptVoucherAllocation'
import { AllocationBanner } from './AllocationBanner'
import { SalesInvoicesTable } from './SalesInvoicesTable'
import { OffsetSection } from './OffsetSection'

type Props = {
  watch: UseFormWatch<ReceiptVoucherFormValues>
  setValue: UseFormSetValue<ReceiptVoucherFormValues>
  getValues: UseFormGetValues<ReceiptVoucherFormValues>
  control: Control<ReceiptVoucherFormValues>
  register: UseFormRegister<ReceiptVoucherFormValues>
  selectedInvoices: SalesInvoice[]
  setSelectedInvoices: (invoices: SalesInvoice[]) => void
  isLoadingSuggest: boolean
  onSuggestAllocation: (totalAmount: number) => void
  status?: string
  accountingPeriodLabel?: string | null
}

export function Step2SelectionAndAllocation({
  watch,
  setValue,
  getValues,
  control,
  register,
  selectedInvoices,
  setSelectedInvoices,
  isLoadingSuggest,
  onSuggestAllocation,
  accountingPeriodLabel,
}: Props) {
  const {
    errors,
    isLoading,
    allInvoices,
    selectedIds,
    remaining,
    totalAmount,
    totalAllocated,
    isFullyAllocated,
    allSelected,
    someSelected,
    bankAmt,
    cashAmt,
    offsetAmt,
    payerLabel,
    isLoadingInputInvoices,
    allInputInvoices,
    offsetPayables,
    offsetInvoices,
    totalPayablesSelected,
    horizontalOffset,
    getInvoiceValue,
    setInvoiceValue,
    toggleInvoice,
    toggleAll,
    setAllTo100,
  } = useReceiptVoucherAllocation({
    watch,
    setValue,
    getValues,
    control,
    selectedInvoices,
    setSelectedInvoices,
    isLoadingSuggest,
    onSuggestAllocation,
  })

  // Phần đã tạm ứng do đối chiếu khai, đóng dấu lên dòng hoá đơn — chỉ để hiển thị.
  const advanceOffsetByInvoice = useMemo(
    () =>
      Object.fromEntries(
        selectedInvoices.map((inv) => [
          inv.id,
          Number((inv as { prepaid_advance_amount?: string | number }).prepaid_advance_amount || 0),
        ])
      ),
    [selectedInvoices]
  )

  return (
    <div className="flex flex-col gap-6">
      <StepCard
        stepNum={3}
        title="Chọn & phân bổ hóa đơn"
        hint={
          <>
            Tích vào hóa đơn đã xuất của <b className="font-semibold text-gray-800">{payerLabel}</b>{' '}
            và phân bổ số tiền
          </>
        }
        noPadding
      >
        {/* Search & Allocation Banner container */}
        <div className="border-border-1 border-b bg-gray-50/10 p-4">
          <AllocationBanner
            isFullyAllocated={isFullyAllocated}
            remaining={remaining}
            totalAmount={totalAmount + offsetAmt}
            totalAllocated={totalAllocated}
            showActions={selectedInvoices.length > 0}
            isLoadingSuggest={isLoadingSuggest}
            onSuggest={() => {
              const totalAmt = watch('offset_on')
                ? bankAmt + cashAmt + totalPayablesSelected
                : bankAmt + cashAmt
              onSuggestAllocation(totalAmt)
            }}
            onSetAllTo100={setAllTo100}
          />
        </div>

        {errors.invoices?.message && (
          <div
            data-field-name="invoices"
            className="border-red-30 flex items-center gap-3.5 border-b p-4"
          >
            <div className="text-data-red-default flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
              <IconWarningcircle className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-800">Lỗi phân bổ số tiền</div>
              <div className="text-[13px] leading-snug text-gray-600">
                {errors.invoices.message}
              </div>
            </div>
          </div>
        )}

        <SalesInvoicesTable
          allInvoices={allInvoices}
          selectedIds={selectedIds}
          isLoading={isLoading}
          toggleInvoice={toggleInvoice}
          allSelected={allSelected}
          someSelected={someSelected}
          toggleAll={toggleAll}
          getInvoiceValue={getInvoiceValue}
          setInvoiceValue={setInvoiceValue}
          advanceOffsetByInvoice={advanceOffsetByInvoice}
        />
      </StepCard>

      {/* Cấn trừ hóa đơn */}
      <StepCard stepNum={4} title="Cấn trừ hóa đơn" hint="Đối tác có HĐ đầu vào có thể bù trừ">
        <OffsetSection
          control={control}
          setValue={setValue}
          getValues={getValues}
          watch={watch}
          errors={errors}
          selectedInvoices={selectedInvoices}
          totalAllocated={totalAllocated}
          getInvoiceValue={getInvoiceValue}
          isLoadingInputInvoices={isLoadingInputInvoices}
          allInputInvoices={allInputInvoices}
          offsetPayables={offsetPayables}
          offsetInvoices={offsetInvoices}
          totalPayablesSelected={totalPayablesSelected}
          horizontalOffset={horizontalOffset}
        />
      </StepCard>

      <StepCard
        stepNum={5}
        title="Chứng từ đính kèm"
        hint="Tải lên ảnh chụp UNC, Ủy nhiệm chi, hoặc các chứng từ liên quan"
      >
        <div className="p-1">
          <Controller
            control={control}
            name="attachment"
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <FileUpload
                onChange={onChange}
                value={value ?? ''}
                error={error?.message}
                multiple={false}
                required={false}
                hiddenLabel={true}
                purpose="accounting_receipt_voucher"
                existingFile={watch('existing_attachment')}
                accept={['.jpg', '.jpeg', '.png', '.pdf', '.xls', '.xlsx', '.doc', '.docx']}
              />
            )}
          />
        </div>
      </StepCard>

      <StepCard stepNum={6} title="Kỳ kế toán & Ghi chú">
        <div className="p-1 text-[13px]">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <div className="mb-2 font-medium text-gray-700">Kỳ hoa hồng</div>
              <div className="border-border-1 bg-background-2 rounded-lg border px-3 py-2 font-medium text-gray-800">
                {accountingPeriodLabel ?? '—'}
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Kỳ hoa hồng luôn theo Kỳ kế toán đã chọn ở bước 1. Tiền phân bổ cho hóa đơn kỳ trước
                vẫn tự động bù đủ hoa hồng kỳ trước (catch-up lũy kế), không cần chỉnh kỳ.
              </p>
            </div>
            <div>
              <div className="mb-2 font-medium text-gray-700">Ghi chú</div>
              <textarea
                {...register('notes')}
                rows={3}
                placeholder="Nhập ghi chú (tuỳ chọn)"
                className="border-border-1 w-full resize-none rounded-md border px-3 py-2 text-[13px] placeholder:text-gray-400 focus:border-red-400 focus:outline-none"
              />
            </div>
          </div>
        </div>
      </StepCard>
    </div>
  )
}

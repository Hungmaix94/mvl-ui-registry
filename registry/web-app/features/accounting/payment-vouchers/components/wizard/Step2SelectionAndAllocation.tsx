import {
  Control,
  Controller,
  UseFormGetValues,
  UseFormRegister,
  UseFormSetValue,
  UseFormWatch,
} from 'react-hook-form'
import { StepCard } from './StepCard'
import { FileUpload } from '@/components/ui/file-upload/FileUpload'
import { IconWarningcircle } from '@/assets/icons'
import type { InputInvoice } from '@/features/accounting/input-invoices/services/input-invoice-service'
import type { PaymentVoucherWizardValues } from '../../schemas/payment-voucher-schema'
import { usePaymentVoucherAllocation } from '../../hooks/usePaymentVoucherAllocation'
import { PaymentMethodSection } from './PaymentMethodSection'
import { AllocationBanner } from './AllocationBanner'
import { InputInvoicesTable } from './InputInvoicesTable'
import { OffsetSection } from './OffsetSection'
import { CollectF2Panel, type F2InvoiceRow } from './CollectF2Panel'
import { SettledInvoicesTable, type SettledInvoiceRow } from './SettledInvoicesTable'
import { AppendF2Picker } from './AppendF2Picker'
import type { F2CollectSkipped } from '@/features/accounting/payment-vouchers/services/payment-voucher-service'

type Props = {
  watch: UseFormWatch<PaymentVoucherWizardValues>
  setValue: UseFormSetValue<PaymentVoucherWizardValues>
  getValues: UseFormGetValues<PaymentVoucherWizardValues>
  control: Control<PaymentVoucherWizardValues>
  register: UseFormRegister<PaymentVoucherWizardValues>
  selectedInvoices: InputInvoice[]
  setSelectedInvoices: (invoices: InputInvoice[]) => void
  onSuggestAllocation: (totalAmount: number) => void
  status?: string
  /** F2 settlement voucher: it already pays off its input invoice through the
   *  commission tier, so picking invoices here would be a second, conflicting
   *  allocation — the API rejects the mixed voucher outright. */
  inputInvoiceAllocationLocked?: boolean
  /** The tiers that voucher already settles, shown read-only in place of the picker. */
  settledInvoices?: SettledInvoiceRow[]
  /** Pick which of the exchange's remaining invoices to add to this same DRAFT voucher. */
  append?: React.ComponentProps<typeof AppendF2Picker>
  /** Take one already-settled invoice back off the voucher. */
  onRemoveSettled?: (tierId: number) => void
  removingTierId?: number | null
  /** F2 exchange collect flow (owned by the wizard). */
  f2: {
    /** Only in create mode — editing an existing voucher never re-collects. */
    enabled: boolean
    isCollecting: boolean
    hasCollected: boolean
    onCollect: () => void
    rows: F2InvoiceRow[]
    skipped: F2CollectSkipped[]
    selectedIds: number[]
    onToggle: (id: number) => void
    onToggleAll: () => void
    total: number
    netTotal: number
  }
}

export function Step2SelectionAndAllocation({
  watch,
  setValue,
  getValues,
  control,
  register,
  selectedInvoices,
  setSelectedInvoices,
  onSuggestAllocation,
  inputInvoiceAllocationLocked = false,
  settledInvoices,
  append,
  onRemoveSettled,
  removingTierId,
  f2,
}: Props) {
  const {
    errors,
    isLoading,
    allInvoices,
    selectedIds,
    remaining,
    totalAmount,
    methodTotal,
    totalAllocated,
    isFullyAllocated,
    allSelected,
    someSelected,
    bankAmt,
    cashAmt,
    payeeLabel,
    bankAccountOptions,
    isExchangePayee,
    isLoadingCandidates,
    allCandidates,
    totalReceivablesSelected,
    offsetMatched,
    getInvoiceValue,
    setInvoiceValue,
    toggleInvoice,
    toggleAll,
    setAllTo100,
  } = usePaymentVoucherAllocation({
    watch,
    setValue,
    getValues,
    control,
    selectedInvoices,
    setSelectedInvoices,
  })

  // F2 exchange (create only): no manual allocation — collect the approved commissions,
  // tick invoices, then "Lưu phiếu chi" builds the voucher server-side.
  if (isExchangePayee && f2.enabled && !inputInvoiceAllocationLocked) {
    return (
      <div className="flex flex-col gap-6">
        <StepCard
          stepNum={2}
          title="Thu thập & lập phiếu chi hoa hồng F2"
          hint="Chọn hóa đơn cần chi — số tiền tự tính từ hoa hồng đã duyệt"
          noPadding
        >
          <CollectF2Panel payeeLabel={payeeLabel} {...f2} />
        </StepCard>

        {/* Số tiền do collect quyết định, nhưng chi bằng đường nào thì vẫn phải chọn.
            Thiếu khối này, phiếu luôn ra "Bank transfer" mà không có tài khoản chi và
            kế toán phải mở lại màn sửa chỉ để điền một ô. */}
        <StepCard
          stepNum={3}
          title="Phương thức thanh toán"
          hint="Số tiền tự tính từ hoa hồng — ở đây chỉ chọn chi bằng đường nào"
        >
          <PaymentMethodSection
            watch={watch}
            setValue={setValue}
            control={control}
            register={register}
            bankAccountOptions={bankAccountOptions}
            bankAmt={f2.total}
            cashAmt={0}
            methodTotal={f2.total}
            amountLocked
            hideAmountFields
          />
        </StepCard>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Phương thức thanh toán */}
      <StepCard
        stepNum={2}
        title="Phương thức thanh toán"
        hint="Chọn hình thức chi tiền cho phiếu chi này"
      >
        <PaymentMethodSection
          watch={watch}
          setValue={setValue}
          control={control}
          register={register}
          bankAccountOptions={bankAccountOptions}
          bankAmt={bankAmt}
          cashAmt={cashAmt}
          methodTotal={methodTotal}
          amountLocked={inputInvoiceAllocationLocked}
        />
      </StepCard>

      {inputInvoiceAllocationLocked ? (
        <StepCard stepNum={3} title="Hóa đơn đầu vào đã gắn">
          <div className="flex flex-col gap-4">
            {append && <AppendF2Picker {...append} />}
            <SettledInvoicesTable
              rows={settledInvoices ?? []}
              onRemove={
                onRemoveSettled
                  ? (row) => row.id !== undefined && onRemoveSettled(row.id)
                  : undefined
              }
              removingId={removingTierId}
            />
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Số chi ở đây không phải số nhập tay.</p>
              <p className="mt-1">
                Nó được thu thập từ các khoản hoa hồng đã duyệt của sàn: mỗi hóa đơn một số gộp (gồm
                VAT), các dòng bên dưới là số thực trả từng bên. Vì vậy ô số tiền khóa và không sửa
                được từng dòng.
              </p>
              <p className="mt-1">
                Đổi danh sách hóa đơn thì dùng “Thu thập thêm” để gom, hoặc nút gỡ ở cuối mỗi dòng
                để bỏ một hóa đơn ra — không cần hủy phiếu.
              </p>
            </div>
          </div>
        </StepCard>
      ) : (
        <StepCard
          stepNum={3}
          title="Chọn & phân bổ hóa đơn"
          hint={
            <>
              Tích vào hóa đơn đầu vào của{' '}
              <b className="font-semibold text-gray-800">{payeeLabel}</b> và phân bổ số tiền
            </>
          }
          noPadding
        >
          {/* Search & Allocation Banner container */}
          <div className="border-border-1 border-b bg-gray-50/10 p-4">
            <AllocationBanner
              isFullyAllocated={isFullyAllocated}
              remaining={remaining}
              totalAmount={totalAmount}
              totalAllocated={totalAllocated}
              hasSelection={selectedInvoices.length > 0}
              onSuggest={() => {
                const totalAmt = watch('offset_on')
                  ? bankAmt + cashAmt + totalReceivablesSelected
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

          <InputInvoicesTable
            allInvoices={allInvoices}
            selectedIds={selectedIds}
            isLoading={isLoading}
            toggleInvoice={toggleInvoice}
            allSelected={allSelected}
            someSelected={someSelected}
            toggleAll={toggleAll}
            getInvoiceValue={getInvoiceValue}
            setInvoiceValue={setInvoiceValue}
          />
        </StepCard>
      )}

      {/* Cấn trừ hóa đơn — chỉ hỗ trợ khi người nhận là Sàn giao dịch.
          Phiếu F2 đã khóa số: tổng phải bằng số gộp thu thập được, nên cấn trừ vào đây
          sẽ luôn làm phiếu lệch tổng và ghi sổ thất bại. */}
      {isExchangePayee && !inputInvoiceAllocationLocked && (
        <StepCard
          stepNum={4}
          title="Cấn trừ hóa đơn"
          hint="Đối tác có HĐ bán (phải thu) có thể bù trừ"
        >
          <OffsetSection
            control={control}
            setValue={setValue}
            getValues={getValues}
            watch={watch}
            errors={errors}
            selectedInvoices={selectedInvoices}
            totalAllocated={totalAllocated}
            getInvoiceValue={getInvoiceValue}
            isLoadingCandidates={isLoadingCandidates}
            allCandidates={allCandidates}
            totalReceivablesSelected={totalReceivablesSelected}
            offsetMatched={offsetMatched}
          />
        </StepCard>
      )}

      <StepCard
        stepNum={isExchangePayee && !inputInvoiceAllocationLocked ? 5 : 4}
        title="Chứng từ đính kèm"
        hint="Tải lên ảnh chụp UNC, Ủy nhiệm chi, hoặc các chứng từ liên quan"
      >
        <div className="p-1">
          <Controller
            control={control}
            name="attachment"
            render={({ field: { onChange, value }, fieldState: { error } }) => (
              <FileUpload
                onChange={(token: string | string[]) =>
                  onChange(typeof token === 'string' ? token : token[0])
                }
                value={value ?? ''}
                error={error?.message}
                multiple={false}
                required={false}
                hiddenLabel={true}
                purpose="accounting_payment_voucher"
                accept={['.jpg', '.jpeg', '.png', '.pdf', '.xls', '.xlsx', '.doc', '.docx']}
              />
            )}
          />
        </div>
      </StepCard>
    </div>
  )
}

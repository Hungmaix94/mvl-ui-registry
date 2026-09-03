import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { formatDateToApi } from '@/utils/date-utils'
import {
  useSalesInvoices,
  type SalesInvoice,
} from '@/features/accounting/sales-invoices/services/sales-invoice-service'
import { useSuggestAllocation } from '@/features/accounting/receipt-vouchers/services/receipt-voucher-service'
import {
  receiptVoucherSchema,
  toReceiptVoucherPayload,
  type ReceiptVoucherFormValues,
} from '@/features/accounting/receipt-vouchers/schemas/receipt-voucher-schema'
import toastService from '@/services/toast-service'
import {
  resolveSuggestAllocation,
  suggestAllocationErrorMessage,
} from '@/features/accounting/receipt-vouchers/utils/suggest-allocation-result'
import { StepIndicator } from './wizard/StepIndicator'
import { ReceiptVoucherInfoStep } from './wizard/ReceiptVoucherInfoStep'
import { Step2SelectionAndAllocation } from './wizard/Step2SelectionAndAllocation'
import { Sidecar } from './wizard/Sidecar'
import { WizardFooter } from './wizard/WizardFooter'
import { useAccountingPeriods } from '@/features/accounting/accounting-periods/services/accounting-period-service'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { AccountingPeriodStatus } from '@/api/schema'
import { SalesInvoiceStatus } from '@/constants/api-schema-aliases'

// ─── Main wizard ──────────────────────────────────────────────────────────────

type Props = {
  onSubmit: (payload: any) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
  initialValues?: Partial<ReceiptVoucherFormValues>
  isEdit?: boolean
  status?: string
  voucherCode?: string
}

export function ReceiptVoucherWizard({
  onSubmit,
  onCancel,
  isSubmitting,
  initialValues,
  isEdit,
  status,
  voucherCode,
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: periodsData } = useAccountingPeriods({
    page_size: 50,
    status: isEdit ? undefined : AccountingPeriodStatus.OPEN,
  })

  const currentStep = (() => {
    const fromUrl = Number(searchParams.get('step'))
    if (fromUrl >= 1 && fromUrl <= 2) return fromUrl
    return 1
  })()

  const setCurrentStep = (updater: number | ((prev: number) => number)) => {
    const next = typeof updater === 'function' ? updater(currentStep) : updater
    setSearchParams((prev) => {
      prev.set('step', String(next))
      return prev
    })
  }

  const [selectedInvoices, setSelectedInvoices] = useState<SalesInvoice[]>([])

  const { mutateAsync: suggestAllocation, isPending: isLoadingSuggest } = useSuggestAllocation()

  const {
    control,
    register,
    watch,
    setValue,
    setError,
    clearErrors,
    handleSubmit,
    getValues,
    trigger,
  } = useForm<ReceiptVoucherFormValues>({
    resolver: zodResolver(receiptVoucherSchema) as any,
    mode: 'onChange',
    defaultValues: isEdit
      ? initialValues
      : {
          receipt_date: formatDateToApi(new Date()),
          payment_method: APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYMENT_METHOD.TRANSFER,
          payer_type: APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE.INVESTOR,
          payer_name: '',
          bank_on: true,
          selected_invoice_ids: [],
          invoices: [],
          attachment: null,
        },
  })

  const bankOn = watch('bank_on')
  const cashOn = watch('cash_on')

  useEffect(() => {
    if (bankOn) {
      setValue(
        'payment_method',
        APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYMENT_METHOD.TRANSFER
      )
    } else if (cashOn) {
      setValue('payment_method', APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYMENT_METHOD.CASH)
    }
  }, [bankOn, cashOn, setValue])

  // Redirect to step 1 if landing on step 2 with empty step 1 data
  useEffect(() => {
    if (currentStep === 2 && !isEdit) {
      const values = getValues()
      const hasPayer =
        (values.payer_type === APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE.INVESTOR &&
          !!values.payer_investor) ||
        (values.payer_type === APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE.EXCHANGE &&
          !!values.payer_exchange) ||
        (values.payer_type ===
          APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE.COLLABORATOR &&
          !!values.payer_collaborator) ||
        (values.payer_type === APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE.OTHER &&
          !!values.payer_name)

      const hasAmount =
        (values.bank_on && !!values.bank_amount) ||
        (values.cash_on && !!values.cash_amount) ||
        (values.offset_on && !!values.offset_amount)

      if (!hasPayer || !hasAmount) {
        setCurrentStep(1)
      }
    }
  }, [currentStep, isEdit, getValues])

  const accountingPeriodId = watch('accounting_period')

  // Pre-select default accounting period when not in edit mode
  useEffect(() => {
    if (isEdit || !periodsData?.results?.length) return

    const currentPeriod = getValues('accounting_period')
    if (currentPeriod) return

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    // 1. Try to find an OPEN or SOFT_CLOSED period matching current year/month
    const currentPeriodObj = periodsData.results.find(
      (p) =>
        p.year === currentYear &&
        p.month === currentMonth &&
        (p.status === 'OPEN' || p.status === 'SOFT_CLOSED')
    )

    // 2. Fall back to finding any past/current OPEN/SOFT_CLOSED period (to avoid future periods)
    const currentOrPastActivePeriod =
      currentPeriodObj ||
      periodsData.results.find(
        (p) =>
          (p.status === 'OPEN' || p.status === 'SOFT_CLOSED') &&
          (p.year < currentYear || (p.year === currentYear && p.month <= currentMonth))
      )

    // 3. Fall back to any OPEN/SOFT_CLOSED period, or the first period
    const activePeriod =
      currentOrPastActivePeriod ||
      periodsData.results.find((p) => p.status === 'OPEN') ||
      periodsData.results.find((p) => p.status === 'SOFT_CLOSED') ||
      periodsData.results[0]

    if (activePeriod) {
      setValue('accounting_period', activePeriod.id, { shouldValidate: true })
    }
  }, [periodsData, isEdit, setValue, getValues])

  // Kỳ hoa hồng luôn = kỳ kế toán (BE force-sync) — FE chỉ hiển thị, không gửi.
  const selectedAccountingPeriod = periodsData?.results?.find(
    (p) => String(p.id) === String(accountingPeriodId)
  )
  const accountingPeriodLabel = selectedAccountingPeriod
    ? `Tháng ${selectedAccountingPeriod.month}/${selectedAccountingPeriod.year}`
    : null

  const payerType = watch('payer_type')
  const payerInvestorId = watch('payer_investor')
  const payerExchangeId = watch('payer_exchange')
  const payerCollaboratorId = watch('payer_collaborator')
  const investorId =
    payerType === APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE.INVESTOR
      ? payerInvestorId
        ? Number(payerInvestorId)
        : undefined
      : undefined
  const exchangeId =
    payerType === APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE.EXCHANGE
      ? payerExchangeId
        ? Number(payerExchangeId)
        : undefined
      : undefined

  const { data: invoicesData } = useSalesInvoices(
    {
      investor: investorId,
      source_exchange: exchangeId,
      page_size: 50,
      status__in: [SalesInvoiceStatus.ISSUED, SalesInvoiceStatus.PARTIAL],
    },
    {
      enabled:
        (payerType === APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE.INVESTOR &&
          !!investorId) ||
        (payerType === APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE.EXCHANGE &&
          !!exchangeId) ||
        (payerType !== APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE.INVESTOR &&
          payerType !== APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE.EXCHANGE),
    }
  )

  const isInitializedRef = useRef(false)
  const lastCounterpartyIdRef = useRef<number | string | undefined>(undefined)
  const currentCounterpartyId =
    (payerInvestorId || payerExchangeId || payerCollaboratorId) ?? undefined

  useEffect(() => {
    if (
      lastCounterpartyIdRef.current !== undefined &&
      (lastCounterpartyIdRef.current && currentCounterpartyId
        ? String(lastCounterpartyIdRef.current) !== String(currentCounterpartyId)
        : lastCounterpartyIdRef.current !== currentCounterpartyId)
    ) {
      setSelectedInvoices([])
      setValue('invoices', [])
      setValue('selected_invoice_ids', [])
      isInitializedRef.current = false
    }
    lastCounterpartyIdRef.current = currentCounterpartyId
  }, [currentCounterpartyId, setValue])

  useEffect(() => {
    if (invoicesData?.results) {
      if (!isInitializedRef.current) {
        const invoices = getValues('invoices') || []
        if (invoices.length > 0) {
          const invoiceIds = new Set(invoices.map((l) => l.sales_invoice))
          const matchedInvoices = invoicesData.results.filter((inv) =>
            invoiceIds.has(inv.id)
          ) as unknown as SalesInvoice[]

          const missingIds = Array.from(invoiceIds).filter(
            (id) => !matchedInvoices.some((inv) => inv.id === id)
          )

          if (missingIds.length > 0) {
            const fetchMissing = async () => {
              try {
                const { getSalesInvoiceService } = await import(
                  '@/features/accounting/sales-invoices/services/sales-invoice-service'
                )
                const service = getSalesInvoiceService()
                const fetched = await Promise.all(
                  missingIds.map(async (id) => {
                    try {
                      return (await service.getSalesInvoice(id)) as SalesInvoice
                    } catch (e) {
                      console.error(`Failed to fetch sales invoice ${id}`, e)
                      return null
                    }
                  })
                )
                const validFetched = fetched.filter((inv): inv is SalesInvoice => inv !== null)
                setSelectedInvoices([...matchedInvoices, ...validFetched])
              } catch (err) {
                console.error(err)
                setSelectedInvoices(matchedInvoices)
              }
            }
            fetchMissing()
          } else {
            setSelectedInvoices(matchedInvoices)
          }
        }
        isInitializedRef.current = true
      }
    }
  }, [invoicesData, getValues])

  const handleSuggestAllocation = useCallback(
    async (totalAmount: number) => {
      const invoice_ids = selectedInvoices.map((inv) => inv.id)

      if (invoice_ids.length === 0) {
        toastService.error('Vui lòng chọn ít nhất một hóa đơn để gợi ý phân bổ')
        return
      }

      // Lần bấm mới xoá lời từ chối của lần trước, nếu không banner cũ nằm lại và đọc như lỗi hiện tại.
      clearErrors('invoices')

      try {
        const result = await suggestAllocation({
          invoice_ids,
          total_amount: String(totalAmount),
        })
        const outcome = resolveSuggestAllocation(result)
        if (outcome.kind === 'applied') {
          setValue('invoices', outcome.invoices)
          toastService.success('Đã tự động phân bổ')
        } else {
          toastService.info(outcome.message)
        }
      } catch (err) {
        // BE PR #3267: chọn toàn hoá đơn điều chỉnh giảm ⇒ tổng ÂM ⇒ 400 kèm câu chữ tiếng Việt bảo
        // user thêm hoá đơn dương của chính CĐT đó. Trước đây BE trả 200 + danh sách rỗng và bước này
        // hiện trắng trơn. Toast bay đi sau vài giây, nên câu chữ được ghim thêm vào chính khối lỗi
        // `invoices` mà bước phân bổ đã có sẵn (`data-field-name="invoices"`) — cùng khuôn mà
        // `handleApiError` dùng để gắn lỗi máy chủ vào field của form.
        const message = suggestAllocationErrorMessage(err)
        setError('invoices', { type: 'server', message })
        toastService.error(message)
      }
    },
    [selectedInvoices, suggestAllocation, setValue, setError, clearErrors]
  )

  const goNext = useCallback(async () => {
    if (currentStep === 1) {
      const valid = await trigger([
        'receipt_date',
        'payer_type',
        'payer_name',
        'accounting_period',
        'bank_on',
        'bank_amount',
        'to_bank_account',
        'cash_on',
        'cash_amount',
      ])
      if (!valid) return
    }
    setCurrentStep((s) => Math.min(s + 1, 2))
  }, [currentStep, trigger])

  const goBack = useCallback(() => {
    setCurrentStep((s) => Math.max(s - 1, 1))
  }, [])

  const handleStepClick = useCallback(
    async (step: number) => {
      if (step === 2 && currentStep === 1) {
        const valid = await trigger([
          'receipt_date',
          'payer_type',
          'payer_name',
          'accounting_period',
          'bank_on',
          'bank_amount',
          'to_bank_account',
          'cash_on',
          'cash_amount',
        ])
        if (!valid) return
      }
      setCurrentStep(step)
    },
    [currentStep, trigger]
  )

  const scrollToError = (errors: any) => {
    const errorKeys = Object.keys(errors)
    if (errorKeys.length > 0) {
      const firstError = errorKeys[0]
      setTimeout(() => {
        const element =
          document.querySelector(`[data-field-name="${firstError}"]`) ||
          document.querySelector(`[name="${firstError}"]`) ||
          document.getElementById(firstError)

        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
          // If it's an input and we can focus it, focus it
          const focusable = element.querySelector('input, select, textarea, button') as HTMLElement
          if (focusable) {
            focusable.focus({ preventScroll: true })
          } else if (element instanceof HTMLElement) {
            element.focus({ preventScroll: true })
          }
        }
      }, 50)
    }
  }

  const handleFormSubmit = useCallback(
    async (values: ReceiptVoucherFormValues) => {
      if (currentStep === 1) {
        await goNext()
        return
      }
      const payload = toReceiptVoucherPayload(values)
      await onSubmit(payload)
    },
    [currentStep, goNext, onSubmit]
  )

  const handleCancel = useCallback(() => {
    onCancel()
  }, [onCancel])

  const bankAmt = watch('bank_on') ? Number(watch('bank_amount') || 0) : 0
  const cashAmt = watch('cash_on') ? Number(watch('cash_amount') || 0) : 0

  // Since offset_amount is in the schema, we derive it from the UI selection if offset is ON.
  const offsetAmt = watch('offset_on') ? Number(watch('offset_amount') || 0) : 0

  const totalAmount = bankAmt + cashAmt + offsetAmt
  const invoices = watch('invoices') ?? []
  const totalAllocated = invoices.reduce((s, l) => s + Number(l.allocated_amount ?? 0), 0)

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit, (errors) => {
        scrollToError(errors)
      })}
      className="flex flex-col gap-0"
    >
      {/* Stepper bar */}
      <div className="px-7 pt-4 pb-4">
        <StepIndicator current={currentStep} onStepClick={handleStepClick} />
      </div>

      {/* Content + sidecar */}
      <div className="flex items-start gap-6 px-7 pb-24">
        <section className="min-w-0 flex-1">
          {/* Step content */}
          {currentStep === 1 && (
            <ReceiptVoucherInfoStep
              control={control}
              register={register}
              watch={watch}
              setValue={setValue}
              isEdit={isEdit}
              voucherCode={voucherCode}
            />
          )}
          {currentStep === 2 && (
            <Step2SelectionAndAllocation
              watch={watch}
              setValue={setValue}
              getValues={getValues}
              control={control}
              register={register}
              selectedInvoices={selectedInvoices}
              setSelectedInvoices={setSelectedInvoices}
              isLoadingSuggest={isLoadingSuggest}
              onSuggestAllocation={handleSuggestAllocation}
              status={status}
              accountingPeriodLabel={accountingPeriodLabel}
            />
          )}

          <WizardFooter
            currentStep={currentStep}
            totalAllocated={totalAllocated}
            totalAmount={totalAmount}
            isSubmitting={isSubmitting}
            onCancel={handleCancel}
            onBack={goBack}
            onNext={async () => {
              // We intercept onNext to perform validation and scroll to error if on Step 1
              if (currentStep === 1) {
                const valid = await trigger([
                  'receipt_date',
                  'payer_type',
                  'payer_name',
                  'accounting_period',
                  'bank_on',
                  'bank_amount',
                  'to_bank_account',
                  'cash_on',
                  'cash_amount',
                ])
                if (!valid) {
                  scrollToError(control._formState.errors)
                  return
                }
              }
              goNext()
            }}
          />
        </section>

        <Sidecar
          watch={watch}
          currentStep={currentStep}
          selectedInvoices={selectedInvoices}
          accountingPeriodLabel={accountingPeriodLabel}
        />
      </div>
    </form>
  )
}

export default ReceiptVoucherWizard

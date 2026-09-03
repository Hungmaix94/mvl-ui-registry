import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useForm, type FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AccountingPeriodStatus } from '@/api/schema'
import { formatDateToApi } from '@/utils/date-utils'
import {
  useInputInvoices,
  type InputInvoice,
} from '@/features/accounting/input-invoices/services/input-invoice-service'
import {
  getPaymentVoucherService,
  useCollectF2Commissions,
  useCollectMoreF2Commissions,
  useRemoveSettledInvoice,
  type F2CommissionsPreview,
  type PaymentVoucherRequest,
} from '@/features/accounting/payment-vouchers/services/payment-voucher-service'
import { APP_PATH } from '@/routes/AppRoute.constant'
import {
  paymentVoucherWizardSchema,
  toPaymentVoucherPayload,
  type PaymentVoucherWizardValues,
} from '@/features/accounting/payment-vouchers/schemas/payment-voucher-schema'
import {
  PaymentMethod,
  PayeeType,
} from '@/features/accounting/payment-vouchers/constants/payment-voucher-constants'
import {
  buildPayeeInputInvoiceParams,
  inputInvoiceTotal,
} from '@/features/accounting/payment-vouchers/utils/payment-voucher-wizard-utils'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import { StepIndicator } from './wizard/StepIndicator'
import { PaymentVoucherInfoStep } from './wizard/PaymentVoucherInfoStep'
import { Step2SelectionAndAllocation } from './wizard/Step2SelectionAndAllocation'
import { Sidecar } from './wizard/Sidecar'
import type { SettledInvoiceRow } from './wizard/SettledInvoicesTable'
import type { F2InvoiceRow } from './wizard/CollectF2Panel'
import { WizardFooter } from './wizard/WizardFooter'
import { useAccountingPeriods } from '@/features/accounting/accounting-periods/services/accounting-period-service'
import { InputInvoiceStatus as InputInvoiceStatus } from '@/constants/api-schema-aliases'

/**
 * Preview items are per invoice LINE — i.e. per unit. Group them under their invoice
 * WITHOUT losing the unit rows: the accountant ticks an invoice but reads the units, and
 * an invoice cut for several units is otherwise a single opaque total.
 */
function groupPreviewByInvoice(
  items: {
    invoice_id: number
    invoice_code: string
    input_invoice_line_id: number
    unit_number?: string | null
    project_name?: string | null
    line_total_with_vat?: unknown
    line_remaining_with_vat?: unknown
    amount_with_vat?: unknown
    net_amount?: unknown
  }[]
): F2InvoiceRow[] {
  const byInvoice = new Map<number, F2InvoiceRow>()
  for (const item of items) {
    const cur = byInvoice.get(item.invoice_id) ?? {
      id: item.invoice_id,
      code: item.invoice_code,
      units: [],
      amount: 0,
      netAmount: 0,
    }
    const amountWithVat = Number(item.amount_with_vat ?? 0)
    // Server-side figure, not gross/1.1: the gross is sized by the cumulative ratio, so
    // deriving the net here would drift from what the voucher actually books.
    const netAmount = Number(item.net_amount ?? 0)
    cur.amount += amountWithVat
    cur.netAmount += netAmount
    cur.units.push({
      lineId: item.input_invoice_line_id,
      unitNumber: item.unit_number ?? '',
      projectName: item.project_name ?? '',
      lineTotalWithVat: Number(item.line_total_with_vat ?? 0),
      lineRemainingWithVat: Number(item.line_remaining_with_vat ?? 0),
      netAmount,
      amountWithVat,
    })
    byInvoice.set(item.invoice_id, cur)
  }
  return Array.from(byInvoice.values())
}

// ─── Main wizard ──────────────────────────────────────────────────────────────

const STEP1_FIELDS: (keyof PaymentVoucherWizardValues)[] = [
  'voucher_date',
  'payee_type',
  'payee_employee',
  'payee_collaborator',
  'payee_exchange',
  'payee_name',
  'accounting_period',
]

type Props = {
  onSubmit: (payload: PaymentVoucherRequest) => Promise<void>
  onCancel: () => void
  isSubmitting: boolean
  initialValues?: Partial<PaymentVoucherWizardValues>
  isEdit?: boolean
  status?: string
  voucherCode?: string
  /** Voucher already settles an input invoice through its commission tier. */
  inputInvoiceAllocationLocked?: boolean
  /** Those settlement tiers, so the locked step can show what is being paid. */
  settledInvoices?: SettledInvoiceRow[]
  /** Voucher id, needed to collect more onto this same draft. */
  voucherId?: number
  /** Server-side total of a locked voucher — it can grow after "Thu thập thêm". */
  lockedTotalAmount?: number
  /** Called after more commission was appended, so the page can refetch. */
  onCollectedMore?: () => void
}

export function PaymentVoucherWizard({
  onSubmit,
  onCancel,
  isSubmitting,
  initialValues,
  isEdit,
  status,
  voucherCode,
  inputInvoiceAllocationLocked,
  settledInvoices,
  voucherId,
  lockedTotalAmount,
  onCollectedMore,
}: Props) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: periodsData } = useAccountingPeriods({ page_size: 50 })

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

  const [selectedInvoices, setSelectedInvoices] = useState<InputInvoice[]>([])

  // F2 collect flow: preview the exchange's approved-unpaid commissions, tick which
  // invoices to pay; "Lưu phiếu chi" builds the DRAFT server-side from the ticked set.
  const navigate = useNavigate()
  const { mutateAsync: collectF2, isPending: isSavingF2 } = useCollectF2Commissions()
  const [f2Preview, setF2Preview] = useState<F2CommissionsPreview | null>(null)
  const [f2SelectedInvoiceIds, setF2SelectedInvoiceIds] = useState<number[]>([])
  const [isCollectingF2, setIsCollectingF2] = useState(false)

  const { control, register, watch, setValue, handleSubmit, getValues, trigger } =
    useForm<PaymentVoucherWizardValues>({
      resolver: zodResolver(paymentVoucherWizardSchema) as any,
      mode: 'onChange',
      defaultValues: isEdit
        ? initialValues
        : {
            voucher_date: formatDateToApi(new Date()),
            payment_method: PaymentMethod.TRANSFER,
            payee_type: PayeeType.EMPLOYEE,
            payee_name: '',
            bank_on: true,
            selected_invoice_ids: [],
            invoices: [],
            attachment: null,
          },
    })

  // Redirect to step 1 if landing on step 2 with empty step 1 data.
  // Payment method (bank/cash amount) is now collected on step 2, so it is not
  // part of the step-1 guard anymore — only the payee must be filled.
  useEffect(() => {
    if (currentStep === 2 && !isEdit) {
      const values = getValues()
      const hasPayee =
        (values.payee_type === PayeeType.EMPLOYEE && !!values.payee_employee) ||
        (values.payee_type === PayeeType.COLLABORATOR && !!values.payee_collaborator) ||
        (values.payee_type === PayeeType.EXCHANGE && !!values.payee_exchange) ||
        (values.payee_type === PayeeType.SUPPLIER && !!values.payee_name)

      if (!hasPayee) {
        setCurrentStep(1)
      }
    }
  }, [currentStep, isEdit, getValues])

  // Pre-select default accounting period (kỳ hiện tại) when not in edit mode
  useEffect(() => {
    if (isEdit || !periodsData?.results?.length) return

    const currentPeriod = getValues('accounting_period')
    if (currentPeriod) return

    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1

    // Ưu tiên đúng kỳ tháng/năm hiện tại; nếu không có thì fallback OPEN → SOFT_CLOSED → đầu danh sách
    // Preferring the current month regardless of status handed the user a closed period by
    // default, and the failure only surfaced at save time naming a month they never chose.
    // Fall back to the newest OPEN period that is not ahead of today — plain list order
    // would hand back far-future placeholder periods such as 2099/12.
    const isOpen = (p: { status?: string }) => p.status === AccountingPeriodStatus.OPEN
    const rank = (p: { year: number; month: number }) => p.year * 12 + p.month
    const nowRank = currentYear * 12 + currentMonth
    const openPeriods = periodsData.results.filter(isOpen)
    const newestOpenUpToNow = openPeriods
      .filter((p) => rank(p) <= nowRank)
      .sort((a, b) => rank(b) - rank(a))[0]
    const oldestOpenAhead = openPeriods
      .filter((p) => rank(p) > nowRank)
      .sort((a, b) => rank(a) - rank(b))[0]

    const activePeriod =
      openPeriods.find((p) => p.year === currentYear && p.month === currentMonth) ||
      newestOpenUpToNow ||
      oldestOpenAhead ||
      periodsData.results.find((p) => p.year === currentYear && p.month === currentMonth) ||
      periodsData.results.find((p) => p.status === AccountingPeriodStatus.SOFT_CLOSED) ||
      periodsData.results[0]

    if (activePeriod) {
      setValue('accounting_period', activePeriod.id, { shouldValidate: true })
    }
  }, [periodsData, isEdit, setValue, getValues])

  const payeeType = watch('payee_type')
  const payeeEmployeeId = watch('payee_employee')
  const payeeCollaboratorId = watch('payee_collaborator')
  const payeeExchangeId = watch('payee_exchange')
  const isExchangePayee = payeeType === PayeeType.EXCHANGE
  // F2 collect replaces the manual flow only when creating a fresh voucher.
  const f2CollectActive = isExchangePayee && !isEdit && !inputInvoiceAllocationLocked

  // Cho schema biết đang ở luồng F2 để nó bỏ qua các ràng buộc tiền/tài khoản của luồng
  // thủ công — những ô đó không được render ở Bước 2 của luồng này.
  useEffect(() => {
    setValue('f2_collect', f2CollectActive)
  }, [f2CollectActive, setValue])

  // F2 settlement: the amount is the collected gross, not something to type. The method
  // radio then only moves that one figure between bank and cash — without this, picking
  // the other method leaves its (disabled) amount empty and the voucher saves as 0.
  //
  // It has to follow `lockedTotalAmount` rather than the form's own total: "Thu thập thêm"
  // grows the voucher server-side, and defaultValues are read once at mount. The read-only
  // table refetched and showed 66.304.545 while the amount field and the sidecar still
  // read 11.725.000 — and saving then would have sent the stale header total.
  const bankOn = watch('bank_on')
  const cashOn = watch('cash_on')
  useEffect(() => {
    if (!inputInvoiceAllocationLocked) return
    const total = lockedTotalAmount ?? Number(getValues('total_amount') ?? 0)
    if (!total) return
    setValue('total_amount', total)
    setValue('bank_amount', bankOn ? total : 0, { shouldValidate: true })
    setValue('cash_amount', cashOn ? total : 0, { shouldValidate: true })
  }, [inputInvoiceAllocationLocked, lockedTotalAmount, bankOn, cashOn, getValues, setValue])

  // Collecting more onto an open draft: the voucher keeps its code and its already
  // settled tiers, so this is an append, not a re-collect. It previews first and appends
  // only what the accountant ticks — adding everything silently was the wrong default,
  // and the create flow already asks the same question.
  const { mutateAsync: collectMoreF2, isPending: isAppending } = useCollectMoreF2Commissions()
  const { mutateAsync: removeSettledInvoice, isPending: isRemoving } = useRemoveSettledInvoice()
  const [appendCandidates, setAppendCandidates] = useState<F2InvoiceRow[] | null>(null)
  const [appendSelectedIds, setAppendSelectedIds] = useState<number[]>([])
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false)
  const [removingTierId, setRemovingTierId] = useState<number | null>(null)

  const handleOpenAppend = useCallback(async () => {
    const exchangeId = getValues('payee_exchange')
    if (!exchangeId) return
    setIsLoadingCandidates(true)
    try {
      const preview = await getPaymentVoucherService().getF2CommissionsPreview({
        payee_exchange: exchangeId,
      })
      const rows = groupPreviewByInvoice(preview?.items ?? [])
      setAppendCandidates(rows)
      setAppendSelectedIds(rows.map((r) => r.id))
    } catch (err) {
      toastService.error(extractErrorMessage(err) || 'Không tìm được hoa hồng để gom thêm')
    } finally {
      setIsLoadingCandidates(false)
    }
  }, [getValues])

  const handleConfirmAppend = useCallback(async () => {
    if (!voucherId || appendSelectedIds.length === 0) return
    try {
      await collectMoreF2({ id: voucherId, data: { invoice_ids: appendSelectedIds } })
      toastService.success('Đã gom thêm hóa đơn vào phiếu này')
      setAppendCandidates(null)
      setAppendSelectedIds([])
      onCollectedMore?.()
    } catch (err) {
      toastService.error(extractErrorMessage(err) || 'Không gom thêm được')
    }
  }, [collectMoreF2, voucherId, appendSelectedIds, onCollectedMore])

  const handleRemoveSettled = useCallback(
    async (tierId: number) => {
      if (!voucherId) return
      setRemovingTierId(tierId)
      try {
        await removeSettledInvoice({ id: voucherId, invoiceTier: tierId })
        toastService.success('Đã gỡ hóa đơn khỏi phiếu')
        onCollectedMore?.()
      } catch (err) {
        toastService.error(extractErrorMessage(err) || 'Không gỡ được hóa đơn')
      } finally {
        setRemovingTierId(null)
      }
    },
    [removeSettledInvoice, voucherId, onCollectedMore]
  )

  const handleCollectF2 = useCallback(async () => {
    const exchangeId = getValues('payee_exchange')
    if (!exchangeId) return
    setIsCollectingF2(true)
    try {
      const preview = await getPaymentVoucherService().getF2CommissionsPreview({
        payee_exchange: exchangeId,
      })
      setF2Preview(preview ?? null)
      const ids = Array.from(new Set((preview?.items ?? []).map((it) => it.invoice_id)))
      setF2SelectedInvoiceIds(ids)
      if (ids.length === 0) {
        toastService.info('Không có khoản hoa hồng F2 nào đủ điều kiện chi cho sàn này')
      }
    } catch {
      toastService.error('Không thu thập được hoa hồng F2, vui lòng thử lại')
    } finally {
      setIsCollectingF2(false)
    }
  }, [getValues])

  const f2InvoiceRows = useMemo(() => groupPreviewByInvoice(f2Preview?.items ?? []), [f2Preview])

  const f2Total = useMemo(() => {
    const selected = new Set(f2SelectedInvoiceIds)
    return f2InvoiceRows.filter((r) => selected.has(r.id)).reduce((s, r) => s + r.amount, 0)
  }, [f2InvoiceRows, f2SelectedInvoiceIds])

  // Totalled over the TICKED rows, like f2Total — the preview's total_net_amount covers
  // every collectible invoice, so it would overstate a partial selection.
  const f2NetTotal = useMemo(() => {
    const selected = new Set(f2SelectedInvoiceIds)
    return f2InvoiceRows.filter((r) => selected.has(r.id)).reduce((s, r) => s + r.netAmount, 0)
  }, [f2InvoiceRows, f2SelectedInvoiceIds])

  const toggleF2Invoice = useCallback((id: number) => {
    setF2SelectedInvoiceIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }, [])

  const toggleF2All = useCallback(() => {
    setF2SelectedInvoiceIds((prev) =>
      prev.length === f2InvoiceRows.length ? [] : f2InvoiceRows.map((r) => r.id)
    )
  }, [f2InvoiceRows])

  const handleF2Save = useCallback(async () => {
    const exchangeId = getValues('payee_exchange')
    if (!exchangeId) return
    if (!f2SelectedInvoiceIds.length) {
      toastService.info('Vui lòng chọn ít nhất một hóa đơn để chi')
      return
    }
    try {
      const values = getValues()
      const voucher = await collectF2({
        payee_exchange: exchangeId,
        invoice_ids: f2SelectedInvoiceIds,
        voucher_date: values.voucher_date,
        // Bước 2 hỏi chi bằng đường nào; trước đây không gửi lên nên phiếu luôn ra
        // TRANSFER với tài khoản chi rỗng và phải mở màn sửa chỉ để điền một ô.
        from_bank_account: values.cash_on ? null : (values.from_bank_account ?? null),
        // Without this the API derived the period from voucher_date and the "Kỳ kế toán"
        // field on Bước 1 did nothing — picking an open period still failed naming a
        // different, closed month.
        accounting_period: values.accounting_period,
        payment_method: values.cash_on ? PaymentMethod.CASH : PaymentMethod.TRANSFER,
      })
      const voucherId = (voucher as { id?: number })?.id
      if (voucherId) {
        toastService.success('Đã tạo phiếu chi từ hoa hồng đã chọn')
        navigate(APP_PATH.PAYMENT_VOUCHER_DETAIL.replace(':id', String(voucherId)))
      }
    } catch (err) {
      // The envelope carries the reason in error.errors[].detail; reading only
      // error.message swallowed it, so a closed period showed as a generic failure.
      toastService.error(extractErrorMessage(err) || 'Không tạo được phiếu chi F2')
    }
  }, [collectF2, f2SelectedInvoiceIds, getValues, navigate])

  const { params: baseInvoiceParams, enabled: invoiceQueryEnabled } = buildPayeeInputInvoiceParams(
    payeeType,
    payeeEmployeeId,
    payeeCollaboratorId,
    payeeExchangeId
  )
  const invoiceParams = useMemo(() => {
    return {
      ...baseInvoiceParams,
      status__in: [InputInvoiceStatus.VERIFIED, InputInvoiceStatus.PARTIAL],
    }
  }, [baseInvoiceParams])
  const { data: invoicesData } = useInputInvoices(invoiceParams, {
    enabled: invoiceQueryEnabled,
  })

  const isInitializedRef = useRef(false)
  const lastCounterpartyIdRef = useRef<number | string | undefined>(undefined)
  const currentCounterpartyId =
    (payeeEmployeeId || payeeCollaboratorId || payeeExchangeId) ?? undefined

  useEffect(() => {
    if (
      lastCounterpartyIdRef.current !== undefined &&
      lastCounterpartyIdRef.current !== currentCounterpartyId
    ) {
      setSelectedInvoices([])
      setValue('invoices', [])
      setValue('selected_invoice_ids', [])
      setF2Preview(null)
      setF2SelectedInvoiceIds([])
      isInitializedRef.current = false
    }
    lastCounterpartyIdRef.current = currentCounterpartyId
  }, [currentCounterpartyId, setValue])

  useEffect(() => {
    if (invoicesData?.results) {
      if (!isInitializedRef.current) {
        const invoices = getValues('invoices') || []
        if (invoices.length > 0) {
          const invoiceIds = new Set(invoices.map((l) => l.input_invoice))
          const matchedInvoices = invoicesData.results.filter((inv) => invoiceIds.has(inv.id))

          const missingIds = Array.from(invoiceIds).filter(
            (id) => !matchedInvoices.some((inv) => inv.id === id)
          )

          if (missingIds.length > 0) {
            const fetchMissing = async () => {
              try {
                const { getInputInvoiceService } = await import(
                  '@/features/accounting/input-invoices/services/input-invoice-service'
                )
                const service = getInputInvoiceService()
                const fetched = await Promise.all(
                  missingIds.map(async (id) => {
                    try {
                      return await service.getInputInvoice(id)
                    } catch (e) {
                      console.error(`Failed to fetch input invoice ${id}`, e)
                      return null
                    }
                  })
                )
                const validFetched = fetched.filter((inv): inv is InputInvoice => inv !== null)
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

  // API phiếu chi không có endpoint suggest-allocation (khác phiếu thu) →
  // gợi ý phân bổ FIFO phía FE: lấp đầy "còn phải trả" từng hóa đơn từ trên xuống
  const handleSuggestAllocation = useCallback(
    (totalAmount: number) => {
      if (!selectedInvoices.length) return
      if (!totalAmount) {
        toastService.info('Vui lòng nhập tổng số tiền ở phần Phương thức thanh toán')
        return
      }
      let remainingToAllocate = totalAmount
      const mappedInvoices = selectedInvoices.map((inv) => {
        const maxAllocatable = Math.max(0, inputInvoiceTotal(inv) - Number(inv.paid_amount ?? 0))
        const allocate = Math.max(0, Math.min(remainingToAllocate, maxAllocatable))
        remainingToAllocate -= allocate
        return {
          input_invoice: inv.id,
          allocated_amount: allocate > 0 ? String(allocate) : '',
          allocation_pct:
            maxAllocatable > 0
              ? String(Math.round((allocate / maxAllocatable) * 10000) / 100)
              : '0',
        }
      })
      setValue('invoices', mappedInvoices)
      toastService.success('Đã tự động phân bổ')
    },
    [selectedInvoices, setValue]
  )

  const goNext = useCallback(async () => {
    if (currentStep === 1) {
      const valid = await trigger(STEP1_FIELDS)
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
        const valid = await trigger(STEP1_FIELDS)
        if (!valid) return
      }
      setCurrentStep(step)
    },
    [currentStep, trigger]
  )

  const scrollToError = (errors: FieldErrors<PaymentVoucherWizardValues>) => {
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
    async (values: PaymentVoucherWizardValues) => {
      if (currentStep === 1) {
        await goNext()
        return
      }
      // F2 exchange: the voucher is built server-side from the ticked commissions, not
      // from the generic invoice-allocation payload.
      if (f2CollectActive) {
        await handleF2Save()
        return
      }
      const payload = toPaymentVoucherPayload(values)
      await onSubmit(payload)
    },
    [currentStep, goNext, onSubmit, f2CollectActive, handleF2Save]
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

  // For F2 the footer figures come from the collected selection (auto), not manual inputs.
  const footerTotalAmount = f2CollectActive ? f2Total : totalAmount
  // A settled F2 voucher carries no manual allocation on purpose, so `totalAllocated` is 0
  // and the footer read "Đã phân bổ 0 đ / 66.304.545 đ" on a voucher that is fully allocated.
  const footerTotalAllocated = f2CollectActive
    ? f2Total
    : inputInvoiceAllocationLocked
      ? totalAmount
      : totalAllocated

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
      <div className="flex flex-col gap-6 px-7 pb-24 xl:flex-row xl:items-start">
        <section className="min-w-0 flex-1">
          {/* Step content */}
          {currentStep === 1 && (
            <PaymentVoucherInfoStep
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
              onSuggestAllocation={handleSuggestAllocation}
              status={status}
              inputInvoiceAllocationLocked={inputInvoiceAllocationLocked}
              settledInvoices={settledInvoices}
              append={
                voucherId
                  ? {
                      candidates: appendCandidates,
                      selectedIds: appendSelectedIds,
                      isLoading: isLoadingCandidates,
                      isAppending,
                      onOpen: handleOpenAppend,
                      onToggle: (id: number) =>
                        setAppendSelectedIds((prev) =>
                          prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
                        ),
                      onToggleAll: () =>
                        setAppendSelectedIds((prev) =>
                          prev.length === (appendCandidates?.length ?? 0)
                            ? []
                            : (appendCandidates ?? []).map((r) => r.id)
                        ),
                      onConfirm: handleConfirmAppend,
                      onCancel: () => setAppendCandidates(null),
                    }
                  : undefined
              }
              onRemoveSettled={voucherId ? handleRemoveSettled : undefined}
              removingTierId={isRemoving ? removingTierId : null}
              f2={{
                enabled: f2CollectActive,
                isCollecting: isCollectingF2,
                hasCollected: f2Preview !== null,
                onCollect: handleCollectF2,
                rows: f2InvoiceRows,
                skipped: f2Preview?.skipped ?? [],
                selectedIds: f2SelectedInvoiceIds,
                onToggle: toggleF2Invoice,
                onToggleAll: toggleF2All,
                total: f2Total,
                netTotal: f2NetTotal,
              }}
            />
          )}

          <WizardFooter
            currentStep={currentStep}
            totalAllocated={footerTotalAllocated}
            totalAmount={footerTotalAmount}
            isSubmitting={f2CollectActive ? isSavingF2 : isSubmitting}
            onCancel={handleCancel}
            onBack={goBack}
            onNext={async () => {
              // We intercept onNext to perform validation and scroll to error if on Step 1
              if (currentStep === 1) {
                const valid = await trigger(STEP1_FIELDS)
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
          voucherCode={voucherCode}
          hideManualAllocation={f2CollectActive || !!inputInvoiceAllocationLocked}
          collectTotal={f2CollectActive ? f2Total : undefined}
        />
      </div>
    </form>
  )
}

export default PaymentVoucherWizard

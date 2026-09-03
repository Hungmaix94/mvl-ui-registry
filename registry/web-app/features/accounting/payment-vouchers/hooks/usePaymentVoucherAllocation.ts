import { useMemo, useState, useEffect, useRef } from 'react'
import {
  Control,
  UseFormGetValues,
  UseFormSetValue,
  UseFormWatch,
  useFormState,
} from 'react-hook-form'
import { useBankAccounts } from '@/features/accounting/bank-accounts/services/bank-account-service'
import {
  useInputInvoices,
  type InputInvoice,
} from '@/features/accounting/input-invoices/services/input-invoice-service'
import {
  usePaymentVoucherOffsetCandidates,
  type PaymentVoucherOffsetCandidate,
} from '../services/payment-voucher-service'
import { PayeeType } from '../constants/payment-voucher-constants'
import {
  buildPayeeInputInvoiceParams,
  inputInvoiceTotal,
} from '../utils/payment-voucher-wizard-utils'
import type { PaymentVoucherWizardValues } from '../schemas/payment-voucher-schema'
import { InputInvoiceStatus as InputInvoiceStatus } from '@/constants/api-schema-aliases'

type Props = {
  watch: UseFormWatch<PaymentVoucherWizardValues>
  setValue: UseFormSetValue<PaymentVoucherWizardValues>
  getValues: UseFormGetValues<PaymentVoucherWizardValues>
  control: Control<PaymentVoucherWizardValues>
  selectedInvoices: InputInvoice[]
  setSelectedInvoices: (invoices: InputInvoice[]) => void
}

export function usePaymentVoucherAllocation({
  watch,
  setValue,
  getValues,
  control,
  selectedInvoices,
  setSelectedInvoices,
}: Props) {
  const { errors } = useFormState({ control })
  const payeeType = watch('payee_type')
  const payeeEmployeeId = watch('payee_employee')
  const payeeCollaboratorId = watch('payee_collaborator')
  const payeeExchangeId = watch('payee_exchange')

  const { data: bankAccountsData } = useBankAccounts({ page_size: 50 })
  const bankAccountOptions = (bankAccountsData?.results ?? []).map((b) => ({
    value: String(b.id),
    label: `${b.account_number}${b.account_holder ? ` - ${b.account_holder}` : ''}${
      b.bank_name ? ` (${b.bank_name})` : ''
    }`,
  }))

  const { params: baseInvoiceParams, enabled: invoiceQueryEnabled } = buildPayeeInputInvoiceParams(
    payeeType,
    payeeEmployeeId ? Number(payeeEmployeeId) : null,
    payeeCollaboratorId ? Number(payeeCollaboratorId) : null,
    payeeExchangeId ? Number(payeeExchangeId) : null
  )

  const invoiceParams = useMemo(() => {
    return {
      ...baseInvoiceParams,
      status__in: [InputInvoiceStatus.VERIFIED, InputInvoiceStatus.PARTIAL],
    }
  }, [baseInvoiceParams])

  const { data: invoicesData, isLoading } = useInputInvoices(invoiceParams, {
    enabled: invoiceQueryEnabled,
  })

  const allInvoicesFromQuery = invoicesData?.results ?? []
  const allInvoices = useMemo(() => {
    const combined = [...allInvoicesFromQuery]
    const idsInQuery = new Set(allInvoicesFromQuery.map((inv) => inv.id))
    selectedInvoices.forEach((inv) => {
      if (!idsInQuery.has(inv.id)) {
        combined.push(inv)
      }
    })
    return combined
  }, [allInvoicesFromQuery, selectedInvoices])

  const invoicesForm = watch('invoices') ?? []
  const selectedIds = useMemo(
    () => new Set(selectedInvoices.map((inv) => inv.id)),
    [selectedInvoices]
  )

  const bankAmt = watch('bank_on') ? Number(watch('bank_amount') || 0) : 0
  const cashAmt = watch('cash_on') ? Number(watch('cash_amount') || 0) : 0
  const offsetAmt = watch('offset_on') ? Number(watch('offset_amount') || 0) : 0
  const totalAmount = bankAmt + cashAmt + offsetAmt
  const methodTotal = bankAmt + cashAmt

  const totalAllocated = useMemo(
    () => invoicesForm.reduce((s, l) => s + Number(l.allocated_amount ?? 0), 0),
    [invoicesForm]
  )
  const remaining = totalAmount - totalAllocated
  const isFullyAllocated = totalAmount > 0 && Math.abs(remaining) < 1

  // ── Cấn trừ: API chỉ hỗ trợ khi người nhận là Sàn giao dịch (payee_exchange) ──
  const isExchangePayee = payeeType === PayeeType.EXCHANGE && !!payeeExchangeId

  const { data: offsetCandidatesRaw, isLoading: isLoadingCandidates } =
    usePaymentVoucherOffsetCandidates(
      { payee_exchange: payeeExchangeId ? Number(payeeExchangeId) : 0 },
      { enabled: isExchangePayee }
    )

  const candidatesFromQuery: PaymentVoucherOffsetCandidate[] = useMemo(() => {
    const raw = offsetCandidatesRaw?.candidates ?? []
    return raw.map((c) => ({
      ...c,
      total_amount_with_vat: (c as any).total_amount_with_vat || c.total_amount || '0',
    })) as any
  }, [offsetCandidatesRaw])

  const [fetchedCandidates, setFetchedCandidates] = useState<PaymentVoucherOffsetCandidate[]>([])

  const lastCounterpartyRef = useRef<string | number | undefined>(undefined)
  const currentCounterpartyId =
    (payeeEmployeeId || payeeCollaboratorId || payeeExchangeId) ?? undefined

  useEffect(() => {
    if (
      lastCounterpartyRef.current !== undefined &&
      lastCounterpartyRef.current !== currentCounterpartyId
    ) {
      setFetchedCandidates([])
    }
    lastCounterpartyRef.current = currentCounterpartyId
  }, [currentCounterpartyId])

  // Tắt cấn trừ khi đối tác không phải Sàn (endpoint offset-candidates không hỗ trợ)
  const isOffsetOn = watch('offset_on')
  useEffect(() => {
    if (isOffsetOn && !isExchangePayee) {
      setValue('offset_on', false)
      setValue('offset_amount', '')
      setValue('offset_receivables', {})
      setValue('offset_invoices', [])
    }
  }, [isOffsetOn, isExchangePayee, setValue])

  const rawOffsetReceivables = watch('offset_receivables')
  const offsetReceivablesStr = JSON.stringify(rawOffsetReceivables || {})
  const offsetReceivables = useMemo(() => JSON.parse(offsetReceivablesStr), [offsetReceivablesStr])

  // Edit mode: hóa đơn bán đã cấn trừ trước đó có thể không còn trong danh sách candidates → fetch bù
  useEffect(() => {
    const checkedIds = Object.entries(offsetReceivables)
      .filter(([, checked]) => checked)
      .map(([id]) => Number(id))
      .filter((id) => !isNaN(id))

    const missingIds = checkedIds.filter(
      (id) =>
        !candidatesFromQuery.some((c) => c.invoice_id === id) &&
        !fetchedCandidates.some((c) => c.invoice_id === id)
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
                const inv = await service.getSalesInvoice(id)
                return {
                  invoice_id: inv.id,
                  invoice_code: inv.code,
                  invoice_date: inv.invoice_date ?? null,
                  total_amount: String(inv.total_amount ?? 0),
                  total_amount_with_vat: String(inv.total_amount_with_vat ?? inv.total_amount ?? 0),
                  paid_amount: String(inv.paid_amount ?? 0),
                  investor_id: null,
                  investor_tax_code: null,
                  lines: [],
                } as any
              } catch (e) {
                console.error(`Failed to fetch sales invoice ${id}`, e)
                return null
              }
            })
          )
          const validFetched = fetched.filter((c): c is PaymentVoucherOffsetCandidate => c !== null)
          if (validFetched.length > 0) {
            setFetchedCandidates((prev) => {
              const newItems = validFetched.filter(
                (vf) => !prev.some((p) => p.invoice_id === vf.invoice_id)
              )
              if (newItems.length === 0) return prev
              return [...prev, ...newItems]
            })
          }
        } catch (err) {
          console.error('Error fetching missing sales invoices:', err)
        }
      }
      fetchMissing()
    }
  }, [offsetReceivablesStr, candidatesFromQuery, fetchedCandidates, offsetReceivables])

  const allCandidates = useMemo(() => {
    const combined = [...candidatesFromQuery]
    const idsInQuery = new Set(candidatesFromQuery.map((c) => c.invoice_id))
    fetchedCandidates.forEach((c) => {
      if (!idsInQuery.has(c.invoice_id)) {
        combined.push(c)
      }
    })
    return combined
  }, [candidatesFromQuery, fetchedCandidates])

  const selectedCandidates = allCandidates.filter((c) => !!offsetReceivables[c.invoice_id])
  const totalReceivablesSelected = selectedCandidates.reduce(
    (s, c) =>
      s +
      Math.max(
        0,
        Number((c as any).total_amount_with_vat ?? c.total_amount ?? 0) - Number(c.paid_amount || 0)
      ),
    0
  )

  const offsetMatched = Math.min(totalAllocated, totalReceivablesSelected)

  // Đồng bộ checked map và tự động phân bổ số tiền cấn trừ vào các hóa đơn bán được chọn
  useEffect(() => {
    const checkedIds = Object.entries(offsetReceivables)
      .filter(([, checked]) => checked)
      .map(([id]) => Number(id))
      .filter((id) => !isNaN(id))

    const currentOffsetInvoices = getValues('offset_invoices') || []
    let remainingOffset = offsetMatched
    const nextOffsetInvoices = checkedIds.map((id) => {
      const c = allCandidates.find((item) => Number(item.invoice_id) === id)
      const cTotal = Number((c as any)?.total_amount_with_vat ?? c?.total_amount ?? 0)
      const cPaid = Number(c?.paid_amount ?? 0)
      const cRemaining = Math.max(0, cTotal - cPaid)

      const allocated = Math.min(remainingOffset, cRemaining)
      remainingOffset -= allocated

      const existing = currentOffsetInvoices.find((oi) => Number(oi.sales_invoice) === id)

      return {
        sales_invoice: id,
        allocated_amount: String(allocated),
        sales_invoice_detail:
          (c as any)?.sales_invoice_detail || c || existing?.sales_invoice_detail,
      }
    })

    const currentKeys = currentOffsetInvoices
      .map((oi) => {
        const detail = oi.sales_invoice_detail
        return `${oi.sales_invoice}:${oi.allocated_amount}:${detail?.total_amount_with_vat || ''}:${detail?.invoice_code || ''}`
      })
      .sort()
      .join(',')
    const nextKeys = nextOffsetInvoices
      .map((oi) => {
        const detail = oi.sales_invoice_detail
        return `${oi.sales_invoice}:${oi.allocated_amount}:${detail?.total_amount_with_vat || ''}:${detail?.invoice_code || ''}`
      })
      .sort()
      .join(',')

    if (currentKeys !== nextKeys) {
      setValue('offset_invoices', nextOffsetInvoices)
    }
  }, [offsetReceivablesStr, offsetMatched, allCandidates, getValues, setValue])

  useEffect(() => {
    if (isOffsetOn) {
      setValue('offset_amount', String(offsetMatched))
    }
  }, [offsetMatched, setValue, isOffsetOn])

  const getInvoiceValue = (invoiceId: number, field: 'allocated_amount' | 'allocation_pct') => {
    const found = invoicesForm.find((l) => l.input_invoice === invoiceId)
    return found?.[field] ?? ''
  }

  const setInvoiceValue = (
    invoiceId: number,
    field: 'allocated_amount' | 'allocation_pct',
    val: string,
    invoiceTotalAmt: number,
    paidAmt: number
  ) => {
    const remainingInvoice = invoiceTotalAmt - paidAmt

    const existing = invoicesForm.find((l) => l.input_invoice === invoiceId) || {
      input_invoice: invoiceId,
      allocated_amount: '',
      allocation_pct: '',
    }

    let allocated_amount = existing.allocated_amount
    let allocation_pct = existing.allocation_pct

    if (field === 'allocated_amount') {
      let v = Number(val) || 0
      if (remainingInvoice >= 0) {
        v = Math.max(0, Math.min(remainingInvoice, v))
      } else {
        v = Math.min(0, Math.max(remainingInvoice, v))
      }
      allocated_amount = val === '' ? '' : String(v)
      allocation_pct =
        val === ''
          ? ''
          : remainingInvoice !== 0
            ? String(Math.round((v / remainingInvoice) * 10000) / 100)
            : '0'
    } else {
      const p = Math.max(0, Math.min(100, Number(val) || 0))
      allocation_pct = val === '' ? '' : String(p)
      allocated_amount = val === '' ? '' : String(Math.round((remainingInvoice * p) / 100))
    }

    const newInvoices = invoicesForm.some((l) => l.input_invoice === invoiceId)
      ? invoicesForm.map((l) =>
          l.input_invoice === invoiceId ? { ...l, allocated_amount, allocation_pct } : l
        )
      : [...invoicesForm, { input_invoice: invoiceId, allocated_amount, allocation_pct }]

    setValue('invoices', newInvoices)
  }

  const toggleInvoice = (invoice: InputInvoice) => {
    const isSelected = selectedIds.has(invoice.id)
    if (isSelected) {
      setSelectedInvoices(selectedInvoices.filter((inv) => inv.id !== invoice.id))
      setValue(
        'invoices',
        invoicesForm.filter((l) => l.input_invoice !== invoice.id)
      )
      setValue(
        'selected_invoice_ids',
        selectedInvoices.filter((inv) => inv.id !== invoice.id).map((inv) => inv.id)
      )
    } else {
      setSelectedInvoices([...selectedInvoices, invoice])
      setValue('invoices', [
        ...invoicesForm,
        { input_invoice: invoice.id, allocated_amount: '', allocation_pct: '' },
      ])
      setValue('selected_invoice_ids', [...selectedInvoices.map((inv) => inv.id), invoice.id])
    }
  }

  const toggleAll = () => {
    if (selectedIds.size === allInvoices.length) {
      setSelectedInvoices([])
      setValue('selected_invoice_ids', [])
      setValue('invoices', [])
    } else {
      setSelectedInvoices(allInvoices)
      setValue(
        'selected_invoice_ids',
        allInvoices.map((inv) => inv.id)
      )
      const newInvoicesForm = [...invoicesForm]
      allInvoices.forEach((inv) => {
        if (!newInvoicesForm.some((l) => l.input_invoice === inv.id)) {
          newInvoicesForm.push({ input_invoice: inv.id, allocated_amount: '', allocation_pct: '' })
        }
      })
      setValue('invoices', newInvoicesForm)
    }
  }

  const setAllTo100 = () => {
    const newInvoicesForm = selectedInvoices.map((inv) => {
      const remainingAmt = inputInvoiceTotal(inv) - Number(inv.paid_amount ?? 0)
      return {
        input_invoice: inv.id,
        allocation_pct: '100',
        allocated_amount: String(remainingAmt),
      }
    })
    setValue('invoices', newInvoicesForm)
  }

  const payeeLabel = watch('payee_name') || 'đối tác'
  const allSelected = allInvoices.length > 0 && allInvoices.every((inv) => selectedIds.has(inv.id))
  const someSelected = allInvoices.some((inv) => selectedIds.has(inv.id)) && !allSelected

  return {
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
  }
}

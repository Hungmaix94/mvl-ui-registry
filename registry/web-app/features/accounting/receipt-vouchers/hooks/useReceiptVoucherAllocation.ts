import { useMemo, useState, useEffect, useRef } from 'react'
import {
  Control,
  UseFormGetValues,
  UseFormSetValue,
  UseFormWatch,
  useFormState,
} from 'react-hook-form'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import {
  useSalesInvoices,
  type SalesInvoice,
} from '@/features/accounting/sales-invoices/services/sales-invoice-service'
import { useOffsetCandidates } from '../services/receipt-voucher-service'
import { type InputInvoice } from '@/features/accounting/input-invoices/services/input-invoice-service'
import type { ReceiptVoucherFormValues } from '../schemas/receipt-voucher-schema'
import { SalesInvoiceStatus } from '@/constants/api-schema-aliases'

type Props = {
  watch: UseFormWatch<ReceiptVoucherFormValues>
  setValue: UseFormSetValue<ReceiptVoucherFormValues>
  getValues: UseFormGetValues<ReceiptVoucherFormValues>
  control: Control<ReceiptVoucherFormValues>
  selectedInvoices: SalesInvoice[]
  setSelectedInvoices: (invoices: SalesInvoice[]) => void
  isLoadingSuggest: boolean
  onSuggestAllocation: (totalAmount: number) => void
}

export function useReceiptVoucherAllocation({
  watch,
  setValue,
  getValues,
  control,
  selectedInvoices,
  setSelectedInvoices,
  isLoadingSuggest,
  onSuggestAllocation,
}: Props) {
  const { errors } = useFormState({ control })
  const payerType = watch('payer_type')
  const payerInvestorId = watch('payer_investor')
  const payerExchangeId = watch('payer_exchange')
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

  const { data: invoicesData, isLoading } = useSalesInvoices(
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
        (!!payerType &&
          payerType !== APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE.INVESTOR &&
          payerType !== APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE.EXCHANGE),
    }
  )

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
  const totalAmount = bankAmt + cashAmt

  const offsetAmt = watch('offset_on') ? Number(watch('offset_amount') || 0) : 0
  const totalAllocated = useMemo(() => {
    return invoicesForm.reduce((s, l) => s + Number(l.allocated_amount ?? 0), 0)
  }, [invoicesForm])
  // Phần đã tạm ứng không tham gia trần phân bổ ở FE: nó không nằm trong allocated_amount FE
  // gửi lên, BE mới cộng vào lúc post (khai một lần ở dòng đối chiếu).
  //
  // `remaining` là CHÊNH LỆCH THU, không còn là "còn thiếu phải bù cho đủ". Tiền mặt và mệnh
  // giá tất toán là hai số riêng: lệch vài đồng vì CĐT hoặc ngân hàng của họ làm tròn là bình
  // thường, và phân bổ ĐỦ mặt hoá đơn mới là cái giữ `ir_cash_ratio` về được 1.
  const remaining = totalAmount + offsetAmt - totalAllocated
  // "Đã phân bổ" giờ có nghĩa là ĐÃ NHẬP SỐ PHÂN BỔ, không phải "khớp tiền mặt". Ngưỡng 1đ cũ
  // là tàn dư của cổng ép bằng đã bỏ; giữ nó lại thì mọi phiếu có chênh lệch thu hợp lệ đều
  // hiện như đang sai.
  const isFullyAllocated = totalAllocated > 0
  const hasCollectionVariance = totalAllocated > 0 && remaining !== 0

  const payerCollaboratorId = watch('payer_collaborator')

  const { data: inputInvoicesDataRaw, isLoading: isLoadingInputInvoices } = useOffsetCandidates(
    {
      payer_investor:
        payerType === APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE.INVESTOR &&
        payerInvestorId
          ? Number(payerInvestorId)
          : undefined,
      payer_exchange:
        payerType === APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE.EXCHANGE &&
        payerExchangeId
          ? Number(payerExchangeId)
          : undefined,
      payer_collaborator:
        payerType === APP_CONSTANT_KEY.ACCOUNTING.RECEIPT_VOUCHER_PAYER_TYPE.COLLABORATOR &&
        payerCollaboratorId
          ? Number(payerCollaboratorId)
          : undefined,
    },
    { enabled: !!(payerInvestorId || payerExchangeId || payerCollaboratorId) }
  )

  const inputInvoicesData = useMemo<{ results: InputInvoice[] }>(() => {
    const rawCandidates = inputInvoicesDataRaw?.candidates ?? []

    const mapped: InputInvoice[] = rawCandidates.map((c) => {
      if (c && typeof c === 'object' && 'invoice_id' in c) {
        return {
          id: c.invoice_id,
          code: c.invoice_code || '',
          invoice_date: c.invoice_date || '',
          total_amount: c.total_amount || '0',
          total_amount_with_vat: (c as any).total_amount_with_vat || c.total_amount || '0',
          paid_amount: c.paid_amount || '0',
          remaining: String(
            Number((c as any).total_amount_with_vat || c.total_amount || 0) -
              Number(c.paid_amount || 0)
          ),
          exchange: c.exchange_id || null,
          attachments: [],
        } as unknown as InputInvoice
      }
      return c as unknown as InputInvoice
    })

    return { results: mapped }
  }, [inputInvoicesDataRaw])

  const [fetchedInputInvoices, setFetchedInputInvoices] = useState<InputInvoice[]>([])

  const lastCounterpartyRef = useRef<string | number | undefined>(undefined)
  const attemptedFetchIdsRef = useRef<Set<number>>(new Set())
  const currentCounterpartyId =
    (payerInvestorId || payerCollaboratorId || payerExchangeId) ?? undefined

  useEffect(() => {
    if (
      lastCounterpartyRef.current !== undefined &&
      (lastCounterpartyRef.current && currentCounterpartyId
        ? String(lastCounterpartyRef.current) !== String(currentCounterpartyId)
        : lastCounterpartyRef.current !== currentCounterpartyId)
    ) {
      setFetchedInputInvoices([])
      attemptedFetchIdsRef.current.clear()
    }
    lastCounterpartyRef.current = currentCounterpartyId
  }, [currentCounterpartyId])

  const rawOffsetPayables = watch('offset_payables')
  const offsetPayablesStr = JSON.stringify(rawOffsetPayables || {})
  const offsetPayables = useMemo(() => JSON.parse(offsetPayablesStr), [offsetPayablesStr])
  const offsetInvoices = watch('offset_invoices') || []

  useEffect(() => {
    const candidateIds = inputInvoicesData.results
      .map((c) => Number(c.id))
      .filter((id) => !isNaN(id))
    const checkedIds = Object.entries(offsetPayables)
      .filter(([, checked]) => checked)
      .map(([id]) => Number(id))
      .filter((id) => !isNaN(id))

    const allTargetIds = Array.from(new Set([...candidateIds, ...checkedIds]))

    const missingIds = allTargetIds.filter(
      (id) =>
        !fetchedInputInvoices.some((inv) => Number(inv.id) === id) &&
        !offsetInvoices.some(
          (oi: any) => Number(oi.input_invoice) === id && oi.input_invoice_detail
        ) &&
        !attemptedFetchIdsRef.current.has(id)
    )

    if (missingIds.length > 0) {
      missingIds.forEach((id) => attemptedFetchIdsRef.current.add(id))
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
          if (validFetched.length > 0) {
            setFetchedInputInvoices((prev) => {
              const newItems = validFetched.filter(
                (vf) => !prev.some((p) => Number(p.id) === Number(vf.id))
              )
              if (newItems.length === 0) return prev
              return [...prev, ...newItems]
            })
          }
        } catch (err) {
          console.error('Error fetching missing input invoices:', err)
        }
      }
      fetchMissing()
    }
  }, [offsetPayablesStr, inputInvoicesData.results, fetchedInputInvoices, offsetInvoices])

  const allInputInvoicesFromQuery = inputInvoicesData.results
  const allInputInvoices = useMemo(() => {
    const invoicesMap = new Map<number, any>()

    allInputInvoicesFromQuery.forEach((inv) => {
      invoicesMap.set(Number(inv.id), inv)
    })

    offsetInvoices.forEach((oi: any) => {
      if (oi.input_invoice_detail && !invoicesMap.has(Number(oi.input_invoice))) {
        const detail = oi.input_invoice_detail
        invoicesMap.set(Number(oi.input_invoice), {
          id: detail.id,
          code: detail.code,
          invoice_date: detail.invoice_date,
          total_amount: detail.total_amount_with_vat,
          total_amount_with_vat: detail.total_amount_with_vat,
          paid_amount: detail.paid_amount,
          remaining: String(
            Number(detail.total_amount_with_vat || 0) - Number(detail.paid_amount || 0)
          ),
          status: detail.status,
          attachments: [],
        })
      }
    })

    const fetchedMap = new Map(fetchedInputInvoices.map((inv) => [Number(inv.id), inv]))
    fetchedMap.forEach((inv, id) => {
      if (!invoicesMap.has(id)) {
        invoicesMap.set(id, inv)
      }
    })

    return Array.from(invoicesMap.values()).map((inv) => {
      const fetched = fetchedMap.get(Number(inv.id))
      return fetched || inv
    })
  }, [allInputInvoicesFromQuery, offsetInvoices, fetchedInputInvoices])

  const selectedInputInvoices = allInputInvoices.filter((inv) => !!offsetPayables[inv.id])
  const totalPayablesSelected = selectedInputInvoices.reduce(
    (s, inv) =>
      s +
      Math.max(
        0,
        Number(inv.total_amount_with_vat ?? inv.total_amount ?? 0) - Number(inv.paid_amount ?? 0)
      ),
    0
  )

  const horizontalOffset = Math.min(totalAllocated, totalPayablesSelected)

  // Synchronize checked map and allocate offset amount among selected input invoices
  useEffect(() => {
    const checkedIds = Object.entries(offsetPayables)
      .filter(([, checked]) => checked)
      .map(([id]) => Number(id))
      .filter((id) => !isNaN(id))

    const currentOffsetInvoices = getValues('offset_invoices') || []
    let remainingOffset = horizontalOffset
    const nextOffsetInvoices = checkedIds.map((id) => {
      const inv = allInputInvoices.find((item) => Number(item.id) === id)
      const invTotal = Number(inv?.total_amount_with_vat ?? inv?.total_amount ?? 0)
      const invPaid = Number(inv?.paid_amount ?? 0)
      const invRemaining = Math.max(0, invTotal - invPaid)

      const allocated = Math.min(remainingOffset, invRemaining)
      remainingOffset -= allocated

      const existingOffset = currentOffsetInvoices.find((oi) => Number(oi.input_invoice) === id)

      return {
        input_invoice: id,
        allocated_amount: String(allocated),
        input_invoice_detail:
          (inv as any)?.input_invoice_detail || inv || existingOffset?.input_invoice_detail,
      }
    })
    const currentKeys = currentOffsetInvoices
      .map((oi) => {
        const detail = oi.input_invoice_detail
        return `${oi.input_invoice}:${oi.allocated_amount}:${detail?.total_amount_with_vat || ''}:${detail?.code || ''}`
      })
      .sort()
      .join(',')
    const nextKeys = nextOffsetInvoices
      .map((oi) => {
        const detail = oi.input_invoice_detail
        return `${oi.input_invoice}:${oi.allocated_amount}:${detail?.total_amount_with_vat || ''}:${detail?.code || ''}`
      })
      .sort()
      .join(',')

    if (currentKeys !== nextKeys) {
      setValue('offset_invoices', nextOffsetInvoices)
    }
  }, [offsetPayablesStr, horizontalOffset, allInputInvoices, getValues, setValue])

  const isOffsetOn = watch('offset_on')
  const offsetAmount = watch('offset_amount')
  useEffect(() => {
    if (isOffsetOn && Number(offsetAmount ?? 0) !== horizontalOffset) {
      setValue('offset_amount', String(horizontalOffset))
    }
  }, [horizontalOffset, setValue, isOffsetOn, offsetAmount])

  const getInvoiceValue = (invoiceId: number, field: 'allocated_amount' | 'allocation_pct') => {
    const found = invoicesForm.find((l) => l.sales_invoice === invoiceId)
    return found?.[field] ?? ''
  }

  const setInvoiceValue = (
    invoiceId: number,
    field: 'allocated_amount' | 'allocation_pct',
    val: string,
    invoiceTotal: number,
    paidAmt: number
  ) => {
    const remainingInvoice = invoiceTotal - paidAmt

    const existing = invoicesForm.find((l) => l.sales_invoice === invoiceId) || {
      sales_invoice: invoiceId,
      allocated_amount: '',
      allocation_pct: '',
    }

    let allocated_amount = existing.allocated_amount
    let allocation_pct = existing.allocation_pct

    if (field === 'allocated_amount') {
      // Kẹp THEO DẤU của phần còn phải thu — bản cũ `Math.max(0, …)` kéo mọi số âm về 0, nên hoá đơn
      // mang dòng "Chênh lệch làm tròn" âm (BE PR #3239) không bao giờ phân bổ được. Đây đúng khuôn
      // `usePaymentVoucherAllocation` đã dùng cho hoá đơn đầu vào âm.
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

    const newInvoices = invoicesForm.some((l) => l.sales_invoice === invoiceId)
      ? invoicesForm.map((l) =>
          l.sales_invoice === invoiceId ? { ...l, allocated_amount, allocation_pct } : l
        )
      : [...invoicesForm, { sales_invoice: invoiceId, allocated_amount, allocation_pct }]

    setValue('invoices', newInvoices)
  }

  const toggleInvoice = (invoice: SalesInvoice) => {
    const isSelected = selectedIds.has(invoice.id)
    if (isSelected) {
      setSelectedInvoices(selectedInvoices.filter((inv) => inv.id !== invoice.id))
      setValue(
        'invoices',
        invoicesForm.filter((l) => l.sales_invoice !== invoice.id)
      )
      setValue(
        'selected_invoice_ids',
        selectedInvoices.filter((inv) => inv.id !== invoice.id).map((inv) => inv.id)
      )
    } else {
      const nextSelected = [...selectedInvoices, invoice]
      const nextInvoices = [
        ...invoicesForm,
        { sales_invoice: invoice.id, allocated_amount: '', allocation_pct: '' },
      ]
      setSelectedInvoices(nextSelected)
      setValue('invoices', nextInvoices)
      setValue(
        'selected_invoice_ids',
        nextSelected.map((inv) => inv.id)
      )
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
        if (!newInvoicesForm.some((l) => l.sales_invoice === inv.id)) {
          newInvoicesForm.push({ sales_invoice: inv.id, allocated_amount: '', allocation_pct: '' })
        }
      })
      setValue('invoices', newInvoicesForm)
    }
  }

  const setAllTo100 = () => {
    const newInvoicesForm = selectedInvoices.map((inv) => {
      const remainingAmt =
        Number(inv.total_amount_with_vat ?? inv.total_amount ?? 0) - Number(inv.paid_amount ?? 0)
      return {
        sales_invoice: inv.id,
        allocation_pct: '100',
        // Giữ dấu: "phân bổ 100%" của một hoá đơn âm là chính số âm đó, không phải 0.
        allocated_amount: String(remainingAmt),
      }
    })
    setValue('invoices', newInvoicesForm)
  }

  const payerLabel = watch('payer_name') || 'đối tác'
  const allSelected = allInvoices.length > 0 && allInvoices.every((inv) => selectedIds.has(inv.id))
  const someSelected = allInvoices.some((inv) => selectedIds.has(inv.id)) && !allSelected

  return {
    errors,
    isLoading,
    allInvoices,
    selectedIds,
    remaining,
    totalAmount,
    totalAllocated,
    isFullyAllocated,
    hasCollectionVariance,
    isLoadingSuggest,
    onSuggestAllocation,
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
  }
}

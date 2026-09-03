import { useCallback, useEffect, useMemo, useRef } from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useLocation, useNavigate } from 'react-router-dom'
import { Table } from '@radix-ui/themes'

import { Button, CurrencyInput, FullScreenLoading, Select, TextArea } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import { IconPlus, IconTrash, IconPencilsimple } from '@/assets/icons'
import FullCellNumberInput from '@/components/commons/FullCellNumberInput'
import { cn } from '@/utils'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { buildCounterpartyTypeOptions } from '@/features/accounting/input-invoices/utils/counterparty-type-options'
import { reconciliationSheetToPersist } from '@/features/accounting/input-invoices/utils/input-invoice-reconciliation-sheet'
import {
  ReconciliationStatus,
  InputInvoiceStatus as InputInvoiceStatus,
} from '@/constants/api-schema-aliases'
import {
  useCreateInputInvoice,
  useInputInvoice,
  useUpdateInputInvoice,
} from '@/features/accounting/input-invoices/services/input-invoice-service'
import type { InputInvoiceRequest } from '@/features/accounting/input-invoices/services/input-invoice-service'
import {
  inputInvoiceFormSchema,
  type InputInvoiceFormValues,
  DEFAULT_INPUT_INVOICE_FORM_VALUES,
  InputInvoiceCounterpartyType,
} from '@/features/accounting/input-invoices/types/input-invoice-types'
import { getRealEstateService } from '@/services/realestate-service'
import {
  useAccountingPeriods,
  useCurrentAccountingPeriod,
} from '@/features/accounting/accounting-periods/services/accounting-period-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery'
import { useExchangeSelect } from '@/hooks/useExchangeSelect'
import { useDealSelect } from '@/hooks/useDealSelect'
import { useCollaboratorSelect } from '@/hooks/useCollaboratorSelect'
import { useInvestorSelect } from '@/hooks/useInvestorSelect'
import {
  useF2ReconciliationSheets,
  useF2ReconciliationSheet,
} from '@/features/sales/f2-reconciliations/services/f2-reconciliation-service'
import {
  useInvestorReconciliationSheets,
  useInvestorReconciliationSheet,
} from '@/features/sales/investor-reconciliations/services/investor-reconciliation-service'
import {
  useCTVReconciliationSheets,
  useCTVReconciliationSheet,
} from '@/features/sales/ctv-reconciliations/services/ctv-reconciliation-sheet-service'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { formatCurrencyVND } from '@/utils/common'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'
import { APP_PATH } from '@/routes'
import { withRememberedSearch } from '@/utils/list-url-memory'

interface InputInvoiceFormProps {
  invoiceId?: number
}

export default function InputInvoiceForm({ invoiceId }: InputInvoiceFormProps) {
  const navigate = useNavigate()
  const isEditMode = !!invoiceId
  const isInitialized = useRef(false)
  // Ở chế độ sửa, chỉ nạp lại dòng từ phiếu đối chiếu khi người dùng tự đổi phiếu,
  // không phải lúc form khởi tạo (lúc đó dòng lấy thẳng từ hóa đơn).
  const sheetChangedByUser = useRef(false)

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: invoice, isLoading: isLoadingInvoice } = useInputInvoice(invoiceId ?? 0, {
    enabled: isEditMode,
  })
  const { data: periodsData } = useAccountingPeriods({ page_size: 100 })
  const { data: currentPeriod } = useCurrentAccountingPeriod({ enabled: !isEditMode })

  // ── Select helpers ────────────────────────────────────────────────────────
  const { loadExchangeOptions, loadInitialExchangeOptions } = useExchangeSelect({ valueType: 'id' })
  const { loadCollaboratorOptions, loadInitialCollaboratorOptions } = useCollaboratorSelect()
  const { loadInvestorOptions, loadInitialInvestorOptions, getCachedInvestorById } =
    useInvestorSelect({
      valueType: 'id',
    })
  const { loadDealOptions, loadInitialDealOptions } = useDealSelect()

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useCreateInputInvoice()
  const updateMutation = useUpdateInputInvoice()
  const invalidateQueries = useInvalidateQueries()

  // ── Derived options ───────────────────────────────────────────────────────
  const accountingPeriodOptions = useMemo(() => {
    const rawList = periodsData?.results || []
    const sorted = [...rawList].sort((a, b) => {
      if (a.year !== b.year) {
        return b.year - a.year
      }
      return b.month - a.month
    })
    return sorted.map((p) => ({
      value: p.id,
      label: `${p.year}/${String(p.month).padStart(2, '0')}`,
    }))
  }, [periodsData?.results])

  // ── Form setup ────────────────────────────────────────────────────────────
  const form = useForm<InputInvoiceFormValues>({
    resolver: zodResolver(inputInvoiceFormSchema) as any,
    mode: 'onTouched',
    defaultValues: DEFAULT_INPUT_INVOICE_FORM_VALUES,
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    setError,
    formState: { isSubmitting },
  } = form

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lines_write',
  })

  const watchedLines = watch('lines_write')
  const selectedExchange = watch('exchange')
  const selectedCollaborator = watch('collaborator')
  const selectedInvestor = watch('investor')
  const counterpartyType = watch('counterparty_type')

  // ── Đối tượng ─────────────────────────────────────────────────────────────
  // Cả nhãn lẫn tập giá trị đều của BE, form không tự đặt loại nào. Trước đây form giữ một
  // mảng 4 loại tự chế nên chào cả loại API không nhận (ClickUp 86eyr4wt3).
  //
  // Hai key khác DẠNG nên đọc bằng hai đường khác nhau:
  //   - `..._CHOICES` là `[{value: label}]` → `keysMapOptions` xử đúng.
  //   - `INPUT_INVOICE_MANUAL_COUNTERPARTY_TYPES` là MẢNG CHUỖI (`['SUPPLIER']`) → phải đọc
  //     thẳng từ `constants`; đưa vào `keys` thì `keysMap` chạy `Object.keys('SUPPLIER')` và
  //     dựng ra dữ liệu rác mà không báo lỗi.
  const { constants: accountingConstants, keysMapOptions } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.INPUT_INVOICE_COUNTERPARTY_TYPE_CHOICES],
  })

  const counterpartyTypeOptions = useMemo(
    () =>
      buildCounterpartyTypeOptions({
        isEditMode,
        allOptions:
          keysMapOptions.get(APP_CONSTANT_KEY.ACCOUNTING.INPUT_INVOICE_COUNTERPARTY_TYPE_CHOICES) ??
          [],
        allowedValues:
          accountingConstants?.[
            APP_CONSTANT_KEY.ACCOUNTING.INPUT_INVOICE_MANUAL_COUNTERPARTY_TYPES
          ],
        currentValue: counterpartyType,
      }),
    [isEditMode, keysMapOptions, accountingConstants, counterpartyType]
  )

  // ── Reconciliation sheet fetching ─────────────────────────────────────────
  const { data: f2SheetsData } = useF2ReconciliationSheets(
    {
      page_size: 100,
      exchange: selectedExchange ? Number(selectedExchange) : undefined,
      status: ReconciliationStatus.confirmed,
    },
    { enabled: counterpartyType === 'EXCHANGE' && selectedExchange != null }
  )

  const selectedSheetId = watch('f2_reconciliation_sheet')

  const { data: f2SheetDetail } = useF2ReconciliationSheet(selectedSheetId ?? 0, {
    enabled: counterpartyType === 'EXCHANGE' && !!selectedSheetId,
  })

  const { data: ctvSheetsData } = useCTVReconciliationSheets(
    {
      page_size: 100,
      collaborator: selectedCollaborator ? Number(selectedCollaborator) : undefined,
      status: ReconciliationStatus.confirmed,
    },
    { enabled: counterpartyType === 'COLLABORATOR' && selectedCollaborator != null }
  )

  const { data: ctvSheetDetail } = useCTVReconciliationSheet(selectedSheetId ?? 0, {
    enabled: counterpartyType === 'COLLABORATOR' && !!selectedSheetId,
  })

  const { data: investorSheetsData } = useInvestorReconciliationSheets(
    {
      page_size: 100,
      investor: selectedInvestor ? Number(selectedInvestor) : undefined,
      status: ReconciliationStatus.confirmed,
    },
    { enabled: counterpartyType === 'SUPPLIER' && selectedInvestor != null }
  )

  const { data: investorSheetDetail } = useInvestorReconciliationSheet(selectedSheetId ?? 0, {
    enabled: counterpartyType === 'SUPPLIER' && !!selectedSheetId,
  })

  const reconciliationSheetOptions = useMemo(() => {
    if (counterpartyType === 'EXCHANGE') {
      return (f2SheetsData?.results || []).map((s) => ({
        value: s.id,
        label: s.code ?? `Phiếu #${s.id}`,
      }))
    }
    if (counterpartyType === 'COLLABORATOR') {
      return (ctvSheetsData?.results || []).map((s) => ({
        value: s.id,
        label: s.code ?? `Phiếu #${s.id}`,
      }))
    }
    if (counterpartyType === 'SUPPLIER') {
      return (investorSheetsData?.results || []).map((s) => ({
        value: s.id,
        label: s.code ?? `Phiếu #${s.id}`,
      }))
    }
    return []
  }, [counterpartyType, f2SheetsData, ctvSheetsData, investorSheetsData])

  const location = useLocation()

  // ── Pre-fill on create from state ──────────────────────────────────────────
  useEffect(() => {
    if (!isEditMode && location.state && !isInitialized.current) {
      const state = location.state as any
      reset({
        ...DEFAULT_INPUT_INVOICE_FORM_VALUES,
        ...state,
      })
      isInitialized.current = true
    }
  }, [isEditMode, location.state, reset])

  // ── Pre-fill on edit ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isEditMode && invoice && !isInitialized.current) {
      reset({
        invoice_date: invoice.invoice_date ?? '',
        counterparty_type: invoice.counterparty_type as any,
        exchange: invoice.exchange ?? null,
        collaborator: invoice.collaborator ?? null,
        investor: null,
        supplier_name: invoice.supplier_name ?? '',
        f2_reconciliation_sheet: reconciliationSheetToPersist(
          invoice.counterparty_type as InputInvoiceCounterpartyType,
          invoice.f2_reconciliation_sheet
        ),
        total_amount: invoice.total_amount ?? 0,
        vat_rate: invoice.vat_rates ? Number(String(invoice.vat_rates).split(',')[0]) : 0,
        notes: invoice.notes ?? '',
        accounting_period: invoice.accounting_period ?? (undefined as any),
        // Đọc từ `lines` (API trả về), KHÔNG phải `lines_write` — field đó chỉ để ghi
        // nên luôn undefined khi đọc. Trước đây bảng dòng hiện trống ở màn sửa, và chỉ
        // cần bấm Lưu là payload gửi lines_write: [] khiến backend xóa sạch dòng.
        lines_write: (invoice.lines ?? []).map((l) => ({
          deal: l.deal ?? null,
          f2_reconciliation: l.f2_reconciliation ?? null,
          line_total: l.line_total ?? 0,
          description: l.description ?? '',
        })),
      })
      isInitialized.current = true
    }
  }, [isEditMode, invoice, reset])

  // ── Resolve investor in edit mode from investor sheet detail ───────────────
  useEffect(() => {
    if (counterpartyType === 'SUPPLIER' && investorSheetDetail?.investor_detail?.id) {
      const invId = investorSheetDetail.investor_detail.id
      if (watch('investor') !== invId) {
        setValue('investor', invId)
      }
    }
  }, [counterpartyType, investorSheetDetail, setValue, watch])

  // ── Resolve investor in edit mode from supplier_name ──────────────────────
  // Đây là đường DUY NHẤT tìm lại Chủ đầu tư của một hóa đơn SUPPLIER: phiếu đối chiếu CĐT
  // không được lưu trên hóa đơn (xem `reconciliationSheetToPersist`), nên effect phía trên
  // không có `investorSheetDetail` để đọc. Trước đây điều kiện còn đòi hóa đơn không mang
  // `f2_reconciliation_sheet` — đúng với hầu hết bản ghi, nhưng lại bỏ rơi đúng những hóa đơn
  // lỡ dính liên kết nhầm, tức nhóm cần tìm lại Chủ đầu tư nhất.
  useEffect(() => {
    if (
      isEditMode &&
      invoice &&
      invoice.counterparty_type === 'SUPPLIER' &&
      invoice.supplier_name &&
      !watch('investor')
    ) {
      getRealEstateService()
        .getInvestors({
          name: invoice.supplier_name,
        })
        .then((res) => {
          if (res?.results && res.results.length > 0) {
            const match = res.results[0]
            if (match && match.id) {
              setValue('investor', match.id)
            }
          }
        })
        .catch((err) => {
          console.error('[InputInvoiceForm] Error matching investor by name:', err)
        })
    }
  }, [isEditMode, invoice, setValue, watch])

  // ── Pre-fill current accounting period on create ──────────────────────────
  useEffect(() => {
    if (!isEditMode && currentPeriod?.id && !watch('accounting_period')) {
      setValue('accounting_period', currentPeriod.id, { shouldValidate: true })
    }
  }, [isEditMode, currentPeriod, setValue, watch])

  // ── Auto-prefill lines_write & total_amount from reconciliation sheet ──────
  useEffect(() => {
    // Ở chế độ sửa, bỏ qua lần khởi tạo: dòng đã được nạp từ chính hóa đơn. Chỉ nạp
    // lại khi người dùng chủ động đổi sang phiếu đối chiếu khác — trước đây effect
    // thoát sớm ở mọi trường hợp, nên đổi phiếu xong bảng dòng vẫn giữ dòng cũ.
    if (isEditMode && !sheetChangedByUser.current) return

    if (!selectedSheetId) {
      setValue('lines_write', [], { shouldValidate: true })
      setValue('total_amount', 0, { shouldValidate: true })
      return
    }

    let reconciliations: any[] = []
    let sheetCode = ''

    if (counterpartyType === 'EXCHANGE' && f2SheetDetail) {
      reconciliations = f2SheetDetail.reconciliations || []
      sheetCode = f2SheetDetail.code || ''
    } else if (counterpartyType === 'COLLABORATOR' && ctvSheetDetail) {
      reconciliations = ctvSheetDetail.reconciliations || []
      sheetCode = ctvSheetDetail.code || ''
    } else if (counterpartyType === 'SUPPLIER' && investorSheetDetail) {
      reconciliations = investorSheetDetail.reconciliations || []
      sheetCode = investorSheetDetail.code || ''
    }

    if (reconciliations.length > 0) {
      const newLines = reconciliations.map((r) => ({
        deal: r.deal ?? null,
        // Giữ lại dòng đối chiếu, không chỉ deal: một deal trải nhiều kỳ nên
        // neo theo deal sẽ lẫn tiền giữa các kỳ. Chỉ sàn F2 mới có dòng này.
        f2_reconciliation: counterpartyType === 'EXCHANGE' ? (r.id ?? null) : null,
        line_total: r.total_amount ? Number(r.total_amount) : 0,
        description: `Thanh toán đối chiếu ${sheetCode}${r.deal_detail?.code ? ` - Deal ${r.deal_detail.code}` : ''}`,
      }))

      setValue('lines_write', newLines, { shouldValidate: true })

      const sum = newLines.reduce((acc, curr) => acc + curr.line_total, 0)
      setValue('total_amount', sum, { shouldValidate: true })
    }
  }, [
    isEditMode,
    selectedSheetId,
    counterpartyType,
    f2SheetDetail,
    ctvSheetDetail,
    investorSheetDetail,
    setValue,
  ])

  // ── Derived totals ────────────────────────────────────────────────────────
  const linesTotal = useMemo(() => {
    return (watchedLines ?? []).reduce((sum, line) => sum + Number(line.line_total || 0), 0)
  }, [watchedLines])

  // ── Submit handler ────────────────────────────────────────────────────────
  const onSubmit = useCallback(
    async (values: InputInvoiceFormValues) => {
      try {
        // Hóa đơn của sàn: mọi dòng phải neo vào một dòng đối chiếu F2, vì đó là
        // thứ cho biết dòng thuộc kỳ nào. Dòng thêm tay không có chỗ chọn nên
        // luôn thiếu — chặn ngay tại form thay vì để BE trả lỗi tiếng Anh.
        if (values.counterparty_type === 'EXCHANGE') {
          const orphanLine = (values.lines_write ?? []).some((l) => !l.f2_reconciliation)
          if (orphanLine) {
            toastService.error(
              'Hóa đơn của sàn phải lấy dòng từ phiếu đối chiếu F2. Hãy chọn "Phiếu đối chiếu F2" ở trên để hệ thống điền các dòng, thay vì tự thêm dòng.'
            )
            return
          }
        }

        let supplierName = values.supplier_name
        if (values.counterparty_type === 'SUPPLIER' && values.investor) {
          const investorDetail = getCachedInvestorById(values.investor)
          if (investorDetail) {
            supplierName = investorDetail.name
          }
        }

        const payload: InputInvoiceRequest = {
          invoice_date: values.invoice_date,
          counterparty_type: values.counterparty_type,
          exchange: values.counterparty_type === 'EXCHANGE' ? (values.exchange ?? null) : null,
          collaborator:
            values.counterparty_type === 'COLLABORATOR' ? (values.collaborator ?? null) : null,
          supplier_name:
            values.counterparty_type === 'SUPPLIER' ? supplierName || undefined : undefined,
          f2_reconciliation_sheet: reconciliationSheetToPersist(
            values.counterparty_type,
            values.f2_reconciliation_sheet
          ),
          total_amount: values.total_amount ? String(values.total_amount) : undefined,
          notes: values.notes || undefined,
          accounting_period: values.accounting_period ?? null,
          lines_write: (values.lines_write ?? []).map((l) => ({
            deal: l.deal ?? null,
            f2_reconciliation: l.f2_reconciliation ?? null,
            line_total: String(l.line_total ?? 0),
            vat_rate: values.vat_rate ? String(values.vat_rate) : undefined,
            description: l.description || undefined,
          })),
        }

        if (isEditMode && invoiceId) {
          await updateMutation.mutateAsync({ id: invoiceId, data: payload })
          toastService.success('Cập nhật hóa đơn đầu vào thành công')
        } else {
          await createMutation.mutateAsync(payload)
          toastService.success('Tạo hóa đơn đầu vào thành công')
        }

        await invalidateQueries.invalidateByPrefix('accounting/input-invoices')
        navigate(APP_PATH.INPUT_INVOICE)
      } catch (error: unknown) {
        handleApiError(error, setError as any)
      }
    },
    [isEditMode, invoiceId, updateMutation, createMutation, invalidateQueries, navigate, setError]
  )

  const isEditable = useMemo(() => {
    if (!invoice) return true
    return (
      invoice.status === InputInvoiceStatus.DRAFT ||
      invoice.status === InputInvoiceStatus.RECEIVED ||
      invoice.status === InputInvoiceStatus.PENDING
    )
  }, [invoice])

  const isLinesEditable = useMemo(() => {
    if (!isEditMode) return true
    return (
      invoice?.status === InputInvoiceStatus.DRAFT || invoice?.status === InputInvoiceStatus.PENDING
    )
  }, [isEditMode, invoice])

  const handleCancel = useCallback(() => {
    navigate(withRememberedSearch(APP_PATH.INPUT_INVOICE))
  }, [navigate])

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isEditMode && isLoadingInvoice) {
    return <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
  }

  if (isEditMode && !invoice) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <p className="typo-body-base-regular text-content-dark-3">Không tìm thấy hóa đơn đầu vào</p>
        <Button type="button" variant="secondary" onClick={handleCancel}>
          Quay lại
        </Button>
      </div>
    )
  }

  if (isEditMode && invoice && !isEditable) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <p className="typo-body-base-regular text-content-dark-3 text-center">
          Hóa đơn đầu vào ở trạng thái <strong>{invoice.status}</strong> không thể chỉnh sửa.
          <br />
          Chỉ cho phép chỉnh sửa hóa đơn ở trạng thái <strong>Nháp (DRAFT)</strong> hoặc{' '}
          <strong>Đã nhận (RECEIVED)</strong>.
        </p>
        <Button type="button" variant="secondary" onClick={handleCancel}>
          Quay lại
        </Button>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Form
      handleSubmit={handleSubmit as any}
      onSubmit={onSubmit}
      onError={(errors) => console.log('[InputInvoiceForm] validation errors:', errors)}
      loading={isSubmitting}
    >
      <div className="flex w-full flex-col gap-8">
        {/* ─── Section 1: Thông tin chung ─── */}
        <div className="flex flex-col gap-6">
          <h2 className="typo-body-xl-semibold text-content-dark-1">Thông tin chung</h2>

          <div className="grid grid-cols-2 gap-5">
            <FormController
              register={register}
              name="counterparty_type"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Đối tượng',
                required: true,
                options: counterpartyTypeOptions,
                placeholder: 'Chọn đối tượng',
                value: watch('counterparty_type') ?? null,
                onChange: (next: string | string[] | null) => {
                  const raw = Array.isArray(next) ? next[0] : next
                  setValue('counterparty_type', raw as any, { shouldValidate: true })
                  setValue('exchange', null)
                  setValue('collaborator', null)
                  setValue('investor', null)
                  setValue('supplier_name', '')
                  setValue('f2_reconciliation_sheet', null)
                  setValue('lines_write', [])
                  setValue('total_amount', 0)
                },
              }}
            />

            <FormController
              register={register}
              name="invoice_date"
              control={control}
              Field={DatePicker}
              fieldProps={{
                label: 'Ngày hóa đơn',
                required: true,
                allowManualInput: true,
                clearable: true,
                placeholder: 'DD/MM/YYYY',
                value: parseDateFromApi(watch('invoice_date')),
                onChange: (val: string | null | undefined) =>
                  setValue('invoice_date', formatDateToApi(val ?? undefined), {
                    shouldValidate: true,
                  }),
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-5">
            <FormController
              register={register}
              name="accounting_period"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Kỳ kế toán',
                required: true,
                options: accountingPeriodOptions,
                placeholder: 'Chọn kỳ kế toán',
                enableSearch: true,
                value:
                  watch('accounting_period') != null ? String(watch('accounting_period')) : null,
                onChange: (next: string | string[] | null) => {
                  const raw = Array.isArray(next) ? next[0] : next
                  setValue('accounting_period', raw ? Number(raw) : (undefined as any), {
                    shouldValidate: true,
                  })
                },
              }}
            />

            {counterpartyType === 'EXCHANGE' && (
              <FormController
                register={register}
                name="exchange"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Sàn liên kết (Exchange)',
                  loadOptions: loadExchangeOptions,
                  loadInitialOptions: loadInitialExchangeOptions,
                  enableSearch: true,
                  clearable: true,
                  placeholder: 'Tìm kiếm sàn...',
                  value: watch('exchange') ?? null,
                  onChange: (next: string | string[] | null) => {
                    const raw = Array.isArray(next) ? next[0] : next
                    if (raw) {
                      setValue('exchange', Number(raw), { shouldValidate: true })
                      setValue('f2_reconciliation_sheet', null)
                    } else {
                      setValue('exchange', null, { shouldValidate: true })
                      setValue('f2_reconciliation_sheet', null)
                    }
                  },
                }}
              />
            )}

            {counterpartyType === 'COLLABORATOR' && (
              <FormController
                register={register}
                name="collaborator"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Cộng tác viên',
                  loadOptions: loadCollaboratorOptions,
                  loadInitialOptions: loadInitialCollaboratorOptions,
                  enableSearch: true,
                  clearable: true,
                  placeholder: 'Tìm kiếm cộng tác viên...',
                  value: watch('collaborator') ?? null,
                  onChange: (next: string | string[] | null) => {
                    const raw = Array.isArray(next) ? next[0] : next
                    if (raw) {
                      setValue('collaborator', Number(raw), { shouldValidate: true })
                      setValue('f2_reconciliation_sheet', null)
                    } else {
                      setValue('collaborator', null, { shouldValidate: true })
                      setValue('f2_reconciliation_sheet', null)
                    }
                  },
                }}
              />
            )}

            {counterpartyType === 'SUPPLIER' && (
              <FormController
                register={register}
                name="investor"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Chủ đầu tư',
                  loadOptions: loadInvestorOptions,
                  loadInitialOptions: loadInitialInvestorOptions,
                  enableSearch: true,
                  clearable: true,
                  placeholder: 'Tìm kiếm chủ đầu tư...',
                  value: watch('investor') ?? null,
                  onChange: (next: string | string[] | null) => {
                    const raw = Array.isArray(next) ? next[0] : next
                    if (raw) {
                      setValue('investor', Number(raw), { shouldValidate: true })
                      setValue('f2_reconciliation_sheet', null)
                    } else {
                      setValue('investor', null, { shouldValidate: true })
                      setValue('f2_reconciliation_sheet', null)
                    }
                  },
                }}
              />
            )}
          </div>

          {counterpartyType && counterpartyType !== 'EMPLOYEE' && (
            <div className="grid grid-cols-2 gap-5">
              <FormController
                register={register}
                name="f2_reconciliation_sheet"
                control={control}
                Field={Select}
                fieldProps={{
                  label:
                    counterpartyType === 'EXCHANGE'
                      ? 'Phiếu đối chiếu F2'
                      : counterpartyType === 'COLLABORATOR'
                        ? 'Phiếu đối chiếu CTV'
                        : 'Phiếu đối chiếu Chủ đầu tư',
                  options: reconciliationSheetOptions,
                  clearable: true,
                  placeholder:
                    counterpartyType === 'EXCHANGE'
                      ? 'Chọn phiếu đối chiếu F2'
                      : counterpartyType === 'COLLABORATOR'
                        ? 'Chọn phiếu đối chiếu CTV'
                        : 'Chọn phiếu đối chiếu Chủ đầu tư',
                  enableSearch: true,
                  // Hóa đơn đã qua giai đoạn nháp là chứng từ thuế: đổi phiếu đối chiếu
                  // sẽ đổi cả dòng lẫn số tiền, nên khóa hẳn thay vì để bấm được rồi
                  // không có gì xảy ra.
                  disabled: !isLinesEditable,
                  value: watch('f2_reconciliation_sheet') ?? null,
                  onChange: (next: string | string[] | null) => {
                    const raw = Array.isArray(next) ? next[0] : next
                    // Đánh dấu người dùng CHỦ ĐỘNG đổi phiếu, để effect prefill bên dưới
                    // nạp lại dòng — ở chế độ sửa nó cố tình bỏ qua lần khởi tạo đầu.
                    sheetChangedByUser.current = true
                    setValue('f2_reconciliation_sheet', raw ? Number(raw) : null, {
                      shouldValidate: true,
                    })
                  },
                }}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-5">
            <FormController<InputInvoiceFormValues, any>
              register={register}
              control={control}
              name="total_amount"
              Field={CurrencyInput}
              fieldProps={{
                label: 'Tổng tiền (VNĐ)',
                placeholder: '0',
                suffix: 'VNĐ',
              }}
            />

            <FormController<InputInvoiceFormValues, any>
              register={register}
              control={control}
              name="vat_rate"
              Field={CurrencyInput}
              fieldProps={{
                label: 'Thuế VAT (%)',
                placeholder: '10',
                suffix: '%',
              }}
            />
          </div>
        </div>

        <SeparatorHorizontal />

        {/* ─── Section 2: Chi tiết hóa đơn (Lines) ─── */}
        <div className="flex flex-col gap-6">
          <div className="flex items-center justify-between">
            <h2 className="typo-body-xl-semibold text-content-dark-1">Chi tiết hóa đơn</h2>
          </div>

          <div className="border-border-1 overflow-x-auto rounded-md border">
            <Table.Root>
              <Table.Header>
                <Table.Row className="bg-neutral-30">
                  <Table.ColumnHeaderCell className="border-border-1 w-[50px] border-r px-3 py-3 text-center">
                    <span className="typo-body-base-medium text-[#4B4B4B]">#</span>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="border-border-1 min-w-[200px] border-r px-3 py-3">
                    <span className="typo-body-base-medium text-[#4B4B4B]">Deal / Hợp đồng</span>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="border-border-1 min-w-[260px] border-r px-3 py-3">
                    <span className="typo-body-base-medium text-[#4B4B4B]">Mô tả</span>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="border-border-1 min-w-[160px] border-r px-3 py-3 text-right">
                    <span className="typo-body-base-medium text-[#4B4B4B]">Thành tiền (VNĐ)</span>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="w-[60px] px-3 py-3" />
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {fields.length === 0 && (
                  <Table.Row>
                    <Table.Cell colSpan={5} className="py-8 text-center text-gray-400">
                      {counterpartyType === 'EXCHANGE'
                        ? 'Chọn phiếu đối chiếu F2 ở trên để hệ thống điền các dòng.'
                        : 'Chưa có dòng nào. Nhấn "Thêm dòng" để bắt đầu.'}
                    </Table.Cell>
                  </Table.Row>
                )}
                {fields.map((fieldItem, index) => (
                  <Table.Row key={fieldItem.id} className="hover:bg-neutral-10">
                    {/* STT */}
                    <Table.Cell className="border-border-1 w-[50px] border-r px-3 py-2 text-center align-middle">
                      <span className="typo-body-sm-medium text-content-dark-3">{index + 1}</span>
                    </Table.Cell>

                    {/* Deal select */}
                    <Table.Cell className="border-border-1 border-r bg-white !p-0 align-top">
                      <Controller
                        name={`lines_write.${index}.deal`}
                        control={control}
                        render={({ field: lineField }) => (
                          <Select
                            loadOptions={loadDealOptions}
                            loadInitialOptions={loadInitialDealOptions}
                            enableSearch
                            clearable
                            disabled={!isLinesEditable}
                            value={lineField.value ?? null}
                            onChange={(next) => {
                              const raw = Array.isArray(next) ? next[0] : next
                              lineField.onChange(raw ? Number(raw) : null)
                            }}
                            placeholder={isLinesEditable ? 'Tìm deal...' : 'N/A'}
                            className="h-full min-h-[44px] w-full !rounded-none !border-transparent !bg-transparent outline-none ring-inset hover:ring-1 focus:ring-1 focus:ring-neutral-100"
                            wrapperClassName="h-full w-full !gap-0"
                          />
                        )}
                      />
                    </Table.Cell>

                    {/* Description */}
                    <Table.Cell className="border-border-1 border-r bg-white !p-0 align-top">
                      <Controller
                        name={`lines_write.${index}.description`}
                        control={control}
                        render={({ field: lineField }) => (
                          <div
                            className={cn(
                              'relative',
                              'flex items-center',
                              'h-full w-full',
                              isLinesEditable &&
                                'group/edit hover:bg-action-primary-red-default/5 cursor-pointer transition-colors focus-within:bg-[#FFF6F2]'
                            )}
                          >
                            {isLinesEditable && (
                              <div className="group-hover/edit:border-action-primary-red-default/30 group-focus-within/edit:border-action-primary-red-default pointer-events-none absolute inset-0 z-10 border border-dashed border-transparent transition-colors group-focus-within/edit:border-solid" />
                            )}
                            <input
                              {...lineField}
                              disabled={!isLinesEditable}
                              value={lineField.value ?? ''}
                              placeholder={isLinesEditable ? 'Nhập mô tả...' : ''}
                              className={cn(
                                'h-full min-h-[44px] w-full border-none bg-transparent px-3 py-0 text-left transition-colors outline-none focus:ring-0',
                                !isLinesEditable && 'cursor-not-allowed opacity-75'
                              )}
                            />
                            {isLinesEditable && (
                              <IconPencilsimple className="text-content-dark-4 group-hover/edit:text-action-primary-red-default pointer-events-none absolute top-1.5 right-1.5 z-30 hidden h-3.5 w-3.5 group-hover/edit:block" />
                            )}
                          </div>
                        )}
                      />
                    </Table.Cell>

                    {/* Line total */}
                    <Table.Cell className="border-border-1 border-r bg-white !p-0 align-top">
                      <Controller
                        name={`lines_write.${index}.line_total`}
                        control={control}
                        render={({ field: lineField }) => (
                          <FullCellNumberInput
                            className="h-full min-h-[44px] w-full border-none bg-transparent px-3 text-right ring-0 outline-none focus:ring-0"
                            suffix="VNĐ"
                            value={(lineField.value as number) ?? 0}
                            min={0}
                            isHideSuffix
                            disabled={!isLinesEditable}
                            onChange={(e) =>
                              lineField.onChange(
                                e.target.value === ''
                                  ? 0
                                  : Number(e.target.value.replace(/\D/g, ''))
                              )
                            }
                            variant={isLinesEditable ? 'editable' : 'default'}
                          />
                        )}
                      />
                    </Table.Cell>

                    {/* Remove */}
                    <Table.Cell className="w-[60px] px-3 py-2 text-center align-middle">
                      {isLinesEditable && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-data-red-default hover:text-data-red-hover flex items-center justify-center transition-colors"
                        >
                          <IconTrash className="h-4 w-4" />
                        </button>
                      )}
                    </Table.Cell>
                  </Table.Row>
                ))}

                {/* Summary footer */}
                {fields.length > 0 && (
                  <Table.Row className="bg-neutral-30">
                    <Table.Cell
                      colSpan={3}
                      className="border-border-1 border-r px-3 py-2 text-right"
                    >
                      <span className="typo-body-base-semibold text-content-dark-1">Tổng cộng</span>
                    </Table.Cell>
                    <Table.Cell className="border-border-1 border-r px-3 py-2 text-right">
                      <span className="typo-body-base-semibold text-content-dark-1">
                        {formatCurrencyVND(linesTotal)} ₫
                      </span>
                    </Table.Cell>
                    <Table.Cell />
                  </Table.Row>
                )}
              </Table.Body>
            </Table.Root>
            {/* Hóa đơn của sàn lấy dòng từ phiếu đối chiếu F2, không thêm tay: dòng tự
                thêm sẽ không có dòng đối chiếu nên không bao giờ chi được. */}
            {isLinesEditable && counterpartyType === 'EXCHANGE' && (
              <div className="border-border-1 border-t bg-white px-3 py-2.5">
                <p className="typo-body-sm-regular text-content-dark-3 text-center">
                  Các dòng bên trên lấy từ phiếu đối chiếu F2 đã chọn. Cần sửa số tiền thì sửa ở
                  phiếu đối chiếu, rồi quay lại đây.
                </p>
              </div>
            )}
            {isLinesEditable && counterpartyType !== 'EXCHANGE' && (
              <div className="border-border-1 border-t bg-white p-3">
                <button
                  type="button"
                  onClick={() => append({ deal: null, line_total: 0, description: '' })}
                  className="border-action-primary-blue-default bg-neutral-10 text-action-primary-blue-default hover:bg-neutral-20 hover:text-action-primary-blue-hover flex w-full items-center justify-center gap-2 rounded-md border border-dashed py-2.5 text-sm font-medium transition-colors"
                >
                  <IconPlus className="h-4 w-4" />
                  Thêm dòng mới
                </button>
              </div>
            )}
          </div>
        </div>

        <SeparatorHorizontal />

        {/* ─── Section 3: Thiết lập & Ghi chú ─── */}
        <div className="flex flex-col gap-6">
          <h2 className="typo-body-xl-semibold text-content-dark-1">Thiết lập &amp; Ghi chú</h2>

          <FormController
            register={register}
            name="notes"
            control={control}
            Field={TextArea}
            fieldProps={{
              label: 'Ghi chú',
              placeholder: 'Nhập ghi chú về hóa đơn...',
              rows: 4,
              maxCharacters: 2000,
              className: 'w-full',
            }}
          />
        </div>

        {/* ─── Action Buttons ─── */}
        <div className="border-border-1 flex justify-end gap-4 border-t pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="w-[150px]"
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={isSubmitting}
            disabled={isSubmitting}
            className="w-[150px]"
          >
            {isEditMode ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </div>
      </div>
    </Form>
  )
}

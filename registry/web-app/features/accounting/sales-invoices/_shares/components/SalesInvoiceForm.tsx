import { useCallback, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, FullScreenLoading, Select, TextArea, TextField } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import {
  type SalesInvoiceRequest,
  useCreateSalesInvoice,
  useSalesInvoice,
  useUpdateSalesInvoice,
} from '@/features/accounting/sales-invoices/services/sales-invoice-service'
import {
  salesInvoiceFormSchema,
  type SalesInvoiceFormValues,
  DEFAULT_SALES_INVOICE_FORM_VALUES,
  SOURCE_TYPE_OPTIONS,
} from '@/features/accounting/sales-invoices/types/sales-invoice-types'
import { useAccountingPeriods } from '@/features/accounting/accounting-periods/services/accounting-period-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery'
import { useInvestorSelect } from '@/hooks/useInvestorSelect'
import { useExchangeSelect } from '@/hooks/useExchangeSelect'
import {
  useInvestorReconciliationSheets,
  useInvestorReconciliationSheet,
} from '@/features/sales/investor-reconciliations/services/investor-reconciliation-service'
import { useInvestor, useExchange } from '@/services/realestate-service'
import { useAbility } from '@/lib/ability'
import { useScrollToError } from '@/hooks/useScrollToError.ts'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { formatDateToApi, parseDateFromApi } from '@/utils/date-utils'
import { parsePositiveInt, formatCurrencyVND } from '@/utils/common'
import { APP_PATH } from '@/routes'
import { withRememberedSearch } from '@/utils/list-url-memory'

interface SalesInvoiceFormProps {
  invoiceId?: number
}

/** Hiển thị dạng text thay cho input khi field bị khoá — dễ đọc hơn input disabled. */
function ReadOnlyField({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div className="flex w-full flex-col gap-2">
      <span className="typo-body-base-semibold text-neutral-90">{label}</span>
      <div className="typo-body-base-regular text-neutral-90 flex h-10 items-center">
        {value || <span className="text-neutral-70">—</span>}
      </div>
    </div>
  )
}

export default function SalesInvoiceForm({ invoiceId }: SalesInvoiceFormProps) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const ability = useAbility()
  const isEditMode = !!invoiceId
  const isInitialized = useRef(false)
  const isPeriodPrefilled = useRef(false)

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: invoice, isLoading: isLoadingInvoice } = useSalesInvoice(invoiceId ?? 0, {
    enabled: isEditMode,
  })
  const { data: periodsData } = useAccountingPeriods({ page_size: 100 })

  // ── Select helpers ────────────────────────────────────────────────────────
  const { loadInvestorOptions, loadInitialInvestorOptions } = useInvestorSelect({ valueType: 'id' })
  const { loadExchangeOptions, loadInitialExchangeOptions } = useExchangeSelect({ valueType: 'id' })

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useCreateSalesInvoice()
  const updateMutation = useUpdateSalesInvoice()
  const invalidateQueries = useInvalidateQueries()

  // ── Derived options ───────────────────────────────────────────────────────
  const accountingPeriodOptions = useMemo(
    () =>
      (periodsData?.results || []).map((p) => ({
        value: p.id,
        label: `${p.year}/${String(p.month).padStart(2, '0')}`,
      })),
    [periodsData?.results]
  )

  // ── Form setup ────────────────────────────────────────────────────────────
  const form = useForm<SalesInvoiceFormValues>({
    resolver: zodResolver(salesInvoiceFormSchema) as any,
    mode: 'onTouched',
    defaultValues: DEFAULT_SALES_INVOICE_FORM_VALUES,
  })

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    setError,
    formState: { isSubmitting, errors },
  } = form

  useScrollToError(errors)

  const selectedInvestor = watch('investor')
  const sourceType = watch('source_type')
  const selectedSourceExchange = watch('source_exchange')

  const { data: fullInvestorDetail } = useInvestor(selectedInvestor ? Number(selectedInvestor) : 0)
  const { data: sourceExchangeDetail } = useExchange(
    selectedSourceExchange ? Number(selectedSourceExchange) : 0
  )

  const { data: investorSheetsData, isLoading: isLoadingInvestorSheets } =
    useInvestorReconciliationSheets(
      {
        page_size: 100,
        investor: selectedInvestor ? Number(selectedInvestor) : undefined,
        source_type: sourceType ? (sourceType as any) : undefined,
        source_exchange:
          sourceType === 'F0' && selectedSourceExchange
            ? Number(selectedSourceExchange)
            : undefined,
      },
      {
        enabled: selectedInvestor != null,
      }
    )

  const investorSheetOptions = useMemo(
    () =>
      (investorSheetsData?.results || []).map((s) => ({
        value: s.id,
        label: (s as any).code ?? `Phiếu #${s.id}`,
      })),
    [investorSheetsData?.results]
  )

  const selectedReconciliationSheet = watch('investor_reconciliation_sheet')
  const { data: selectedSheetDetail } = useInvestorReconciliationSheet(
    selectedReconciliationSheet ? Number(selectedReconciliationSheet) : 0,
    { enabled: !!selectedReconciliationSheet }
  )
  const canViewReconciliationSheet = ability.can('retrieve', 'investor_reconciliation_sheet')

  // "Tổng tiền" luôn ăn theo số của Phiếu đối chiếu Chủ đầu tư — không cho user tự sửa.
  useEffect(() => {
    if (isEditMode) return
    if (selectedReconciliationSheet && selectedSheetDetail) {
      setValue('total_amount', Number(selectedSheetDetail.total_amount_with_vat) || 0, {
        shouldDirty: true,
      })
    } else if (!selectedReconciliationSheet) {
      setValue('total_amount', 0)
    }
  }, [isEditMode, selectedReconciliationSheet, selectedSheetDetail, setValue])

  // "Phiếu đối chiếu Chủ đầu tư" chỉ hiện khi đã chọn đủ Chủ đầu tư + Loại nguồn
  // (và Sàn F0 nếu Loại nguồn là "Qua sàn F0"). Ở chế độ edit luôn hiện để xem lại giá trị đã lưu.
  const canShowReconciliationSheet =
    isEditMode ||
    (!!selectedInvestor && !!sourceType && (sourceType !== 'F0' || !!selectedSourceExchange))

  // ── Pre-fill Kỳ kế toán từ URL (?year=&month=) khi tạo mới từ màn danh sách ──
  // User vẫn có thể tự chọn lại nếu cần.
  useEffect(() => {
    if (isEditMode || isPeriodPrefilled.current) return
    if (!periodsData?.results?.length) return

    const yearParam = parsePositiveInt(searchParams.get('year'))
    const monthParam = parsePositiveInt(searchParams.get('month'))
    if (yearParam && monthParam) {
      const matched = periodsData.results.find(
        (p) => p.year === yearParam && p.month === monthParam
      )
      if (matched) {
        setValue('accounting_period', matched.id, { shouldValidate: true })
      }
    }
    isPeriodPrefilled.current = true
  }, [isEditMode, periodsData, searchParams, setValue])

  // ── Pre-fill on edit ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isEditMode && invoice && !isInitialized.current) {
      reset({
        invoice_date: invoice.invoice_date ?? '',
        investor: invoice.investor ?? (undefined as any),
        source_type:
          (invoice.source_type as unknown as SalesInvoiceFormValues['source_type']) ?? null,
        source_exchange: (invoice as any).source_exchange ?? null,
        investor_reconciliation_sheet: invoice.investor_reconciliation_sheet ?? null,
        external_invoice_no: (invoice as any).external_invoice_no ?? '',
        replaces_invoice: (invoice as any).replaces_invoice ?? null,
        customer_name: invoice.customer_name ?? '',
        customer_tax_code: invoice.customer_tax_code ?? '',
        customer_address: invoice.customer_address ?? '',
        commission_period_year: invoice.commission_period_year ?? null,
        commission_period_month: invoice.commission_period_month ?? null,
        total_amount: invoice.total_amount ?? 0,
        notes: invoice.notes ?? '',
        attachment: invoice.attachments?.[0]?.view_url ?? null,
        accounting_period: invoice.accounting_period ?? (undefined as any),
      })
      isInitialized.current = true
    }
  }, [isEditMode, invoice, reset])

  // ── Submit handler ────────────────────────────────────────────────────────
  const onSubmit = useCallback(
    async (values: SalesInvoiceFormValues) => {
      if (!isEditMode && !values.investor_reconciliation_sheet) {
        toastService.error('Vui lòng chọn Phiếu đối chiếu Chủ đầu tư trước khi tạo hóa đơn')
        return
      }

      try {
        const payload: SalesInvoiceRequest = {
          invoice_date: values.invoice_date,
          investor: values.investor,
          source_type: (values.source_type ?? null) as any,
          source_exchange: values.source_exchange ?? null,
          investor_reconciliation_sheet: values.investor_reconciliation_sheet ?? null,
          external_invoice_no: values.external_invoice_no || undefined,
          replaces_invoice: values.replaces_invoice ?? null,
          customer_name: values.customer_name || undefined,
          customer_tax_code: values.customer_tax_code || undefined,
          customer_address: values.customer_address || undefined,
          // commission_period_year/month: BE force-syncs từ accounting_period — không gửi.
          total_amount:
            values.total_amount !== undefined && values.total_amount !== ''
              ? String(values.total_amount)
              : undefined,
          notes: values.notes || undefined,
          accounting_period: values.accounting_period,
          files:
            values.attachment &&
            (!invoice || values.attachment !== invoice.attachments?.[0]?.view_url)
              ? { attachments: [values.attachment] }
              : undefined,
          existing_files:
            values.attachment &&
            invoice &&
            values.attachment === invoice.attachments?.[0]?.view_url &&
            invoice.attachments?.[0]?.id
              ? { attachments: [invoice.attachments[0].id] }
              : undefined,
        }

        if (isEditMode && invoiceId) {
          await updateMutation.mutateAsync({ id: invoiceId, data: payload })
          toastService.success('Cập nhật hóa đơn bán ra thành công')
        } else {
          await createMutation.mutateAsync(payload)
          toastService.success('Tạo hóa đơn bán ra thành công')
        }

        await invalidateQueries.invalidateByPrefix('accounting/sales-invoices')
        navigate(APP_PATH.SALES_INVOICE)
      } catch (error: unknown) {
        handleApiError(error, setError as any)
      }
    },
    [isEditMode, invoiceId, updateMutation, createMutation, invalidateQueries, navigate, setError]
  )

  const handleCancel = useCallback(() => {
    navigate(withRememberedSearch(APP_PATH.SALES_INVOICE))
  }, [navigate])

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isEditMode && isLoadingInvoice) {
    return <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
  }

  if (isEditMode && !invoice) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-8">
        <p className="typo-body-base-regular text-content-dark-3">Không tìm thấy hóa đơn bán ra</p>
        <Button type="button" variant="secondary" onClick={handleCancel}>
          Quay lại
        </Button>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Form handleSubmit={handleSubmit as any} onSubmit={onSubmit} loading={isSubmitting}>
      <div className="flex w-full flex-col gap-8">
        {/* ─── Section 1: Thông tin chung ─── */}
        <div className="flex flex-col gap-6">
          <h2 className="typo-body-xl-semibold text-content-dark-1">Thông tin chung</h2>

          <div className="grid grid-cols-2 gap-5">
            {isEditMode ? (
              <ReadOnlyField
                label="Kỳ kế toán"
                value={
                  accountingPeriodOptions.find(
                    (o) => String(o.value) === String(watch('accounting_period'))
                  )?.label
                }
              />
            ) : (
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
            )}

            {/* CR 86eymkrqu: "Ngày hóa đơn" sửa được ở cả Tạo lẫn Sửa (trước đây màn Sửa khoá
                cứng thành text tĩnh). Màn Sửa chỉ vào được khi hóa đơn ở trạng thái Nháp, và BE
                đã nhận `invoice_date` trên update (không nằm trong `read_only_fields`). Kỳ kế toán
                vẫn read-only: BE chỉ suy kỳ từ ngày lúc TẠO (`PeriodLockMixin._resolve_period`
                chạy khi `accounting_period_id` rỗng), nên đổi ngày ở đây không kéo theo đổi kỳ.
                Khớp với hóa đơn đầu vào — `InputInvoiceForm` vốn không khoá field này. */}
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

          <div className={`grid gap-5 ${sourceType === 'F0' ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {isEditMode ? (
              <ReadOnlyField
                label="Chủ đầu tư"
                value={
                  fullInvestorDetail && `${fullInvestorDetail.code} - ${fullInvestorDetail.name}`
                }
              />
            ) : (
              <FormController
                register={register}
                name="investor"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Chủ đầu tư',
                  required: true,
                  loadOptions: loadInvestorOptions,
                  loadInitialOptions: loadInitialInvestorOptions,
                  enableSearch: true,
                  clearable: true,
                  placeholder: 'Tìm kiếm chủ đầu tư...',
                  value: watch('investor') ?? null,
                  onChange: (next: string | string[] | null) => {
                    const raw = Array.isArray(next) ? next[0] : next
                    setValue('investor', raw ? Number(raw) : (undefined as any), {
                      shouldValidate: true,
                    })
                    setValue('investor_reconciliation_sheet', null)
                  },
                }}
              />
            )}

            {isEditMode ? (
              <ReadOnlyField
                label="Loại nguồn"
                value={SOURCE_TYPE_OPTIONS.find((o) => o.value === sourceType)?.label}
              />
            ) : (
              <FormController
                register={register}
                name="source_type"
                control={control}
                Field={Select}
                fieldProps={{
                  label: 'Loại nguồn',
                  options: SOURCE_TYPE_OPTIONS as unknown as { value: string; label: string }[],
                  clearable: true,
                  placeholder: 'Chọn loại nguồn',
                  value: watch('source_type') ?? null,
                  onChange: (next: string | string[] | null) => {
                    const raw = Array.isArray(next) ? next[0] : next
                    setValue(
                      'source_type',
                      (raw as SalesInvoiceFormValues['source_type']) ?? null,
                      { shouldValidate: true }
                    )
                    setValue('source_exchange', null)
                    setValue('investor_reconciliation_sheet', null)
                  },
                }}
              />
            )}

            {sourceType === 'F0' &&
              (isEditMode ? (
                <ReadOnlyField label="Sàn F0" value={sourceExchangeDetail?.name} />
              ) : (
                <FormController
                  register={register}
                  name="source_exchange"
                  control={control}
                  Field={Select}
                  fieldProps={{
                    label: 'Sàn F0',
                    loadOptions: loadExchangeOptions,
                    loadInitialOptions: loadInitialExchangeOptions,
                    enableSearch: true,
                    clearable: true,
                    placeholder: 'Tìm kiếm sàn F0...',
                    value: watch('source_exchange') ?? null,
                    onChange: (next: string | string[] | null) => {
                      const raw = Array.isArray(next) ? next[0] : next
                      setValue('source_exchange', raw ? Number(raw) : null, {
                        shouldValidate: true,
                      })
                      setValue('investor_reconciliation_sheet', null)
                    },
                  }}
                />
              ))}
          </div>

          {canShowReconciliationSheet && (
            <div className="grid grid-cols-2 gap-5">
              {!isEditMode && !isLoadingInvestorSheets && investorSheetOptions.length === 0 ? (
                <div className="flex w-full flex-col gap-2">
                  <label className="typo-body-base-semibold text-neutral-90">
                    Phiếu đối chiếu Chủ đầu tư
                  </label>
                  <div className="border-data-red-default bg-data-light-grey-default flex h-10 items-center gap-3 rounded border px-3 py-2.5">
                    <span className="text-action-primary-red-default text-sm">
                      Hiện không có phiếu đối chiếu nào có thể chọn.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {isEditMode ? (
                    <ReadOnlyField
                      label="Phiếu đối chiếu Chủ đầu tư"
                      value={selectedSheetDetail?.code}
                    />
                  ) : (
                    <FormController
                      register={register}
                      name="investor_reconciliation_sheet"
                      control={control}
                      Field={Select}
                      fieldProps={{
                        label: 'Phiếu đối chiếu Chủ đầu tư',
                        options: investorSheetOptions,
                        clearable: true,
                        placeholder: 'Chọn phiếu đối chiếu Chủ đầu tư',
                        enableSearch: true,
                        value: watch('investor_reconciliation_sheet') ?? null,
                        onChange: (next: string | string[] | null) => {
                          const raw = Array.isArray(next) ? next[0] : next
                          const sheetId = raw ? Number(raw) : null
                          setValue('investor_reconciliation_sheet', sheetId, {
                            shouldValidate: true,
                          })
                          if (sheetId && fullInvestorDetail) {
                            setValue('customer_name', fullInvestorDetail.name ?? '', {
                              shouldDirty: true,
                            })
                            setValue('customer_tax_code', fullInvestorDetail.tax_code ?? '', {
                              shouldDirty: true,
                            })
                            setValue('customer_address', fullInvestorDetail.address ?? '', {
                              shouldDirty: true,
                            })
                          }
                        },
                      }}
                    />
                  )}
                  {selectedReconciliationSheet &&
                    canViewReconciliationSheet &&
                    selectedSheetDetail && (
                      <p className="text-xs text-gray-500">
                        Có thể xem chi tiết phiếu đối chiếu {selectedSheetDetail.code} tại{' '}
                        <a
                          href={APP_PATH.INVESTOR_RECONCILIATION_DETAIL.replace(
                            ':id',
                            String(selectedReconciliationSheet)
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 underline hover:text-blue-700"
                        >
                          đây
                        </a>
                        .
                      </p>
                    )}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <ReadOnlyField
                  label="Tổng tiền (VNĐ)"
                  value={`${formatCurrencyVND(watch('total_amount') || 0)} VNĐ`}
                />
                <p className="text-xs text-gray-500">
                  {isEditMode
                    ? 'Giá trị lấy theo Phiếu đối chiếu Chủ đầu tư đã liên kết với hóa đơn này.'
                    : 'Giá trị tương ứng với Phiếu đối chiếu Chủ đầu tư được chọn.'}
                </p>
              </div>
            </div>
          )}

          <FormController
            register={register}
            name="external_invoice_no"
            control={control}
            Field={TextField}
            fieldProps={{
              label: 'Số hóa đơn bên ngoài',
              placeholder: 'VD: HDBR-2024-001',
              maxLength: 100,
            }}
          />
        </div>

        <SeparatorHorizontal />

        {/* ─── Section 2: Thông tin khách hàng ─── */}
        <div className="flex flex-col gap-6">
          <h2 className="typo-body-xl-semibold text-content-dark-1">Thông tin khách hàng</h2>

          <div className="grid grid-cols-2 gap-5">
            {isEditMode ? (
              <ReadOnlyField label="Tên khách hàng" value={watch('customer_name')} />
            ) : (
              <FormController
                register={register}
                name="customer_name"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Tên khách hàng',
                  placeholder: 'Nhập tên khách hàng',
                  maxLength: 255,
                }}
              />
            )}

            {isEditMode ? (
              <ReadOnlyField label="Mã số thuế" value={watch('customer_tax_code')} />
            ) : (
              <FormController
                register={register}
                name="customer_tax_code"
                control={control}
                Field={TextField}
                fieldProps={{
                  label: 'Mã số thuế',
                  placeholder: 'Nhập mã số thuế',
                  maxLength: 50,
                }}
              />
            )}
          </div>

          {isEditMode ? (
            <ReadOnlyField label="Địa chỉ khách hàng" value={watch('customer_address')} />
          ) : (
            <FormController
              register={register}
              name="customer_address"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Địa chỉ khách hàng',
                placeholder: 'Nhập địa chỉ đầy đủ',
                maxLength: 500,
              }}
            />
          )}
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

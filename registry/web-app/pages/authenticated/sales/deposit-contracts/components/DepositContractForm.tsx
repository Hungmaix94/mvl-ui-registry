import { useCallback, useEffect, useState, forwardRef, useImperativeHandle, useRef } from 'react'
import { useForm, FormProvider, SubmitHandler, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'
import { Link } from 'react-router-dom'

import { Select, Button, CurrencyInput, TextArea, TextField, Text, Checkbox } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import FormController from '@/components/ui/form/FormController'
import { RadioGroup } from '@/components/ui/radio-group'
import { FileUpload } from '@/components/ui/file-upload/FileUpload'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { toast } from 'react-toastify'
import { useScrollToError } from '@/hooks/useScrollToError'
import useBankOptions from '@/hooks/useBankOptions'
import { handleApiError } from '@/utils/error-utils'

import {
  depositContractFormSchema,
  DepositContractFormValues,
  RATE_TYPE,
  CUSTOMER_TYPE,
  type CustomerType,
} from '@/features/sales/deposit-contracts/types/deposit-contract-form-types'
import {
  applyCommissionToForm,
  applyProductPriceToForm,
  clearBookingAutofill,
  extractSaleStaffIds,
} from '@/features/sales/deposit-contracts/utils/deposit-form-autofill'
import { type DepositContractDetail } from '@/features/sales/deposit-contracts/services/deposit-contract-service'
import { useFeeSupportProposalToggle } from '@/features/sales/deposit-contracts/hooks/useFeeSupportProposalToggle'

import { useInvestorSelect } from '@/hooks/useInvestorSelect'
import { useBookingContractLoadOptions } from '@/features/project/booking-contract/services/useBookingContractLoadOptions'
import CustomerSelectWithDialog from '@/features/project/booking-contract/components/CustomerSelectWithDialog'
import { getRealEstateService } from '@/services/realestate-service'
import { getSaleService, useCustomer } from '@/services/sales-service'
import { CommonSaleStaffTable } from '@/features/sales/components/SaleStaffCommissionTable/SaleStaffCommissionTable'
import { CustomerPreviewBox } from '@/features/sales/components/CustomerPreviewBox'
import { ConfirmationLogsTable } from '@/features/sales/components/ConfirmationLogsTable'
import { ProjectPreviewBox } from '@/features/sales/components/ProjectPreviewBox'
import { DisplayField } from '@/components/commons/DisplayField'
import { formatCurrencyVND } from '@/utils/common'
import { IconEye } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { DepositContractPaymentMethod } from '@/constants/api-schema-aliases'
import { TRANSFER_TO_ACCOUNT_OPTIONS } from '@/features/project/refund-booking/types/refund-payment-types'

/**
 * 86eyqr9e0 — reset do HỆ THỐNG chạy (gỡ autofill khi bỏ HĐ đặt chỗ liên quan) thì KHÔNG validate.
 *
 * `useForm` dưới đây không khai `mode` ⇒ RHF mặc định `mode: 'onSubmit'`, và `reValidateMode` chỉ
 * có hiệu lực SAU lần submit đầu. Nên một `setValue(..., { shouldValidate: true })` chạy trước khi
 * user bấm Lưu sẽ bắn lỗi rồi **kẹt luôn**: user chọn lại giá trị, `field.onChange` không re-validate,
 * lỗi cũ vẫn nằm đó — màn hình vừa hiện giá trị đã chọn vừa báo "Vui lòng chọn ...".
 *
 * Validate lúc submit không đổi: thiếu field bắt buộc vẫn bị chặn như cũ.
 */
const VALIDATE_OFF = { shouldValidate: false } as const

export type DepositContractFormRef = {
  setError: (
    name: keyof DepositContractFormValues | string,
    error: { type?: string; message: string }
  ) => void
}

type DepositContractFormProps = {
  initialValues?: Partial<DepositContractFormValues>
  isEdit?: boolean
  /** HĐ cọc đã lưu (màn sửa) — cho luồng checkbox đề xuất hỗ trợ phí (phiếu liên kết + prefill). */
  depositContract?: DepositContractDetail
  onSubmit: (values: DepositContractFormValues) => Promise<void> | void
  onCancel: () => void
  isSubmitting?: boolean
}

export const DepositContractForm = forwardRef<DepositContractFormRef, DepositContractFormProps>(
  ({ initialValues, onSubmit, onCancel, isSubmitting, isEdit, depositContract }, ref) => {
    const form = useForm<DepositContractFormValues>({
      resolver: zodResolver(depositContractFormSchema) as any,
      defaultValues: {
        contract_date: new Date(),
        sales_staff: [],
        customer: null,
        investor: null,
        project: null,
        product_inventory: null,
        registration_amount: undefined,
        pct_sale_commission: undefined,
        amt_sale_commission: undefined,
        sale_commission_type: RATE_TYPE.PCT,
        pct_revenue: undefined,
        amt_revenue: undefined,
        revenue_type: RATE_TYPE.PCT,
        pct_agency_fee: undefined,
        has_fee_support_proposal: false,
        // CR STT24: seed id file cũ ngay từ đầu để validate "bắt buộc đính kèm" không phụ
        // thuộc vào thời điểm FileUpload emit `onKeptExistingIdsChange`.
        kept_attachment_ids:
          initialValues?.attachments_detail?.map((a: { id: number }) => a.id) ?? [],
        ...initialValues,
        // Hình thức thanh toán chỉ bắt buộc khi có tiền bổ sung > 0.
        payment_method: initialValues?.payment_method ?? undefined,
      },
    })

    const { keysMapOptions } = useAppConstant({
      keys: [
        APP_CONSTANT_KEY.SALES.CUSTOMER.TYPE,
        APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.PAYMENT_METHOD_CHOICES,
      ],
    })

    const customerTypeOptions = keysMapOptions.get(APP_CONSTANT_KEY.SALES.CUSTOMER.TYPE) || []
    const paymentMethodOptions =
      keysMapOptions.get(APP_CONSTANT_KEY.SALES.DEPOSIT_CONTRACT.PAYMENT_METHOD_CHOICES) || []
    // payment_method bắt buộc → radio 2 lựa chọn; fallback khi app-constant chưa có.
    const paymentOptions =
      paymentMethodOptions.length > 0
        ? paymentMethodOptions
        : [
            {
              value: DepositContractPaymentMethod.cash,
              label: 'Tiền mặt',
            },
            {
              value: DepositContractPaymentMethod.transfer,
              label: 'Chuyển khoản',
            },
          ]

    const ability = useAbility()
    const canViewBooking = ability.can('retrieve', 'booking')

    // Local state to toggle customer type search
    const [customerType, setCustomerType] = useState<CustomerType>(
      (initialValues as { customer_type?: CustomerType })?.customer_type || CUSTOMER_TYPE.INDIVIDUAL
    )
    const [isCastingBooking, setIsCastingBooking] = useState(false)
    const [allowedProductIds, setAllowedProductIds] = useState<number[]>([])
    // Track booking code for display in Mã hợp đồng

    const {
      register,
      control,
      handleSubmit,
      watch,
      setValue,
      setError,
      formState: { errors, isSubmitting: isFormSubmitting },
    } = form

    // Xem docs/ai/conventions.md § Chống double-submit. `isSubmitting` từ page là
    // `isPending` của mutation — chỉ bật khi `mutateAsync` được gọi, tức SAU toàn bộ
    // validate + async pre-work. Gộp thêm cờ của RHF để nút khoá ngay từ tick đầu.
    // Cố ý chỉ áp cho nút footer, không áp cho `disabled` của các field bên trên —
    // khoá field trong lúc validate chỉ gây nhấp nháy, không thêm an toàn.
    const isBusy = isSubmitting || isFormSubmitting

    useScrollToError(errors)

    const { bankOptions } = useBankOptions(watch('source_bank_name'))

    // Điều phối checkbox "đề xuất hỗ trợ phí bán hàng" (dialog Có/Để sau, tạo phiếu
    // inline, luồng bỏ tick + withdraw). Màn tạo mới: tick im lặng.
    const feeSupportToggle = useFeeSupportProposalToggle({
      isEdit: !!isEdit,
      depositContract,
      isChecked: !!watch('has_fee_support_proposal'),
      setChecked: (value) =>
        setValue('has_fee_support_proposal', value, { shouldDirty: true, shouldValidate: true }),
    })

    useImperativeHandle(ref, () => ({
      setError: setError as any,
    }))

    const watchInvestorId = watch('investor')
    const watchProjectId = watch('project')
    const watchBookingIds = watch('booking_ids')
    const watchContractDate = watch('contract_date')

    const watchCustomerId = watch('customer')
    const hasInitialBooking = !!(initialValues?.booking_ids && initialValues.booking_ids.length > 0)

    const { data: customerData } = useCustomer(Number(watchCustomerId))

    // ─── Cascading clear logic ──────────────────────────────────────────────
    const [selectedProductInfo, setSelectedProductInfo] = useState<any>(null)

    useEffect(() => {
      if (initialValues?.product_inventory) {
        getRealEstateService()
          .getProductInventory(initialValues.product_inventory)
          .then(setSelectedProductInfo)
          .catch(() => {})
      }
    }, [initialValues?.product_inventory])

    const [selectedProjectData, setSelectedProjectData] = useState<any>(null)

    useEffect(() => {
      if (initialValues?.project) {
        getRealEstateService()
          .getProject(initialValues.project)
          .then(setSelectedProjectData)
          .catch(() => {})
      }
    }, [initialValues?.project])

    useEffect(() => {
      // If investor is cleared, clear project and product_inventory
      if (!watchInvestorId) {
        setValue('project', null)
        setValue('booking_ids', [])
        setValue('product_inventory', null)
      }
    }, [watchInvestorId, setValue])

    useEffect(() => {
      // If project is cleared, clear product_inventory
      if (!watchProjectId) {
        setValue('booking_ids', [])
        setValue('product_inventory', null)
      }
    }, [watchProjectId, setValue])

    const hasInitialBookingAutofilled = useRef(false)

    const handleBookingIdsChange = useCallback(
      async (val: any, isInitial = false) => {
        const currentIds = watchBookingIds || []

        // Catch cross-adding items that violate constraints
        if (val && Array.isArray(val) && val.length > currentIds.length && currentIds.length > 0) {
          const newId = val.find((id: number) => !currentIds.includes(id))

          if (newId && watchProjectId) {
            setIsCastingBooking(true)
            try {
              const newBooking = await getSaleService().getBooking(newId)
              if (newBooking.project_detail?.id !== watchProjectId) {
                toast.error('Hợp đồng đặt chỗ liên quan phải có cùng Dự án!')
                return // Abort selection
              }
            } catch (e) {
              console.error('Failed to validate new booking', e)
              return // Abort selection on error
            } finally {
              setIsCastingBooking(false)
            }
          }
        }

        setValue('booking_ids', val, { shouldValidate: true })
        if (val && Array.isArray(val) && val.length > 0) {
          setIsCastingBooking(true)

          try {
            // Fetch all selected bookings first
            const allSelectedBookings = await Promise.all(
              val.map((id: number) => getSaleService().getBooking(id))
            )
            const booking = allSelectedBookings[0]

            if (!isInitial) {
              if (booking.customer_detail?.id) {
                setValue('customer', booking.customer_detail.id, { shouldValidate: true })
                try {
                  const cType = booking.cust_customer_type
                  if (cType === CUSTOMER_TYPE.INDIVIDUAL || cType === CUSTOMER_TYPE.BUSINESS) {
                    setCustomerType(cType)
                  } else {
                    const customer = await getSaleService().getCustomer(booking.customer_detail.id)
                    if (
                      customer.customer_type === CUSTOMER_TYPE.INDIVIDUAL ||
                      customer.customer_type === CUSTOMER_TYPE.BUSINESS
                    ) {
                      setCustomerType(customer.customer_type)
                    } else {
                      setCustomerType(CUSTOMER_TYPE.INDIVIDUAL)
                    }
                  }
                } catch (e) {
                  console.error('Failed to resolve customer type', e)
                }
              } else {
                // 86eyqr9e0: cùng lỗi dính như nhánh gỡ autofill — booking không kèm khách hàng thì
                // để ô trống, đừng bắn lỗi trước khi user bấm Lưu (xem VALIDATE_OFF ở đầu file).
                setValue('customer', null, VALIDATE_OFF)
              }

              if (booking.investor_detail?.id) {
                setValue('investor', booking.investor_detail.id, { shouldValidate: true })
              } else {
                setValue('investor', null, { shouldValidate: true })
              }

              if (booking.project_detail?.id) {
                setValue('project', booking.project_detail.id, { shouldValidate: true })
                try {
                  const proj = await getRealEstateService().getProject(booking.project_detail.id)
                  setSelectedProjectData(proj)
                } catch (e) {
                  console.error('Failed to resolve project details', e)
                }
              } else {
                setValue('project', null, { shouldValidate: true })
              }
            }

            const prodIds = allSelectedBookings
              .map((b) => b.product_inventory_detail?.id)
              .filter(Boolean) as number[]
            const uniqueProdIds = Array.from(new Set(prodIds))

            let localPctSaleCommission = 0
            let localAmtSaleCommission: number | undefined
            if (uniqueProdIds.length === 1) {
              const piId = uniqueProdIds[0]
              if (!isInitial) {
                setValue('product_inventory', piId, { shouldValidate: true })
              }
              // Chạy song song product + commission; bắt lỗi độc lập để một request hỏng
              // không chặn autofill của request kia.
              const productPromise = getRealEstateService().getProductInventory(piId)
              const commissionPromise =
                getRealEstateService().getProductInventoryCurrentCommission(piId)
              try {
                const product = await productPromise
                setSelectedProductInfo(product)
                if (!isInitial) applyProductPriceToForm(setValue, product)
              } catch (e) {
                console.error('Failed to fetch product details for autofill', e)
              }
              try {
                const commissionData = await commissionPromise
                const resolved = applyCommissionToForm(setValue, commissionData?.current_commission)
                if (resolved?.pct != null) localPctSaleCommission = resolved.pct
                if (resolved?.amt != null) localAmtSaleCommission = resolved.amt
              } catch (e) {
                console.error('Failed to fetch product commission', e)
              }
            } else {
              setValue('product_inventory', null, { shouldValidate: true })
              setValue('listed_price', undefined, { shouldValidate: true })
              setValue('fee_calculation_price', undefined, { shouldValidate: true })
              setValue('pct_sale_commission', undefined, { shouldValidate: true })
              setValue('amt_sale_commission', undefined, { shouldValidate: true })
              setValue('sale_commission_type', RATE_TYPE.PCT, { shouldValidate: true })
              setValue('pct_revenue', undefined, { shouldValidate: true })
              setValue('amt_revenue', undefined, { shouldValidate: true })
              setValue('revenue_type', undefined, { shouldValidate: true })
              setSelectedProductInfo(null)
            }

            setAllowedProductIds(prodIds)

            // Prefill AMOUNTS - Sum payment_amount from all selected bookings
            const totalPaymentAmount = allSelectedBookings.reduce((sum, b) => {
              return sum + (b.payment_amount ? Number(b.payment_amount) : 0)
            }, 0)

            if (totalPaymentAmount > 0) {
              setValue('registration_amount', totalPaymentAmount, {
                shouldValidate: true,
              })
            } else if (
              booking.payment_amount !== undefined &&
              booking.payment_amount !== null &&
              Number(booking.payment_amount) > 0
            ) {
              setValue('registration_amount', Number(booking.payment_amount), {
                shouldValidate: true,
              })
            } else {
              setValue('registration_amount', undefined as unknown as number, {
                shouldValidate: false,
              })
            }
            // Always reset supplementary_amount to 0 or leave undefined since it's an extra deposit amount
            setValue('supplementary_amount', 0, { shouldValidate: true })

            const allSalesMap = new Map<string, any>()

            allSelectedBookings.forEach((b: any) => {
              if (b.sales_staff && Array.isArray(b.sales_staff)) {
                b.sales_staff.forEach((sale: any) => {
                  const { empId, exchId, colId } = extractSaleStaffIds(sale)
                  const key = `${sale.sale_type}_${empId}_${exchId}_${colId}`
                  if (!allSalesMap.has(key)) {
                    allSalesMap.set(key, sale)
                  }
                })
              }
            })

            const mergedSalesArray = Array.from(allSalesMap.values())

            const isSingleBooking = allSelectedBookings.length === 1

            const mappedSales = mergedSalesArray.map((sale: any) => {
              // Chia đều 100% cho n dòng, làm tròn 2 chữ số thập phân (10000/n rồi /100).
              const updatedPercentage = Math.floor(10000 / mergedSalesArray.length) / 100
              const percentage =
                isSingleBooking && sale.participation_percentage != null
                  ? Number(sale.participation_percentage)
                  : updatedPercentage

              const { empId, exchId, colId } = extractSaleStaffIds(sale)

              return {
                sale_type: sale.sale_type,
                employee: empId,
                exchange: exchId,
                collaborator: colId,
                collaborator_name: sale.collaborator_name,

                percentage: percentage,
                pct_commission:
                  sale.pct_commission != null
                    ? Number(sale.pct_commission)
                    : localAmtSaleCommission != null
                      ? undefined
                      : localPctSaleCommission,
                amt_commission:
                  sale.amt_commission != null
                    ? Number(sale.amt_commission)
                    : localAmtSaleCommission,
                employee_detail: sale.employee_detail || sale.employee,
                exchange_detail: sale.exchange_detail || sale.exchange,
                collaborator_detail: sale.collaborator_detail || sale.collaborator,
                ctv_line_type: sale.ctv_line_type || undefined,
                ctv_line_employee_id: sale.ctv_line_employee_id || undefined,
                ctv_line_department_id: sale.ctv_line_department_id || undefined,
                ctv_line: sale.ctv_line,
                collaborator_id: colId,
                count_as_line_revenue: sale.count_as_line_revenue,
                f2_source: sale.f2_source || undefined,
                f2_source_director_id:
                  sale.f2_source_director_id ?? sale.f2_source_director_detail?.id ?? undefined,
                f2_source_director_detail: sale.f2_source_director_detail || undefined,
              }
            })

            if (mappedSales.length > 0) {
              const sum = mappedSales.reduce((acc, s) => acc + s.percentage, 0)
              mappedSales[mappedSales.length - 1].percentage = Number(
                (mappedSales[mappedSales.length - 1].percentage + (100 - sum)).toFixed(2)
              )
              setValue('sales_staff', mappedSales, { shouldValidate: true })
            } else {
              setValue('sales_staff', [], { shouldValidate: true })
            }
          } catch (e) {
            console.error('Failed to resolve booking details for autofill', e)
          } finally {
            setIsCastingBooking(false)
          }
        } else {
          setAllowedProductIds(
            initialValues?.product_inventory ? [initialValues.product_inventory] : []
          )
          // 86eyqr9e0: `customer` cố ý KHÔNG nằm trong hàm này — xem docblock của nó.
          clearBookingAutofill(setValue, initialValues)
        }
      },
      [watchBookingIds, watchProjectId, initialValues, setCustomerType, setValue]
    )

    useEffect(() => {
      // Trigger initial autofill from URL params if applicable
      if (
        !isEdit &&
        initialValues?.booking_ids &&
        initialValues.booking_ids.length > 0 &&
        !hasInitialBookingAutofilled.current
      ) {
        hasInitialBookingAutofilled.current = true
        handleBookingIdsChange(initialValues.booking_ids, true)
      }
    }, [isEdit, initialValues, handleBookingIdsChange])

    // ─── Load options ──────────────────────────────────────────────────────
    const { loadInvestorOptions, loadInitialInvestorOptions } = useInvestorSelect({
      valueType: 'id',
      additionalParams: { is_active: true } as any,
    })
    const {
      loadProjectOptions,
      loadProductInventoryOptions,
      loadBookingOptions,
      loadInitialProjectOptions,
      loadInitialProductInventoryOptions,
      loadInitialBookingOptions,
    } = useBookingContractLoadOptions({
      investorId: watchInvestorId,
      projectId: watchProjectId,
      allowedProductIds,
    })

    const handleFormSubmit: SubmitHandler<DepositContractFormValues> = useCallback(
      async (values) => {
        try {
          await onSubmit(values)
        } catch (error) {
          // Map lỗi validation của BE về đúng field (fallback toast cho lỗi cấp form).
          handleApiError(error, setError)
        }
      },
      [onSubmit, setError]
    )

    return (
      <FormProvider {...form}>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 px-10 py-4">
          {/* ────────────────────────────────────────────────────────
                    SECTION 0 — Hợp đồng đặt chỗ liên quan
                ──────────────────────────────────────────────────────── */}
          <div className="bg-surface-primary-default rounded-md">
            <div className="mb-4">
              <h3 className="text-text-primary-default text-lg font-semibold">
                Hợp đồng đặt chỗ liên quan
              </h3>
            </div>
            {isEdit && hasInitialBooking ? (
              // Read-only trong màn sửa: hiển thị card + link mở chi tiết ở tab mới
              // (thân thiện hơn disabled multi-select). Gate quyền xem đặt chỗ.
              <div className="flex flex-col gap-2">
                {(depositContract?.booking_details ?? []).map((bk) => (
                  <div
                    key={bk.id}
                    className="border-border-1 bg-background-2 flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <div className="typo-body-base-semibold text-content-dark-1">{bk.code}</div>
                      {bk.contract_number && (
                        <div className="typo-body-sm-regular text-content-dark-3 mt-0.5">
                          Số HĐ: {bk.contract_number}
                        </div>
                      )}
                    </div>
                    {canViewBooking && (
                      <Link
                        to={APP_PATH.PROJECT_BOOKING_CONTRACT_DETAIL.replace(':id', String(bk.id))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-brand-primary text-content-dark-3 flex shrink-0 items-center gap-1 transition-colors"
                        title="Xem chi tiết hợp đồng đặt chỗ"
                      >
                        <IconEye size={18} />
                        <span className="typo-body-sm-medium">Xem chi tiết</span>
                      </Link>
                    )}
                  </div>
                ))}
                {(depositContract?.booking_details ?? []).length === 0 && (
                  <Text className="text-content-dark-3 typo-body-base-regular italic">
                    Không có hợp đồng đặt chỗ liên quan
                  </Text>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <FormController<DepositContractFormValues, any>
                  register={register}
                  control={control}
                  name="booking_ids"
                  Field={Select}
                  wrapperClassName="lg:col-span-12"
                  fieldProps={{
                    // label: 'Hợp đồng đặt chỗ',
                    placeholder: 'Chọn hợp đồng đặt chỗ',
                    loadOptions: loadBookingOptions,
                    loadInitialOptions: loadInitialBookingOptions,
                    enableSearch: true,
                    multiple: true,
                    triggerVariant: 'chips',
                    disabled: isSubmitting,
                    isLoading: isCastingBooking,
                    onChange: handleBookingIdsChange,
                  }}
                />
              </div>
            )}
          </div>

          <hr className="border-border-1 my-6" />

          {/* ────────────────────────────────────────────────────────
                    SECTION 1 — Thông tin Khách hàng
                ──────────────────────────────────────────────────────── */}
          <div className="bg-surface-primary-default rounded-md">
            <div className="mb-4">
              <h3 className="text-text-primary-default text-lg font-semibold">
                Thông tin Khách hàng
              </h3>
            </div>

            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-1">
                <RadioGroup
                  id="customer_type"
                  label="Loại khách hàng"
                  required
                  options={
                    customerTypeOptions.length > 0
                      ? customerTypeOptions
                      : [
                          { value: CUSTOMER_TYPE.INDIVIDUAL, label: 'Cá nhân' },
                          { value: CUSTOMER_TYPE.BUSINESS, label: 'Doanh nghiệp' },
                        ]
                  }
                  value={customerType}
                  onChange={(value) => {
                    setCustomerType(value as CustomerType)
                    // Clear selected customer when switching types to avoid data mismatch
                    setValue('customer', null)
                  }}
                  disabled={!!isSubmitting}
                  className="mt-[6px] flex-row flex-wrap gap-4"
                />
              </div>
              <div className="md:col-span-2">
                <Controller
                  control={control}
                  name="customer"
                  render={({ field, fieldState }) => (
                    <CustomerSelectWithDialog
                      label="Khách hàng"
                      value={field.value}
                      onChange={field.onChange}
                      error={fieldState.error?.message}
                      required
                      disabled={isSubmitting}
                      customerType={customerType}
                    />
                  )}
                />
              </div>
            </div>
            {customerData && <CustomerPreviewBox customerData={customerData} />}
          </div>

          <hr className="border-border-1 my-6" />

          {/* ────────────────────────────────────────────────────────
                    SECTION 2 — Thông tin Sản phẩm
                ──────────────────────────────────────────────────────── */}
          <div className="bg-surface-primary-default rounded-md">
            <div className="mb-4">
              <h3 className="text-text-primary-default text-lg font-semibold">
                Thông tin sản phẩm
              </h3>
            </div>
            <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
              <FormController<DepositContractFormValues, any>
                register={register}
                control={control}
                name="investor"
                Field={Select}
                wrapperClassName="lg:col-span-1"
                fieldProps={{
                  label: 'Chủ đầu tư',
                  placeholder: 'Chủ đầu tư',
                  loadOptions: loadInvestorOptions,
                  loadInitialOptions: loadInitialInvestorOptions,
                  enableSearch: true,
                  required: true,
                  disabled: isSubmitting,
                  onChange: (val: any) => {
                    // Việc clear project/product khi bỏ chủ đầu tư do useEffect watch investor lo.
                    setValue('investor', val, { shouldValidate: true })
                  },
                }}
              />
              <FormController<DepositContractFormValues, any>
                register={register}
                control={control}
                name="project"
                Field={Select}
                wrapperClassName="lg:col-span-1"
                fieldProps={{
                  label: 'Dự án',
                  placeholder: 'Nhập/chọn dự án',
                  loadOptions: loadProjectOptions,
                  loadInitialOptions: loadInitialProjectOptions,
                  enableSearch: true,
                  required: true,
                  disabled: isSubmitting,
                  onChange: async (val: any) => {
                    // Việc clear booking_ids/product khi bỏ dự án do useEffect watch project lo.
                    setValue('project', val, { shouldValidate: true })
                    if (!val) {
                      setSelectedProjectData(null)
                      return
                    }
                    try {
                      const project = await getRealEstateService().getProject(val)
                      setSelectedProjectData(project)
                      if (project.investor?.id)
                        setValue('investor', project.investor.id, { shouldValidate: true })
                    } catch (e) {
                      console.error('Failed to fetch project on select', e)
                    }
                  },
                }}
              />

              <FormController<DepositContractFormValues, any>
                register={register}
                control={control}
                name="product_inventory"
                Field={Select}
                wrapperClassName="lg:col-span-1"
                fieldProps={{
                  label: 'Mã bất động sản', // Figma calls this 'Số hợp đồng' but it's Mã BĐS
                  placeholder: 'Nhập/chọn mã bất sản',
                  loadOptions: loadProductInventoryOptions,
                  loadInitialOptions: loadInitialProductInventoryOptions,
                  enableSearch: true,
                  required: true,
                  disabled: isSubmitting,
                  onChange: async (val: any) => {
                    const previousPI = watch('product_inventory' as any)
                    setValue('product_inventory', val, { shouldValidate: true })
                    if (val) {
                      try {
                        // Khi user CHỦ ĐỘNG đổi BĐS (có BĐS cũ khác BĐS mới) → reset exchange
                        // để tránh giữ sàn cũ không hợp lệ với BĐS mới.
                        // Không reset khi prefill ban đầu (previousPI === null).
                        if (previousPI != null && previousPI !== val) {
                          const currentSales = watch('sales_staff') || []
                          const resetExchangeSales = currentSales.map((sale) => {
                            if (sale.sale_type === 'partner') {
                              return { ...sale, exchange: null, exchange_detail: null }
                            }
                            return sale
                          })
                          if (JSON.stringify(currentSales) !== JSON.stringify(resetExchangeSales)) {
                            setValue('sales_staff', resetExchangeSales, { shouldValidate: true })
                          }
                        }

                        const product = await getRealEstateService().getProductInventory(val)
                        setSelectedProductInfo(product)
                        if (product.project?.id) {
                          setValue('project', product.project.id, { shouldValidate: true })
                          try {
                            const project = await getRealEstateService().getProject(
                              product.project.id
                            )
                            setSelectedProjectData(project)
                          } catch (e) {
                            console.error('Failed to fetch project for PI autofill', e)
                          }
                        }
                        if (product.investor?.id)
                          setValue('investor', product.investor.id, { shouldValidate: true })
                        applyProductPriceToForm(setValue, product)
                        const currentBookings = watch('booking_ids')
                        if (!currentBookings || currentBookings.length === 0) {
                          const depositAmount = (product as any).deposit_amount
                          if (depositAmount !== undefined && depositAmount !== null) {
                            setValue('registration_amount', Number(depositAmount), {
                              shouldValidate: true,
                            })
                          }
                        }
                        // Fetch current commission from dedicated API
                        const commissionData =
                          await getRealEstateService().getProductInventoryCurrentCommission(val)
                        const resolved = applyCommissionToForm(
                          setValue,
                          commissionData?.current_commission
                        )
                        // Đồng bộ HH cho các dòng nhân sự đang có theo cấu hình sale mới.
                        if (resolved?.pct != null) {
                          const currentSalesAfterReset = watch('sales_staff') || []
                          const updatedSales = currentSalesAfterReset.map((sale) => {
                            if (sale.sale_type !== 'mv') return sale
                            return {
                              ...sale,
                              pct_commission: resolved.pct,
                              amt_commission: undefined,
                            }
                          })
                          setValue('sales_staff', updatedSales, { shouldValidate: true })
                        } else if (resolved?.amt != null) {
                          const currentSalesAfterReset = watch('sales_staff') || []
                          const updatedSales = currentSalesAfterReset.map((sale) => {
                            if (sale.sale_type !== 'mv') return sale
                            return {
                              ...sale,
                              amt_commission: resolved.amt,
                              pct_commission: undefined,
                            }
                          })
                          setValue('sales_staff', updatedSales, { shouldValidate: true })
                        }
                      } catch (e) {
                        console.error('Failed to autofill from product inventory', e)
                      }
                    } else {
                      setValue('listed_price', undefined)
                      setValue('fee_calculation_price', undefined)
                      setValue('pct_sale_commission', undefined)
                      setValue('amt_sale_commission', undefined)
                      setValue('sale_commission_type', RATE_TYPE.PCT)
                      setValue('pct_revenue', undefined)
                      setValue('amt_revenue', undefined)
                      setValue('revenue_type', RATE_TYPE.PCT)
                      setSelectedProductInfo(null)
                    }
                  },
                }}
              />
              {watchProjectId && (
                <div className="col-span-1 md:col-span-2 lg:col-span-3">
                  <ProjectPreviewBox
                    projectData={selectedProjectData || { id: Number(watchProjectId) }}
                    targetDate={watchContractDate}
                  />
                </div>
              )}
            </div>

            {selectedProductInfo && (
              <div className="border-border-1 bg-surface-secondary-default mt-4 flex flex-col gap-6 rounded-xl border p-5">
                <Flex direction="column" gap="1">
                  <Text className="text-content-dark-3 typo-body-base-medium">Tên sản phẩm</Text>
                  <div className="flex items-center gap-2">
                    <Text className="text-content-dark-1 typo-body-xl-semibold">
                      {selectedProductInfo.project?.name
                        ? `${selectedProductInfo.project.name} - ${selectedProductInfo.code}`
                        : selectedProductInfo.code || '-'}
                    </Text>
                    {selectedProductInfo.id && (
                      <Link
                        to={APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL.replace(
                          ':id',
                          String(selectedProductInfo.id)
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-brand-primary text-gray-400 transition-colors"
                        title="Xem chi tiết BĐS"
                      >
                        <IconEye size={18} />
                      </Link>
                    )}
                  </div>
                </Flex>
                <div className="grid grid-cols-2 gap-x-12 gap-y-6 md:grid-cols-3">
                  <DisplayField label="Diện tích (m²)" value={selectedProductInfo.area || '---'} />
                  <DisplayField
                    label="Giá niêm yết"
                    value={
                      selectedProductInfo.listed_price != null
                        ? `${formatCurrencyVND(Number(selectedProductInfo.listed_price))} VNĐ`
                        : '---'
                    }
                  />
                  <DisplayField
                    label="Giá tính phí tạm tính"
                    value={
                      selectedProductInfo.fee_calculation_price != null
                        ? `${formatCurrencyVND(Number(selectedProductInfo.fee_calculation_price))} VNĐ`
                        : '---'
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <hr className="border-border-1 my-6" />

          {/* ────────────────────────────────────────────────────────
                    SECTION 2.5 — Thông tin Hợp đồng
                ──────────────────────────────────────────────────────── */}
          <div className="bg-surface-primary-default rounded-md">
            <div className="mb-4">
              <h3 className="text-text-primary-default text-lg font-semibold">
                Thông tin hợp đồng
              </h3>
            </div>
            {/* Callout riêng cho cờ "đề xuất hỗ trợ phí" — box viền + nền nhẹ để nổi
                bật, tách khỏi tiêu đề mục (tránh cảm giác tiêu đề là nhãn của nó).
                Màn tạo mới: tick im lặng. Màn sửa: hook điều phối dialog tạo/thu hồi
                phiếu + nút "Tạo phiếu hỗ trợ bán hàng". */}
            <div className="border-border-1 bg-background-2 mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
              <div className="flex flex-col gap-1">
                <Controller
                  name="has_fee_support_proposal"
                  control={control}
                  render={({ field }) => (
                    <Checkbox
                      checked={!!field.value}
                      onCheckedChange={feeSupportToggle.onCheckedChange}
                      disabled={isSubmitting}
                      label="Giao dịch này có đề xuất hỗ trợ phí bán hàng"
                    />
                  )}
                />
                <span className="typo-body-sm-regular text-content-dark-3 pl-6">
                  Tick nếu giao dịch cần đề xuất hỗ trợ phí — hệ thống sẽ hỏi tạo phiếu hỗ trợ bán
                  hàng liên kết. Đã tick thì hợp đồng cọc chỉ duyệt được sau khi phiếu đề xuất đã
                  được duyệt.
                </span>
              </div>
              {feeSupportToggle.showCreateButton && (
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={feeSupportToggle.onClickCreate}
                >
                  Tạo phiếu hỗ trợ bán hàng
                </Button>
              )}
            </div>
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-3">
              {/* Row 1: Số HĐ | Ngày */}
              {isEdit && (
                <FormController<DepositContractFormValues, any>
                  register={register}
                  control={control}
                  name="contract_number"
                  Field={TextField}
                  wrapperClassName="lg:col-span-1"
                  fieldProps={{
                    label: 'Mã phiếu đặt cọc',
                    placeholder: 'Hệ thống tự động sinh',
                    readOnly: true,
                    required: false,
                  }}
                />
              )}
              <FormController<DepositContractFormValues, any>
                register={register}
                control={control}
                name="contract_date"
                Field={DatePicker}
                wrapperClassName="lg:col-span-1"
                fieldProps={{
                  label: 'Ngày đặt cọc',
                  required: true,
                  disabled: isSubmitting,
                }}
              />

              {/* Row 2: Giá niêm yết | Giá tạm tính | Tiền đặt cọc */}
              <FormController<DepositContractFormValues, any>
                register={register}
                control={control}
                name="listed_price"
                Field={CurrencyInput}
                wrapperClassName="lg:col-span-1"
                fieldProps={{
                  label: 'Giá niêm yết',
                  placeholder: 'Giá niêm yết',
                  allowNegativeValue: false,
                  suffix: 'VNĐ',
                  disabled: isSubmitting,
                }}
              />
              <FormController<DepositContractFormValues, any>
                register={register}
                control={control}
                name="fee_calculation_price"
                Field={CurrencyInput}
                wrapperClassName="lg:col-span-1"
                fieldProps={{
                  label: 'Giá tính phí tạm tính',
                  placeholder: 'Giá tính phí tạm tính',
                  allowNegativeValue: false,
                  suffix: 'VNĐ',
                  disabled: isSubmitting,
                }}
              />
              <FormController<DepositContractFormValues, any>
                register={register}
                control={control}
                name="registration_amount"
                Field={CurrencyInput}
                wrapperClassName="lg:col-span-1"
                fieldProps={{
                  label: 'Số tiền đặt cọc / Giữ chỗ',
                  placeholder: 'Nhập số tiền',
                  allowNegativeValue: false,
                  suffix: 'VNĐ',
                  disabled: isSubmitting,
                  required: true,
                }}
              />

              {/* Row 3: Tiền bổ sung */}
              <FormController<DepositContractFormValues, any>
                register={register}
                control={control}
                name="supplementary_amount"
                Field={CurrencyInput}
                wrapperClassName="lg:col-span-1"
                fieldProps={{
                  label: 'Số tiền bổ sung',
                  placeholder: 'Nhập số tiền',
                  allowNegativeValue: false,
                  suffix: 'VNĐ',
                  disabled: isSubmitting,
                }}
              />

              {/* Row 4: Hình thức thanh toán | Nguồn tiền.
                  `col-start-1` ép cặp này mở hàng mới — để radio chiếm trọn 3 cột thì
                  Nguồn tiền rơi xuống hàng riêng, còn chỉ thu về 1 cột thì radio lọt
                  vào cột 3 của hàng trên và cặp vẫn bị tách. */}
              <div className="lg:col-span-1 lg:col-start-1">
                <Controller
                  control={control}
                  name="payment_method"
                  render={({ field, fieldState }) => (
                    <RadioGroup
                      id="deposit-payment-method"
                      label="Hình thức thanh toán"
                      options={paymentOptions as { value: string; label: string }[]}
                      // '' thay vì undefined: HĐ cũ chưa có hình thức vẫn giữ radio ở chế độ
                      // controlled, tránh cảnh báo uncontrolled→controlled khi người dùng chọn.
                      value={field.value ?? ''}
                      onChange={field.onChange}
                      disabled={!!isSubmitting}
                      required={Number(watch('supplementary_amount')) > 0}
                      error={fieldState.error?.message}
                      className="flex-row gap-4"
                    />
                  )}
                />
              </div>

              {/* Transfer bank fields (conditional) */}
              {watch('payment_method') === DepositContractPaymentMethod.transfer && (
                <>
                  <FormController<DepositContractFormValues, any>
                    register={register}
                    control={control}
                    name="source_account_name"
                    Field={TextField}
                    wrapperClassName="lg:col-span-1"
                    fieldProps={{
                      label: 'Tên tài khoản nguồn',
                      placeholder: 'Nhập tên tài khoản nguồn',
                      required: Number(watch('supplementary_amount')) > 0,
                      disabled: isSubmitting,
                    }}
                  />
                  <FormController<DepositContractFormValues, any>
                    register={register}
                    control={control}
                    name="source_account_number"
                    Field={TextField}
                    wrapperClassName="lg:col-span-1"
                    fieldProps={{
                      label: 'Số tài khoản nguồn',
                      placeholder: 'Nhập số tài khoản nguồn',
                      required: Number(watch('supplementary_amount')) > 0,
                      disabled: isSubmitting,
                    }}
                  />
                  <FormController<DepositContractFormValues, any>
                    register={register}
                    control={control}
                    name="source_bank_name"
                    Field={Select}
                    wrapperClassName="lg:col-span-1"
                    fieldProps={{
                      label: 'Mở tài khoản tại',
                      placeholder: 'Chọn tên ngân hàng',
                      required: Number(watch('supplementary_amount')) > 0,
                      disabled: isSubmitting,
                      options: bankOptions,
                      enableSearch: true,
                      searchPlaceholder: 'Tìm kiếm ngân hàng...',
                    }}
                  />
                </>
              )}

              {/*
                Tiền cọc chuyển VÀO đâu — không phải tài khoản khách chuyển ĐI ở nhóm
                `source_account_*` phía trên, và cố ý nằm NGOÀI khối chuyển khoản: tiền
                mặt đưa thẳng cho CĐT cũng là một nơi giữ tiền có thật. Hỏi riêng chuyển
                khoản là lý do 100% hợp đồng tiền mặt trước đây để trống cột này.

                Giá trị quyết định luồng duyệt: về CĐT thì TP TKKD duyệt là xong, về tài
                khoản MVL thì còn bước kế toán.
              */}
              <FormController<DepositContractFormValues, any>
                register={register}
                control={control}
                name="transfer_to_account"
                Field={Select}
                wrapperClassName="lg:col-span-1"
                fieldProps={{
                  label: 'Nguồn tiền',
                  placeholder: 'Chọn nguồn tiền',
                  required: true,
                  disabled: isSubmitting,
                  options: TRANSFER_TO_ACCOUNT_OPTIONS,
                }}
              />

              <FormController<DepositContractFormValues, any>
                register={register}
                control={control}
                name="note"
                Field={TextArea}
                wrapperClassName="lg:col-span-3"
                fieldProps={{
                  label: 'Ghi chú',
                  placeholder: 'Nhập ghi chú...',
                  maxCharacters: 500,
                  disabled: isSubmitting,
                }}
              />
            </div>
          </div>

          <hr className="border-border-1 my-6" />

          {/* ────────────────────────────────────────────────────────
                    SECTION 3 — Nhân sự phụ trách bán
                ──────────────────────────────────────────────────────── */}
          <div className="bg-surface-primary-default rounded-md">
            <CommonSaleStaffTable
              module="deposit"
              isReadOnly={isSubmitting}
              defaultAppendFields={{ is_confirmed: false, confirmed_at: null }}
              // Chỗ DUY NHẤT ở FE còn được phép tự cộng tổng cọc, và có lý do: đây là giá trị
              // người dùng ĐANG GÕ, hợp đồng chưa lưu nên chưa có `total_deposit_amount` do BE
              // trả. Mọi chỗ đọc tổng cọc của hợp đồng ĐÃ LƯU phải dùng `getTotalDepositAmount`
              // (đọc field BE) — đừng bê công thức này sang đó.
              paymentAmount={
                (watch('registration_amount') || 0) + (watch('supplementary_amount') || 0)
              }
            />
          </div>

          <hr className="border-border-1 my-6" />

          {/* ────────────────────────────────────────────────────────
                    SECTION 4 — File đính kèm
                ──────────────────────────────────────────────────────── */}
          <div className="bg-surface-primary-default rounded-md">
            <Controller
              control={control}
              name="attachments"
              render={({ field, fieldState }) => (
                <FileUpload
                  label="File đính kèm"
                  value={field.value}
                  onChange={field.onChange}
                  error={fieldState.error?.message}
                  multiple
                  purpose="deposit_contract_document"
                  existingFiles={initialValues?.attachments_detail || []}
                  onKeptExistingIdsChange={(ids: number[]) => setValue('kept_attachment_ids', ids)}
                  disabled={isSubmitting}
                  required
                />
              )}
            />
          </div>

          {(initialValues as any)?.confirmation_logs?.length > 0 && (
            <>
              <hr className="border-border-1 my-6" />
              <div className="bg-surface-primary-default rounded-md">
                <div className="mb-4">
                  <h3 className="text-text-primary-default text-lg font-semibold">
                    Thông tin người xác nhận
                  </h3>
                </div>
                <ConfirmationLogsTable logs={(initialValues as any)?.confirmation_logs} />
              </div>
            </>
          )}

          {/* ─── Footer Actions ──────────────────────────────────── */}
          <Flex gap="4" justify="end" className="border-border-1 border-t pt-4">
            <Button
              type="button"
              variant="secondary" // Figma shows basic outline button for "Hủy"
              onClick={onCancel}
              disabled={isBusy}
              className="w-[150px]"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isBusy}
              disabled={isBusy}
              className="w-[150px]"
            >
              Gửi xác nhận
            </Button>
          </Flex>
        </form>
      </FormProvider>
    )
  }
)

DepositContractForm.displayName = 'DepositContractForm'

export default DepositContractForm

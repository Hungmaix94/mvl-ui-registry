import { forwardRef, useImperativeHandle, useEffect, useMemo, useState } from 'react'
import {
  useForm,
  FormProvider,
  Controller,
  type SubmitHandler,
  type Resolver,
  type FieldErrors,
  type FieldValues,
} from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  getRealEstateService,
  type ProductInventory,
  type Project,
} from '@/services/realestate-service'
import { formatCurrencyVND } from '@/utils/common'
import { Flex, Text } from '@radix-ui/themes'
import { DisplayField } from '@/components/commons/DisplayField'
import {
  TextField,
  Select,
  Button,
  CurrencyInput,
  FileUpload,
  RadioGroup,
  TextArea,
} from '@/components/ui'
import { Separator } from '@/components/ui/separator'
import FormController from '@/components/ui/form/FormController'
import useAppConstant from '@/hooks/useAppConstant'
import useBankOptions from '@/hooks/useBankOptions'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import {
  bookingContractFormSchema,
  type BookingContractFormValues,
} from '../types/booking-contract-types'
import { clearInvestorDependents, isInvestorChanged } from '../utils/investor-cascade'
import { useSalesAllocationSelect } from '@/hooks/useSalesAllocationSelect'
import { useBookingContractLoadOptions } from '../services/useBookingContractLoadOptions'
import { useCustomer } from '@/services/sales-service'
import { BookingRefundSaleSale_type } from '@/api/schema'
import { useProvinces } from '@/services/province-service'
import { useAdministrativeUnits } from '@/services/administrative-unit-service'
import CustomerSelectWithDialog from './CustomerSelectWithDialog'
import { CommonSaleStaffTable } from '@/features/sales/components/SaleStaffCommissionTable/SaleStaffCommissionTable'
import { CustomerPreviewBox } from '@/features/sales/components/CustomerPreviewBox'
import { ProjectPreviewBox } from '@/features/sales/components/ProjectPreviewBox'
import { useInvestorSelect } from '@/hooks/useInvestorSelect'
import {
  ConfirmationLogsTable,
  type ConfirmationLogEntry,
} from '@/features/sales/components/ConfirmationLogsTable'
import { parseDateFromApi } from '@/utils/date-utils'

export type BookingContractFormRef = {
  getValues: () => BookingContractFormValues
  handleSubmit: (
    onSubmit: (data: BookingContractFormValues) => void | Promise<void>
  ) => () => Promise<void>
  setError: (
    name: keyof BookingContractFormValues,
    error: { type?: string; message: string }
  ) => void
}

import { scrollToFirstError } from '@/utils/form-utils'
import { useFormValidationScroll } from '@/hooks/useFormValidationScroll'
import {
  DepositContractPaymentMethod,
  BookingTransferToAccount,
  CustomerType,
} from '@/constants/api-schema-aliases'

type BookingContractFormProps = {
  // Các field "display-only" đi kèm initialValues khi ở chế độ sửa: chúng không thuộc
  // form values (không submit lên) mà chỉ để prefill label cho Select và render bảng
  // xác nhận. Khai báo tường minh ở đây thay vì `as any` tại từng chỗ dùng.
  initialValues?: Partial<BookingContractFormValues> & {
    investor_name?: string
    project_name?: string
    unit_number?: string
    sales_allocation_name?: string
    product_inventory_name?: string
    confirmation_logs?: ConfirmationLogEntry[]
  }
  onSubmit: (data: BookingContractFormValues) => void
  isSubmitting?: boolean
  isEdit?: boolean
}

const BookingContractForm = forwardRef<BookingContractFormRef, BookingContractFormProps>(
  ({ initialValues, onSubmit, isSubmitting, isEdit = false }, ref) => {
    // Cast hẹp, KHÔNG dùng `as any`: schema có `preprocess`/`transform`/`default` nên
    // `z.input` != `z.output` (TS2719 — xem docs/ai/conventions.md § Validation & Zod).
    // Đã thử cách typed đúng của RHF `useForm<z.input, unknown, z.output>`: compiler ra
    // 30 lỗi lan sang toàn bộ `FormController<...>` và biến field value thành `unknown`
    // cho các field preprocess — tệ hơn hiện tại. Fix thật là làm schema transform-free,
    // cần lưới test trước (xem booking-contract-types.test.ts).
    const form = useForm<BookingContractFormValues>({
      resolver: zodResolver(bookingContractFormSchema) as Resolver<BookingContractFormValues>,
      defaultValues: {
        customer_id: null,
        sales_staff: [],
        booking_date: new Date(),
        contract_number: undefined,
        customer_type: CustomerType.individual,
        payment_method: DepositContractPaymentMethod.cash,
        kept_attachment_ids:
          initialValues?.attachments_detail?.map((a: { id: number }) => a.id) ?? [],
        pct_sale_commission: undefined,
        amt_sale_commission: undefined,
        sale_commission_type: 'pct',
        pct_revenue: undefined,
        amt_revenue: undefined,
        revenue_type: 'pct',
        pct_agency_fee: undefined,
        ...initialValues,
      },
      values: initialValues
        ? ({
            customer_id: null,
            sales_staff: [],
            booking_date: new Date(),
            contract_number: undefined,
            customer_type: CustomerType.individual,
            payment_method: DepositContractPaymentMethod.cash,
            kept_attachment_ids:
              initialValues?.attachments_detail?.map((a: { id: number }) => a.id) ?? [],
            pct_sale_commission: initialValues.pct_sale_commission,
            amt_sale_commission: initialValues.amt_sale_commission,
            sale_commission_type: initialValues.sale_commission_type ?? 'pct',
            pct_revenue: initialValues.pct_revenue,
            amt_revenue: initialValues.amt_revenue,
            revenue_type: initialValues.revenue_type ?? 'pct',
            pct_agency_fee: initialValues.pct_agency_fee,
            ...initialValues,
          } as BookingContractFormValues)
        : undefined,
    })

    const {
      register,
      control,
      handleSubmit: formHandleSubmit,
      watch,
      setValue,
      setError,
      formState: { errors, submitCount, isSubmitting: isFormSubmitting },
    } = form

    // RHF bật `isSubmitting` ngay đầu handleSubmit (trước cả khi validate zod chạy),
    // trong khi `isSubmitting` từ page chỉ bật sau khi validate xong. Gộp cả hai để
    // nút submit bị khoá từ tick đầu tiên, tránh click hai lần tạo 2 bản ghi.
    const isBusy = isSubmitting || isFormSubmitting

    useFormValidationScroll(errors, submitCount)

    const { keysMapOptions } = useAppConstant({
      module: 'sales',
      keys: [
        APP_CONSTANT_KEY.SALES.CUSTOMER.TYPE,
        APP_CONSTANT_KEY.SALES.CUSTOMER.GENDER,
        APP_CONSTANT_KEY.SALES.BOOKING.PAYMENT_METHOD_CHOICES,
      ],
    })

    const customerTypeOptions = useMemo(() => {
      return keysMapOptions.get(APP_CONSTANT_KEY.SALES.CUSTOMER.TYPE) || []
    }, [keysMapOptions])

    const paymentMethodOptions = useMemo(() => {
      return keysMapOptions.get(APP_CONSTANT_KEY.SALES.BOOKING.PAYMENT_METHOD_CHOICES) || []
    }, [keysMapOptions])

    useImperativeHandle(ref, () => ({
      getValues: () => form.getValues(),
      handleSubmit: (onSubmitFn: (data: BookingContractFormValues) => void | Promise<void>) =>
        formHandleSubmit(onSubmitFn as SubmitHandler<BookingContractFormValues>),
      setError,
    }))

    const watchInvestorId = watch('investor_id')
    const watchProjectId = watch('project_id')
    const { loadSalesAllocationOptions, loadInitialSalesAllocationOptions } =
      useSalesAllocationSelect({
        additionalParams: () => ({ project: watchProjectId || undefined }),
      })
    const watchCustomerId = watch('customer_id')
    const watchProvinceId = watch('customer_province_id')
    const watchBusinessProvinceId = watch('business_province_id')
    const watchBookingDate = watch('booking_date')
    const watchPaymentAmount = watch('payment_amount')
    const { bankOptions } = useBankOptions(watch('source_bank_name'))

    const [selectedProductInfo, setSelectedProductInfo] = useState<ProductInventory | null>(null)
    const [selectedProjectData, setSelectedProjectData] = useState<Project | null>(null)

    const fillCommissionValues = (commission: any) => {
      if (commission?.pct_agency_fee != null) {
        setValue('pct_agency_fee', Number(commission.pct_agency_fee), {
          shouldValidate: true,
        })
      } else {
        setValue('pct_agency_fee', undefined as never, {
          shouldValidate: true,
        })
      }

      if (commission?.amt_sale_commission != null && Number(commission.amt_sale_commission) > 0) {
        const amtSaleCommission = Number(commission.amt_sale_commission)
        setValue('amt_sale_commission', amtSaleCommission, {
          shouldValidate: true,
        })
        setValue('pct_sale_commission', undefined as never, {
          shouldValidate: true,
        })
        setValue('sale_commission_type', 'amt', { shouldValidate: true })

        const currentSalesAfterReset = watch('sales_staff') || []
        const updatedSales = currentSalesAfterReset.map((sale) => {
          if (sale.sale_type !== BookingRefundSaleSale_type.mv) return sale
          return {
            ...sale,
            amt_commission: String(amtSaleCommission),
            pct_commission: undefined,
          }
        })
        setValue('sales_staff', updatedSales, { shouldValidate: true })
      } else if (commission?.pct_sale_commission != null) {
        const pctSaleCommission = Number(commission.pct_sale_commission)
        setValue('pct_sale_commission', pctSaleCommission, {
          shouldValidate: true,
        })
        setValue('amt_sale_commission', undefined as never, {
          shouldValidate: true,
        })
        setValue('sale_commission_type', 'pct', { shouldValidate: true })

        const currentSalesAfterReset = watch('sales_staff') || []
        const updatedSales = currentSalesAfterReset.map((sale) => {
          if (sale.sale_type !== BookingRefundSaleSale_type.mv) return sale
          return {
            ...sale,
            pct_commission: String(pctSaleCommission),
            amt_commission: undefined,
          }
        })
        setValue('sales_staff', updatedSales, { shouldValidate: true })
      } else {
        setValue('pct_sale_commission', undefined as never, {
          shouldValidate: true,
        })
        setValue('amt_sale_commission', undefined as never, {
          shouldValidate: true,
        })
        setValue('sale_commission_type', 'pct', { shouldValidate: true })
      }

      if (commission?.amt_revenue != null && Number(commission.amt_revenue) > 0) {
        setValue('amt_revenue', Number(commission.amt_revenue), {
          shouldValidate: true,
        })
        setValue('revenue_type', 'amt', { shouldValidate: true })
        setValue('pct_revenue', undefined as never, { shouldValidate: true })
      } else if (commission?.pct_revenue != null) {
        setValue('pct_revenue', Number(commission.pct_revenue), {
          shouldValidate: true,
        })
        setValue('revenue_type', 'pct', { shouldValidate: true })
        setValue('amt_revenue', undefined as never, { shouldValidate: true })
      } else {
        setValue('pct_revenue', undefined as never, { shouldValidate: true })
        setValue('amt_revenue', undefined as never, { shouldValidate: true })
        setValue('revenue_type', 'pct', { shouldValidate: true })
      }
    }

    useEffect(() => {
      if (initialValues?.product_inventory_id) {
        getRealEstateService()
          .getProductInventory(initialValues.product_inventory_id)
          .then(setSelectedProductInfo)
          // Autofill phụ trợ: không chặn form. Chỉ log ra console — user KHÔNG thấy gì,
          // đây là đánh đổi có ý thức (toast mỗi lần lỗi tạm thời sẽ rất ồn).
          .catch((e) => console.error('Failed to load product inventory preview:', e))
      }
    }, [initialValues?.product_inventory_id])

    useEffect(() => {
      if (initialValues?.project_id) {
        getRealEstateService()
          .getProject(initialValues.project_id)
          .then(setSelectedProjectData)
          // Autofill phụ trợ: không chặn form. Chỉ log ra console — user KHÔNG thấy gì.
          .catch((e) => console.error('Failed to load project preview:', e))
      }
    }, [initialValues?.project_id])

    useProvinces()

    useAdministrativeUnits(
      { parent_province: Number(watchProvinceId), page_size: 1000 },
      { enabled: !!watchProvinceId }
    )

    useAdministrativeUnits(
      { parent_province: Number(watchBusinessProvinceId), page_size: 1000 },
      { enabled: !!watchBusinessProvinceId }
    )

    // Chỉ lấy CĐT đang hoạt động. Param này giờ CÓ trong schema (BE đã mở `is_active` cho
    // `InvestorDropdownFilterSet`), nên truyền thẳng, không cast. Trước đây nó được truyền
    // qua `as any` và BE bỏ qua im lặng → filter chưa từng chạy.
    // Lưu ý contract: django-filter map mọi giá trị ngoài true/1/false/0 về None và coi như
    // KHÔNG lọc — gửi rỗng hoặc sai định dạng sẽ trả full list chứ không phải 400. Vì vậy
    // luôn truyền boolean thật, đừng để giá trị này đi qua state có thể thành '' hay undefined.
    const { loadInvestorOptions, loadInitialInvestorOptions } = useInvestorSelect({
      valueType: 'id',
      additionalParams: { is_active: true },
    })

    const {
      loadProjectOptions,
      loadProductInventoryOptions,
      loadInitialProjectOptions,
      loadInitialProductInventoryOptions,
    } = useBookingContractLoadOptions({
      investorId: watchInvestorId,
      projectId: watchProjectId,
    })

    // Lookup by customer ID if selected from dropdown
    const { data: customerDataById } = useCustomer(Number(watchCustomerId))

    useEffect(() => {
      if (watchCustomerId && customerDataById) {
        // Sync fetched data to form values for submission
        if (customerDataById.id)
          setValue('customer_id', customerDataById.id, { shouldValidate: true })
        // Chỉ đọc `full_name` — đúng theo schema `Customer`. Trước đây có nhánh dự phòng
        // `(customerDataById as any).name`, nhưng `Customer` KHÔNG khai field `name`
        // (`name` là shape của serializer lồng `customer_detail`, endpoint khác). Đọc field
        // ngoài schema bằng cast là bịa contract, nên đã bỏ.
        setValue('customer_name', customerDataById.full_name || '')
        setValue('customer_type', customerDataById.customer_type)

        const dob = parseDateFromApi(customerDataById.date_of_birth)
        if (dob) setValue('customer_dob', dob)

        if (customerDataById.id_number) setValue('customer_cccd', customerDataById.id_number)
        if (customerDataById.phone) setValue('customer_phone', customerDataById.phone)
        if (customerDataById.email) setValue('customer_email', customerDataById.email)
        if (customerDataById.address_detail)
          setValue('customer_address', customerDataById.address_detail)
        if (customerDataById.gender) setValue('customer_gender', customerDataById.gender)
        if (customerDataById.province_detail?.id)
          setValue('customer_province_id', customerDataById.province_detail.id)
        if (customerDataById.ward_detail?.id)
          setValue('customer_ward_id', customerDataById.ward_detail.id)

        const issuedDate = parseDateFromApi(customerDataById.id_issued_date)
        if (issuedDate) setValue('customer_id_issued_date', issuedDate)

        // Business auto-fill
        if (customerDataById.business_name)
          setValue('business_name', customerDataById.business_name)
        if (customerDataById.business_tax_code)
          setValue('business_tax_code', customerDataById.business_tax_code)
        if (customerDataById.business_representative)
          setValue('business_representative', customerDataById.business_representative)
        if (customerDataById.business_representative_title)
          setValue('business_representative_title', customerDataById.business_representative_title)
        if (customerDataById.business_address)
          setValue('business_address', customerDataById.business_address)
        if (customerDataById.business_province_detail?.id)
          setValue('business_province_id', customerDataById.business_province_detail.id)
        if (customerDataById.business_ward_detail?.id)
          setValue('business_ward_id', customerDataById.business_ward_detail.id)
      }
    }, [customerDataById, watchCustomerId, setValue])

    const handleSubmit = async (values: BookingContractFormValues) => {
      await onSubmit({
        ...values,
        kept_attachment_ids: isEdit ? values.kept_attachment_ids : undefined,
      })
    }

    return (
      <FormProvider {...form}>
        <form
          onSubmit={formHandleSubmit(
            handleSubmit as SubmitHandler<BookingContractFormValues>,
            (formErrors) => {
              // Explicitly set customer_id error in case superRefine doesn't surface it
              // (zodResolver with nullable fields can lose superRefine errors in fieldState)
              const extraErrors = { ...formErrors }
              if (!isEdit && !form.getValues('customer_id')) {
                setError('customer_id', {
                  type: 'custom',
                  message: 'Vui lòng chọn khách hàng',
                })
                extraErrors.customer_id = { type: 'custom', message: 'Vui lòng chọn khách hàng' }
              }
              scrollToFirstError(extraErrors as FieldErrors<FieldValues>)
            }
          )}
          className="space-y-6 px-10 py-4"
        >
          <div className="bg-surface-primary-default rounded-md">
            <div className="mb-4">
              <h3 className="text-text-primary-default text-lg font-semibold">
                Thông tin Khách Hàng
              </h3>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-1">
                <Controller
                  control={control}
                  name="customer_type"
                  render={({ field, fieldState }) => (
                    <RadioGroup
                      id="customer-type"
                      label="Loại khách hàng"
                      options={customerTypeOptions as { value: string; label: string }[]}
                      value={field.value}
                      onChange={(val) => {
                        field.onChange(val)
                        // Clear subform data when type changes
                        setValue('customer_id', null)
                        setValue('customer_name', '')
                        setValue('customer_dob', undefined)
                        setValue('customer_gender', undefined)
                        setValue('customer_phone', '')
                        setValue('customer_email', '')
                        setValue('customer_cccd', '')
                        setValue('customer_id_issued_date', undefined)
                        setValue('customer_province_id', null)
                        setValue('customer_ward_id', null)
                        setValue('customer_address', '')
                        setValue('business_name', '')
                        setValue('business_tax_code', '')
                        setValue('business_representative', '')
                        setValue('business_representative_title', '')
                        setValue('business_province_id', null)
                        setValue('business_ward_id', null)
                        setValue('business_address', '')
                      }}
                      disabled={isEdit}
                      error={fieldState.error?.message}
                      className="mt-[6px] flex-row flex-wrap gap-4" // Align radio a bit lower to match input label height
                    />
                  )}
                />
              </div>
              <div className="md:col-span-2">
                <Controller
                  control={control}
                  name="customer_id"
                  render={({ field, fieldState }) => (
                    <CustomerSelectWithDialog
                      label="Khách hàng"
                      value={field.value}
                      onChange={field.onChange}
                      error={
                        fieldState.error?.message ??
                        (errors.customer_id?.message as string | undefined)
                      }
                      required={!isEdit}
                      customerType={watch('customer_type') as CustomerType}
                      disabled={isEdit}
                    />
                  )}
                />
              </div>
            </div>
            {customerDataById?.id ? (
              <CustomerPreviewBox customerData={customerDataById} />
            ) : isEdit && (watch('customer_name') || watch('business_name')) ? (
              <div className="mt-4 flex flex-col gap-2">
                <CustomerPreviewBox
                  customerData={{
                    id: -1,
                    customer_type: watch('customer_type'),
                    full_name: watch('customer_name'),
                    business_name: watch('business_name'),
                    business_tax_code: watch('business_tax_code'),
                    business_representative: watch('business_representative'),
                    business_representative_title: watch('business_representative_title'),
                    phone: watch('customer_phone'),
                    email: watch('customer_email'),
                    address_detail: watch('customer_address'),
                    business_address: watch('business_address'),
                    date_of_birth: watch('customer_dob'),
                    gender: watch('customer_gender'),
                    id_number: watch('customer_cccd'),
                    id_issued_date: watch('customer_id_issued_date'),
                  }}
                />
              </div>
            ) : null}

            {watch('customer_type') === CustomerType.individual && (
              <div className="grid grid-cols-1 gap-4">
                {/* Hidden inputs to preserve schema validation form data */}
                <input type="hidden" {...register('customer_name')} />
                <input type="hidden" {...register('customer_dob')} />
                <input type="hidden" {...register('customer_gender')} />
                <input type="hidden" {...register('customer_phone')} />
                <input type="hidden" {...register('customer_email')} />
                <input type="hidden" {...register('customer_cccd')} />
                <input type="hidden" {...register('customer_id_issued_date')} />
                <input type="hidden" {...register('customer_province_id')} />
                <input type="hidden" {...register('customer_ward_id')} />
                <input type="hidden" {...register('customer_address')} />
              </div>
            )}

            {watch('customer_type') === CustomerType.business && (
              <div className="grid grid-cols-1 gap-4">
                {/* Hidden inputs to preserve schema validation form data */}
                <input type="hidden" {...register('business_name')} />
                <input type="hidden" {...register('business_tax_code')} />
                <input type="hidden" {...register('business_representative')} />
                <input type="hidden" {...register('business_representative_title')} />
                <input type="hidden" {...register('business_province_id')} />
                <input type="hidden" {...register('business_ward_id')} />
                <input type="hidden" {...register('business_address')} />
                <input type="hidden" {...register('customer_phone')} />
                <input type="hidden" {...register('customer_email')} />
              </div>
            )}
          </div>

          <Separator className="my-6" />

          <div className="bg-surface-primary-default rounded-md">
            <div className="mb-4">
              <h3 className="text-text-primary-default text-lg font-semibold">
                Thông tin sản phẩm
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <FormController<BookingContractFormValues, any>
                register={register}
                control={control}
                name="investor_id"
                Field={Select}
                fieldProps={{
                  label: 'Chủ đầu tư',
                  placeholder: 'Chọn CĐT',
                  loadOptions: loadInvestorOptions,
                  loadInitialOptions: loadInitialInvestorOptions,
                  enableSearch: true,
                  searchPlaceholder: 'Tìm CĐT...',
                  required: true,
                  options:
                    initialValues?.investor_id && initialValues?.investor_name
                      ? [{ value: initialValues.investor_id, label: initialValues.investor_name }]
                      : [],
                  onChange: (val: any) => {
                    // 86eyqrk7h: đổi sang CĐT KHÁC cũng phải dọn, không chỉ khi xoá trắng.
                    // `watchInvestorId` ở đây là giá trị TRƯỚC khi setValue chạy.
                    const daDoiCDT = isInvestorChanged(watchInvestorId, val)
                    setValue('investor_id', val, { shouldValidate: true })
                    if (daDoiCDT) {
                      clearInvestorDependents(setValue)
                      setSelectedProjectData(null)
                    }
                  },
                }}
              />
              <FormController<BookingContractFormValues, any>
                register={register}
                control={control}
                name="project_id"
                Field={Select}
                wrapperClassName="lg:col-span-2"
                fieldProps={{
                  label: 'Dự án',
                  placeholder: 'Chọn Dự án',
                  loadOptions: loadProjectOptions,
                  loadInitialOptions: loadInitialProjectOptions,
                  enableSearch: true,
                  searchPlaceholder: 'Tìm dự án...',
                  required: true,
                  options:
                    initialValues?.project_id && initialValues?.project_name
                      ? [{ value: initialValues.project_id, label: initialValues.project_name }]
                      : [],
                  onChange: async (val: any) => {
                    setValue('project_id', val, { shouldValidate: true })
                    if (!val) {
                      setValue('product_inventory_id', null as never)
                      setSelectedProjectData(null)
                    } else {
                      try {
                        const project = await getRealEstateService().getProject(val)
                        setSelectedProjectData(project)
                        if (project.investor?.id)
                          setValue('investor_id', project.investor.id, { shouldValidate: true })
                      } catch (e) {}
                    }
                  },
                }}
              />
              <FormController<BookingContractFormValues, any>
                register={register}
                control={control}
                name="sales_allocation"
                Field={Select}
                fieldProps={{
                  label: 'Thông tin bán hàng',
                  placeholder: 'Chọn Thông tin bán hàng',
                  loadOptions: loadSalesAllocationOptions,
                  loadInitialOptions: loadInitialSalesAllocationOptions,
                  enableSearch: true,
                  searchPlaceholder: 'Tìm thông tin bán hàng...',
                  options:
                    initialValues?.sales_allocation && initialValues?.sales_allocation_name
                      ? [
                          {
                            value: initialValues.sales_allocation,
                            label: initialValues.sales_allocation_name,
                          },
                        ]
                      : [],
                  onChange: async (val: any) => {
                    setValue('sales_allocation', val, { shouldValidate: true })
                    const piVal = watch('product_inventory_id')
                    if (!val && !piVal) {
                      setValue('pct_sale_commission', undefined as never)
                      setValue('amt_sale_commission', undefined as never)
                      setValue('sale_commission_type', 'pct', { shouldValidate: true })
                      setValue('pct_agency_fee', undefined as never)
                      setValue('pct_revenue', undefined as never)
                      setValue('amt_revenue', undefined as never)
                      setValue('revenue_type', 'pct')
                    } else if (val) {
                      // Prioritize PI commission if PI is selected and has commission configured
                      let piCommission = null
                      if (piVal) {
                        try {
                          const piCommData =
                            await getRealEstateService().getProductInventoryCurrentCommission(piVal)
                          piCommission = piCommData?.current_commission
                        } catch (e) {}
                      }

                      if (piCommission) {
                        fillCommissionValues(piCommission)
                      } else {
                        try {
                          const saCommission =
                            await getRealEstateService().getSalesAllocationCommissionWorkspaceCore(
                              val
                            )
                          const commission = saCommission?.current?.entry?.record
                          fillCommissionValues(commission)
                        } catch (e) {
                          console.error('Failed to autofill commission from SA:', e)
                        }
                      }
                    }
                  },
                }}
              />
              <FormController<BookingContractFormValues, any>
                register={register}
                control={control}
                name="product_inventory_id"
                Field={Select}
                fieldProps={{
                  label: 'Mã bất động sản',
                  placeholder: 'Chọn mã bất động sản',
                  loadOptions: loadProductInventoryOptions,
                  loadInitialOptions: loadInitialProductInventoryOptions,
                  enableSearch: true,
                  searchPlaceholder: 'Tìm mã bất động sản...',
                  options:
                    initialValues?.product_inventory_id &&
                    (initialValues?.unit_number || initialValues?.product_inventory_name)
                      ? [
                          {
                            value: initialValues.product_inventory_id,
                            label:
                              initialValues.unit_number || initialValues?.product_inventory_name,
                          },
                        ]
                      : [],
                  onChange: async (val: any) => {
                    setValue('product_inventory_id', val, { shouldValidate: true })
                    if (!val) {
                      setValue('pct_sale_commission', undefined as never)
                      setValue('fee_calculation_price', undefined as never)
                      setValue('pct_revenue', undefined as never)
                      setValue('amt_revenue', undefined as never)
                      setValue('revenue_type', 'pct')
                      setSelectedProductInfo(null)

                      // Re-fill from SA if SA is selected (fallback when PI is unselected)
                      const saVal = watch('sales_allocation')
                      if (saVal) {
                        try {
                          const saCommission =
                            await getRealEstateService().getSalesAllocationCommissionWorkspaceCore(
                              saVal
                            )
                          const commission = saCommission?.current?.entry?.record
                          fillCommissionValues(commission)
                        } catch (e) {
                          console.error('Failed to refill commission from SA:', e)
                        }
                      }
                    }
                    if (val) {
                      try {
                        // Clear exchange if partner when PI changes
                        const currentSales = watch('sales_staff') || []
                        const resetExchangeSales = currentSales.map((sale) => {
                          if (sale.sale_type === BookingRefundSaleSale_type.partner) {
                            return { ...sale, exchange_id: null, exchange_detail: null }
                          }
                          return sale
                        })
                        if (JSON.stringify(currentSales) !== JSON.stringify(resetExchangeSales)) {
                          setValue('sales_staff', resetExchangeSales, { shouldValidate: true })
                        }

                        const product = await getRealEstateService().getProductInventory(val)
                        setSelectedProductInfo(product)
                        if (product.project?.id) {
                          setValue('project_id', product.project.id, { shouldValidate: true })
                          try {
                            const project = await getRealEstateService().getProject(
                              product.project.id
                            )
                            setSelectedProjectData(project)
                          } catch (e) {}
                        }
                        if (product.investor?.id)
                          setValue('investor_id', product.investor.id, { shouldValidate: true })
                        if (product.sales_allocation?.id && !watch('sales_allocation')) {
                          setValue('sales_allocation', product.sales_allocation.id, {
                            shouldValidate: true,
                          })
                        }
                        if (
                          product.fee_calculation_price !== undefined &&
                          product.fee_calculation_price !== null
                        ) {
                          setValue('fee_calculation_price', Number(product.fee_calculation_price), {
                            shouldValidate: true,
                          })
                        }

                        // Fetch current commission from dedicated API: priority 1 = PI commission, priority 2 = fallback to SA
                        const commissionData =
                          await getRealEstateService().getProductInventoryCurrentCommission(val)
                        const piCommission = commissionData?.current_commission
                        if (piCommission) {
                          fillCommissionValues(piCommission)
                        } else {
                          const saVal = watch('sales_allocation')
                          if (saVal) {
                            try {
                              const saCommission =
                                await getRealEstateService().getSalesAllocationCommissionWorkspaceCore(
                                  saVal
                                )
                              const saRecord = saCommission?.current?.entry?.record
                              if (saRecord) {
                                fillCommissionValues(saRecord)
                              } else {
                                fillCommissionValues(null)
                              }
                            } catch (e) {
                              fillCommissionValues(null)
                            }
                          } else {
                            fillCommissionValues(null)
                          }
                        }
                      } catch (e) {}
                    }
                  },
                }}
              />
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
                    label="Giá tạm tính"
                    value={
                      selectedProductInfo.fee_calculation_price != null
                        ? `${formatCurrencyVND(Number(selectedProductInfo.fee_calculation_price))} VNĐ`
                        : '---'
                    }
                  />
                </div>
              </div>
            )}

            {watchProjectId && (
              <div className="mt-4 flex w-full">
                <div className="w-full">
                  <ProjectPreviewBox
                    projectData={selectedProjectData || { id: Number(watchProjectId) }}
                    targetDate={watchBookingDate}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator className="my-6" />

          <div className="bg-surface-primary-default rounded-md">
            <div className="mb-4">
              <h3 className="text-text-primary-default text-lg font-semibold">
                Thông tin hợp đồng
              </h3>
            </div>
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-12">
              <FormController<BookingContractFormValues, any>
                register={register}
                control={control}
                name="contract_number"
                Field={TextField}
                wrapperClassName="lg:col-span-4"
                fieldProps={{
                  label: 'Mã phiếu đặt cọc',
                  placeholder: 'Hệ thống tự động sinh',
                  readOnly: true,
                  required: false,
                }}
              />
              <FormController<BookingContractFormValues, any>
                register={register}
                control={control}
                name="priority_order"
                Field={TextField}
                wrapperClassName="lg:col-span-4"
                fieldProps={{
                  label: 'Số thứ tự ưu tiên',
                  placeholder: 'Nhập số thứ tự',
                  type: 'number',
                }}
              />
              <FormController<BookingContractFormValues, any>
                register={register}
                control={control}
                name="booking_date"
                Field={DatePicker}
                wrapperClassName="lg:col-span-4"
                fieldProps={{
                  label: 'Ngày đặt chỗ',
                  required: true,
                  disabledDays: { after: new Date() },
                }}
              />
              <FormController<BookingContractFormValues, any>
                register={register}
                control={control}
                name="payment_amount"
                Field={CurrencyInput}
                // 8 -> 4 để hàng này thành 4/4/4 (Số tiền | Hình thức | Nguồn tiền).
                // Để 8 thì 8+4 đã đầy 12 cột và Nguồn tiền bị đẩy xuống hàng riêng.
                wrapperClassName="lg:col-span-4"
                fieldProps={{
                  label: 'Số tiền thanh toán',
                  placeholder: 'Nhập số tiền',
                  required: true,
                }}
              />
              <div className="mt-2 lg:col-span-4">
                <Controller
                  control={control}
                  name="payment_method"
                  render={({ field, fieldState }) => (
                    <RadioGroup
                      id="payment-method"
                      label="Hình thức thanh toán"
                      options={paymentMethodOptions as { value: string; label: string }[]}
                      value={field.value}
                      onChange={field.onChange}
                      disabled={false}
                      required
                      error={fieldState.error?.message}
                      className="flex-row gap-4"
                    />
                  )}
                />
              </div>
              {/*
                Nơi nhận tiền nằm NGOÀI khối chuyển khoản: khách trả tiền mặt thẳng cho
                CĐT cũng phải ghi nhận. Hỏi riêng chuyển khoản là lý do 100% phiếu tiền
                mặt trước đây để trống cột này (44 phiếu / 3,2 tỷ trên dev), và cột này
                quyết định ai là người duyệt cuối.
              */}
              <FormController<BookingContractFormValues, any>
                register={register}
                control={control}
                name="transfer_to_account"
                Field={Select}
                wrapperClassName="lg:col-span-4"
                fieldProps={{
                  label: 'Nguồn tiền',
                  placeholder: 'Chọn nguồn tiền',
                  required: true,
                  options: [
                    {
                      value: BookingTransferToAccount.mv,
                      label: 'Công ty',
                    },
                    {
                      value: BookingTransferToAccount.investor,
                      label: 'Chủ đầu tư',
                    },
                  ],
                }}
              />
              {watch('payment_method') === DepositContractPaymentMethod.transfer && (
                <>
                  <FormController<BookingContractFormValues, any>
                    register={register}
                    control={control}
                    name="source_account_holder_name"
                    Field={TextField}
                    wrapperClassName="lg:col-span-6"
                    fieldProps={{
                      label: 'Tên tài khoản nguồn',
                      placeholder: 'Nhập tên tài khoản',
                      required: true,
                    }}
                  />
                  <FormController<BookingContractFormValues, any>
                    register={register}
                    control={control}
                    name="source_account_number"
                    Field={TextField}
                    wrapperClassName="lg:col-span-6"
                    fieldProps={{
                      label: 'Số tài khoản nguồn',
                      placeholder: 'Nhập số tài khoản',
                      required: true,
                    }}
                  />
                  <FormController<BookingContractFormValues, any>
                    register={register}
                    control={control}
                    name="source_bank_name"
                    Field={Select}
                    wrapperClassName="lg:col-span-6"
                    fieldProps={{
                      label: 'Mở tài khoản tại',
                      placeholder: 'Chọn tên ngân hàng',
                      required: true,
                      options: bankOptions,
                      enableSearch: true,
                      searchPlaceholder: 'Tìm kiếm ngân hàng...',
                    }}
                  />
                </>
              )}

              <FormController<BookingContractFormValues, any>
                register={register}
                control={control}
                name="notes"
                Field={TextArea}
                wrapperClassName="lg:col-span-12"
                fieldProps={{
                  label: 'Ghi chú',
                  placeholder: 'Nhập ghi chú',
                  maxCharacters: 500,
                }}
              />
            </div>
          </div>

          <Separator className="my-6" />

          <div id="sales_staff" className="bg-surface-primary-default rounded-md">
            {/* Staff Commission Table */}
            <CommonSaleStaffTable
              module="booking"
              paymentAmount={watchPaymentAmount || 0}
              isReadOnly={false}
            />
          </div>

          <Separator className="my-6" />

          <div className="bg-surface-primary-default rounded-md">
            <div className="mb-4">
              <h3 className="text-text-primary-default text-lg font-semibold">
                Tệp đính kèm
                {/* CR STT24: đính kèm là bắt buộc. Dấu * đặt ở tiêu đề section vì FileUpload
                    chạy `hiddenLabel` nên không tự render nhãn + dấu bắt buộc. */}
                <span className="text-action-primary-red-default">&nbsp;*</span>
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-4">
              <FormController<BookingContractFormValues, any>
                register={register}
                control={control}
                name="attachments"
                Field={FileUpload}
                fieldProps={{
                  hiddenLabel: true,
                  multiple: true,
                  purpose: 'booking_contract_document',
                  existingFiles: initialValues?.attachments_detail || [],
                  onKeptExistingIdsChange: (ids: number[]) => setValue('kept_attachment_ids', ids),
                  required: true,
                }}
              />
            </div>
          </div>

          {(initialValues?.confirmation_logs?.length ?? 0) > 0 && (
            <>
              <Separator className="my-6" />
              <div className="bg-surface-primary-default rounded-md">
                <div className="mb-4">
                  <h3 className="text-text-primary-default text-lg font-semibold">
                    Thông tin người xác nhận
                  </h3>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <ConfirmationLogsTable logs={initialValues?.confirmation_logs ?? []} />
                </div>
              </div>
            </>
          )}

          <Flex justify="end" gap="4" className="pt-6">
            <Button
              type="button"
              onClick={() => window.history.back()}
              variant="secondary"
              disabled={isBusy}
              className="w-[150px]"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isBusy}
              loading={isBusy}
              className="w-[150px]"
            >
              {isEdit ? 'Cập nhật' : 'Tạo mới'}
            </Button>
          </Flex>
        </form>
      </FormProvider>
    )
  }
)

BookingContractForm.displayName = 'BookingContractForm'

export default BookingContractForm

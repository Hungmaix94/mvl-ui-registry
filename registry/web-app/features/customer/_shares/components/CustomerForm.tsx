import { useEffect, useMemo, useRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, RadioGroup, Select, TextArea, TextField, FileUpload } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Flex } from '@radix-ui/themes'
import { useNavigate } from 'react-router-dom'
import { getCustomerSchema, type CustomerFormValues } from '@/features/customer/_shares/schemas'
import { type Customer, useCreateCustomer, useUpdateCustomer } from '@/services/sales-service'
import { useInvalidateQueries } from '@/hooks/useApiQuery.ts'
import { handleApiError } from '@/utils/error-utils.ts'
import toastService from '@/services/toast-service.tsx'
import { APP_PATH } from '@/routes'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { useProvinces } from '@/services/province-service'
import { useAdministrativeUnitSelect } from '@/hooks/useAdministrativeUnitSelect.ts'
import { PAGE_SIZE } from '@/constants/table.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { CustomerType as CustomerType } from '@/constants/api-schema-aliases'

type BaseProps = {
  onSuccess?: () => void
  onCancel?: () => void
}

type CreateModeProps = BaseProps & {
  mode: 'create'
  customer?: never
}

type EditModeProps = BaseProps & {
  mode: 'edit'
  customer: Customer
}

type CustomerFormProps = CreateModeProps | EditModeProps

export default function CustomerForm({ mode, customer, onSuccess, onCancel }: CustomerFormProps) {
  const navigate = useNavigate()
  const createMutation = useCreateCustomer()
  const updateMutation = useUpdateCustomer()
  const invalidateQueries = useInvalidateQueries()
  const { data: provinces = [] } = useProvinces()

  const { keysMapOptions } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.CUSTOMER.TYPE, APP_CONSTANT_KEY.SALES.CUSTOMER.GENDER],
  })

  const schema = useMemo(() => getCustomerSchema(mode), [mode])

  const {
    register,
    control,
    handleSubmit,
    setValue,
    trigger,
    watch,
    formState: { isSubmitting, isSubmitted },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(schema) as any,
    mode: 'onTouched',
    defaultValues: {
      customer_type: customer?.customer_type || CustomerType.individual,
      phone: customer?.phone || '',
      email: customer?.email || '',
      full_name:
        (customer as unknown as { name?: string; full_name?: string })?.name ||
        customer?.full_name ||
        '',
      address_detail: customer?.address_detail || '',
      province_id: customer?.province_detail?.id || undefined,
      ward_id: customer?.ward_detail?.id || undefined,
      gender: customer?.gender || undefined,
      date_of_birth: customer?.date_of_birth ? new Date(customer.date_of_birth) : undefined,
      id_number: customer?.id_number || '',
      id_issued_date: customer?.id_issued_date ? new Date(customer.id_issued_date) : undefined,
      note: customer?.note || '',
      business_name: customer?.business_name || '',
      business_tax_code: customer?.business_tax_code || '',
      business_representative: customer?.business_representative || '',
      business_representative_title: customer?.business_representative_title || '',
      business_address: customer?.business_address || '',
      business_province_id: customer?.business_province_detail?.id || undefined,
      business_ward_id: customer?.business_ward_detail?.id || undefined,
    },
  })

  const customerType = watch('customer_type')
  const provinceId = watch('province_id')
  const businessProvinceId = watch('business_province_id')
  const isIndividual = customerType === CustomerType.individual
  const isBusiness = customerType === CustomerType.business

  const prevProvinceRef = useRef<number | null | undefined>(provinceId)
  const prevBusinessProvinceRef = useRef<number | null | undefined>(businessProvinceId)

  // Load-on-scroll + server-side search for administrative units (Phường/Xã) of the
  // individual's residential province.
  const { loadAdministrativeUnitOptions, loadInitialAdministrativeUnitOptions } =
    useAdministrativeUnitSelect({
      parentProvince: provinceId ?? null,
      pageSize: PAGE_SIZE,
    })

  // Same, scoped to the business registration province.
  const {
    loadAdministrativeUnitOptions: loadBusinessAdministrativeUnitOptions,
    loadInitialAdministrativeUnitOptions: loadBusinessInitialAdministrativeUnitOptions,
  } = useAdministrativeUnitSelect({
    parentProvince: businessProvinceId ?? null,
    pageSize: PAGE_SIZE,
  })

  useEffect(() => {
    if (prevProvinceRef.current !== provinceId) {
      setValue('ward_id', null as any, { shouldDirty: true })
    }
    prevProvinceRef.current = provinceId
  }, [provinceId, setValue])

  useEffect(() => {
    if (prevBusinessProvinceRef.current !== businessProvinceId) {
      setValue('business_ward_id', null as any, { shouldDirty: true })
    }
    prevBusinessProvinceRef.current = businessProvinceId
  }, [businessProvinceId, setValue])

  const provinceOptions = provinces.map((p) => ({ value: p.id, label: p.name }))

  const customerTypeOptions = useMemo(() => {
    return keysMapOptions.get(APP_CONSTANT_KEY.SALES.CUSTOMER.TYPE) || []
  }, [keysMapOptions])

  const genderOptions = useMemo(() => {
    return keysMapOptions.get(APP_CONSTANT_KEY.SALES.CUSTOMER.GENDER) || []
  }, [keysMapOptions])

  const onSubmit = async (data: CustomerFormValues) => {
    try {
      const payload: any = {
        ...data,
      }

      if (!payload.email) {
        delete payload.email
      }

      if (data.customer_type === CustomerType.individual) {
        if (data.date_of_birth) {
          payload.date_of_birth = formatDateToApi(data.date_of_birth)
        }
        if (data.id_issued_date) {
          payload.id_issued_date = formatDateToApi(data.id_issued_date)
        }
      }

      const tokens = data.attachment_tokens?.filter((token) => token !== '')
      if (tokens?.length) {
        payload.files = { attachments: tokens }
      }
      if (mode === 'edit' && data.attachment_keep_ids) {
        payload.existing_files = { attachments: data.attachment_keep_ids }
      }

      if (mode === 'create') {
        await createMutation.mutateAsync(payload)
        toastService.success('Tạo khách hàng thành công')
        await invalidateQueries.invalidateByPrefix('sales/customers')
        onSuccess?.() || navigate(APP_PATH.CUSTOMER_MANAGER)
      } else {
        await updateMutation.mutateAsync({
          id: customer!.id,
          data: payload,
        })
        toastService.success('Cập nhật khách hàng thành công')
        await invalidateQueries.invalidateByPrefix('sales/customers')
        onSuccess?.()
      }
    } catch (error) {
      handleApiError(error)
    }
  }

  return (
    <Form loading={isSubmitting} onSubmit={onSubmit} handleSubmit={handleSubmit}>
      <div className="space-y-6 px-10 py-4">
        {/* Basic Information Section */}
        <h3 className="mb-4 text-base font-semibold">Thông tin cơ bản</h3>
        <div className="grid grid-cols-2 gap-4">
          {mode === 'edit' && (
            <TextField label="Mã khách hàng" value={customer?.code ?? ''} disabled />
          )}
          <div className={mode === 'create' ? 'col-span-2' : ''}>
            <Controller
              name="customer_type"
              control={control}
              render={({ field, fieldState }) => (
                <RadioGroup
                  id="customer-type"
                  label="Loại khách hàng"
                  required
                  options={customerTypeOptions}
                  value={field.value ?? undefined}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                  error={fieldState.error?.message}
                  className="flex-row gap-[26px]"
                />
              )}
            />
          </div>
          <FormController
            register={register}
            name="phone"
            control={control}
            Field={TextField}
            fieldProps={{
              label: 'Số điện thoại',
              placeholder: 'Nhập số điện thoại',
              required: true,
            }}
          />
          <FormController
            register={register}
            name="email"
            control={control}
            Field={TextField}
            fieldProps={{
              label: 'Email',
              placeholder: 'Nhập email',
              required: true,
            }}
          />
        </div>

        {/* Individual-specific fields */}
        {isIndividual && (
          <div className="grid grid-cols-2 gap-4">
            <FormController
              register={register}
              name="full_name"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Họ và tên',
                placeholder: 'Nhập họ và tên',
                required: true,
              }}
            />
            <FormController
              register={register}
              name="address_detail"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Địa chỉ thường trú (theo CCCD)',
                placeholder: 'Nhập địa chỉ thường trú',
                required: true,
              }}
            />
            <FormController
              register={register}
              name="province_id"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Tỉnh/Thành phố',
                options: provinceOptions,
                placeholder: 'Chọn tỉnh/thành phố',
                required: true,
                enableSearch: true,
                searchPlaceholder: 'Tìm kiếm tỉnh/thành phố',
              }}
            />
            <FormController
              register={register}
              name="ward_id"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Phường/Xã',
                loadOptions: loadAdministrativeUnitOptions,
                loadInitialOptions: loadInitialAdministrativeUnitOptions,
                pageSize: PAGE_SIZE,
                placeholder: 'Chọn phường/xã',
                required: true,
                disabled: !provinceId,
                enableSearch: true,
                searchPlaceholder: 'Tìm kiếm phường/xã',
                triggerVariant: 'count' as const,
              }}
            />
            <FormController
              register={register}
              name="date_of_birth"
              control={control}
              Field={DatePicker}
              fieldProps={{
                label: 'Ngày sinh',
                placeholder: 'Chọn ngày sinh',
                required: true,
                allowManualInput: true,
              }}
            />
            <Controller
              name="gender"
              control={control}
              render={({ field, fieldState }) => (
                <RadioGroup
                  id="gender"
                  label="Giới tính"
                  required
                  options={genderOptions}
                  value={field.value ?? undefined}
                  onChange={field.onChange}
                  disabled={isSubmitting}
                  error={fieldState.error?.message}
                />
              )}
            />

            <FormController
              register={register}
              name="id_number"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'CCCD',
                placeholder: 'Nhập CCCD',
                required: true,
              }}
            />
            <FormController
              register={register}
              name="id_issued_date"
              control={control}
              Field={DatePicker}
              fieldProps={{
                label: 'Ngày cấp',
                placeholder: 'Chọn ngày cấp',
                required: true,
                allowManualInput: true,
              }}
            />
          </div>
        )}

        {/* Business-specific fields */}
        {isBusiness && (
          <div className="grid grid-cols-2 gap-4">
            <FormController
              register={register}
              name="business_name"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Tên doanh nghiệp',
                placeholder: 'Nhập tên doanh nghiệp',
                required: true,
              }}
            />
            <FormController
              register={register}
              name="business_tax_code"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Mã số thuế',
                placeholder: 'Nhập mã số thuế',
                required: true,
              }}
            />
            <FormController
              register={register}
              name="business_representative"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Người đại diện doanh nghiệp (theo PL/UQ)',
                placeholder: 'Nhập người đại diện',
                required: true,
              }}
            />
            <FormController
              register={register}
              name="business_representative_title"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Chức vụ người đại diện',
                placeholder: 'Nhập chức vụ',
                required: true,
              }}
            />
            <FormController
              register={register}
              name="business_province_id"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Tỉnh/Thành phố',
                options: provinceOptions,
                placeholder: 'Chọn tỉnh/thành phố',
                required: true,
                enableSearch: true,
                searchPlaceholder: 'Tìm kiếm tỉnh/thành phố',
              }}
            />
            <FormController
              register={register}
              name="business_ward_id"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Phường/Xã',
                loadOptions: loadBusinessAdministrativeUnitOptions,
                loadInitialOptions: loadBusinessInitialAdministrativeUnitOptions,
                pageSize: PAGE_SIZE,
                placeholder: 'Chọn phường/xã',
                required: true,
                disabled: !businessProvinceId,
                enableSearch: true,
                searchPlaceholder: 'Tìm kiếm phường/xã',
                triggerVariant: 'count' as const,
              }}
            />
            <FormController
              register={register}
              name="business_address"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Địa chỉ (theo ĐKKD)',
                placeholder: 'Nhập địa chỉ ĐKKD',
                required: true,
              }}
            />
          </div>
        )}

        <div data-field-name="attachment_tokens">
          <Controller
            name="attachment_tokens"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <FileUpload
                value={field.value}
                onChange={(v: string | string[]) =>
                  field.onChange(Array.isArray(v) ? v : v ? [v] : [])
                }
                label="Tài liệu đính kèm"
                purpose={(APP_CONSTANT_KEY.SALES as any)?.FILE_PURPOSE_CUSTOMER || 'customer'}
                existingFiles={
                  mode === 'edit' &&
                  (customer && 'attachments' in customer
                    ? (customer as unknown as { attachments: any[] }).attachments
                    : undefined)
                    ? (customer as unknown as { attachments: any[] }).attachments
                    : undefined
                }
                onKeptExistingIdsChange={(ids) => {
                  setValue('attachment_keep_ids', ids)
                  // Sau lần submit đầu, xoá nốt tệp cũ cuối cùng phải hiện lỗi ngay thay vì đợi
                  // submit lại. Phải trigger đúng 'attachment_tokens': lỗi bắt buộc đính kèm gắn
                  // ở path đó, mà `trigger(name)` chỉ set/unset errors tại chính path được truyền
                  // — nên `setValue('attachment_keep_ids', …, { shouldValidate: true })` không
                  // đụng tới lỗi này.
                  if (isSubmitted) void trigger('attachment_tokens')
                }}
                disabled={isSubmitting}
                required
                multiple
                error={error?.message}
              />
            )}
          />
        </div>

        {/* Note field is common */}
        <FormController
          register={register}
          name="note"
          control={control}
          Field={TextArea}
          fieldProps={{
            label: 'Ghi chú',
            placeholder: 'Nhập ghi chú',
          }}
        />

        {/* Form Actions */}
        <Flex gap="3" justify="end">
          <Button type="button" variant="secondary" onClick={onCancel || (() => navigate(-1))}>
            Hủy
          </Button>
          <Button type="submit" loading={isSubmitting}>
            {mode === 'create' ? 'Tạo khách hàng' : 'Cập nhật khách hàng'}
          </Button>
        </Flex>
      </div>
    </Form>
  )
}

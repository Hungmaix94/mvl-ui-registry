import { useCallback, useEffect, forwardRef, useImperativeHandle } from 'react'
import { FormProvider, type SubmitHandler, useForm, type UseFormSetError } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { Button, CurrencyInput, FileUpload, Select, TextField } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import { Separator } from '@/components/ui/separator'
import { TextArea } from '@/components/ui/text-area'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { useBookingContractLoadOptions } from '@/features/project/booking-contract/services/useBookingContractLoadOptions'
import { FeeCalcQuickActions } from '@/features/project/product-inventories/components/FeeCalcQuickActions'
import { getRealEstateService } from '@/services/realestate-service'
import {
  productInventoryFormSchema,
  type ProductInventoryFormValues,
} from '@/features/project/product-inventories/types/product-inventory-form-types'
import useAppConstant from '@/hooks/useAppConstant'

import { useExchangeSelect } from '@/hooks/useExchangeSelect'
import { useInvestorSelect } from '@/hooks/useInvestorSelect'
import { scrollToFirstError } from '@/utils/form-utils'

type ProductInventoryFormProps = {
  initialValues?: Partial<ProductInventoryFormValues>
  onSubmit: (values: ProductInventoryFormValues) => Promise<void> | void
  onCancel: () => void
  isSubmitting?: boolean
  isEdit?: boolean
  hideFooter?: boolean
  hideTitle?: boolean
  id?: string
  contextSaId?: number
}

export type ProductInventoryFormRef = {
  setError: UseFormSetError<ProductInventoryFormValues>
}

export const ProductInventoryForm = forwardRef<ProductInventoryFormRef, ProductInventoryFormProps>(
  (
    {
      initialValues,
      onSubmit,
      onCancel,
      isSubmitting,
      isEdit = false,
      hideFooter = false,
      id,
      contextSaId,
    },
    ref
  ) => {
    const form = useForm<ProductInventoryFormValues>({
      resolver: zodResolver(productInventoryFormSchema),
      defaultValues: {
        status: 'available',
        ...initialValues,
      },
      values: initialValues as ProductInventoryFormValues,
    })

    const { keysMapOptions } = useAppConstant({
      module: 'realestate',
      keys: [
        APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_STATUS_CHOICES,
        APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_PRODUCT_TYPE_CHOICES,
      ],
    })

    // "locked" bị backend khoá ghi qua API (status/condition chỉ đổi qua nghiệp vụ Booking/Đặt
    // cọc) và SRS 17.4 đã bỏ state này khỏi thiết kế mới — ẩn khỏi dropdown để tránh người dùng
    // chọn nhầm một option không có tác dụng gì (ClickUp 86eybhjyv).
    const statusOptions = (
      keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_STATUS_CHOICES) || []
    ).filter((option) => option.value !== 'locked')
    const productTypeOptions =
      keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_PRODUCT_TYPE_CHOICES) || []

    const { register, control, handleSubmit, watch, setValue } = form

    useImperativeHandle(ref, () => ({
      setError: form.setError,
    }))

    const watchInvestorId = watch('investor_id')
    const watchProjectId = watch('project_id')
    const watchSalesAllocationId = watch('sales_allocation_id')

    const { loadInvestorOptions, loadInitialInvestorOptions } = useInvestorSelect({
      valueType: 'id',
    })
    const {
      loadProjectOptions,
      loadSalesAllocationOptions,
      loadInitialProjectOptions,
      loadInitialSalesAllocationOptions,
    } = useBookingContractLoadOptions({
      investorId: watchInvestorId,
      projectId: watchProjectId,
    })

    const { loadExchangeOptions, loadInitialExchangeOptions } = useExchangeSelect()

    const watchArea = watch('area') as string | number | null | undefined
    const watchListedPrice = watch('listed_price') as string | number | null | undefined

    useEffect(() => {
      const areaVal =
        typeof watchArea === 'string' ? parseFloat(watchArea.replace(/,/g, '.')) : Number(watchArea)
      const listedPriceVal =
        typeof watchListedPrice === 'string'
          ? parseFloat(watchListedPrice.replace(/,/g, '.'))
          : Number(watchListedPrice)

      if (areaVal && areaVal > 0 && listedPriceVal && listedPriceVal > 0) {
        const pricePerSqm = Math.round(listedPriceVal / areaVal)
        setValue('price_per_sqm', pricePerSqm, { shouldValidate: true })
      }
    }, [watchArea, watchListedPrice, setValue])

    const handleFormSubmit: SubmitHandler<ProductInventoryFormValues> = useCallback(
      async (values) => {
        try {
          await onSubmit(values)
        } catch (error) {
          console.error('Submit ProductInventory error:', error)
        }
      },
      [onSubmit]
    )

    return (
      <FormProvider {...form}>
        <form
          id={id}
          onSubmit={handleSubmit(handleFormSubmit as any, scrollToFirstError as any)}
          className="space-y-6"
        >
          {/* ────────────────────────────────────────────────────────
                    SECTION 1 — Thông tin Dự án
                ──────────────────────────────────────────────────────── */}
          <div className="bg-surface-primary-default rounded-md p-4">
            <div className="mb-4">
              <h3 className="text-text-primary-default text-lg font-semibold">
                Thông tin bán hàng
              </h3>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
              <FormController<ProductInventoryFormValues, any>
                register={register}
                control={control}
                name="investor_id"
                Field={Select}
                fieldProps={{
                  label: 'Chủ đầu tư',
                  loadOptions: loadInvestorOptions,
                  loadInitialOptions: loadInitialInvestorOptions,
                  enableSearch: true,
                  required: true,
                  disabled: isSubmitting || isEdit || !!contextSaId,
                  onChangeOption: (option: any) => {
                    if (option && option.value !== watchInvestorId) {
                      setValue('project_id', undefined as unknown as number)
                      setValue('sales_allocation_id', undefined as unknown as number)
                    }
                  },
                }}
              />
              <FormController<ProductInventoryFormValues, any>
                register={register}
                control={control}
                name="project_id"
                Field={Select}
                fieldProps={{
                  label: 'Dự án',
                  loadOptions: loadProjectOptions,
                  loadInitialOptions: loadInitialProjectOptions,
                  enableSearch: true,
                  required: true,
                  disabled: isSubmitting || isEdit || !!contextSaId,
                  onChangeOption: (option: any) => {
                    if (option && option.value !== watchProjectId) {
                      setValue('sales_allocation_id', undefined as unknown as number)
                      if (option?.item?.investor?.id) {
                        setValue('investor_id', option.item.investor.id)
                      }
                    }
                  },
                }}
              />
              <FormController<ProductInventoryFormValues, any>
                register={register}
                control={control}
                name="sales_allocation_id"
                Field={Select}
                fieldProps={{
                  label: 'Thông tin bán hàng',
                  placeholder: 'Chọn Thông tin bán hàng',
                  loadOptions: loadSalesAllocationOptions,
                  loadInitialOptions: loadInitialSalesAllocationOptions,
                  enableSearch: true,
                  required: true,
                  // Khoá sau khi tạo: PI thừa kế các kỳ TBC của SA (tbc_source='sa'),
                  // đổi SA làm mọi tỷ lệ hoa hồng đã chốt bị tính lại theo SA mới → lệch tỷ lệ.
                  disabled: isSubmitting || isEdit || !!contextSaId,
                  onChangeOption: async (option: any) => {
                    if (option && option.value !== watchSalesAllocationId) {
                      try {
                        // Fetch full SalesAllocation explicitly because option.item from dropdown schema lacks nested info needed generally
                        const detail = await getRealEstateService().getSalesAllocation(option.value)
                        if (detail) {
                          if (detail.investor?.id) {
                            setValue('investor_id', detail.investor.id as unknown as number)
                          }
                          if (detail.project?.id) {
                            setValue('project_id', detail.project.id as unknown as number)
                          }
                        }
                      } catch (error) {
                        console.error('Lỗi khi tải Thông tin bán hàng để auto-fill', error)
                      }
                    }
                  },
                }}
              />
              <FormController<ProductInventoryFormValues, any>
                register={register}
                control={control}
                name="distribution_exchange_id"
                Field={Select}
                fieldProps={{
                  label: (
                    <div className="flex items-center gap-1">
                      <span>Sàn liên kết</span>
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="text-neutral-60 h-3.5 w-3.5 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">Phân phối độc quyền</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  ),
                  loadOptions: loadExchangeOptions,
                  loadInitialOptions: loadInitialExchangeOptions,
                  enableSearch: true,
                  disabled: isSubmitting,
                }}
              />
            </div>
          </div>

          <Separator className="my-6" />

          {/* ────────────────────────────────────────────────────────
                    SECTION 2 — Thông tin Bất động sản
                ──────────────────────────────────────────────────────── */}
          <div className="bg-surface-primary-default rounded-md p-4">
            <div className="mb-4">
              <h3 className="text-text-primary-default text-lg font-semibold">
                Thông tin bất động sản
              </h3>
            </div>
            <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-4">
              <FormController<ProductInventoryFormValues, any>
                register={register}
                control={control}
                name="product_type"
                Field={Select}
                fieldProps={{
                  label: 'Loại sản phẩm',
                  placeholder: 'Chọn loại sản phẩm',
                  options: productTypeOptions,
                  required: true,
                  disabled: isSubmitting,
                }}
              />
              <FormController<ProductInventoryFormValues, any>
                register={register}
                control={control}
                name="tower"
                Field={TextField}
                fieldProps={{
                  label: 'Tòa nhà / Phân khu',
                  disabled: isSubmitting,
                }}
              />
              <FormController<ProductInventoryFormValues, any>
                register={register}
                control={control}
                name="unit_number"
                Field={TextField}
                fieldProps={{
                  label: 'Mã bất động sản',
                  required: true,
                  disabled: isSubmitting,
                }}
              />
              <FormController<ProductInventoryFormValues, any>
                register={register}
                control={control}
                name="area"
                Field={TextField}
                fieldProps={{
                  label: 'Diện tích',
                  suffix: 'm²',
                  disabled: isSubmitting,
                }}
              />
              <FormController<ProductInventoryFormValues, any>
                register={register}
                control={control}
                name="listed_price"
                Field={CurrencyInput}
                fieldProps={{
                  label: 'Giá niêm yết',
                  required: true,
                  suffix: 'VNĐ',
                  disabled: isSubmitting,
                }}
              />
              <div>
                <FormController<ProductInventoryFormValues, any>
                  register={register}
                  control={control}
                  name="fee_calculation_price"
                  Field={CurrencyInput}
                  fieldProps={{
                    label: 'Giá tạm tính',
                    required: true,
                    suffix: 'VNĐ',
                    disabled: isSubmitting,
                  }}
                />
                <FeeCalcQuickActions
                  listedPrice={watchListedPrice}
                  disabled={isSubmitting}
                  onApply={(value) =>
                    setValue('fee_calculation_price', value, { shouldValidate: true })
                  }
                />
              </div>
              <FormController<ProductInventoryFormValues, any>
                register={register}
                control={control}
                name="price_per_sqm"
                Field={CurrencyInput}
                fieldProps={{
                  label: 'Giá mỗi m²',
                  suffix: 'VNĐ',
                  disabled: isSubmitting,
                }}
              />
              <FormController<ProductInventoryFormValues, any>
                register={register}
                control={control}
                name="status"
                Field={Select}
                fieldProps={{
                  label: 'Trạng thái',
                  options: statusOptions,
                  disabled: isSubmitting,
                }}
              />
            </div>

            <div className="mt-4 flex flex-col gap-4">
              <FormController<ProductInventoryFormValues, any>
                register={register}
                control={control}
                name="note"
                Field={TextArea}
                fieldProps={{
                  label: 'Ghi chú',
                  placeholder: 'Nhập ghi chú chung...',
                  disabled: isSubmitting,
                }}
              />
            </div>
          </div>

          {/* ────────────────────────────────────────────────────────
                    SECTION 8 — Tài liệu đính kèm
                ──────────────────────────────────────────────────────── */}
          <div className="bg-surface-primary-default rounded-md p-4">
            <div className="mb-4">
              <h3 className="text-text-primary-default text-lg font-semibold">Tài liệu đính kèm</h3>
            </div>
            <div className="flex flex-col gap-4">
              {/* We capture File Uploads in the 'files' field. Optional. */}
              <div>
                <FormController<ProductInventoryFormValues, any>
                  register={register}
                  control={control}
                  name="files"
                  Field={FileUpload}
                  fieldProps={{
                    multiple: true,
                    placeholder: 'Kéo thả hoặc nhấn để chọn file',
                    disabled: isSubmitting,
                    hiddenLabel: true,
                    required: false,
                    purpose: 'product_inventory',
                  }}
                />
              </div>
            </div>
          </div>

          {/* ─── Footer Actions ──────────────────────────────────── */}
          {!hideFooter && (
            <Flex gap="4" justify="end" className="border-border-1 border-t pt-4">
              <Button
                type="button"
                variant="secondary-border"
                onClick={onCancel}
                disabled={isSubmitting}
                className="w-[150px]"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                variant="primary"
                loading={isSubmitting}
                disabled={isSubmitting}
                className="w-[150px]"
              >
                {isEdit ? 'Cấu hình lại' : 'Tạo Bất động sản'}
              </Button>
            </Flex>
          )}
        </form>
      </FormProvider>
    )
  }
)

export default ProductInventoryForm

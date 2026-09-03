import { forwardRef, useImperativeHandle, useMemo, useState, useEffect } from 'react'
import { useForm, FormProvider, type Resolver, type SubmitHandler } from 'react-hook-form'
import {
  PatchedProductInventoryRequestProduct_type,
  PatchedSalesAllocationRequestPhase,
} from '@/api/schema'
import { ReconciliationSourceType } from '@/constants/api-schema-aliases'
import { zodResolver } from '@hookform/resolvers/zod'
import { Select, TextField, CurrencyInput, TextArea } from '@/components/ui'
import { FileUpload } from '@/components/ui/file-upload/FileUpload'

import SeparatorHorizontal from '@/components/ui/separator/SeparatorHorizontal'
import FormController from '@/components/ui/form/FormController'
import {
  salesAllocationFormSchema,
  type SalesAllocationFormValues,
} from '../types/sale-allocation-types'
import { scrollToFirstError } from '@/utils/form-utils'
import { toSelectId } from '@/utils/select-option-utils'

import { useSaleAllocationLoadOptions } from '../services/useSaleAllocationLoadOptions'
import { useInvestorSelect } from '@/hooks/useInvestorSelect'
import { useDialog } from '@/hooks/useDialog'
import { getRealEstateService } from '@/services/realestate-service'
import SourceExchangeSelectWithCreate from '@/features/exchange/_shares/components/SourceExchangeSelectWithCreate'
import { ProjectPreviewBox } from '@/features/sales/components/ProjectPreviewBox'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

export type SaleAllocationFormRef = {
  getValues: () => SalesAllocationFormValues
  handleSubmit: (
    onSubmit: (data: SalesAllocationFormValues) => void | Promise<void>
  ) => () => Promise<void>
  setError: (
    name: keyof SalesAllocationFormValues,
    error: { type?: string; message: string }
  ) => void
}

type SaleAllocationFormProps = {
  initialValues?: Partial<SalesAllocationFormValues>
  onSubmit: (data: SalesAllocationFormValues) => void
  isSubmitting?: boolean
  isEdit?: boolean
}

export const SaleAllocationForm = forwardRef<SaleAllocationFormRef, SaleAllocationFormProps>(
  ({ initialValues, onSubmit, isEdit }, ref) => {
    const preparedInitialValues = useMemo(() => {
      return {
        ...initialValues,
        investor_id:
          (initialValues as Record<string, any>)?.investor?.id || initialValues?.investor_id,
        project_id:
          (initialValues as Record<string, any>)?.project?.id || initialValues?.project_id,
        source_exchange_id:
          (initialValues as Record<string, any>)?.source_exchange?.id ||
          initialValues?.source_exchange_id,
        linked_exchange_id:
          (initialValues as Record<string, any>)?.linked_exchange?.id ||
          initialValues?.linked_exchange_id,
      } as SalesAllocationFormValues
    }, [initialValues])

    const form = useForm<SalesAllocationFormValues>({
      resolver: zodResolver(salesAllocationFormSchema) as Resolver<SalesAllocationFormValues>,
      defaultValues: preparedInitialValues,
      values: preparedInitialValues,
    })

    const {
      register,
      control,
      handleSubmit: formHandleSubmit,
      watch,
      setValue,
      setError,
      clearErrors,
    } = form

    const watchInvestorId = watch('investor_id')
    const watchProjectId = watch('project_id')
    const [projectDataById, setProjectDataById] = useState<any>(null)

    useEffect(() => {
      let isMounted = true
      const fetchProject = async () => {
        if (watchProjectId) {
          try {
            const proj = await getRealEstateService().getProject(watchProjectId)
            if (isMounted) {
              setProjectDataById(proj)

              // Prefill fields if not editing or if project changed
              const isInitialLoadForEdit = isEdit && initialValues?.project_id === watchProjectId

              if (proj.investor?.id) {
                setValue('investor_id', proj.investor.id, { shouldValidate: true })
                clearErrors('project_id')
              } else {
                // BE chặn tạo/sửa bảng hàng trên dự án chưa có CĐT (một dự án chỉ thuộc
                // đúng 1 CĐT, và bảng hàng lấy CĐT theo dự án). Báo ngay tại đây thay vì
                // để 400 nổ ra lúc submit.
                setValue('investor_id', null as unknown as number, { shouldValidate: true })
                setError('project_id', {
                  type: 'manual',
                  message: 'Dự án chưa có chủ đầu tư. Cập nhật CĐT ở màn Dự án trước.',
                })
              }

              if (!isInitialLoadForEdit) {
                if (proj.project_type) {
                  setValue(
                    'project_type',
                    proj.project_type as PatchedProductInventoryRequestProduct_type,
                    {
                      shouldValidate: true,
                    }
                  )
                }
                if (proj.phase) {
                  let mappedPhase: PatchedSalesAllocationRequestPhase | null = null
                  switch (proj.phase) {
                    case 'planning':
                    case 'negotiation':
                    case 'signed':
                    case 'packaging':
                      mappedPhase = PatchedSalesAllocationRequestPhase.preparation
                      break
                    case 'selling':
                      mappedPhase = PatchedSalesAllocationRequestPhase.selling
                      break
                    case 'completed':
                      mappedPhase = PatchedSalesAllocationRequestPhase.completed
                      break
                    case 'suspended':
                      mappedPhase = PatchedSalesAllocationRequestPhase.suspended
                      break
                  }
                  if (mappedPhase) {
                    setValue('phase', mappedPhase, { shouldValidate: true })
                  }
                }
                if (proj.source_type) {
                  setValue('source_type', proj.source_type as ReconciliationSourceType, {
                    shouldValidate: true,
                  })
                }
                if (proj.avg_price_estimate) {
                  setValue('expected_avg_selling_price', Number(proj.avg_price_estimate), {
                    shouldValidate: true,
                  })
                }
                if (!watch('name')) {
                  setValue('name', `Bảng hàng - ${proj.name}`, { shouldValidate: true })
                }
              }
            }
          } catch (e) {
            if (isMounted) setProjectDataById(null)
          }
        } else {
          if (isMounted) setProjectDataById(null)
        }
      }
      fetchProject()
      return () => {
        isMounted = false
      }
    }, [watchProjectId, isEdit, initialValues?.project_id, setValue, watch, setError, clearErrors])

    const { keysMapOptions } = useAppConstant({
      module: 'realestate',
      keys: [
        APP_CONSTANT_KEY.REALESTATE.PROJECT_PROJECT_TYPE_CHOICES,
        APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_SOURCE_TYPE_CHOICES,
        APP_CONSTANT_KEY.REALESTATE.SALES_ALLOCATION_PHASE_CHOICES,
      ],
    })

    const projectTypeOptions = useMemo(
      () => keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.PROJECT_PROJECT_TYPE_CHOICES) || [],
      [keysMapOptions]
    )

    const sourceTypeOptions = useMemo(
      () =>
        keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_SOURCE_TYPE_CHOICES) || [],
      [keysMapOptions]
    )

    const phaseOptions = useMemo(
      () => keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.SALES_ALLOCATION_PHASE_CHOICES) || [],
      [keysMapOptions]
    )

    const { loadInvestorOptions, loadInitialInvestorOptions, getCachedInvestorById } =
      useInvestorSelect({
        valueType: 'id',
      })

    const { displayConfirm } = useDialog()

    const {
      loadProjectOptions,
      loadInitialProjectOptions,
      loadSourceExchangeOptions,
      loadInitialSourceExchangeOptions,
    } = useSaleAllocationLoadOptions({
      investorId: watchInvestorId,
      projectId: watchProjectId,
    })

    useImperativeHandle(ref, () => ({
      getValues: () => form.getValues(),
      handleSubmit: (onSubmitFn: (data: SalesAllocationFormValues) => void | Promise<void>) =>
        formHandleSubmit(onSubmitFn as SubmitHandler<SalesAllocationFormValues>, (errors) => {
          console.log('DEBUG FORM ERRORS:', errors)
          scrollToFirstError(errors)
        }),
      setError,
    }))

    // Một dự án chỉ thuộc đúng 1 CĐT. Không khoá dropdown CĐT — thay vào đó khi user chọn CĐT khác
    // với CĐT của dự án đang chọn thì hỏi xác nhận: đồng ý sẽ đổi CĐT và gỡ dự án; huỷ thì không
    // setValue nên field (controlled) tự revert về CĐT của dự án.
    const handleInvestorChange = (val: number | null) => {
      // Select (useInvestorSelect valueType 'id') phát ra value dạng STRING, còn auto-fill lại lưu
      // NUMBER → chuẩn hoá về number để so sánh và tra cache cho đúng.
      const investorId = toSelectId(val)

      // Bỏ chọn CĐT → bỏ luôn dự án (giữ hành vi cũ).
      if (investorId == null) {
        setValue('investor_id', null as unknown as number, { shouldValidate: true })
        setValue('project_id', null as unknown as number)
        return
      }

      const projectId = watch('project_id')
      const currentInvestorId = watch('investor_id')

      // Chưa chọn dự án, hoặc chọn lại đúng CĐT của dự án → set bình thường, không cần hỏi.
      if (!projectId || investorId === Number(currentInvestorId)) {
        setValue('investor_id', investorId as unknown as number, { shouldValidate: true })
        return
      }

      // Đã chọn dự án và CĐT mới KHÁC CĐT của dự án → xác nhận trước khi đổi (sẽ gỡ dự án).
      const investorName = getCachedInvestorById(investorId)?.name?.trim() || 'vừa chọn'
      const projectName = projectDataById?.name?.trim() || 'đang chọn'
      displayConfirm({
        title: 'Xác nhận đổi chủ đầu tư',
        content: `Chủ đầu tư "${investorName}" không thuộc dự án "${projectName}". Nếu tiếp tục, dự án "${projectName}" sẽ bị gỡ khỏi thông tin bán hàng này. Bạn có muốn tiếp tục?`,
        confirmText: 'Đồng ý',
        cancelText: 'Huỷ',
        onConfirm: () => {
          setValue('investor_id', investorId as unknown as number, { shouldValidate: true })
          setValue('project_id', null as unknown as number)
          setValue('project_type', null)
          setValue('phase', null)
          setValue('source_type', null as unknown as ReconciliationSourceType)
          setValue('expected_avg_selling_price', null)
          setValue('source_exchange_id', null)
          setValue('name', '')
        },
        // Huỷ: không setValue → field.value giữ nguyên CĐT của dự án → Select tự revert hiển thị.
      })
    }

    const handleSubmit = async (values: SalesAllocationFormValues) => {
      await onSubmit(values)
    }

    return (
      <FormProvider {...form}>
        <form
          onSubmit={formHandleSubmit(
            handleSubmit as SubmitHandler<SalesAllocationFormValues>,
            (errors) => {
              console.log('DEBUG FORM ERRORS:', errors)
              scrollToFirstError(errors)
            }
          )}
          className="space-y-6"
        >
          {/* Section 1: Thông tin dự án */}
          <div className="bg-surface-primary-default rounded-md pt-5">
            <div className="mb-4">
              <h3 className="text-text-primary-default text-lg font-semibold">
                Thông tin bán hàng
              </h3>
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
              <FormController<SalesAllocationFormValues, any>
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
                  onChange: handleInvestorChange,
                }}
              />

              <FormController<SalesAllocationFormValues, any>
                register={register}
                control={control}
                name="project_id"
                Field={Select}
                fieldProps={{
                  label: 'Dự án',
                  placeholder: 'Chọn Dự án',
                  loadOptions: loadProjectOptions,
                  loadInitialOptions: loadInitialProjectOptions,
                  enableSearch: true,
                  searchPlaceholder: 'Tìm dự án...',
                  required: true,
                  onChange: (val: number | null) => {
                    setValue('project_id', val as unknown as number, { shouldValidate: true })
                    if (!val) {
                      setValue('investor_id', null as unknown as number)
                      setValue('project_type', null)
                      setValue('phase', null)
                      setValue('source_type', null as unknown as ReconciliationSourceType)
                      setValue('expected_avg_selling_price', null)
                      setValue('source_exchange_id', null)
                      setValue('name', '')
                    }
                  },
                }}
              />

              <FormController<SalesAllocationFormValues, any>
                register={register}
                control={control}
                name="project_type"
                Field={Select}
                fieldProps={{
                  label: 'Loại hình dự án',
                  placeholder: 'Chọn loại hình',
                  options: projectTypeOptions,
                }}
              />

              <FormController<SalesAllocationFormValues, any>
                register={register}
                control={control}
                name="phase"
                Field={Select}
                fieldProps={{
                  label: 'Giai đoạn hiện tại',
                  placeholder: 'Chọn giai đoạn',
                  options: phaseOptions,
                }}
              />
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
              <FormController<SalesAllocationFormValues, any>
                register={register}
                control={control}
                name="name"
                Field={TextField}
                fieldProps={{
                  label: 'Tên thông tin bán hàng',
                  placeholder: 'Nhập tên...',
                  required: true,
                }}
              />

              <FormController<SalesAllocationFormValues, any>
                register={register}
                control={control}
                name="source_type"
                Field={Select}
                fieldProps={{
                  label: 'Nguồn nhập',
                  placeholder: 'Chọn nguồn nhập',
                  options: sourceTypeOptions,
                  required: true,
                }}
              />

              {watch('source_type') === 'F0' && (
                <FormController<SalesAllocationFormValues, any>
                  register={register}
                  control={control}
                  name="source_exchange_id"
                  Field={SourceExchangeSelectWithCreate}
                  fieldProps={{
                    label: 'Sàn F0',
                    placeholder: 'Chọn sàn',
                    loadOptions: loadSourceExchangeOptions,
                    loadInitialOptions: loadInitialSourceExchangeOptions,
                    searchPlaceholder: 'Tìm sàn...',
                    required: true,
                    initialExchange:
                      (initialValues as Record<string, any>)?.source_exchange ?? null,
                  }}
                />
              )}
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-4">
              <FormController<SalesAllocationFormValues, any>
                register={register}
                control={control}
                name="expected_avg_selling_price"
                Field={CurrencyInput}
                fieldProps={{
                  label: 'Giá bán TB dự kiến',
                  placeholder: 'VND',
                }}
              />
            </div>
            <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <FormController<SalesAllocationFormValues, any>
                register={register}
                control={control}
                name="min_booking_amount"
                Field={CurrencyInput}
                fieldProps={{
                  label: 'Số tiền đặt chỗ tối thiểu',
                  placeholder: 'VND',
                }}
              />
              <FormController<SalesAllocationFormValues, any>
                register={register}
                control={control}
                name="min_deposit_amount"
                Field={CurrencyInput}
                fieldProps={{
                  label: 'Số tiền đặt cọc tối thiểu',
                  placeholder: 'VND',
                }}
              />
            </div>{' '}
            <div className="mt-4">
              <FormController<SalesAllocationFormValues, any>
                register={register}
                control={control}
                name="note"
                Field={TextArea}
                fieldProps={{
                  label: 'Mô tả',
                  placeholder: 'Nhập mô tả / ghi chú...',
                  rows: 3,
                }}
              />
            </div>
          </div>

          {projectDataById?.id && (
            <div className="flex w-full">
              <div className="w-full">
                <ProjectPreviewBox
                  projectData={projectDataById}
                  projectDirector={projectDataById?.project_director}
                  projectSecretary={projectDataById?.project_secretary}
                />
              </div>
            </div>
          )}

          <SeparatorHorizontal className="my-6" />

          {/* Section 3: Tài liệu đính kèm */}
          <div className="flex flex-col gap-4">
            <h3 className="text-content-dark-1 text-lg font-semibold">Tài liệu đính kèm</h3>
            <FormController<SalesAllocationFormValues, any>
              register={register}
              control={control}
              name="attachment_tokens"
              Field={FileUpload as unknown as React.ElementType}
              fieldProps={{
                multiple: true,
                required: false,
                purpose: 'project_sale_allocation',
                hiddenLabel: true,
                existingFiles: watch('attachments') || [],
                onKeptExistingIdsChange: (ids: number[]) => setValue('attachment_ids', ids),
              }}
            />
          </div>
        </form>
      </FormProvider>
    )
  }
)

SaleAllocationForm.displayName = 'SaleAllocationForm'

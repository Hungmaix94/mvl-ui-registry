import { forwardRef, useImperativeHandle, useMemo, useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'

import { Select } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { useProjectSelect } from '@/hooks/useProjectSelect'

import {
  FEE_SUPPORT_DOCUMENT_STATUS_LABEL,
  FEE_SUPPORT_ORIGIN_LABEL,
  FeeSupportRequestDocument_status,
  FeeSupportRequestOrigin,
} from '../constants/fee-support-request-constants'

export type FeeSupportRequestFilterFormData = {
  status?: string
  project?: string
  origin?: string
  document_status?: string
}

export type FeeSupportRequestFilterRef = {
  getValues: () => FeeSupportRequestFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: FeeSupportRequestFilterFormData
}

/**
 * Filter cho AppDialog variant="filter". Trang list remount form mỗi lần mở dialog
 * (key theo URL) nên không cần sync effect; clearForm bump formKey để Controller
 * remount và không re-fill giá trị cũ (RHF defaultValue trap).
 */
export const FeeSupportRequestFilter = forwardRef<FeeSupportRequestFilterRef, Props>(
  ({ initialValues }, ref) => {
    const form = useForm<FeeSupportRequestFilterFormData>({ defaultValues: initialValues ?? {} })
    const { control, register } = form
    const [formKey, setFormKey] = useState(0)

    const { keysMapOptions } = useAppConstant({
      module: 'sales',
      keys: [APP_CONSTANT_KEY.SALES.FEE_SUPPORT_REQUEST.STATUS_CHOICES],
    })

    const statusOptions = useMemo(
      () => keysMapOptions.get(APP_CONSTANT_KEY.SALES.FEE_SUPPORT_REQUEST.STATUS_CHOICES) || [],
      [keysMapOptions]
    )

    const originOptions = useMemo(
      () =>
        Object.values(FeeSupportRequestOrigin).map((value) => ({
          value,
          label: FEE_SUPPORT_ORIGIN_LABEL[value],
        })),
      []
    )

    // Nhãn local tới khi BE seed app-constant FeeSupportRequest_DocumentStatus
    // (xem chú thích ở fee-support-request-constants.ts).
    const documentStatusOptions = useMemo(
      () =>
        Object.values(FeeSupportRequestDocument_status).map((value) => ({
          value,
          label: FEE_SUPPORT_DOCUMENT_STATUS_LABEL[value],
        })),
      []
    )

    const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()

    useImperativeHandle(ref, () => ({
      getValues: () => form.getValues(),
      clearForm: () => {
        form.reset({
          status: undefined,
          project: undefined,
          origin: undefined,
          document_status: undefined,
        })
        setFormKey((k) => k + 1)
      },
    }))

    return (
      <FormProvider {...form}>
        {/* Lưới 2x2: hàng trên là bối cảnh (dự án / nguồn tạo), hàng dưới gom
            2 trạng thái — chủ trương và thủ tục — cạnh nhau để dễ đối chiếu. */}
        <div key={formKey} className="grid w-full grid-cols-1 gap-4 md:grid-cols-2">
          <FormController<FeeSupportRequestFilterFormData, any>
            register={register}
            control={control}
            name="project"
            Field={Select}
            fieldProps={{
              label: 'Dự án',
              placeholder: 'Chọn dự án',
              loadOptions: loadProjectOptions,
              loadInitialOptions: loadInitialProjectOptions,
              enableSearch: true,
              isClearable: true,
            }}
          />

          <FormController<FeeSupportRequestFilterFormData, any>
            register={register}
            control={control}
            name="origin"
            Field={Select}
            fieldProps={{
              label: 'Nguồn tạo',
              placeholder: 'Chọn nguồn tạo',
              options: originOptions,
              isClearable: true,
            }}
          />

          <FormController<FeeSupportRequestFilterFormData, any>
            register={register}
            control={control}
            name="status"
            Field={Select}
            fieldProps={{
              label: 'Trạng thái',
              placeholder: 'Chọn trạng thái',
              options: statusOptions,
              isClearable: true,
            }}
          />

          <FormController<FeeSupportRequestFilterFormData, any>
            register={register}
            control={control}
            name="document_status"
            Field={Select}
            fieldProps={{
              label: 'Trạng thái duyệt hồ sơ',
              placeholder: 'Chọn trạng thái duyệt hồ sơ',
              options: documentStatusOptions,
              isClearable: true,
            }}
          />
        </div>
      </FormProvider>
    )
  }
)

FeeSupportRequestFilter.displayName = 'FeeSupportRequestFilter'

export default FeeSupportRequestFilter

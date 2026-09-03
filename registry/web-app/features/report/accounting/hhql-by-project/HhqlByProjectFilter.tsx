import { forwardRef, useImperativeHandle, useEffect } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Select } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import { useProjectSelect } from '@/hooks/useProjectSelect'

/**
 * `project` là MẢNG id (chọn nhiều) — gửi lên BE bằng `project__in`, không phải `project`.
 * Giá trị option của `useProjectSelect` là số, nên đừng khai `string[]` rồi so sánh bằng `===`
 * với id lấy từ URL: phải quy về chuỗi ở đúng một chỗ (xem `HhqlByProjectReportPage`).
 */
export type HhqlByProjectFilterFormData = {
  project?: (string | number)[]
}

export type HhqlByProjectFilterRef = {
  getValues: () => HhqlByProjectFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: HhqlByProjectFilterFormData
  isOpen?: boolean
}

/**
 * Hàm chứ không phải hằng: `project` là MẢNG, mà một hằng dùng chung thì mọi lần "Xoá bộ lọc"
 * đều reset về CÙNG một tham chiếu — ai đó sửa tại chỗ là rò sang lần mở sau.
 */
const emptyFilter = (): HhqlByProjectFilterFormData => ({ project: [] })

export const HhqlByProjectFilter = forwardRef<HhqlByProjectFilterRef, Props>(
  ({ initialValues, isOpen }, ref) => {
    const form = useForm<HhqlByProjectFilterFormData>({
      defaultValues: initialValues ?? emptyFilter(),
    })
    const { control, register } = form

    const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()

    useEffect(() => {
      if (isOpen && initialValues) form.reset(initialValues)
    }, [isOpen, initialValues, form])

    useImperativeHandle(ref, () => ({
      getValues: () => form.getValues(),
      clearForm: () => form.reset(emptyFilter()),
    }))

    return (
      <FormProvider {...form}>
        {/*
          Một trường duy nhất thì KHÔNG dựng lưới 2–3 cột: ô lọc co lại còn 1/3 dialog, chọn nhiều
          dự án là chip tràn xuống 3–4 dòng trong khi 2/3 chiều ngang bỏ trống. Trải hết bề ngang.
        */}
        <div className="w-full">
          <FormController<HhqlByProjectFilterFormData, any>
            register={register}
            control={control}
            name="project"
            Field={Select}
            fieldProps={{
              label: 'Dự án',
              placeholder: 'Tất cả dự án',
              loadOptions: loadProjectOptions,
              loadInitialOptions: loadInitialProjectOptions,
              enableSearch: true,
              multiple: true,
            }}
          />
        </div>
      </FormProvider>
    )
  }
)

HhqlByProjectFilter.displayName = 'HhqlByProjectFilter'

export default HhqlByProjectFilter

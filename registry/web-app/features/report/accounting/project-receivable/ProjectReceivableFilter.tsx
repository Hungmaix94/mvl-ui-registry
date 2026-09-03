import { forwardRef, useEffect, useImperativeHandle } from 'react'
import { useForm, FormProvider } from 'react-hook-form'
import { Checkbox, Select } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import { useProjectSelect } from '@/hooks/useProjectSelect'

/**
 * Bộ lọc của báo cáo 20.16 (CR 86eyj43zb + task 86eyddd4y) — ô "Dự án" và ô "Số tiền công nợ
 * lớn hơn 0" nằm trong dialog bộ lọc.
 *
 * Chip "Kỳ" CỐ Ý ở ngoài, trên toolbar của `PageTitle`: kỳ là trục chính của báo cáo, người
 * dùng đổi liên tục, nhét vào dialog thì mỗi lần xem tháng khác lại phải mở dialog rồi bấm
 * "Áp dụng" — giống cách màn 21.10 tách ô tìm kiếm ra khỏi dialog.
 */
export type ProjectReceivableFilterFormData = {
  project: number | null
  /** SRS 20.16 §2.2 — mặc định BẬT: báo cáo chỉ hiện dự án còn nợ cuối kỳ. */
  hasDebt: boolean
}

export type ProjectReceivableFilterRef = {
  getValues: () => ProjectReceivableFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: ProjectReceivableFilterFormData
  isOpen: boolean
}

/**
 * `null` chứ không phải `''`: `Select` coi mọi giá trị khác `null`/`undefined` là "đang chọn",
 * nên chuỗi rỗng sẽ kích hoạt `loadInitialProjectOptions([''])` → `Number('')` = 0 → không tìm
 * thấy dự án nào → ô lọc hiện nhãn "0" kèm nút xoá thay vì placeholder.
 */
const DEFAULT_FORM_VALUES: ProjectReceivableFilterFormData = {
  project: null,
  hasDebt: true,
}

export const ProjectReceivableFilter = forwardRef<ProjectReceivableFilterRef, Props>(
  ({ initialValues, isOpen }, ref) => {
    const form = useForm<ProjectReceivableFilterFormData>({
      defaultValues: { ...DEFAULT_FORM_VALUES, ...initialValues },
    })
    const { control, register, reset, getValues } = form

    const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()

    // Dialog giữ nguyên cây con khi đóng lại, nên phải seed lại từ URL mỗi lần mở — nếu không,
    // lần trước bấm "Huỷ" giữa chừng thì lần sau mở ra vẫn thấy giá trị dở dang đó.
    useEffect(() => {
      if (!isOpen) return
      reset({ ...DEFAULT_FORM_VALUES, ...initialValues })
    }, [isOpen, initialValues, reset])

    useImperativeHandle(
      ref,
      () => ({
        getValues: () => getValues(),
        clearForm: () => reset(DEFAULT_FORM_VALUES),
      }),
      [reset, getValues]
    )

    return (
      <FormProvider {...form}>
        <div className="grid w-full grid-cols-1 gap-4">
          <FormController<ProjectReceivableFilterFormData, React.ComponentProps<typeof Select>>
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
              clearable: true,
            }}
          />

          {/* Ô tick phải có tiêu đề vùng dữ liệu như mọi field khác trong dialog (conventions.md
              §"MỌI field trong dialog lọc phải có TIÊU ĐỀ VÙNG DỮ LIỆU"): prop `label` của
              `Checkbox` chỉ là chữ NGANG HÀNG với ô tick, không phải tiêu đề, nên thả trần vào
              lưới là ô đó trôi lơ lửng và lạc quẻ hẳn so với ô "Dự án" ngay trên nó.

              Tiêu đề là `span` chứ không phải `label`: `Checkbox` đã tự gắn `<label htmlFor>`,
              thêm label thứ hai là trình đọc màn hình đọc lặp tên control.

              Tiêu đề gọi ĐÚNG TÊN CỘT mà ô tick lọc theo — "Cuối kỳ" — chứ không phải một tên
              nghiệp vụ chung chung: người dùng nhìn tiêu đề là biết ngay bộ lọc tác động vào
              cột nào trên bảng, khỏi phải đoán. */}
          <div className="flex w-full flex-col gap-2">
            <span className="typo-body-base-semibold text-neutral-90">Cuối kỳ</span>
            <FormController<ProjectReceivableFilterFormData, React.ComponentProps<typeof Checkbox>>
              register={register}
              control={control}
              name="hasDebt"
              Field={Checkbox}
              fieldProps={{ label: 'Chỉ hiện dòng có Cuối kỳ > 0' }}
            />
          </div>
        </div>
      </FormProvider>
    )
  }
)

ProjectReceivableFilter.displayName = 'ProjectReceivableFilter'

export default ProjectReceivableFilter

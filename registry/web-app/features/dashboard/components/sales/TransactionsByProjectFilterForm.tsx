import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Flex } from '@radix-ui/themes'
import type { DateRange } from 'react-day-picker'
import FormController from '@/components/ui/form/FormController.tsx'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import { Select } from '@/components/ui'
import type { SelectOption } from '@/components/ui/select/Select'
import { useProjectSelect } from '@/hooks/useProjectSelect'
import { PAGE_SIZE } from '@/constants/table'

export type TransactionsByProjectFilterFormValues = {
  /** Nhiều dự án cùng lúc. Mảng rỗng = không lọc (tất cả dự án). */
  projects?: number[]
  /**
   * Tên các dự án đã chọn, để phần mô tả dưới tiêu đề nói được "dự án nào" mà không phải gọi
   * lại API. Cùng thứ tự với `projects`.
   */
  projectNames?: string[]
  dateRange?: DateRange | null
  /** Ngày làm phiếu TTGD — bộ lọc ĐỘC LẬP với `dateRange`, cộng thêm (AND). */
  transactionSheetDateRange?: DateRange | null
}

export const DEFAULT_TRANSACTIONS_FILTER_VALUES: TransactionsByProjectFilterFormValues = {
  projects: [],
  projectNames: [],
  dateRange: null,
  transactionSheetDateRange: null,
}

export type TransactionsByProjectFilterFormRef = {
  clearForm: () => void
  getValues: () => TransactionsByProjectFilterFormValues
}

type TransactionsByProjectFilterFormProps = {
  initialValues?: Partial<TransactionsByProjectFilterFormValues>
}

const TransactionsByProjectFilterForm = forwardRef<
  TransactionsByProjectFilterFormRef,
  TransactionsByProjectFilterFormProps
>(({ initialValues }, ref) => {
  const [formKey, setFormKey] = useState(0)
  const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()

  const { register, control, reset, getValues } = useForm<TransactionsByProjectFilterFormValues>({
    defaultValues: { ...DEFAULT_TRANSACTIONS_FILTER_VALUES, ...initialValues },
  })

  /**
   * Nhớ tên theo id đã từng thấy. `Select` ở chế độ `multiple` chỉ báo về ĐÚNG option vừa
   * bấm, không báo cả danh sách đang chọn — không nhớ lại thì bỏ chọn một dự án là mất tên
   * của những dự án còn lại và phụ đề tụt xuống "3 dự án" vô danh.
   */
  const projectNameByIdRef = useRef(new Map<number, string>())

  useEffect(() => {
    const ids = initialValues?.projects ?? []
    const names = initialValues?.projectNames ?? []
    ids.forEach((id, index) => {
      if (names[index]) projectNameByIdRef.current.set(id, names[index])
    })
    reset({ ...DEFAULT_TRANSACTIONS_FILTER_VALUES, ...initialValues })
    setFormKey((k) => k + 1)
  }, [initialValues, reset])

  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        reset(DEFAULT_TRANSACTIONS_FILTER_VALUES)
        setFormKey((k) => k + 1)
      },
      getValues: () => {
        const values = getValues()
        const ids = values.projects ?? []
        return {
          ...values,
          projects: ids,
          projectNames: ids.map((id) => projectNameByIdRef.current.get(id) ?? ''),
        }
      },
    }),
    [reset, getValues]
  )

  const handleProjectChange = useCallback((option: SelectOption | null) => {
    if (!option || typeof option.label !== 'string') return
    projectNameByIdRef.current.set(Number(option.value), option.label)
  }, [])

  return (
    <Flex direction="column" gap="4">
      {/* Ô thời gian đứng TRƯỚC dự án: người dùng khoanh kỳ trước rồi mới soi dự án
          trong kỳ đó — đúng thứ tự thao tác thật. */}
      <FormController
        key={`dateRange-${formKey}`}
        register={register}
        name="dateRange"
        control={control}
        Field={DateRangePicker}
        fieldProps={{
          // Nói rõ lọc theo ngày NÀO. Ô này và ô TTGD ngay dưới đều là khoảng ngày, nên
          // một cái tên chung chung như "Khoảng thời gian" không trả lời được câu người dùng
          // đang hỏi: cái nào theo ngày cọc, cái nào theo ngày làm phiếu. Cùng chữ với màn
          // Tổng quan bán hàng (`SalesOverviewFilterForm`) để bốn màn đọc như một.
          label: 'Thời gian (tính theo ngày cọc)',
          showQuickSelect: true,
        }}
      />
      <FormController
        key={`transactionSheetDateRange-${formKey}`}
        register={register}
        name="transactionSheetDateRange"
        control={control}
        Field={DateRangePicker}
        fieldProps={{
          label: 'Ngày làm phiếu TTGD',
          showQuickSelect: true,
        }}
      />
      <FormController
        key={`projects-${formKey}`}
        register={register}
        name="projects"
        control={control}
        Field={Select}
        fieldProps={{
          label: 'Dự án',
          placeholder: 'Tất cả dự án',
          loadOptions: loadProjectOptions,
          loadInitialOptions: loadInitialProjectOptions,
          pageSize: PAGE_SIZE,
          enableSearch: true,
          multiple: true,
          onChangeOption: handleProjectChange,
        }}
      />
    </Flex>
  )
})

TransactionsByProjectFilterForm.displayName = 'TransactionsByProjectFilterForm'

export default TransactionsByProjectFilterForm

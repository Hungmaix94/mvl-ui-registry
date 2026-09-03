import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Grid } from '@radix-ui/themes'
import type { DateRange } from 'react-day-picker'
import FormController from '@/components/ui/form/FormController.tsx'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker.tsx'
import { Select } from '@/components/ui'
import { TIME_GROUP_OPTIONS } from './sales-admin-dashboard-constants'
import { DashboardPerformanceGroup as TimeGroup } from '@/constants/api-schema-aliases'

export type RevenueTrendFilterFormValues = {
  dateRange?: DateRange | null
  /** Ngày làm phiếu TTGD — bộ lọc ĐỘC LẬP với `dateRange`, cộng thêm (AND), không ghi đè. */
  transactionSheetDateRange?: DateRange | null
  /** Cách chia trục hoành. Tham số BẮT BUỘC của endpoint, không phải bộ lọc tuỳ chọn. */
  timeGroup: TimeGroup
}

/**
 * "Xoá bộ lọc" đưa `timeGroup` về tháng chứ không bỏ trống: endpoint luôn cần biết chia kỳ
 * thế nào, gửi rỗng là 400. Cùng lẽ với `getDefaultPerformanceFilterValues`.
 */
export const DEFAULT_REVENUE_TREND_FILTER_VALUES: RevenueTrendFilterFormValues = {
  dateRange: null,
  transactionSheetDateRange: null,
  timeGroup: TimeGroup.month,
}

export type RevenueTrendFilterFormRef = {
  clearForm: () => void
  getValues: () => RevenueTrendFilterFormValues
}

type RevenueTrendFilterFormProps = {
  initialValues?: Partial<RevenueTrendFilterFormValues>
}

const RevenueTrendFilterForm = forwardRef<RevenueTrendFilterFormRef, RevenueTrendFilterFormProps>(
  ({ initialValues }, ref) => {
    const [formKey, setFormKey] = useState(0)

    const { register, control, reset, getValues } = useForm<RevenueTrendFilterFormValues>({
      defaultValues: { ...DEFAULT_REVENUE_TREND_FILTER_VALUES, ...initialValues },
    })

    useEffect(() => {
      reset({ ...DEFAULT_REVENUE_TREND_FILTER_VALUES, ...initialValues })
      setFormKey((k) => k + 1)
    }, [initialValues, reset])

    useImperativeHandle(
      ref,
      () => ({
        clearForm: () => {
          reset(DEFAULT_REVENUE_TREND_FILTER_VALUES)
          setFormKey((k) => k + 1)
        },
        getValues: () => getValues(),
      }),
      [reset, getValues]
    )

    /**
     * Lưới 2 cột — `Grid` xếp theo HÀNG, nên thứ tự khai báo là thứ tự đọc và thứ tự Tab:
     *
     *   1. Thời gian (ngày cọc)  |  Ngày làm phiếu TTGD
     *   2. Nhóm theo thời gian   |  (trống)
     *
     * Cùng lưới với dialog "Hiệu suất theo tổ chức" để hai khối trên cùng một trang mở ra
     * thấy hai ô ngày ở đúng một chỗ. Dòng 1 là hai căn cứ ngày ĐỘC LẬP, cộng thêm (AND) —
     * không cái nào cắt cái nào, nên đặt cạnh nhau chứ không xếp cha-con.
     */
    return (
      <Grid columns="2" gap="4" width="100%">
        <FormController
          key={`dateRange-${formKey}`}
          register={register}
          name="dateRange"
          control={control}
          Field={DateRangePicker}
          fieldProps={{
            // Nói rõ lọc theo ngày NÀO. Ô này và ô TTGD bên cạnh đều là khoảng ngày, nên một
            // cái tên chung chung như "Khoảng thời gian" không trả lời được câu người dùng
            // đang hỏi: cái nào theo ngày cọc, cái nào theo ngày làm phiếu.
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
          key={`timeGroup-${formKey}`}
          register={register}
          name="timeGroup"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Nhóm theo thời gian',
            options: TIME_GROUP_OPTIONS,
            // Tham số bắt buộc của endpoint: `Select` mặc định cho xoá trắng, mà xoá trắng ở
            // đây là gửi group rỗng lên API. Dùng "Xoá bộ lọc" để về mặc định.
            clearable: false,
          }}
        />
      </Grid>
    )
  }
)

RevenueTrendFilterForm.displayName = 'RevenueTrendFilterForm'

export default RevenueTrendFilterForm

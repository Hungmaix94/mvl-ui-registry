import { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Flex } from '@radix-ui/themes'
import type { DateRange } from 'react-day-picker'

import { Select } from '@/components/ui'
import MonthPicker from '@/components/ui/month-picker/MonthPicker'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { formatPayoutBatchStatus } from '@/features/accounting/employee-payout-batches/constants'

/**
 * Bộ lọc màn "Đợt đi tiền" (CR 86eyj428y) — 3 tiêu chí: kỳ tháng, khoảng ngày tạo đợt, trạng thái.
 *
 * `period` là một `Date` chỉ dùng phần tháng/năm; trang danh sách tách nó ra `year` + `month` khi
 * ghi vào URL. Khoảng ngày map thẳng sang `batch_date_after` / `batch_date_before` của API (bao
 * gồm cả hai đầu mút).
 */
export type EmployeePayoutBatchFilterFormData = {
  period?: Date | null
  batchDateFrom?: Date | null
  batchDateTo?: Date | null
  status?: string
}

export type EmployeePayoutBatchFilterRef = {
  getValues: () => EmployeePayoutBatchFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: EmployeePayoutBatchFilterFormData
}

const EMPTY_VALUES: EmployeePayoutBatchFilterFormData = {
  period: null,
  batchDateFrom: null,
  batchDateTo: null,
  status: '',
}

const EmployeePayoutBatchFilter = forwardRef<EmployeePayoutBatchFilterRef, Props>(
  ({ initialValues }, ref) => {
    // Bump khi mở dialog và khi xoá lọc để các field remount, đọc lại default vừa reset.
    // Thiếu nó thì "Xoá lọc → Áp dụng" âm thầm gửi lại filter cũ (docs/ai/patterns.md § clearForm trap).
    const [formKey, setFormKey] = useState(0)

    const { reset, getValues, watch, setValue } = useForm<EmployeePayoutBatchFilterFormData>({
      defaultValues: { ...EMPTY_VALUES, ...initialValues },
    })

    const { keysMapOptions } = useAppConstant({
      module: 'accounting',
      keys: [APP_CONSTANT_KEY.ACCOUNTING.EMPLOYEE_COMMISSION_PAYOUT_BATCH_STATUS_CHOICES],
    })

    // Nhãn đi qua đúng helper mà chip trạng thái trên bảng dùng, nên hai nơi không thể lệch nhau.
    const statusOptions = (
      keysMapOptions.get(
        APP_CONSTANT_KEY.ACCOUNTING.EMPLOYEE_COMMISSION_PAYOUT_BATCH_STATUS_CHOICES
      ) ?? []
    ).map((opt) => ({
      ...opt,
      label: formatPayoutBatchStatus(String(opt.value), { [String(opt.value)]: opt.label }),
    }))

    useEffect(() => {
      reset({ ...EMPTY_VALUES, ...initialValues })
      setFormKey((k) => k + 1)
    }, [initialValues, reset])

    useImperativeHandle(
      ref,
      () => ({
        getValues: () => getValues(),
        clearForm: () => {
          reset(EMPTY_VALUES)
          setFormKey((k) => k + 1)
        },
      }),
      [getValues, reset]
    )

    const period = watch('period')
    const batchDateFrom = watch('batchDateFrom')
    const batchDateTo = watch('batchDateTo')
    const status = watch('status')

    const dateRangeValue: DateRange | undefined =
      batchDateFrom || batchDateTo
        ? { from: batchDateFrom ?? undefined, to: batchDateTo ?? undefined }
        : undefined

    const handleDateRangeChange = useCallback(
      (range: DateRange | undefined | null) => {
        setValue('batchDateFrom', range?.from ?? null)
        setValue('batchDateTo', range?.to ?? null)
      },
      [setValue]
    )

    return (
      <Flex direction="column" gap="4">
        <MonthPicker
          key={`period-${formKey}`}
          label="Kỳ tháng"
          placeholder="Chọn kỳ tháng"
          value={period ?? null}
          onChange={(date) => setValue('period', date ?? null)}
        />

        <DateRangePicker
          key={`batch-date-${formKey}`}
          label="Ngày tạo đợt"
          value={dateRangeValue}
          onChange={handleDateRangeChange}
        />

        <Select
          key={`status-${formKey}`}
          name="status"
          label="Trạng thái"
          placeholder="Chọn trạng thái"
          options={statusOptions}
          value={status || ''}
          onChange={(next) => setValue('status', next == null ? '' : String(next))}
          clearable
        />
      </Flex>
    )
  }
)

EmployeePayoutBatchFilter.displayName = 'EmployeePayoutBatchFilter'

export default EmployeePayoutBatchFilter

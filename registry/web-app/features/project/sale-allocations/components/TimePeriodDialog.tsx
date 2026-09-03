import { useState, forwardRef, useImperativeHandle } from 'react'
import { TextField } from '@/components/ui'
import DateRangePicker from '@/components/ui/date-range-picker/DateRangePicker'
import { DateRange } from 'react-day-picker'

export type TimePeriodDialogProps = {
  initialDateRange?: DateRange
  isEditing?: boolean
  showDefaultValue?: boolean
  onApply: (range: { from: Date; to: Date; percentage?: number }) => void
}

export type TimePeriodDialogRef = {
  submit: () => boolean
}

export const TimePeriodDialog = forwardRef<TimePeriodDialogRef, TimePeriodDialogProps>(
  ({ initialDateRange, isEditing, showDefaultValue = true, onApply }, ref) => {
    const [dateRange, setDateRange] = useState<DateRange | undefined>(initialDateRange)
    const [percentage, setPercentage] = useState<string>('')
    const [error, setError] = useState<string>('')

    const handleApply = () => {
      if (!dateRange?.from) {
        setError('Vui lòng chọn thời gian Từ ngày')
        return false
      }

      if (dateRange.from && dateRange.to && dateRange.from > dateRange.to) {
        setError('Ngày bắt đầu không được lớn hơn ngày kết thúc')
        return false
      }

      setError('')
      onApply({
        from: dateRange.from,
        to: dateRange.to as Date,
        percentage: percentage ? Number(percentage) : undefined,
      })
      return true
    }

    useImperativeHandle(ref, () => ({
      submit: handleApply,
    }))

    return (
      <div className="flex flex-col gap-4 pt-4 pb-2">
        <div className="flex flex-col gap-4">
          <DateRangePicker
            label="Khoảng thời gian áp dụng"
            required
            value={dateRange}
            onChange={(val) => {
              setDateRange(val || undefined)
              setError('')
            }}
            error={error}
          />
          {!isEditing && showDefaultValue && (
            <TextField
              label="Tỷ lệ (%) mặc định / Giá trị"
              placeholder="Ví dụ: 50"
              type="number"
              value={percentage}
              onChange={(val) => setPercentage(val)}
            />
          )}
        </div>
      </div>
    )
  }
)

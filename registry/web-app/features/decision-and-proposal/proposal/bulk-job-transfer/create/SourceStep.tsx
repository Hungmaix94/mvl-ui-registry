import { Flex } from '@radix-ui/themes'
import { TextField } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import type { Employee } from '@/features/employee/services/employee-service'

type SourceStepProps = {
  effectiveDate: string
  onEffectiveDateChange: (value: string) => void
  employee?: Employee
  disabled?: boolean
}

const SourceStep = ({
  effectiveDate,
  onEffectiveDateChange,
  employee,
  disabled,
}: SourceStepProps) => {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="max-w-[280px]">
        <DatePicker
          label="Ngày hiệu lực"
          required
          placeholder="DD/MM/YYYY"
          clearable
          value={effectiveDate}
          onChange={(value) => onEffectiveDateChange(value ?? '')}
          disabled={disabled}
        />
      </div>

      <Flex gap="5" className="w-full">
        <TextField
          label="Chi nhánh"
          value={employee?.branch.name ?? ''}
          disabled
          className="flex-1"
        />
        <TextField label="Khối" value={employee?.block.name ?? ''} disabled className="flex-1" />
        <TextField
          label="Phòng ban"
          value={employee?.department.name ?? ''}
          disabled
          className="flex-1"
        />
      </Flex>
    </div>
  )
}

export default SourceStep

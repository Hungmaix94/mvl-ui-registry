import { forwardRef, useImperativeHandle, useState } from 'react'
import { Flex } from '@radix-ui/themes'
import { Select } from '@/components/ui'
import type { SelectOption } from '@/components/ui/select/Select'

export type WorkScheduleScope = 'global' | 'branch'

export type WorkScheduleFilterValues = {
  branch: number | null
  scope: WorkScheduleScope | null
}

export type WorkScheduleFilterFormRef = {
  getValues: () => WorkScheduleFilterValues
  clearForm: () => void
}

type WorkScheduleFilterFormProps = {
  initialValues: WorkScheduleFilterValues
  branchOptions: SelectOption[]
}

const SCOPE_OPTIONS: SelectOption[] = [
  { value: 'global', label: 'Toàn hệ thống' },
  { value: 'branch', label: 'Theo chi nhánh' },
]

const WorkScheduleFilterForm = forwardRef<WorkScheduleFilterFormRef, WorkScheduleFilterFormProps>(
  function WorkScheduleFilterForm({ initialValues, branchOptions }, ref) {
    const [scope, setScope] = useState<WorkScheduleScope | null>(initialValues.scope)
    const [branch, setBranch] = useState<number | null>(initialValues.branch)

    useImperativeHandle(ref, () => ({
      getValues: () => ({ scope, branch }),
      clearForm: () => {
        setScope(null)
        setBranch(null)
      },
    }))

    return (
      <Flex direction="column" gap="4" className="p-1">
        <Select
          label="Phạm vi áp dụng"
          placeholder="Tất cả"
          options={SCOPE_OPTIONS}
          value={scope}
          onChange={(value) => setScope(value == null ? null : (value as WorkScheduleScope))}
          clearable
        />
        <Select
          label="Chi nhánh"
          placeholder="Tất cả chi nhánh"
          options={branchOptions}
          value={branch}
          onChange={(value) => setBranch(value == null ? null : Number(value))}
          enableSearch
          clearable
          disabled={scope === 'global'}
        />
      </Flex>
    )
  }
)

export default WorkScheduleFilterForm

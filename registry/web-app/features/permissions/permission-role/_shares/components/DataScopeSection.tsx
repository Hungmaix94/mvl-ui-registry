import type { ComponentProps } from 'react'
import { Controller, type Control, type UseFormSetValue } from 'react-hook-form'
import { Flex, Text } from '@radix-ui/themes'
import { RadioGroup, Select } from '@/components/ui'
import { PatchedRoleRequestData_scope_level } from '@/api/schema.ts'
import { useBranchSelect } from '@/hooks/useBranchSelect.ts'
import { useBlockSelect } from '@/hooks/useBlockSelect.ts'
import { useDepartmentSelect } from '@/hooks/useDepartmentSelect.ts'
import { PAGE_SIZE } from '@/constants/table.ts'
import {
  DATA_SCOPE_LEVEL_OPTIONS,
  DATA_SCOPE_LEVEL_LABEL,
} from '@/features/permissions/permission-role/_shares/constants/data-scope.ts'
import type { RoleFormData } from '@/features/permissions/permission-role/_shares/schemas/role-schema.ts'

type DataScopeSectionProps = {
  control: Control<RoleFormData>
  setValue: UseFormSetValue<RoleFormData>
  level: PatchedRoleRequestData_scope_level | undefined
  disabled?: boolean
}

const toStringArray = (value: number[] | undefined): string[] => (value ?? []).map(String)

const toNumberArray = (
  value: string | number | (string | number)[] | null | undefined
): number[] => {
  if (!value) return []
  const arr = Array.isArray(value) ? value : [value]
  return arr.map((v) => Number(v)).filter((n) => Number.isFinite(n))
}

export const DataScopeSection = ({ control, setValue, level, disabled }: DataScopeSectionProps) => {
  const { loadBranchOptions, loadInitialBranchOptions } = useBranchSelect({ pageSize: PAGE_SIZE })
  const { loadBlockOptions, loadInitialBlockOptions } = useBlockSelect({ pageSize: PAGE_SIZE })
  const { loadDepartmentOptions, loadInitialDepartmentOptions } = useDepartmentSelect({
    pageSize: PAGE_SIZE,
  })

  const handleLevelChange = (next: string) => {
    setValue('data_scope_level', next as PatchedRoleRequestData_scope_level, {
      shouldDirty: true,
      shouldValidate: true,
    })
    // Reset all scope id arrays when level changes — keeps the form predictable
    setValue('branch_scope_ids', [], { shouldDirty: true })
    setValue('block_scope_ids', [], { shouldDirty: true })
    setValue('department_scope_ids', [], { shouldDirty: true })
  }

  return (
    <Flex direction="column" gap="4">
      <Text className="typo-body-xl-semibold text-content-dark-1">Phạm vi dữ liệu</Text>

      <Controller
        control={control}
        name="data_scope_level"
        render={({ field, fieldState }) => (
          <RadioGroup
            id="data_scope_level"
            label="Cấp truy cập"
            required
            name="data_scope_level"
            disabled={!!disabled}
            options={DATA_SCOPE_LEVEL_OPTIONS}
            value={field.value ?? ''}
            onChange={handleLevelChange as ComponentProps<typeof RadioGroup>['onChange']}
            error={fieldState.error?.message}
          />
        )}
      />

      {level === PatchedRoleRequestData_scope_level.branch && (
        <Controller
          control={control}
          name="branch_scope_ids"
          render={({ field, fieldState }) => (
            <Select
              label={DATA_SCOPE_LEVEL_LABEL[PatchedRoleRequestData_scope_level.branch]}
              name="branch_scope_ids"
              placeholder="Chọn chi nhánh"
              disabled={disabled}
              multiple
              triggerVariant="chips"
              maxChips={5}
              enableSearch
              searchPlaceholder="Tìm kiếm chi nhánh..."
              loadOptions={loadBranchOptions}
              loadInitialOptions={loadInitialBranchOptions}
              pageSize={PAGE_SIZE}
              value={toStringArray(field.value)}
              onChange={(next) => field.onChange(toNumberArray(next))}
              error={fieldState.error?.message}
            />
          )}
        />
      )}

      {level === PatchedRoleRequestData_scope_level.block && (
        <Controller
          control={control}
          name="block_scope_ids"
          render={({ field, fieldState }) => (
            <Select
              label={DATA_SCOPE_LEVEL_LABEL[PatchedRoleRequestData_scope_level.block]}
              name="block_scope_ids"
              placeholder="Chọn khối"
              disabled={disabled}
              multiple
              triggerVariant="chips"
              maxChips={5}
              enableSearch
              searchPlaceholder="Tìm kiếm khối..."
              loadOptions={loadBlockOptions}
              loadInitialOptions={loadInitialBlockOptions}
              pageSize={PAGE_SIZE}
              value={toStringArray(field.value)}
              onChange={(next) => field.onChange(toNumberArray(next))}
              error={fieldState.error?.message}
            />
          )}
        />
      )}

      {level === PatchedRoleRequestData_scope_level.department && (
        <Controller
          control={control}
          name="department_scope_ids"
          render={({ field, fieldState }) => (
            <Select
              label={DATA_SCOPE_LEVEL_LABEL[PatchedRoleRequestData_scope_level.department]}
              name="department_scope_ids"
              placeholder="Chọn phòng ban"
              disabled={disabled}
              multiple
              triggerVariant="chips"
              maxChips={5}
              enableSearch
              searchPlaceholder="Tìm kiếm phòng ban..."
              loadOptions={loadDepartmentOptions}
              loadInitialOptions={loadInitialDepartmentOptions}
              pageSize={PAGE_SIZE}
              value={toStringArray(field.value)}
              onChange={(next) => field.onChange(toNumberArray(next))}
              error={fieldState.error?.message}
            />
          )}
        />
      )}
    </Flex>
  )
}

export default DataScopeSection

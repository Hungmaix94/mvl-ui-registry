import { ColoredValueVariant, PatchedRoleRequestData_scope_level } from '@/api/schema.ts'

export const DATA_SCOPE_LEVEL_LABEL: Record<PatchedRoleRequestData_scope_level, string> = {
  [PatchedRoleRequestData_scope_level.root]: 'Toàn quyền truy cập',
  [PatchedRoleRequestData_scope_level.branch]: 'Cấp chi nhánh',
  [PatchedRoleRequestData_scope_level.block]: 'Cấp khối',
  [PatchedRoleRequestData_scope_level.department]: 'Cấp phòng ban',
}

export const DATA_SCOPE_LEVEL_OPTIONS: { value: string; label: string }[] = (
  Object.values(PatchedRoleRequestData_scope_level) as PatchedRoleRequestData_scope_level[]
).map((value) => ({ value, label: DATA_SCOPE_LEVEL_LABEL[value] }))

export const DATA_SCOPE_LEVEL_VARIANT: Record<
  PatchedRoleRequestData_scope_level,
  ColoredValueVariant
> = {
  [PatchedRoleRequestData_scope_level.root]: ColoredValueVariant.PURPLE,
  [PatchedRoleRequestData_scope_level.branch]: ColoredValueVariant.BLUE,
  [PatchedRoleRequestData_scope_level.block]: ColoredValueVariant.GREEN,
  [PatchedRoleRequestData_scope_level.department]: ColoredValueVariant.YELLOW,
}

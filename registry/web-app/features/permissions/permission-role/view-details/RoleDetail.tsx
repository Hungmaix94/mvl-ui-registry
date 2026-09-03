import { Flex, Text } from '@radix-ui/themes'
import { Role } from '@/services'
import Chip from '@/components/ui/chip/Chip.tsx'
import {
  DATA_SCOPE_LEVEL_LABEL,
  DATA_SCOPE_LEVEL_VARIANT,
} from '@/features/permissions/permission-role/_shares/constants/data-scope.ts'

const formatScope = (scopes: unknown): string => {
  if (!scopes) return ''
  if (typeof scopes === 'string') return scopes
  if (Array.isArray(scopes))
    return scopes
      .map((s) =>
        typeof s === 'object' && s !== null && 'name' in s
          ? (s as { name: string }).name
          : String(s)
      )
      .join(', ')
  if (typeof scopes === 'object' && 'name' in (scopes as object))
    return (scopes as { name: string }).name
  return String(scopes)
}

const RoleDetail = ({ role }: { role: Role }) => {
  const recordClassname = 'border-border-1 border-t-0 border-x-0 border-b-[1px] py-4 gap-[20px]'
  const recordTitleClassname = 'typo-body-base-medium text-content-dark-2 min-w-[168px]'

  const scopeLevel = role.data_scope_level
  const scopeDisplay =
    role.data_scope_level_display || (scopeLevel ? DATA_SCOPE_LEVEL_LABEL[scopeLevel] : '')

  return (
    <>
      <Flex direction="column" gap={'20px'} className={'pt-4 pb-8'}>
        <Text className={'typo-body-xl-semibold'}>Thông tin chi tiết</Text>

        <Flex direction="column" gap={'0'}>
          <Flex className={recordClassname}>
            <Text className={recordTitleClassname}>Tên vai trò:</Text>
            <Text className={'typo-body-1'}>{role.name}</Text>
          </Flex>

          <Flex className={recordClassname}>
            <Text className={recordTitleClassname}>Mã vai trò:</Text>
            <Text className={'typo-body-1'}>{role.code}</Text>
          </Flex>

          <Flex className={recordClassname}>
            <Text className={recordTitleClassname}>Mô tả:</Text>
            <Text className={'typo-body-1'}>{role.description || '-'}</Text>
          </Flex>

          <Flex className={recordClassname}>
            <Text className={recordTitleClassname}>Phạm vi dữ liệu:</Text>
            {scopeDisplay ? (
              <Chip
                label={scopeDisplay}
                variant={scopeLevel ? DATA_SCOPE_LEVEL_VARIANT[scopeLevel] : undefined}
                type="outlined"
              />
            ) : (
              <Text className={'typo-body-1'}>-</Text>
            )}
          </Flex>

          {formatScope(role.branch_scopes) && (
            <Flex className={recordClassname}>
              <Text className={recordTitleClassname}>Chi nhánh áp dụng:</Text>
              <Text className={'typo-body-1'}>{formatScope(role.branch_scopes)}</Text>
            </Flex>
          )}

          {formatScope(role.block_scopes) && (
            <Flex className={recordClassname}>
              <Text className={recordTitleClassname}>Khối áp dụng:</Text>
              <Text className={'typo-body-1'}>{formatScope(role.block_scopes)}</Text>
            </Flex>
          )}

          {formatScope(role.department_scopes) && (
            <Flex className={recordClassname}>
              <Text className={recordTitleClassname}>Phòng ban áp dụng:</Text>
              <Text className={'typo-body-1'}>{formatScope(role.department_scopes)}</Text>
            </Flex>
          )}

          <Flex className={recordClassname}>
            <Text className={recordTitleClassname}>Người tạo:</Text>
            <Text className={'typo-body-1'}>{role.created_by}</Text>
          </Flex>
        </Flex>
      </Flex>
    </>
  )
}

export default RoleDetail

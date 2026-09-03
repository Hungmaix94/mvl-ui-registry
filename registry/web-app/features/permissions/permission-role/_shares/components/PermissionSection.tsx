import { useState, useMemo, useCallback, useEffect } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { Button } from '@/components/ui'
import { IconArrowcounterclockwise } from '@/assets/icons'
import { usePermissions, type Permission } from '@/services/permission-service.ts'
import { usePermissionSearch } from '@/hooks/usePermissionSearch.ts'
import { PermissionListPanel } from './PermissionListPanel.tsx'
import { FullScreenLoading } from '@/components/Loading.tsx'
import { cn } from '@/utils'

interface PermissionSectionProps {
  initialAssignedIds: number[]
  onChange: (permissionIds: number[]) => void
  disabled?: boolean
}

export function PermissionSection({
  initialAssignedIds,
  onChange,
  disabled = false,
}: PermissionSectionProps) {
  // Fetch all permissions
  const { data, isLoading, error } = usePermissions({ get_all: true })
  const allPermissions: Permission[] = useMemo(() => data?.results || [], [data?.results])

  // State
  const [originalAssignedIds] = useState(initialAssignedIds)
  const [assignedPermissionIds, setAssignedPermissionIds] = useState(initialAssignedIds)
  const [availableSearch, setAvailableSearch] = useState('')
  const [assignedSearch, setAssignedSearch] = useState('')
  const [selectedAvailable, setSelectedAvailable] = useState<number[]>([])
  const [selectedAssigned, setSelectedAssigned] = useState<number[]>([])

  // Sync with initialAssignedIds changes only on mount
  useEffect(() => {
    setAssignedPermissionIds(initialAssignedIds)
  }, []) // Remove initialAssignedIds dependency

  // Compute available and assigned permissions
  const availablePermissions: Permission[] = useMemo(
    () => allPermissions.filter((p: Permission) => !assignedPermissionIds.includes(p.id)),
    [allPermissions, assignedPermissionIds]
  )

  const assignedPermissions: Permission[] = useMemo(
    () => allPermissions.filter((p: Permission) => assignedPermissionIds.includes(p.id)),
    [allPermissions, assignedPermissionIds]
  )

  // Deprecated permissions may stay assigned (removable any time), but must not be newly
  // grantable -- disable them in the "available to grant" panel only.
  const deprecatedAvailableIds = useMemo(
    () => availablePermissions.filter((p) => p.is_deprecated).map((p) => p.id),
    [availablePermissions]
  )

  // Apply search filter
  const filteredAvailable = usePermissionSearch(availablePermissions, availableSearch)
  const filteredAssigned = usePermissionSearch(assignedPermissions, assignedSearch)

  // Check if there are changes from original state
  const hasChanges = useMemo(() => {
    if (assignedPermissionIds.length !== originalAssignedIds.length) {
      return true
    }
    return !assignedPermissionIds.every((id) => originalAssignedIds.includes(id))
  }, [assignedPermissionIds, originalAssignedIds])

  // Selection handlers for Available panel
  const handleSelectAvailable = useCallback((id: number, checked: boolean) => {
    setSelectedAvailable((prev) =>
      checked ? [...prev, id] : prev.filter((selectedId) => selectedId !== id)
    )
  }, [])

  const handleSelectAllAvailable = useCallback(
    (checked: boolean) => {
      if (checked) {
        const displayedIds = filteredAvailable.filter((p) => !p.is_deprecated).map((p) => p.id)
        setSelectedAvailable((prev) => [...new Set([...prev, ...displayedIds])])
      } else {
        const displayedIds = new Set(filteredAvailable.map((p) => p.id))
        setSelectedAvailable((prev) => prev.filter((id) => !displayedIds.has(id)))
      }
    },
    [filteredAvailable]
  )

  // Selection handlers for Assigned panel
  const handleSelectAssigned = useCallback((id: number, checked: boolean) => {
    setSelectedAssigned((prev) =>
      checked ? [...prev, id] : prev.filter((selectedId) => selectedId !== id)
    )
  }, [])

  const handleSelectAllAssigned = useCallback(
    (checked: boolean) => {
      if (checked) {
        const displayedIds = filteredAssigned.map((p) => p.id)
        setSelectedAssigned((prev) => [...new Set([...prev, ...displayedIds])])
      } else {
        const displayedIds = new Set(filteredAssigned.map((p) => p.id))
        setSelectedAssigned((prev) => prev.filter((id) => !displayedIds.has(id)))
      }
    },
    [filteredAssigned]
  )

  // Bulk actions - move ALL permissions in panel
  const handleGrantAll = useCallback(() => {
    const availableIds = availablePermissions.filter((p) => !p.is_deprecated).map((p) => p.id)
    const newAssigned = [...assignedPermissionIds, ...availableIds]
    setAssignedPermissionIds(newAssigned)
    onChange(newAssigned)
    setSelectedAvailable([])
  }, [availablePermissions, assignedPermissionIds, onChange])

  const handleRevokeAll = useCallback(() => {
    setAssignedPermissionIds([])
    onChange([])
    setSelectedAssigned([])
  }, [onChange])

  // Selected actions - move only selected permissions
  const handleGrantSelected = useCallback(() => {
    const newAssigned = [...assignedPermissionIds, ...selectedAvailable]
    setAssignedPermissionIds(newAssigned)
    onChange(newAssigned)
    setSelectedAvailable([])
  }, [selectedAvailable, assignedPermissionIds, onChange])

  const handleRevokeSelected = useCallback(() => {
    const newAssigned = assignedPermissionIds.filter((id) => !selectedAssigned.includes(id))
    setAssignedPermissionIds(newAssigned)
    onChange(newAssigned)
    setSelectedAssigned([])
  }, [selectedAssigned, assignedPermissionIds, onChange])

  // Refresh - reset to original state
  const handleRefresh = useCallback(() => {
    setAssignedPermissionIds(originalAssignedIds)
    onChange(originalAssignedIds)
    setSelectedAvailable([])
    setSelectedAssigned([])
    setAvailableSearch('')
    setAssignedSearch('')
  }, [originalAssignedIds, onChange])

  // Loading state
  if (isLoading) {
    return (
      <Flex direction="column" gap="5" className="w-full">
        <Flex align="center" justify="between">
          <Text className="typo-body-xl-semibold text-content-dark-1">Phân quyền</Text>
        </Flex>
        <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
      </Flex>
    )
  }

  // Error state
  if (error) {
    return (
      <Flex direction="column" gap="5" className="w-full">
        <Flex align="center" justify="between">
          <Text className="typo-body-xl-semibold text-content-dark-1">Phân quyền</Text>
        </Flex>
        <Flex
          align="center"
          justify="center"
          className="border-border-1 bg-background-2 h-['unset'] min-h-['unset'] flex-1 rounded border"
        >
          <Text className="typo-body-base-regular text-action-primary-red-default">
            Không thể tải danh sách quyền. Vui lòng thử lại sau.
          </Text>
        </Flex>
      </Flex>
    )
  }

  return (
    <Flex direction="column" gap="5" className="w-full">
      {/* Header */}
      <Flex align="center" justify="between">
        <Text className="typo-body-xl-semibold text-content-dark-1">Phân quyền</Text>
        <Button
          type="button"
          variant="link"
          size="small"
          onClick={handleRefresh}
          disabled={disabled || !hasChanges}
          leftIcon={<IconArrowcounterclockwise />}
          className={cn(
            'typo-body-base-medium text-action-primary-red-default no-underline',
            'hover:text-action-primary-red-default hover:no-underline'
          )}
        >
          Khôi phục
        </Button>
      </Flex>

      {/* Two Panels */}
      <Flex gap="4">
        <PermissionListPanel
          title="Quyền chưa chỉ định"
          permissions={availablePermissions}
          filteredPermissions={filteredAvailable}
          selectedIds={selectedAvailable}
          searchValue={availableSearch}
          onSearchChange={setAvailableSearch}
          onSelect={handleSelectAvailable}
          onSelectAll={handleSelectAllAvailable}
          onBulkAction={handleGrantAll}
          onSelectedAction={handleGrantSelected}
          bulkActionText="Cấp toàn bộ quyền"
          selectedActionText="Cấp quyền đã chọn"
          emptyMessage="Tất cả quyền đã được chỉ định"
          emptySearchMessage="Không tìm thấy quyền nào"
          disabled={disabled}
          disabledIds={deprecatedAvailableIds}
        />

        <PermissionListPanel
          title="Quyền đã chỉ định"
          permissions={assignedPermissions}
          filteredPermissions={filteredAssigned}
          selectedIds={selectedAssigned}
          searchValue={assignedSearch}
          onSearchChange={setAssignedSearch}
          onSelect={handleSelectAssigned}
          onSelectAll={handleSelectAllAssigned}
          onBulkAction={handleRevokeAll}
          onSelectedAction={handleRevokeSelected}
          bulkActionText="Xoá toàn bộ quyền"
          selectedActionText="Xoá quyền đã chọn"
          emptyMessage="Chưa có quyền nào được chỉ định"
          emptySearchMessage="Không tìm thấy quyền nào"
          disabled={disabled}
        />
      </Flex>
    </Flex>
  )
}

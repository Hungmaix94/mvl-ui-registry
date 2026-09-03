import { useMemo } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { TextField, Button } from '@/components/ui'
import { IconMagnifyingglass } from '@/assets/icons'
import { PermissionTable } from './PermissionTable.tsx'
import type { Permission } from '@/services/permission-service.ts'

interface PermissionListPanelProps {
  title: string
  permissions: Permission[]
  filteredPermissions: Permission[]
  selectedIds: number[]
  searchValue: string
  onSearchChange: (value: string) => void
  onSelect: (id: number, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  onBulkAction: () => void
  onSelectedAction: () => void
  bulkActionText: string
  selectedActionText: string
  emptyMessage: string
  emptySearchMessage: string
  disabled?: boolean
  /** Permission IDs whose checkbox is disabled (e.g. deprecated -- cannot be newly assigned). */
  disabledIds?: number[]
}

export function PermissionListPanel({
  title,
  permissions,
  filteredPermissions,
  selectedIds,
  searchValue,
  onSearchChange,
  onSelect,
  onSelectAll,
  onBulkAction,
  onSelectedAction,
  bulkActionText,
  selectedActionText,
  emptyMessage,
  emptySearchMessage,
  disabled = false,
  disabledIds = [],
}: PermissionListPanelProps) {
  // Only rows that can actually be checked/unchecked count toward "select all" state --
  // a disabled (deprecated) row can never be selected, so it must not keep the header
  // checkbox stuck at "indeterminate" forever.
  const selectableFiltered = useMemo(
    () => filteredPermissions.filter((p) => !disabledIds.includes(p.id)),
    [filteredPermissions, disabledIds]
  )

  // Check if all displayed (selectable) permissions are selected
  const isAllSelected = useMemo(() => {
    if (selectableFiltered.length === 0) return false
    return selectableFiltered.every((p) => selectedIds.includes(p.id))
  }, [selectableFiltered, selectedIds])

  // Check if some (not all) displayed (selectable) permissions are selected
  const isIndeterminate = useMemo(() => {
    if (selectableFiltered.length === 0) return false
    const selectedCount = selectableFiltered.filter((p) => selectedIds.includes(p.id)).length
    return selectedCount > 0 && selectedCount < selectableFiltered.length
  }, [selectableFiltered, selectedIds])

  const displayEmptyMessage = searchValue.trim() ? emptySearchMessage : emptyMessage

  return (
    <div className="bg-background-2 border-border-1 flex flex-1 flex-col rounded-[3px] border">
      {/* Header */}
      <div className="flex flex-col gap-3 p-4">
        {/* Title + Counter */}
        <Flex align="center" justify="between" className="px-2">
          <Text className="typo-body-base-semibold text-content-dark-2">{title}</Text>
          <Text className="typo-body-base-regular text-content-dark-3">
            Đã chọn: {selectedIds.length}/{permissions.length}
          </Text>
        </Flex>

        {/* Search */}
        <TextField
          placeholder="Search"
          value={searchValue}
          onChange={(value) => onSearchChange(value)}
          prefix={<IconMagnifyingglass className="text-content-dark-3" />}
          disabled={disabled}
        />
      </div>

      {/* Divider */}
      <div className="bg-border-1 h-px" />

      {/* Table */}
      <div className="flex-1 overflow-hidden">
        <PermissionTable
          permissions={filteredPermissions}
          selectedIds={selectedIds}
          onSelect={onSelect}
          onSelectAll={onSelectAll}
          isAllSelected={isAllSelected}
          isIndeterminate={isIndeterminate}
          emptyMessage={displayEmptyMessage}
          disabledIds={disabledIds}
        />
      </div>

      {/* Divider */}
      <div className="bg-border-1 h-px" />

      {/* Footer Actions */}
      <Flex align="center" justify="between" className="px-6 py-4">
        <Button
          type="button"
          variant="text"
          size="small"
          onClick={onBulkAction}
          disabled={disabled || permissions.length === 0}
          className="text-action-primary-red-default hover:text-action-primary-red-hover"
        >
          {bulkActionText}
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={onSelectedAction}
          disabled={disabled || selectedIds.length === 0}
        >
          {selectedActionText}
        </Button>
      </Flex>
    </div>
  )
}

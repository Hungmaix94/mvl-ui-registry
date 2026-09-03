import { Checkbox } from '@/components/ui'
import type { Permission } from '@/services/permission-service.ts'

interface PermissionTableProps {
  permissions: Permission[]
  selectedIds: number[]
  onSelect: (id: number, checked: boolean) => void
  onSelectAll: (checked: boolean) => void
  isAllSelected: boolean
  isIndeterminate: boolean
  emptyMessage?: string
  /** Permission IDs whose checkbox is disabled (e.g. deprecated -- cannot be newly assigned). */
  disabledIds?: number[]
}

export function PermissionTable({
  permissions,
  selectedIds,
  onSelect,
  onSelectAll,
  isAllSelected,
  isIndeterminate,
  emptyMessage = 'Không có quyền nào',
  disabledIds = [],
}: PermissionTableProps) {
  return (
    <div className="flex h-[560px] flex-col overflow-auto">
      {/* Header */}
      <div className="bg-background-2 border-border-1 sticky top-0 z-10 flex shrink-0 border">
        <div className="flex w-[56px] items-center justify-center px-3 py-2.5">
          <Checkbox
            checked={isIndeterminate ? 'indeterminate' : isAllSelected}
            onCheckedChange={(state) => onSelectAll(!!state)}
          />
        </div>
        <div className="flex w-[400px] items-center px-3 py-2.5">
          <p className="typo-body-base-regular text-content-dark-2">Tên quyền</p>
        </div>
      </div>

      {/* Body */}
      {permissions.length === 0 ? (
        <div className="bg-background-1 border-border-1 flex h-full items-center justify-center border">
          <p className="typo-body-base-regular text-content-dark-3">{emptyMessage}</p>
        </div>
      ) : (
        permissions.map((permission) => {
          const isDisabled = disabledIds.includes(permission.id)
          return (
            <div
              key={permission.id}
              className="bg-background-1 border-border-1 flex h-[48px] items-center border"
            >
              <div className="flex w-[56px] items-center justify-center px-3 py-2.5">
                <Checkbox
                  checked={selectedIds.includes(permission.id)}
                  disabled={isDisabled}
                  onCheckedChange={(checked) => onSelect(permission.id, !!checked)}
                />
              </div>
              <div className="flex items-center px-3 py-2.5">
                <p
                  className={
                    isDisabled
                      ? 'typo-body-base text-content-dark-3'
                      : 'typo-body-base text-content-dark-1'
                  }
                  title={`${permission.name ?? ''}${permission.name && permission.code ? ' • ' : ''}${permission.code ?? ''}`}
                >
                  {permission.name}
                  {isDisabled && ' (Đã ngừng dùng)'}
                </p>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}

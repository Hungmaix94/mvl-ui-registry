import Button from '@/components/ui/button/Button.tsx'
import { cn } from '@/utils'

type BulkEditFooterProps = {
  selectedCount: number
  totalCount: number
  onRoleChange: () => void
  disabled?: boolean
}

export default function BulkEditFooter({
  selectedCount,
  totalCount,
  onRoleChange,
  disabled = false,
}: BulkEditFooterProps) {
  return (
    <div
      className={cn(
        'sticky right-0 bottom-0 left-0',
        'bg-background-1 border-border-1 border-t',
        'p-4',
        'z-20'
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-content-dark-2 bg-background-1">
          Đã chọn: {selectedCount}/{totalCount}
        </span>
        <Button
          variant="primary"
          onClick={onRoleChange}
          disabled={disabled || selectedCount === 0}
          className="w-[180px]"
        >
          Chọn vai trò
        </Button>
      </div>
    </div>
  )
}

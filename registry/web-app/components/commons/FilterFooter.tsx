import { Button } from '@/components/ui'

function FilterFooter({
  onClear,
  onApply,
}: {
  onClear: () => void
  onApply: () => void
  onCancel: () => void
}) {
  return (
    <div className="border-border-1 flex items-center justify-between border-t-[1px] border-solid px-6 py-4">
      <Button variant="text" onClick={onClear} size="small">
        Xoá bộ lọc
      </Button>
      <div className="flex items-center gap-2">
        <Button variant="primary" onClick={onApply} className="min-w-[128px]">
          Áp dụng
        </Button>
      </div>
    </div>
  )
}

export default FilterFooter

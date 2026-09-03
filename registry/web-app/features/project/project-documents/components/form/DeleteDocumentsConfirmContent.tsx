import { IconFile, IconFolder, IconX } from '@/assets/icons'
import type { RealestateLibraryFileRead } from '@/services/document-service.ts'
import { ElibraryNodeType } from '@/constants/api-schema-aliases'
type DeleteDocumentsConfirmContentProps = {
  items: RealestateLibraryFileRead[]
  onRemoveItem: (id: number) => void
}

export default function DeleteDocumentsConfirmContent({
  items,
  onRemoveItem,
}: DeleteDocumentsConfirmContentProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="typo-body-base text-content-dark-2">
        Bạn có muốn xoá{' '}
        {items.length === 1 ? (
          <>
            "
            <span className="text-content-dark-1 typo-body-base-medium">
              {items[0]?.name ?? '-'}
            </span>
            "
          </>
        ) : (
          <span className="text-content-dark-1 typo-body-base-medium">{items.length} mục</span>
        )}{' '}
        sau không?
      </p>

      <div className="border-border-1 bg-background-2 max-h-[280px] overflow-auto rounded-sm border p-2">
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="border-border-1 bg-content-light-1 flex items-center justify-between rounded-sm border px-3 py-2"
            >
              <div className="flex items-center gap-2">
                {item.node_type === ElibraryNodeType.folder ? (
                  <IconFolder size={16} className="text-content-dark-2 shrink-0" />
                ) : (
                  <IconFile size={16} className="text-content-dark-2 shrink-0" />
                )}
                <span className="typo-body-sm text-content-dark-1 truncate" title={item.name ?? ''}>
                  {item.name ?? '-'}
                </span>
              </div>
              <button
                type="button"
                className="text-content-dark-3 hover:text-action-primary-red-default"
                onClick={() => onRemoveItem(item.id)}
                aria-label={`Xoá ${item.name ?? 'mục này'} khỏi danh sách xoá`}
                title="Bỏ khỏi danh sách"
              >
                <IconX size={16} />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

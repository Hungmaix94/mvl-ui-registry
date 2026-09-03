import React from 'react'
import type { RealestateLibraryFileRead } from '@/services/document-service'
import { DATETIME_FORMAT } from '@/constants/date-format.ts'
import { formatDate } from '@/utils/date-utils.ts'
import { cn } from '@/utils'
import { PROJECT_DOCUMENT_DETAIL_MODE, type ProjectDocumentDetailMode } from '../../constants'
import { Separator } from '@radix-ui/themes'
import { formatFileSize } from '../../helpers'
import { IconFile, IconFolder, IconX } from '@/assets/icons'
import { ElibraryNodeType } from '@/constants/api-schema-aliases'

type ProjectDocumentDetailPanelProps = {
  item: RealestateLibraryFileRead | null
  visible: boolean
  mode: ProjectDocumentDetailMode
  selectionCount: number
  selectedItems?: RealestateLibraryFileRead[]
  currentFolderLabel: string
  onClose: () => void
  onRemoveSelectedItem?: (id: number) => void
}

type DetailRowProps = {
  label: string
  value: string | number
  isShowSeparator?: boolean
}

type DetailPanelHeaderProps = {
  mode: ProjectDocumentDetailMode
  item: RealestateLibraryFileRead | null
  onClose: () => void
}

type SelectionDetailContentProps = {
  selectionCount: number
  selectedItems?: RealestateLibraryFileRead[]
  onRemoveSelectedItem?: (id: number) => void
}

type CurrentFolderDetailContentProps = {
  currentFolderLabel: string
}

type ItemDetailContentProps = {
  item: RealestateLibraryFileRead | null
}

function getFileExtension(fileName?: string) {
  if (!fileName) return '-'

  const lastDotIndex = fileName.lastIndexOf('.')
  if (lastDotIndex <= 0 || lastDotIndex === fileName.length - 1) {
    return '-'
  }

  return fileName.slice(lastDotIndex + 1).toLowerCase()
}

function getPanelTitle(mode: ProjectDocumentDetailMode, item: RealestateLibraryFileRead | null) {
  if (mode === PROJECT_DOCUMENT_DETAIL_MODE.SELECTION) {
    return 'Mục được chọn'
  }

  if (mode === PROJECT_DOCUMENT_DETAIL_MODE.CURRENT_FOLDER) {
    return 'Thư mục hiện tại'
  }

  if (item?.node_type === ElibraryNodeType.folder) {
    return 'Thông tin chi tiết thư mục'
  }

  if (item?.node_type === ElibraryNodeType.file) {
    return 'Thông tin chi tiết tài liệu'
  }

  return 'Thông tin chi tiết'
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <div className={'flex flex-col items-start justify-center'}>
      <span className="text-content-dark-2 typo-body-sm-medium !font-bold">{label}:</span>
      <span className="text-content-dark-3 typo-body-base">{value}</span>
    </div>
  )
}

function DetailPanelHeader({ mode, item }: DetailPanelHeaderProps) {
  return (
    <div className={cn('p-4', 'bg-data-light-grey-hover')}>
      <h3 className="typo-body-base-semibold text-content-dark-1 text-start">
        {getPanelTitle(mode, item)}
      </h3>
    </div>
  )
}

function SelectionDetailContent({
  selectionCount,
  selectedItems,
  onRemoveSelectedItem,
}: SelectionDetailContentProps) {
  const showItemList = selectionCount >= 2 && selectedItems && selectedItems.length > 0

  return (
    <div className="flex flex-col gap-3">
      <div className="text-content-dark-3 typo-body-sm-regular">
        <span className="text-content-dark-1">{selectionCount}</span> mục được chọn
      </div>

      {showItemList && (
        <>
          <Hint className={'mt-0'} />

          <div className="max-h-[400px] overflow-auto">
            <ul className="flex flex-col gap-1">
              {selectedItems.map((item) => (
                <li
                  key={item.id}
                  className="border-border-1 bg-background-2 flex items-center justify-between gap-2 rounded-sm border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    {item.node_type === ElibraryNodeType.folder ? (
                      <IconFolder size={16} className="text-content-dark-2 shrink-0" />
                    ) : (
                      <IconFile size={16} className="text-content-dark-2 shrink-0" />
                    )}
                    <span
                      className="typo-body-sm text-content-dark-1 text-wrap"
                      title={item.name ?? ''}
                    >
                      {item.name ?? '-'}
                    </span>
                  </div>
                  {onRemoveSelectedItem && (
                    <button
                      type="button"
                      className="text-content-dark-3 hover:text-action-primary-red-default"
                      onClick={() => onRemoveSelectedItem(item.id)}
                      aria-label={`Bỏ chọn ${item.name ?? 'mục này'}`}
                      title="Bỏ khỏi danh sách được chọn"
                    >
                      <IconX size={16} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}

function CurrentFolderDetailContent({ currentFolderLabel }: CurrentFolderDetailContentProps) {
  return (
    <>
      <DetailRow label="Tên thư mục" value={currentFolderLabel || '-'} />
      <Hint />
    </>
  )
}

function Hint({ className }: { className?: string }) {
  return (
    <>
      <p className={cn('text-content-dark-3 typo-body-xs-regular mt-4', className)}>
        * Hãy chọn một tệp hoặc thư mục để xem chi tiết
      </p>
    </>
  )
}

function ItemDetailContent({ item }: ItemDetailContentProps) {
  if (!item) return null

  const detailRows: DetailRowProps[] = [
    { label: 'Tên', value: item.name ?? '-' },
    {
      label: 'Danh mục',
      value: item.category_name || '-',
    },
    {
      label: 'Mô tả',
      value: item.description || '-',
      isShowSeparator: item.node_type !== ElibraryNodeType.folder,
    },
  ]

  if (item.node_type === ElibraryNodeType.folder) {
    detailRows.push(
      { label: 'Số thư mục con', value: item.folders_count ?? 0 },
      { label: 'Số file con', value: item.files_count ?? 0, isShowSeparator: true }
    )
  } else {
    detailRows.push(
      {
        label: 'Kích thước',
        value: formatFileSize(item.file_size),
      },
      {
        label: 'Loại',
        value: getFileExtension(item.file_name),
        isShowSeparator: true,
      }
    )
  }

  detailRows.push(
    { label: 'Mức độ truy cập', value: item.visibility_display ?? '-', isShowSeparator: true },
    { label: 'Người tạo', value: item.owner_username || '-' },
    { label: 'Tạo lúc', value: formatDate(item.created_at, DATETIME_FORMAT) },
    { label: 'Cập nhật', value: formatDate(item.updated_at, DATETIME_FORMAT) }
  )

  return (
    <>
      {detailRows.map((row, index) => (
        <React.Fragment key={`${index}`}>
          <DetailRow
            key={`${row.label}-${row.value}-content-${index}`}
            label={row.label}
            value={row.value}
          />
          {row.isShowSeparator && (
            <Separator
              key={`${row.label}-separator-${index}`}
              orientation={'horizontal'}
              className={'my-4 !w-full'}
            />
          )}
        </React.Fragment>
      ))}
    </>
  )
}

export default function DocumentContentDetailPanel({
  item,
  visible,
  mode,
  selectionCount,
  selectedItems,
  currentFolderLabel,
  onClose,
  onRemoveSelectedItem,
}: ProjectDocumentDetailPanelProps) {
  return (
    <div
      className={cn(
        'shrink-0',
        'overflow-hidden',
        'transition-all duration-200 ease-out',
        visible
          ? 'w-full max-w-[320px] translate-x-0 opacity-100'
          : 'pointer-events-none w-0 max-w-0 translate-x-0 opacity-0'
      )}
    >
      <aside
        className={cn('border-[#f2f2f2]', 'rounded border-l-[1px]', 'h-full w-[320px]', 'pr-7')}
      >
        <DetailPanelHeader mode={mode} item={item} onClose={onClose} />

        <div className="space-y-2 p-4">
          {mode === PROJECT_DOCUMENT_DETAIL_MODE.SELECTION ? (
            <SelectionDetailContent
              selectionCount={selectionCount}
              selectedItems={selectedItems}
              onRemoveSelectedItem={onRemoveSelectedItem}
            />
          ) : mode === PROJECT_DOCUMENT_DETAIL_MODE.CURRENT_FOLDER ? (
            <CurrentFolderDetailContent currentFolderLabel={currentFolderLabel} />
          ) : (
            <ItemDetailContent item={item} />
          )}
        </div>
      </aside>
    </div>
  )
}

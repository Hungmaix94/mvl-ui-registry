import { type FormEvent, type ReactNode, useMemo } from 'react'
import { Button } from '@/components/ui'
import { RadioGroup } from '@/components/ui/radio-group.tsx'
import { IconLinksimple, IconX } from '@/assets/icons'
import { type components } from '@/api/schema'
import type { RealestateLibraryFileRead } from '@/services/document-service'
import { cn } from '@/utils'
import { formatDate } from '@/utils/date-utils'
import { formatFileSize } from '../../helpers'
import DocumentIconTypeFile from '@/features/project/_shares/components/DocumentIconTypeFile.svg'
import ProjectDocumentShareDepartmentEmployeeTable from './ProjectDocumentShareDepartmentEmployeeTable'
import { ElibraryVisibility } from '@/constants/api-schema-aliases'

type VisibilityOption = { value: string; label: string }

type ShareLink = components['schemas']['LibraryAccessTokenRead']

const SHARE_LINK_DATE_FORMAT = 'dd/MM/yyyy HH:mm'

export type ProjectDocumentShareFormProps = {
  items: RealestateLibraryFileRead[]
  onRemoveItem: (id: number) => void
  visibilityOptions: VisibilityOption[]
  visibilityEnumOptions: string[]
  shareVisibility: ElibraryVisibility
  onShareVisibilityChange: (value: ElibraryVisibility) => void
  isDepartmentVisibility: boolean
  selectedDepartmentIds: number[]
  onSelectedDepartmentIdsChange: (ids: number[]) => void
  selectedEmployeeIds: number[]
  onSelectedEmployeeIdsChange: (ids: number[]) => void
  /** Section "Đã chia sẻ với" — chỉ show khi share đơn item (xem implementation-plan.md §7.5). */
  existingSharesSlot?: ReactNode
  /** Map active share-link theo itemId — render icon trạng thái cạnh dung lượng. */
  activeShareLinkByItemId?: Map<number, ShareLink | null>
  /** True khi đang load batch share-links — disable icon trong lúc load. */
  isLoadingShareLinks?: boolean
  /** IDs items user là owner — quyết định icon link có clickable khi chưa có link. */
  ownableItemIds?: number[]
  /** Click icon link của 1 item → reuse hoặc tạo link rồi copy vào clipboard. */
  onCopyItemLink?: (itemId: number) => void | Promise<void>
}

export default function ProjectDocumentShareForm({
  items,
  onRemoveItem,
  visibilityOptions,
  visibilityEnumOptions,
  shareVisibility,
  onShareVisibilityChange,
  isDepartmentVisibility,
  selectedDepartmentIds,
  onSelectedDepartmentIdsChange,
  selectedEmployeeIds,
  onSelectedEmployeeIdsChange,
  existingSharesSlot,
  activeShareLinkByItemId,
  isLoadingShareLinks,
  ownableItemIds,
  onCopyItemLink,
}: ProjectDocumentShareFormProps) {
  const ownableIdSet = useMemo(() => new Set(ownableItemIds ?? []), [ownableItemIds])
  return (
    <div className="space-y-5">
      {existingSharesSlot}
      <div className="bg-background-2 border-border-1 rounded-sm border p-3">
        <div className="max-h-[220px] space-y-2 overflow-auto">
          {items.map((item) => {
            const activeLink = activeShareLinkByItemId?.get(item.id) ?? null
            const hasActiveLink = !!activeLink
            const isOwner = ownableIdSet.has(item.id)
            // Disable icon khi: đang loading, hoặc không có link active và không phải owner
            const isCopyDisabled = isLoadingShareLinks || (!hasActiveLink && !isOwner)
            const linkTooltip = isLoadingShareLinks
              ? 'Đang kiểm tra trạng thái liên kết…'
              : hasActiveLink
                ? `Sao chép liên kết · Hết hạn ${formatDate(
                    activeLink.expires_at,
                    SHARE_LINK_DATE_FORMAT
                  )}`
                : isOwner
                  ? 'Tạo và sao chép liên kết chia sẻ'
                  : 'Chưa có liên kết chia sẻ cho tài liệu này'

            return (
              <div
                key={item.id}
                className="bg-background-1 border-border-1 flex items-center justify-between rounded-sm border px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <img src={DocumentIconTypeFile} alt="Tệp" className="h-6 w-6 shrink-0" />
                  <div className="min-w-0">
                    <p
                      className="typo-body-sm-medium text-content-dark-1 truncate"
                      title={item.name ?? '-'}
                    >
                      {item.name ?? '-'}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        title={linkTooltip}
                        aria-label={linkTooltip}
                        disabled={isCopyDisabled}
                        onClick={() => onCopyItemLink?.(item.id)}
                        className={cn(
                          'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm',
                          'transition-colors duration-150',
                          isCopyDisabled
                            ? 'text-content-dark-3 cursor-not-allowed opacity-50'
                            : hasActiveLink
                              ? 'text-action-primary-red-default hover:text-action-primary-red-hover cursor-pointer'
                              : 'text-content-dark-3 hover:text-content-dark-1 cursor-pointer'
                        )}
                      >
                        <IconLinksimple size={14} />
                      </button>
                      <p className="typo-body-xs-regular text-content-dark-3">
                        {formatFileSize(item.file_size)}
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  variant="text"
                  size="small"
                  iconOnly
                  title="Loại khỏi danh sách chia sẻ"
                  leftIcon={<IconX size={16} />}
                  className="text-content-dark-3 hover:text-content-dark-1"
                  onClick={() => onRemoveItem(item.id)}
                />
              </div>
            )
          })}
        </div>
      </div>

      <div className="space-y-3">
        <RadioGroup
          id="share-visibility"
          label="Quyền xem tài liệu"
          disabled={false}
          options={
            visibilityOptions.length > 0
              ? visibilityOptions
              : visibilityEnumOptions.map((value) => ({ value, label: value }))
          }
          value={shareVisibility}
          onChange={(valueOrEvent: string | FormEvent<HTMLDivElement>) => {
            if (typeof valueOrEvent !== 'string') return
            onShareVisibilityChange(valueOrEvent as ElibraryVisibility)
          }}
          className="gap-[26px]"
        />
      </div>

      {isDepartmentVisibility && (
        <div className="space-y-3">
          <ProjectDocumentShareDepartmentEmployeeTable
            selectedDepartmentIds={selectedDepartmentIds}
            onSelectedDepartmentIdsChange={onSelectedDepartmentIdsChange}
            selectedEmployeeIds={selectedEmployeeIds}
            onSelectedEmployeeIdsChange={onSelectedEmployeeIdsChange}
          />
        </div>
      )}
    </div>
  )
}

import type { RealestateLibraryFileRead } from '@/services/document-service'
import { getGridItemSubtitle } from './gridItemConfig'
import { cn } from '@/utils'
import { ElibraryNodeType } from '@/constants/api-schema-aliases'

type GridItemSubtitleProps = {
  item: RealestateLibraryFileRead
}

const MAX_COUNT_DISPLAY = 999

function formatDisplayCount(value: number | null | undefined): string {
  const safeValue = value ?? 0
  return safeValue > MAX_COUNT_DISPLAY ? `${MAX_COUNT_DISPLAY}+` : `${safeValue}`
}

export default function GridItemSubtitle({ item }: GridItemSubtitleProps) {
  const isFolder = item.node_type === ElibraryNodeType.folder
  const foldersCount = (item.children_count || 0) - (item.files_count || 0) || 0
  const filesCount = item.files_count ?? 0

  const subtitle = isFolder
    ? `${formatDisplayCount(foldersCount)} thư mục | ${formatDisplayCount(filesCount)} tệp`
    : getGridItemSubtitle(item)
  const subtitleTitle = isFolder ? `${foldersCount} thư mục | ${filesCount} tệp` : subtitle

  return (
    <div
      className={cn(
        'text-content-dark-3 typo-body-xs-regular',
        'w-full max-w-full truncate text-center'
      )}
      title={subtitleTitle}
    >
      {subtitle}
    </div>
  )
}

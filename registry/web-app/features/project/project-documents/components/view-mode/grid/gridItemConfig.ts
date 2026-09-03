import type { RealestateLibraryFileRead } from '@/services/document-service'
import { formatNumber } from '@/utils/common'
import { ElibraryNodeType } from '@/constants/api-schema-aliases'

const BYTES_PER_KB = 1024

function formatGridFileSize(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(Number(bytes))) return ''
  const b = Number(bytes)
  if (b < 0) return ''
  if (b === 0) return '0 KB'
  if (b < BYTES_PER_KB) return `${b} B`
  const kb = b / BYTES_PER_KB
  if (kb < BYTES_PER_KB) {
    return `${formatSizeValue(kb)} KB`
  }
  const mb = kb / BYTES_PER_KB
  if (mb < BYTES_PER_KB) {
    return `${formatSizeValue(mb)} MB`
  }
  const gb = mb / BYTES_PER_KB
  return `${formatSizeValue(gb)} GB`
}

function formatSizeValue(value: number): string {
  if (value >= 100) return formatNumber(value, { maximumFractionDigits: 0 })
  if (value >= 10) return formatNumber(value, { maximumFractionDigits: 1 })
  return formatNumber(value, { maximumFractionDigits: 2 })
}

export const GRID_ITEM_SUBTITLE_FOLDER_LABEL = 'thư mục'
export const GRID_ITEM_SUBTITLE_FILE_LABEL = 'tệp'

export function getGridItemSubtitle(item: RealestateLibraryFileRead): string {
  switch (item.node_type) {
    case ElibraryNodeType.folder:
      const foldersCount = item.children_count ?? 0
      const filesCount = item.files_count ?? 0
      return `${foldersCount} ${GRID_ITEM_SUBTITLE_FOLDER_LABEL} | ${filesCount} ${GRID_ITEM_SUBTITLE_FILE_LABEL}`

    case ElibraryNodeType.file:
      return formatGridFileSize(item.file_size)

    default:
      return ''
  }
}

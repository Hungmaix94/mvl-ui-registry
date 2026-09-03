import type { BrowseProjectDocumentResponseData } from '@/services/document-service'
import { formatNumber } from '@/utils/common'
export {
  loadProjectDocumentsUserSettings,
  saveProjectDocumentsUserSettings,
} from './projectDocumentsStorage'

export function getRootFolderIdFromBrowsePayload(
  browseData: BrowseProjectDocumentResponseData
): number | null {
  if (!browseData || typeof browseData !== 'object') return null

  return browseData?.current_folder?.id || null
}

export function formatFileSize(sizeInBytes?: number | null) {
  if (!sizeInBytes || sizeInBytes <= 0) return '-'

  const KB = 1024
  const MB = KB * 1024
  const GB = MB * 1024

  if (sizeInBytes >= GB) {
    return `${formatNumber(sizeInBytes / GB, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} GB`
  }

  if (sizeInBytes >= MB) {
    return `${formatNumber(sizeInBytes / MB, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MB`
  }

  if (sizeInBytes >= KB) {
    return `${formatNumber(sizeInBytes / KB, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KB`
  }

  return `${formatNumber(sizeInBytes)} B`
}

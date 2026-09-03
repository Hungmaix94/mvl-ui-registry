import { lazy, Suspense } from 'react'
import { useParams } from 'react-router-dom'

import { FullScreenLoading } from '@/components/Loading'
import { DocumentViewerError } from '@/features/elibrary/public-document-viewer/components/DocumentViewerError'
import { DocumentViewerLayout } from '@/features/elibrary/public-document-viewer/components/DocumentViewerLayout'
import { DownloadOnlyCard } from '@/features/elibrary/public-document-viewer/components/DownloadOnlyCard'
import { ImagePreview } from '@/features/elibrary/public-document-viewer/components/ImagePreview'
import { TextPreview } from '@/features/elibrary/public-document-viewer/components/TextPreview'
import { ViewerLoading } from '@/features/elibrary/public-document-viewer/components/ViewerLoading'
import type { PublicLibraryFile } from '@/features/elibrary/public-document-viewer/types'
import {
  PREVIEW_KIND,
  resolvePreviewKind,
} from '@/features/elibrary/public-document-viewer/utils/preview-type'
import { useElibraryPublicLibrary } from '@/services/elibrary-service'
import { extractErrorMessage, isNotFoundError } from '@/utils/error-utils'
import { ElibraryNodeType } from '@/constants/api-schema-aliases'

// Code-split các renderer nặng (kéo theo react-pdf / docx-preview / xlsx).
const PdfPreview = lazy(
  () => import('@/features/elibrary/public-document-viewer/components/PdfPreview')
)
const DocxPreview = lazy(
  () => import('@/features/elibrary/public-document-viewer/components/DocxPreview')
)
const SpreadsheetPreview = lazy(
  () => import('@/features/elibrary/public-document-viewer/components/SpreadsheetPreview')
)

function renderPreview(file: PublicLibraryFile) {
  const isFile = file.node_type === ElibraryNodeType.file
  const kind = isFile ? resolvePreviewKind(file.file_name, file.mime_type) : PREVIEW_KIND.DOWNLOAD

  switch (kind) {
    case PREVIEW_KIND.IMAGE:
      return <ImagePreview file={file} />
    case PREVIEW_KIND.PDF:
      return <PdfPreview file={file} />
    case PREVIEW_KIND.DOCX:
      return <DocxPreview file={file} />
    case PREVIEW_KIND.SPREADSHEET:
      return <SpreadsheetPreview file={file} />
    case PREVIEW_KIND.TEXT:
      return <TextPreview file={file} />
    default:
      return <DownloadOnlyCard file={file} />
  }
}

/**
 * Trang public xem/tải tài liệu chia sẻ elibrary tại `/docs/:token`.
 * Truy cập được cho cả khách lẫn user đã đăng nhập (authMiddleware tự gắn token
 * nếu có). Loading fullscreen → resolve token → preview theo định dạng hoặc tải về.
 */
export default function PublicDocumentViewerPage() {
  const { token } = useParams<{ token: string }>()
  const {
    data: file,
    isLoading,
    isError,
    error,
  } = useElibraryPublicLibrary(token ?? '', { enabled: !!token })

  if (!token) return <DocumentViewerError status={404} />
  if (isLoading) return <FullScreenLoading message="Đang tải tài liệu..." />
  if (isError || !file) {
    const status = isNotFoundError(error) ? 404 : (error as { status?: number } | null)?.status
    return <DocumentViewerError status={status} message={extractErrorMessage(error)} />
  }

  return (
    <DocumentViewerLayout file={file}>
      <Suspense fallback={<ViewerLoading />}>{renderPreview(file)}</Suspense>
    </DocumentViewerLayout>
  )
}

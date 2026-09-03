import { useEffect, useRef, useState } from 'react'

import { renderAsync } from 'docx-preview'

import type { PublicLibraryFile } from '../types'
import { useRemoteFileData } from '../hooks/useRemoteFileData'
import { DownloadOnlyCard } from './DownloadOnlyCard'
import { ViewerLoading } from './ViewerLoading'

/** Xem trước file .docx bằng docx-preview (fetch Blob từ S3 → render HTML). */
export default function DocxPreview({ file }: { file: PublicLibraryFile }) {
  const { data: blob, isLoading, error } = useRemoteFileData(file.download_url, 'blob')
  const containerRef = useRef<HTMLDivElement>(null)
  const [hasRenderError, setHasRenderError] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!blob || !container) return

    let cancelled = false
    container.innerHTML = ''
    renderAsync(blob, container, undefined, { className: 'docx', inWrapper: true }).catch(() => {
      if (!cancelled) setHasRenderError(true)
    })

    return () => {
      cancelled = true
    }
  }, [blob])

  if (isLoading) return <ViewerLoading message="Đang tải tài liệu..." />
  if (error || hasRenderError) {
    return (
      <DownloadOnlyCard
        file={file}
        message="Không thể hiển thị tài liệu Word. Bạn có thể tải về để xem."
      />
    )
  }

  return (
    <div className="bg-background-1 w-full overflow-auto rounded-md p-4 shadow-sm">
      <div ref={containerRef} />
    </div>
  )
}

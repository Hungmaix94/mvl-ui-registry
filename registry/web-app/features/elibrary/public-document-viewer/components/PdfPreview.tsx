import { useEffect, useRef, useState } from 'react'

import { Document, Page, pdfjs } from 'react-pdf'
import useMeasure from 'react-use-measure'

import 'react-pdf/dist/Page/TextLayer.css'
import 'react-pdf/dist/Page/AnnotationLayer.css'

import type { PublicLibraryFile } from '../types'
import { useRemoteFileData } from '../hooks/useRemoteFileData'
import { DownloadOnlyCard } from './DownloadOnlyCard'
import { ViewerLoading } from './ViewerLoading'

// Cấu hình PDF worker (giống PayrollPeriodEmployeeDetailPage).
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

const MAX_PAGE_WIDTH = 900
/** Số trang render thêm mỗi lần cuộn tới gần cuối (tránh dựng toàn bộ trang 1 lúc). */
const PAGE_BATCH = 3

/** Xem trước PDF bằng react-pdf. Fetch blob từ S3 → object URL (tránh CORS range). */
export default function PdfPreview({ file }: { file: PublicLibraryFile }) {
  const { data: blob, isLoading, error } = useRemoteFileData(file.download_url, 'blob')

  // Tạo + thu hồi object URL trong useEffect (không dùng useMemo để tránh side-effect
  // chạy nhiều lần gây rò rỉ blob URL).
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) {
      setObjectUrl(null)
      return
    }
    const url = URL.createObjectURL(blob)
    setObjectUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [blob])

  const [containerRef, { width }] = useMeasure()
  const [numPages, setNumPages] = useState(0)
  const [visiblePages, setVisiblePages] = useState(PAGE_BATCH)
  const [hasRenderError, setHasRenderError] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // Tăng dần số trang hiển thị khi người dùng cuộn tới gần cuối (lazy render).
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || numPages === 0 || visiblePages >= numPages) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisiblePages((prev) => Math.min(prev + PAGE_BATCH, numPages))
        }
      },
      { rootMargin: '600px' }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [numPages, visiblePages])

  if (error || hasRenderError) {
    return (
      <DownloadOnlyCard file={file} message="Không thể hiển thị PDF. Bạn có thể tải về để xem." />
    )
  }
  if (isLoading || !objectUrl) return <ViewerLoading message="Đang tải PDF..." />

  const pageWidth = Math.min(width || 800, MAX_PAGE_WIDTH)
  const pagesToRender = Math.min(visiblePages, numPages)

  return (
    <div ref={containerRef} className="flex w-full flex-col items-center">
      <Document
        file={objectUrl}
        onLoadSuccess={({ numPages: total }) => setNumPages(total)}
        onLoadError={() => setHasRenderError(true)}
        loading={<ViewerLoading message="Đang tải PDF..." />}
        className="flex flex-col items-center gap-4"
      >
        {Array.from(new Array(pagesToRender), (_el, index) => (
          <div key={`page_${index + 1}`} className="bg-background-1 overflow-hidden shadow-sm">
            <Page
              pageNumber={index + 1}
              width={pageWidth}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </div>
        ))}
      </Document>

      {numPages > 0 && visiblePages < numPages && (
        <div ref={sentinelRef} className="text-content-dark-3 py-6 text-sm">
          Đang tải thêm trang… ({visiblePages}/{numPages})
        </div>
      )}
    </div>
  )
}

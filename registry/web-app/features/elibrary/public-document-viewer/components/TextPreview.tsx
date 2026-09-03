import type { PublicLibraryFile } from '../types'
import { useRemoteFileData } from '../hooks/useRemoteFileData'
import { DownloadOnlyCard } from './DownloadOnlyCard'
import { ViewerLoading } from './ViewerLoading'

/** Xem trước file text/csv-thuần dưới dạng văn bản. */
export function TextPreview({ file }: { file: PublicLibraryFile }) {
  const { data, isLoading, error } = useRemoteFileData(file.download_url, 'text')

  if (isLoading) return <ViewerLoading message="Đang tải nội dung..." />
  if (error || data == null) {
    return (
      <DownloadOnlyCard
        file={file}
        message="Không thể tải nội dung tệp. Bạn có thể tải về để xem."
      />
    )
  }

  return (
    <pre className="bg-background-1 text-content-dark-2 w-full overflow-auto rounded-md p-4 text-sm break-words whitespace-pre-wrap shadow-sm">
      {data}
    </pre>
  )
}

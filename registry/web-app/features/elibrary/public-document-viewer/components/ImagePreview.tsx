import { useState } from 'react'

import type { PublicLibraryFile } from '../types'
import { DownloadOnlyCard } from './DownloadOnlyCard'

/** Xem trước ảnh trực tiếp từ presigned URL; lỗi tải → rơi về thẻ tải về. */
export function ImagePreview({ file }: { file: PublicLibraryFile }) {
  const [hasError, setHasError] = useState(false)

  if (hasError) {
    return (
      <DownloadOnlyCard file={file} message="Không thể hiển thị ảnh. Bạn có thể tải về để xem." />
    )
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <img
        src={file.download_url}
        alt={file.name}
        className="mx-auto max-h-[80vh] max-w-full rounded-md object-contain shadow-sm"
        onError={() => setHasError(true)}
      />
    </div>
  )
}

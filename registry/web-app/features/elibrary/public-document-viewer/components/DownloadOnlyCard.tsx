import { IconFile } from '@/assets/icons'

import type { PublicLibraryFile } from '../types'
import { formatFileSize, getFileExtension } from '../utils/file-meta'
import { DownloadButton } from './DownloadButton'

interface DownloadOnlyCardProps {
  file: PublicLibraryFile
  /** Thông điệp tuỳ chỉnh (mặc định: định dạng không hỗ trợ xem trước). */
  message?: string
}

/** Thẻ hiển thị thông tin file + nút tải về cho định dạng không xem trước được. */
export function DownloadOnlyCard({ file, message }: DownloadOnlyCardProps) {
  const ext = getFileExtension(file.file_name)
  const metaParts = [
    file.size != null ? formatFileSize(file.size) : null,
    ext ? ext.toUpperCase() : null,
  ].filter(Boolean)

  return (
    <div className="flex flex-1 items-center justify-center">
      <div className="border-border-1 bg-background-1 flex max-w-md flex-col items-center gap-3 rounded-xl border p-8 text-center shadow-sm">
        <IconFile size={56} className="text-content-dark-3" />
        <div>
          <p className="text-content-dark-1 text-lg font-semibold break-words">{file.name}</p>
          <p className="text-content-dark-3 mt-1 text-sm break-words">
            {file.file_name}
            {metaParts.length > 0 ? ` · ${metaParts.join(' · ')}` : ''}
          </p>
        </div>
        <p className="text-content-dark-3 text-sm">
          {message ?? 'Định dạng này không hỗ trợ xem trước. Vui lòng tải về để xem.'}
        </p>
        <DownloadButton url={file.download_url} filename={file.file_name} label="Tải về máy" />
      </div>
    </div>
  )
}

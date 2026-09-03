import type { ReactNode } from 'react'

import Logo from '@/assets/svg/logo.tsx'
import { parseDateTimeFromApi } from '@/utils/date-utils'

import type { PublicLibraryFile } from '../types'
import { formatFileSize } from '../utils/file-meta'
import { DownloadButton } from './DownloadButton'

interface DocumentViewerLayoutProps {
  file: PublicLibraryFile
  children: ReactNode
}

/**
 * Khung trang public tối giản (ngoài AppLayout): header logo + tên file + dung
 * lượng + hạn dùng + nút tải về; phần thân scroll chứa nội dung xem trước.
 */
export function DocumentViewerLayout({ file, children }: DocumentViewerLayoutProps) {
  const expiry = parseDateTimeFromApi(file.expires_at)
  const metaParts = [
    file.size != null ? formatFileSize(file.size) : null,
    expiry ? `Hết hạn: ${expiry}` : null,
  ].filter(Boolean)

  return (
    <div className="bg-background-2 flex min-h-screen flex-col">
      <header className="border-border-1 bg-background-1 flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden h-8 shrink-0 items-center sm:flex [&>svg]:h-8 [&>svg]:w-auto">
            <Logo />
          </div>
          <div className="min-w-0">
            <p className="text-content-dark-1 truncate text-base font-semibold" title={file.name}>
              {file.name}
            </p>
            <p className="text-content-dark-3 truncate text-xs" title={file.file_name}>
              {file.file_name}
              {metaParts.length > 0 ? ` · ${metaParts.join(' · ')}` : ''}
            </p>
          </div>
        </div>
        <DownloadButton url={file.download_url} filename={file.file_name} />
      </header>

      <main className="flex flex-1 flex-col overflow-auto p-4 sm:p-6">{children}</main>
    </div>
  )
}

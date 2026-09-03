import { useState } from 'react'

import { IconDownloadsimple } from '@/assets/icons'
import { Button, type ButtonSize, type ButtonVariant } from '@/components/ui'
import toastService from '@/services/toast-service'
import { downloadFile } from '@/utils/file-download'

interface DownloadButtonProps {
  url: string
  filename: string
  label?: string
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
}

/** Nút tải file về máy: fetch blob qua `downloadFile`, có trạng thái loading + toast lỗi. */
export function DownloadButton({
  url,
  filename,
  label = 'Tải về',
  variant = 'primary',
  size = 'medium',
  className,
}: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    try {
      setIsDownloading(true)
      await downloadFile(url, filename)
    } catch {
      toastService.error('Tải tệp thất bại. Vui lòng thử lại.')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      loading={isDownloading}
      leftIcon={<IconDownloadsimple size={18} />}
      onClick={handleDownload}
      className={className}
    >
      {label}
    </Button>
  )
}

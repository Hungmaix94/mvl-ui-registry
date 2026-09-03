import { Button } from '@/components/ui'
import { downloadFile } from '@/utils/file-download'

type ExportProgressDialogProps = {
  progress: number
  status: 'pending' | 'progress' | 'success' | 'failure'
  downloadUrl?: string | null
  filename?: string
  error?: string | null
  onCancel: () => void
  onRetry?: () => void
  onDownload?: () => void
}

export default function ExportProgressDialog(props: ExportProgressDialogProps) {
  const { progress, status, downloadUrl, filename, error, onCancel, onRetry } = props

  const handleDownload = () => {
    if (downloadUrl && filename) {
      downloadFile(downloadUrl, filename)
    }
    props.onDownload?.()
  }

  return (
    <div className="flex flex-col items-center gap-9 px-6 py-20">
      {/* Title and Subtitle */}
      <div className="flex w-full flex-col items-end gap-5 text-center">
        {status === 'failure' ? (
          <>
            <p className="typo-h4 text-content-dark-1 w-full">Xuất dữ liệu thất bại</p>
            <p className="typo-body-lg-regular text-content-dark-3 w-full">
              {error || 'Đã xảy ra lỗi khi xuất dữ liệu'}
            </p>
          </>
        ) : status === 'success' ? (
          <>
            <p className="typo-h4 text-content-dark-1 w-full">Xuất dữ liệu thành công</p>
            <p className="typo-body-lg-regular text-content-dark-3 w-full">
              File đã sẵn sàng để tải xuống
            </p>
          </>
        ) : (
          <>
            <p className="typo-h4 text-content-dark-1 w-full">Đang xuất dữ liệu...</p>
            <p className="typo-body-lg-regular text-content-dark-3 w-full">
              Vui lòng đợi, quá trình có thể mất vài phút.
            </p>
          </>
        )}
      </div>

      {/* Progress Bar - Only show if not failure */}
      {(status === 'pending' || status === 'progress' || status === 'success') && (
        <div className="flex flex-col items-center gap-2.5">
          <div className="relative h-1.5 w-[544px]">
            {/* Background bar */}
            <div className="bg-content-light-disable absolute top-0 left-0 h-1.5 w-full" />
            {/* Progress bar */}
            <div
              className="bg-action-primary-red-default absolute top-0 left-0 h-1.5 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="typo-body-sm-regular text-content-dark-3 w-full text-center">{progress}%</p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex w-full items-center justify-center gap-4 px-6">
        {status === 'success' ? (
          <>
            <Button variant="secondary" size="medium" onClick={onCancel} className="w-[150px]">
              Đóng
            </Button>
            <Button variant="primary" size="medium" onClick={handleDownload} className="w-[150px]">
              Tải xuống
            </Button>
          </>
        ) : status === 'failure' ? (
          <>
            <Button variant="secondary" size="medium" onClick={onRetry} className="w-[150px]">
              Thử lại
            </Button>
            <Button variant="primary" size="medium" onClick={onCancel} className="w-[150px]">
              Đóng
            </Button>
          </>
        ) : (
          <Button variant="secondary" size="medium" onClick={onCancel} className="w-[150px]">
            Huỷ
          </Button>
        )}
      </div>
    </div>
  )
}

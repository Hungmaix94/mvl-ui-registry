import { Button } from '@/components/ui'
import { IconDownloadsimple } from '@/assets/icons'
import { cn } from '@/utils'

type CitizenIdLike = {
  id?: number
  file_name?: string | null
  file_path?: string
  size?: number | null
  view_url?: string
  download_url?: string
}

function imageSrc(f: CitizenIdLike): string {
  return (f.view_url || f.download_url || '').trim()
}

function isImageName(name: string | null | undefined): boolean {
  return /\.(jpg|jpeg|png|webp)$/i.test(name || '')
}

function downloadFile(file: CitizenIdLike) {
  const url = file.download_url || file.file_path || ''
  if (!url) return
  const link = document.createElement('a')
  link.href = url
  link.download = file.file_name || 'cmnd'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function CitizenIdFileItem({ file }: { file: CitizenIdLike }) {
  const src = imageSrc(file)
  const showImage = !!src && isImageName(file.file_name)

  return (
    <div
      className={cn(
        'border-border-1 bg-data-light-grey-default flex flex-col gap-3 rounded border p-4',
        showImage && 'items-start'
      )}
    >
      {showImage && (
        <div className="flex w-full justify-center">
          <img
            src={src}
            alt={file.file_name || 'CMND/CCCD'}
            className="max-h-64 w-full max-w-lg rounded object-contain"
          />
        </div>
      )}
      <div className="flex w-full flex-wrap items-center justify-between gap-2">
        <div>
          <p className="typo-body-base-semibold text-content-dark-1">
            {file.file_name || 'CMND/CCCD'}
          </p>
          {file.size != null && typeof file.size === 'number' && (
            <p className="typo-body-sm-regular text-content-dark-3">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          )}
        </div>
        {(file.download_url || file.file_path) && (
          <Button
            type="button"
            variant="text"
            title="Tải xuống"
            className="shrink-0"
            leftIcon={<IconDownloadsimple size={20} className="text-content-dark-3" />}
            onClick={() => downloadFile(file)}
          >
            Tải xuống
          </Button>
        )}
      </div>
    </div>
  )
}

type CitizenIdFileDisplayProps = {
  files?: CitizenIdLike[]
}

export default function CitizenIdFileDisplay({ files }: CitizenIdFileDisplayProps) {
  const list = files?.filter(Boolean) ?? []

  if (list.length === 0) {
    return (
      <div className="flex w-full flex-col gap-3">
        <p className="typo-body-xl-semibold text-content-dark-1">Ảnh CMND/CCCD</p>
        <p className="text-content-dark-2 text-sm">Chưa có ảnh CMND/CCCD</p>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <p className="typo-body-xl-semibold text-content-dark-1">Ảnh CMND/CCCD</p>
      <div className="flex flex-col gap-3">
        {list.map((file, idx) => (
          <CitizenIdFileItem key={file.id ?? idx} file={file} />
        ))}
      </div>
    </div>
  )
}

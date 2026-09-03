import { IconFile, IconDownloadsimple } from '../../icons'
import { Button } from '../../ui'
import { formatFileSize } from '@/features/project/project-documents/helpers'

type Attachment = {
  id: number
  file_name: string
  file_path: string
  size: number | null
  download_url?: string
  view_url?: string
}

const IMAGE_EXTENSION_REGEX = /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i

/** Whether a file name has a known image extension (shared across attachment displays). */
export const isImageFile = (fileName: string) => IMAGE_EXTENSION_REGEX.test(fileName)

type AttachmentSectionProps = {
  attachments?: Attachment[]
  isRequired?: boolean
}

const AttachmentSection = ({ attachments = [], isRequired = true }: AttachmentSectionProps) => {
  const handleDownload = (attachment: Attachment) => {
    // Use file_path as URL if url is not provided
    const downloadUrl = attachment.download_url || attachment.file_path

    // Create a temporary link to download the file
    const link = document.createElement('a')
    link.href = downloadUrl
    link.download = attachment.file_name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (attachments.length === 0) {
    return (
      <div className="flex w-full flex-col items-start gap-5">
        <p className="typo-h6 text-content-dark-1">Tài liệu đính kèm</p>
        <p className="typo-body-lg-regular text-content-dark-3">Không có tài liệu đính kèm</p>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col items-start gap-5">
      <p className="typo-body-xl-semibold text-content-dark-1">
        Tài liệu đính kèm
        {isRequired && <span className={'text-action-primary-red-default'}> *</span>}
      </p>

      <div className="flex w-full flex-col items-start gap-2">
        {attachments.map((attachment) => {
          const isImage = isImageFile(attachment.file_name)
          const previewUrl = attachment.view_url || attachment.download_url || attachment.file_path

          return (
            <div key={attachment.id} className="flex w-full items-start gap-2">
              <div className="flex items-center gap-4">
                {isImage ? (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="border-border-1 block h-12 w-12 overflow-hidden rounded border"
                    title={attachment.file_name}
                  >
                    <img
                      src={previewUrl}
                      alt={attachment.file_name}
                      className="h-full w-full object-cover"
                    />
                  </a>
                ) : (
                  <div className="bg-background-3 flex items-center gap-2.5 rounded p-2">
                    <IconFile size={20} className="text-content-dark-1" />
                  </div>
                )}

                <div className="flex flex-col items-start justify-center">
                  <p
                    className="typo-body-lg text-content-dark-1 max-w-[300px] truncate"
                    title={attachment.file_name}
                  >
                    {attachment.file_name}
                  </p>
                  <p className="typo-body-sm-regular text-content-dark-3">
                    {formatFileSize(attachment.size)}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => handleDownload(attachment)}
                variant={'text'}
                title="Tải xuống"
                iconOnly
                leftIcon={<IconDownloadsimple size={24} className="text-content-dark-3" />}
                className={'p-0'}
                size={'extra-large'}
              />
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default AttachmentSection

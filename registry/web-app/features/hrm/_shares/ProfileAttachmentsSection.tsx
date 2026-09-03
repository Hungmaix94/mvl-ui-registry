import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection.tsx'
import type { components } from '@/api/schema'

type FileModel = components['schemas']['File']

export default function ProfileAttachmentsSection({
  attachments,
}: {
  attachments?: FileModel[] | null
}) {
  const list = attachments?.length ? attachments : []
  if (list.length === 0) {
    return (
      <div className="flex w-full flex-col gap-3">
        <p className="typo-body-xl-semibold text-content-dark-1">Tệp đính kèm</p>
        <p className="text-content-dark-2 text-sm">Không có tệp đính kèm</p>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <AttachmentSection
        attachments={list.map((a) => ({
          id: a.id,
          file_name: a.file_name,
          file_path: a.file_path,
          size: a.size ?? null,
          download_url: a.download_url,
        }))}
        isRequired={false}
      />
    </div>
  )
}

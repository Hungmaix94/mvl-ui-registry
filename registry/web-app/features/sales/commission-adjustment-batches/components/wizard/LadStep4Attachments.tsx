import { useCallback, useRef, useState } from 'react'
import { Flex } from '@radix-ui/themes'
import { IconPaperclip } from '@/assets/icons'
import { Button, Text } from '@/components/ui'
import { DATETIME_FORMAT } from '@/constants/date-format'
import { formatFileSize } from '@/features/project/project-documents/helpers'
import { getFileService } from '@/services/file-service'
import { cn } from '@/utils'
import { formatDate } from '@/utils/date-utils'
import { extractErrorMessage } from '@/utils/error-utils'

import { LAD_ATTACHMENT_MAX_BYTES } from '../../constants/lad-constants'
import type { LadAttachmentFile } from '../../types/lad-types'

const LAD_ATTACHMENT_PURPOSE = 'lad_attachment'
const LAD_ATTACHMENT_RELATED_MODEL = 'dealcommissionadjustmentbatch'

const ACCEPTED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]

type LadAttachmentItem = {
  localKey: string
  file: LadAttachmentFile
}

interface LadStep4AttachmentsProps {
  batchId: number
  onAttachmentIdsChange: (ids: number[]) => void
}

function isAllowedMime(type: string) {
  if (!type) return false
  return ACCEPTED_MIME.includes(type)
}

/**
 * Bước 4 — Chứng từ đính kèm: danh sách file + vùng kéo-thả.
 */
export function LadStep4Attachments({ batchId, onAttachmentIdsChange }: LadStep4AttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<LadAttachmentItem[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)

  const syncIds = useCallback(
    (next: LadAttachmentItem[]) => {
      const ids = next.map((i) => i.file.id).filter((id): id is number => typeof id === 'number')
      onAttachmentIdsChange(ids)
    },
    [onAttachmentIdsChange]
  )

  const uploadFiles = useCallback(
    async (rawFiles: FileList) => {
      const list = Array.from(rawFiles)
      if (!list.length) return
      setUploadError(null)
      setIsUploading(true)
      try {
        const uploaded: LadAttachmentItem[] = []
        for (const file of list) {
          if (!isAllowedMime(file.type)) {
            throw new Error('Chỉ hỗ trợ PDF, Word hoặc Excel')
          }
          if (file.size > LAD_ATTACHMENT_MAX_BYTES) {
            throw new Error(`File không được vượt quá ${formatFileSize(LAD_ATTACHMENT_MAX_BYTES)}`)
          }
          const presign = await getFileService().presignFile({
            file_name: file.name,
            file_type: file.type || 'application/octet-stream',
            purpose: LAD_ATTACHMENT_PURPOSE,
          })
          if (!presign?.upload_url || !presign.file_token) {
            throw new Error('Không thể tạo URL upload')
          }
          const putRes = await fetch(presign.upload_url, {
            method: 'PUT',
            body: file,
            headers: { 'Content-Type': file.type || 'application/octet-stream' },
          })
          if (!putRes.ok) throw new Error('Upload file thất bại')

          const confirmed = await getFileService().confirmFiles({
            files: [
              {
                file_token: presign.file_token,
                purpose: LAD_ATTACHMENT_PURPOSE,
                related_model: LAD_ATTACHMENT_RELATED_MODEL,
                related_object_id: batchId,
                related_field: 'attachments',
              },
            ],
          })
          const confirmedFile = confirmed?.confirmed_files?.[0]
          if (!confirmedFile?.id) throw new Error('Xác nhận file thất bại')

          uploaded.push({
            localKey: String(confirmedFile.id),
            file: confirmedFile,
          })
        }
        setItems((prev) => {
          const next = [...prev, ...uploaded]
          syncIds(next)
          return next
        })
      } catch (err) {
        setUploadError(extractErrorMessage(err))
      } finally {
        setIsUploading(false)
      }
    },
    [batchId, syncIds]
  )

  const handleRemove = (localKey: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.localKey !== localKey)
      syncIds(next)
      return next
    })
  }

  return (
    <section className="border-border-1 overflow-hidden rounded-xl border">
      <Flex
        justify="between"
        align="center"
        wrap="wrap"
        gap="3"
        className="border-border-1 border-b px-5 py-3.5"
      >
        <Text className="typo-body-base-semibold text-content-dark-1">
          Chứng từ đính kèm ({items.length})
        </Text>
        <Button
          type="button"
          variant="secondary-border"
          size="small"
          leftIcon={<IconPaperclip className="h-4 w-4" />}
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
        >
          Tải file lên
        </Button>
      </Flex>

      <div className="flex flex-col gap-4 p-5">
        {items.length > 0 && (
          <div className="divide-border-1 border-border-1 flex flex-col divide-y rounded-lg border">
            {items.map((item) => {
              const meta = item.file
              const uploader = meta.uploaded_by_username || '—'
              const uploadedAt = meta.created_at
                ? formatDate(meta.created_at, DATETIME_FORMAT)
                : '—'

              return (
                <div
                  key={item.localKey}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-[200px] flex-1">
                    <p
                      className="typo-body-sm-semibold text-content-dark-1 truncate"
                      title={meta.file_name}
                    >
                      {meta.file_name}
                    </p>
                    <p className="text-content-dark-3 typo-body-xs-regular">
                      {formatFileSize(meta.size ?? 0)} · {uploader} · {uploadedAt}
                    </p>
                  </div>
                  <Flex align="center" gap="3" wrap="wrap">
                    {meta.view_url ? (
                      <a
                        href={meta.view_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-action-primary-red-default typo-body-sm-medium hover:underline"
                      >
                        Xem
                      </a>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleRemove(item.localKey)}
                      className="text-action-primary-red-default typo-body-sm-medium hover:underline"
                    >
                      Xoá
                    </button>
                  </Flex>
                </div>
              )
            })}
          </div>
        )}

        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragActive(true)
          }}
          onDragLeave={() => setIsDragActive(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragActive(false)
            if (!isUploading && e.dataTransfer.files.length) {
              void uploadFiles(e.dataTransfer.files)
            }
          }}
          className={cn(
            'border-border-1 flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 text-center transition-colors',
            isDragActive && 'border-action-primary-red-default bg-action-primary-red-default/5',
            'hover:border-action-primary-red-default hover:bg-action-primary-red-default/5'
          )}
          onClick={() => !isUploading && inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              inputRef.current?.click()
            }
          }}
          role="button"
          tabIndex={0}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_MIME.join(',')}
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void uploadFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <p className="typo-body-sm-regular text-content-dark-2">
            {isUploading
              ? 'Đang tải lên...'
              : 'Kéo thả file vào đây — PDF/Word/Excel · Tối đa 10 MB / file'}
          </p>
        </div>

        {uploadError && <p className="typo-body-sm-regular text-data-red-default">{uploadError}</p>}
      </div>
    </section>
  )
}

export default LadStep4Attachments

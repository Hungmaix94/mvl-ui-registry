import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { IconCheckcircle, IconFile, IconNotepencil, IconX } from '@/assets/icons'
import { Loading } from '@/components/Loading'
import { Button } from '@/components/ui'
import { TextField } from '@/components/ui/text-field'
import { RadioGroup } from '@/components/ui/radio-group'
import { Flex } from '@radix-ui/themes'
import toastService from '@/services/toast-service'
import { cn } from '@/utils'
import { formatFileSize } from '../../helpers'
import { ElibraryVisibility } from '@/constants/api-schema-aliases'

export type BulkUploadItemStatus =
  | 'idle'
  | 'presigning'
  | 'uploading'
  | 'creating'
  | 'done'
  | 'failed'

export type BulkUploadItem = {
  clientId: string
  fileName: string
  fileSizeBytes: number
  title: string
  description?: string
  file?: File
  token?: string
  status: BulkUploadItemStatus
  error?: string
}

const EMPTY_UPLOAD_LIST_ERROR = 'Vui lòng tải lên file tài liệu'

type ProjectDocumentBulkUploadListProps = {
  initialUploads: BulkUploadItem[]
  visibilityOptions: { value: string; label: string }[]
  initialVisibility?: ElibraryVisibility
  visibilityLocked?: boolean
  onUploadsChange?: (count: number) => void
  showUploadArea?: boolean
}

export type ProjectDocumentBulkUploadListRef = {
  getValues: () => {
    uploads: BulkUploadItem[]
    visibility: ElibraryVisibility
  }
  getAllValues: () => {
    uploads: BulkUploadItem[]
    visibility: ElibraryVisibility
  }
  getValidatedValues: () => {
    uploads: BulkUploadItem[]
    visibility: ElibraryVisibility
  } | null
  setItemsPatch: (patches: Array<Partial<BulkUploadItem> & { clientId: string }>) => void
}

const ProjectDocumentBulkUploadList = forwardRef<
  ProjectDocumentBulkUploadListRef,
  ProjectDocumentBulkUploadListProps
>(function ProjectDocumentBulkUploadList(
  {
    initialUploads,
    visibilityOptions,
    initialVisibility = ElibraryVisibility.department,
    visibilityLocked = false,
    onUploadsChange,
    showUploadArea = false,
  },
  ref
) {
  const stripExtension = useCallback((name: string) => {
    const lastDotIndex = name.lastIndexOf('.')
    if (lastDotIndex <= 0) return name
    return name.slice(0, lastDotIndex)
  }, [])

  const [uploads, setUploads] = useState<BulkUploadItem[]>(
    initialUploads.map((upload) => ({
      clientId: upload.clientId,
      fileName: upload.fileName,
      fileSizeBytes: upload.fileSizeBytes,
      title: upload.title || stripExtension(upload.fileName),
      description: upload.description ?? '',
      file: upload.file,
      token: upload.token,
      status: upload.status,
      error: upload.error,
    }))
  )
  const [isDragActive, setIsDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [openDescriptionByClientId, setOpenDescriptionByClientId] = useState<
    Record<string, boolean>
  >({})
  const [visibility, setVisibility] = useState<ElibraryVisibility>(initialVisibility)
  const [titleErrorsByClientId, setTitleErrorsByClientId] = useState<Record<string, string>>({})
  const [listError, setListError] = useState('')

  const remainingUploads = useMemo(
    () => uploads.filter((upload) => upload.status !== 'done'),
    [uploads]
  )

  const handleTitleChange = useCallback((clientId: string, value: string) => {
    setUploads((prev) =>
      prev.map((upload) => (upload.clientId === clientId ? { ...upload, title: value } : upload))
    )
    setTitleErrorsByClientId((prev) => {
      if (!prev[clientId]) return prev
      const next = { ...prev }
      delete next[clientId]
      return next
    })
  }, [])

  const handleDescriptionChange = useCallback((clientId: string, value: string) => {
    setUploads((prev) =>
      prev.map((upload) =>
        upload.clientId === clientId ? { ...upload, description: value } : upload
      )
    )
  }, [])

  const hasDroppedFolderLikeEntries = useCallback((items: DataTransferItemList | null) => {
    if (!items || items.length === 0) return false

    for (let i = 0; i < items.length; i += 1) {
      const item = (items as any)[i]
      const entry = (item as any)?.webkitGetAsEntry?.()
      if (entry?.isDirectory) return true
    }
    return false
  }, [])

  const isFolderLikeFile = useCallback((file: File) => {
    const relativePath = (file as any)?.webkitRelativePath as string | undefined
    if (relativePath) {
      // Folder root often comes as ".../" in some browsers.
      if (relativePath.endsWith('/')) return true
      // Some browsers may use the folder name without extension.
      if (!file.name.includes('.') && relativePath === `${file.name}/`) return true
    }

    // Heuristic fallback: directory-like root may be represented as a "File" with no size and no extension.
    if (file.size === 0 && !file.name.includes('.')) return true

    return false
  }, [])

  const addFilesToUploads = useCallback(
    (files: File[]) => {
      if (files.length === 0) return

      const newItems: BulkUploadItem[] = files.map((file, idx) => ({
        clientId: `upload-${Date.now()}-${idx}-${file.name}-${file.size}`,
        fileName: file.name,
        fileSizeBytes: file.size,
        file,
        title: stripExtension(file.name),
        description: '',
        status: 'idle',
      }))

      setUploads((prev) => {
        return [...prev, ...newItems]
      })

      // Clear errors when user adds new files.
      setListError('')
    },
    [onUploadsChange, stripExtension]
  )

  const handlePickFiles = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleRemoveUpload = useCallback((clientId: string) => {
    setUploads((prev) => prev.filter((upload) => upload.clientId !== clientId))
    setTitleErrorsByClientId((prev) => {
      if (!prev[clientId]) return prev
      const next = { ...prev }
      delete next[clientId]
      return next
    })
    setOpenDescriptionByClientId((prev) => {
      if (!prev[clientId]) return prev
      const next = { ...prev }
      delete next[clientId]
      return next
    })
  }, [])

  useEffect(() => {
    onUploadsChange?.(remainingUploads.length)
  }, [onUploadsChange, remainingUploads.length])

  useEffect(() => {
    if (uploads.length === 0) {
      setListError((prev) => (prev === EMPTY_UPLOAD_LIST_ERROR ? prev : EMPTY_UPLOAD_LIST_ERROR))
      return
    }

    setListError((prev) => (prev === EMPTY_UPLOAD_LIST_ERROR ? '' : prev))
  }, [uploads.length])

  useImperativeHandle(ref, () => ({
    getValues: () => ({
      uploads: remainingUploads,
      visibility,
    }),
    getAllValues: () => ({
      uploads,
      visibility,
    }),
    getValidatedValues: () => {
      if (remainingUploads.length === 0) {
        setTitleErrorsByClientId({})
        setListError(EMPTY_UPLOAD_LIST_ERROR)
        return null
      }

      const nextErrors: Record<string, string> = {}
      const normalizedUploads = remainingUploads.map((upload) => {
        const trimmedTitle = upload.title.trim()
        const trimmedDescription = (upload.description ?? '').trim()
        if (!trimmedTitle) {
          nextErrors[upload.clientId] = 'Tên tài liệu là bắt buộc'
        }
        return {
          ...upload,
          title: trimmedTitle,
          description: trimmedDescription,
        }
      })
      setTitleErrorsByClientId(nextErrors)
      if (Object.keys(nextErrors).length > 0) {
        setListError('')
        return null
      }
      setListError('')
      return {
        uploads: normalizedUploads,
        visibility,
      }
    },
    setItemsPatch: (patches) => {
      if (patches.length === 0) return
      const patchMap = new Map(patches.map((patch) => [patch.clientId, patch]))
      setUploads((prev) =>
        prev.map((upload) => {
          const patch = patchMap.get(upload.clientId)
          if (!patch) return upload
          return {
            ...upload,
            ...patch,
            clientId: upload.clientId,
          }
        })
      )
    },
  }))

  const getStatusLabel = useCallback((status: BulkUploadItemStatus) => {
    if (status === 'presigning') return 'Đang chuẩn bị tải lên'
    if (status === 'uploading') return 'Đang tải lên'
    if (status === 'creating') return 'Đang tạo tài liệu'
    return ''
  }, [])

  const shouldShowUploadArea = showUploadArea

  return (
    <div className="flex flex-col gap-4">
      {shouldShowUploadArea ? (
        <div
          className={cn(
            'border-border-1 bg-background-2 flex flex-col items-center justify-center rounded-sm border border-dashed px-8 py-6 transition-colors',
            isDragActive && 'border-action-primary-red-default bg-action-primary-red-default/5'
          )}
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (!isDragActive) setIsDragActive(true)
          }}
          onDragLeave={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDragActive(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDragActive(false)

            const hasFolderLikeEntries = hasDroppedFolderLikeEntries(e.dataTransfer.items)
            const rawFiles = Array.from(e.dataTransfer.files || [])
            const filteredFiles = rawFiles.filter((file) => !isFolderLikeFile(file))

            if (hasFolderLikeEntries || filteredFiles.length !== rawFiles.length) {
              toastService.warning('Không hỗ trợ tải lên folder')
            }

            if (filteredFiles.length === 0) {
              setListError(EMPTY_UPLOAD_LIST_ERROR)
              return
            }

            addFilesToUploads(filteredFiles)
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              addFilesToUploads(files)

              // Reset to allow selecting same file again.
              if (e.currentTarget) e.currentTarget.value = ''
            }}
          />

          <p className="typo-body-base text-content-dark-2">Kéo thả file tại đây</p>
          <p className="typo-body-base-regular text-content-dark-3 mt-2">hoặc</p>

          <button
            type="button"
            className="border-border-1 bg-background-2 typo-body-sm-regular text-content-dark-1 hover:border-action-primary-red-default hover:text-action-primary-red-default rounded-sm border px-4 py-2"
            onClick={handlePickFiles}
          >
            Chọn từ máy tính
          </button>
        </div>
      ) : null}

      <p className="typo-body-base text-content-dark-2">
        Chuẩn bị tải lên{' '}
        <span className="text-content-dark-1 typo-body-base-medium">{uploads.length}</span> tệp. Bạn
        có thể chỉnh sửa tên tài liệu và chọn phạm vi truy cập trước khi tạo.
      </p>

      {uploads.length > 0 ? (
        <div className="border-border-1 bg-background-2 max-h-[320px] overflow-auto rounded-sm border p-2">
          <ul className="flex flex-col gap-2">
            {uploads.map((upload) => {
              const isBusy =
                upload.status === 'presigning' ||
                upload.status === 'uploading' ||
                upload.status === 'creating'
              const isDone = upload.status === 'done'
              const isDescriptionVisible =
                !isDone &&
                !isBusy &&
                (uploads.length === 1 || !!openDescriptionByClientId[upload.clientId])
              const showPlusButton =
                !isDone &&
                !isBusy &&
                uploads.length > 1 &&
                !openDescriptionByClientId[upload.clientId]

              return (
                <li
                  key={upload.clientId}
                  className="border-border-1 bg-content-light-1 flex flex-col gap-2 rounded-sm border px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <IconFile size={16} className="text-content-dark-2 shrink-0" />
                    <div className="min-w-0 flex-1">
                      {isDone ? (
                        <span
                          className="typo-body-base-regular text-content-dark-1 block truncate"
                          title={upload.title}
                        >
                          {upload.title}
                        </span>
                      ) : (
                        <TextField
                          value={upload.title}
                          onChange={(value) => handleTitleChange(upload.clientId, value)}
                          placeholder="Nhập tên tài liệu"
                          required
                          disabled={
                            upload.status === 'presigning' ||
                            upload.status === 'uploading' ||
                            upload.status === 'creating'
                          }
                          error={upload.error || titleErrorsByClientId[upload.clientId]}
                        />
                      )}
                      <Flex justify={'between'} align={'center'}>
                        <div className="typo-body-xs-regular text-content-dark-3 mt-1 block">
                          {formatFileSize(upload.fileSizeBytes)}
                        </div>
                        {isBusy ? (
                          <div className="typo-body-sm-regular text-content-dark-3 dot-loader mt-1 block">
                            {getStatusLabel(upload.status)}
                          </div>
                        ) : null}
                      </Flex>
                    </div>

                    <div className="ga-2 flex flex-col-reverse items-center justify-between">
                      {showPlusButton ? (
                        <Button
                          type="button"
                          variant="text"
                          size="small"
                          iconOnly
                          showBackground={false}
                          onClick={() =>
                            setOpenDescriptionByClientId((prev) => ({
                              ...prev,
                              [upload.clientId]: true,
                            }))
                          }
                          className="text-content-dark-2 hover:text-action-primary-red-default cursor-pointer rounded-sm p-1"
                          aria-label="Thêm mô tả"
                          title="Thêm mô tả cho tài liệu này"
                        >
                          <IconNotepencil size={16} />
                        </Button>
                      ) : null}

                      {isDone ? (
                        <IconCheckcircle
                          size={18}
                          className="text-data-green-default shrink-0"
                          aria-label="Đã tạo tài liệu"
                        />
                      ) : isBusy ? (
                        <Loading size="sm" variant="spinner" className="w-fit" />
                      ) : (
                        <Button
                          type="button"
                          variant="text"
                          size="small"
                          iconOnly
                          showBackground={false}
                          onClick={() => handleRemoveUpload(upload.clientId)}
                          className="text-content-dark-2 hover:text-action-primary-red-default cursor-pointer rounded-sm p-1"
                          aria-label={`Xoá ${upload.fileName}`}
                          title="Xoá tệp"
                        >
                          <IconX size={14} />
                        </Button>
                      )}
                    </div>
                  </div>

                  {isDescriptionVisible ? (
                    <TextField
                      value={upload.description ?? ''}
                      onChange={(value) => handleDescriptionChange(upload.clientId, value)}
                      placeholder="Nhập mô tả"
                      disabled={isBusy}
                      autoFocus={uploads.length > 1}
                    />
                  ) : null}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      {listError ? (
        <p className="typo-body-small text-action-primary-red-default">{listError}</p>
      ) : null}

      <RadioGroup
        id="bulk-upload-visibility"
        label="Phạm vi truy cập"
        value={visibility}
        onChange={(value) => setVisibility(value as ElibraryVisibility)}
        disabled={visibilityLocked}
        options={visibilityOptions}
      />
    </div>
  )
})

ProjectDocumentBulkUploadList.displayName = 'ProjectDocumentBulkUploadList'

export default ProjectDocumentBulkUploadList

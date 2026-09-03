import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/utils'
import { formatFileSize } from '@/features/project/project-documents/helpers'
import { IconImage, IconUpload } from '../../icons'
import { getFileService } from '@/services/file-service'
import { Button } from '../button'
import { JobDescription } from '@/services'
import { FileThumbnail_status } from '@/api/schema'
import { extractErrorMessage } from '@/utils/error-utils'

/** Id tạm cho file mới upload (id từ API thường < 1e10). */
const TEMP_FILE_ID_THRESHOLD = 1e10

export interface FileUploadProps {
  onChange?: ((fileToken: string) => void) | ((fileTokens: string[]) => void)
  value?: string | string[] | (string | number)[] // For react-hook-form Controller
  error?: string
  accept?: string[]
  maxSize?: number // in bytes
  className?: string
  disabled?: boolean
  existingFile?: JobDescription['attachment']
  existingFiles?: JobDescription['attachment'][]
  /** Khi multiple + có existingFiles: gọi với danh sách id của file cũ còn giữ (để PATCH replace đúng). */
  onKeptExistingIdsChange?: (ids: number[]) => void
  required?: boolean
  hiddenLabel?: boolean
  hiddenDescription?: boolean
  purpose?: string
  multiple?: boolean
  maxFiles?: number
  label?: string
  /** Backward-compatible flag from callers using mixed existing ids; currently no special branch needed. */
  multiTrackExistingIds?: boolean
  /** Hiển thị preview ảnh lớn cho single-file (CMND/CCCD). */
  largeImagePreview?: boolean
  /** Gọi khi upload xong (single file), truyền tên file. Dùng để auto-fill tên tài liệu. */
  onFileUploaded?: (fileName: string) => void
}

type UploadedFile = JobDescription['attachment'] & {
  local_preview_url?: string
}

const ACCEPTED_FILE_TYPES: Record<string, string[]> = {
  'application/pdf': ['.pdf'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/csv': ['.csv'],
  'application/vnd.ms-excel': ['.xls', '.xlsx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/jpg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
}

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

function getAcceptedExtensions(acceptList: string[]): string[] {
  const extensions = new Set<string>()

  acceptList.forEach((item) => {
    if (item.startsWith('.')) {
      extensions.add(item.toLowerCase())
      return
    }

    const mappedExtensions = ACCEPTED_FILE_TYPES[item]
    if (mappedExtensions) {
      mappedExtensions.forEach((extension) => extensions.add(extension.toLowerCase()))
    }
  })

  return Array.from(extensions)
}

function buildInputAccept(acceptList: string[], extensions: string[]): string {
  const combined = new Set<string>([...acceptList, ...extensions])
  return Array.from(combined).join(',')
}

function isAcceptedFile(file: File, acceptList: string[], extensions: string[]): boolean {
  if (acceptList.includes(file.type)) {
    return true
  }

  const fileExtension = file.name.includes('.')
    ? `.${file.name.split('.').pop()!.toLowerCase()}`
    : ''

  return fileExtension !== '' && extensions.includes(fileExtension)
}

function formatAcceptedExtensionsForMessage(extensions: string[]) {
  if (extensions.length === 0) {
    return ''
  }

  return extensions.map((extension) => extension.toUpperCase()).join(', ')
}

export const FileUpload = React.forwardRef<HTMLDivElement, FileUploadProps>(
  (
    {
      onChange,
      value,
      error,
      accept = Object.keys(ACCEPTED_FILE_TYPES),
      maxSize = MAX_FILE_SIZE,
      className = '',
      disabled = false,
      existingFile,
      existingFiles,
      onKeptExistingIdsChange,
      required = true,
      hiddenLabel = false,
      hiddenDescription = false,
      purpose,
      multiple = false,
      maxFiles,
      label,
      multiTrackExistingIds: _multiTrackExistingIds,
      largeImagePreview = false,
      onFileUploaded,
    },
    ref
  ) => {
    const initialFiles = useMemo(() => {
      if (multiple && existingFiles) {
        return existingFiles
      }
      if (!multiple && existingFile) {
        return [existingFile]
      }
      return []
    }, [multiple, existingFile, existingFiles])

    const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>(initialFiles)
    const [fileTokens, setFileTokens] = useState<string[]>(() => {
      // Initialize from value prop if provided (from react-hook-form)
      if (value) {
        if (Array.isArray(value)) {
          return (value as unknown[]).filter((v): v is string => typeof v === 'string' && v !== '')
        }
        if (typeof value === 'string' && value !== '') {
          return [value]
        }
      }
      return []
    })
    const [uploadingCount, setUploadingCount] = useState(0)
    const isUploading = uploadingCount > 0
    const [uploadError, setUploadError] = useState<string | null>(null)
    const [isDragActive, setIsDragActive] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Refs luôn phản ánh giá trị state mới nhất — tránh stale closure trong handleFilesUpload
    // mà không cần thêm uploadedFiles/fileTokens vào dependency array
    const uploadedFilesRef = useRef(uploadedFiles)
    const fileTokensRef = useRef(fileTokens)
    uploadedFilesRef.current = uploadedFiles
    fileTokensRef.current = fileTokens

    // Sync existingFiles/existingFile into state when they load after mount (e.g. edit page fetches detail)
    useEffect(() => {
      const fromExisting =
        multiple && existingFiles?.length
          ? existingFiles
          : !multiple && existingFile
            ? [existingFile]
            : []
      if (fromExisting.length > 0) {
        setUploadedFiles((prev) => (prev.length === 0 ? fromExisting : prev))
      }
    }, [multiple, existingFiles, existingFile])

    // Báo cáo danh sách id file cũ (từ API) còn trong list để form gửi attachment_ids khi PATCH.
    // Equality-guard tránh re-emit khi keptIds không đổi — consumer thường truyền inline
    // arrow callback (new ref mỗi render) và effect deps gồm callback ref → nếu không guard
    // sẽ infinite loop: emit → parent field.onChange → re-render → new callback ref → emit ...
    const lastKeptIdsKeyRef = useRef<string>('')
    useEffect(() => {
      if (!multiple || !onKeptExistingIdsChange) return
      const keptIds = uploadedFiles
        .filter((f) => typeof f.id === 'number' && f.id < TEMP_FILE_ID_THRESHOLD)
        .map((f) => f.id as number)
      const keptIdsKey = keptIds.join(',')
      if (keptIdsKey === lastKeptIdsKeyRef.current) return
      lastKeptIdsKeyRef.current = keptIdsKey
      onKeptExistingIdsChange(keptIds)
    }, [multiple, onKeptExistingIdsChange, uploadedFiles])

    // Sync value from form (react-hook-form Controller) with fileTokens
    // Only sync on initial mount or when value is explicitly cleared (not during upload)
    // This prevents resetting fileTokens when user uploads new files
    useEffect(() => {
      // Skip sync if we have uploaded files (user has uploaded files, don't reset)
      if (uploadedFiles.length > 0 && fileTokens.length > 0) {
        return
      }

      if (value !== undefined) {
        let newTokens: string[] = []

        if (Array.isArray(value)) {
          newTokens = (value as unknown[]).filter(
            (v): v is string => typeof v === 'string' && v !== ''
          )
        } else if (typeof value === 'string' && value !== '') {
          newTokens = [value]
        } else if (!value || value === '') {
          // Empty value means file was removed
          newTokens = []
        }

        // Only update if different from current tokens
        const currentTokensString = JSON.stringify(fileTokens)
        const newTokensString = JSON.stringify(newTokens)
        if (currentTokensString !== newTokensString) {
          setFileTokens(newTokens)
          if (newTokens.length === 0) {
            setUploadedFiles([])
          }
        }
      }
    }, [value]) // Remove fileTokens from dependencies to avoid infinite loop

    const uploadPurpose = purpose ?? 'job_description'

    const normalizedAccept = accept.length > 0 ? accept : Object.keys(ACCEPTED_FILE_TYPES)
    const acceptExtensions = useMemo(
      () => getAcceptedExtensions(normalizedAccept),
      [normalizedAccept]
    )
    const inputAccept = useMemo(
      () => buildInputAccept(normalizedAccept, acceptExtensions),
      [normalizedAccept, acceptExtensions]
    )
    const acceptedExtensionsText = useMemo(
      () => formatAcceptedExtensionsForMessage(acceptExtensions),
      [acceptExtensions]
    )

    /** Validate + presign + PUT to S3 cho một file. Không đụng state — chỉ trả kết quả hoặc throw. */
    const uploadSingleFile = useCallback(
      async (file: File): Promise<{ newFile: UploadedFile; token: string }> => {
        if (!isAcceptedFile(file, normalizedAccept, acceptExtensions)) {
          throw new Error(
            acceptedExtensionsText
              ? `Chỉ cho phép các định dạng ${acceptedExtensionsText}`
              : 'Định dạng tệp không được hỗ trợ'
          )
        }

        if (file.size > maxSize) {
          throw new Error(`File không được vượt quá ${formatFileSize(maxSize)}`)
        }

        const presignResponse = await getFileService().presignFile({
          file_name: file.name,
          file_type: file.type,
          purpose: uploadPurpose,
        })

        if (!presignResponse) {
          throw new Error('Không thể tạo URL upload')
        }

        const { upload_url, file_token } = presignResponse

        const uploadResponse = await fetch(upload_url, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        })

        if (!uploadResponse.ok) {
          throw new Error('Upload file thất bại')
        }

        const newFile: UploadedFile = {
          file_name: file.name,
          size: file.size,
          view_url: '',
          local_preview_url: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
          uploaded_by_username: '',
          uploaded_by: null,
          updated_at: new Date().toISOString(),
          is_confirmed: false,
          download_url: '',
          created_at: new Date().toISOString(),
          id: Date.now() + Math.random(),
          purpose: uploadPurpose,
          file_path: '',
          checksum: null,
          mime_type: file.type || null,
          thumbnail_status: FileThumbnail_status.pending,
          thumbnails: { sizes: {} },
        }

        return { newFile, token: file_token }
      },
      [normalizedAccept, acceptExtensions, acceptedExtensionsText, maxSize, uploadPurpose]
    )

    /** Upload nhiều file song song, update state 1 lần sau khi tất cả xong. */
    const handleFilesUpload = useCallback(
      async (files: File[]) => {
        if (files.length === 0) return

        const filesToUpload = multiple ? files : [files[0]]
        const currentCount = uploadedFilesRef.current.length
        const remainingSlots = maxFiles
          ? Math.max(0, maxFiles - currentCount)
          : filesToUpload.length

        if (remainingSlots <= 0) {
          setUploadError(`Chỉ được upload tối đa ${maxFiles} file`)
          return
        }

        const limitedFiles = multiple ? filesToUpload.slice(0, remainingSlots) : filesToUpload

        setUploadingCount((c) => c + 1)
        setUploadError(null)

        try {
          const results = await Promise.allSettled(limitedFiles.map(uploadSingleFile))

          const succeeded = results
            .filter(
              (r): r is PromiseFulfilledResult<{ newFile: UploadedFile; token: string }> =>
                r.status === 'fulfilled'
            )
            .map((r) => r.value)

          const failures = results.filter(
            (r): r is PromiseRejectedResult => r.status === 'rejected'
          )

          if (succeeded.length > 0) {
            if (multiple) {
              // Đọc giá trị hiện tại từ ref — tránh stale closure và tránh gọi onChange trong setState
              const prevFiles = uploadedFilesRef.current
              const prevTokens = fileTokensRef.current
              const slots = maxFiles ? Math.max(0, maxFiles - prevFiles.length) : succeeded.length
              const updatedFiles = [
                ...prevFiles,
                ...succeeded.slice(0, slots).map((s) => s.newFile),
              ]
              const updatedTokens = [
                ...prevTokens,
                ...succeeded.slice(0, slots).map((s) => s.token),
              ]
              setUploadedFiles(updatedFiles)
              setFileTokens(updatedTokens)
              ;(onChange as ((t: string[]) => void) | undefined)?.(updatedTokens)
            } else {
              const { newFile, token } = succeeded[0]
              setUploadedFiles([newFile])
              setFileTokens([token])
              ;(onChange as ((t: string) => void) | undefined)?.(token)
              onFileUploaded?.(newFile.file_name)
            }
          }

          if (failures.length > 0) {
            const msg = extractErrorMessage(failures[0].reason, 'Upload file thất bại')
            setUploadError(
              succeeded.length > 0
                ? `${succeeded.length}/${limitedFiles.length} file thành công. Lỗi: ${msg}`
                : msg
            )
          } else if (multiple && filesToUpload.length > limitedFiles.length) {
            setUploadError(
              `Đã upload ${limitedFiles.length} file. Bỏ qua ${filesToUpload.length - limitedFiles.length} file vì vượt quá giới hạn ${maxFiles}.`
            )
          }
        } finally {
          setUploadingCount((c) => c - 1)
        }
      },
      [multiple, maxFiles, uploadSingleFile, onChange, onFileUploaded]
    )

    const handleDragOver = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        if (!disabled && !isUploading) {
          setIsDragActive(true)
        }
      },
      [disabled, isUploading]
    )

    const handleDragLeave = useCallback((e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)
    }, [])

    const handleDrop = useCallback(
      (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragActive(false)

        if (disabled || isUploading) return

        const files = Array.from(e.dataTransfer.files)
        if (files.length > 0) {
          handleFilesUpload(files)
        }
      },
      [disabled, isUploading, handleFilesUpload]
    )

    const handleRemoveFile = useCallback(
      (index: number) => {
        const file = uploadedFiles[index]
        if (file?.local_preview_url) {
          URL.revokeObjectURL(file.local_preview_url)
        }
        const isExistingFileId =
          typeof file?.id === 'number' && (file.id as number) < TEMP_FILE_ID_THRESHOLD
        if (multiple) {
          const updatedFiles = uploadedFiles.filter((_, i) => i !== index)
          // fileTokens chỉ tương ứng với các file MỚI (id >= TEMP_FILE_ID_THRESHOLD).
          // Vì uploadedFiles có thể lẫn cả file cũ (existing) + file mới, nên không thể xoá token theo cùng `index`.
          const updatedTokens = (() => {
            if (isExistingFileId) return fileTokens

            const currentNewFiles = uploadedFiles.filter(
              (f) => typeof f.id === 'number' && (f.id as number) >= TEMP_FILE_ID_THRESHOLD
            )
            const removedNewIndex = currentNewFiles.findIndex((f) => f.id === file?.id)
            if (removedNewIndex < 0) return fileTokens

            return fileTokens.filter((_, i) => i !== removedNewIndex)
          })()
          setUploadedFiles(updatedFiles)
          setFileTokens(updatedTokens)
          if (onChange) {
            ;(onChange as (fileTokens: string[]) => void)(updatedTokens)
          }
        } else {
          setUploadedFiles([])
          setFileTokens([])
          if (onChange) {
            ;(onChange as (fileToken: string) => void)('')
          }
        }
        setUploadError(null)
      },
      [multiple, uploadedFiles, fileTokens, onChange]
    )

    const handleSelectFile = () => {
      fileInputRef.current?.click()
    }

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      if (files.length > 0) {
        handleFilesUpload(files)
      }
      // Reset input to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }

    const displayError = error || uploadError

    return (
      <div ref={ref} className={cn('flex w-full flex-col gap-2', className)}>
        {!hiddenLabel && (
          <>
            <div className="flex items-center gap-0.5">
              <label className="typo-body-base-semibold text-content-dark-1">
                {label || 'Tài liệu đính kèm'}
              </label>
              {required && (
                <span className="typo-body-base-semibold text-action-primary-red-default">*</span>
              )}
            </div>
          </>
        )}

        {/* Files Preview - Show list of uploaded files */}
        {uploadedFiles.length > 0 && (
          <div className="mb-4 flex flex-col gap-2">
            {uploadedFiles.map((file, index) => (
              <div
                key={file.id || index}
                className="border-border-1 bg-data-light-grey-default rounded border p-4"
              >
                <div className="flex items-center justify-between gap-2 overflow-hidden">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    {(file.local_preview_url || file.view_url || file.download_url) &&
                    file.file_name.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                      <img
                        src={file.local_preview_url || file.view_url || file.download_url || ''}
                        alt={file.file_name}
                        className={
                          largeImagePreview && !multiple
                            ? 'max-h-48 w-full max-w-md shrink-0 rounded object-contain'
                            : 'h-8 w-8 shrink-0 rounded object-cover'
                        }
                      />
                    ) : (
                      <div className="bg-action-primary-red-default/10 flex h-8 w-8 shrink-0 items-center justify-center rounded">
                        <IconUpload className="text-action-primary-red-default h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className="typo-body-sm-semibold text-content-dark-1 truncate"
                        title={file.file_name}
                      >
                        {file.file_name}
                      </p>
                      <p className="typo-body-xs-regular text-content-dark-3 truncate">
                        {formatFileSize(file.size || 0)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="text"
                    size="small"
                    onClick={() => handleRemoveFile(index)}
                    disabled={disabled}
                    className="text-action-primary-red-default hover:text-action-primary-red-hover shrink-0"
                  >
                    Xóa
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Upload Area - Always show */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'border-border-1 flex h-[223px] cursor-pointer flex-col items-center justify-center rounded border border-dashed px-8 py-6 transition-colors',
            isDragActive && 'border-action-primary-red-default bg-action-primary-red-default/5',
            disabled && 'cursor-not-allowed opacity-50',
            displayError && 'border-data-red-default',
            'hover:border-action-primary-red-default hover:bg-action-primary-red-default/5'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={inputAccept}
            onChange={handleFileInputChange}
            multiple={multiple}
            className="hidden"
          />

          {/* Upload Icon */}
          <div className="text-neutral-80 mb-4 h-12 w-12">
            <IconImage className="h-full w-full" />
          </div>

          {/* Upload Text */}
          <div className="flex flex-col items-center gap-2">
            <p className="typo-body-base-regular text-content-dark-1">
              {isUploading
                ? 'Đang upload...'
                : uploadedFiles.length > 0
                  ? multiple
                    ? 'Kéo thả file khác để thêm'
                    : 'Kéo thả file khác để thay thế'
                  : 'Kéo thả file tại đây'}
            </p>
            <p className="typo-body-base-regular text-content-dark-3">hoặc</p>
            <Button
              type="button"
              variant="secondary-border"
              size="small"
              onClick={handleSelectFile}
              disabled={disabled || isUploading}
              className="w-[166px]"
            >
              Chọn từ máy tính
            </Button>
          </div>

          {/* File Type Info */}
          {!hiddenDescription && (
            <>
              <p className="typo-body-sm-regular text-content-dark-3 mt-2">
                {acceptedExtensionsText
                  ? `Chỉ hỗ trợ định dạng ${acceptedExtensionsText}, tối đa ${formatFileSize(maxSize)}`
                  : `Dung lượng tối đa ${formatFileSize(maxSize)}`}
              </p>
            </>
          )}
        </div>

        {/* Error Message */}
        {displayError && (
          <p className="typo-body-sm-regular text-data-red-default">{displayError}</p>
        )}
      </div>
    )
  }
)

FileUpload.displayName = 'FileUpload'

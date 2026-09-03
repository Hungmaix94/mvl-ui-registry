import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import * as Slider from '@radix-ui/react-slider'
import { Button } from '@/components/ui'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx'
import { IconMinus, IconPlus } from '@/assets/icons'
import { cn } from '@/utils'
import { usePresignFile } from '@/services'
import { extractErrorMessage } from '@/utils/error-utils'
import ReactAvatarEditor from 'react-avatar-editor'
import DefaultAvatar from '@/features/employee/management/view-details/tab-general/DefaultAvatar.tsx'

type AvatarScale = {
  value: number
  min: number
  max: number
  step: number
}

const SCALE_CONFIG: AvatarScale = {
  value: 1.1,
  min: 1,
  max: 3,
  step: 0.1,
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']

type Props = {
  avatarUrl?: string
  onTokenReady: (token: string) => void
  disabled?: boolean
}

const RecruitmentCandidateAvatarUpload = ({ avatarUrl, onTokenReady, disabled }: Props) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState<string | null>(null)
  const [scale, setScale] = useState(SCALE_CONFIG.value)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const editorRef = useRef<ReactAvatarEditor | null>(null)

  useEffect(() => {
    return () => {
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const presignMutation = usePresignFile()

  const cleanupSelection = useCallback(() => {
    if (objectUrl) {
      URL.revokeObjectURL(objectUrl)
    }
    setSelectedFile(null)
    setObjectUrl(null)
    setScale(SCALE_CONFIG.value)
    setErrorMessage(null)
  }, [objectUrl])

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      setIsDialogOpen(nextOpen)
      if (!nextOpen) {
        cleanupSelection()
      }
    },
    [cleanupSelection]
  )

  const handleTriggerFile = useCallback(() => {
    if (disabled) return
    setErrorMessage(null)
    fileInputRef.current?.click()
  }, [disabled])

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setErrorMessage('Vui lòng chọn tệp ảnh PNG, JPG hoặc WEBP')
      event.target.value = ''
      return
    }

    if (file.size > MAX_IMAGE_SIZE) {
      setErrorMessage('Dung lượng ảnh không vượt quá 5MB')
      event.target.value = ''
      return
    }

    const url = URL.createObjectURL(file)
    setSelectedFile(file)
    setObjectUrl(url)
    setIsDialogOpen(true)
    setErrorMessage(null)
  }, [])

  const handleScaleChange = useCallback((value: number) => {
    setScale((prev) => {
      if (Number.isNaN(value)) return prev
      return Math.min(SCALE_CONFIG.max, Math.max(SCALE_CONFIG.min, value))
    })
  }, [])

  const handleDecreaseScale = useCallback(() => {
    handleScaleChange(Number((scale - SCALE_CONFIG.step).toFixed(2)))
  }, [handleScaleChange, scale])

  const handleIncreaseScale = useCallback(() => {
    handleScaleChange(Number((scale + SCALE_CONFIG.step).toFixed(2)))
  }, [handleScaleChange, scale])

  const exportImageBlob = useCallback(async (): Promise<Blob> => {
    const canvas = editorRef.current?.getImageScaledToCanvas()
    if (!canvas) throw new Error('Không thể xử lý ảnh')

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob: Blob | null) => {
        if (!blob) {
          reject(new Error('Không thể tạo ảnh đã cắt'))
          return
        }
        resolve(blob)
      }, selectedFile?.type || 'image/png')
    })
  }, [selectedFile])

  const handleSave = useCallback(async () => {
    if (!selectedFile) {
      setErrorMessage('Vui lòng chọn ảnh trước khi lưu')
      return
    }

    try {
      setIsSaving(true)
      setErrorMessage(null)

      const blob = await exportImageBlob()
      const fileType = blob.type || selectedFile.type || 'image/png'
      const fileExtension = selectedFile.name.split('.').pop() || 'png'
      const croppedFileName = `${selectedFile.name.replace(/\.[^/.]+$/, '')}-cropped.${fileExtension}`

      const presignResponse = await presignMutation.mutateAsync({
        file_name: croppedFileName,
        file_type: fileType,
        purpose: 'candidate_avatar',
      })

      const { upload_url: uploadUrl, file_token: fileToken } = presignResponse

      const uploadResult = await fetch(uploadUrl, {
        method: 'PUT',
        body: blob,
        headers: { 'Content-Type': fileType },
      })

      if (!uploadResult.ok) throw new Error('Tải ảnh lên không thành công')

      // Tạo preview URL từ blob để hiển thị ngay, không cần chờ refetch từ server
      const previewUrl = URL.createObjectURL(blob)
      if (pendingPreviewUrl) URL.revokeObjectURL(pendingPreviewUrl)
      setPendingPreviewUrl(previewUrl)

      onTokenReady(fileToken)
      handleOpenChange(false)
    } catch (error) {
      setErrorMessage(extractErrorMessage(error, 'Đã xảy ra lỗi khi lưu ảnh'))
    } finally {
      setIsSaving(false)
    }
  }, [
    exportImageBlob,
    handleOpenChange,
    onTokenReady,
    pendingPreviewUrl,
    presignMutation,
    selectedFile,
  ])

  const avatarPreview = useMemo(() => {
    if (!objectUrl) return null
    return (
      <div className="relative flex h-[320px] w-[320px] items-center justify-center">
        <ReactAvatarEditor
          ref={editorRef}
          image={objectUrl}
          width={288}
          height={288}
          border={0}
          scale={scale}
          borderRadius={1000}
          className="h-full w-full"
        />
      </div>
    )
  }, [objectUrl, scale])

  return (
    <>
      <p className="text-content-dark-2 w-full text-center text-sm font-semibold">Ảnh đại diện</p>
      <div className="relative h-[142px] w-[142px]">
        {pendingPreviewUrl || avatarUrl ? (
          <img
            src={pendingPreviewUrl || avatarUrl}
            alt="Ảnh đại diện"
            className="h-full w-full rounded-full object-cover"
          />
        ) : (
          <DefaultAvatar />
        )}
      </div>

      <div className="mt-2 flex flex-col gap-2">
        <div className="flex w-[160px] items-center justify-center rounded-sm">
          <Button
            variant="text"
            className="text-action-primary-red-default text-xs font-medium"
            onClick={handleTriggerFile}
            type="button"
            disabled={disabled}
          >
            Chọn ảnh từ máy tính
          </Button>
        </div>
        {errorMessage && <span className="text-content-dark-3 text-xs">{errorMessage}</span>}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="hidden"
        onChange={handleFileChange}
      />

      <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
        <DialogContent
          className={cn(
            'sm:max-w-2xl',
            'bg-background-1',
            'p-0',
            'shadow-[0px_24px_48px_rgba(15,23,42,0.12)]'
          )}
        >
          <DialogHeader className="border-border-1 border-b border-solid px-6 py-4">
            <DialogTitle className="text-content-dark-1 text-xl font-semibold">
              Chỉnh sửa ảnh đại diện
            </DialogTitle>
          </DialogHeader>

          <div className="flex w-full flex-col items-center gap-4 px-6 py-8">
            {avatarPreview}

            <div className="flex w-full max-w-[380px] items-center gap-2">
              <Button
                type="button"
                variant="text"
                iconOnly
                showBackground={false}
                onClick={handleDecreaseScale}
                disabled={scale <= SCALE_CONFIG.min}
                className="text-content-dark-2"
                leftIcon={<IconMinus className="h-5 w-5" />}
              />

              <Slider.Root
                className="relative flex flex-1 touch-none items-center"
                value={[scale]}
                min={SCALE_CONFIG.min}
                max={SCALE_CONFIG.max}
                step={SCALE_CONFIG.step}
                aria-label="Thu phóng ảnh đại diện"
                onValueChange={(values) => {
                  if (values[0] !== undefined) handleScaleChange(values[0])
                }}
              >
                <Slider.Track className="bg-border-2 relative h-1 flex-1 rounded-full">
                  <Slider.Range className="bg-action-primary-red-default absolute h-full rounded-full" />
                </Slider.Track>
                <Slider.Thumb
                  className={cn(
                    'border-action-primary-red-default bg-action-primary-red-default block size-4 rounded-full border transition-colors',
                    'hover:bg-action-primary-red-hover focus-visible:outline-action-primary-red-focus focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
                  )}
                />
              </Slider.Root>

              <Button
                type="button"
                variant="text"
                iconOnly
                showBackground={false}
                onClick={handleIncreaseScale}
                disabled={scale >= SCALE_CONFIG.max}
                className="text-content-dark-2"
                leftIcon={<IconPlus className="h-5 w-5" />}
              />
            </div>

            {errorMessage && (
              <span className="text-action-primary-red-default text-sm">{errorMessage}</span>
            )}
          </div>

          <DialogFooter
            className={cn(
              'flex w-full justify-end gap-3 px-6 py-4',
              'border-border-1 border-t border-solid'
            )}
          >
            <Button
              type="button"
              variant="secondary"
              onClick={() => handleOpenChange(false)}
              disabled={isSaving}
              className="w-[120px]"
            >
              Huỷ
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={handleSave}
              disabled={isSaving}
              loading={isSaving}
              className="w-[120px]"
            >
              Lưu
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default RecruitmentCandidateAvatarUpload

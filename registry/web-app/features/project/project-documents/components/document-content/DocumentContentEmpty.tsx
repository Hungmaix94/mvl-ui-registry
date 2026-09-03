import { Button } from '@/components/ui'

type ProjectDocumentsEmptyStateProps = {
  onCreateFolder: () => void
  onCreateDocument: () => void
  canCreateFolder?: boolean
  canUploadDocument?: boolean
}

export default function DocumentContentEmpty({
  onCreateFolder,
  onCreateDocument,
  canCreateFolder = true,
  canUploadDocument = true,
}: ProjectDocumentsEmptyStateProps) {
  const hasAnyAction = canCreateFolder || canUploadDocument
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-3 p-4">
      <p className="typo-body-base-semibold text-content-dark-1">
        Thư mục hiện tại chưa có tài liệu
      </p>
      <p className="typo-body-sm-regular text-content-dark-3">
        {canUploadDocument
          ? 'Kéo thả file vào đây hoặc chọn hành động tạo mới'
          : 'Chưa có tài liệu trong thư mục này.'}
      </p>
      {hasAnyAction && (
        <div className="flex items-center gap-2">
          {canCreateFolder && (
            <Button variant="secondary" size="small" onClick={onCreateFolder}>
              Tạo thư mục
            </Button>
          )}
          {canUploadDocument && (
            <Button variant="primary" size="small" onClick={onCreateDocument}>
              Tạo tài liệu
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

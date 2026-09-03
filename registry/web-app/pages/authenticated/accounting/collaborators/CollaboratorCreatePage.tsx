import { useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import CollaboratorForm from '@/features/accounting/collaborators/_shares/components/CollaboratorForm.tsx'
import type { CollaboratorCloneState } from '@/features/accounting/collaborators/_shares/hooks/useCollaboratorClone.tsx'
import type { CollaboratorFormValues } from '@/features/accounting/collaborators/types/collaborator-types.ts'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { withRememberedSearch } from '@/utils/list-url-memory'

export default function CollaboratorCreatePage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const state = location.state as CollaboratorCloneState | null

  // Prefill từ query param: picker CTV (`CollaboratorSelectWithCreate`) mở trang này ở tab mới kèm
  // từ khoá vừa tìm không ra, để kế toán khỏi gõ lại. Nhân bản (clone state) vẫn ưu tiên hơn.
  const initialValues: Partial<CollaboratorFormValues> | undefined = useMemo(() => {
    const name = searchParams.get('name')?.trim()
    const idNumber = searchParams.get('id_number')?.trim()
    const fromQuery: Partial<CollaboratorFormValues> = {
      ...(name ? { name } : {}),
      ...(idNumber ? { id_number: idNumber } : {}),
    }
    const merged = { ...fromQuery, ...(state?.initialValues ?? {}) }
    return Object.keys(merged).length > 0 ? merged : undefined
  }, [searchParams, state?.initialValues])

  // Điều hướng thuộc về page: `CollaboratorForm` không dùng hook router (xem chú thích trong file
  // đó) nên page phải tự lo cả thành công lẫn huỷ.
  const backToList = () => navigate(withRememberedSearch(APP_PATH.COLLABORATOR_MANAGEMENT))

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title={state?.initialValues ? 'Nhân bản Cộng tác viên' : 'Thêm Cộng tác viên'}
        enableBackButton
      />
      <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
        <CollaboratorForm
          initialValues={initialValues}
          onSuccess={backToList}
          onCancel={backToList}
        />
      </div>
    </div>
  )
}

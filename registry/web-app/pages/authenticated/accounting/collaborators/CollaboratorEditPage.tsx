import { useNavigate, useParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { useAbility } from '@/lib/ability.ts'
import CollaboratorForm from '@/features/accounting/collaborators/_shares/components/CollaboratorForm.tsx'
import { useCollaborator } from '@/features/accounting/collaborators/services/collaborator-service.ts'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { withRememberedSearch } from '@/utils/list-url-memory'

export default function CollaboratorEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const collaboratorId = Number(id)
  const ability = useAbility()
  const { data: collaborator, isLoading, isError } = useCollaborator(collaboratorId)
  // Điều hướng thuộc về page: `CollaboratorForm` còn được nhúng vào dialog toàn cục (ngoài Router)
  // nên bản thân nó không được dùng hook router.
  const backToList = () => navigate(withRememberedSearch(APP_PATH.COLLABORATOR_MANAGEMENT))

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle title={`Chỉnh sửa CTV — ${collaborator?.code ?? ''}`} enableBackButton />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={!collaborator}
        isError={isError}
        hasPermission={ability.can('update', 'collaborator')}
      >
        <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-4 pt-4 pb-6">
          <CollaboratorForm
            collaboratorId={collaboratorId}
            onSuccess={backToList}
            onCancel={backToList}
          />
        </div>
      </DetailPageWrapper>
    </div>
  )
}

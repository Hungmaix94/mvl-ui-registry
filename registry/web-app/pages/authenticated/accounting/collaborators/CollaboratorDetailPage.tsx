import { useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper.tsx'
import { useAbility } from '@/lib/ability.ts'
import { APP_PATH } from '@/routes'
import CollaboratorDetail from '@/features/accounting/collaborators/view-details/CollaboratorDetail.tsx'
import { useCollaborator } from '@/features/accounting/collaborators/services/collaborator-service.ts'
import { useCollaboratorDelete } from '@/features/accounting/collaborators/_shares/hooks/useCollaboratorDelete.tsx'

export default function CollaboratorDetailPage() {
  const { id } = useParams<{ id: string }>()
  const collaboratorId = Number(id)
  const navigate = useNavigate()
  const ability = useAbility()
  const { data: collaborator, isLoading, isError } = useCollaborator(collaboratorId)

  const { openDeleteDialog } = useCollaboratorDelete(() =>
    navigate(APP_PATH.COLLABORATOR_MANAGEMENT)
  )

  const handleDelete = useCallback(() => {
    if (collaborator) openDeleteDialog(collaborator)
  }, [collaborator, openDeleteDialog])

  return (
    <>
      <PageTitle
        title={collaborator?.name ?? ''}
        enableBackButton
        handleEdit={
          ability.can('update', 'collaborator')
            ? () => navigate(APP_PATH.COLLABORATOR_EDIT.replace(':id', String(collaboratorId)))
            : undefined
        }
        handleShowHistory={
          ability.can('histories', 'collaborator')
            ? () => navigate(APP_PATH.COLLABORATOR_HISTORY.replace(':id', String(collaboratorId)))
            : undefined
        }
        handleDelete={ability.can('destroy', 'collaborator') ? handleDelete : undefined}
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={!collaborator}
        isError={isError}
        hasPermission={ability.can('retrieve', 'collaborator')}
      >
        {collaborator && <CollaboratorDetail collaborator={collaborator} />}
      </DetailPageWrapper>
    </>
  )
}

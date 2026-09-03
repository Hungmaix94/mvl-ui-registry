import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import type { Collaborator } from '@/features/accounting/collaborators/services/collaborator-service.ts'
import type { CollaboratorFormValues } from '@/features/accounting/collaborators/types/collaborator-types.ts'

export type CollaboratorCloneState = {
  initialValues: Partial<CollaboratorFormValues>
}

export function useCollaboratorClone() {
  const navigate = useNavigate()

  const openCloneFlow = useCallback(
    (source: Collaborator) => {
      // Pre-fill: skip unique fields (id_number, phone, email) — user must enter fresh values.
      const initialValues: Partial<CollaboratorFormValues> = {
        name: `${source.name} (copy)`,
        bank_name: source.bank_name || '',
        bank_account: source.bank_account || '',
        bank_branch: source.bank_branch || '',
        address: source.address || '',
        note: source.note || '',
        is_active: true,
      }

      navigate(APP_PATH.COLLABORATOR_CREATE, {
        state: { initialValues } as CollaboratorCloneState,
      })
    },
    [navigate]
  )

  return { openCloneFlow }
}

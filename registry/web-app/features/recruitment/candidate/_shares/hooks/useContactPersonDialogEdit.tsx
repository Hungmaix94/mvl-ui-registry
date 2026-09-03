import { useCallback } from 'react'
import { ContactPersonForm } from '@/features/recruitment/candidate/_shares/components/contact-person/ContactPersonForm.tsx'
import type { RecruitmentCandidate } from '@/features/recruitment/services/recruitment-candidate-service'
import { useDialog } from '@/hooks/useDialog.ts'

export function useContactPersonDialogEdit() {
  const { displayFormContent } = useDialog()

  const openEditContactPersonDialog = useCallback(
    (candidate: RecruitmentCandidate) => {
      const contactPerson = (candidate as any).contact_person
      const initialValues = contactPerson
        ? {
            branch_id: 0,
            block_id: 0,
            department_id: (contactPerson as any).department?.id,
            employee_id: contactPerson.id,
          }
        : undefined

      displayFormContent({
        size: 'lg',
        title: 'Chỉnh sửa người liên hệ',
        content: (
          <ContactPersonForm candidate={candidate} mode="edit" initialValues={initialValues} />
        ),
        hideFooter: true,
        dialogContentClassName: 'p-0',
      })
    },
    [displayFormContent]
  )

  return {
    openEditContactPersonDialog,
  }
}

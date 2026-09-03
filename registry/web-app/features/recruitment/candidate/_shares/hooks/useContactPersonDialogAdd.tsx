import { useCallback } from 'react'
import { ContactPersonForm } from '@/features/recruitment/candidate/_shares/components/contact-person/ContactPersonForm.tsx'
import type { RecruitmentCandidate } from '@/features/recruitment/services/recruitment-candidate-service'
import { useDialog } from '@/hooks/useDialog.ts'

export function useContactPersonDialogAdd() {
  const { displayFormContent } = useDialog()

  const openAddContactPersonDialog = useCallback(
    (candidate: RecruitmentCandidate) => {
      displayFormContent({
        size: 'lg',
        title: 'Thêm người liên hệ',
        content: <ContactPersonForm candidate={candidate} mode="add" />,
        hideFooter: true,
        dialogContentClassName: 'p-0',
      })
    },
    [displayFormContent]
  )

  return {
    openAddContactPersonDialog,
  }
}

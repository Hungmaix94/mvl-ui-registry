import { useCallback } from 'react'
import { ContactLogForm } from '@/features/recruitment/candidate/_shares/components/contact-log/ContactLogForm.tsx'
import type { RecruitmentCandidate } from '@/services'
import { useDialog } from '@/hooks/useDialog.ts'

export function useContactLogAdd() {
  const { displayFormContent } = useDialog()

  const openAddContactLogDialog = useCallback(
    (candidate: RecruitmentCandidate) => {
      displayFormContent({
        size: 'lg',
        title: 'Thêm lần liên hệ',
        content: <ContactLogForm candidate={candidate} mode="add" />,
        hideFooter: true,
        dialogContentClassName: 'p-0',
      })
    },
    [displayFormContent]
  )

  return {
    openAddContactLogDialog,
  }
}

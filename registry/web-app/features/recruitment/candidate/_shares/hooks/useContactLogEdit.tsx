import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import { ContactLogForm } from '@/features/recruitment/candidate/_shares/components/contact-log/ContactLogForm.tsx'
import type { RecruitmentCandidate } from '@/services'

export function useContactLogEdit() {
  const { displayFormContent } = useDialog()

  const openEditContactLogDialog = useCallback(
    (candidate: RecruitmentCandidate, contactLog: any) => {
      displayFormContent({
        size: 'lg',
        title: 'Chỉnh sửa lần liên hệ',
        content: (
          <ContactLogForm
            candidate={candidate}
            mode="edit"
            initialValues={{
              id: contactLog.id,
              employee_id: contactLog.employee?.id,
              date: contactLog.date,
              method: contactLog.method,
              note: contactLog.note,
            }}
          />
        ),
        hideFooter: true,
        dialogContentClassName: 'p-0',
      })
    },
    [displayFormContent]
  )

  return {
    openEditContactLogDialog,
  }
}

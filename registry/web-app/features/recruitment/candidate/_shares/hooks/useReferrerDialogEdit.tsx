import { useCallback } from 'react'
import { ReferrerForm } from '@/features/recruitment/candidate/_shares/components/referrer/ReferrerForm.tsx'
import type { RecruitmentCandidate } from '@/services'
import { useDialog } from '@/hooks/useDialog.ts'

export function useReferrerDialogEdit() {
  const { displayFormContent } = useDialog()

  const openEditReferrerDialog = useCallback(
    (candidate: RecruitmentCandidate) => {
      // Prepare initial values for edit mode
      const initialValues = {
        branch_id: undefined, // Will be loaded from employee data
        block_id: undefined, // Will be loaded from employee data
        department_id: candidate?.referrer?.department?.id,
        employee_id: candidate?.referrer?.id,
      }

      displayFormContent({
        size: 'lg',
        title: 'Chỉnh sửa người giới thiệu',
        content: <ReferrerForm candidate={candidate} mode="edit" initialValues={initialValues} />,
        hideFooter: true,
        dialogContentClassName: 'p-0',
      })
    },
    [displayFormContent]
  )

  return {
    openEditReferrerDialog,
  }
}

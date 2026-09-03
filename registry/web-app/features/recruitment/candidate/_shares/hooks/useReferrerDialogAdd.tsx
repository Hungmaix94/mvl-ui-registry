import { useCallback } from 'react'
import { ReferrerForm } from '@/features/recruitment/candidate/_shares/components/referrer/ReferrerForm.tsx'
import type { RecruitmentCandidate } from '@/services'
import { useDialog } from '@/hooks/useDialog.ts'

export function useReferrerDialogAdd() {
  const { displayFormContent } = useDialog()

  const openAddReferrerDialog = useCallback(
    (candidate: RecruitmentCandidate) => {
      displayFormContent({
        size: 'lg',
        title: 'Thêm người giới thiệu',
        content: <ReferrerForm candidate={candidate} mode="add" />,
        hideFooter: true,
        dialogContentClassName: 'p-0',
      })
    },
    [displayFormContent]
  )

  return {
    openAddReferrerDialog,
  }
}

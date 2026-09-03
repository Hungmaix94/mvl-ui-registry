import { useCallback } from 'react'
import { useDialog } from '@/hooks/useDialog.ts'
import type { Employee } from '@/features/employee/services/employee-service'
import DocumentSubmissionForm from '@/features/employee/management/view-details/tab-general/document-submission/components/DocumentSubmissionForm.tsx'

export function useDocumentSubmissionEdit() {
  const { displayFormContent } = useDialog()

  const openEditDocumentSubmissionDialog = useCallback(
    (employee: Employee) => {
      displayFormContent({
        size: 'lg',
        title: 'Chỉnh sửa hồ sơ nhân sự',
        content: <DocumentSubmissionForm employee={employee} />,
        hideFooter: true,
        dialogContentClassName: 'p-0',
      })
    },
    [displayFormContent]
  )

  return {
    openEditDocumentSubmissionDialog,
  }
}

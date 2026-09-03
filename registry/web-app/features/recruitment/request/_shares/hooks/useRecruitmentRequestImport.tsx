import { useCallback } from 'react'

import { useEmployeeImportProgressDialog } from '@/features/employee/management/_shares/hooks/useEmployeeImportProgressDialog.tsx'
import { useRecruitmentRequestImportUploadDialog } from './useRecruitmentRequestImportUploadDialog.tsx'
import { useRecruitmentRequestImportResultDialog } from './useRecruitmentRequestImportResultDialog.tsx'

export function useRecruitmentRequestImport() {
  const { openUploadDialog } = useRecruitmentRequestImportUploadDialog()
  const { openProgressDialog } = useEmployeeImportProgressDialog()
  const { openResultDialog } = useRecruitmentRequestImportResultDialog()

  const openImportDialog = useCallback(async () => {
    try {
      const jobId = await openUploadDialog()
      const finalJob = await openProgressDialog(jobId)
      await openResultDialog(finalJob)
    } catch (error) {
      if (error instanceof Error && error.message.endsWith('_cancelled')) {
        return
      }
      console.error('Recruitment request import flow encountered an error:', error)
    }
  }, [openProgressDialog, openResultDialog, openUploadDialog])

  return { openImportDialog }
}

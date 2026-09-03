import { useCallback } from 'react'

import { useInvalidateQueries } from '@/hooks/useApiQuery'
import { useRecruitmentCandidateImportUploadDialog } from './useRecruitmentCandidateImportUploadDialog.tsx'
import { useEmployeeImportProgressDialog } from '@/features/employee/management/_shares/hooks/useEmployeeImportProgressDialog.tsx'
import { useEmployeeImportResultDialog } from '@/features/employee/management/_shares/hooks/useEmployeeImportResultDialog.tsx'

export function useRecruitmentCandidateImport() {
  const { invalidateByPrefix } = useInvalidateQueries()
  const { openUploadDialog } = useRecruitmentCandidateImportUploadDialog()
  const { openProgressDialog } = useEmployeeImportProgressDialog()
  const { openResultDialog } = useEmployeeImportResultDialog()

  const openImportDialog = useCallback(async () => {
    try {
      const jobId = await openUploadDialog()
      const finalJob = await openProgressDialog(jobId)
      await openResultDialog(finalJob)
      invalidateByPrefix('hrm/recruitment-candidates')
    } catch (error) {
      if (error instanceof Error && error.message.endsWith('_cancelled')) {
        return
      }
      console.error('Recruitment candidate import flow encountered an error:', error)
    }
  }, [invalidateByPrefix, openProgressDialog, openResultDialog, openUploadDialog])

  return { openImportDialog }
}

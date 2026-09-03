import { useCallback } from 'react'

import { useInvalidateQueries } from '@/hooks/useApiQuery'
import { useEmployeeImportProgressDialog } from '@/features/employee/management/_shares/hooks/useEmployeeImportProgressDialog.tsx'
import { useEmployeeImportResultDialog } from '@/features/employee/management/_shares/hooks/useEmployeeImportResultDialog.tsx'
import { useRecruitmentExpenseImportUploadDialog } from './useRecruitmentExpenseImportUploadDialog.tsx'

export function useRecruitmentExpenseImport() {
  const { invalidateByPrefix } = useInvalidateQueries()
  const { openUploadDialog } = useRecruitmentExpenseImportUploadDialog()
  const { openProgressDialog } = useEmployeeImportProgressDialog()
  const { openResultDialog } = useEmployeeImportResultDialog()

  const openImportDialog = useCallback(async () => {
    try {
      const jobId = await openUploadDialog()
      const finalJob = await openProgressDialog(jobId)
      await openResultDialog(finalJob)
      invalidateByPrefix('hrm/recruitment-expenses')
    } catch (error) {
      if (error instanceof Error && error.message.endsWith('_cancelled')) {
        return
      }
      console.error('Recruitment expense import flow encountered an error:', error)
    }
  }, [invalidateByPrefix, openProgressDialog, openResultDialog, openUploadDialog])

  return { openImportDialog }
}

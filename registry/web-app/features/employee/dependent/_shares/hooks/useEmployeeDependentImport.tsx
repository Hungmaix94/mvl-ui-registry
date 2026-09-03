import { useCallback } from 'react'

import { useInvalidateQueries } from '@/hooks/useApiQuery'
import { useEmployeeDependentImportUploadDialog } from './useEmployeeDependentImportUploadDialog.tsx'
import { useEmployeeImportProgressDialog } from '@/features/employee/management/_shares/hooks/useEmployeeImportProgressDialog.tsx'
import { useEmployeeImportResultDialog } from '@/features/employee/management/_shares/hooks/useEmployeeImportResultDialog.tsx'

export function useEmployeeDependentImport() {
  const { invalidateByPrefix } = useInvalidateQueries()
  const { openUploadDialog } = useEmployeeDependentImportUploadDialog()
  const { openProgressDialog } = useEmployeeImportProgressDialog()
  const { openResultDialog } = useEmployeeImportResultDialog()

  const openImportDialog = useCallback(async () => {
    try {
      const jobId = await openUploadDialog()
      const finalJob = await openProgressDialog(jobId)
      await openResultDialog(finalJob)
      invalidateByPrefix('hrm/employee-dependents')
    } catch (error) {
      if (error instanceof Error && error.message.endsWith('_cancelled')) {
        return
      }

      console.error('Employee dependent import flow encountered an error:', error)
    }
  }, [invalidateByPrefix, openProgressDialog, openResultDialog, openUploadDialog])

  return { openImportDialog }
}

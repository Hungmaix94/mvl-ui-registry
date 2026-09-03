import { useCallback } from 'react'

import { useInvalidateQueries } from '@/hooks/useApiQuery'
import { useEmployeeRelationshipImportUploadDialog } from './useEmployeeRelationshipImportUploadDialog.tsx'
import { useEmployeeImportProgressDialog } from '@/features/employee/management/_shares/hooks/useEmployeeImportProgressDialog.tsx'
import { useEmployeeImportResultDialog } from '@/features/employee/management/_shares/hooks/useEmployeeImportResultDialog.tsx'

export function useEmployeeRelationshipImport() {
  const { invalidateByPrefix } = useInvalidateQueries()
  const { openUploadDialog } = useEmployeeRelationshipImportUploadDialog()
  const { openProgressDialog } = useEmployeeImportProgressDialog()
  const { openResultDialog } = useEmployeeImportResultDialog()

  const openImportDialog = useCallback(async () => {
    try {
      const jobId = await openUploadDialog()
      const finalJob = await openProgressDialog(jobId)
      await openResultDialog(finalJob)
      invalidateByPrefix('hrm/employee-relationships')
    } catch (error) {
      if (error instanceof Error && error.message.endsWith('_cancelled')) {
        return
      }

      console.error('Employee relationship import flow encountered an error:', error)
    }
  }, [invalidateByPrefix, openProgressDialog, openResultDialog, openUploadDialog])

  return { openImportDialog }
}

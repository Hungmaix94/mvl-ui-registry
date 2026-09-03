import { useCallback } from 'react'

import { useInvalidateQueries } from '@/hooks/useApiQuery'
import { useEmployeeImportUploadDialog } from './useEmployeeImportUploadDialog.tsx'
import { useEmployeeImportProgressDialog } from './useEmployeeImportProgressDialog.tsx'
import { useEmployeeImportResultDialog } from './useEmployeeImportResultDialog.tsx'

const useEmployeeImport = () => {
  const { invalidateByPrefix } = useInvalidateQueries()
  const { openUploadDialog } = useEmployeeImportUploadDialog()
  const { openProgressDialog } = useEmployeeImportProgressDialog()
  const { openResultDialog } = useEmployeeImportResultDialog()

  const openImportDialog = useCallback(async () => {
    try {
      const jobId = await openUploadDialog()
      const finalJob = await openProgressDialog(jobId)
      await openResultDialog(finalJob)
      invalidateByPrefix('hrm/employees')
    } catch (error) {
      if (error instanceof Error && error.message.endsWith('_cancelled')) {
        return
      }

      console.error('Employee import flow encountered an error:', error)
    }
  }, [invalidateByPrefix, openProgressDialog, openResultDialog, openUploadDialog])

  return { openImportDialog }
}

export default useEmployeeImport

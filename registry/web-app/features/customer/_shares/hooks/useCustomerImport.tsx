import { useCallback } from 'react'

import { useCustomerImportUploadDialog } from './useCustomerImportUploadDialog.tsx'
import { useCustomerImportProgressDialog } from './useCustomerImportProgressDialog.tsx'
import { useCustomerImportResultDialog } from './useCustomerImportResultDialog.tsx'

const useCustomerImport = () => {
  const { openUploadDialog } = useCustomerImportUploadDialog()
  const { openProgressDialog } = useCustomerImportProgressDialog()
  const { openResultDialog } = useCustomerImportResultDialog()

  const openImportDialog = useCallback(async () => {
    try {
      const jobId = await openUploadDialog()
      const finalJob = await openProgressDialog(jobId)
      await openResultDialog(finalJob)
    } catch (error) {
      if (error instanceof Error && error.message.endsWith('_cancelled')) {
        return
      }

      console.error('Customer import flow encountered an error:', error)
    }
  }, [openProgressDialog, openResultDialog, openUploadDialog])

  return { openImportDialog }
}

export default useCustomerImport

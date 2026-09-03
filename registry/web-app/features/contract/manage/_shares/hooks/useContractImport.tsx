import { useCallback } from 'react'

import { useContractImportUploadDialog } from './useContractImportUploadDialog.tsx'
import { useContractImportProgressDialog } from './useContractImportProgressDialog.tsx'
import { useContractImportResultDialog } from './useContractImportResultDialog.tsx'

const useContractImport = () => {
  const { openUploadDialog } = useContractImportUploadDialog()
  const { openProgressDialog } = useContractImportProgressDialog()
  const { openResultDialog } = useContractImportResultDialog()

  const openImportDialog = useCallback(async () => {
    try {
      const jobId = await openUploadDialog()
      const finalJob = await openProgressDialog(jobId)
      await openResultDialog(finalJob)
    } catch (error) {
      if (error instanceof Error && error.message.endsWith('_cancelled')) {
        return
      }

      console.error('Contract import flow encountered an error:', error)
    }
  }, [openProgressDialog, openResultDialog, openUploadDialog])

  return { openImportDialog }
}

export default useContractImport

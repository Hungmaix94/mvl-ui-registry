import { useCallback } from 'react'

import { useContractAppendixImportUploadDialog } from './useContractAppendixImportUploadDialog.tsx'
import { useContractAppendixImportProgressDialog } from './useContractAppendixImportProgressDialog.tsx'
import { useContractAppendixImportResultDialog } from './useContractAppendixImportResultDialog.tsx'

const useContractAppendixImport = () => {
  const { openUploadDialog } = useContractAppendixImportUploadDialog()
  const { openProgressDialog } = useContractAppendixImportProgressDialog()
  const { openResultDialog } = useContractAppendixImportResultDialog()

  const openImportDialog = useCallback(async () => {
    try {
      const jobId = await openUploadDialog()
      const finalJob = await openProgressDialog(jobId)
      await openResultDialog(finalJob)
    } catch (error) {
      if (error instanceof Error && error.message.endsWith('_cancelled')) {
        return
      }

      console.error('Contract appendix import flow encountered an error:', error)
    }
  }, [openProgressDialog, openResultDialog, openUploadDialog])

  return { openImportDialog }
}

export default useContractAppendixImport

import { useCallback } from 'react'

import { useTravelExpenseImportUploadDialog } from './useTravelExpenseImportUploadDialog.tsx'
import { useTravelExpenseImportProgressDialog } from './useTravelExpenseImportProgressDialog.tsx'
import { useTravelExpenseImportResultDialog } from './useTravelExpenseImportResultDialog.tsx'

const useTravelExpenseImport = () => {
  const { openUploadDialog } = useTravelExpenseImportUploadDialog()
  const { openProgressDialog } = useTravelExpenseImportProgressDialog()
  const { openResultDialog } = useTravelExpenseImportResultDialog()

  const openImportDialog = useCallback(
    async (initialMonth?: Date) => {
      try {
        const jobId = await openUploadDialog(initialMonth)
        const finalJob = await openProgressDialog(jobId)
        await openResultDialog(finalJob)
      } catch (error) {
        if (error instanceof Error && error.message.endsWith('_cancelled')) {
          return
        }

        console.error('Travel expense import flow encountered an error:', error)
      }
    },
    [openProgressDialog, openResultDialog, openUploadDialog]
  )

  return { openImportDialog }
}

export default useTravelExpenseImport

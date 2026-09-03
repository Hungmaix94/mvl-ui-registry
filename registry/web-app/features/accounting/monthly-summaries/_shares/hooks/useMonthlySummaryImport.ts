import { useCallback } from 'react'
import { useMonthlySummaryImportUploadDialog } from './useMonthlySummaryImportUploadDialog'
import { useMonthlySummaryImportProgressDialog } from './useMonthlySummaryImportProgressDialog'
import { useMonthlySummaryImportResultDialog } from './useMonthlySummaryImportResultDialog'

export function useMonthlySummaryImport() {
  const { openUploadDialog } = useMonthlySummaryImportUploadDialog()
  const { openProgressDialog } = useMonthlySummaryImportProgressDialog()
  const { openResultDialog } = useMonthlySummaryImportResultDialog()

  const openImportDialog = useCallback(async () => {
    try {
      const jobId = await openUploadDialog()
      const finalJob = await openProgressDialog(jobId)
      await openResultDialog(finalJob)
    } catch (error) {
      if (error instanceof Error && error.message.endsWith('_cancelled')) {
        return
      }
      console.error('Monthly summary import flow encountered an error:', error)
    }
  }, [openProgressDialog, openResultDialog, openUploadDialog])

  return { openImportDialog }
}

export default useMonthlySummaryImport

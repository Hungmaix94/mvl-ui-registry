import { useCallback } from 'react'

import { useSalesRevenueImportUploadDialog } from './useSalesRevenueImportUploadDialog.tsx'
import { useSalesRevenueImportProgressDialog } from './useSalesRevenueImportProgressDialog.tsx'
import { useSalesRevenueImportResultDialog } from './useSalesRevenueImportResultDialog.tsx'

const useSalesRevenueImport = () => {
  const { openUploadDialog } = useSalesRevenueImportUploadDialog()
  const { openProgressDialog } = useSalesRevenueImportProgressDialog()
  const { openResultDialog } = useSalesRevenueImportResultDialog()

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

        console.error('Sales Revenue import flow encountered an error:', error)
      }
    },
    [openProgressDialog, openResultDialog, openUploadDialog]
  )

  return { openImportDialog }
}

export default useSalesRevenueImport

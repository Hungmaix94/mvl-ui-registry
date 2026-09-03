import { useCallback } from 'react'

import { useExport } from '@/hooks/useExport.tsx'

import { accountingExportService } from '../services/accounting-export-service'

/**
 * Wire an accounting list screen's "Xuất Excel" button to the shared async
 * export flow (progress dialog + status polling + download).
 *
 * @param exportPath  the BE export endpoint, e.g. `/api/accounting/receipt-vouchers/export/`
 * @param defaultFilename  fallback download filename
 *
 * Call `openExportDialog(currentFilters)` with the same query object the list
 * uses (minus pagination) so the file reflects the applied filters.
 */
export function useAccountingListExport(exportPath: string, defaultFilename: string) {
  const { openExportDialog: triggerExport, isExporting } = useExport<Record<string, unknown>>({
    exportFunction: (params) => accountingExportService.triggerExport(exportPath, params),
    defaultFilename,
  })

  const openExportDialog = useCallback(
    (queryParams: Record<string, unknown>) =>
      triggerExport({ async: true, delivery: 'link', ...queryParams }),
    [triggerExport]
  )

  return { openExportDialog, isExporting }
}

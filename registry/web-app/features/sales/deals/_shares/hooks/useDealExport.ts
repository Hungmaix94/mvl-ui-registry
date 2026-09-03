import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import { ExportDelivery } from '@/constants/api-schema-aliases'
import { getDealService } from '@/features/sales/deals/services/deal-service'

export type DealExportParams = Record<string, any>

export function useDealExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport<DealExportParams>({
    exportFunction: (params) => getDealService().exportDeals(params),
    defaultFilename: 'bc-chi-tiet-bang-hang.xlsx',
  })

  const openExportDialog = useCallback(
    async (queryParams: DealExportParams) => {
      // Bỏ pagination: file xuất chứa toàn bộ kết quả theo bộ lọc đang chọn.
      const { page, page_size, ordering, ...filters } = queryParams

      await baseOpenExportDialog({
        async: true,
        delivery: ExportDelivery.link,
        ...filters,
      })
    },
    [baseOpenExportDialog]
  )

  return { openExportDialog, isExporting }
}

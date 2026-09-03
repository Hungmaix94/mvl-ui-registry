import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import { useExportSalesRevenueReports } from '@/services'
import { format } from 'date-fns'

export interface SalesRevenueReportExportParams {
  fromDate?: Date
  toDate?: Date
  branchId?: number
  blockId?: number
  departmentId?: number
}

export function useSalesRevenueReportExport() {
  const exportMutation = useExportSalesRevenueReports()

  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport({
    exportFunction: async (params) => {
      const result = await exportMutation.mutateAsync(params)
      return result
    },
    defaultFilename: 'sales-revenue-reports.xlsx',
  })

  const openExportDialog = useCallback(
    async (filterParams: SalesRevenueReportExportParams) => {
      const exportParams: {
        async?: boolean
        delivery?: 'link' | 'direct'
        [key: string]: any
      } = {
        async: true,
        delivery: 'link',
      }

      // Map date range to from_month and to_month in MM/yyyy format
      if (filterParams?.fromDate) {
        exportParams.from_month = format(filterParams.fromDate, 'MM/yyyy')
      }

      if (filterParams?.toDate) {
        exportParams.to_month = format(filterParams.toDate, 'MM/yyyy')
      }

      // Map branch filter
      if (filterParams?.branchId) {
        exportParams.branch = filterParams.branchId
      }

      // Map block filter
      if (filterParams?.blockId) {
        exportParams.block = filterParams.blockId
      }

      // Map department filter
      if (filterParams?.departmentId) {
        exportParams.department = filterParams.departmentId
      }

      await baseOpenExportDialog(exportParams)
    },
    [baseOpenExportDialog]
  )

  return {
    openExportDialog,
    isExporting,
  }
}

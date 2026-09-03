import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import { useExportSalesRevenues } from '@/features/payroll/services/sales-revenue-service'
import { format } from 'date-fns'
import { MONTH_FORMAT } from '@/constants/date-format.ts'
import type { SalesRevenueFilterForm } from '../components/SalesRevenueFilterForm.tsx'

export function useSalesRevenueExport() {
  const exportMutation = useExportSalesRevenues()

  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport({
    exportFunction: async (params) => {
      const result = await exportMutation.mutateAsync(params)
      return result
    },
    defaultFilename: 'sales-revenues.xlsx',
  })

  const openExportDialog = useCallback(
    async (_searchQuery: string, filterParams: SalesRevenueFilterForm) => {
      const exportParams: {
        async?: boolean
        delivery?: 'link' | 'direct'
        fields?: string
        [key: string]: any
      } = {
        async: true,
        delivery: 'link',
      }

      // Map month filter
      if (filterParams?.month) {
        exportParams.month = format(filterParams.month, MONTH_FORMAT)
      }

      // Map branch filter
      if (filterParams?.branch_id) {
        exportParams.branch = filterParams.branch_id
      }

      // Map block filter
      if (filterParams?.block_id) {
        exportParams.block = filterParams.block_id
      }

      // Map department filter
      if (filterParams?.department_id) {
        exportParams.department = filterParams.department_id
      }

      // Map position filter
      if (filterParams?.position_id) {
        exportParams.position = filterParams.position_id
      }

      // Map status filter (single value)
      if (filterParams?.status) {
        exportParams.status = filterParams.status
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

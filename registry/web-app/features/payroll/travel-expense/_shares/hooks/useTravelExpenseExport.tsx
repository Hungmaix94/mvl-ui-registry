import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import { useExportTravelExpenses } from '@/features/payroll/services/travel-expense-service'
import { format } from 'date-fns'
import type { TravelExpenseFilterForm } from '../components/TravelExpenseFilterForm.tsx'

export function useTravelExpenseExport() {
  const exportMutation = useExportTravelExpenses()

  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport({
    exportFunction: async (params) => {
      const result = await exportMutation.mutateAsync(params)
      return result
    },
    defaultFilename: 'travel-expenses.xlsx',
  })

  const openExportDialog = useCallback(
    async (_searchQuery: string, filterParams: TravelExpenseFilterForm) => {
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
        exportParams.month = format(filterParams.month, 'MM/yyyy')
      }

      // Map employee filter
      if (filterParams?.employee) {
        exportParams.employee = Number(filterParams.employee)
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

      // Map expense_type filter (array)
      if (filterParams?.expense_type && filterParams.expense_type.length > 0) {
        if (filterParams.expense_type.length === 1) {
          exportParams.expense_type = filterParams.expense_type[0]
        } else {
          exportParams.expense_type__in = filterParams.expense_type
        }
      }

      // Map status filter (array)
      if (filterParams?.status && filterParams.status.length > 0) {
        if (filterParams.status.length === 1) {
          exportParams.status = filterParams.status[0]
        } else {
          exportParams.status__in = filterParams.status
        }
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

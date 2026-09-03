import { useCallback } from 'react'
import {
  useExportPayrollKPIAssessmentsDepartmentsSummary,
  type GetPayrollKPIAssessmentsDepartmentsSummaryExportParams,
} from '@/features/kpi/services/kpi-assessment-service'
import type { KPIUnitEvaluationFilterFormData } from '@/features/kpi/unit-evaluation/components/KPIUnitEvaluationFilterForm'
import { ExportDelivery } from '@/constants/api-schema-aliases'

export function useKPIPeriodSummaryExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } =
    useExportPayrollKPIAssessmentsDepartmentsSummary()

  const openExportDialog = useCallback(
    async (
      period: number | undefined,
      searchQuery: string,
      filterParams: KPIUnitEvaluationFilterFormData,
      ordering?: string
    ) => {
      const exportParams: GetPayrollKPIAssessmentsDepartmentsSummaryExportParams = {
        async: true,
        delivery: ExportDelivery.link,
      }

      // Period is required for export
      if (period) {
        exportParams.period = period
      }

      // Map search query
      if (searchQuery && searchQuery.trim() !== '') {
        exportParams.search = searchQuery.trim()
      }

      // Map organization filters
      if (filterParams?.branch_id) {
        exportParams.branch = filterParams.branch_id
      }
      if (filterParams?.block_id) {
        exportParams.block = filterParams.block_id
      }
      if (filterParams?.department_id) {
        exportParams.department = filterParams.department_id
      }

      // Map ordering if provided
      if (ordering) {
        exportParams.ordering = ordering
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

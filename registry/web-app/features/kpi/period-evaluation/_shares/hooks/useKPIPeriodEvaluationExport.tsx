import { useExportPayrollKPIAssessmentsEmployees } from '@/features/kpi/services/kpi-assessment-service'

export function useKPIPeriodEvaluationExport() {
  // useExport returns { openExportDialog, isExporting }
  const { openExportDialog, isExporting } = useExportPayrollKPIAssessmentsEmployees()

  return {
    openExportDialog,
    isExporting,
  }
}

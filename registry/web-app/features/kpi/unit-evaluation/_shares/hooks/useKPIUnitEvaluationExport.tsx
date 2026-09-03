import { useExportPayrollKPIAssessmentsDepartments } from '@/features/kpi/services/kpi-assessment-service'

export function useKPIUnitEvaluationExport() {
  // useExport returns { openExportDialog, isExporting }
  const { openExportDialog, isExporting } = useExportPayrollKPIAssessmentsDepartments()

  return {
    openExportDialog,
    isExporting,
  }
}

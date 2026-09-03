import { useExportPenaltyTickets } from '@/features/payroll/services/penalty-ticket-service'

export function usePenaltyTicketExport() {
  // useExport returns { openExportDialog, isExporting }
  const { openExportDialog, isExporting } = useExportPenaltyTickets()

  return {
    openExportDialog,
    isExporting,
  }
}

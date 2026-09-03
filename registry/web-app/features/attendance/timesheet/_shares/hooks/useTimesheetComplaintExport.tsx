import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import {
  getProposalMiscService,
  type GetProposalsTimesheetEntryComplaintExportParams,
} from '@/features/decision-and-proposal/services/proposal-misc-service'
import { ExportDelivery } from '@/constants/api-schema-aliases'

export function useTimesheetComplaintExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport<
    NonNullable<GetProposalsTimesheetEntryComplaintExportParams>
  >({
    exportFunction: (params) =>
      getProposalMiscService().exportProposalsTimesheetEntryComplaint(params),
    defaultFilename: 'timesheet-complaints.xlsx',
  })

  const openExportDialog = useCallback(
    async (searchQuery: string, filterParams: Record<string, any>) => {
      const exportParams: GetProposalsTimesheetEntryComplaintExportParams = {
        async: true,
        delivery: ExportDelivery.link,
      }

      // Map search query to search field (backend supports partial matching)
      if (searchQuery && searchQuery.trim() !== '') {
        // todo: update later when backend supports more specific fields
        // exportParams.created_by = searchQuery.trim()
      }

      // Map filter params - only include actual API params (schema: timesheet_entry_complaint_complaint_date__gte/_lte)
      if (filterParams?.timesheet_entry_complaint_complaint_date__gte?.trim()) {
        exportParams.timesheet_entry_complaint_complaint_date__gte =
          filterParams.timesheet_entry_complaint_complaint_date__gte.trim()
      }
      if (filterParams?.timesheet_entry_complaint_complaint_date__lte?.trim()) {
        exportParams.timesheet_entry_complaint_complaint_date__lte =
          filterParams.timesheet_entry_complaint_complaint_date__lte.trim()
      }
      if (filterParams?.branch) {
        exportParams.created_by_branch = filterParams.branch
      }
      if (filterParams?.block) {
        exportParams.created_by_block = filterParams.block
      }
      if (filterParams?.department) {
        exportParams.created_by_department = filterParams.department
      }
      if (filterParams?.proposal_status__in && filterParams.proposal_status__in.length > 0) {
        exportParams.proposal_status__in = filterParams.proposal_status__in
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

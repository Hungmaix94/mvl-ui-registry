import { useCallback } from 'react'
import { useExport } from '@/hooks/useExport.tsx'
import {
  getProposalMiscService,
  type GetProposalsOvertimeWorkExportParams,
  type GetProposalsOvertimeWorkParams,
} from '@/features/decision-and-proposal/services/proposal-misc-service'
import { formatDateToApi } from '@/utils/date-utils.ts'
import { ExportDelivery } from '@/constants/api-schema-aliases'

type ExportParams = NonNullable<GetProposalsOvertimeWorkExportParams>
type ProposalStatusArray = NonNullable<ExportParams['proposal_status__in']>
type VerifierStatus = NonNullable<ExportParams['verifiers__status']>
type VerifierStatusArray = VerifierStatus[]

type ProposalFilterParams = Partial<GetProposalsOvertimeWorkParams> & {
  date_range?: { from?: Date; to?: Date }
  status?: ProposalStatusArray
  verifier_status?: VerifierStatusArray
  branch_id?: number
  block_id?: number
  department_id?: number
  position_id?: number
  employee_id?: number
}

export function useProposalOvertimeWorkExport() {
  const { openExportDialog: baseOpenExportDialog, isExporting } = useExport<
    NonNullable<GetProposalsOvertimeWorkExportParams>
  >({
    exportFunction: (params) => getProposalMiscService().exportProposalsOvertimeWork(params),
    defaultFilename: 'proposals-overtime-work.xlsx',
  })

  const openExportDialog = useCallback(
    async (searchQuery: string, filterParams: ProposalFilterParams) => {
      const exportParams: GetProposalsOvertimeWorkExportParams = {
        async: true,
        delivery: ExportDelivery.link,
      }

      // Map date_range to proposal_date__gte and proposal_date__lte
      // Handle both UI field (date_range) and API fields (proposal_date__gte/proposal_date__lte)
      if (filterParams?.proposal_date__gte) {
        exportParams.proposal_date__gte = filterParams.proposal_date__gte
      } else if (filterParams?.date_range?.from) {
        exportParams.proposal_date__gte = formatDateToApi(filterParams.date_range.from)
      }
      if (filterParams?.proposal_date__lte) {
        exportParams.proposal_date__lte = filterParams.proposal_date__lte
      } else if (filterParams?.date_range?.to) {
        exportParams.proposal_date__lte = formatDateToApi(filterParams.date_range.to)
      }

      // Map overtime entry date range
      if (filterParams?.overtime_date_from) {
        exportParams.overtime_date_from = filterParams.overtime_date_from
      }
      if (filterParams?.overtime_date_to) {
        exportParams.overtime_date_to = filterParams.overtime_date_to
      }

      // Map organization filters
      if (filterParams?.branch_id) {
        exportParams.created_by_branch = filterParams.branch_id
      }
      if (filterParams?.block_id) {
        exportParams.created_by_block = filterParams.block_id
      }
      if (filterParams?.department_id) {
        exportParams.created_by_department = filterParams.department_id
      }
      if (filterParams?.position_id) {
        exportParams.created_by_position = filterParams.position_id
      }
      if (filterParams?.employee_id) {
        exportParams.created_by = filterParams.employee_id
      }
      if (searchQuery) {
        exportParams.search = searchQuery
      }

      // Map status
      const statuses = filterParams.status ?? []
      if (statuses.length === 1) {
        exportParams.proposal_status = statuses[0]
      } else if (statuses.length > 1) {
        exportParams.proposal_status__in = statuses
      }

      // Map verifier_status
      const verifierStatuses = filterParams.verifier_status ?? []
      if (verifierStatuses.length === 1) {
        exportParams.verifiers__status = verifierStatuses[0]
      } else if (verifierStatuses.length > 1) {
        exportParams.verifiers__status__in = verifierStatuses
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

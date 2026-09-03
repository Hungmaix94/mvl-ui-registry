import PageTitle from '@/components/ui/page-title/PageTitle'
import F2DebtReportTable from '@/features/report/accounting/f2-debt/F2DebtReportTable'
import { useF2DebtReport } from '@/features/accounting/reports/services/report-service'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'

export default function ReportF2DebtPage() {
  const { data, isLoading } = useF2DebtReport()
  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/reports/f2-debt/',
    'cong-no-f2.xlsx'
  )

  return (
    <div className="bg-neutral-2 flex h-full flex-col">
      <PageTitle
        title="Công nợ F2"
        handleExportBtnFull={() => openExportDialog({})}
        titleExportBtnIcon="Xuất Excel"
      />
      <div className="flex-1 p-6">
        <F2DebtReportTable data={data} isLoading={isLoading} />
      </div>
    </div>
  )
}

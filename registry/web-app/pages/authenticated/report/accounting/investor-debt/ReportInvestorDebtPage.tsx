import PageTitle from '@/components/ui/page-title/PageTitle'
import InvestorDebtReportTable from '@/features/report/accounting/investor-debt/InvestorDebtReportTable'
import { useDebtReport } from '@/features/accounting/reports/services/report-service'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'

export default function ReportInvestorDebtPage() {
  const { data, isLoading } = useDebtReport()
  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/reports/debt/',
    'cong-no-chu-dau-tu.xlsx'
  )

  return (
    <div className="bg-neutral-2 flex h-full flex-col">
      <PageTitle
        title="Công nợ CĐT"
        handleExportBtnFull={() => openExportDialog({})}
        titleExportBtnIcon="Xuất Excel"
      />
      <div className="flex-1 p-6">
        <InvestorDebtReportTable data={data} isLoading={isLoading} />
      </div>
    </div>
  )
}

import { PageTitle, Button } from '@/components/ui'
import { useNavigate } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { useState, useMemo } from 'react'
import { Table } from '@radix-ui/themes'
import { ChevronRight, Landmark, ArrowDownRight, RefreshCw } from 'lucide-react'
import { useProjects, useInvestors } from '@/services/realestate-service'
import { useInvestorAdvanceAccounts } from '@/features/accounting/investor-advances/services/investor-advance-service'
import { useAccountingListExport } from '@/features/accounting/_shares/hooks/useAccountingListExport'
import { formatCurrencyVND } from '@/utils/common'
import { TableActionMenu } from '@/components/ui/table/TableActionMenu'
import InvestorAdvanceDepositDialog from '@/features/accounting/investor-advances/components/InvestorAdvanceDepositDialog'
import InvestorAdvanceDrawdownDialog from '@/features/accounting/investor-advances/components/InvestorAdvanceDrawdownDialog'
import { useAbility } from '@/lib/ability'

/**
 * Danh sách quỹ tạm ứng CĐT.
 *
 * Sổ quỹ (ledger) KHÔNG còn ở đây: payload list của BE cố ý bỏ `ledger_entries` (trước đây nó
 * nhúng toàn bộ ledger của mọi tài khoản nên list phình theo tổng số biến động). Nút mũi tên ở
 * mỗi dòng giờ điều hướng sang màn chi tiết — nơi duy nhất còn trả sổ quỹ.
 */
export default function InvestorAdvanceListPage() {
  const ability = useAbility()
  const navigate = useNavigate()

  // Dialog visibility states
  const [depositAccount, setDepositAccount] = useState<any | null>(null)
  const [drawdownAccount, setDrawdownAccount] = useState<any | null>(null)

  // Fetch projects and investors for ID-to-name mapping
  const { data: projectsData } = useProjects({ page_size: 1000 })
  const { data: investorsData } = useInvestors({ page_size: 1000 })

  const projectMap = useMemo(() => {
    const map = new Map<number, string>()
    ;(projectsData?.results ?? []).forEach((p) => map.set(p.id, p.name || ''))
    return map
  }, [projectsData])

  const investorMap = useMemo(() => {
    const map = new Map<number, string>()
    ;(investorsData?.results ?? []).forEach((i) => map.set(i.id, i.name || ''))
    return map
  }, [investorsData])

  // Fetch advance accounts
  const {
    data: accountsData,
    isLoading,
    refetch,
  } = useInvestorAdvanceAccounts({
    page_size: 100,
  })

  const accounts = accountsData?.results ?? []

  const { openExportDialog } = useAccountingListExport(
    '/api/accounting/investor-advance-accounts/export/',
    'tam-ung-chu-dau-tu.xlsx'
  )
  const handleExport = () => openExportDialog({})

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title="Quỹ tạm ứng thưởng CĐT theo dự án"
        handleExportBtnFull={handleExport}
        titleExportBtnIcon="Xuất Excel"
        customActions={
          <Button
            type="button"
            variant="primary"
            onClick={() => navigate(APP_PATH.INVESTOR_ADVANCE_CREATE)}
          >
            Khởi tạo tài khoản
          </Button>
        }
      />

      <div className="flex flex-grow flex-col gap-4 overflow-y-auto px-7 pt-4 pb-6">
        {/* Metric Cards Summary */}
        <div className="mb-2 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="border-border-1 bg-background-1 flex items-center justify-between rounded-xl border p-5 shadow-sm">
            <div>
              <span className="text-content-dark-3 text-xs font-medium tracking-wider uppercase">
                Tổng tạm ứng nạp
              </span>
              <h3 className="text-content-dark-1 mt-1 text-2xl font-bold">
                {formatCurrencyVND(
                  accounts.reduce((sum, acc) => sum + Number(acc.deposited_total || 0), 0)
                )}{' '}
                đ
              </h3>
            </div>
            <div className="bg-background-5 text-data-blue-default flex h-10 w-10 items-center justify-center rounded-full">
              <Landmark size={20} />
            </div>
          </div>
          <div className="border-border-1 bg-background-1 flex items-center justify-between rounded-xl border p-5 shadow-sm">
            <div>
              <span className="text-content-dark-3 text-xs font-medium tracking-wider uppercase">
                Tổng đối trừ chi
              </span>
              <h3 className="text-content-dark-1 mt-1 text-2xl font-bold">
                {formatCurrencyVND(
                  accounts.reduce((sum, acc) => sum + Number(acc.drawn_total || 0), 0)
                )}{' '}
                đ
              </h3>
            </div>
            <div className="bg-background-8 text-data-orange-default flex h-10 w-10 items-center justify-center rounded-full">
              <ArrowDownRight size={20} />
            </div>
          </div>
          <div className="border-border-1 bg-background-1 flex items-center justify-between rounded-xl border p-5 shadow-sm">
            <div>
              <span className="text-content-dark-3 text-xs font-medium tracking-wider uppercase">
                Số dư khả dụng
              </span>
              <h3 className="text-data-green-default mt-1 text-2xl font-bold">
                {formatCurrencyVND(
                  accounts.reduce((sum, acc) => sum + Number(acc.balance || 0), 0)
                )}{' '}
                đ
              </h3>
            </div>
            <div className="bg-background-4 text-data-green-default flex h-10 w-10 items-center justify-center rounded-full">
              <RefreshCw size={20} />
            </div>
          </div>
        </div>

        {/* Main Accounts Table */}
        <div className="border-border-1 bg-background-1 flex flex-1 flex-col overflow-hidden rounded-xl border shadow-sm">
          <div className="flex-1 overflow-x-auto overflow-y-auto">
            <Table.Root className="w-full border-collapse" style={{ borderRadius: 0 }}>
              <Table.Header className="border-border-1 bg-background-2 border-b">
                <Table.Row>
                  <Table.ColumnHeaderCell className="w-[50px] text-center" />
                  <Table.ColumnHeaderCell className="text-content-dark-2 text-left font-semibold">
                    Chủ đầu tư
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="text-content-dark-2 text-left font-semibold">
                    Dự án
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="text-content-dark-2 pr-6 text-right font-semibold">
                    Tổng nạp
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="text-content-dark-2 pr-6 text-right font-semibold">
                    Tổng đối trừ
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="text-content-dark-2 pr-6 text-right font-semibold">
                    Số dư
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="text-content-dark-2 text-center font-semibold">
                    Thao tác
                  </Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {isLoading ? (
                  <Table.Row>
                    <Table.Cell
                      colSpan={7}
                      className="text-content-dark-3 py-12 text-center text-sm"
                    >
                      Đang tải danh sách tài khoản tạm ứng...
                    </Table.Cell>
                  </Table.Row>
                ) : accounts.length === 0 ? (
                  <Table.Row>
                    <Table.Cell
                      colSpan={7}
                      className="text-content-dark-3 py-12 text-center text-sm"
                    >
                      Chưa có tài khoản tạm ứng nào được khởi tạo.
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  accounts.map((acc) => {
                    const investorName = investorMap.get(acc.investor) || `CĐT #${acc.investor}`
                    const projectName = projectMap.get(acc.project) || `Dự án #${acc.project}`

                    return (
                      <Table.Row
                        key={acc.id}
                        className="border-border-1 hover:bg-background-2 border-b transition-colors last:border-b-0"
                      >
                        <Table.Cell className="text-center align-middle">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                APP_PATH.INVESTOR_ADVANCE_DETAIL.replace(':id', String(acc.id))
                              )
                            }
                            aria-label="Xem sổ quỹ của tài khoản"
                            title="Xem sổ quỹ"
                            className="text-content-dark-3 hover:text-content-dark-1 p-1"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </Table.Cell>
                        <Table.Cell className="text-content-dark-1 align-middle font-semibold">
                          {investorName}
                        </Table.Cell>
                        <Table.Cell className="text-content-dark-2 align-middle">
                          {projectName}
                        </Table.Cell>
                        <Table.Cell className="text-content-dark-1 pr-6 text-right align-middle font-medium">
                          {formatCurrencyVND(Number(acc.deposited_total || 0))} đ
                        </Table.Cell>
                        <Table.Cell className="text-content-dark-1 pr-6 text-right align-middle font-medium">
                          {formatCurrencyVND(Number(acc.drawn_total || 0))} đ
                        </Table.Cell>
                        <Table.Cell className="text-data-green-default pr-6 text-right align-middle font-bold">
                          {formatCurrencyVND(Number(acc.balance || 0))} đ
                        </Table.Cell>
                        <Table.Cell className="text-center align-middle">
                          <div className="flex items-center justify-center">
                            <TableActionMenu
                              row={acc}
                              actions={[
                                {
                                  // Dialog gọi `POST .../investor-advance-accounts/{id}/deposit/`
                                  label: 'Nạp quỹ',
                                  show: () => ability.can('deposit', 'investor_advance_account'),
                                  onClick: () =>
                                    setDepositAccount({ id: acc.id, investorName, projectName }),
                                },
                                {
                                  // Dialog gọi `POST .../investor-advance-accounts/{id}/drawdown/`
                                  // — endpoint riêng, mã riêng: nạp quỹ được không suy ra đối trừ được.
                                  label: 'Đối trừ',
                                  onClick: () =>
                                    setDrawdownAccount({
                                      id: acc.id,
                                      investorId: acc.investor,
                                      investorName,
                                      projectName,
                                      balance: Number(acc.balance || 0),
                                    }),
                                  show: () =>
                                    ability.can('drawdown', 'investor_advance_account') &&
                                    Number(acc.balance || 0) > 0,
                                },
                              ]}
                            />
                          </div>
                        </Table.Cell>
                      </Table.Row>
                    )
                  })
                )}
              </Table.Body>
            </Table.Root>
          </div>
        </div>
      </div>

      {/* Deposit advance ledger dialog */}
      {depositAccount && (
        <InvestorAdvanceDepositDialog
          open={!!depositAccount}
          onOpenChange={(open) => !open && setDepositAccount(null)}
          accountId={depositAccount.id}
          investorName={depositAccount.investorName}
          projectName={depositAccount.projectName}
          onSuccess={refetch}
        />
      )}

      {/* Drawdown advance ledger dialog */}
      {drawdownAccount && (
        <InvestorAdvanceDrawdownDialog
          open={!!drawdownAccount}
          onOpenChange={(open) => !open && setDrawdownAccount(null)}
          accountId={drawdownAccount.id}
          investorId={drawdownAccount.investorId}
          investorName={drawdownAccount.investorName}
          projectName={drawdownAccount.projectName}
          balance={drawdownAccount.balance}
          onSuccess={refetch}
        />
      )}
    </div>
  )
}

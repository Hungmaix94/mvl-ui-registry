import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Flex, Tabs } from '@radix-ui/themes'

import { PageTitle } from '@/components/ui'
import { formatCurrencyVND } from '@/utils/common'
import { cn } from '@/utils'
import { formatDate } from '@/utils/date-utils'
import { useInvestorAdvanceAccount } from '@/features/accounting/investor-advances/services/investor-advance-service'
import {
  formatLedgerAmount,
  getLedgerAmountTone,
} from '@/features/accounting/investor-advances/utils/investor-advance-ledger'
import InvestorAdvanceSummaryCards from '@/features/accounting/investor-advances/components/InvestorAdvanceSummaryCards'
import InvestorAdvanceApplicationsTab from '@/features/accounting/investor-advances/components/InvestorAdvanceApplicationsTab'

const LEDGER_LABEL: Record<string, string> = {
  DEPOSIT: 'Nạp quỹ',
  DRAWDOWN: 'Trích quỹ trả hoá đơn',
  REFUND: 'Hoàn quỹ',
  ADVANCE_PAY: 'Chi tạm ứng',
}

function vnd(value: string | number | null | undefined): string {
  return `${formatCurrencyVND(Number(value || 0), { maximumFractionDigits: 0 })} đ`
}

/**
 * Chi tiết một quỹ tạm ứng chủ đầu tư.
 *
 * Bốn con số (hai trục) + hai danh sách: "Chi tiền thực tế" là sổ quỹ — mọi đồng ra/vào thật;
 * "Deal đã cấn trừ" là các dòng đối chiếu đã khai tạm ứng, thứ chỉ động vào công nợ CĐT.
 * Sổ quỹ chỉ nhúng ở màn chi tiết này; màn danh sách không trả ledger.
 */
function InvestorAdvanceDetailPage() {
  const params = useParams<{ id: string }>()
  const accountId = Number(params.id || 0)
  const [tab, setTab] = useState('overview')
  const { data: account, isLoading } = useInvestorAdvanceAccount(accountId, {
    enabled: accountId > 0,
  })

  const ledgerEntries = useMemo(() => account?.ledger_entries ?? [], [account])
  const calculatedInvestorBalance = useMemo(() => {
    if (!account) return undefined
    const rawBalance = account.investor_balance as string | number | null | undefined
    if (rawBalance !== undefined && rawBalance !== null && Number(rawBalance) !== 0) {
      return rawBalance
    }
    return (Number(account.deposited_total || 0) - Number(account.applied_total || 0)).toString()
  }, [account])

  const unappliedDrawn = useMemo(() => {
    if (!account) return undefined
    return account.unapplied_drawn
  }, [account])

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle title="Chi tiết quỹ tạm ứng chủ đầu tư" />
      <div className="flex flex-grow flex-col gap-4 overflow-auto px-7 pt-4 pb-6">
        {isLoading || !account ? (
          <span className="typo-body-sm-regular text-content-dark-3">Đang tải…</span>
        ) : (
          <>
            <InvestorAdvanceSummaryCards
              depositedTotal={account.deposited_total}
              investorBalance={calculatedInvestorBalance}
              unappliedDrawn={unappliedDrawn}
              balance={account.balance}
            />

            <Tabs.Root value={tab} onValueChange={setTab}>
              <Tabs.List className="mb-4">
                <Tabs.Trigger value="overview">Chi tiền thực tế</Tabs.Trigger>
                <Tabs.Trigger value="applications">Deal đã cấn trừ</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="overview">
                {ledgerEntries.length === 0 ? (
                  <span className="typo-body-sm-regular text-content-dark-3">
                    Quỹ chưa có biến động nào.
                  </span>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] border-collapse">
                      <thead>
                        <tr className="border-border-1 border-b">
                          <th className="typo-body-xs-semibold text-content-dark-3 px-3 py-2 text-left whitespace-nowrap">
                            Ngày
                          </th>
                          <th className="typo-body-xs-semibold text-content-dark-3 px-3 py-2 text-left whitespace-nowrap">
                            Loại
                          </th>
                          <th className="typo-body-xs-semibold text-content-dark-3 px-3 py-2 text-right whitespace-nowrap">
                            Số tiền
                          </th>
                          <th className="typo-body-xs-semibold text-content-dark-3 px-3 py-2 text-right whitespace-nowrap">
                            Số dư sau
                          </th>
                          <th className="typo-body-xs-semibold text-content-dark-3 px-3 py-2 text-left whitespace-nowrap">
                            Ghi chú
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerEntries.map((entry) => (
                          <tr key={entry.id} className="border-border-1 border-b">
                            <td className="typo-body-sm-regular px-3 py-2 text-left whitespace-nowrap">
                              {formatDate(entry.created_at)}
                            </td>
                            <td className="typo-body-sm-regular px-3 py-2 text-left whitespace-nowrap">
                              {LEDGER_LABEL[entry.entry_type] ?? entry.entry_type}
                            </td>
                            <td
                              className={cn(
                                'typo-body-sm-semibold px-3 py-2 text-right whitespace-nowrap',
                                getLedgerAmountTone(entry.amount)
                              )}
                            >
                              {formatLedgerAmount(entry.amount)}
                            </td>
                            <td className="typo-body-sm-regular px-3 py-2 text-right whitespace-nowrap">
                              {vnd(entry.balance_after)}
                            </td>
                            <td className="typo-body-sm-regular px-3 py-2 text-left">
                              {entry.note || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </Tabs.Content>

              <Tabs.Content value="applications">
                <InvestorAdvanceApplicationsTab accountId={accountId} />
              </Tabs.Content>
            </Tabs.Root>

            <Flex />
          </>
        )}
      </div>
    </div>
  )
}

export default InvestorAdvanceDetailPage

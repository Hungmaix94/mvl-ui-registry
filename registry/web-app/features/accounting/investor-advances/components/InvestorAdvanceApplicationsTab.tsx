import { useMemo, useState } from 'react'
import { Flex } from '@radix-ui/themes'

import { formatDate } from '@/utils/date-utils'
import { formatCurrencyVND } from '@/utils/common'
import {
  INVESTOR_ADVANCE_APPLICATION_KIND,
  useInvestorAdvanceApplications,
  type InvestorAdvanceApplicationKind,
} from '@/features/accounting/investor-advances/services/investor-advance-service'
import { SimplePagination } from '@/components/ui/table/SimplePagination'
import { Button } from '@/components/ui'
import { cn } from '@/utils'

const KIND_LABEL: Record<InvestorAdvanceApplicationKind, string> = {
  [INVESTOR_ADVANCE_APPLICATION_KIND.RECON_OFFSET]: 'Khai ở đối chiếu',
  [INVESTOR_ADVANCE_APPLICATION_KIND.DIRECT_DRAWDOWN]: 'Trích quỹ trả hoá đơn',
}

const FILTERS: { value: '' | InvestorAdvanceApplicationKind; label: string }[] = [
  { value: '', label: 'Tất cả' },
  {
    value: INVESTOR_ADVANCE_APPLICATION_KIND.RECON_OFFSET,
    label: KIND_LABEL.RECON_OFFSET,
  },
  {
    value: INVESTOR_ADVANCE_APPLICATION_KIND.DIRECT_DRAWDOWN,
    label: KIND_LABEL.DIRECT_DRAWDOWN,
  },
]

const NO_VALUE = '—'

function vnd(value: string | number | null | undefined): string {
  return `${formatCurrencyVND(Number(value || 0), { maximumFractionDigits: 0 })} đ`
}

export interface InvestorAdvanceApplicationsTabProps {
  accountId: number
}

/**
 * Tab "Deal đã cấn trừ" — danh sách phiếu thu đã tiêu quỹ của một tài khoản tạm ứng CĐT.
 *
 * Trả lời câu hỏi vận hành "khoản trích này đối trừ vào phiếu thu / hoá đơn / căn nào".
 * Dòng đã đảo (huỷ phiếu thu) vẫn hiện, gạch mờ, để giữ dấu vết thay vì biến mất.
 */
function InvestorAdvanceApplicationsTab({ accountId }: InvestorAdvanceApplicationsTabProps) {
  const [kind, setKind] = useState<'' | InvestorAdvanceApplicationKind>('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const { data, isLoading } = useInvestorAdvanceApplications(
    accountId,
    {
      ...(kind ? { kind } : {}),
      page,
      page_size: pageSize,
    },
    { enabled: accountId > 0 }
  )
  const rows = data?.results ?? []
  const totalCount = data?.count ?? 0

  const totalAmount = useMemo(() => {
    return rows
      .filter((row) => !row.reversed_at)
      .reduce((sum, row) => sum + Number(row.amount || 0), 0)
  }, [rows])

  return (
    <Flex direction="column" gap="3">
      <Flex gap="2" wrap="wrap">
        {FILTERS.map((option) => (
          <Button
            key={option.value || 'all'}
            variant={kind === option.value ? 'primary' : 'secondary'}
            size="small"
            className="rounded-full"
            onClick={() => {
              setKind(option.value)
              setPage(1)
            }}
          >
            {option.label}
          </Button>
        ))}
      </Flex>

      {isLoading ? (
        <span className="typo-body-sm-regular text-content-dark-3">Đang tải…</span>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr className="border-border-1 border-b">
                  <th className="typo-body-xs-semibold text-content-dark-3 px-3 py-2 text-left whitespace-nowrap">
                    Phiếu thu
                  </th>
                  <th className="typo-body-xs-semibold text-content-dark-3 px-3 py-2 text-right whitespace-nowrap">
                    Ngày thu
                  </th>
                  <th className="typo-body-xs-semibold text-content-dark-3 px-3 py-2 text-left whitespace-nowrap">
                    Hoá đơn
                  </th>
                  <th className="typo-body-xs-semibold text-content-dark-3 px-3 py-2 text-left whitespace-nowrap">
                    Căn
                  </th>
                  <th className="typo-body-xs-semibold text-content-dark-3 px-3 py-2 text-left whitespace-nowrap">
                    Loại
                  </th>
                  <th className="typo-body-xs-semibold text-content-dark-3 px-3 py-2 text-left whitespace-nowrap">
                    Mã đối soát
                  </th>
                  <th className="typo-body-xs-semibold text-content-dark-3 px-3 py-2 text-right whitespace-nowrap">
                    Số tiền
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="typo-body-sm-regular text-content-dark-3 py-8 text-center"
                    >
                      Chưa có phiếu thu nào đối trừ vào quỹ này.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-border-1 border-b',
                        row.reversed_at && 'text-content-dark-3 line-through'
                      )}
                    >
                      <td className="typo-body-sm-medium px-3 py-2 text-left whitespace-nowrap">
                        {row.receipt_voucher_code || NO_VALUE}
                      </td>
                      <td className="typo-body-sm-regular px-3 py-2 text-right whitespace-nowrap">
                        {formatDate(row.receipt_date)}
                      </td>
                      <td className="typo-body-sm-regular px-3 py-2 text-left whitespace-nowrap">
                        {row.sales_invoice_code || NO_VALUE}
                      </td>
                      <td className="typo-body-sm-regular px-3 py-2 text-left whitespace-nowrap">
                        {row.deal_code || NO_VALUE}
                      </td>
                      <td className="typo-body-sm-regular px-3 py-2 text-left whitespace-nowrap">
                        {KIND_LABEL[row.kind] ?? row.kind}
                      </td>
                      <td className="typo-body-sm-regular px-3 py-2 text-left whitespace-nowrap">
                        {row.investor_reconciliation_code || NO_VALUE}
                      </td>
                      <td className="typo-body-sm-semibold px-3 py-2 text-right whitespace-nowrap">
                        {vnd(row.amount)}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="bg-background-2 border-border-1 border-t-2 font-semibold">
                  <td className="typo-body-sm-semibold px-3 py-2 text-left whitespace-nowrap">
                    Tổng trang này
                  </td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2"></td>
                  <td className="px-3 py-2"></td>
                  <td className="typo-body-sm-semibold px-3 py-2 text-right whitespace-nowrap">
                    {vnd(totalAmount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          {rows.length > 0 && (
            <SimplePagination
              currentPage={page}
              pageSize={pageSize}
              totalRecords={totalCount}
              onPageChange={setPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize)
                setPage(1)
              }}
              position="static"
            />
          )}
        </div>
      )}
    </Flex>
  )
}

export default InvestorAdvanceApplicationsTab

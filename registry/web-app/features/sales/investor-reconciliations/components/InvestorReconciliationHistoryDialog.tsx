import { Table } from '@radix-ui/themes'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FullScreenLoading } from '@/components/ui'
import { useProductInventoryInvestorReconciliationHistory } from '@/services/realestate-service'
import { formatCurrencyVND, formatPercent } from '@/utils/common'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import type { components } from '@/api/schema'
import InvestorReconciliationStatusBadge from '@/features/sales/_shared/reconciliation/InvestorReconciliationStatusBadge'

// NOTE — BACKEND PENDING: the V5/V6 per-period fields (period_type, progress_from/to_pct,
// retroactive_adjustment_amount, payout_ratio_snapshot, prior_received_total) are NOT exposed on the
// InvestorReconciliationHistory serializer yet, so they cannot be shown here. Once BE adds them,
// extend the columns below. For now we surface status + total-with-VAT, which the serializer does
// carry, to give the history more V5/V6 context without fabricating data.

type InvestorHistoryRow = components['schemas']['InvestorReconciliationHistory']

function toNum(v: string | number | undefined | null): number {
  if (v === undefined || v === null || v === '') return 0
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

type Props = {
  open: boolean
  productInventoryId: number
  inventoryCode?: string
  onClose: () => void
  productTitle?: string
}

const InvestorReconciliationHistoryDialog = ({
  productTitle,
  open,
  productInventoryId,
  onClose,
}: Props) => {
  const { keysMap } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.INVESTOR_RECONCILIATION.RECONCILIATION_TYPE_CHOICES],
  })
  const reconciliationTypeLabels = keysMap.get(
    APP_CONSTANT_KEY.SALES.INVESTOR_RECONCILIATION.RECONCILIATION_TYPE_CHOICES
  ) as Record<string, string> | undefined

  const { data, isLoading } = useProductInventoryInvestorReconciliationHistory(productInventoryId)

  const d = data as unknown as
    | InvestorHistoryRow[]
    | { results?: InvestorHistoryRow[] }
    | null
    | undefined
  const rows: InvestorHistoryRow[] = Array.isArray(d) ? d : (d?.results ?? [])

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose()
      }}
    >
      <DialogContent className="max-w-5xl">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Lịch sử đối chiếu {productTitle}</DialogTitle>
        </DialogHeader>

        <div className="px-6 pb-6">
          {isLoading ? (
            <FullScreenLoading className="h-[unset] min-h-[unset] flex-1 py-8" />
          ) : rows.length === 0 ? (
            <p className="typo-body-base-regular text-content-dark-3 py-6 text-center">
              Không có lịch sử đối chiếu.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table.Root>
                <Table.Header className="bg-background-2 [&_th]:!text-center [&_th]:!align-middle">
                  <Table.Row>
                    <Table.ColumnHeaderCell className="px-3 py-2">TT</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell className="px-3 py-2">
                      Mã đối chiếu
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell className="px-3 py-2">Loại ĐC</Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell className="px-3 py-2">
                      Giá tạm tính MG
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell className="px-3 py-2">
                      Phí ĐL (%)
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell className="px-3 py-2">
                      Phí ĐL (Tiền)
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell className="px-3 py-2">
                      Thanh toán kỳ này
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell className="px-3 py-2">
                      Tổng (gồm VAT)
                    </Table.ColumnHeaderCell>
                    <Table.ColumnHeaderCell className="px-3 py-2">
                      Trạng thái
                    </Table.ColumnHeaderCell>
                  </Table.Row>
                </Table.Header>
                <Table.Body>
                  {rows.map((row, idx) => {
                    const typeLabel = row.reconciliation_type
                      ? (reconciliationTypeLabels?.[row.reconciliation_type] ??
                        row.reconciliation_type)
                      : '-'
                    const commissionAmt =
                      row.amt_agency_fee != null
                        ? toNum(row.amt_agency_fee)
                        : (toNum(row.fee_calculation_price) * toNum(row.pct_agency_fee)) / 100
                    return (
                      <Table.Row key={row.id} className="border-border-1 border-b last:border-b-0">
                        <Table.Cell className="px-3 py-2 text-center">{idx + 1}</Table.Cell>
                        <Table.Cell className="px-3 py-2">{row.code}</Table.Cell>
                        <Table.Cell className="px-3 py-2">{typeLabel}</Table.Cell>
                        <Table.Cell className="px-3 py-2 text-right">
                          {formatCurrencyVND(toNum(row.fee_calculation_price), {
                            maximumFractionDigits: 0,
                          })}
                        </Table.Cell>
                        <Table.Cell className="px-3 py-2 text-right">
                          {row.pct_agency_fee != null ? formatPercent(row.pct_agency_fee) : '-'}
                        </Table.Cell>
                        <Table.Cell className="px-3 py-2 text-right">
                          {formatCurrencyVND(commissionAmt, { maximumFractionDigits: 0 })}
                        </Table.Cell>
                        <Table.Cell className="px-3 py-2 text-right">
                          {formatCurrencyVND(toNum(row.total_amount), {
                            maximumFractionDigits: 0,
                          })}
                        </Table.Cell>
                        <Table.Cell className="px-3 py-2 text-right">
                          {formatCurrencyVND(toNum(row.total_amount_with_vat), {
                            maximumFractionDigits: 0,
                          })}
                        </Table.Cell>
                        <Table.Cell className="px-3 py-2 text-center">
                          {row.status ? (
                            <InvestorReconciliationStatusBadge status={row.status} />
                          ) : (
                            '-'
                          )}
                        </Table.Cell>
                      </Table.Row>
                    )
                  })}
                </Table.Body>
              </Table.Root>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default InvestorReconciliationHistoryDialog

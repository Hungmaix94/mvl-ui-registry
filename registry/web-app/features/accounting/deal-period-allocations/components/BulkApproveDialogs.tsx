// Dialogs for the bulk-approve ("Duyệt chi hàng loạt") flow on the deal-period-allocations screen.
// - Confirm dialog: lists the selected PBTVs the user is about to approve.
// - Result dialog: shown on partial success — failed list on top, approved list below, with reasons.
import AppDialog from '@/components/dialog/AppDialog'
import { formatCurrencyVND } from '@/utils/common'
import { cn } from '@/utils'
import { IconCheckcircle, IconProhibit } from '@/assets/icons'

/** Display info for a selected worksheet (cross-page selection source of truth lives in the page). */
export type BulkApproveSelectedItem = {
  id: number
  worksheet_code: string
  deal_code: string
  investor_name: string
  total: string
}

/** A PBTV row from the bulk-approve response, enriched with display codes from selectedMeta. */
export type BulkApproveResolvedRow = {
  id: number
  code: string
  dealCode: string
  total: string
}

export type BulkApproveSkippedRow = BulkApproveResolvedRow & {
  reason: string
}

export type BulkApproveResult = {
  approvedRows: BulkApproveResolvedRow[]
  skippedRows: BulkApproveSkippedRow[]
}

type ConfirmProps = {
  open: boolean
  items: BulkApproveSelectedItem[]
  loading?: boolean
  onConfirm: () => void | Promise<void>
  onClose: () => void
}

export function BulkApproveConfirmDialog({
  open,
  items,
  loading,
  onConfirm,
  onClose,
}: ConfirmProps) {
  return (
    <AppDialog
      variant="custom"
      size="2xl"
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
      title="Duyệt chi hàng loạt"
      titleDescription={`Bạn sắp duyệt chi ${items.length} giao dịch sau. Hành động này không thể hoàn tác.`}
      isHideCancelButton={false}
      cancelText="Huỷ"
      confirmText="Xác nhận duyệt"
      loading={loading}
      disableConfirm={items.length === 0}
      onConfirm={onConfirm}
      onCancel={onClose}
      content={
        <div className="border-border-1 max-h-[55vh] overflow-y-auto rounded-lg border">
          <table className="w-full border-collapse text-sm">
            <thead className="bg-background-2 text-content-dark-2 sticky top-0">
              <tr className="border-border-1 border-b text-left">
                <th className="px-3 py-2 font-medium">Mã phân bổ</th>
                <th className="px-3 py-2 font-medium">Mã deal</th>
                <th className="px-3 py-2 font-medium">Chủ đầu tư / Nguồn hàng</th>
                <th className="px-3 py-2 text-right font-medium">Tổng phí + thưởng</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-border-1 border-b last:border-0">
                  <td className="text-brand-primary-default px-3 py-2 font-medium">
                    {it.worksheet_code}
                  </td>
                  <td className="px-3 py-2">{it.deal_code}</td>
                  <td className="text-content-dark-1 px-3 py-2">{it.investor_name || '—'}</td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrencyVND(Number(it.total || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      }
    />
  )
}

type ResultProps = {
  result: BulkApproveResult | null
  onClose: () => void
}

function StatCard({
  tone,
  count,
  label,
}: {
  tone: 'success' | 'fail'
  count: number
  label: string
}) {
  const isFail = tone === 'fail'
  return (
    <div
      className={cn(
        'flex items-center gap-3.5 rounded-xl px-4 py-3.5',
        isFail ? 'bg-data-red-disabled' : 'bg-data-green-disabled'
      )}
    >
      <span
        className={cn(
          'bg-content-light-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full shadow-sm',
          isFail ? 'text-data-red-default' : 'text-data-green-default'
        )}
      >
        {isFail ? <IconProhibit size={24} /> : <IconCheckcircle size={24} />}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            'text-2xl leading-none font-bold',
            isFail ? 'text-data-red-default' : 'text-data-green-default'
          )}
        >
          {count}
        </p>
        <p className="text-content-dark-2 mt-1.5 text-xs font-medium">{label}</p>
      </div>
    </div>
  )
}

export function BulkApproveResultDialog({ result, onClose }: ResultProps) {
  const approvedRows = result?.approvedRows ?? []
  const skippedRows = result?.skippedRows ?? []
  return (
    <AppDialog
      variant="custom"
      size="2xl"
      open={!!result}
      onOpenChange={(o) => {
        if (!o) onClose()
      }}
      title="Kết quả duyệt chi hàng loạt"
      isHideCancelButton={true}
      confirmText="Đóng"
      onConfirm={onClose}
      onCancel={onClose}
      content={
        <div className="space-y-5">
          {/* Summary — fail first to match the list order below */}
          <div className="grid grid-cols-2 gap-3">
            <StatCard tone="fail" count={skippedRows.length} label="Không duyệt được" />
            <StatCard tone="success" count={approvedRows.length} label="Duyệt thành công" />
          </div>

          {/* Failed list (on top) */}
          {skippedRows.length > 0 && (
            <section>
              <p className="text-data-red-default mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <IconProhibit size={16} />
                Giao dịch không duyệt được ({skippedRows.length})
              </p>
              <div className="border-border-1 max-h-[32vh] overflow-y-auto rounded-lg border">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-background-2 text-content-dark-2 sticky top-0">
                    <tr className="border-border-1 border-b text-left">
                      <th className="px-4 py-2.5 font-medium">Mã phân bổ</th>
                      <th className="px-4 py-2.5 font-medium">Mã deal</th>
                      <th className="px-4 py-2.5 font-medium">Lý do</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skippedRows.map((r) => (
                      <tr key={r.id} className="border-border-1 border-b align-top last:border-0">
                        <td className="text-content-dark-1 px-4 py-2.5 font-semibold whitespace-nowrap">
                          {r.code}
                        </td>
                        <td className="text-content-dark-2 px-4 py-2.5 whitespace-nowrap">
                          {r.dealCode || '—'}
                        </td>
                        <td className="text-data-red-default px-4 py-2.5">{r.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Approved list (below) */}
          {approvedRows.length > 0 && (
            <section>
              <p className="text-data-green-default mb-2 flex items-center gap-1.5 text-sm font-semibold">
                <IconCheckcircle size={16} />
                Giao dịch đã duyệt ({approvedRows.length})
              </p>
              <div className="border-border-1 max-h-[32vh] overflow-y-auto rounded-lg border">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-background-2 text-content-dark-2 sticky top-0">
                    <tr className="border-border-1 border-b text-left">
                      <th className="px-4 py-2.5 font-medium">Mã phân bổ</th>
                      <th className="px-4 py-2.5 font-medium">Mã deal</th>
                      <th className="px-4 py-2.5 text-right font-medium">Tổng phí + thưởng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvedRows.map((r) => (
                      <tr key={r.id} className="border-border-1 border-b last:border-0">
                        <td className="text-content-dark-1 px-4 py-2.5 font-semibold whitespace-nowrap">
                          {r.code}
                        </td>
                        <td className="text-content-dark-2 px-4 py-2.5 whitespace-nowrap">
                          {r.dealCode || '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {formatCurrencyVND(Number(r.total || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      }
    />
  )
}

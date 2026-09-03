import { Link, generatePath } from 'react-router-dom'
import { IconWarning } from '@/assets/icons'
import { APP_PATH } from '@/routes/AppRoute.constant'
import F2ReconciliationStatusBadge from '@/features/sales/f2-reconciliations/components/F2ReconciliationStatusBadge'
import type { DirectorDealPendingF2 } from '@/features/accounting/linked-exchange-monthly-commissions/services/linked-exchange-monthly-commission-service'

type Props = {
  /** Advisory rows from the statement (`director_deals_pending_f2`), already scoped by the caller. */
  deals: DirectorDealPendingF2[]
  /**
   * Resolve a director id to a display name — the advisory only carries the id. Pass on the
   * period screen (several directors in one notice); a pool screen already names its
   * director in the page title, so it can omit this.
   */
  directorName?: (id: number) => string | null
}

/**
 * "Why is a transaction missing?" — the pending-F2 advisory, rendered.
 *
 * A director-sourced deal whose cash was collected this period but whose F2 reconciliation
 * is still DRAFT is deliberately excluded from SLK revenue (only CONFIRMED F2 rows count).
 * Without this notice the exclusion is invisible: the pool simply shows fewer transactions
 * than the accountant expects, with nothing on screen explaining it.
 */
export const SlkPendingF2Notice = ({ deals, directorName }: Props) => {
  if (deals.length === 0) return null

  return (
    <div className="border-data-orange-default bg-data-orange-light text-content-dark-1 rounded-lg border px-5 py-4">
      <div className="flex items-start gap-3">
        <IconWarning className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="flex flex-1 flex-col gap-2">
          <div className="text-sm">
            <span className="font-semibold">
              {deals.length} giao dịch chưa được tính vào doanh thu kỳ này.
            </span>{' '}
            Các giao dịch dưới đây đã có phiếu thu trong kỳ nhưng đối chiếu F2 chưa chốt, nên chưa
            sinh doanh thu SLK. Chốt đối chiếu F2 rồi bấm “Tính doanh thu kỳ này” để cập nhật.
          </div>
          <ul className="flex flex-col gap-1.5">
            {deals.map((deal) => {
              // Advisory name first; the resolver is only the fallback for a response
              // predating the backend that carries director_name.
              const name =
                deal.director_name ??
                (deal.director_id != null ? directorName?.(deal.director_id) : null)
              // Straight to the reconciliation when the sheet id is known. NEVER build this
              // link from f2_reconciliation_id: the route keys on the F2 SHEET id (see
              // DealReconciliationTab), so a row id 404s. Without the sheet, fall back to the
              // deal — its "Đối chiếu" tab lists the row with a correct link.
              const target =
                deal.f2_sheet_id != null
                  ? generatePath(APP_PATH.F2_RECONCILIATION_DETAIL, {
                      id: String(deal.f2_sheet_id),
                    })
                  : generatePath(APP_PATH.DEAL_DETAIL, { id: String(deal.deal_id) })
              return (
                <li
                  key={deal.f2_reconciliation_id}
                  className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs"
                >
                  <Link
                    to={target}
                    className="text-action-primary-red-default font-semibold underline"
                  >
                    {deal.deal_code || `Giao dịch #${deal.deal_id}`}
                  </Link>
                  <span className="text-content-dark-2">{deal.exchange_name || '—'}</span>
                  {name ? <span className="text-content-dark-3">· Nguồn GĐKD: {name}</span> : null}
                  <F2ReconciliationStatusBadge status={deal.f2_status} />
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}

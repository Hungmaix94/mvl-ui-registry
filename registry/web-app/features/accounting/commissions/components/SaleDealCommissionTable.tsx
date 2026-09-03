import { Fragment } from 'react'
import { IconReceipt } from '@/assets/icons'
import { formatCurrencyVND, formatNumber } from '@/utils/common'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import {
  buildDealCommissionSources,
  sumDealItemsByPctType,
  sumDealSubtotals,
  sumItemsByPctType,
  sumStaffIncentive,
  sumDealRecognisedTotal,
  getDealRecognisedTotal,
  getDealAggregateCommissionPct,
  getDealStaffIncentive,
  getDealPaymentProgressPct,
  getDealDialFeeProgressPct,
  type DealPayableGroup,
  type DealCommissionSource,
} from '../utils/summary-breakdown'
import DealProgressPctCell from './DealProgressPctCell'
import {
  DEAL_COLUMN_LABELS,
  DealCodeCell,
  DealProjectCell,
  DealReceiptDates,
  DealSourceBadge,
  DealSourceCell,
  formatPartialProxyPct,
  useExpandedDeals,
} from './DealTableCells'

const PCT = APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES

/** Số cột của bảng — dùng cho ô "không có deal nào" trải hết chiều ngang. */
const COLUMN_COUNT = 13

type Props = {
  deals: DealPayableGroup[]
  canViewSplitSheet: boolean
}

const formatPct4 = (pct: number | null): string =>
  pct != null && pct > 0
    ? `${formatNumber(pct, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}%`
    : '—'

const formatMoneyOrDash = (value: number | null): string =>
  value === null ? '—' : formatCurrencyVND(value)

/**
 * Bảng "Các deal đã chốt và gộp vào HH kỳ này" (Mục ① — màn 20.14 HH Sale theo tháng).
 *
 * Một deal group của BE được key theo `deal_id` (`_append_to_deal_group`), nên người đứng ra
 * nhận hộ N sale trên CÙNG một căn gom thành MỘT dòng. Bảng này tách dòng đó ra theo NGƯỜI
 * ĐỨNG TÊN GỐC (`buildDealCommissionSources`):
 *
 * - 1 nguồn (chính chủ, hoặc nhận hộ đúng một người) → một dòng phẳng, không caret;
 * - ≥2 nguồn → dòng deal là TỔNG, bung ra các dòng con mỗi người một dòng.
 *
 * Mọi số ở dòng deal đều CỘNG qua các nguồn. Bản cũ dùng `deal.items.find(pct_type)` nên cột
 * "HH bán hàng" chỉ in item đầu (19.173.982) trong khi "HH ghi nhận" đọc `subtotal` đã cộng
 * đủ (48.208.869) — đo trên summary 42 kỳ 08/2026.
 *
 * Ba cột đầu (mã deal · dự án · đứng tên) dùng ô chung với hai màn CTV và F2 — xem
 * `DealTableCells.tsx`.
 */
const SaleDealCommissionTable = ({ deals, canViewSplitSheet }: Props) => {
  const { isExpanded, toggleDeal } = useExpandedDeals()

  const totalFeePrice = deals.reduce(
    (acc, deal) => acc + Number(deal.fee_calculation_price || 0),
    0
  )
  const totalRecognised = sumDealRecognisedTotal(deals)
  const totalActual = sumDealSubtotals(deals)

  return (
    <div className="overflow-x-auto">
      {/* `min-w-max`: nhiều cột không lọt khung thì để bảng tràn ra và CUỘN NGANG, đừng để
          trình duyệt bóp các cột chữ và ngắt giữa tên người (bảng kê 45). */}
      <table className="w-full min-w-max border-collapse text-left">
        <thead>
          <tr className="border-border-1 bg-neutral-20 border-b text-[11px] tracking-wider text-neutral-500 uppercase">
            <th className="px-6 py-3 font-medium whitespace-nowrap">{DEAL_COLUMN_LABELS.code}</th>
            <th className="px-6 py-3 font-medium whitespace-nowrap">
              {DEAL_COLUMN_LABELS.project}
            </th>
            <th className="px-6 py-3 font-medium whitespace-nowrap">{DEAL_COLUMN_LABELS.source}</th>
            <th className="px-6 py-3 text-right font-medium whitespace-nowrap">Giá tính phí</th>
            <th className="px-6 py-3 text-right font-medium whitespace-nowrap">% HH</th>
            <th className="px-6 py-3 text-right font-medium whitespace-nowrap">HH bán hàng</th>
            <th className="px-6 py-3 text-right font-medium whitespace-nowrap">Thưởng nóng</th>
            <th className="px-6 py-3 text-right font-medium whitespace-nowrap">Thưởng</th>
            <th className="px-6 py-3 text-right font-medium whitespace-nowrap">Thưởng MV</th>
            <th className="px-6 py-3 text-right font-medium whitespace-nowrap">HH ghi nhận</th>
            <th className="px-6 py-3 text-right font-medium whitespace-nowrap">
              % tiền về (đã thu)
            </th>
            <th className="px-6 py-3 text-right font-medium whitespace-nowrap">
              % tiền về (ghi nhận)
            </th>
            <th className="px-6 py-3 text-right font-medium whitespace-nowrap">HH thực tế</th>
          </tr>
        </thead>
        <tbody className="divide-border-1 divide-y bg-white">
          {deals.length === 0 ? (
            <tr>
              <td colSpan={COLUMN_COUNT} className="px-6 py-12 text-center">
                <div className="flex flex-col items-center justify-center gap-2 text-neutral-500">
                  <IconReceipt className="h-8 w-8 text-neutral-300" />
                  <span className="text-[13px]">Không có deal nào được ghi nhận trong kỳ này</span>
                </div>
              </td>
            </tr>
          ) : (
            deals.map((deal) => {
              const sources = buildDealCommissionSources(deal)
              const expanded = isExpanded(deal.deal_id)

              return (
                <Fragment key={deal.deal_id}>
                  <tr className="text-[13px] hover:bg-neutral-50/50">
                    <td className="px-6 py-3.5 align-top">
                      <DealCodeCell deal={deal} canViewSplitSheet={canViewSplitSheet} />
                    </td>
                    <td className="px-6 py-3.5 align-top">
                      <DealProjectCell deal={deal} />
                    </td>
                    <td className="px-6 py-3.5 align-top">
                      <DealSourceCell
                        sources={sources}
                        isExpanded={expanded}
                        onToggle={() => toggleDeal(deal.deal_id)}
                        dealLabel={String(deal.deal_code || deal.deal_id)}
                      />
                    </td>
                    <td className="px-6 py-3.5 text-right align-top font-normal text-neutral-600">
                      {formatCurrencyVND(Number(deal.fee_calculation_price))}
                    </td>
                    <td className="px-6 py-3.5 text-right align-top font-normal text-neutral-600">
                      {formatPct4(getDealAggregateCommissionPct(deal))}
                    </td>
                    <td className="px-6 py-3.5 text-right align-top font-normal text-neutral-600">
                      {formatCurrencyVND(sumDealItemsByPctType(deal, PCT.F1_SALE.pct))}
                    </td>
                    <td className="px-6 py-3.5 text-right align-top font-normal text-neutral-600">
                      {formatCurrencyVND(sumDealItemsByPctType(deal, PCT.F1_BONUS.pct))}
                    </td>
                    <td className="px-6 py-3.5 text-right align-top font-normal text-neutral-600">
                      {formatCurrencyVND(sumDealItemsByPctType(deal, PCT.F1_INVESTOR_BONUS.pct))}
                    </td>
                    <td className="px-6 py-3.5 text-right align-top font-normal text-neutral-600">
                      {formatCurrencyVND(getDealStaffIncentive(deal))}
                    </td>
                    <td className="px-6 py-3.5 text-right align-top font-normal text-neutral-600">
                      {formatMoneyOrDash(getDealRecognisedTotal(deal))}
                    </td>
                    <td className="px-6 py-3.5 text-right align-top">
                      <DealProgressPctCell pct={getDealPaymentProgressPct(deal)} />
                      <DealReceiptDates dates={deal.receipt_dates} />
                    </td>
                    <td className="px-6 py-3.5 text-right align-top">
                      <DealProgressPctCell
                        pct={getDealDialFeeProgressPct(deal)}
                        barClassName="bg-violet-500"
                      />
                    </td>
                    <td className="text-data-green-default px-6 py-3.5 text-right align-top font-semibold">
                      {formatCurrencyVND(Number(deal.subtotal))}
                    </td>
                  </tr>

                  {sources.length > 1 &&
                    expanded &&
                    sources.map((source) => (
                      <tr
                        key={`${deal.deal_id}-${source.key}`}
                        className="bg-neutral-20/40 text-[12px]"
                      >
                        <td className="px-6 py-2.5" />
                        <td className="px-6 py-2.5" />
                        <td className="px-6 py-2.5 pl-11">
                          <DealSourceBadge source={source} />
                        </td>
                        <td className="px-6 py-2.5" />
                        <td className="px-6 py-2.5 text-right text-neutral-600">
                          {formatPct4(source.effectivePct)}
                          {formatPartialProxyPct(source.proxyPct) && (
                            <div className="text-[10px] text-neutral-400">
                              × {formatPartialProxyPct(source.proxyPct)} ={' '}
                              {formatPct4(source.contributedPct)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-2.5 text-right text-neutral-600">
                          {formatCurrencyVND(sumSourceByPctType(source, PCT.F1_SALE.pct))}
                        </td>
                        <td className="px-6 py-2.5 text-right text-neutral-600">
                          {formatCurrencyVND(sumSourceByPctType(source, PCT.F1_BONUS.pct))}
                        </td>
                        <td className="px-6 py-2.5 text-right text-neutral-600">
                          {formatCurrencyVND(sumSourceByPctType(source, PCT.F1_INVESTOR_BONUS.pct))}
                        </td>
                        <td className="px-6 py-2.5 text-right text-neutral-600">
                          {formatCurrencyVND(getDealStaffIncentive({ items: source.items }))}
                        </td>
                        <td className="px-6 py-2.5 text-right text-neutral-600">
                          {formatMoneyOrDash(source.recognised)}
                        </td>
                        <td className="px-6 py-2.5" />
                        <td className="px-6 py-2.5" />
                        <td className="px-6 py-2.5 text-right font-medium text-neutral-700">
                          {formatCurrencyVND(source.actual)}
                        </td>
                      </tr>
                    ))}
                </Fragment>
              )
            })
          )}

          <tr className="border-border-1 bg-neutral-20 border-t-2 text-[13px] font-bold text-neutral-900">
            <td colSpan={3} className="px-6 py-4">
              TỔNG
            </td>
            <td className="px-6 py-4 text-right">{formatCurrencyVND(totalFeePrice)}</td>
            {/* "% HH" là tỷ lệ trên từng căn khác nhau — cộng lại không có nghĩa. */}
            <td className="px-6 py-4 text-right" />
            <td className="px-6 py-4 text-right">
              {formatCurrencyVND(sumItemsByPctType(deals, PCT.F1_SALE.pct))}
            </td>
            <td className="px-6 py-4 text-right">
              {formatCurrencyVND(sumItemsByPctType(deals, PCT.F1_BONUS.pct))}
            </td>
            <td className="px-6 py-4 text-right">
              {formatCurrencyVND(sumItemsByPctType(deals, PCT.F1_INVESTOR_BONUS.pct))}
            </td>
            <td className="px-6 py-4 text-right">{formatCurrencyVND(sumStaffIncentive(deals))}</td>
            <td className="px-6 py-4 text-right">{formatMoneyOrDash(totalRecognised)}</td>
            {/* hai cột "% tiền về" — là tỷ lệ, không cộng tổng được */}
            <td className="px-6 py-4 text-right" />
            <td className="px-6 py-4 text-right" />
            <td className="text-data-green-default px-6 py-4 text-right">
              {formatCurrencyVND(totalActual)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

/** Tiền của MỘT nguồn theo `pct_type` — cùng luật cộng-không-find như `sumDealItemsByPctType`. */
function sumSourceByPctType(source: DealCommissionSource, pctType: string): number {
  return source.items.reduce((acc, item) => {
    if (item.pct_type !== pctType) return acc
    const amount = Number(item.amount)
    return Number.isFinite(amount) ? acc + amount : acc
  }, 0)
}

export default SaleDealCommissionTable

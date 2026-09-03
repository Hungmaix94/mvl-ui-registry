import React from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowRight, CheckCircle2, Clock } from 'lucide-react'
import {
  useDealWorkspaceCashflow,
  useDealWorkspaceCashflowBreakdown,
  useDealCommissionShares,
} from '@/features/sales/deals/services/deal-service'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { components } from '@/api/schema.ts'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { IconArrowleft, IconArrowright } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { formatMoney, formatNegative, formatPct } from '@/utils/common'
import { isSaleRecipient } from '@/features/sales/deal-v3/utils/commission-recipient'

interface DealCashflowTabProps {
  dealId: number
}

interface BreakdownTooltipProps {
  title: string
  items: { label: string; value: string | number; isNegative?: boolean; isPositive?: boolean }[]
  children: React.ReactNode
}

const BreakdownCellTooltip: React.FC<BreakdownTooltipProps> = ({ title, items, children }) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help decoration-dotted hover:underline">{children}</span>
      </TooltipTrigger>
      <TooltipContent className="rounded-md border-0 bg-gray-800 p-2.5 font-sans text-xs text-white shadow-lg">
        <div className="min-w-[200px] space-y-1">
          <div className="mb-1.5 border-b border-gray-700 pb-1.5 text-[10px] font-semibold tracking-wider text-gray-300 uppercase">
            {title}
          </div>
          {items.map((item, index) => {
            const val = Number(item.value) || 0
            if (val === 0) {
              return (
                <div className="flex items-center justify-between py-0.5 text-gray-500" key={index}>
                  <span>{item.label}</span>
                  <span>—</span>
                </div>
              )
            }
            const sign = item.isNegative ? '−' : item.isPositive ? '+' : ''
            const colorClass = item.isNegative
              ? 'text-red-400 font-semibold'
              : item.isPositive
                ? 'text-green-400 font-semibold'
                : 'text-gray-200'

            return (
              <div className="flex items-center justify-between py-0.5" key={index}>
                <span className="mr-4 text-gray-400">{item.label}</span>
                <span className={colorClass}>
                  {sign}
                  {formatMoney(Math.abs(val))}
                </span>
              </div>
            )
          })}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export const DealCashflowTab: React.FC<DealCashflowTabProps> = ({ dealId }) => {
  const navigate = useNavigate()
  const { data, isLoading, error } = useDealWorkspaceCashflow(dealId)
  const { data: breakdownData } = useDealWorkspaceCashflowBreakdown(dealId)
  const { data: splitData } = useDealCommissionShares(dealId, 'split')

  // No split participants loaded yet → assume the deal has a sale side so the column
  // is not blanked out while the query is still in flight.
  const hasSaleParticipant = React.useMemo(() => {
    const shares = splitData?.commission_shares || []
    if (!shares.length) return true
    return shares.some((s) => isSaleRecipient(s))
  }, [splitData])

  const breakdownMap = React.useMemo(() => {
    if (!breakdownData?.periods) return new Map<string, any>()
    return new Map(breakdownData.periods.map((p) => [p.ref_code, p]))
  }, [breakdownData])

  const isError = !!error
  const isNotFound = !!error && (error as any)?.response?.status === 404

  // `hasPermission={true}` ở hai nhánh dưới là CỐ Ý và là code chết: `DetailPageWrapper` kiểm
  // `isLoading` → `isNotFound` → `isError` TRƯỚC `hasPermission`, mà cả hai nhánh này đều rơi vào
  // một trong ba điều kiện đó. Đây là khung xương chờ tải / khung báo lỗi, không phải cổng quyền —
  // tab này nằm trong màn Deal và quyền đã chặn ở route của màn đó (ClickUp 86eync7g0).
  if (isLoading) {
    return (
      <DetailPageWrapper isLoading={true} isNotFound={false} isError={false} hasPermission={true}>
        <div />
      </DetailPageWrapper>
    )
  }

  if (isError || isNotFound || !data) {
    return (
      <DetailPageWrapper
        isLoading={false}
        isNotFound={isNotFound}
        isError={isError}
        hasPermission={true}
      >
        <div />
      </DetailPageWrapper>
    )
  }

  const { investor_cashflow } = data
  const {
    source_ref,
    pending_period,
    periods,
    deal_total,
    bonus_deduction_allocation,
    outflow_allocated,
    outflow_pending,
  } = investor_cashflow

  const handleGoToRecon = () => {
    if (pending_period?.ref_code) {
      navigate(`${APP_PATH.INVESTOR_RECONCILIATION}?search=${pending_period.ref_code}`)
    } else {
      navigate(APP_PATH.INVESTOR_RECONCILIATION)
    }
  }

  const M4BonusDeductStrip: React.FC = () => {
    const renderBd = (
      cfg: components['schemas']['DealWorkspaceBonusDeductionItem'] | undefined,
      label: string,
      isDeduct: boolean
    ) => {
      if (!cfg) return null
      const mvVal = Number(cfg.mv_held || 0)
      const saleVal = Number(cfg.sale_received || 0)
      const total = Math.abs(mvVal + saleVal) || 1
      const mvPct = (Math.abs(mvVal) / total) * 100
      const salePct = (Math.abs(saleVal) / total) * 100
      const amtClass = isDeduct ? 'neg' : 'pos'
      const sign = isDeduct ? '−' : '+'
      const segCls = isDeduct ? 'sale-deduct' : 'sale'
      // Deduction is a cost BORNE by each side ("chịu"); bonus is money one side keeps/receives.
      const mvLabel = isDeduct ? 'MV (cty) chịu' : 'MV (cty) giữ'
      const saleLabel = isDeduct ? 'Sale/F2 chịu' : 'Sale/F2 nhận'
      return (
        <div className="m4-bd-row" key={label}>
          <div className="m4-bd-label">
            <span className="ttl">
              <span
                className="dot"
                style={{
                  background: isDeduct
                    ? 'var(--color-data-red-default)'
                    : 'var(--color-data-green-default)',
                }}
              />
              {label}
            </span>
            <span className={`amt ${amtClass}`}>
              {sign}
              {formatMoney(Math.abs(mvVal + saleVal))}
              <span className="u">VND</span>
            </span>
          </div>
          <div className="m4-bd-right">
            <div className="m4-bd-bar">
              {mvVal !== 0 && (
                <div
                  className="m4-bd-seg cty"
                  style={{ width: `${mvPct}%` }}
                  title={`MV ${sign}${formatMoney(Math.abs(mvVal))}`}
                />
              )}
              {saleVal !== 0 && (
                <div
                  className={`m4-bd-seg ${segCls}`}
                  style={{ width: `${saleVal === 0 ? 100 : salePct}%` }}
                  title={`Sale ${sign}${formatMoney(Math.abs(saleVal))}`}
                />
              )}
            </div>
            <div className="m4-bd-legend">
              <span className="lg">
                <span className="swatch cty" />
                {mvLabel}
                <span className="pct">{Math.round(mvPct)}%</span>
                <b className={isDeduct ? 'neg' : ''}>
                  {sign}
                  {formatMoney(Math.abs(mvVal))}
                </b>
              </span>
              <span className="lg">
                <span className={`swatch ${isDeduct ? 'sale-deduct' : 'sale'}`} />
                {saleLabel}
                <span className="pct">{Math.round(salePct)}%</span>
                <b className={isDeduct ? 'neg' : ''}>
                  {sign}
                  {formatMoney(Math.abs(saleVal))}
                </b>
              </span>
              {cfg.rule && <span className="lg note">({cfg.rule})</span>}
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="m4-bd-strip">
        <div className="m4-bd-head">
          <span className="t">Phân bổ thưởng / giảm trừ</span>
          <span className="s">
            Thưởng: theo dial phân bổ CĐT &middot; Giảm trừ: phần Sale/F2 chịu
          </span>
        </div>
        {renderBd(bonus_deduction_allocation?.bonus, 'Thưởng đại lý', false)}
        {renderBd(bonus_deduction_allocation?.deduction, 'Phí giảm trừ', true)}
      </div>
    )
  }

  return (
    <div className="m4-art" id="sec-price">
      {/* Head — khớp các section khác (num-tag 04 + nguồn + CHÍNH THỨC) */}
      <div className="m4-card-head">
        <span className="num-tag">04</span>
        <h4 id="sec-price-title">Giá &amp; Thu từ Chủ đầu tư</h4>
        <span className="sub">&middot; Inflow CĐT theo kỳ và outflow phân bổ tương ứng</span>
        <div className="actions">
          <span>
            Nguồn: <code className="m4-code">{source_ref?.code || '—'}</code> &middot;{' '}
            {source_ref?.date ? new Date(source_ref.date).toLocaleDateString('vi-VN') : '—'}
          </span>
          <span className="m4-pill m4-pill-green">
            <span className="dot" />
            {source_ref?.status === 'official' ? 'CHÍNH THỨC' : 'NHÁP'}
          </span>
        </div>
      </div>

      {/* 3 KPI Cards (m4-hero) removed in favor of unified pricing block table columns */}

      {/* ── Pending Period Banner (m4-banner) ─────────────────────────── */}
      {pending_period && (
        <div className="m4-banner">
          <div className="m4-banner-icon">
            <AlertCircle className="h-4.5 w-4.5 text-white" />
          </div>
          <div className="m4-banner-body">
            <div className="m4-banner-eyebrow">Còn 1 kỳ đối chiếu chưa chốt</div>
            <div className="m4-banner-main">
              Phiếu <code className="m4-code">{pending_period.ref_code}</code> đang ở bản nháp —
              outflow đã phân bổ dự kiến, chốt khi CĐT xác nhận
            </div>
            <div className="m4-banner-stats">
              <div className="m4-banner-stat">
                <span className="k">Inflow dự kiến</span>
                <span className="v pos">
                  +{formatMoney(pending_period.inflow_expected)} <i>VND</i>
                </span>
                <span className="d">{pending_period.note || 'base + thưởng'}</span>
              </div>
              <div className="m4-banner-stat">
                <span className="k">Outflow dự kiến (nháp)</span>
                <span className="v warn">
                  {formatNegative(pending_period.outflow_expected)} <i>VND</i>
                </span>
                <span className="d">
                  chia sale &middot; F2 &middot; CTV — chốt khi xác nhận phiếu
                </span>
              </div>
            </div>
          </div>
          <button onClick={handleGoToRecon} className="m4-banner-cta cursor-pointer">
            <ArrowRight className="mr-1 h-3 w-3" /> Mở phiếu nháp
          </button>
        </div>
      )}

      {/* ── Sub-head ──────────────────────────────────────────────────── */}
      <div className="m4-sub-head">
        <Clock className="h-3.5 w-3.5 text-gray-500" />
        Dòng tiền theo kỳ đối chiếu
        <span className="sub">
          &middot; mỗi dòng = 1 phiếu PDCDT (HD04) &middot; cộng dồn ra tổng deal
        </span>
        <span className="actions ml-auto flex gap-2">
          <span className="m4-pill m4-pill-green">
            <span className="dot" />
            {periods.filter((p) => p.status === 'confirmed').length} đã chốt
          </span>
          <span className="m4-pill m4-pill-grey">
            <span className="dot" />
            {periods.filter((p) => p.status !== 'confirmed').length} nháp
          </span>
        </span>
      </div>

      {/* ── Periods Table ─────────────────────────────────────────────── */}
      <div style={{ overflowX: 'auto' }}>
        <table className="m4-tbl">
          <colgroup>
            <col style={{ width: '15%' }} />
            <col style={{ width: '7%' }} />
            <col span={3} style={{ background: '#FAFCFE' }} />
            <col style={{ background: '#F4F8FD' }} />
            <col span={4} style={{ background: '#FBF9F6' }} />
            <col style={{ background: '#F7F2EC' }} />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th rowSpan={2}>Kỳ đối chiếu</th>
              <th rowSpan={2} className="c">
                % kỳ
              </th>
              <th
                colSpan={4}
                className="c"
                style={{
                  background: '#F4F8FD',
                  color: 'var(--color-data-blue-default)',
                  borderBottom: '1px solid var(--color-data-blue-disabled)',
                }}
              >
                <div className="flex items-center justify-center gap-1">
                  <IconArrowleft size={16} /> INFLOW từ CĐT (kỳ)
                </div>
              </th>
              <th
                colSpan={5}
                className="c"
                style={{
                  background: '#F7F2EC',
                  color: 'var(--color-data-orange-hover)',
                  borderBottom: '1px solid var(--color-data-orange-disabled)',
                }}
              >
                <div className="flex items-center justify-center gap-1">
                  OUTFLOW phân bổ (kỳ) <IconArrowright size={16} />
                </div>
              </th>
              <th rowSpan={2} className="c">
                Trạng thái
              </th>
            </tr>
            <tr>
              <th className="r" style={{ background: '#F4F8FD' }}>
                Phí đại lý
                <span
                  style={{
                    display: 'block',
                    fontSize: 10,
                    fontWeight: 400,
                    color: 'var(--color-content-dark-3)',
                  }}
                >
                  base + tăng thêm
                </span>
              </th>
              <th className="r" style={{ background: '#F4F8FD' }}>
                Thưởng
              </th>
              <th className="r" style={{ background: '#F4F8FD' }}>
                Giảm trừ
              </th>
              <th
                className="r"
                style={{ background: '#F4F8FD', color: 'var(--color-content-dark-1)' }}
              >
                = Inflow kỳ
              </th>
              <th className="r" style={{ background: '#F7F2EC' }}>
                Sale
              </th>
              <th className="r" style={{ background: '#F7F2EC' }}>
                F2
              </th>
              <th className="r" style={{ background: '#F7F2EC' }}>
                CTV
              </th>
              <th className="r" style={{ background: '#F7F2EC' }}>
                MV (cty)
              </th>
              <th
                className="r"
                style={{ background: '#F7F2EC', color: 'var(--color-content-dark-1)' }}
              >
                = Outflow kỳ
              </th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => {
              const isDraft = p.status !== 'confirmed'
              const cls = isDraft ? 'draft-row' : ''
              const cellBg = isDraft ? '#FCFAF7' : '#FBF9F6'
              const numStyle = isDraft
                ? {
                    color: 'var(--color-content-dark-3)',
                    fontWeight: 500,
                    fontStyle: 'italic' as const,
                  }
                : { color: 'var(--color-content-dark-1)', fontWeight: 500 }
              const bd = p.ref_code ? breakdownMap.get(p.ref_code) : null

              return (
                <tr key={p.ref_code} className={cls}>
                  <td>
                    <span style={{ fontWeight: 600 }}>
                      <code className="m4-code">{p.ref_code}</code>
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 11,
                          color: 'var(--color-content-dark-3)',
                          fontWeight: 400,
                        }}
                      >
                        {p.date ? new Date(p.date).toLocaleDateString('vi-VN') : ''}
                      </span>
                    </span>
                  </td>
                  <td className="c" style={{ color: 'var(--color-content-dark-2)' }}>
                    {formatPct(p.period_pct)}
                  </td>

                  {/* Inflow */}
                  <td className="r" style={{ background: '#FAFCFE' }}>
                    {bd ? (
                      <BreakdownCellTooltip
                        title="Chi tiết phí đại lý"
                        items={[
                          {
                            label: 'Phí cơ bản',
                            value: bd.inflow.agency_fee_base,
                            isPositive: true,
                          },
                          {
                            label: 'Phí tăng thêm',
                            value: bd.inflow.agency_fee_extra,
                            isPositive: true,
                          },
                        ]}
                      >
                        <span className="m4-money-pos m4-num">
                          +{formatMoney(p.inflow.agency_fee_base_plus_extra)}
                        </span>
                      </BreakdownCellTooltip>
                    ) : (
                      <span className="m4-money-pos m4-num">
                        +{formatMoney(p.inflow.agency_fee_base_plus_extra)}
                      </span>
                    )}
                  </td>
                  <td className="r" style={{ background: '#FAFCFE' }}>
                    {Number(p.inflow.bonus || 0) > 0 ? (
                      <span className="m4-money-bonus m4-num" style={{ fontWeight: 600 }}>
                        +{formatMoney(p.inflow.bonus)}
                      </span>
                    ) : (
                      <span className="m4-money-muted">—</span>
                    )}
                  </td>
                  <td className="r" style={{ background: '#FAFCFE' }}>
                    {Number(p.inflow.deduction || 0) !== 0 ? (
                      <span className="m4-money-deduct m4-num" style={{ fontWeight: 600 }}>
                        {formatNegative(p.inflow.deduction)}
                      </span>
                    ) : (
                      <span className="m4-money-muted">—</span>
                    )}
                  </td>
                  <td className="r strong" style={{ background: '#F4F8FD', fontSize: 14 }}>
                    <span className="m4-num">+{formatMoney(p.inflow.total)}</span>
                  </td>

                  {/* Outflow */}
                  <td className="r" style={{ background: cellBg }}>
                    {!hasSaleParticipant ? (
                      <span className="m4-money-muted">—</span>
                    ) : bd?.outflow?.sale ? (
                      <BreakdownCellTooltip
                        title="Phân bổ outflow chi Sale"
                        items={[
                          {
                            label: 'Hoa hồng chi trả',
                            value: bd.outflow.sale.commission,
                            isNegative: true,
                          },
                          {
                            label: 'Thưởng định trước',
                            value: bd.outflow.sale.bonus_predefined,
                            isNegative: true,
                          },
                          {
                            label: 'Thưởng nóng CĐT',
                            value: bd.outflow.sale.bonus_hot,
                            isNegative: true,
                          },
                          {
                            label: 'Giảm trừ phát sinh',
                            value: bd.outflow.sale.deduction,
                            isNegative: true,
                          },
                        ]}
                      >
                        <span className="m4-num" style={numStyle}>
                          {formatNegative(p.outflow.sale)}
                        </span>
                      </BreakdownCellTooltip>
                    ) : (
                      <span className="m4-num" style={numStyle}>
                        {formatNegative(p.outflow.sale)}
                      </span>
                    )}
                  </td>
                  <td className="r" style={{ background: cellBg }}>
                    {bd?.outflow?.f2 ? (
                      <BreakdownCellTooltip
                        title="Phân bổ outflow chi F2"
                        items={[
                          {
                            label: 'Hoa hồng sàn',
                            value: bd.outflow.f2.commission,
                            isNegative: true,
                          },
                          {
                            label: 'Thưởng phát sinh',
                            value: bd.outflow.f2.bonus,
                            isNegative: true,
                          },
                          {
                            label: 'Giảm trừ phát sinh',
                            value: bd.outflow.f2.deduction,
                            isNegative: true,
                          },
                        ]}
                      >
                        <span className="m4-num" style={numStyle}>
                          {formatNegative(p.outflow.f2)}
                        </span>
                      </BreakdownCellTooltip>
                    ) : (
                      <span className="m4-num" style={numStyle}>
                        {formatNegative(p.outflow.f2)}
                      </span>
                    )}
                  </td>
                  <td className="r" style={{ background: cellBg }}>
                    {bd?.outflow?.ctv ? (
                      <BreakdownCellTooltip
                        title="Phân bổ outflow chi CTV"
                        items={[
                          {
                            label: 'Hoa hồng CTV',
                            value: bd.outflow.ctv.commission,
                            isNegative: true,
                          },
                          {
                            label: 'Thưởng phát sinh',
                            value: bd.outflow.ctv.bonus,
                            isNegative: true,
                          },
                          {
                            label: 'Giảm trừ phát sinh',
                            value: bd.outflow.ctv.deduction,
                            isNegative: true,
                          },
                        ]}
                      >
                        <span className="m4-num" style={numStyle}>
                          {formatNegative(p.outflow.ctv)}
                        </span>
                      </BreakdownCellTooltip>
                    ) : (
                      <span className="m4-num" style={numStyle}>
                        {formatNegative(p.outflow.ctv)}
                      </span>
                    )}
                  </td>
                  <td className="r" style={{ background: cellBg }}>
                    {Number(p.outflow.mv_company || 0) > 0 ? (
                      <span
                        className="m4-num"
                        style={
                          isDraft
                            ? { fontStyle: 'italic', color: 'var(--color-content-dark-3)' }
                            : {}
                        }
                      >
                        −{formatMoney(p.outflow.mv_company)}
                      </span>
                    ) : (
                      <span className="m4-money-muted">0</span>
                    )}
                  </td>
                  <td
                    className="r strong"
                    style={{
                      background: '#F7F2EC',
                      color: 'var(--color-data-orange-hover)',
                      fontSize: 14,
                    }}
                  >
                    <span className="m4-num" style={isDraft ? { fontStyle: 'italic' } : {}}>
                      {formatNegative(p.outflow.total)}
                    </span>
                    {isDraft && (
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          fontStyle: 'normal',
                          color: 'var(--color-content-dark-3)',
                        }}
                      >
                        dự kiến
                      </div>
                    )}
                  </td>

                  <td className="c">
                    {p.status === 'confirmed' ? (
                      <span className="m4-pill m4-pill-green">
                        <span className="dot" />
                        Đã chốt
                      </span>
                    ) : (
                      <span className="m4-pill m4-pill-grey">
                        <span className="dot" />
                        Nháp
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
            <tr className="total-row">
              <td>TỔNG DEAL</td>
              <td className="c">100%</td>

              {/* Inflow totals */}
              <td className="r" style={{ background: '#EEF5FD' }}>
                {breakdownData?.totals ? (
                  <BreakdownCellTooltip
                    title="Tổng phí đại lý"
                    items={[
                      {
                        label: 'Phí cơ bản',
                        value: breakdownData.totals.inflow.agency_fee_base,
                        isPositive: true,
                      },
                      {
                        label: 'Phí tăng thêm',
                        value: breakdownData.totals.inflow.agency_fee_extra,
                        isPositive: true,
                      },
                    ]}
                  >
                    <span className="m4-num">
                      +
                      {formatMoney(
                        deal_total?.inflow?.agency_fee_base_plus_extra ||
                          periods.reduce(
                            (s, p) => s + Number(p.inflow.agency_fee_base_plus_extra || 0),
                            0
                          )
                      )}
                    </span>
                  </BreakdownCellTooltip>
                ) : (
                  <span className="m4-num">
                    +
                    {formatMoney(
                      deal_total?.inflow?.agency_fee_base_plus_extra ||
                        periods.reduce(
                          (s, p) => s + Number(p.inflow.agency_fee_base_plus_extra || 0),
                          0
                        )
                    )}
                  </span>
                )}
              </td>
              <td className="r" style={{ background: '#EEF5FD' }}>
                <span className="m4-num m4-money-bonus">
                  +
                  {formatMoney(
                    deal_total?.inflow?.bonus ||
                      periods.reduce((s, p) => s + Number(p.inflow.bonus || 0), 0)
                  )}
                </span>
              </td>
              <td className="r" style={{ background: '#EEF5FD' }}>
                <span className="m4-num m4-money-deduct">
                  {formatNegative(
                    deal_total?.inflow?.deduction ||
                      periods.reduce((s, p) => s + Number(p.inflow.deduction || 0), 0)
                  )}
                </span>
              </td>
              <td
                className="r"
                style={{
                  background: '#DBE9FB',
                  color: 'var(--color-data-blue-default)',
                  fontSize: 14,
                }}
              >
                <span className="m4-num">
                  +
                  {formatMoney(
                    deal_total?.inflow?.total ||
                      periods.reduce((s, p) => s + Number(p.inflow.total || 0), 0)
                  )}
                </span>
              </td>

              {/* Outflow totals */}
              <td className="r" style={{ background: '#F2EAE0' }}>
                {breakdownData?.totals?.outflow?.sale ? (
                  <BreakdownCellTooltip
                    title="Tổng outflow chi Sale"
                    items={[
                      {
                        label: 'Hoa hồng chi trả',
                        value: breakdownData.totals.outflow.sale.commission,
                        isNegative: true,
                      },
                      {
                        label: 'Thưởng định trước',
                        value: breakdownData.totals.outflow.sale.bonus_predefined,
                        isNegative: true,
                      },
                      {
                        label: 'Thưởng nóng CĐT',
                        value: breakdownData.totals.outflow.sale.bonus_hot,
                        isNegative: true,
                      },
                      {
                        label: 'Giảm trừ phát sinh',
                        value: breakdownData.totals.outflow.sale.deduction,
                        isNegative: true,
                      },
                    ]}
                  >
                    <span className="m4-num">
                      {formatNegative(
                        deal_total?.outflow?.sale ||
                          periods.reduce((s, p) => s + Number(p.outflow.sale || 0), 0)
                      )}
                    </span>
                  </BreakdownCellTooltip>
                ) : (
                  <span className="m4-num">
                    {formatNegative(
                      deal_total?.outflow?.sale ||
                        periods.reduce((s, p) => s + Number(p.outflow.sale || 0), 0)
                    )}
                  </span>
                )}
              </td>
              <td className="r" style={{ background: '#F2EAE0' }}>
                {breakdownData?.totals?.outflow?.f2 ? (
                  <BreakdownCellTooltip
                    title="Tổng outflow chi F2"
                    items={[
                      {
                        label: 'Hoa hồng sàn',
                        value: breakdownData.totals.outflow.f2.commission,
                        isNegative: true,
                      },
                      {
                        label: 'Thưởng phát sinh',
                        value: breakdownData.totals.outflow.f2.bonus,
                        isNegative: true,
                      },
                      {
                        label: 'Giảm trừ phát sinh',
                        value: breakdownData.totals.outflow.f2.deduction,
                        isNegative: true,
                      },
                    ]}
                  >
                    <span className="m4-num">
                      {formatNegative(
                        deal_total?.outflow?.f2 ||
                          periods.reduce((s, p) => s + Number(p.outflow.f2 || 0), 0)
                      )}
                    </span>
                  </BreakdownCellTooltip>
                ) : (
                  <span className="m4-num">
                    {formatNegative(
                      deal_total?.outflow?.f2 ||
                        periods.reduce((s, p) => s + Number(p.outflow.f2 || 0), 0)
                    )}
                  </span>
                )}
              </td>
              <td className="r" style={{ background: '#F2EAE0' }}>
                {breakdownData?.totals?.outflow?.ctv ? (
                  <BreakdownCellTooltip
                    title="Tổng outflow chi CTV"
                    items={[
                      {
                        label: 'Hoa hồng CTV',
                        value: breakdownData.totals.outflow.ctv.commission,
                        isNegative: true,
                      },
                      {
                        label: 'Thưởng phát sinh',
                        value: breakdownData.totals.outflow.ctv.bonus,
                        isNegative: true,
                      },
                      {
                        label: 'Giảm trừ phát sinh',
                        value: breakdownData.totals.outflow.ctv.deduction,
                        isNegative: true,
                      },
                    ]}
                  >
                    <span className="m4-num">
                      {formatNegative(
                        deal_total?.outflow?.ctv ||
                          periods.reduce((s, p) => s + Number(p.outflow.ctv || 0), 0)
                      )}
                    </span>
                  </BreakdownCellTooltip>
                ) : (
                  <span className="m4-num">
                    {formatNegative(
                      deal_total?.outflow?.ctv ||
                        periods.reduce((s, p) => s + Number(p.outflow.ctv || 0), 0)
                    )}
                  </span>
                )}
              </td>
              <td className="r" style={{ background: '#F2EAE0' }}>
                <span className="m4-num">
                  {formatNegative(
                    deal_total?.outflow?.mv_company ||
                      periods.reduce((s, p) => s + Number(p.outflow.mv_company || 0), 0)
                  )}
                </span>
              </td>
              <td
                className="r"
                style={{
                  background: '#EBD9C2',
                  color: 'var(--color-data-orange-hover)',
                  fontSize: 14,
                }}
              >
                <span className="m4-num">
                  {formatNegative(
                    deal_total?.outflow?.total ||
                      periods.reduce((s, p) => s + Number(p.outflow.total || 0), 0)
                  )}
                </span>
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      <M4BonusDeductStrip />

      <div className="m4-foot">
        <span>
          <CheckCircle2 className="mr-1 inline h-3.5 w-3.5 align-sub text-green-600" />
          Outflow đã phân bổ: <b>{formatMoney(outflow_allocated)} VND</b>
        </span>
        <span style={{ color: 'var(--color-content-dark-4)' }}>&middot;</span>
        <span>
          <Clock className="mr-1 inline h-3.5 w-3.5 align-sub text-amber-500" />
          Outflow dự kiến (kỳ nháp):{' '}
          <b style={{ color: 'var(--color-data-orange-hover)' }}>
            {formatMoney(outflow_pending)} VND
          </b>
        </span>
        <span style={{ marginLeft: 'auto' }}>
          <a href="#sec-split" className="text-blue-500 hover:text-blue-700">
            Xem Mục 05 &middot; Chi tiết phân chia HH &rarr;
          </a>
        </span>
      </div>
    </div>
  )
}

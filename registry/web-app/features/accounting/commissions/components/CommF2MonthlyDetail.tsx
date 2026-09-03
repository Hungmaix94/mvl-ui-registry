import { useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import toastService from '@/services/toast-service'
import { useQueryClient } from '@tanstack/react-query'
import { Button, PageTitle, Chip } from '@/components/ui'
import { IconReceipt, IconPlus } from '@/assets/icons'
import { formatCurrencyVND, formatNumber, formatRatePct } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { useExchange } from '@/services/realestate-service'
import { MonthlyBeneficiaryCommissionSummaryDetail } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import { useConfirmMonthlySummaryAction } from '../hooks/useConfirmMonthlySummaryAction'
import { MonthlySummaryStatusBadge } from '@/features/accounting/monthly-summaries/components/MonthlySummaryStatusBadge'
import { canShowConfirmMonthlyButton } from '../utils/comm-confirm-button'
import { ColoredValueVariant } from '@/api/schema'
import { APP_PATH } from '@/routes'
import { CommMonthlySummaryHoldDialog } from './CommMonthlySummaryHoldDialog'
import { CommMonthlySummaryAdvanceDialog } from './CommMonthlySummaryAdvanceDialog'
import { RedirectedOutSection } from './RedirectedOutSection'
import {
  getRedirectedOutItems,
  buildDealCommissionSources,
  getDealEffectiveCommissionPct,
  sumDealSubtotals,
} from '@/features/accounting/commissions/utils/summary-breakdown'
import {
  DEAL_COLUMN_LABELS,
  DealCodeCell,
  DealProjectCell,
  DealReceiptDates,
  DealSourceCell,
  hasAnyProxySource,
} from './DealTableCells'
import { useAbility } from '@/lib/ability'
import { MonthlySummaryStatus as MonthlyStatus } from '@/constants/api-schema-aliases'

type Props = {
  summary: MonthlyBeneficiaryCommissionSummaryDetail
  onBack?: () => void
}

export const CommF2MonthlyDetail = ({ summary, onBack }: Props) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isHoldDialogOpen, setIsHoldDialogOpen] = useState(false)
  const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false)
  const { handleConfirm, isConfirming } = useConfirmMonthlySummaryAction(summary, 'f2')

  const { data: exchange } = useExchange(summary.beneficiary_exchange || 0, {
    enabled: !!summary.beneficiary_exchange,
  })

  const deals = useMemo(() => Object.values(summary.sources?.f2?.by_deal || {}), [summary])
  // Link "Phiếu chia" ở cột Mã deal dẫn sang màn 20.8 — cùng gate như hai màn Sale/CTV.
  const ability = useAbility()
  const canViewSplitSheet = ability.can('retrieve', 'dealperiodworksheet')
  // Người hưởng ở màn này là SÀN và thực tế sàn luôn tự đứng tên, nên cột "Đứng tên / Nhận hộ"
  // chỉ hiện khi kỳ này thật sự có khoản nhận hộ — xem hasAnyProxySource.
  const showSourceColumn = hasAnyProxySource(deals)

  const profile = {
    name: exchange?.name || summary.beneficiary_exchange_detail?.name || '—',
    mst: exchange?.tax_code || '—',
    contact: exchange?.contact_person
      ? `${exchange.contact_person} · ${exchange.phone || ''}`
      : exchange?.phone || '—',
    account_mgr: (summary as any).account_mgr || exchange?.representative_name || '—',
    bank: '—',
    sign_date: exchange?.created_at ? formatDate(exchange.created_at) : '—',
  }

  const totalFeeCalcPrice = useMemo(
    () =>
      deals.reduce((sum: number, deal: any) => sum + Number(deal.fee_calculation_price || 0), 0),
    [deals]
  )

  const needed = Number(summary.f2_total || 0)
  const received = Number(summary.pre_tax_total || 0)
  const invoiceMissing = Math.max(0, needed - received)
  const debtCarry = Number((summary as any).debt_carry || (summary as any).carry_forward || 0)
  const paidAmount = Number((summary as any).paid_amount || (summary as any).amount_paid || 0)

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title={`Chi tiết HH F2 · Kỳ ${summary.month}/${summary.year}`}
        enableBackButton
        handleBackButton={onBack}
        handleShowHistory={() => toastService.info('Tính năng đang phát triển')}
        topSlot={
          <div className="mt-1 flex items-center gap-2 text-sm text-neutral-600">
            <span className="font-bold text-neutral-900">Sàn LK {profile.name}</span>
            <span>·</span>
            <code className="bg-neutral-30 rounded px-1 text-xs">
              {summary.beneficiary_exchange}
            </code>
            <span>·</span>
            <span>MST {profile.mst}</span>
            <span>·</span>
            <span>NV phụ trách: {profile.account_mgr}</span>
          </div>
        }
        customActions={
          <>
            {(summary.status as string) === 'WAITING_INVOICE' && (
              <Button
                leftIcon={<IconReceipt />}
                onClick={() =>
                  navigate(APP_PATH.INPUT_INVOICE_CREATE, {
                    state: {
                      counterparty_type: 'EXCHANGE',
                      exchange: summary.beneficiary_exchange,
                    },
                  })
                }
              >
                Nhận thêm HĐ
              </Button>
            )}
            {((summary.status as string) === 'CONFIRMED' ||
              (summary.status as string) === 'PARTIAL') && (
              <Button
                leftIcon={<IconReceipt />}
                onClick={() =>
                  navigate(APP_PATH.PAYMENT_VOUCHER_CREATE, {
                    state: {
                      payee_type: 'EXCHANGE',
                      payee_exchange: summary.beneficiary_exchange,
                      total_amount: Number(summary.net_payable || 0),
                    },
                  })
                }
              >
                Tạo phiếu chi
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Big breakdown */}
          <div className="border-border-1 flex flex-col gap-0 overflow-hidden rounded-lg border bg-white shadow-sm lg:col-span-2">
            <div className="flex items-start justify-between px-6 py-5">
              <div>
                <div className="text-data-green-default mb-1 text-[11px] font-semibold tracking-wider uppercase">
                  Số tiền thực nhận kỳ này
                </div>
                <div className="text-data-green-default flex items-baseline gap-1 text-[32px] leading-none font-extrabold">
                  {formatCurrencyVND(Number(summary.net_payable || 0))}{' '}
                  <span className="text-base font-semibold text-neutral-400 underline decoration-1 underline-offset-2">
                    đ
                  </span>
                </div>
                <div className="mt-2 text-xs text-neutral-500">
                  Đã chi:{' '}
                  <strong className="text-neutral-700">{formatCurrencyVND(paidAmount)} đ</strong> /{' '}
                  {formatCurrencyVND(Number(summary.net_payable || 0))} đ
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 text-right">
                <MonthlySummaryStatusBadge status={summary.status as MonthlyStatus} />
                {canShowConfirmMonthlyButton(summary.status) && (
                  <Button size="small" loading={isConfirming} onClick={handleConfirm}>
                    Duyệt bảng kê
                  </Button>
                )}
                {summary.status === MonthlyStatus.PAID && (
                  <div className="mt-1 text-[11px] text-neutral-400">
                    <code>
                      {(summary as any).payroll_code || (summary as any).payment_code || 'PC-—'}
                    </code>
                    <br />
                    Ngày chi:{' '}
                    <strong className="text-neutral-700">
                      {(summary as any).paid_date || (summary as any).payment_date || '—'}
                    </strong>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white px-6 py-5">
              <div className="mb-4 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
                Diễn giải
              </div>
              <div className="flex flex-col">
                <BreakdownRow
                  label="HH F2 ghi nhận từ các deal"
                  value={needed}
                  note={`${deals.length} deal · giá tính phí tổng ${formatCurrencyVND(totalFeeCalcPrice)} đ`}
                />
                <BreakdownRow
                  label="HH thực tế theo tiền CĐT đã thu"
                  value={received}
                  note="Phần được hạch toán kỳ này"
                  sub
                />
                {debtCarry !== 0 && (
                  <BreakdownRow
                    label="Công nợ kỳ trước"
                    value={debtCarry}
                    note="Cộng dồn từ các kỳ trước"
                    color={debtCarry > 0 ? 'text-red-600' : 'text-green-600'}
                  />
                )}
                {invoiceMissing > 0 && (
                  <BreakdownRow
                    label="(Tạm) Tạm hoãn do thiếu HĐ đầu vào"
                    value={-invoiceMissing}
                    note="F2 chưa xuất đủ HĐ — phần này không chi được kỳ này, sẽ chi sau khi nhận đủ"
                    color="text-amber-500"
                    action={
                      <Button
                        size="small"
                        className="border-border-1 h-6 px-2 text-[11px] font-medium"
                        variant="secondary"
                        leftIcon={<IconPlus className="h-3 w-3" />}
                        onClick={() =>
                          navigate(APP_PATH.INPUT_INVOICE_CREATE, {
                            state: {
                              counterparty_type: 'EXCHANGE',
                              exchange: summary.beneficiary_exchange,
                            },
                          })
                        }
                      >
                        Nhận HĐ
                      </Button>
                    }
                  />
                )}
                <BreakdownRow
                  label="Đã chi trong kỳ"
                  value={-paidAmount}
                  note={paidAmount > 0 ? '—' : 'Chưa chi'}
                  color="text-blue-500"
                />
                <div className="border-border-1 mt-4 flex items-center justify-between border-t-2 pt-4">
                  <div className="text-sm font-bold text-neutral-900">= CÒN PHẢI CHI</div>
                  <div className="text-data-green-default text-lg font-bold">
                    {formatCurrencyVND(Number(summary.net_payable))}{' '}
                    <span className="text-data-green-default/80 text-sm font-semibold underline decoration-1 underline-offset-2">
                      đ
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column: F2 info */}
          <div className="flex flex-col gap-6">
            <div className="border-border-1 overflow-hidden rounded-lg border bg-white shadow-sm">
              <div className="border-border-1 border-b px-6 py-4">
                <div className="text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
                  Sàn F2
                </div>
              </div>
              <div className="divide-border-1 flex flex-col divide-y text-[13px]">
                <div className="flex items-center justify-between bg-white px-6 py-3">
                  <span className="text-neutral-500">Mã F2</span>
                  <span className="font-medium text-neutral-800">
                    {summary.beneficiary_exchange_detail?.id ? (
                      <Link
                        to={APP_PATH.EXCHANGE_MANAGEMENT_DETAIL.replace(
                          ':id',
                          String(summary.beneficiary_exchange_detail.id)
                        )}
                        className="text-brand-primary font-medium hover:underline"
                      >
                        {summary.beneficiary_exchange}
                      </Link>
                    ) : (
                      summary.beneficiary_exchange
                    )}
                  </span>
                </div>
                <div className="bg-neutral-20 flex items-center justify-between px-6 py-3">
                  <span className="text-neutral-500">MST</span>
                  <span className="font-medium text-neutral-800">{profile.mst}</span>
                </div>
                <div className="flex items-center justify-between bg-white px-6 py-3">
                  <span className="text-neutral-500">Liên hệ</span>
                  <span className="font-medium text-neutral-800">{profile.contact}</span>
                </div>
                <div className="bg-neutral-20 flex items-center justify-between px-6 py-3">
                  <span className="text-neutral-500">NV phụ trách</span>
                  <span className="font-medium text-neutral-800">{profile.account_mgr}</span>
                </div>
                <div className="flex items-center justify-between bg-white px-6 py-3">
                  <span className="text-neutral-500">TK nhận</span>
                  <span className="font-medium text-neutral-800">{profile.bank}</span>
                </div>
                <div className="bg-neutral-20 flex items-center justify-between px-6 py-3">
                  <span className="text-neutral-500">Ký HT từ</span>
                  <span className="font-medium text-neutral-800">{profile.sign_date}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Section ①: Targets */}
          <div className="border-border-1 overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="border-border-1 bg-neutral-20 flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-[#D28A35] text-[14px] font-semibold text-white">
                  1
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-neutral-900">
                    Các deal đã chốt và góp vào HH kỳ này
                  </div>
                  <div className="mt-0.5 text-[11px] text-neutral-500">
                    HH F2 ghi nhận từ các giao dịch trong kỳ
                  </div>
                </div>
              </div>
              <Chip label={`${deals.length} deal`} variant={ColoredValueVariant.BLUE} />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-border-1 bg-neutral-20 border-b text-[11px] tracking-wider text-neutral-500 uppercase">
                    <th className="px-6 py-3 font-medium whitespace-nowrap">
                      {DEAL_COLUMN_LABELS.code}
                    </th>
                    <th className="px-6 py-3 font-medium whitespace-nowrap">
                      {DEAL_COLUMN_LABELS.project}
                    </th>
                    {showSourceColumn && (
                      <th className="px-6 py-3 font-medium whitespace-nowrap">
                        {DEAL_COLUMN_LABELS.source}
                      </th>
                    )}
                    <th className="px-6 py-3 text-right font-medium whitespace-nowrap">
                      Giá tính phí
                    </th>
                    <th className="px-6 py-3 text-right font-medium whitespace-nowrap">% F2</th>
                    {/* KHÔNG có cột "HH F2 ghi nhận" ở đây — ẩn CỐ Ý, đừng nối lại.
                        ClickUp 86eyh04b6: QA báo cột này ra số sai (nó render
                        `total_commission` = tổng phí đại lý cả deal, nên trông như tỷ lệ doanh
                        thu). Giá trị đã được sửa đúng ngày 17/08 (`b257119fa`, đọc
                        `f2_total_commission` do BE phục vụ sẵn) — NHƯNG trước đó BA đã chốt bỏ
                        hẳn cột: reply 11/08/2026 của Nhung Nguyễn trên thread
                        https://app.clickup.com/t/86eyh04b6 — "BA conf ẩn => ẩn hộ c cột đó nhé",
                        trả lời cho câu hỏi "cột HH F2 là HH cho cả căn của F2 hay cho đợt tiền
                        về ghi nhận" (BA không chốt được nghĩa nên bỏ cột).
                        Bảng còn 8 cột: giữ `colSpan` của dòng rỗng và dòng TỔNG CỘNG khớp con số
                        này. Số "HH F2 ghi nhận" vẫn còn ở card Diễn giải phía trên (nhãn đó là
                        `summary.f2_total`, một đại lượng KHÁC — xem
                        docs/ai/domain/accounting-vouchers-commissions.md).
                        Muốn hiện lại thì phải có yêu cầu mới từ BA, không phải "sửa hồi quy". */}
                    <th className="px-6 py-3 text-right font-medium whitespace-nowrap">
                      % tiền về
                    </th>
                    <th className="px-6 py-3 text-right font-medium whitespace-nowrap">
                      HH F2 thực tế
                    </th>
                    <th className="px-6 py-3 text-center font-medium whitespace-nowrap">
                      HĐ đầu vào
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-border-1 divide-y bg-white">
                  {deals.length === 0 ? (
                    <tr>
                      <td colSpan={showSourceColumn ? 8 : 7} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center justify-center gap-2 text-neutral-500">
                          <IconReceipt className="h-8 w-8 text-neutral-300" />
                          <span className="text-[13px]">Không có giao dịch nào</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    deals.map((deal: any, i: number) => {
                      const invPct = Number(deal.payment_progress_pct || 0)
                      // % của CHÍNH sàn này trên cả căn (pool × tỷ lệ tham gia) — CR STT16.
                      // formatRatePct chứ không phải 4 chữ số cứng: cụm F2 là rate cấu hình
                      // numeric(6,3), luật hiển thị min 2 / max 3 (af157d3e6).
                      const formattedCommPct = formatRatePct(getDealEffectiveCommissionPct(deal))

                      return (
                        <tr key={i} className="text-[13px] hover:bg-neutral-50/50">
                          <td className="px-6 py-3.5 align-top">
                            <DealCodeCell deal={deal} canViewSplitSheet={canViewSplitSheet} />
                          </td>
                          <td className="px-6 py-3.5 align-top">
                            <DealProjectCell deal={deal} />
                          </td>
                          {showSourceColumn && (
                            <td className="px-6 py-3.5 align-top">
                              <DealSourceCell
                                sources={buildDealCommissionSources(deal)}
                                dealLabel={String(deal.deal_code || deal.deal_id)}
                              />
                            </td>
                          )}
                          <td className="px-6 py-3.5 text-right font-normal text-neutral-600">
                            {formatCurrencyVND(Number(deal.fee_calculation_price || 0))}
                          </td>
                          <td className="px-6 py-3.5 text-right font-normal text-neutral-600">
                            {formattedCommPct}
                          </td>
                          {/* Ô "HH F2 ghi nhận" đã bỏ cùng cột của nó — xem chú thích ở <thead>. */}
                          <td className="px-6 py-3.5 text-right">
                            <span
                              className={`text-[13px] font-medium ${invPct >= 100 ? 'text-green-600' : 'text-amber-600'}`}
                            >
                              {formatNumber(invPct, {
                                minimumFractionDigits: 1,
                                maximumFractionDigits: 1,
                              })}
                              %
                            </span>
                            <DealReceiptDates dates={deal.receipt_dates} />
                          </td>
                          <td className="text-data-green-default px-6 py-3.5 text-right font-semibold">
                            {formatCurrencyVND(Number(deal.subtotal || 0))}
                          </td>
                          <td className="px-6 py-3.5 text-center">
                            {/* Cùng ngưỡng với màu chữ % tiền về ở cột bên: thu vượt (>100)
                                vẫn là đã đủ, không được xanh mà chip lại "Chờ". */}
                            {invPct >= 100 ? (
                              <Chip label="Đủ" variant={ColoredValueVariant.GREEN} size="small" />
                            ) : (
                              <Chip label="Chờ" variant={ColoredValueVariant.ORANGE} size="small" />
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                  <tr className="border-border-1 bg-neutral-20 border-t-2 text-[13px] font-bold text-neutral-900">
                    {/* Gộp các cột định danh: mã deal + dự án, cộng cột nguồn khi nó hiện. */}
                    <td colSpan={showSourceColumn ? 3 : 2} className="px-6 py-4">
                      TỔNG CỘNG
                    </td>
                    <td className="px-6 py-4 text-right">—</td>
                    <td className="px-6 py-4 text-right">—</td>
                    {/* Ô tổng của "HH F2 ghi nhận" đã bỏ cùng cột — xem chú thích ở <thead>. */}
                    <td className="px-6 py-4 text-right">—</td>
                    {/* Cộng thẳng cột đang hiện, không đọc summary.f2_total: dòng tổng phải
                        khớp với chính các dòng bên trên nó. */}
                    <td className="text-data-green-default px-6 py-4 text-right">
                      {formatCurrencyVND(sumDealSubtotals(deals as any))}
                    </td>
                    <td className="px-6 py-4"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Section ②: HĐ đầu vào */}
            <div className="border-border-1 flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm">
              <div className="border-border-1 flex items-center justify-between border-b px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-[#9858AF] text-[14px] font-semibold text-white">
                    2
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-neutral-900">
                      HĐ đầu vào nhận từ F2
                    </div>
                    <div className="mt-0.5 text-[11px] text-neutral-500">
                      Cần đủ HĐ tương ứng để được phép chi
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {invoiceMissing > 0 && (
                    <span className="inline-flex items-center rounded bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                      Thiếu {formatCurrencyVND(invoiceMissing)}
                    </span>
                  )}
                  <Button
                    size="small"
                    className="h-8 px-3 text-xs"
                    leftIcon={<IconPlus className="h-3 w-3" />}
                    onClick={() =>
                      navigate(APP_PATH.INPUT_INVOICE_CREATE, {
                        state: {
                          counterparty_type: 'EXCHANGE',
                          exchange: summary.beneficiary_exchange,
                        },
                      })
                    }
                  >
                    Nhận thêm
                  </Button>
                </div>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-[13px] text-neutral-400">
                <IconReceipt className="h-8 w-8 text-neutral-300" />
                Chưa nhận HĐ nào từ F2 này.
              </div>
            </div>

            {/* Section ③: Phiếu chi & công nợ */}
            <div className="border-border-1 flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm">
              <div className="border-border-1 flex items-center justify-between border-b px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-[#1D4ED8] text-[14px] font-semibold text-white">
                    3
                  </div>
                  <div>
                    <div className="text-[14px] font-semibold text-neutral-900">
                      Phiếu chi & công nợ
                    </div>
                    <div className="mt-0.5 text-[11px] text-neutral-500">
                      Lịch sử các phiếu chi đã tạo cho F2 này trong kỳ
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="mb-1 text-[10px] font-semibold tracking-wider text-neutral-400 uppercase">
                    Còn nợ
                  </div>
                  <div className="text-data-green-default text-[15px] font-bold">
                    {formatCurrencyVND(Number(summary.net_payable))}{' '}
                    <span className="text-[11px] font-semibold underline decoration-1 underline-offset-2">
                      đ
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-[13px] text-neutral-400">
                <IconReceipt className="h-8 w-8 text-neutral-300" />
                Chưa tạo phiếu chi nào cho kỳ này.
              </div>
            </div>
          </div>
        </div>

        <RedirectedOutSection items={getRedirectedOutItems(summary)} />
      </div>
      <CommMonthlySummaryHoldDialog
        isOpen={isHoldDialogOpen}
        onClose={() => setIsHoldDialogOpen(false)}
        summaryId={summary.id}
        role="f2"
        currentAmount={Number(summary.hold_amount || 0)}
        currentReason={(summary as any).hold_reason || 'MANUAL'}
        currentNote={(summary as any).hold_note || ''}
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ['accounting', 'monthly_summaries'],
          })
        }}
      />
      <CommMonthlySummaryAdvanceDialog
        isOpen={isAdvanceDialogOpen}
        onClose={() => setIsAdvanceDialogOpen(false)}
        summaryId={summary.id}
        role="f2"
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ['accounting', 'monthly_summaries'],
          })
        }}
      />
    </div>
  )
}

const BreakdownRow = ({ label, value, note, color = 'text-neutral-900', sub, action }: any) => (
  <div className="border-border-1 -mx-6 flex items-start justify-between border-b px-6 py-3 last:border-0 hover:bg-neutral-50/30">
    <div className="flex flex-1 flex-col pr-4">
      <div className="flex items-center gap-2">
        {sub && <span className="mr-1 ml-2 text-neutral-300">└</span>}
        <span
          className={`text-[13px] ${
            sub ? 'font-normal text-neutral-500' : 'font-normal text-neutral-700'
          }`}
        >
          {label}
        </span>
        {action && action}
      </div>
      {note && (
        <span className={`mt-0.5 text-[11px] text-neutral-400 ${sub ? 'ml-6' : ''}`}>{note}</span>
      )}
    </div>
    <div className={`text-right font-medium ${color} font-mono`}>
      {formatCurrencyVND(value)}{' '}
      <span className="text-xs font-semibold underline decoration-1 underline-offset-2 opacity-60">
        đ
      </span>
    </div>
  </div>
)

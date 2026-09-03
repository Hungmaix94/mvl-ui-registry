// @ts-nocheck
import { useCallback, useMemo, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button, PageTitle, Chip } from '@/components/ui'
import { IconReceipt, IconPlus, IconPencil } from '@/assets/icons'
import { formatCurrencyVND, formatNumber } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { useAuth } from '@/store'
import { useAbility } from '@/lib/ability'
import { hasPermission } from '@/utils/auth'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import type { MonthlyBeneficiaryCommissionSummaryDetail } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import {
  useUpdateCtvDealMailRecipient,
  useSendCommissionEmail,
} from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import { useConfirmMonthlySummaryAction } from '../hooks/useConfirmMonthlySummaryAction'
import { MonthlySummaryStatusBadge } from '@/features/accounting/monthly-summaries/components/MonthlySummaryStatusBadge'
import { ColoredValueVariant } from '@/api/schema'
import { canShowConfirmMonthlyButton } from '../utils/comm-confirm-button'
import { PitMethod, MonthlySummaryStatus as MonthlyStatus } from '@/constants/api-schema-aliases'
import { useCollaborator } from '@/features/accounting/collaborators/services/collaborator-service'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { APP_PATH } from '@/routes'
import {
  type DealPayableGroup,
  buildDealCommissionSources,
  sumDealItemsByPctType,
  sumItemsByPctType,
  sumDealSubtotals,
  getRedirectedOutItems,
  getDealAggregateCommissionPct,
  getDealRecognisedTotal,
  getDealPaymentProgressPct,
  getDealDialFeeProgressPct,
} from '@/features/accounting/commissions/utils/summary-breakdown'
import {
  DEAL_COLUMN_LABELS,
  DealCodeCell,
  DealProjectCell,
  DealReceiptDates,
  DealSourceCell,
} from './DealTableCells'
import { RedirectedOutSection } from './RedirectedOutSection'
import { CommMonthlySummaryHoldDialog } from './CommMonthlySummaryHoldDialog'
import {
  ADVANCE_REQUEST_ACTION_LABEL_SHORT,
  CommMonthlySummaryAdvanceDialog,
} from './CommMonthlySummaryAdvanceDialog'
import DealProgressPctCell from './DealProgressPctCell'
import PayeeCard from './PayeeCard'
import DealRecipientEditableCell from './DealRecipientEditableCell'
import CtvDealSendMailButton from './CtvDealSendMailButton'

type Props = {
  summary: MonthlyBeneficiaryCommissionSummaryDetail
  onBack?: () => void
}

export const CommCtvMonthlyDetail = ({ summary, onBack }: Props) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isHoldDialogOpen, setIsHoldDialogOpen] = useState(false)
  const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false)
  const { handleConfirm, isConfirming } = useConfirmMonthlySummaryAction(summary, 'collaborators')

  const { data: collaborator } = useCollaborator(summary.beneficiary_collaborator || 0, {
    enabled: !!summary.beneficiary_collaborator,
  })

  const { user } = useAuth()
  const perms = user?.permissions || []
  // Link "Phiếu chia" ở cột Mã deal dẫn sang màn 20.8 — cùng gate như CommHoldDetail/màn Sale.
  const ability = useAbility()
  const canViewSplitSheet = ability.can('retrieve', 'dealperiodworksheet')
  // CR STT33 / ClickUp 86eyexcr3 — per-deal mail recipient (CTV-only, distinct model/endpoint
  // from Sale's CR STT31 bulk override).
  const canEditCtvDealMailRecipient = hasPermission(
    perms,
    'collaboratormonthlycommissionsummary.update_deal_mail_recipient'
  )
  const canSendCtvDealMail = hasPermission(
    perms,
    'collaboratormonthlycommissionsummary.send_commission_detail_email_send'
  )
  const updateCtvDealMailRecipientMutation = useUpdateCtvDealMailRecipient()
  const sendCommissionEmailMutation = useSendCommissionEmail()
  const [sendingDealId, setSendingDealId] = useState<number | null>(null)

  const handleConfirmCtvDealMailRecipient = useCallback(
    async (
      dealId: number,
      next: { recipientEmployeeId: number | null; recipientEmail: string }
    ) => {
      try {
        await updateCtvDealMailRecipientMutation.mutateAsync({
          id: summary.id,
          dealId,
          data: {
            recipient_employee_id: next.recipientEmployeeId,
            email: next.recipientEmail,
          },
        })
        toastService.success('Đã cập nhật người nhận mail')
      } catch (err) {
        toastService.error(extractErrorMessage(err))
      }
    },
    [summary.id, updateCtvDealMailRecipientMutation]
  )

  const handleSendCtvDealMail = useCallback(
    async (dealId: number) => {
      setSendingDealId(dealId)
      try {
        await sendCommissionEmailMutation.mutateAsync({
          role: 'collaborators',
          kind: 'detail',
          id: summary.id,
          dealId,
        })
        toastService.success('Đã gửi email đối chiếu')
      } catch (err) {
        toastService.error(extractErrorMessage(err))
      } finally {
        setSendingDealId(null)
      }
    },
    [summary.id, sendCommissionEmailMutation]
  )

  const linesCtv = useMemo<DealPayableGroup[]>(
    () => Object.values(summary.sources?.sale?.by_deal || {}) as DealPayableGroup[],
    [summary.sources?.sale?.by_deal]
  )
  // Nhận hộ sàn F2: các khoản role F2 nằm ở bucket riêng — không render sẽ lệch với tổng.
  const linesF2 = useMemo<DealPayableGroup[]>(
    () => Object.values(summary.sources?.f2?.by_deal || {}) as DealPayableGroup[],
    [summary.sources?.f2?.by_deal]
  )
  const f2Subtotal = Number(summary.sources?.f2?.subtotal ?? summary.f2_total ?? 0)
  const holdReleaseSubtotal = Number(summary.sources?.sale?.hold_release_subtotal || 0)
  const slkTotal = Number(summary.slk_total || 0)
  const bonusTotal = Number(summary.bonus_total || 0)

  const profile = {
    name: collaborator?.name || summary.beneficiary_collaborator_detail?.fullname || '—',
    mst: collaborator?.tax_code || summary.beneficiary_collaborator_detail?.tax_code || '—',
    contact: collaborator?.phone || summary.beneficiary_collaborator_detail?.phone || '—',
    cccd: collaborator?.id_number || summary.beneficiary_collaborator_detail?.identity_no || '—',
    account_mgr:
      collaborator?.account_manager_detail?.fullname ||
      summary.beneficiary_collaborator_detail?.account_manager_detail?.fullname ||
      '—',
    bank: collaborator?.bank_account
      ? `${collaborator.bank_account}${collaborator.bank_name ? ` (${collaborator.bank_name})` : ''}`
      : summary.beneficiary_collaborator_detail?.bank_account || '—',
    sign_date: summary.beneficiary_collaborator_detail?.contract_sign_date
      ? formatDate(summary.beneficiary_collaborator_detail.contract_sign_date)
      : '—',
  }

  const invoiceMissing = Number(
    (summary as any).missing_contract_amount || (summary as any).held_contracts_amount || 0
  )
  const paidAmount = Number((summary as any).paid_amount || (summary as any).amount_paid || 0)

  // Phần HH CTV thực ghi nhận (subtotal per deal) — KHÔNG dùng total_commission (phí toàn deal,
  // phóng đại khi deal nhiều người tham gia).
  const dealGross = useMemo(() => sumDealSubtotals(linesCtv), [linesCtv])
  const f2Gross = useMemo(() => sumDealSubtotals(linesF2), [linesF2])

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title={`Chi tiết HH CTV · Kỳ ${summary.month}/${summary.year}`}
        enableBackButton
        handleBackButton={onBack}
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
                  {formatCurrencyVND(Number(summary.net_payable))}{' '}
                  <span className="text-base font-semibold text-neutral-400 underline decoration-1 underline-offset-2">
                    đ
                  </span>
                </div>
                <div className="mt-2 text-xs text-neutral-500">
                  Đã chi:{' '}
                  <strong className="text-neutral-700">{formatCurrencyVND(paidAmount)} đ</strong> /{' '}
                  {formatCurrencyVND(Number(summary.net_payable))} đ
                </div>
              </div>
              <div className="flex flex-col items-end gap-1.5 text-right">
                <MonthlySummaryStatusBadge status={summary.status as MonthlyStatus} />
                {canShowConfirmMonthlyButton(summary.status) && (
                  <Button size="small" loading={isConfirming} onClick={handleConfirm}>
                    Duyệt bảng kê
                  </Button>
                )}
              </div>
            </div>

            <div className="border-border-1 border-t bg-white px-6 py-5">
              <div className="mb-4 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
                Diễn giải
              </div>
              <div className="flex flex-col">
                <BreakdownRow
                  label="HH CTV ghi nhận từ các deal"
                  value={dealGross}
                  note={`${linesCtv.length} deal`}
                />
                <BreakdownRow
                  label="HH thực tế theo tiền CĐT đã thu"
                  value={Number(summary.pre_tax_total)}
                  note="Phần được hạch toán kỳ này (gồm mọi nguồn bên dưới)"
                  sub
                />
                {(f2Subtotal > 0 || linesF2.length > 0) && (
                  <BreakdownRow
                    label="HH F2 (nhận hộ sàn)"
                    value={f2Subtotal}
                    note={`${linesF2.length} deal — CTV nhận hộ hoa hồng sàn F2`}
                  />
                )}
                {holdReleaseSubtotal > 0 && (
                  <BreakdownRow
                    label="Hoàn giữ kỳ trước (release)"
                    value={holdReleaseSubtotal}
                    note="Đã cộng vào HH thực tế kỳ này"
                    sub
                  />
                )}
                {slkTotal > 0 && <BreakdownRow label="HH SLK" value={slkTotal} />}
                {bonusTotal > 0 && <BreakdownRow label="Thưởng (import)" value={bonusTotal} />}
                {invoiceMissing > 0 && (
                  <BreakdownRow
                    label="(Tạm) Tạm hoãn do thiếu HĐ CTV"
                    value={-invoiceMissing}
                    note="CTV chưa ký đủ HĐ — phần này không chi được kỳ này, sẽ chi sau khi ký đủ"
                    color="text-data-orange-default"
                  />
                )}
                {Number(summary.hold_amount) > 0 && (
                  <BreakdownRow
                    label="Tạm giữ (Giữ thêm / CCMG)"
                    value={-Number(summary.hold_amount)}
                    color="text-data-orange-default"
                    action={
                      summary.status === MonthlyStatus.DRAFT && (
                        <Button
                          size="small"
                          className="border-border-1 h-6 px-2 text-[11px] font-medium"
                          variant="secondary"
                          leftIcon={<IconPencil className="h-3 w-3" />}
                          onClick={() => setIsHoldDialogOpen(true)}
                        >
                          Sửa
                        </Button>
                      )
                    }
                  />
                )}
                {Number(summary.recovered_advance_amount) > 0 && (
                  <BreakdownRow
                    label="Trừ hoàn ứng"
                    value={-Number(summary.recovered_advance_amount)}
                    color="text-amber-500"
                    action={
                      summary.status === MonthlyStatus.DRAFT && (
                        <Button
                          size="small"
                          className="border-border-1 h-6 px-2 text-[11px] font-medium"
                          variant="secondary"
                          leftIcon={<IconPencil className="h-3 w-3" />}
                          onClick={() => setIsAdvanceDialogOpen(true)}
                        >
                          {ADVANCE_REQUEST_ACTION_LABEL_SHORT}
                        </Button>
                      )
                    }
                  />
                )}
                <BreakdownRow
                  label="Thuế TNCN"
                  value={-Number(summary.pit_amount)}
                  note={`Phương pháp: ${summary.pit_method === PitMethod.FLAT_10 ? 'Tạm khấu trừ 10%' : summary.pit_method === PitMethod.PROGRESSIVE ? 'Biểu thuế lũy tiến' : 'Không khấu trừ'}${summary.pit_rate ? ` (${formatNumber(parseFloat(summary.pit_rate) * 100)}%)` : ''}`}
                  color="text-data-red-default"
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

          {/* Right column: Info */}
          <div className="flex flex-col gap-6">
            <PayeeCard
              title="Cộng tác viên"
              name={profile.name}
              code={
                summary.beneficiary_collaborator ? (
                  <Link
                    to={APP_PATH.COLLABORATOR_DETAIL.replace(
                      ':id',
                      String(summary.beneficiary_collaborator)
                    )}
                    className="text-brand-primary font-mono text-[13px] font-medium hover:underline"
                  >
                    {summary.beneficiary_collaborator}
                  </Link>
                ) : (
                  '—'
                )
              }
              rows={[
                { label: 'CCCD', value: profile.cccd },
                { label: 'Liên hệ', value: profile.contact },
                { label: 'NV phụ trách', value: profile.account_mgr },
                { label: 'TK nhận', value: profile.bank },
                { label: 'Ngày ký HĐ', value: profile.sign_date },
              ]}
            />
          </div>
        </div>

        {/* Section ①: Deals */}
        <div
          className="border-border-1 overflow-hidden rounded-lg border bg-white shadow-sm"
          style={{ borderLeft: '4px solid #9858AF' }}
        >
          <div
            className="border-border-1 flex items-center justify-between border-b px-6 py-4"
            style={{ backgroundColor: '#9858AF0D' }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-[#9858AF] text-[14px] font-semibold text-white">
                1
              </div>
              <div>
                <div className="text-[14px] font-semibold text-neutral-900">
                  Các deal CTV đã chốt — góp vào HH kỳ này
                </div>
              </div>
            </div>
            <Chip label={`${linesCtv.length} deal`} variant={ColoredValueVariant.BLUE} />
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
                  <th className="px-6 py-3 font-medium whitespace-nowrap">
                    {DEAL_COLUMN_LABELS.source}
                  </th>
                  <th className="px-6 py-3 text-right font-medium whitespace-nowrap">
                    Giá tính phí
                  </th>
                  <th className="px-6 py-3 text-right font-medium whitespace-nowrap">% HH</th>
                  <th className="px-6 py-3 text-right font-medium whitespace-nowrap">HH CTV</th>
                  <th className="px-6 py-3 text-right font-medium whitespace-nowrap">Thưởng</th>
                  <th className="px-6 py-3 text-right font-medium whitespace-nowrap">
                    HH ghi nhận
                  </th>
                  <th className="px-6 py-3 text-right font-medium whitespace-nowrap">
                    % tiền về (đã thu)
                  </th>
                  <th className="px-6 py-3 text-right font-medium whitespace-nowrap">
                    % tiền về (ghi nhận)
                  </th>
                  <th className="px-6 py-3 text-right font-medium whitespace-nowrap">HH thực tế</th>
                  <th className="px-6 py-3 font-medium whitespace-nowrap">HĐ CTV</th>
                  <th className="px-6 py-3 font-medium whitespace-nowrap">Nhân viên nhận mail</th>
                  <th className="px-6 py-3 font-medium whitespace-nowrap">Email</th>
                  <th className="px-6 py-3 font-medium whitespace-nowrap">Gửi mail</th>
                </tr>
              </thead>
              <tbody className="divide-border-1 divide-y bg-white">
                {linesCtv.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-neutral-500">
                        <IconReceipt className="h-8 w-8 text-neutral-300" />
                        <span className="text-[13px]">Không có deal nào</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  linesCtv.map((deal: any, i: number) => {
                    const sources = buildDealCommissionSources(deal)
                    // CỘNG mọi item cùng pct_type, không `find` item đầu: một CTV nhận hộ nhiều
                    // sale trên cùng một căn có nhiều item cùng loại trong MỘT group (BE key
                    // by_deal theo deal_id) — xem sumDealItemsByPctType.
                    const ctvComm = sumDealItemsByPctType(
                      deal,
                      APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.F1_SALE.pct
                    )
                    const mvBonus = sumDealItemsByPctType(
                      deal,
                      APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.F1_BONUS.pct
                    )

                    const feePrice = Number(deal.fee_calculation_price || 0)

                    // % của cả dòng = Σ (% từng nguồn × tỷ lệ nhận hộ). Header group chỉ nói
                    // được cho MỘT share nên nhận hộ nhiều người đọc ra rate của một người.
                    const commPctVal = getDealAggregateCommissionPct(deal)
                    const formattedCommPct =
                      commPctVal != null && commPctVal > 0
                        ? `${formatNumber(commPctVal, { minimumFractionDigits: 4, maximumFractionDigits: 4 })}%`
                        : '—'

                    const isSigned = !deal.items?.some(
                      (item: any) => item.status === 'held_contracts' || item.status === 'held'
                    )

                    return (
                      <tr key={i} className="text-[13px] hover:bg-neutral-50">
                        <td className="px-6 py-3.5 align-top">
                          <DealCodeCell deal={deal} canViewSplitSheet={canViewSplitSheet} />
                        </td>
                        <td className="px-6 py-3.5 align-top">
                          <DealProjectCell deal={deal} />
                        </td>
                        <td className="px-6 py-3.5 align-top">
                          <DealSourceCell
                            sources={sources}
                            dealLabel={String(deal.deal_code || deal.deal_id)}
                          />
                        </td>
                        <td className="px-6 py-3.5 text-right font-normal text-neutral-600">
                          {formatCurrencyVND(feePrice)}
                        </td>
                        <td className="px-6 py-3.5 text-right font-normal text-neutral-600">
                          {formattedCommPct}
                        </td>
                        <td className="px-6 py-3.5 text-right font-normal text-neutral-600">
                          {formatCurrencyVND(ctvComm)}
                        </td>
                        <td className="px-6 py-3.5 text-right font-normal text-neutral-600">
                          {formatCurrencyVND(mvBonus)}
                        </td>
                        <td className="px-6 py-3.5 text-right font-normal text-neutral-600">
                          {/* HH khi tiền về ĐỦ 100% — KHÔNG in lại `subtotal` (phần đã hạch
                              toán kỳ này), nếu không hai cột "% tiền về" ngay bên phải không
                              giải thích được gì. Cùng luật với bảng Mục ① màn Sale. */}
                          {getDealRecognisedTotal(deal) === null
                            ? '—'
                            : formatCurrencyVND(getDealRecognisedTotal(deal) as number)}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <DealProgressPctCell pct={getDealPaymentProgressPct(deal)} />
                          <DealReceiptDates dates={deal.receipt_dates} />
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <DealProgressPctCell
                            pct={getDealDialFeeProgressPct(deal)}
                            barClassName="bg-violet-500"
                          />
                        </td>
                        <td className="px-6 py-3.5 text-right font-semibold text-blue-700">
                          {formatCurrencyVND(Number(deal.subtotal))}
                        </td>
                        <td className="px-6 py-3.5">
                          {isSigned ? (
                            <span className="flex items-center gap-1.5 text-xs font-normal text-green-600">
                              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-green-100 text-[10px] font-bold text-green-600">
                                ✓
                              </span>
                              Đã ký
                            </span>
                          ) : (
                            <span className="flex items-center gap-1.5 text-xs font-normal text-amber-500">
                              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-100 text-[10px] font-bold text-amber-500">
                                !
                              </span>
                              Chưa ký
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5">
                          <DealRecipientEditableCell
                            dealCode={deal.deal_code}
                            recipientEmployee={
                              deal.ctv_recipient_employee_id
                                ? {
                                    type: 'employee',
                                    id: deal.ctv_recipient_employee_id,
                                    name: deal.ctv_recipient_employee_name || '',
                                  }
                                : null
                            }
                            recipientEmail={deal.ctv_recipient_email || ''}
                            disabled={!canEditCtvDealMailRecipient}
                            onConfirm={(next) =>
                              handleConfirmCtvDealMailRecipient(deal.deal_id, next)
                            }
                          />
                        </td>
                        <td className="px-6 py-3.5 text-neutral-600">
                          <span
                            className="block max-w-[200px] truncate"
                            title={deal.ctv_recipient_email || ''}
                          >
                            {deal.ctv_recipient_email || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <CtvDealSendMailButton
                            dealCode={deal.deal_code}
                            email={deal.ctv_recipient_email || ''}
                            sentAt={deal.ctv_recipient_sent_at}
                            disabled={!canSendCtvDealMail}
                            isSending={sendingDealId === deal.deal_id}
                            onSend={() => handleSendCtvDealMail(deal.deal_id)}
                          />
                        </td>
                      </tr>
                    )
                  })
                )}
                <tr className="border-border-1 bg-neutral-20 border-t-2 text-[13px] font-bold text-neutral-900">
                  <td colSpan={3} className="px-6 py-4">
                    TỔNG
                  </td>
                  <td className="px-6 py-4 text-right">
                    {formatCurrencyVND(
                      linesCtv.reduce(
                        (acc, deal) => acc + Number(deal.fee_calculation_price || 0),
                        0
                      )
                    )}
                  </td>
                  <td className="px-6 py-4 text-right"></td>
                  {/* Cộng mọi item cùng pct_type — `find` chỉ lấy item đầu nên dòng TỔNG lệch
                      với chính các dòng bên trên khi CTV nhận hộ nhiều sale trên một căn. */}
                  <td className="px-6 py-4 text-right">
                    {formatCurrencyVND(
                      sumItemsByPctType(
                        linesCtv,
                        APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.F1_SALE.pct
                      )
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {formatCurrencyVND(
                      sumItemsByPctType(
                        linesCtv,
                        APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.F1_BONUS.pct
                      )
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">{formatCurrencyVND(dealGross)}</td>
                  {/* hai cột "% tiền về" — không cộng tổng được, chúng là tỷ lệ */}
                  <td className="px-6 py-4 text-right"></td>
                  <td className="px-6 py-4 text-right"></td>
                  <td className="text-data-green-default px-6 py-4 text-right">
                    {formatCurrencyVND(dealGross)}
                  </td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4"></td>
                  <td className="px-6 py-4"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section ②: HH F2 nhận hộ sàn (bucket sources.f2 — nếu không render sẽ lệch với tổng) */}
        {linesF2.length > 0 && (
          <div
            className="border-border-1 overflow-hidden rounded-lg border bg-white shadow-sm"
            style={{ borderLeft: '4px solid #D97706' }}
          >
            <div
              className="border-border-1 flex items-center justify-between border-b px-6 py-4"
              style={{ backgroundColor: '#D977060D' }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-amber-600 text-[14px] font-semibold text-white">
                  2
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-neutral-900">
                    Hoa hồng F2 nhận hộ sàn — góp vào HH kỳ này
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    CTV đứng ra nhận thay hoa hồng của sàn F2 (chia thực nhận đổi người nhận)
                  </div>
                </div>
              </div>
              <Chip label={`${linesF2.length} deal`} variant={ColoredValueVariant.ORANGE} />
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
                    <th className="px-6 py-3 font-medium whitespace-nowrap">
                      {DEAL_COLUMN_LABELS.source}
                    </th>
                    <th className="px-6 py-3 font-medium whitespace-nowrap">Ngày thu</th>
                    <th className="px-6 py-3 text-right font-medium whitespace-nowrap">
                      HH ghi nhận
                    </th>
                    <th className="px-6 py-3 font-medium whitespace-nowrap">Nhân viên nhận mail</th>
                    <th className="px-6 py-3 font-medium whitespace-nowrap">Email</th>
                    <th className="px-6 py-3 font-medium whitespace-nowrap">Gửi mail</th>
                  </tr>
                </thead>
                <tbody className="divide-border-1 divide-y bg-white">
                  {linesF2.map((deal, i) => {
                    const sources = buildDealCommissionSources(deal)
                    return (
                      <tr key={i} className="text-[13px] hover:bg-neutral-50">
                        <td className="px-6 py-3.5 align-top">
                          <DealCodeCell deal={deal} canViewSplitSheet={canViewSplitSheet} />
                        </td>
                        <td className="px-6 py-3.5 align-top">
                          <DealProjectCell deal={deal} />
                        </td>
                        <td className="px-6 py-3.5 align-top">
                          <DealSourceCell
                            sources={sources}
                            dealLabel={String(deal.deal_code || deal.deal_id)}
                          />
                        </td>
                        <td className="px-6 py-3.5 align-top text-neutral-400">
                          {/* Bảng này không có cột "% tiền về" để gắn ngày thu vào dưới như hai
                              bảng kia, nên ngày thu vẫn đứng cột riêng. */}
                          {deal.receipt_dates?.[0] ? formatDate(deal.receipt_dates[0]) : '—'}
                        </td>
                        <td className="px-6 py-3.5 text-right font-semibold text-amber-700">
                          {formatCurrencyVND(Number(deal.subtotal))}
                        </td>
                        {/* CR STT33 / QA 90180245319284 — cùng bộ cột gửi mail như bảng ①:
                            HH ở đây là tiền của sàn, mặc định về hòm mail kế toán. */}
                        <td className="px-6 py-3.5">
                          <DealRecipientEditableCell
                            dealCode={deal.deal_code}
                            recipientEmployee={
                              deal.ctv_recipient_employee_id
                                ? {
                                    type: 'employee',
                                    id: deal.ctv_recipient_employee_id,
                                    name: deal.ctv_recipient_employee_name || '',
                                  }
                                : null
                            }
                            recipientEmail={deal.ctv_recipient_email || ''}
                            disabled={!canEditCtvDealMailRecipient}
                            onConfirm={(next) =>
                              handleConfirmCtvDealMailRecipient(deal.deal_id, next)
                            }
                          />
                        </td>
                        <td className="px-6 py-3.5 text-neutral-600">
                          <span
                            className="block max-w-[200px] truncate"
                            title={deal.ctv_recipient_email || ''}
                          >
                            {deal.ctv_recipient_email || '—'}
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <CtvDealSendMailButton
                            dealCode={deal.deal_code}
                            email={deal.ctv_recipient_email || ''}
                            sentAt={deal.ctv_recipient_sent_at}
                            disabled={!canSendCtvDealMail}
                            isSending={sendingDealId === deal.deal_id}
                            onSend={() => handleSendCtvDealMail(deal.deal_id)}
                          />
                        </td>
                      </tr>
                    )
                  })}
                  <tr className="border-border-1 bg-neutral-20 border-t-2 text-[13px] font-bold text-neutral-900">
                    <td colSpan={4} className="px-6 py-4">
                      TỔNG
                    </td>
                    <td className="px-6 py-4 text-right text-amber-700">
                      {formatCurrencyVND(f2Gross)}
                    </td>
                    <td colSpan={3} className="px-6 py-4"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        <RedirectedOutSection items={getRedirectedOutItems(summary)} />
      </div>
      <CommMonthlySummaryHoldDialog
        isOpen={isHoldDialogOpen}
        onClose={() => setIsHoldDialogOpen(false)}
        summaryId={summary.id}
        role="collaborators"
        currentAmount={Number(summary.hold_amount || 0)}
        currentReason={summary.hold_reason || 'MANUAL'}
        currentNote={summary.hold_note || ''}
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
        role="collaborators"
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

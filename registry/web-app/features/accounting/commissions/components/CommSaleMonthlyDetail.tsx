import { useMemo, useState, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { APP_PATH } from '@/routes'
import { Button, PageTitle, Chip, TextArea } from '@/components/ui'
import AppDialog from '@/components/dialog/AppDialog'
import { useAuth } from '@/store'
import { useAbility } from '@/lib/ability'
import { hasPermission } from '@/utils/auth'
import {
  IconPencilsimple,
  IconPlus,
  IconPencil,
  IconTrash,
  IconLock,
  IconArrowcounterclockwise,
  IconEnvelopesimple,
} from '@/assets/icons'
import { formatCurrencyVND } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { exportElementToPdf } from '@/utils/exportChart'
import toastService from '@/services/toast-service'
import type { MonthlyBeneficiaryCommissionSummaryDetail } from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import {
  useSalesAdvanceRecoveryBreakdown,
  useAggregateMonthlySummary,
  useReopenMonthlySummary,
} from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import { useConfirmMonthlySummaryAction } from '../hooks/useConfirmMonthlySummaryAction'
import { MonthlySummaryStatusBadge } from '@/features/accounting/monthly-summaries/components/MonthlySummaryStatusBadge'
import PayeeCard from './PayeeCard'
import { ColoredValueVariant } from '@/api/schema'
import { canShowConfirmMonthlyButton } from '../utils/comm-confirm-button'
import {
  sumDealSubtotals,
  getRedirectedOutItems,
  getAdvancePitCredit,
  getTaxableIncomeBase,
  getPayrollInfo,
  type DealPayableGroup,
} from '@/features/accounting/commissions/utils/summary-breakdown'
import SaleDealCommissionTable from './SaleDealCommissionTable'
import { RedirectedOutSection } from './RedirectedOutSection'
import { CommMonthlySummaryHoldDialog } from './CommMonthlySummaryHoldDialog'
import { CommMonthlySummaryAdvanceDialog } from './CommMonthlySummaryAdvanceDialog'
import CommSummaryAdjustmentDialog from './CommSummaryAdjustmentDialog'
import { CommSummaryEmailDialog } from './CommSummaryEmailDialog'
import {
  useCommissionHolds,
  type GetCommissionHoldsParams,
} from '@/features/accounting/commission-holds/services/commission-hold-service'
import {
  useDeleteImportedBonusEntry,
  getImportedBonusService,
  useImportedBonusBatches,
} from '@/features/accounting/imported-bonuses/services/imported-bonus-service'
import { QUERY_KEYS } from '@/constants'
import { extractErrorMessage } from '@/utils/error-utils'
import {
  MonthlySummaryStatus as MonthlyStatus,
  CommissionHoldStatus as CommissionHoldStatus,
} from '@/constants/api-schema-aliases'

// Human-readable labels for each hold reason, so the breakdown explains *why* each
// amount is withheld — mirrors the enum descriptions in the OpenAPI schema.
const HOLD_REASON_LABELS: Record<string, string> = {
  MISSING_BROKER_CERT: 'Thiếu chứng chỉ môi giới',
  EXPIRED_BROKER_CERT: 'Chứng chỉ môi giới đã hết hạn',
  PENDING_BROKER_CERT: 'Chờ cấp chứng chỉ môi giới',
  MISSING_CUSTOMER_DOCS: 'Thiếu tài liệu khách hàng',
  MANUAL: 'Tạo thủ công',
  CARRYOVER: 'Chuyển tiếp / chưa nhận trong kỳ này',
  PAYMENT_STOPPED: 'Đã ngừng thanh toán cả kỳ',
  OTHER: 'Khác',
}

type Props = {
  summary: MonthlyBeneficiaryCommissionSummaryDetail
  onBack: () => void
}

export const CommSaleMonthlyDetail = ({ summary, onBack }: Props) => {
  const queryClient = useQueryClient()
  const isPaid = summary.status === MonthlyStatus.PAID
  const [holdDialogConfig, setHoldDialogConfig] = useState<{
    isOpen: boolean
    taxBase: 'PRE_TAX' | 'POST_TAX'
    currentAmount: number
  } | null>(null)
  const [isAdvanceDialogOpen, setIsAdvanceDialogOpen] = useState(false)
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false)
  const [adjustmentDialogConfig, setAdjustmentDialogConfig] = useState<{
    isOpen: boolean
    entry?: any
  } | null>(null)

  const deleteEntryMutation = useDeleteImportedBonusEntry()
  const aggregateMutation = useAggregateMonthlySummary()
  const reopenMutation = useReopenMonthlySummary()
  const { handleConfirm, isConfirming } = useConfirmMonthlySummaryAction(summary, 'sales')

  const { user } = useAuth()
  const perms = user?.permissions || []
  const canReopen = hasPermission(perms, 'salesmonthlycommissionsummary.reopen')
  // Link "Phiếu chia" của Mục ① dẫn sang màn 20.8 — cùng gate như CommHoldDetail.
  const ability = useAbility()
  const canViewSplitSheet = ability.can('retrieve', 'dealperiodworksheet')

  // ⚠️ Hai cột "Nhân viên nhận mail" / "Email" của Mục ① đã BỎ theo yêu cầu 26/08/2026 (ba màn
  // Sale · CTV · F2 dùng chung một bộ cột; hai cột này chỉ có ở Sale). Chúng là UI DUY NHẤT của
  // CR STT31 (ClickUp 86eyexcqr) để sửa người nhận phiếu đối chiếu theo từng deal, nên endpoint
  // `PATCH .../sales/{id}/deal-recipients/` + quyền `salesmonthlycommissionsummary.deal_recipients`
  // giờ KHÔNG có chỗ nào gọi từ web. Mặc định do BE tính vẫn chạy và mail vẫn gửi đúng nhóm; chỉ
  // mất khả năng ĐÈ TAY. Muốn trả lại thì gắn vào `SaleDealCommissionTable` (hook
  // `useUpdateDealRecipients` + `DealRecipientEditableCell` vẫn còn nguyên, màn CTV đang dùng).
  // Reopen is only meaningful once the summary is frozen (CONFIRMED / EMAIL_SENT). DRAFT is already
  // editable; PAID is terminal and refused by the BE. The BE re-checks every guard and returns 409.
  const canShowReopen =
    canReopen &&
    (summary.status === MonthlyStatus.CONFIRMED || summary.status === MonthlyStatus.EMAIL_SENT)

  const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false)
  const [reopenReason, setReopenReason] = useState('')

  const handleReopen = async () => {
    try {
      await reopenMutation.mutateAsync({
        role: 'sales',
        id: summary.id,
        data: reopenReason.trim() ? { reason: reopenReason.trim() } : undefined,
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.ROLE_DETAIL('sales', summary.id),
      })
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.DETAIL(summary.id),
      })
      queryClient.invalidateQueries({ queryKey: ['accounting', 'monthly_summaries'] })
      toastService.success('Đã mở lại bảng kê về nháp')
      setIsReopenDialogOpen(false)
      setReopenReason('')
    } catch (err) {
      // BE returns 409 with a clear reason when reopen is unsafe (đã chi / đã gửi bank / đã áp
      // hoàn ứng / kỳ đã khóa) — surface it verbatim.
      toastService.error(extractErrorMessage(err))
    }
  }

  const handleDeleteAdjustment = async (item: any) => {
    const isTransfer = item.note?.startsWith('[ĐC]')
    const confirmMsg = isTransfer
      ? 'Đây là một giao dịch điều chuyển hoa hồng. Bạn có chắc chắn muốn xóa giao dịch này (xóa cả 2 dòng đối ứng)?'
      : 'Bạn có chắc chắn muốn xóa khoản điều chỉnh này?'

    if (!window.confirm(confirmMsg)) return

    try {
      await deleteEntryMutation.mutateAsync(item.id)

      if (isTransfer) {
        const batchesResp = await queryClient.fetchQuery({
          queryKey: QUERY_KEYS.ACCOUNTING.IMPORTED_BONUS_BATCHES.LIST({ page_size: 100 }),
          queryFn: () => getImportedBonusService().getImportedBonusBatches({ page_size: 100 }),
        })
        const batch = batchesResp?.results?.find(
          (b: any) => b.year === summary.year && b.month === summary.month && b.status === 'DRAFT'
        )
        if (batch) {
          const counterpart = batch.entries?.find((e: any) => {
            if (e.id === item.id) return false
            const matchCurrentIdInCounterpartNote = e.note?.includes(
              `#${summary.beneficiary_employee}`
            )
            const inverseAmount = Number(e.amount) === -Number(item.amount)
            return matchCurrentIdInCounterpartNote || inverseAmount
          })
          if (counterpart) {
            await deleteEntryMutation.mutateAsync(counterpart.id)
          }
        }
      }

      await aggregateMutation.mutateAsync({ year: summary.year, month: summary.month })

      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.DETAIL(summary.id),
      })
      toastService.success('Đã xóa điều chỉnh thành công')
    } catch (err) {
      toastService.error(extractErrorMessage(err))
    }
  }

  const sources = useMemo(() => {
    let s: any = summary.sources
    if (typeof s === 'string') {
      try {
        s = JSON.parse(s)
      } catch (e) {
        s = undefined
      }
    }
    return s || {}
  }, [summary.sources])

  const linesSale = useMemo<DealPayableGroup[]>(
    () => Object.values(sources?.sale?.by_deal || {}),
    [sources?.sale?.by_deal]
  )

  const payee = summary.beneficiary_employee_detail
  const bankAccount = payee?.default_bank_account
  const profile = {
    name: payee?.fullname || '—',
    code: payee?.code || '—',
    dept: payee?.department?.name || '—',
    block: payee?.block?.name || '—',
    branch: payee?.branch?.name || '—',
    level: payee?.position?.name || '—',
    employee_type: payee?.employee_type_display || '—',
    bank: bankAccount?.account_number
      ? `${bankAccount.bank?.code || bankAccount.bank?.name || ''} - ${bankAccount.account_number}`.trim()
      : '—',
    bank_holder: bankAccount?.account_name || '',
    join_date: payee?.start_date ? formatDate(payee.start_date) : '—',
  }

  const { data: batchesResp } = useImportedBonusBatches(
    {
      page_size: 100,
      status: 'CONFIRMED',
      year: summary.year,
      month: summary.month,
    } as any,
    { enabled: true }
  )
  const confirmedBatch = useMemo(() => {
    return batchesResp?.results?.find(
      (b: any) =>
        Number(b.year) === Number(summary.year) &&
        Number(b.month) === Number(summary.month) &&
        b.status === 'CONFIRMED'
    )
  }, [batchesResp, summary.year, summary.month])

  const confirmedEntries = useMemo(() => {
    if (!confirmedBatch) return []
    const employeeId = summary.beneficiary_employee ?? summary.beneficiary_employee_detail?.id
    return (
      confirmedBatch.entries?.filter((e: any) => Number(e.employee) === Number(employeeId)) || []
    )
  }, [confirmedBatch, summary.beneficiary_employee, summary.beneficiary_employee_detail?.id])

  const mappedConfirmedEntries = useMemo(() => {
    if (!confirmedBatch) return []
    return confirmedEntries.map((e: any) => ({
      line_id: e.id,
      entry_id: e.id,
      bonus_type: e.bonus_type,
      bonus_type_label:
        e.bonus_type === 'AD_SUPPORT'
          ? 'Hỗ trợ quảng cáo'
          : e.bonus_type === 'RECOGNITION'
            ? 'Thưởng vinh danh'
            : e.bonus_type === 'TET'
              ? 'Thưởng lễ tết'
              : 'Thưởng khác',
      amount: e.amount,
      is_taxable: e.is_taxable,
      already_paid_externally: e.already_paid_externally,
      counts_toward_payable: !e.already_paid_externally,
      pit_withheld_at_payment: e.pit_withheld_at_payment,
      note: e.note,
      isDraft: false,
      status: 'CONFIRMED',
      source: {
        batch_code: confirmedBatch.code,
        year: confirmedBatch.year,
        month: confirmedBatch.month,
        note: e.note,
      },
    }))
  }, [confirmedEntries, confirmedBatch])

  const bonusItems = useMemo(() => {
    const rawApiItems = sources?.bonus?.items || []
    const apiItems = rawApiItems.filter(
      (item: any) => item.status === 'CONFIRMED' || (!item.status && !item.isDraft)
    )
    const apiEntryIds = new Set(apiItems.map((item: any) => item.entry_id))
    const uniqueConfirmed = mappedConfirmedEntries.filter((e: any) => !apiEntryIds.has(e.entry_id))
    return [...apiItems, ...uniqueConfirmed]
  }, [sources, mappedConfirmedEntries])

  const isDraftBonus = (item: any) => Boolean(item.isDraft || item.status === 'DRAFT')

  const totalBonus = useMemo(() => {
    return bonusItems.reduce((sum: number, item: any) => {
      if (isDraftBonus(item)) return sum
      if (item.bonus_type === 'AD_SUPPORT') return sum
      if (!item.counts_toward_payable) return sum
      const val = Number(item.amount || 0)
      return val > 0 ? sum + val : sum
    }, 0)
  }, [bonusItems])

  const totalDeduction = useMemo(() => {
    return bonusItems.reduce((sum: number, item: any) => {
      if (isDraftBonus(item)) return sum
      if (item.bonus_type === 'AD_SUPPORT') return sum
      if (!item.counts_toward_payable) return sum
      const val = Number(item.amount || 0)
      return val < 0 ? sum + Math.abs(val) : sum
    }, 0)
  }, [bonusItems])

  // `totalDeduction` ở trên CHỈ gom các dòng thưởng nhập ngoài mang dấu âm. Khấu trừ vĩnh viễn
  // đi qua `sources.deduction` — BE trả về cho mọi subset (dispatch theo `line.source_role`,
  // không lọc theo màn), nên một người vừa có HH sale vừa bị khấu trừ trước đây xem màn này sẽ
  // không thấy khoản trừ đó ở đâu cả. Dấu đã âm tại nguồn — giữ nguyên, không đảo dấu.
  //
  // `sources.transfer_out` / `transfer_in` CỐ Ý không hiện ở đây: điều chuyển hoa hồng là nghiệp
  // vụ của màn Quản lý (bucket duy nhất được bật là TransferSourceBucket.MGMT), xem CommMgrDetail.
  // Khi rổ SALE được bật thì gắn lại 2 dòng đó ở đây — backend
  // docs/tech_debts/debt_transfer_deduction_sale_bucket_disabled_20260807.md §2 bước 7.
  const permanentDeductionItems = (sources as any)?.deduction?.items || []
  const permanentDeductionTotal = Number((sources as any)?.deduction?.subtotal || 0)

  const adSupport = useMemo(() => {
    return bonusItems
      .filter(
        (item: any) =>
          !isDraftBonus(item) && item.bonus_type === 'AD_SUPPORT' && item.counts_toward_payable
      )
      .reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0)
  }, [bonusItems])

  const bonusTaxOnly = useMemo(() => {
    return bonusItems
      .filter((item: any) => !isDraftBonus(item) && !item.counts_toward_payable)
      .reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0)
  }, [bonusItems])

  const clientBonusTotal = useMemo(() => {
    return bonusItems
      .filter((item: any) => !isDraftBonus(item) && !item.already_paid_externally)
      .reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0)
  }, [bonusItems])

  const totalTaxableBonus = useMemo(() => {
    return bonusItems
      .filter((item: any) => !isDraftBonus(item) && item.is_taxable)
      .reduce((sum: number, item: any) => sum + Number(item.amount || 0), 0)
  }, [bonusItems])

  const dealReceived = Number(summary.sale_total || 0)
  // Phần HH ghi nhận của CHÍNH người này (subtotal per deal) — không dùng total_commission
  // (phí toàn deal, phóng đại khi deal nhiều người tham gia).
  const dealGross = useMemo(() => sumDealSubtotals(linesSale as any), [linesSale])

  const preTaxHoldPct =
    Number(summary.sale_total) > 0
      ? Math.round((Number(summary.pre_tax_hold_amount || 0) / Number(summary.sale_total)) * 100)
      : 0
  const postTaxBase = Math.max(0, Number(summary.sale_total || 0) - Number(summary.pit_amount || 0))
  const postTaxHoldPct =
    postTaxBase > 0
      ? Math.round((Number(summary.post_tax_hold_amount || 0) / postTaxBase) * 100)
      : 0

  const payrollInfo = useMemo(() => getPayrollInfo(summary), [summary])

  // Section ③ — every ACTIVE hold for this beneficiary in this period. Covers both
  // monthly-grain holds (attached to the summary) and deal-grain holds (broker-cert
  // auto-holds on a deal/payee), so the list reconciles with `summary.hold_amount`.
  // A summary has exactly ONE beneficiary (BE model sets exactly one of
  // employee/collaborator/exchange per `beneficiary_type`), so the first-match filter
  // below never drops holds of a "other" type — there is no other type.
  const holdBeneficiaryId =
    summary.beneficiary_employee ??
    summary.beneficiary_collaborator ??
    summary.beneficiary_exchange ??
    null
  const holdFilters = useMemo<NonNullable<GetCommissionHoldsParams>>(() => {
    const filters: NonNullable<GetCommissionHoldsParams> = {
      status: CommissionHoldStatus.ACTIVE,
      commission_period_year: summary.year,
      commission_period_month: summary.month,
      page_size: 200,
    }
    if (summary.beneficiary_employee) filters.beneficiary_employee = summary.beneficiary_employee
    else if (summary.beneficiary_collaborator)
      filters.beneficiary_collaborator = summary.beneficiary_collaborator
    else if (summary.beneficiary_exchange)
      filters.beneficiary_exchange = summary.beneficiary_exchange
    return filters
  }, [
    summary.year,
    summary.month,
    summary.beneficiary_employee,
    summary.beneficiary_collaborator,
    summary.beneficiary_exchange,
  ])
  const { data: holdsResponse, isLoading: isHoldsLoading } = useCommissionHolds(holdFilters, {
    enabled: !!holdBeneficiaryId,
  })
  const holdLines = holdsResponse?.results ?? []
  // The footer shows `summary.hold_amount` (the snapshot that flows into net_payable).
  // The rows are a live query, so they can drift from the snapshot: the list was
  // truncated (more holds than page_size) or a hold was created/released after the
  // summary was aggregated. Detect that and surface it instead of showing a total the
  // visible rows silently don't add up to.
  const holdsSum = holdLines.reduce((acc, hl) => acc + Number(hl.hold_amount || 0), 0)
  const holdsTruncated = (holdsResponse?.count ?? holdLines.length) > holdLines.length
  const holdsDiverge =
    holdLines.length > 0 &&
    (holdsTruncated || Math.round(holdsSum) !== Math.round(Number(summary.hold_amount || 0)))

  // Section ④ — the advances that make up recovered_advance_amount (deducted this period).
  // Backend reconciles the list to the total (FIFO projection for DRAFT, exact ledger for CONFIRMED).
  const { data: advanceBreakdown, isLoading: isAdvancesLoading } = useSalesAdvanceRecoveryBreakdown(
    summary.id,
    { enabled: !!summary.id }
  )
  const advanceLines = advanceBreakdown ?? []

  const exportRef = useRef<HTMLDivElement>(null)
  const handleExportPdf = useCallback(async () => {
    if (!exportRef.current) return
    const filename = `PhieuChiTraHH_BanHang_Ky_${summary.month}_${summary.year}.pdf`
    try {
      await exportElementToPdf(exportRef.current, {
        fileName: filename,
        overlayMessage: 'Đang tạo PDF...',
      })
    } catch {
      toastService.error('Có lỗi xảy ra khi xuất PDF')
    }
  }, [summary])

  return (
    <div className="bg-surface-primary-default flex h-full flex-col overflow-hidden">
      <PageTitle
        title={`Phiếu chi trả HH Bán hàng · Kỳ ${summary.month}/${summary.year}`}
        enableBackButton
        handleBackButton={onBack}
        handleExportBtnIcon={handleExportPdf}
        titleExportBtnIcon="Xuất PDF"
        handleShowHistory={() => toastService.info('Tính năng đang phát triển')}
      />

      <div ref={exportRef} className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
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
              </div>
              <div className="flex flex-col items-end gap-1.5 text-right">
                <MonthlySummaryStatusBadge status={summary.status as unknown as MonthlyStatus} />
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
                  label="HH ghi nhận từ các deal đã chốt"
                  value={dealGross}
                  note={`${linesSale.length} deal - giá tính phí tổng ${formatCurrencyVND(
                    linesSale.reduce(
                      (acc, deal) => acc + Number(deal.fee_calculation_price || 0),
                      0
                    )
                  )}`}
                  color="text-neutral-900"
                />
                <BreakdownRow
                  label="HH thực tế theo tiền CĐT đã thu"
                  value={dealReceived}
                  note="Tỷ lệ tiền về quyết định phần được hạch toán kỳ này"
                  color="text-neutral-900"
                  sub
                />
                <BreakdownRow
                  label="Hỗ trợ quảng cáo (chi cùng kỳ)"
                  value={adSupport}
                  note="Chi trả cùng HH sale trong kỳ này"
                  color="text-data-green-default"
                />
                {totalBonus > 0 && (
                  <BreakdownRow
                    label="Thưởng khác chi trả kỳ này"
                    value={totalBonus}
                    note="Thưởng ngoài nghiệp vụ sale — chi cùng kỳ"
                    color="text-data-green-default"
                  />
                )}
                {totalDeduction > 0 && (
                  <BreakdownRow
                    label="Khấu trừ khác trong kỳ"
                    value={-totalDeduction}
                    note="Khấu trừ điều chuyển / phạt / thu hồi"
                    color="text-red-500"
                  />
                )}
                {permanentDeductionTotal !== 0 && (
                  <BreakdownRow
                    label="Khấu trừ vĩnh viễn (tiền ở lại công ty)"
                    value={permanentDeductionTotal}
                    note={permanentDeductionItems
                      .map((i: any) => i.reason_kind_display)
                      .filter(Boolean)
                      .join(', ')}
                    color="text-red-500"
                  />
                )}
                <BreakdownRow
                  label={`Tạm giữ trước thuế (${preTaxHoldPct}%)`}
                  value={-Number(summary.pre_tax_hold_amount || 0)}
                  note={
                    Number(summary.pre_tax_hold_amount || 0) > 0
                      ? 'Giữ trước thuế — giảm cả thu nhập tính thuế'
                      : '—'
                  }
                  color="text-neutral-700"
                />
                <BreakdownRow
                  label="Thưởng khác — chỉ tính thuế"
                  value={bonusTaxOnly}
                  taxOnly
                  note="Đã chi ở nơi khác (vinh danh / Tết…) — chỉ cộng vào cơ sở tính thuế, không cộng tiền mặt kỳ này"
                />
                <BreakdownRow
                  subtotal
                  label="Thu nhập tính thuế TNCN"
                  value={getTaxableIncomeBase(summary)}
                  note="(HH thực tế + hỗ trợ QC + thưởng, đã gồm thưởng chỉ-tính-thuế) − giữ trước thuế"
                />
                {bonusTaxOnly > 0 && (
                  <BreakdownRow
                    label="Thưởng đã chi ở nơi khác (không cộng lại thực nhận)"
                    value={-bonusTaxOnly}
                    note="Đã tính vào thu nhập chịu thuế ở trên — không chi lại kỳ này, tránh trả hai lần"
                    color="text-red-500"
                  />
                )}
                <BreakdownRow
                  label="Tổng thu nhập"
                  value={payrollInfo.totalIncome}
                  note="Số tiền thu nhập theo lương trước khi giảm trừ thuế, BHXH..."
                  color="text-neutral-700"
                />
                <BreakdownRow
                  label="Tổng tiền BH trích từ NLĐ"
                  value={payrollInfo.insuranceAmount}
                  note="Bao gồm BHXH (8%), BHYT (1,5%), BHTN (1%)"
                  color="text-neutral-700"
                />
                <BreakdownRow
                  label="Số người phụ thuộc"
                  value={payrollInfo.dependentsCount}
                  color="text-neutral-700"
                />
                <BreakdownRow
                  label="Tổng tiền giảm trừ"
                  value={payrollInfo.totalDeduction}
                  note="Bao gồm tổng tiền bảo hiểm + số tiền giảm trừ bản thân và người phụ thuộc"
                  color="text-neutral-700"
                />
                <BreakdownRow
                  label="Thuế TNCN trừ vào lương"
                  value={payrollInfo.salaryPit}
                  color="text-neutral-700"
                />
                <BreakdownRow
                  label="Thuế TNCN"
                  value={-Number(summary.pit_amount)}
                  note="Khấu trừ tại nguồn theo quy định"
                  color="text-neutral-700"
                />
                <BreakdownRow
                  label="Tạm giữ sau thuế"
                  value={-Number(summary.post_tax_hold_amount || 0)}
                  note={
                    Number(summary.post_tax_hold_amount || 0) > 0
                      ? 'Giữ sau thuế — chỉ giảm tiền mặt thực nhận'
                      : 'Không áp dụng'
                  }
                  color="text-neutral-700"
                />
                {getAdvancePitCredit(summary) > 0 && (
                  <BreakdownRow
                    label="Hoàn thuế đã khấu trừ khi tạm ứng"
                    value={getAdvancePitCredit(summary)}
                    note="Thuế TNCN đã tạm giữ lúc chi tạm ứng thưởng CĐT — không trừ lần hai"
                    color="text-data-green-default"
                  />
                )}
                <BreakdownRow
                  label="Trừ hoàn ứng / tạm ứng"
                  value={-Number(summary.recovered_advance_amount || 0)}
                  note={
                    Number(summary.recovered_advance_amount || 0) > 0
                      ? 'Diễn giải chi tiết tạm ứng'
                      : 'Tạm ứng và hoàn trả công tác'
                  }
                  color="text-neutral-700"
                />
                <div className="mt-4 flex items-center justify-between pt-2">
                  <div className="text-sm font-bold text-neutral-900">= THỰC NHẬN</div>
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

          {/* Right column: Info + quick actions */}
          <div className="flex flex-col gap-6">
            <PayeeCard
              name={profile.name}
              code={profile.code}
              employeeId={summary.beneficiary_employee_detail?.id}
              isWorking={payee?.is_working}
              statusDisplay={payee?.status_display}
              resignedBanner="Nhân sự đã nghỉ việc — hoa hồng kỳ này vẫn được chi theo quy định."
              rows={[
                { label: 'Phòng', value: profile.dept },
                { label: 'Khối KD', value: profile.block },
                { label: 'Chi nhánh', value: profile.branch },
                { label: 'Chức vụ', value: profile.level },
                { label: 'Loại nhân viên', value: profile.employee_type },
                {
                  label: 'TK nhận',
                  value: profile.bank,
                  subValue: profile.bank_holder || undefined,
                },
                { label: 'Ngày vào MV', value: profile.join_date },
              ]}
            />

            <div className="rounded-lg bg-transparent">
              <div className="mb-2 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
                Thao tác
              </div>
              <div className="flex flex-col gap-1.5">
                {canShowReopen && (
                  <Button
                    className="border-border-1 h-9 justify-start border bg-white px-3 text-[13px] font-medium text-orange-600 hover:bg-orange-50"
                    leftIcon={<IconArrowcounterclockwise className="h-4 w-4 text-orange-500" />}
                    onClick={() => setIsReopenDialogOpen(true)}
                  >
                    Mở lại bảng kê (về nháp)
                  </Button>
                )}
                {(summary.status || '').toUpperCase() === MonthlyStatus.DRAFT && (
                  <>
                    <Button
                      className="border-border-1 h-9 justify-start border bg-white px-3 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
                      leftIcon={<IconPencilsimple className="h-4 w-4 text-neutral-500" />}
                      onClick={() => {
                        const hasPostTax = Number(summary.post_tax_hold_amount || 0) > 0
                        setHoldDialogConfig({
                          isOpen: true,
                          taxBase: hasPostTax ? 'POST_TAX' : 'PRE_TAX',
                          currentAmount: hasPostTax
                            ? Number(summary.post_tax_hold_amount || 0)
                            : Number(summary.pre_tax_hold_amount || 0),
                        })
                      }}
                    >
                      Chỉnh tạm giữ HH
                    </Button>
                    <Button
                      className="border-border-1 h-9 justify-start border bg-white px-3 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
                      leftIcon={<IconPlus className="h-4 w-4 text-neutral-500" />}
                      onClick={() => setAdjustmentDialogConfig({ isOpen: true })}
                    >
                      Thêm thưởng / Khấu trừ
                    </Button>
                  </>
                )}
                {summary.status !== MonthlyStatus.DRAFT && (
                  <Button
                    className="border-border-1 h-9 justify-start border bg-white px-3 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
                    leftIcon={<IconEnvelopesimple className="h-4 w-4 text-neutral-500" />}
                    onClick={() => setIsEmailDialogOpen(true)}
                  >
                    Gửi email đối chiếu
                  </Button>
                )}

                <Link
                  to={`${APP_PATH.COMMISSION_HOLD}?employee_code=${payee?.code || ''}&status=ACTIVE`}
                  className="w-full"
                >
                  <Button
                    className="border-border-1 h-9 w-full justify-start border bg-white px-3 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
                    leftIcon={<IconLock className="h-4 w-4 text-neutral-500" />}
                  >
                    HH bị giữ chưa giải tỏa
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {/* Section ①: Sale Deals */}
          <div className="border-border-1 overflow-hidden rounded-lg border bg-white shadow-sm">
            <div className="border-border-1 bg-neutral-20 flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-[#1D4ED8] text-[14px] font-semibold text-white">
                  1
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-neutral-900">
                    Các deal đã chốt và gộp vào HH kỳ này
                  </div>
                  <div className="mt-0.5 text-[11px] text-neutral-500">
                    HH ghi nhận = HH bán hàng + thưởng nóng + thưởng. Phần "thực tế" = HH × % tiền
                    CĐT đã thu.
                  </div>
                </div>
              </div>
              <Chip label={`${linesSale.length} deal`} variant={ColoredValueVariant.BLUE} />
            </div>

            <SaleDealCommissionTable deals={linesSale} canViewSplitSheet={canViewSplitSheet} />
          </div>

          {/* Section ②: Other Bonuses & Supports */}
          <div className="border-border-1 flex flex-col gap-6 overflow-hidden rounded-lg border bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-[#D28A35] text-[14px] font-semibold text-white">
                2
              </div>
              <div>
                <div className="text-[14px] font-semibold text-neutral-900">
                  Thưởng khác & hỗ trợ ngoài HH bán hàng
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500">
                  Thưởng vinh danh / Tết / thi đua & hỗ trợ quảng cáo, Backoffice. Khoản "chỉ tính
                  thuế" đã chi ngoài, chỉ cộng vào cơ sở tính thuế kỳ này.
                </div>
              </div>
            </div>

            {/* Sub-section 2.1: Hỗ trợ quảng cáo / Backoffice */}
            {/* `backoffice` có HAI nhánh: `items` (payable rời) và `splits` (chia từ bảng hoa
                hồng phòng khối hỗ trợ — nguồn sống, CR 86eykq956). Chỉ đọc `items` thì tiền
                nằm ở `splits` biến mất khỏi bảng này trong khi vẫn cộng vào tổng. */}
            {((sources?.promo?.items && sources.promo.items.length > 0) ||
              (sources?.backoffice?.items && sources.backoffice.items.length > 0) ||
              (sources?.backoffice?.splits && sources.backoffice.splits.length > 0)) && (
              <div className="border-border-1 overflow-hidden rounded-lg border">
                <div className="bg-neutral-20 border-border-1 flex items-center justify-between border-b px-4 py-2">
                  <span className="text-[12px] font-bold text-neutral-700">
                    Hỗ trợ quảng cáo / Backoffice
                  </span>
                  <Chip
                    label={`${(sources?.promo?.items?.length || 0) + (sources?.backoffice?.items?.length || 0) + (sources?.backoffice?.splits?.length || 0)} khoản`}
                    variant={ColoredValueVariant.GREEN}
                    size="small"
                  />
                </div>
                <table className="w-full border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-border-1 bg-neutral-20/40 border-b text-[11px] tracking-wider text-neutral-500 uppercase">
                      <th className="px-6 py-2.5 font-medium">Khoản hỗ trợ</th>
                      <th className="px-6 py-2.5 font-medium">Phân loại</th>
                      <th className="px-6 py-2.5 text-right font-medium">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-border-1 divide-y bg-white">
                    {sources?.promo?.items?.map((item: any, idx: number) => (
                      <tr key={`promo-${idx}`} className="hover:bg-neutral-50/50">
                        <td className="px-6 py-3">
                          <span className="font-medium text-neutral-700">
                            {item.note || 'Hỗ trợ quảng cáo (Promo)'}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <Chip
                            label="Hỗ trợ QC"
                            variant={ColoredValueVariant.GREEN}
                            size="small"
                          />
                        </td>
                        <td className="text-data-green-default px-6 py-3 text-right font-mono font-semibold">
                          {formatCurrencyVND(Number(item.amount || 0))}
                        </td>
                      </tr>
                    ))}
                    {sources?.backoffice?.splits?.map((item: any, idx: number) => (
                      <tr key={`bo-split-${idx}`} className="hover:bg-neutral-50/50">
                        <td className="px-6 py-3">
                          <span className="font-medium text-neutral-700">
                            {item.department?.name
                              ? `Hoa hồng khối hỗ trợ — ${item.department.name}`
                              : 'Hoa hồng khối hỗ trợ'}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <Chip label="Hỗ trợ BO" variant={ColoredValueVariant.BLUE} size="small" />
                        </td>
                        <td className="text-data-green-default px-6 py-3 text-right font-mono font-semibold">
                          {formatCurrencyVND(Number(item.amount || 0))}
                        </td>
                      </tr>
                    ))}
                    {sources?.backoffice?.items?.map((item: any, idx: number) => (
                      <tr key={`bo-${idx}`} className="hover:bg-neutral-50/50">
                        <td className="px-6 py-3">
                          <span className="font-medium text-neutral-700">
                            {item.note || 'Hỗ trợ Backoffice'}
                          </span>
                        </td>
                        <td className="px-6 py-3">
                          <Chip label="Hỗ trợ BO" variant={ColoredValueVariant.BLUE} size="small" />
                        </td>
                        <td className="text-data-green-default px-6 py-3 text-right font-mono font-semibold">
                          {formatCurrencyVND(Number(item.amount || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Sub-section 2.2: Thưởng trong kỳ */}
            <div className="border-border-1 overflow-hidden rounded-lg border">
              <div className="bg-neutral-20 border-border-1 flex items-center justify-between border-b px-4 py-2">
                <span className="text-[12px] font-bold text-neutral-700">
                  Thưởng trong kỳ (Bonus)
                </span>
                <div className="flex items-center gap-2">
                  <Chip
                    label={`${bonusItems?.length || 0} khoản`}
                    variant={ColoredValueVariant.BLUE}
                    size="small"
                  />
                </div>
              </div>
              {!bonusItems || bonusItems.length === 0 ? (
                <div className="p-6 text-center text-sm text-neutral-400">
                  Không có khoản thưởng nào trong kỳ này.
                </div>
              ) : (
                <table className="w-full border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-border-1 bg-neutral-20/40 border-b text-[11px] tracking-wider text-neutral-500 uppercase">
                      <th className="px-4 py-2.5 font-medium">Đợt / Ghi chú</th>
                      <th className="px-4 py-2.5 font-medium">Loại thưởng</th>
                      <th className="px-4 py-2.5 text-center font-medium">Tính thuế</th>
                      <th className="px-4 py-2.5 text-center font-medium">Thực chi kỳ này</th>
                      <th className="px-4 py-2.5 text-right font-medium">Đã chi ngoài</th>
                      <th className="px-4 py-2.5 text-right font-medium">Thuế đã khấu</th>
                      <th className="px-4 py-2.5 text-center font-medium">Trạng thái</th>
                      <th className="px-4 py-2.5 text-right font-medium">Số tiền</th>
                      {summary.status === MonthlyStatus.DRAFT && (
                        <th className="w-24 px-4 py-2.5 text-center font-medium">Hành động</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-border-1 divide-y bg-white">
                    {bonusItems?.map((item: any, idx: number) => {
                      const isNegative = Number(item.amount || 0) < 0
                      return (
                        <tr key={`bonus-${idx}`} className="hover:bg-neutral-50/50">
                          <td className="px-4 py-3">
                            <code className="text-xs">{item.source?.batch_code || '—'}</code>
                            {item.note && (
                              <div className="mt-0.5 text-[11px] text-neutral-400">{item.note}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-normal text-neutral-600">
                            {item.bonus_type_label || '—'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.is_taxable ? (
                              <Chip label="Có" variant={ColoredValueVariant.RED} size="small" />
                            ) : (
                              <Chip label="Không" variant={ColoredValueVariant.GREY} size="small" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.counts_toward_payable ? (
                              <Chip label="Có" variant={ColoredValueVariant.GREEN} size="small" />
                            ) : (
                              <Chip label="Không" variant={ColoredValueVariant.GREY} size="small" />
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {item.already_paid_externally ? (
                              <span className="text-amber-600">Đã chi</span>
                            ) : (
                              <span className="text-neutral-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium text-red-500">
                            {Number(item.pit_withheld_at_payment || 0) > 0
                              ? formatCurrencyVND(Number(item.pit_withheld_at_payment))
                              : '0 đ'}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {item.isDraft ? (
                              <Chip
                                label="Nháp"
                                variant={ColoredValueVariant.ORANGE}
                                size="small"
                              />
                            ) : (
                              <Chip
                                label="Đã chốt"
                                variant={ColoredValueVariant.GREEN}
                                size="small"
                              />
                            )}
                          </td>
                          <td
                            className={`${isNegative ? 'text-red-600' : 'text-data-green-default'} px-4 py-3 text-right font-mono font-semibold`}
                          >
                            {isNegative ? '' : '+'}
                            {formatCurrencyVND(Number(item.amount || 0))}
                          </td>
                          {summary.status === MonthlyStatus.DRAFT && (
                            <td className="px-4 py-3 text-center align-middle">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  className="hover:text-brand-primary text-neutral-500"
                                  onClick={() =>
                                    setAdjustmentDialogConfig({ isOpen: true, entry: item })
                                  }
                                  title="Sửa"
                                >
                                  <IconPencil size={14} />
                                </button>
                                <button
                                  className="text-neutral-500 hover:text-red-600"
                                  onClick={() => handleDeleteAdjustment(item)}
                                  title="Xóa"
                                >
                                  <IconTrash size={14} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                    <tr className="border-border-1 bg-neutral-20/50 border-t text-[12px] font-semibold text-neutral-800">
                      <td colSpan={3} className="px-4 py-3">
                        TỔNG BUCKET THƯỞNG
                      </td>
                      <td colSpan={2} className="px-4 py-3 text-right">
                        Thực chi:{' '}
                        <span
                          className={`${clientBonusTotal < 0 ? 'text-red-600' : 'text-data-green-default'} font-bold`}
                        >
                          {formatCurrencyVND(clientBonusTotal)}
                        </span>
                      </td>
                      <td colSpan={isPaid ? 3 : 2} className="px-4 py-3 text-right">
                        Tính thuế:{' '}
                        <span className="font-bold text-neutral-600">
                          {formatCurrencyVND(totalTaxableBonus)}
                        </span>
                      </td>
                      {summary.status === MonthlyStatus.DRAFT && <td />}
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
            <div className="bg-green-10 border-green-30 text-green-70 rounded-lg border p-4 text-[12px]">
              <span>
                Cột <b>"Thực chi kỳ này"</b> được cộng vào số thực chi kỳ này; cột{' '}
                <b>"Tính thuế"</b> được cộng vào thu nhập tính thuế TNCN — kể cả khoản đã chi ngoài
                (vinh danh / Tết).
              </span>
            </div>
          </div>

          {/* Section ③: Detail of Holds & Advance Recoveries */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Box Left: Holds */}
            <div className="border-border-1 flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm">
              <div className="border-border-1 flex items-center justify-between border-b px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-[24px] w-[24px] flex-shrink-0 items-center justify-center rounded-full bg-[#D28A35]/80 text-[12px] font-semibold text-white">
                    3
                  </div>
                  <div>
                    <h4 className="text-[13px] font-semibold text-neutral-900">
                      Tạm giữ HH kỳ này
                    </h4>
                    <p className="mt-0.5 text-[11px] text-neutral-400">
                      {summary.hold_amount
                        ? 'Chi tiết các khoản tạm giữ đang áp dụng'
                        : 'Không áp dụng giữ HH'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-neutral-400">Tổng giữ</div>
                  <div className="text-sm font-bold text-orange-500">
                    -{formatCurrencyVND(Number(summary.hold_amount || 0))}
                  </div>
                </div>
              </div>

              <div className="border-border-1 grid grid-cols-2 border-b">
                <div className="border-border-1 flex flex-col gap-0.5 border-r p-4">
                  <span className="text-[11px] font-medium text-neutral-400">
                    Trước thuế ({preTaxHoldPct}%)
                  </span>
                  <span
                    className={`text-[14px] font-semibold ${Number(summary.pre_tax_hold_amount || 0) > 0 ? 'text-orange-500' : 'text-neutral-400'}`}
                  >
                    {Number(summary.pre_tax_hold_amount || 0) > 0 ? '-' : ''}
                    {formatCurrencyVND(Number(summary.pre_tax_hold_amount || 0))}
                  </span>
                  <span className="text-[10px] text-neutral-400">Giảm thu nhập tính thuế</span>
                </div>
                <div className="flex flex-col gap-0.5 p-4">
                  <span className="text-[11px] font-medium text-neutral-400">
                    Sau thuế ({postTaxHoldPct}%)
                  </span>
                  <span
                    className={`text-[14px] font-semibold ${Number(summary.post_tax_hold_amount || 0) > 0 ? 'text-orange-500' : 'text-neutral-400'}`}
                  >
                    {Number(summary.post_tax_hold_amount || 0) > 0 ? '-' : ''}
                    {formatCurrencyVND(Number(summary.post_tax_hold_amount || 0))}
                  </span>
                  <span className="text-[10px] text-neutral-400">Chỉ giảm tiền mặt thực nhận</span>
                </div>
              </div>

              <div className="min-h-[120px] flex-grow overflow-x-auto">
                {!holdBeneficiaryId ? (
                  <div className="p-8 text-center text-sm text-neutral-400">
                    Chưa xác định được người thụ hưởng để tra cứu khoản tạm giữ.
                  </div>
                ) : isHoldsLoading ? (
                  <div className="p-8 text-center text-sm text-neutral-400">
                    Đang tải danh sách tạm giữ…
                  </div>
                ) : holdLines.length === 0 ? (
                  <div className="p-8 text-center text-sm text-neutral-400">
                    Không có khoản nào bị giữ trong kỳ này.
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left text-[12px]">
                    <thead>
                      <tr className="border-border-1 bg-neutral-20 border-b text-[10px] tracking-wider text-neutral-500 uppercase">
                        <th className="px-4 py-2 font-medium">Mã giữ</th>
                        <th className="px-4 py-2 font-medium">Loại</th>
                        <th className="px-4 py-2 text-right font-medium">Tỷ lệ</th>
                        <th className="px-4 py-2 text-right font-medium">Số tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border-1 divide-y">
                      {holdLines.map((hl) => (
                        <tr key={hl.id} className="hover:bg-neutral-50/50">
                          <td className="px-4 py-2 text-neutral-600">
                            <Link
                              to={`${APP_PATH.COMMISSION_HOLD}?search=${hl.code || ''}&tax_base=${hl.tax_base || 'PRE_TAX'}`}
                              className="text-action-primary-red-default font-semibold hover:underline"
                            >
                              {hl.code || `#${hl.id}`}
                            </Link>
                            {hl.hold_reason && (
                              <div className="text-[10px] text-neutral-400">
                                {HOLD_REASON_LABELS[hl.hold_reason] || hl.hold_reason}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2">
                            {hl.tax_base === 'PRE_TAX' ? (
                              <Chip
                                label="Trước thuế"
                                variant={ColoredValueVariant.ORANGE}
                                size="small"
                              />
                            ) : (
                              <Chip
                                label="Sau thuế"
                                variant={ColoredValueVariant.GREY}
                                size="small"
                              />
                            )}
                          </td>
                          <td className="px-4 py-2 text-right font-medium text-neutral-600">
                            {Number(hl.hold_pct) > 0 ? `${Number(hl.hold_pct) * 100}%` : '—'}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-semibold text-orange-500">
                            -{formatCurrencyVND(Number(hl.hold_amount || 0))}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-border-1 bg-neutral-20/50 border-t text-[12px] font-semibold text-neutral-800">
                        <td colSpan={3} className="px-4 py-3">
                          TỔNG TẠM GIỮ
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-orange-500">
                          -{formatCurrencyVND(Number(summary.hold_amount || 0))}
                        </td>
                      </tr>
                      {holdsDiverge && (
                        <tr className="border-border-1 border-t">
                          <td colSpan={4} className="px-4 py-2 text-[11px] text-amber-600">
                            ⚠ Chi tiết đang hiển thị {holdLines.length} khoản (tổng{' '}
                            {formatCurrencyVND(holdsSum)}) chưa khớp số chốt bên trên — danh sách có
                            thể bị cắt bớt hoặc thay đổi sau khi tổng hợp kỳ.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Box Right: Advance Recoveries */}
            <div className="border-border-1 flex flex-col overflow-hidden rounded-lg border bg-white shadow-sm">
              <div className="border-border-1 flex items-center justify-between border-b px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-[24px] w-[24px] flex-shrink-0 items-center justify-center rounded-full bg-[#9858AF]/80 text-[12px] font-semibold text-white">
                    4
                  </div>
                  <div>
                    <h4 className="text-[13px] font-semibold text-neutral-900">
                      Trừ hoàn ứng / tạm ứng
                    </h4>
                    <p className="mt-0.5 text-[11px] text-neutral-400">
                      {Number(summary.recovered_advance_amount || 0) > 0
                        ? 'Chi tiết các khoản hoàn ứng tự động'
                        : 'Không có khoản tạm ứng'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-neutral-400">Tổng trừ</div>
                  <div className="text-sm font-semibold text-purple-600">
                    {Number(summary.recovered_advance_amount || 0) > 0 ? '-' : ''}
                    {formatCurrencyVND(Number(summary.recovered_advance_amount || 0))}
                  </div>
                </div>
              </div>

              <div className="min-h-[180px] flex-grow overflow-x-auto">
                {isAdvancesLoading ? (
                  <div className="p-8 text-center text-sm text-neutral-400">
                    Đang tải danh sách hoàn ứng…
                  </div>
                ) : advanceLines.length === 0 ? (
                  <div className="p-8 text-center text-sm text-neutral-400">
                    Không có khoản tạm ứng nào cần trừ.
                  </div>
                ) : (
                  <table className="w-full border-collapse text-left text-[12px]">
                    <thead>
                      <tr className="border-border-1 bg-neutral-20 border-b text-[10px] tracking-wider text-neutral-500 uppercase">
                        <th className="px-4 py-2 font-medium">Mã đề xuất</th>
                        <th className="px-4 py-2 font-medium">Lý do</th>
                        <th className="px-4 py-2 text-right font-medium">Số tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-border-1 divide-y">
                      {advanceLines.map((al) => (
                        <tr key={al.advance_id} className="hover:bg-neutral-50/50">
                          <td className="px-4 py-2 font-normal text-neutral-600">
                            {al.advance_code || `#${al.advance_id}`}
                          </td>
                          <td
                            className="max-w-[200px] truncate px-4 py-2 font-normal text-neutral-500"
                            title={al.request_reason}
                          >
                            {al.request_reason || '—'}
                          </td>
                          <td className="px-4 py-2 text-right font-mono font-semibold text-purple-600">
                            -{formatCurrencyVND(Number(al.recovered_amount || 0))}
                          </td>
                        </tr>
                      ))}
                      <tr className="border-border-1 bg-neutral-20/50 border-t text-[12px] font-semibold text-neutral-800">
                        <td colSpan={2} className="px-4 py-3">
                          TỔNG TRỪ HOÀN ỨNG
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-purple-600">
                          {Number(summary.recovered_advance_amount || 0) > 0 ? '-' : ''}
                          {formatCurrencyVND(Number(summary.recovered_advance_amount || 0))}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          <RedirectedOutSection items={getRedirectedOutItems(summary)} />
        </div>
      </div>
      {holdDialogConfig && (
        <CommMonthlySummaryHoldDialog
          isOpen={holdDialogConfig.isOpen}
          onClose={() => setHoldDialogConfig(null)}
          summaryId={summary.id}
          role="sales"
          currentAmount={holdDialogConfig.currentAmount}
          currentTaxBase={holdDialogConfig.taxBase}
          currentReason={(summary as any).hold_reason || 'MANUAL'}
          currentNote={(summary as any).hold_note || ''}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: ['accounting', 'monthly_summaries'],
            })
          }}
        />
      )}
      <CommMonthlySummaryAdvanceDialog
        isOpen={isAdvanceDialogOpen}
        onClose={() => setIsAdvanceDialogOpen(false)}
        summaryId={summary.id}
        role="sales"
        onSuccess={() => {
          queryClient.invalidateQueries({
            queryKey: ['accounting', 'monthly_summaries'],
          })
        }}
      />
      {isEmailDialogOpen && (
        <CommSummaryEmailDialog
          isOpen={isEmailDialogOpen}
          onClose={() => setIsEmailDialogOpen(false)}
          role="sales"
          summaryId={summary.id}
          payeeName={profile.name}
        />
      )}
      {summary.status === MonthlyStatus.DRAFT && adjustmentDialogConfig?.isOpen && (
        <CommSummaryAdjustmentDialog
          open={adjustmentDialogConfig.isOpen}
          onOpenChange={(open) => setAdjustmentDialogConfig(open ? adjustmentDialogConfig : null)}
          year={summary.year}
          month={summary.month}
          employeeId={summary.beneficiary_employee!}
          entry={adjustmentDialogConfig.entry}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.ROLE_DETAIL('sales', summary.id),
            })
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.DETAIL(summary.id),
            })
          }}
        />
      )}
      <AppDialog
        variant="alert"
        open={isReopenDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsReopenDialogOpen(false)
            setReopenReason('')
          }
        }}
        title="Mở lại bảng kê về nháp?"
        confirmText="Mở lại bảng kê"
        cancelText="Huỷ"
        loading={reopenMutation.isPending}
        onCancel={() => {
          setIsReopenDialogOpen(false)
          setReopenReason('')
        }}
        onConfirm={handleReopen}
        content={
          <div className="flex flex-col gap-4">
            <div className="text-[13px] text-neutral-700">
              Bảng kê sẽ chuyển về trạng thái <b>Nháp</b> để tổng hợp lại sau khi chia lại thực nhận
              cho người tham gia. Thao tác này sẽ:
            </div>
            <ul className="list-disc space-y-1 pl-5 text-[13px] text-neutral-600">
              <li>
                Gỡ các dòng chi trong đợt chi chưa thanh toán và đưa đợt chi đã duyệt về nháp.
              </li>
              <li>Xoá bút toán khấu trừ thuế TNCN của kỳ này (sẽ tạo lại khi duyệt lại).</li>
              <li>
                Cần <b>tổng hợp lại</b> và <b>duyệt lại</b> bảng kê sau khi chỉnh xong.
              </li>
            </ul>
            <div className="bg-orange-10 border-orange-30 text-orange-70 rounded-lg border p-3 text-[12px]">
              Không mở lại được nếu bảng kê đã chi tiền, đã gửi ngân hàng, đã áp hoàn ứng, hoặc kỳ
              kế toán đã khoá.
            </div>
            <TextArea
              label="Lý do mở lại (tuỳ chọn)"
              placeholder="Nhập lý do mở lại bảng kê..."
              rows={3}
              value={reopenReason}
              onChange={(value) => setReopenReason(value)}
            />
          </div>
        }
      />
    </div>
  )
}

const BreakdownRow = ({
  label,
  value,
  note,
  color = 'text-neutral-900',
  sub,
  action,
  subtotal,
  taxOnly,
}: any) => {
  if (subtotal) {
    return (
      <div className="border-border-1 bg-neutral-20/50 my-2 flex items-center justify-between rounded-lg border p-3.5">
        <div className="flex-1 pr-3">
          <div className="text-[13px] font-semibold text-neutral-900">{label}</div>
          {note && <div className="mt-0.5 text-[11px] text-neutral-400">{note}</div>}
        </div>
        <div className="text-sm font-bold whitespace-nowrap text-neutral-900">
          {formatCurrencyVND(value)}
        </div>
      </div>
    )
  }

  const valColor = taxOnly ? 'text-neutral-400 font-medium italic font-mono' : `${color} font-mono`
  return (
    <div
      className={`border-border-1 flex items-start justify-between border-b py-3 last:border-0 hover:bg-neutral-50/30 ${
        sub ? 'border-border-1 border-dashed pl-4' : ''
      }`}
    >
      <div className="flex flex-1 flex-col pr-4">
        <div className="flex items-center gap-2">
          {sub && <span className="mr-1 text-neutral-300">↳</span>}
          <span
            className={`text-[13px] ${
              sub ? 'font-normal text-neutral-500' : 'font-normal text-neutral-700'
            }`}
          >
            {label}
          </span>
          {taxOnly && (
            <span className="bg-neutral-30 ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold text-neutral-500">
              không vào tiền mặt
            </span>
          )}
          {action && action}
        </div>
        {note && <span className="mt-0.5 text-[11px] text-neutral-400">{note}</span>}
      </div>
      <div className={`text-right text-[13px] font-medium ${valColor}`}>
        {formatCurrencyVND(value)}
      </div>
    </div>
  )
}

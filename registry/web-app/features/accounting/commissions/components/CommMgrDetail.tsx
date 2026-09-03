import { useCallback, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Chip, Button } from '@/components/ui'
import {
  IconReceipt,
  IconPencilsimple,
  IconCaretdown,
  IconCaretup,
  IconFunnel,
} from '@/assets/icons'
import { formatCurrencyVND, formatNumber, formatPctFloor } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import {
  getMonthlySummaryLines,
  MonthlyBeneficiaryCommissionSummaryDetail,
  useManagementHhqlLines,
} from '@/features/accounting/monthly-summaries/services/monthly-summary-service'
import { MonthlySummaryStatusBadge } from '@/features/accounting/monthly-summaries/components/MonthlySummaryStatusBadge'
import { SimplePagination } from '@/components/ui/table/SimplePagination'
import PayeeCard from './PayeeCard'
import {
  buildMgmtBonusDealRows,
  type MgmtBonusCell as MgmtBonusCellData,
} from '@/features/accounting/commissions/utils/summary-breakdown'
import {
  buildSlkStatementRows,
  sumSlkStatementRows,
} from '@/features/accounting/commissions/utils/slk-statement-rows'
import {
  buildPromoProjectRows,
  sumPromoProjectRows,
  type PromoProjectRow as PromoProjectRowType,
} from '@/features/accounting/commissions/utils/promo-by-project'
import { ColoredValueVariant, LinkedExchangeRevenueLineF2_source as F2Source } from '@/api/schema'
import { PitMethod, MonthlySummaryStatus as MonthlyStatus } from '@/constants/api-schema-aliases'
import { APP_PATH } from '@/routes'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { QUERY_KEYS } from '@/constants'
import { useDialog } from '@/hooks/useDialog'
import { useAbility } from '@/lib/ability'
import { useAllAccountingPeriods } from '@/features/accounting/accounting-periods/services/accounting-period-service'
import PromotionManualEntryFormDialog, {
  type PromotionManualEntryFormValues,
} from '@/features/accounting/promotion-manual-entries/components/PromotionManualEntryFormDialog'
import {
  useCreatePromotionManualEntry,
  usePatchPromotionManualEntry,
} from '@/features/accounting/promotion-manual-entries/services/promotion-manual-entry-service'
import {
  PROMOTION_MANUAL_ENTRY_ACTIONS as MANUAL_ENTRY_A,
  PROMOTION_MANUAL_ENTRY_SUBJECT as MANUAL_ENTRY_SUBJECT,
} from '@/features/accounting/promotion-manual-entries/constants/promotion-manual-entry-constants'
import toastService from '@/services/toast-service'
import { extractErrorMessage } from '@/utils/error-utils'
import AppDialog from '@/components/dialog/AppDialog'
import KpiHhqlOrgFilter, { type HhqlOrgFilterRef } from './KpiHhqlOrgFilter'
import {
  activeHhqlChips,
  buildHhqlOrgOptions,
  countHhqlFilters,
  EMPTY_HHQL_ORG_FILTER,
  hasSomethingToFilter,
  readHhqlFilterFromParams,
  toHhqlApiParams,
  writeHhqlFilterToParams,
  type HhqlOrgFilterValue,
} from '@/features/accounting/commissions/utils/hhql-org-filter'
import CommissionTransferDialog from './CommissionTransferDialog'
import { useCancelCommissionTransfer } from '@/features/accounting/monthly-summaries/services/commission-transfer-service'

// Client-side paging for the KPI/HHQL sub-table (data is embedded in the summary, not a paged API).
const HHQL_PAGE_SIZE = 10
const HHQL_PAGE_SIZE_OPTIONS = [10, 25, 50]

type Props = {
  summary: MonthlyBeneficiaryCommissionSummaryDetail
  onOpenHoldDialog: () => void
  onOpenAdvanceDialog?: () => void
}

export const CommMgrDetail = ({ summary, onOpenHoldDialog }: Props) => {
  const queryClient = useQueryClient()
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false)
  const lines = getMonthlySummaryLines(summary)

  // Bảng kê này là chứng từ của MỘT đợt chi: đợt QUẢN LÝ (MGMT). Mọi con số tổng phải lấy từ
  // `payout_waves` — khối BE tính riêng cho từng đợt — chứ TUYỆT ĐỐI không lấy các field ở header
  // summary (`pre_tax_total` / `hold_amount` / `pit_amount` / `net_payable`): chúng là số của CẢ
  // KỲ, gộp luôn đợt SALE.
  //
  // Đây là lỗi có thật, không phải phòng xa: đo trên mvl_local_staging, summary #3 kỳ 07/2026 in
  // các mục cộng lại 2.857.385đ dưới một cái tổng 38.574.696đ, vì 35.717.311đ còn lại là tiền đợt
  // SALE. Chứng từ này có nút *Xuất PDF* / *Gửi bảng kê*.
  //
  // Khối wave cân bằng theo thiết kế: `payable − hold − pit − other_deductions === net`
  // (xem `monthly_summary_service.build_wave_breakdown`).
  // TODO(schema): bỏ cast khi `payout_waves` có trong schema.ts sau `yarn api:update`.
  const mgmtWave = ((summary as any).payout_waves || []).find((w: any) => w.wave === 'MGMT')
  const waveGross = Number(mgmtWave?.gross || 0)
  const wavePayable = Number(mgmtWave?.payable || 0)
  const waveHold = Number(mgmtWave?.hold || 0)
  const wavePit = Number(mgmtWave?.pit || 0)
  const waveOtherDeductions = Number(mgmtWave?.other_deductions || 0)
  const waveNet = Number(mgmtWave?.net || 0)

  const breakdown = useMemo(() => {
    return {
      groupA: Number(summary.promo_total || 0),
      groupB: lines
        .filter((l: any) => l.source_role === 'MGMT' && l.pct_type !== 'project_director')
        .reduce((s: number, l: any) => s + Number(l.amount || 0), 0),
      projectDirector: lines
        .filter((l: any) => l.source_role === 'MGMT' && l.pct_type === 'project_director')
        .reduce((s: number, l: any) => s + Number(l.amount || 0), 0),
      hhql: Number(summary.hhql_total || 0),
      slk: Number(summary.slk_total || 0),
      // Hoa hồng khối hỗ trợ (SUPPORT_FLAT) — CR 86eykq956. Thiếu dòng này thì bảng kê
      // hiện đủ 7 mục = 0đ trong khi "Tổng hoa hồng trước thuế" vẫn ra số, vì tổng lấy
      // `pre_tax_total` còn các mục cộng từ `breakdown`.
      backoffice: Number(summary.backoffice_total || 0),
      // HHGDDA (20.8.7): % on cumulative cash received per project. A separate money
      // stream from the per-deal TBC `pct_type=project_director` bonus in groupB.
      directorCommission: Number(summary.project_director_total || 0),
    }
  }, [summary, lines])

  // Mẫu số của tỷ trọng "Cấu trúc HH" = Σ ĐÚNG các ô đang hiện ở khối đó, không hơn không kém.
  // Rổ nào có trong mẫu số mà không có ô hiển thị thì tỷ trọng các ô còn lại bị pha loãng bởi
  // tiền không giải thích được ở đâu — và Σ các ô sẽ không bao giờ ra 100%.
  const totalBreakdown =
    breakdown.groupA +
    breakdown.groupB +
    // a2.C (Giám đốc dự án) tạm ẩn khỏi màn này — không tính vào tổng
    breakdown.hhql +
    breakdown.slk +
    breakdown.backoffice +
    breakdown.directorCommission

  // Điều chuyển hoa hồng: khấu trừ HHQL để thưởng cho người khác + khấu trừ vĩnh viễn.
  // Tất cả đều TRƯỚC THUẾ; phía "out"/"deduction" lưu âm tại nguồn nên giữ nguyên dấu.
  // hhql_total ở mục 3 vẫn là số GỘP (không net) — phần net đã nằm ở pre_tax_total.
  const transferOutItems = (summary.sources as any)?.transfer_out?.items || []
  const transferInItems = (summary.sources as any)?.transfer_in?.items || []
  const permanentDeductionItems = (summary.sources as any)?.deduction?.items || []
  const transferOutTotal = Number((summary.sources as any)?.transfer_out?.subtotal || 0)
  const transferInTotal = Number((summary.sources as any)?.transfer_in?.subtotal || 0)
  const permanentDeductionTotal = Number((summary.sources as any)?.deduction?.subtotal || 0)
  // Mọi dòng "out" cùng thuộc MỘT phiếu (1 phiếu ACTIVE / người / rổ / kỳ) nên lấy id ở dòng đầu.
  // Cơ sở khấu trừ = gross của chính đợt chi này (`TransferSourceBucket.MGMT` phía BE là cùng một
  // tập role), không cộng tay lại 6 cột subtotal — cộng tay là bản định nghĩa thứ hai sẽ trôi.
  const mgmtWaveTotal = waveGross

  const activeTransferId = transferOutItems[0]?.transfer_id
  const cancelTransferMutation = useCancelCommissionTransfer()

  const linesA = useMemo(() => lines.filter((l: any) => l.source_role === 'PROMO'), [lines])
  // Mục 6 gom theo dự án nên đếm dự án, không đếm dòng payee.
  const promoProjectCount = useMemo(
    () => buildPromoProjectRows(linesA).filter((row) => !row.isManual).length,
    [linesA]
  )

  // Mục ④ là nơi kế toán ĐANG đọc tiền của người này, nên chỗ thêm/sửa khoản nhập tay phải nằm
  // ngay đây — bắt họ nhớ sang màn danh sách rồi tự chọn lại đúng người + đúng kỳ là mở đường
  // ghi nhầm người. Màn riêng vẫn giữ cho việc rà soát cả kỳ.
  const ability = useAbility()
  const { displayCustom, displayClose } = useDialog()
  const canCreateManualEntry = ability.can(MANUAL_ENTRY_A.CREATE, MANUAL_ENTRY_SUBJECT)
  const canEditManualEntry = ability.can(MANUAL_ENTRY_A.PARTIAL_UPDATE, MANUAL_ENTRY_SUBJECT)
  const isSummaryEditable = summary.status === MonthlyStatus.DRAFT
  const createManualEntry = useCreatePromotionManualEntry()
  const patchManualEntry = usePatchPromotionManualEntry()
  const { data: allPeriods } = useAllAccountingPeriods({
    enabled: canCreateManualEntry && isSummaryEditable,
  })
  // Bảng kê chỉ mang year/month; endpoint cần id kỳ kế toán.
  const summaryPeriodId = useMemo(() => {
    const match = (allPeriods ?? []).find(
      (period: any) => period.year === summary.year && period.month === summary.month
    )
    return match?.id ?? null
  }, [allPeriods, summary.year, summary.month])

  const refreshSummary = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['accounting', 'monthly-summaries'] })
  }, [queryClient])

  const openManualEntryDialog = useCallback(
    (row?: { manualEntryId: number | null; amountTotal: number; manualReason: string }) => {
      const editing = row?.manualEntryId != null
      displayCustom({
        title: editing
          ? 'Sửa khoản HH xúc tiến theo thoả thuận'
          : 'Thêm khoản HH xúc tiến theo thoả thuận',
        size: 'md',
        hideFooter: true,
        content: (
          <PromotionManualEntryFormDialog
            mode={editing ? 'edit' : 'create'}
            lockContext
            defaultValues={{
              employee: (summary as any).beneficiary_employee ?? null,
              accounting_period: summaryPeriodId,
              expected_amount: editing ? String(row?.amountTotal ?? '') : '',
              reason: editing ? row?.manualReason || '' : '',
            }}
            onCancel={displayClose}
            onSubmit={async (values: PromotionManualEntryFormValues) => {
              if (editing) {
                await patchManualEntry.mutateAsync({
                  id: row!.manualEntryId as number,
                  data: {
                    expected_amount: String(values.expected_amount ?? '0'),
                    reason: values.reason,
                  },
                })
                toastService.success('Đã cập nhật khoản HH xúc tiến.')
              } else {
                await createManualEntry.mutateAsync({
                  employee: Number(values.employee),
                  accounting_period: Number(values.accounting_period),
                  expected_amount: String(values.expected_amount ?? '0'),
                  reason: values.reason,
                })
                toastService.success('Đã thêm khoản HH xúc tiến.')
              }
              refreshSummary()
              displayClose()
            }}
          />
        ),
      })
    },
    [
      createManualEntry,
      displayClose,
      displayCustom,
      patchManualEntry,
      refreshSummary,
      summary,
      summaryPeriodId,
    ]
  )
  const linesB = useMemo(
    () => lines.filter((l: any) => l.source_role === 'MGMT' && l.pct_type !== 'project_director'),
    [lines]
  )
  const linesHhql = useMemo(() => lines.filter((l: any) => l.source_role === 'HHQL'), [lines])

  // ── Bộ lọc org của mục ② HHQL (CR 86ey9mytk) ────────────────────────────────────────────────
  // Lựa chọn rút từ chính các dòng của phiếu, không phải danh mục tổ chức toàn công ty — xem
  // `buildHhqlOrgOptions`. Việc LỌC thì chạy ở server; mảng này chỉ để dựng danh sách chọn.
  const [searchParams, setSearchParams] = useSearchParams()
  const hhqlFilter = useMemo(() => readHhqlFilterFromParams(searchParams), [searchParams])
  const hhqlOrgOptions = useMemo(() => buildHhqlOrgOptions(linesHhql), [linesHhql])
  const hhqlFilterCount = countHhqlFilters(hhqlFilter)
  const [isHhqlFilterOpen, setIsHhqlFilterOpen] = useState(false)
  const hhqlFilterRef = useRef<HhqlOrgFilterRef>(null)

  const applyHhqlFilter = useCallback(
    (next: HhqlOrgFilterValue) => {
      setSearchParams(writeHhqlFilterToParams(searchParams, next), { replace: true })
    },
    [searchParams, setSearchParams]
  )

  const handleHhqlFilterConfirm = useCallback(() => {
    const form = hhqlFilterRef.current?.getValues()
    applyHhqlFilter({
      branch: (form?.branch ?? []).map(Number),
      block: (form?.block ?? []).map(Number),
      department: (form?.department ?? []).map(Number),
    })
    setIsHhqlFilterOpen(false)
  }, [applyHhqlFilter])

  const handleHhqlChipRemove = useCallback(
    (key: keyof HhqlOrgFilterValue, id: number) => {
      applyHhqlFilter({ ...hhqlFilter, [key]: hhqlFilter[key].filter((v) => v !== id) })
    },
    [applyHhqlFilter, hhqlFilter]
  )

  const handleHhqlFilterClear = useCallback(
    () => applyHhqlFilter(EMPTY_HHQL_ORG_FILTER),
    [applyHhqlFilter]
  )
  const linesDirectorCommission = useMemo(
    () => lines.filter((l: any) => l.source_role === 'PROJECT_DIRECTOR'),
    [lines]
  )
  const linesSlk = useMemo(() => lines.filter((l: any) => l.source_role === 'SLK'), [lines])
  // Hoa hồng khối hỗ trợ (SUPPORT_FLAT) — dòng chia từ bảng hoa hồng phòng, không gắn deal.
  const linesBackoffice = useMemo(
    () => lines.filter((l: any) => l.source_role === 'BACKOFFICE'),
    [lines]
  )
  // One khoản per source pool. The BE already emits one entry per pool (CR 86eykqk16), so
  // the count is just the row count — it used to guess "2 khoản" from amount_linked/
  // amount_company, which no longer exist and never covered director pools anyway.
  const slkKhoanCount = linesSlk.length

  const empDetail = summary.beneficiary_employee_detail
  const bankAccount = empDetail?.default_bank_account
  const bankStr = bankAccount?.account_number
    ? `${bankAccount.bank?.code || bankAccount.bank?.name || ''} - ${bankAccount.account_number}`.trim()
    : '—'
  const joinDateStr = empDetail?.start_date ? formatDate(empDetail.start_date) : '—'

  const profile = {
    name: empDetail?.fullname || '—',
    code: empDetail?.code || String(summary.beneficiary_employee || '—'),
    levelCode: empDetail?.position?.code || '',
    levelName: empDetail?.position?.name || '—',
    dept: empDetail?.department?.name || '—',
    branch: empDetail?.branch?.name || '—',
    block: empDetail?.block?.name || '—',
    bank: bankStr || '—',
    bank_holder: bankAccount?.account_name || '',
    join_date: joinDateStr || '—',
  }

  // % tạm giữ tính trên cơ sở của CHÍNH đợt chi này, không phải `pre_tax_total` của cả kỳ —
  // cùng một số tiền giữ mà chia cho mẫu số cả kỳ sẽ ra một tỷ lệ nhỏ hơn thực tế.
  const holdPct = wavePayable > 0 ? Math.round((waveHold / wavePayable) * 100) : 0

  const pitMethodLabel =
    summary.pit_method === PitMethod.FLAT_10
      ? 'Tạm khấu trừ 10%'
      : summary.pit_method === PitMethod.PROGRESSIVE
        ? 'Biểu thuế lũy tiến'
        : 'Không khấu trừ'
  const pitRatePct = summary.pit_rate ? `${formatNumber(parseFloat(summary.pit_rate) * 100)}%` : ''
  const pitNote = `Phương pháp: ${pitMethodLabel}${pitRatePct ? ` (${pitRatePct})` : ''}`

  // Structure bar: the inner fill's WIDTH is the share of the total (clamped 0-100), so the
  // bar reads as a proportion. A full 100% share is highlighted green; partial shares are blue.
  const barWidth = (pct: number) => `${Math.max(0, Math.min(100, pct))}%`
  const barColorClass = (pct: number) =>
    pct >= 99.95 ? 'bg-data-green-default' : 'bg-data-blue-default'

  // Khối "Cấu trúc HH" — MỘT ô cho MỖI mục của bảng kê, cùng số thứ tự và cùng biểu thức tiền với
  // dòng Diễn giải tương ứng. Trước đây viết tay 6 khối JSX gần giống hệt nhau và đã **thiếu hẳn
  // mục Giám đốc dự án + Backoffice** trong khi vẫn cộng chúng vào mẫu số — dựng từ list để thêm
  // mục mới là sửa một dòng, không thể quên nữa.
  const structureTiles = [
    { so: 1, label: 'Thưởng HH quản lý', value: breakdown.groupB },
    { so: 2, label: 'Hoa hồng quản lý KPI/HHQL', value: breakdown.hhql },
    { so: 3, label: 'Hoa hồng Sàn liên kết', value: breakdown.slk },
    { so: 4, label: 'Hoa hồng Đầu tư, Xúc tiến & Phát triển Dự án', value: breakdown.groupA },
    { so: 5, label: 'Hoa hồng Giám đốc dự án', value: breakdown.directorCommission },
    // Cùng điều kiện với dòng Diễn giải số 6 và Section ⑥ (Backoffice): chỉ phát sinh với nhân sự khối hỗ trợ.
    ...(breakdown.backoffice !== 0
      ? [{ so: 6, label: 'Hoa hồng khối hỗ trợ (Backoffice)', value: breakdown.backoffice }]
      : []),
  ]
  return (
    <div className="flex flex-grow flex-col gap-6 overflow-y-auto px-7 pt-4 pb-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Big breakdown */}
        <div className="border-border-1 flex flex-col gap-0 overflow-hidden rounded-lg border bg-white shadow-sm lg:col-span-2">
          <div className="flex items-start justify-between px-6 py-5">
            <div>
              <div className="text-data-green-default mb-1 text-[11px] font-semibold tracking-wider uppercase">
                Thực nhận đợt chi Quản lý
              </div>
              <div className="text-data-green-default flex items-baseline gap-1 text-[32px] leading-none font-extrabold">
                {formatCurrencyVND(waveNet)}{' '}
                <span className="text-base font-semibold text-neutral-400 underline decoration-1 underline-offset-2">
                  đ
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 text-right">
              <MonthlySummaryStatusBadge status={summary.status as unknown as MonthlyStatus} />
            </div>
          </div>

          <div className="border-border-1 border-t bg-white px-6 py-5">
            <div className="mb-4 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
              Diễn giải
            </div>
            <div className="flex flex-col">
              <BreakdownRow
                label="1 - Thưởng HH quản lý"
                value={breakdown.groupB}
                note="4 hạng mục: Thưởng quản lý, HH bổ sung DA, Thưởng quản lý từ CDT, Thưởng quản lý bổ sung"
                color="text-neutral-900"
              />
              <BreakdownRow
                label="2 - Hoa hồng quản lý KPI/HHQL"
                value={breakdown.hhql}
                color="text-neutral-900"
              />
              <BreakdownRow
                label="3 - Hoa hồng Sàn liên kết"
                value={breakdown.slk}
                note="Hoa hồng phân bổ từ sàn liên kết (SLK)"
                color="text-neutral-900"
              />
              <BreakdownRow
                label="4 - Hoa hồng Đầu tư, Xúc tiến & Phát triển Dự án"
                value={breakdown.groupA}
                note="5 hạng mục: Đầu mối QH, Hoạch định, Đóng gói, Hỗ trợ KD, Điều phối"
                color="text-neutral-900"
              />
              <BreakdownRow
                label="5 - Hoa hồng Giám đốc dự án"
                value={breakdown.directorCommission}
                note="% trên tiền thực về lũy kế của dự án (âm = đòi lại)"
                color="text-neutral-900"
              />
              {/* Chỉ hiện khi có tiền: khác 7 mục trên, khoản này chỉ phát sinh với nhân sự
                  thuộc phòng khối hỗ trợ, thêm một dòng "0 đ" cho mọi người khác là nhiễu. */}
              {breakdown.backoffice !== 0 && (
                <BreakdownRow
                  label="6 - Hoa hồng khối hỗ trợ (Backoffice)"
                  value={breakdown.backoffice}
                  note="Chia từ bảng hoa hồng phòng khối hỗ trợ (HCNS, Kế toán, Marketing, Tuyển dụng, Thư ký KD)"
                  color="text-neutral-900"
                />
              )}

              {transferOutTotal !== 0 && (
                <BreakdownRow
                  label="Khấu trừ hoa hồng quản lý để thưởng cho người khác"
                  value={transferOutTotal}
                  note={transferOutItems
                    .map((i: any) => i.counterparty?.full_name)
                    .filter(Boolean)
                    .join(', ')}
                  color="text-red-500"
                  action={
                    summary.status === MonthlyStatus.DRAFT &&
                    activeTransferId && (
                      <span className="flex items-center gap-1">
                        <button
                          type="button"
                          className="text-[11px] text-neutral-500 underline hover:text-neutral-700"
                          onClick={() => setIsTransferDialogOpen(true)}
                        >
                          Sửa
                        </button>
                        <span className="text-neutral-300">·</span>
                        <button
                          type="button"
                          className="text-[11px] text-red-500 underline hover:text-red-600"
                          disabled={cancelTransferMutation.isPending}
                          onClick={async () => {
                            try {
                              await cancelTransferMutation.mutateAsync({
                                id: activeTransferId,
                                reason: 'Huy phieu khau tru tren man tong ket hoa hong quan ly',
                              })
                              // Service đã re-aggregate hai bên trong on_commit — không
                              // gọi aggregate_all cho cả kỳ (thừa + deadlock).
                              toastService.success('Đã hủy phiếu khấu trừ')
                              queryClient.invalidateQueries({
                                queryKey: QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.ROLE_DETAIL(
                                  'management',
                                  summary.id
                                ),
                              })
                            } catch (err) {
                              toastService.error(extractErrorMessage(err))
                            }
                          }}
                        >
                          Hủy phiếu
                        </button>
                      </span>
                    )
                  }
                />
              )}
              {permanentDeductionTotal !== 0 && (
                <BreakdownRow
                  label="Khấu trừ hoa hồng quản lý (tiền ở lại công ty)"
                  value={permanentDeductionTotal}
                  note={permanentDeductionItems
                    .map((i: any) => i.reason_kind_display)
                    .filter(Boolean)
                    .join(', ')}
                  color="text-red-500"
                />
              )}
              {transferInTotal !== 0 && (
                <BreakdownRow
                  label="Thưởng từ khấu trừ hoa hồng quản lý của người khác"
                  value={transferInTotal}
                  note={transferInItems
                    .map((i: any) => i.counterparty?.full_name)
                    .filter(Boolean)
                    .join(', ')}
                  color="text-neutral-900"
                />
              )}
              {/* Chênh lệch giữa Σ các mục đang hiện và `payable` của đợt chi. Bình thường = 0.
                  Nó KHÔNG phải một rổ tiền: nó là cái van an toàn cho đúng lỗi 86eykq956 — rổ nào
                  BE tính vào đợt chi mà màn chưa có mục (vd dòng MGMT `pct_type=project_director`
                  đang cố tình ẩn) thì hiện ra ở đây thay vì biến mất khỏi cột. Thấy dòng này khác
                  0 nghĩa là còn thiếu một mục, không phải "có một khoản tên là khác". */}
              {wavePayable -
                (totalBreakdown + transferOutTotal + transferInTotal + permanentDeductionTotal) !==
                0 && (
                <BreakdownRow
                  label="Khoản khác thuộc đợt chi quản lý"
                  value={
                    wavePayable -
                    (totalBreakdown + transferOutTotal + transferInTotal + permanentDeductionTotal)
                  }
                  note="Chưa có mục riêng trên bảng kê — báo kỹ thuật để bổ sung"
                  color="text-neutral-500"
                />
              )}
              <BreakdownRow
                label="Tổng hoa hồng quản lý trước thuế"
                value={wavePayable}
                note="Chỉ tiền của đợt chi Quản lý. HH bán hàng cá nhân và thưởng chi ở đợt Sale, xem bảng kê HH Sale."
                color="text-neutral-900"
              />
              <BreakdownRow
                label={`Tạm giữ HH (${holdPct}%)`}
                value={-waveHold}
                note={`Phần tạm giữ gắn với đợt chi quản lý — giữ ${holdPct}%`}
                color="text-neutral-700"
              />
              {waveOtherDeductions !== 0 && (
                <BreakdownRow
                  label="Bù trừ với đợt chi Sale"
                  value={-waveOtherDeductions}
                  note="Hoàn ứng / thu hồi được bù trừ giữa hai đợt chi của cùng một kỳ"
                  color="text-neutral-700"
                />
              )}
              <BreakdownRow
                label={`Thuế TNCN (phần đợt quản lý)`}
                value={-wavePit}
                note={pitNote}
                color="text-neutral-700"
              />
              <div className="mt-4 flex items-center justify-between pt-2">
                <div className="text-sm font-bold text-neutral-900">= THỰC NHẬN (đợt Quản lý)</div>
                <div className="text-data-green-default text-lg font-bold">
                  {formatCurrencyVND(waveNet)}{' '}
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
            isWorking={empDetail?.is_working}
            statusDisplay={empDetail?.status_display}
            resignedBanner="Nhân sự đã nghỉ việc — hoa hồng kỳ này vẫn được chi theo quy định."
            rows={[
              { label: 'Phòng', value: profile.dept },
              { label: 'Khối KD', value: profile.block },
              { label: 'Chi nhánh', value: profile.branch },
              { label: 'Chức vụ', value: profile.levelName },
              {
                label: 'Cấp',
                value: profile.levelCode ? (
                  <Chip
                    label={profile.levelCode}
                    variant={ColoredValueVariant.GREEN}
                    size="small"
                  />
                ) : (
                  '—'
                ),
              },
              { label: 'TK nhận', value: profile.bank, subValue: profile.bank_holder || undefined },
              { label: 'Ngày vào MV', value: formatDate(profile.join_date) },
            ]}
          />
          {summary.status === MonthlyStatus.DRAFT && (
            <div className="rounded-lg bg-transparent">
              <div className="mb-2 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
                Thao tác
              </div>
              <div className="flex flex-col gap-1.5">
                <Button
                  className="border-border-1 h-9 justify-start border bg-white px-3 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
                  leftIcon={<IconPencilsimple className="h-4 w-4 text-neutral-500" />}
                  onClick={onOpenHoldDialog}
                >
                  Chỉnh tạm giữ HH
                </Button>
                {mgmtWaveTotal > 0 && (
                  <Button
                    className="border-border-1 h-9 justify-start border bg-white px-3 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
                    leftIcon={<IconPencilsimple className="h-4 w-4 text-neutral-500" />}
                    onClick={() => setIsTransferDialogOpen(true)}
                  >
                    Khấu trừ để thưởng
                  </Button>
                )}
                {canCreateManualEntry && (
                  <Button
                    className="border-border-1 h-9 justify-start border bg-white px-3 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
                    leftIcon={<IconPencilsimple className="h-4 w-4 text-neutral-500" />}
                    onClick={() => openManualEntryDialog()}
                    disabled={summaryPeriodId == null}
                    title={
                      summaryPeriodId == null
                        ? 'Chưa xác định được kỳ kế toán của bảng kê này'
                        : 'Khoản thoả thuận ngoài công thức phiếu phân bổ xúc tiến'
                    }
                  >
                    Thêm hoa hồng xúc tiến bổ sung
                  </Button>
                )}
              </div>
            </div>
          )}{' '}
        </div>
      </div>
      <div className="flex flex-col gap-5">
        {/* Khối Cấu trúc HH nằm phía trên các mục chi tiết. Tỷ trọng tính trên tổng hoa hồng
            QUẢN LÝ (`totalBreakdown`) — không còn phần HH bán hàng cá nhân của đợt SALE. */}
        <div className="border-border-1 overflow-hidden rounded-lg border bg-white p-6 shadow-sm">
          <div className="mb-4 text-[11px] font-semibold tracking-wider text-neutral-500 uppercase">
            Cấu trúc HH
          </div>
          <div className="grid grid-cols-1 gap-5 text-[13px] md:grid-cols-2 lg:grid-cols-3">
            {structureTiles.map((tile) => {
              const pct = totalBreakdown > 0 ? (tile.value / totalBreakdown) * 100 : 0
              return (
                <div key={tile.so} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span className="font-semibold text-neutral-800">
                      {tile.so} - {tile.label}
                    </span>
                    <span className="font-bold text-neutral-900">
                      {formatCurrencyVND(tile.value)}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-400">
                    {formatNumber(pct, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}% của
                    tổng
                  </div>
                  <div className="bg-neutral-30 h-1.5 w-full overflow-hidden rounded-full">
                    <div
                      className={`h-full rounded-full ${barColorClass(pct)}`}
                      style={{ width: barWidth(pct) }}
                    ></div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* "HH bán hàng cá nhân" đã gỡ khỏi màn này (không còn mục / bảng / ô Cấu trúc HH): đây là
            bảng kê hoa hồng QUẢN LÝ — đợt chi MGMT — còn deal quản lý tự closing thì chi ở đợt
            SALE và đã có bảng kê riêng ở màn 20.8.1. Các mục còn lại đánh số lại 1→7. Phần tiền đó
            vẫn còn ĐÚNG MỘT dòng đối chiếu ở Diễn giải, xem `saleWaveTotal`. */}

        {/* Section ①: Thưởng HH quản lý (Group B) */}
        <div
          className="border-border-1 overflow-hidden rounded-lg border bg-white shadow-sm"
          style={{ borderLeft: '4px solid #D28A35' }}
        >
          <div
            className="border-border-1 flex items-center justify-between border-b px-6 py-4"
            style={{ backgroundColor: '#D28A350D' }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-[#D28A35] text-[14px] font-semibold text-white">
                1
              </div>
              <div>
                <div className="text-[14px] font-semibold text-neutral-900">Thưởng HH quản lý</div>
                <div className="mt-0.5 text-[11px] text-neutral-500">
                  4 hạng mục · mỗi ô: thành tiền kỳ này = số tiền cấu hình × % chia đợt này
                </div>
              </div>
            </div>
            <SectionTotal value={breakdown.groupB} />
          </div>
          <div className="overflow-x-auto">
            <TransactionGroupBTable lines={linesB} />
          </div>
        </div>

        {/* Section ②: HHQL — luôn hiện, rỗng thì báo "Không có dữ liệu" */}
        <div
          className="border-border-1 overflow-hidden rounded-lg border bg-white shadow-sm"
          style={{ borderLeft: '4px solid #059669' }}
        >
          <div
            className="border-border-1 flex items-center justify-between border-b px-6 py-4"
            style={{ backgroundColor: '#0596690D' }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-[#059669] text-[14px] font-semibold text-white">
                2
              </div>
              <div>
                <div className="text-[14px] font-semibold text-neutral-900">
                  Hoa hồng quản lý KPI/HHQL
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500">
                  Hoa hồng quản lý theo chỉ tiêu KPI và mức độ hoàn thành chỉ tiêu phòng
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Chỉ bày nút Lọc khi phiếu có từ 2 org trở lên ở một cấp nào đó — phiếu 1 dòng
                  thì bộ lọc không có việc gì để làm, bày ra chỉ thêm nhiễu. */}
              {hasSomethingToFilter(hhqlOrgOptions) && (
                <Button
                  variant="link"
                  size="small"
                  onClick={() => setIsHhqlFilterOpen(true)}
                  aria-label="Lọc theo chi nhánh, khối, phòng"
                  leftIcon={
                    <IconFunnel
                      size={14}
                      className={
                        hhqlFilterCount > 0 ? 'text-action-primary-red-default' : undefined
                      }
                    />
                  }
                  className={hhqlFilterCount > 0 ? 'text-action-primary-red-default' : undefined}
                >
                  {hhqlFilterCount > 0 ? `Lọc (${hhqlFilterCount})` : 'Lọc'}
                </Button>
              )}
              <Chip label={`${linesHhql.length} khoản`} variant={ColoredValueVariant.BLUE} />
              <SectionTotal value={breakdown.hhql} />
            </div>
          </div>
          <div className="overflow-x-auto">
            {linesHhql.length > 0 ? (
              <KpiHhqlTable
                summaryId={summary.id}
                filter={hhqlFilter}
                options={hhqlOrgOptions}
                onRemoveChip={handleHhqlChipRemove}
                onClearFilter={handleHhqlFilterClear}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 bg-white p-8 text-center text-[13px] text-neutral-500 italic">
                <IconReceipt className="h-8 w-8 text-neutral-300" />
                <span>Không có dữ liệu</span>
              </div>
            )}
          </div>
        </div>

        {/* Section ③: SLK (Sàn liên kết) — luôn hiện */}
        <div
          className="border-border-1 overflow-hidden rounded-lg border bg-white shadow-sm"
          style={{ borderLeft: '4px solid #06B6D4' }}
        >
          <div
            className="border-border-1 flex items-center justify-between border-b px-6 py-4"
            style={{ backgroundColor: '#06B6D40D' }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-[#06B6D4] text-[14px] font-semibold text-white">
                3
              </div>
              <div>
                <div className="text-[14px] font-semibold text-neutral-900">
                  Hoa hồng Sàn liên kết
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500">
                  Hoa hồng được phân bổ từ sàn liên kết (SLK) trong kỳ
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Chip label={`${slkKhoanCount} khoản`} variant={ColoredValueVariant.BLUE} />
              <SectionTotal value={breakdown.slk} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <SlkTable lines={linesSlk} />
          </div>
        </div>

        {/* Section ④: Group A (Đầu tư, Xúc tiến & Phát triển Dự án) — chuyển xuống cuối cùng */}
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
                4
              </div>
              <div>
                <div className="text-[14px] font-semibold text-neutral-900">
                  Hoa hồng Đầu tư, Xúc tiến & Phát triển Dự án
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500">
                  1 dòng / dự án · di chuột vào Tổng tiền để xem quỹ xúc tiến & % tiền về
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Chip label={`${promoProjectCount} dự án`} variant={ColoredValueVariant.BLUE} />
              <SectionTotal value={breakdown.groupA} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <TransactionGroupATable
              lines={linesA}
              onEditManualEntry={
                canEditManualEntry && isSummaryEditable ? openManualEntryDialog : undefined
              }
            />
          </div>
        </div>

        {/* Section ⑤: HH Giám đốc dự án (HHGDDA 20.8.7) — luôn hiện */}
        <div
          className="border-border-1 overflow-hidden rounded-lg border bg-white shadow-sm"
          style={{ borderLeft: '4px solid #0F766E' }}
        >
          <div
            className="border-border-1 flex items-center justify-between border-b px-6 py-4"
            style={{ backgroundColor: '#0F766E0D' }}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-[#0F766E] text-[14px] font-semibold text-white">
                5
              </div>
              <div>
                <div className="text-[14px] font-semibold text-neutral-900">
                  Hoa hồng Giám đốc dự án
                </div>
                <div className="mt-0.5 text-[11px] text-neutral-500">
                  % trên tiền thực về lũy kế của dự án · số âm = đòi lại phần đã chi lố
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Chip
                label={`${linesDirectorCommission.length} khoản`}
                variant={ColoredValueVariant.BLUE}
              />
              <SectionTotal value={breakdown.directorCommission} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <DirectorCommissionTable lines={linesDirectorCommission} />
          </div>
        </div>
        {/* Section ⑥: Hoa hồng khối hỗ trợ (Backoffice) — CR 86eykq956.
            Chỉ hiện khi có dòng: khoản này chỉ phát sinh với nhân sự phòng khối hỗ trợ. */}
        {linesBackoffice.length > 0 && (
          <div
            className="border-border-1 overflow-hidden rounded-lg border bg-white shadow-sm"
            style={{ borderLeft: '4px solid #2563EB' }}
          >
            <div className="border-border-1 flex items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-[#2563EB] text-[14px] font-semibold text-white">
                  6
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-neutral-900">
                    Hoa hồng khối hỗ trợ (Backoffice)
                  </div>
                  <div className="mt-0.5 text-[11px] text-neutral-500">
                    Phần được chia từ bảng hoa hồng của phòng khối hỗ trợ trong kỳ
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Chip
                  label={`${linesBackoffice.length} khoản`}
                  variant={ColoredValueVariant.BLUE}
                />
                <SectionTotal value={breakdown.backoffice} />
              </div>
            </div>
            <div className="overflow-x-auto">
              <BackofficeTable lines={linesBackoffice} />
            </div>
          </div>
        )}
      </div>
      {summary.status === MonthlyStatus.DRAFT && isTransferDialogOpen && (
        <CommissionTransferDialog
          open={isTransferDialogOpen}
          onOpenChange={setIsTransferDialogOpen}
          year={summary.year}
          month={summary.month}
          employeeId={Number(summary.beneficiary_employee)}
          transferId={activeTransferId}
          onSuccess={() => {
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.ROLE_DETAIL(
                'management',
                summary.id
              ),
            })
            queryClient.invalidateQueries({
              queryKey: QUERY_KEYS.ACCOUNTING.MONTHLY_SUMMARIES.DETAIL(summary.id),
            })
          }}
        />
      )}
      {/* Bộ lọc org của mục ② HHQL — dùng đúng khuôn nút Lọc + dialog của màn danh sách (AppDialog
          variant="filter"), để người dùng không phải học hai kiểu lọc trên cùng một nghiệp vụ. */}
      <AppDialog
        variant="filter"
        open={isHhqlFilterOpen}
        onOpenChange={setIsHhqlFilterOpen}
        content={
          <KpiHhqlOrgFilter
            ref={hhqlFilterRef}
            isOpen={isHhqlFilterOpen}
            options={hhqlOrgOptions}
            initialValues={{
              branch: hhqlFilter.branch,
              block: hhqlFilter.block,
              department: hhqlFilter.department,
            }}
          />
        }
        onClearFilter={() => hhqlFilterRef.current?.clearForm()}
        onConfirm={handleHhqlFilterConfirm}
        onCancel={() => setIsHhqlFilterOpen(false)}
      />
    </div>
  )
}

/**
 * Cell tên dự án — điểm vào phiếu phân bổ xúc tiến (`20.8.0`), nơi có đủ doanh thu dự án, quỹ
 * xúc tiến, tỷ lệ tiền về và danh sách deal đủ điều kiện. Bảng gọn không hiện những số đó nữa
 * nên link này chính là đường truy ngược.
 *
 * Dự án gộp nhiều phiếu (truy thu kỳ cũ) → mỗi mã phiếu một link riêng, không gộp thành một
 * link đại diện: gõ nhầm phiếu là đọc nhầm kỳ.
 */
const PromoProjectCell = ({ row }: { row: PromoProjectRowType }) => (
  <>
    <div className="w-[200px] truncate font-medium text-neutral-900" title={row.projectName}>
      {row.projectName}
    </div>
    <div className="mt-0.5 flex flex-wrap gap-x-2 text-[11px] text-neutral-500">
      {row.isManual
        ? row.manualReason || 'Nhập tay theo văn bản'
        : row.distributions.length > 0
          ? row.distributions.map((distribution) =>
              distribution.id != null ? (
                <Link
                  key={distribution.code}
                  to={APP_PATH.PROMOTION_DISTRIBUTION_TRACKING_DETAIL.replace(
                    ':id',
                    String(distribution.id)
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-primary hover:underline"
                >
                  {[distribution.code, distribution.periodLabel].filter(Boolean).join(' · ')}
                </Link>
              ) : (
                <span key={distribution.code}>
                  {[distribution.code, distribution.periodLabel].filter(Boolean).join(' · ')}
                </span>
              )
            )
          : row.projectCode || '—'}
    </div>
  </>
)

/**
 * Tooltip của cột Tổng tiền — chỗ DUY NHẤT còn giải thích được con số trong bảng này.
 *
 * Bảng đã bỏ cột quỹ xúc tiến / tổng ghi nhận / % tiền về, và từ 86eyku6xq bỏ nốt 5 cột vai trò.
 * Không còn mẫu số nào hiện trên màn, nên người đọc mất hẳn cách biết tiền này được hưởng trên
 * quỹ bao nhiêu và vì sao thực nhận thấp hơn phần được hưởng. Tooltip gánh chỗ đó.
 */
const promoTotalTooltip = (row: PromoProjectRowType) =>
  row.isManual
    ? // Dòng nhập tay không có công thức: không có quỹ, không có phần "được hưởng", không có
      // tỷ lệ tiền về. Giữ nguyên khuôn tooltip của dòng công thức sẽ hiện "Được hưởng: 0" và
      // đọc như một dòng bị mất tiền.
      row.manualReason || 'Khoản nhập tay theo văn bản thoả thuận'
    : [
        row.promotionPool > 0
          ? `Quỹ xúc tiến dự án: ${formatCurrencyVND(row.promotionPool)}`
          : null,
        `Được hưởng: ${formatCurrencyVND(row.formulaTotal)}`,
        row.payoutPct != null ? `Tiền về kỳ này: ${formatPctFloor(row.payoutPct)}` : null,
      ]
        .filter(Boolean)
        .join('\n')

/**
 * Mục ⑥ — đúng 2 cột: Tên dự án · Tổng tiền.
 *
 * 5 cột vai trò (Đầu mối quan hệ / Hoạch định / Đóng gói / Hỗ trợ KD / Điều phối) đã bị BA yêu cầu
 * ẩn hẳn (ClickUp 86eyku6xq). Phần chia theo vai trò vẫn đọc được ở phiếu phân bổ xúc tiến — link
 * nằm ngay dưới tên dự án trong `PromoProjectCell`, nên bỏ cột không làm mất đường tra.
 *
 * Guard canh khung cột này: `CommMgrDetail.promo-columns.guard.test.ts`.
 */
const TransactionGroupATable = ({
  lines,
  onEditManualEntry,
}: {
  lines: any[]
  onEditManualEntry?: (row: PromoProjectRowType) => void
}) => {
  const rows = useMemo(() => buildPromoProjectRows(lines), [lines])
  const totals = useMemo(() => sumPromoProjectRows(rows), [rows])

  // Nút sửa phải NHÌN THẤY được (click-để-mở-menu là hành vi ẩn), nhưng KHÔNG được thêm cột:
  // guard `CommMgrDetail.promo-columns.guard.test.ts` ghim bảng này đúng 2 cột theo chốt của BA
  // (ClickUp 86eyku6xq). Nên nút nằm trong chính ô "Tên dự án", dùng `Button variant="text"` —
  // cùng khuôn nút-trong-ô mà các bảng tự dựng khác dùng (vd `SupportDeptCommissionRateListPage`).
  // Cursor-menu bị loại theo `_docs/guide/cursor-position-action-menu.md`: nó dành cho dòng có
  // 4+ hành động, ở đây mỗi dòng chỉ có một.
  const canEditRow = (row: PromoProjectRowType) =>
    Boolean(onEditManualEntry) && row.isManual && row.manualEntryId != null

  if (rows.length === 0)
    return (
      <div className="flex flex-col items-center justify-center gap-2 bg-white p-8 text-center text-[13px] text-neutral-500 italic">
        <IconReceipt className="h-8 w-8 text-neutral-300" />
        <span>Không có dữ liệu</span>
      </div>
    )

  return (
    <>
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-border-1 border-b bg-neutral-50 text-[11px] tracking-wider text-neutral-500 uppercase">
            <th className="min-w-[200px] px-6 py-3 font-medium">Tên dự án</th>
            <th className="px-6 py-3 text-right font-medium whitespace-nowrap">Tổng tiền</th>
          </tr>
        </thead>
        <tbody className="bg-white">
          {rows.map((row) => (
            <tr key={row.key} className="hover:bg-neutral-20 text-[13px]">
              <td className="px-6 py-3.5 align-middle">
                <PromoProjectCell row={row} />
                {canEditRow(row) && (
                  <Button
                    type="button"
                    variant="text"
                    className="mt-1 h-auto px-0 text-[11px]"
                    leftIcon={<IconPencilsimple className="h-3.5 w-3.5" />}
                    onClick={() => onEditManualEntry?.(row)}
                  >
                    Sửa khoản bổ sung
                  </Button>
                )}
              </td>
              <td className="text-data-green-default px-6 py-3.5 text-right align-middle font-semibold">
                <div title={promoTotalTooltip(row)}>{formatCurrencyVND(row.amountTotal)}</div>
                {row.unassignedAmount !== 0 && !row.isManual && (
                  <div
                    className="text-[11px] font-normal text-neutral-500"
                    title="Phần chưa tách được theo vai trò (phiếu phân bổ cũ hoặc đã bị xoá)"
                  >
                    chưa rõ vai trò: {formatCurrencyVND(row.unassignedAmount)}
                  </div>
                )}
              </td>
            </tr>
          ))}
          <tr className="border-border-1 bg-action-primary-red-activated text-action-primary-red-default border-t-2 text-[13px] font-bold">
            <td className="px-6 py-4">TỔNG NHÓM</td>
            <td className="text-action-primary-red-default px-6 py-4 text-right">
              {formatCurrencyVND(totals.amountTotal)}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  )
}

const sumAmount = (lines: any[]) =>
  lines.reduce((s: number, l: any) => s + Number(l.amount || 0), 0)

/** Collapsible group header + body used to layer the Nhóm B sub-tables. */
const GroupSection = ({
  title,
  count,
  total,
  open,
  onToggle,
  children,
}: {
  title: string
  count: string
  total: number
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) => (
  <div className="border-border-1 border-b last:border-b-0">
    <div
      role="button"
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}
      className="hover:bg-neutral-60 focus-visible:bg-neutral-60 flex w-full cursor-pointer items-center justify-between gap-3 bg-neutral-50 px-6 py-3 text-left transition-colors outline-none"
    >
      <div className="flex items-center gap-2">
        <IconCaretdown
          size={14}
          className={`text-neutral-400 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
        />
        <span className="text-[13px] font-semibold text-neutral-800">{title}</span>
        <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
          {count}
        </span>
      </div>
      <span className="text-data-green-default text-[13px] font-bold">
        {formatCurrencyVND(total)} đ
      </span>
    </div>
    <div
      className={`grid transition-all duration-300 ease-in-out ${
        open ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="overflow-x-auto">{children}</div>
      </div>
    </div>
  </div>
)

/**
 * Ô một hạng mục thưởng quản lý: tiền của kỳ + chú thích `cấu hình × % chia đợt này`.
 *
 * Chú thích là phần bắt buộc chứ không phải trang trí: con số tiền tự nó không nói được nó
 * từ đâu ra, và chính khoảng trống đó khiến bảng cũ suy ngược ra một "số gộp" ảo.
 */
const MgmtBonusCell = ({ cell, dialPct }: { cell: MgmtBonusCellData; dialPct: string | null }) => {
  if (cell.amount === 0 && cell.configured === null)
    return <span className="text-neutral-400">—</span>
  return (
    <>
      <div className="font-medium text-neutral-700">{formatCurrencyVND(cell.amount)}</div>
      {cell.configured !== null && dialPct !== null && (
        <div className="mt-0.5 text-[11px] whitespace-nowrap text-neutral-500">
          {formatCurrencyVND(cell.configured)} × {formatPctFloor(dialPct)}
        </div>
      )}
    </>
  )
}

/** Deal-grain management bonuses — grouped by deal (one row per giao dịch). */
const MgmtDealSubTable = ({ lines }: { lines: any[] }) => {
  const dealRows = useMemo(() => buildMgmtBonusDealRows(lines), [lines])

  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-border-1 border-b bg-white text-[11px] tracking-wider text-neutral-400 uppercase">
          <th className="px-6 py-2.5 font-medium whitespace-nowrap">Mã deal</th>
          <th className="min-w-[150px] px-6 py-2.5 font-medium">Dự án · KH</th>
          <th className="px-6 py-2.5 text-right font-medium whitespace-nowrap">Thưởng quản lý</th>
          <th className="px-6 py-2.5 text-right font-medium whitespace-nowrap">HH bổ sung DA</th>
          <th className="px-6 py-2.5 text-right font-medium whitespace-nowrap">
            Thưởng quản lý từ CDT
          </th>
          <th className="px-6 py-2.5 text-right font-medium whitespace-nowrap">
            Thưởng quản lý bổ sung
          </th>
          <th className="px-6 py-2.5 text-right font-medium whitespace-nowrap">Tổng cấu hình</th>
          <th className="px-6 py-2.5 text-right font-medium whitespace-nowrap">% chia đợt này</th>
          <th className="px-6 py-2.5 text-right font-medium whitespace-nowrap">% tiền về</th>
          <th className="px-6 py-2.5 text-right font-medium whitespace-nowrap">HH thực tế</th>
        </tr>
      </thead>
      <tbody className="bg-white">
        {dealRows.map((row) => (
          <tr key={row.key} className="hover:bg-neutral-20 text-[13px]">
            <td className="px-6 py-3.5 align-middle">
              {row.dealId ? (
                <Link
                  to={APP_PATH.DEAL_DETAIL.replace(':id', String(row.dealId))}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-primary font-semibold hover:underline"
                >
                  <code className="text-xs">{row.dealCode}</code>
                </Link>
              ) : (
                <code className="text-xs">{row.dealCode}</code>
              )}
              {row.unitLabel && <div className="text-[11px] text-neutral-500">{row.unitLabel}</div>}
            </td>
            <td className="px-6 py-3.5 align-middle">
              <div
                className="w-[120px] truncate font-medium text-neutral-900"
                title={row.projectName}
              >
                {row.projectName || '—'}
              </div>
              <div
                className="mt-0.5 w-[120px] truncate text-[11px] text-neutral-500"
                title={row.customerName}
              >
                {row.customerName || '—'}
              </div>
            </td>
            <td className="px-6 py-3.5 text-right align-middle">
              <MgmtBonusCell cell={row.cells.agency_fee} dialPct={row.dialPct} />
            </td>
            <td className="px-6 py-3.5 text-right align-middle">
              <MgmtBonusCell cell={row.cells.project_bonus} dialPct={row.dialPct} />
            </td>
            <td className="px-6 py-3.5 text-right align-middle">
              <MgmtBonusCell cell={row.cells.investor_bonus} dialPct={row.dialPct} />
            </td>
            <td className="px-6 py-3.5 text-right align-middle">
              <MgmtBonusCell cell={row.cells.mv_bonus} dialPct={row.dialPct} />
            </td>
            <td className="px-6 py-3.5 text-right align-middle font-medium text-neutral-700">
              {row.configuredTotal === null ? '—' : formatCurrencyVND(row.configuredTotal)}
            </td>
            <td className="px-6 py-3.5 text-right align-middle">
              {row.dialPct === null ? (
                <span className="text-neutral-400">—</span>
              ) : (
                <span className="bg-data-blue-disabled text-data-blue-default inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold">
                  {formatPctFloor(row.dialPct)}
                </span>
              )}
            </td>
            <td className="px-6 py-3.5 text-right align-middle">
              <ProgressCell pct={row.paymentProgressPct} />
            </td>
            <td className="text-data-green-default px-6 py-3.5 text-right align-middle font-bold">
              {formatCurrencyVND(row.actualAmount)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const TransactionGroupBTable = ({ lines }: { lines: any[] }) => {
  const dealLines = lines.filter((l: any) => !!l.source_info?.deal_code)
  const [openDeals, setOpenDeals] = useState(true)

  if (dealLines.length === 0)
    return (
      <div className="flex flex-col items-center justify-center gap-2 bg-white p-8 text-center text-[13px] text-neutral-500 italic">
        <IconReceipt className="h-8 w-8 text-neutral-300" />
        <span>Không có dữ liệu</span>
      </div>
    )

  const dealTotal = sumAmount(dealLines)
  const dealCount = new Set(
    dealLines.map((l: any) => l.source_info?.deal_id ?? l.source_info?.deal_code)
  ).size

  return (
    <div className="flex flex-col">
      <GroupSection
        title="Thưởng theo giao dịch"
        count={`${dealCount} giao dịch`}
        total={dealTotal}
        open={openDeals}
        onToggle={() => setOpenDeals((v) => !v)}
      >
        <MgmtDealSubTable lines={dealLines} />
      </GroupSection>
      <div className="border-border-1 bg-action-primary-red-activated text-action-primary-red-default flex items-center justify-between border-t-2 px-6 py-4 text-[13px] font-bold">
        <span>TỔNG NHÓM</span>
        <span className="">{formatCurrencyVND(dealTotal)} đ</span>
      </div>
    </div>
  )
}

/**
 * Ô "% tiền về".
 *
 * Cắt 2dp bằng `formatPctFloor` chứ KHÔNG `Math.round`: nó đứng cạnh cột "% chia đợt này"
 * vốn đã cắt 2dp, nên làm tròn nguyên sẽ đọc 30,80% thành "31%" — một con số không khớp
 * với bất kỳ số nào khác trên hàng, đúng kiểu mập mờ đã đẻ ra bug bảng thưởng quản lý.
 * Cùng quy tắc floor-2dp toàn hệ (xem `formatPctFloor`): không bao giờ half-up một tỷ lệ.
 */
const ProgressCell = ({ pct }: { pct: number }) => {
  const over = pct > 100
  const badge =
    pct >= 100
      ? 'bg-data-green-disabled text-data-green-default'
      : pct <= 0
        ? 'bg-neutral-30 text-neutral-500'
        : 'bg-data-orange-disabled text-data-orange-default'
  return (
    <span
      className={`inline-flex items-center justify-center gap-0.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge}`}
    >
      {over && <IconCaretup size={10} />}
      {formatPctFloor(pct)}
    </span>
  )
}

/**
 * "Tổng nhóm" ở header của mỗi mục — CR 86eynz1a2 (STT54).
 *
 * Luật: con số ở header mục N PHẢI là đúng biểu thức mà dòng số N của panel "Diễn giải"
 * đang dùng. KHÔNG tự cộng lại từ các dòng trong bảng con, vì hai mục không cộng được:
 *
 * - Mục ③ (HHQL) nạp dòng qua API riêng (`useManagementHhqlLines`), header render trước khi
 *   có dữ liệu nên không có gì để cộng — `summary.hhql_total` là nguồn duy nhất luôn sẵn.
 * - Mục ⑤ (Thưởng) trộn thêm đợt thưởng vừa xác nhận tại client (`totalBonus`), số này lệch
 *   với `summary.bonus_total` cho tới lần refetch sau.
 *
 * Tự cộng lại là đẻ ra con số thứ ba lệch với cả "Diễn giải" lẫn dòng TỔNG của bảng — đúng
 * kiểu mâu thuẫn nội bộ mà CR 86eykq956 đã phải đi sửa trên chính màn này.
 *
 * Dòng TỔNG trong bảng con chỉ hiện khi bảng có dòng; header thì luôn hiện, kể cả 0 đ — đó
 * là lý do CR này tồn tại.
 */
const SectionTotal = ({ value }: { value: number }) => (
  <div className="text-right">
    <div className="text-xs text-neutral-500">
      Tổng nhóm{' '}
      <strong className="text-[13px] font-bold text-neutral-900">
        {formatCurrencyVND(value)}{' '}
        <span className="text-xs font-semibold underline decoration-1 underline-offset-2 opacity-60">
          đ
        </span>
      </strong>
    </div>
  </div>
)

const BreakdownRow = ({ label, value, note, color = 'text-neutral-900', sub, action }: any) => (
  <div className="border-border-1 hover:bg-neutral-20/30 -mx-6 flex items-start justify-between border-b px-6 py-3 last:border-0">
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

const KpiHhqlTable = ({
  summaryId,
  filter,
  options,
  onRemoveChip,
  onClearFilter,
}: {
  summaryId: number
  filter: HhqlOrgFilterValue
  options: ReturnType<typeof buildHhqlOrgOptions>
  onRemoveChip: (key: keyof HhqlOrgFilterValue, id: number) => void
  onClearFilter: () => void
}) => {
  const { keysMap } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.BOOKING.COMMISSION_PCT_TYPE],
  })
  const pctTypeLabels = keysMap.get(APP_CONSTANT_KEY.SALES.BOOKING.COMMISSION_PCT_TYPE) as
    | Record<string, string>
    | undefined

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(HHQL_PAGE_SIZE)
  const apiFilter = useMemo(() => toHhqlApiParams(filter), [filter])
  const { data, isLoading } = useManagementHhqlLines(summaryId, {
    page,
    page_size: pageSize,
    ...apiFilter,
  })
  const rows = data?.results ?? []
  const total = data?.count ?? 0

  const chips = useMemo(() => activeHhqlChips(filter, options), [filter, options])
  // Tổng của phần đang lọc PHẢI đọc từ `summary` do BE trả về. Cộng `rows` chỉ ra tổng của trang
  // đang xem — lọc 40 dòng rải 4 trang thì con số đó sai mà trông vẫn hợp lý, không ai phát hiện
  // bằng mắt. Xem `HhqlLineSummaryPagination` bên backend và luật vàng ở docs/ai/patterns.md.
  const filteredAmount = data?.summary?.amount
  const filteredCount = data?.summary?.line_count ?? total

  const statusBar =
    chips.length > 0 ? (
      <div className="border-border-1 flex flex-wrap items-center justify-between gap-2 border-b bg-neutral-50 px-6 py-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] tracking-wider text-neutral-500 uppercase">Đang lọc</span>
          {chips.map((chip) => (
            <button
              key={`${chip.key}-${chip.id}`}
              type="button"
              onClick={() => onRemoveChip(chip.key, chip.id)}
              className="border-border-1 hover:border-action-primary-red-default hover:text-action-primary-red-default flex items-center gap-1.5 rounded-full border bg-white px-2.5 py-1 text-[12px] text-neutral-700 transition-colors"
              aria-label={`Bỏ lọc ${chip.label}`}
            >
              {chip.label}
              <span aria-hidden className="text-neutral-400">
                ✕
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={onClearFilter}
            className="text-brand-primary text-[12px] font-medium hover:underline"
          >
            Xoá lọc
          </button>
        </div>
        <div className="font-mono text-[12px] text-neutral-700">
          {filteredCount} dòng khớp
          {filteredAmount != null && (
            <>
              {' · '}
              <strong className="font-bold text-neutral-900">
                {formatCurrencyVND(Number(filteredAmount))} đ
              </strong>
            </>
          )}
        </div>
      </div>
    ) : null

  if (!isLoading && total === 0)
    return (
      <div className="flex flex-col">
        {statusBar}
        <div className="flex flex-col items-center justify-center gap-2 bg-white p-8 text-center text-[13px] text-neutral-500 italic">
          <IconReceipt className="h-8 w-8 text-neutral-300" />
          <span>{chips.length > 0 ? 'Không có dòng nào khớp bộ lọc' : 'Không có dữ liệu'}</span>
        </div>
      </div>
    )

  return (
    <div className="flex flex-col">
      {statusBar}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-border-1 border-b bg-neutral-50 text-[11px] tracking-wider text-neutral-500 uppercase">
              <th className="px-6 py-3 font-medium whitespace-nowrap">Chi nhánh</th>
              <th className="px-6 py-3 font-medium whitespace-nowrap">Khối</th>
              <th className="min-w-[150px] px-6 py-3 font-medium">Phòng KD</th>
              <th className="px-6 py-3 font-medium whitespace-nowrap">Giao dịch đóng góp</th>
              <th className="px-6 py-3 font-medium whitespace-nowrap">Loại KPI</th>
              <th className="px-6 py-3 text-right font-medium whitespace-nowrap">% KPI</th>
              <th className="px-6 py-3 text-right font-medium whitespace-nowrap">% hoàn thành</th>
              <th className="px-6 py-3 text-right font-medium whitespace-nowrap">HH thực tế</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {isLoading && rows.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  className="px-6 py-8 text-center text-[13px] text-neutral-400 italic"
                >
                  Đang tải...
                </td>
              </tr>
            )}
            {rows.map((line: any, i: number) => {
              const deal = line.deal
              return (
                <tr key={line.line_id ?? i} className="hover:bg-neutral-20 text-[13px]">
                  <td className="px-6 py-3.5 align-middle text-neutral-700">
                    {line.kpi_branch?.name || '—'}
                  </td>
                  <td className="px-6 py-3.5 align-middle text-neutral-700">
                    {line.kpi_block?.name || '—'}
                  </td>
                  <td className="px-6 py-3.5 align-middle font-medium text-neutral-900">
                    {line.kpi_department?.name || '—'}
                  </td>
                  <td className="px-6 py-3.5 align-middle">
                    {deal ? (
                      <div className="flex flex-col">
                        {deal.deal_id ? (
                          <Link
                            to={APP_PATH.DEAL_DETAIL.replace(':id', String(deal.deal_id))}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand-primary font-semibold hover:underline"
                          >
                            <code className="text-xs">{deal.deal_code || 'N/A'}</code>
                          </Link>
                        ) : (
                          <code className="text-xs">{deal.deal_code || 'N/A'}</code>
                        )}
                        <span className="text-[11px] text-neutral-500">
                          {deal.project?.name || deal.project || '—'}
                        </span>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="px-6 py-3.5 align-middle">
                    <span className="text-xs text-neutral-700">
                      {pctTypeLabels?.[line.pct_type] ?? line.pct_type ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-right align-middle text-neutral-700">
                    {line.snapshot_pct != null ? `${formatNumber(line.snapshot_pct)}%` : '—'}
                  </td>
                  <td className="px-6 py-3.5 text-right align-middle text-neutral-700">
                    {line.snapshot_completion_pct != null
                      ? `${formatNumber(line.snapshot_completion_pct, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
                      : '—'}
                  </td>
                  <td className="text-data-green-default px-6 py-3.5 text-right align-middle font-bold">
                    {formatCurrencyVND(Number(line.amount))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {total > HHQL_PAGE_SIZE && (
        <SimplePagination
          currentPage={page}
          pageSize={pageSize}
          totalRecords={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size)
            setPage(1)
          }}
          pageSizeOptions={HHQL_PAGE_SIZE_OPTIONS}
          position="static"
        />
      )}
    </div>
  )
}

/** UI color per F2 source — label text comes from the server (app_constants), color is local. */
const SLK_F2_SOURCE_VARIANT: Record<string, ColoredValueVariant> = {
  [F2Source.linked]: ColoredValueVariant.BLUE,
  [F2Source.company]: ColoredValueVariant.ORANGE,
  [F2Source.director]: ColoredValueVariant.PURPLE,
}

/** Linked-exchange (SLK) commission — one row per SOURCE POOL the person was paid from.
 *
 *  An SLK period has three revenue tracks: LINKED, COMPANY, and one pool per business
 *  director. Each track has its own revenue and its own recipient percentage, and one
 *  person can be paid by several of them at once (the CEO is paid by every director pool).
 *  The BE therefore emits one `sources.slk.ceo` entry per pool and the flattener turns each
 *  into its own line here — this table is a straight 1:1 render, no client-side money math.
 *
 *  It used to split ONE line into linked/company rows by ratio, reading revenue from
 *  `monthly_total_revenue` / `company_f2_revenue`. Those are the period's LINKED/COMPANY
 *  totals, both 0 whenever the money came from a director pool, which is why the two
 *  right-hand columns rendered "0" and "—" (ClickUp 86eykqk16). */
/** Bảng chi tiết hoa hồng khối hỗ trợ (CR 86eykq956).
 *  Không dùng lại `SlkTable`: bảng đó có 2 cột riêng của sàn liên kết ("Nguồn F2",
 *  "Doanh thu nguồn") mà dòng chia theo phòng không bao giờ có — tái sử dụng chỉ tạo ra
 *  hai cột luôn rỗng, đúng cái bẫy `buildSlkStatementRows` đã vấp ở 86eykqk16. */
const BackofficeTable = ({ lines }: { lines: any[] }) => {
  const total = lines.reduce((s: number, l: any) => s + Number(l.amount || 0), 0)
  return (
    <table className="w-full border-collapse text-left text-[13px]">
      <thead>
        <tr className="border-border-1 bg-neutral-20/40 border-b text-[11px] tracking-wider text-neutral-500 uppercase">
          <th className="min-w-[180px] px-6 py-3 font-medium">Phòng</th>
          <th className="px-6 py-3 font-medium whitespace-nowrap">Chức vụ</th>
          <th className="px-6 py-3 text-right font-medium whitespace-nowrap">% chia từ pool</th>
          <th className="px-6 py-3 text-right font-medium whitespace-nowrap">HH thực tế</th>
        </tr>
      </thead>
      <tbody className="divide-border-1 divide-y bg-white">
        {lines.map((line: any, idx: number) => {
          const info = line.source_info || line
          return (
            <tr key={line.id || `bo-${idx}`} className="hover:bg-neutral-50/50">
              <td className="px-6 py-3">
                <div className="font-medium text-neutral-900">{info.department?.name || '—'}</div>
              </td>
              <td className="px-6 py-3 text-neutral-700">{info.position?.name || '—'}</td>
              <td className="px-6 py-3 text-right font-mono text-neutral-700">
                {info.pct_of_pool != null ? formatPctFloor(Number(info.pct_of_pool)) : '—'}
              </td>
              <td className="px-6 py-3 text-right font-mono font-semibold text-neutral-900">
                {formatCurrencyVND(Number(line.amount || 0))}
              </td>
            </tr>
          )
        })}
      </tbody>
      <tfoot>
        <tr className="border-border-1 bg-neutral-20/60 border-t font-semibold">
          <td className="px-6 py-3 text-neutral-700" colSpan={3}>
            TỔNG CỘNG
          </td>
          <td className="px-6 py-3 text-right font-mono text-neutral-900">
            {formatCurrencyVND(total)}
          </td>
        </tr>
      </tfoot>
    </table>
  )
}

const SlkTable = ({ lines }: { lines: any[] }) => {
  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.LINKED_EXCHANGE_REVENUE_LINE_F2_SOURCE_CHOICES],
  })
  const f2SourceLabels = keysMap.get(
    APP_CONSTANT_KEY.ACCOUNTING.LINKED_EXCHANGE_REVENUE_LINE_F2_SOURCE_CHOICES
  ) as Record<string, string> | undefined

  const rows = useMemo(() => buildSlkStatementRows(lines), [lines])

  if (rows.length === 0)
    return (
      <div className="flex flex-col items-center justify-center gap-2 bg-white p-8 text-center text-[13px] text-neutral-500 italic">
        <IconReceipt className="h-8 w-8 text-neutral-300" />
        <span>Không có dữ liệu</span>
      </div>
    )

  const total = sumSlkStatementRows(rows)

  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-border-1 border-b bg-neutral-50 text-[11px] tracking-wider text-neutral-500 uppercase">
          <th className="min-w-[180px] px-6 py-3 font-medium">Người / Phòng nhận</th>
          <th className="px-6 py-3 font-medium whitespace-nowrap">Nguồn F2</th>
          <th className="px-6 py-3 text-right font-medium whitespace-nowrap">Doanh thu nguồn</th>
          <th className="px-6 py-3 text-right font-medium whitespace-nowrap">% nhận từ pool</th>
          <th className="px-6 py-3 text-right font-medium whitespace-nowrap">HH thực tế</th>
        </tr>
      </thead>
      <tbody className="bg-white">
        {rows.map((row: any, i: number) => (
          <tr key={i} className="hover:bg-neutral-20 text-[13px]">
            <td className="px-6 py-3.5 align-middle">
              <div className="font-medium text-neutral-900">{row.info.department?.name || '—'}</div>
              <div className="mt-0.5 text-[11px] text-neutral-500">
                {row.info.position?.name || '—'}
              </div>
            </td>
            <td className="px-6 py-3.5 align-middle">
              {row.sourceKey ? (
                <Chip
                  label={f2SourceLabels?.[row.sourceKey] ?? row.sourceKey}
                  variant={SLK_F2_SOURCE_VARIANT[row.sourceKey] ?? ColoredValueVariant.GREY}
                  size="small"
                />
              ) : (
                '—'
              )}
              {/* Which director's pool — the same person can be paid by several, so the
                  source chip alone does not identify the row. */}
              {row.director?.full_name ? (
                <div className="mt-1 text-[11px] text-neutral-500">{row.director.full_name}</div>
              ) : null}
            </td>
            <td className="px-6 py-3.5 text-right align-middle font-medium text-neutral-700">
              {row.revenue != null ? formatCurrencyVND(Number(row.revenue)) : '—'}
            </td>
            <td className="px-6 py-3.5 text-right align-middle font-medium text-neutral-700">
              {row.pctOfPool != null ? `${formatNumber(Number(row.pctOfPool))}%` : '—'}
            </td>
            <td className="text-data-green-default px-6 py-3.5 text-right align-middle font-bold">
              {formatCurrencyVND(Number(row.amount))}
            </td>
          </tr>
        ))}
        <tr className="border-border-1 bg-action-primary-red-activated text-action-primary-red-default border-t-2 text-[13px] font-bold">
          <td colSpan={4} className="px-6 py-4">
            TỔNG NHÓM
          </td>
          <td className="text-action-primary-red-default px-6 py-4 text-right">
            {formatCurrencyVND(total)}
          </td>
        </tr>
      </tbody>
    </table>
  )
}

/**
 * Section ⑤ — one row per director-commission (HHGDDA) period document.
 *
 * `amount` is signed: a rate cut recognises a negative row ("Đòi lại"), so the sign
 * is rendered instead of being clamped away. Fields come from the BE `sources`
 * bucket `project_director` (see _project_director_source).
 */
const DirectorCommissionTable = ({ lines }: { lines: any[] }) => {
  if (lines.length === 0)
    return (
      <div className="flex flex-col items-center justify-center gap-2 bg-white p-8 text-center text-[13px] text-neutral-500 italic">
        <IconReceipt className="h-8 w-8 text-neutral-300" />
        <span>Không có dữ liệu</span>
      </div>
    )

  const total = lines.reduce((sum: number, l: any) => sum + Number(l.amount || 0), 0)

  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-border-1 border-b bg-neutral-50 text-[11px] tracking-wider text-neutral-500 uppercase">
          <th className="min-w-[150px] px-6 py-3 font-medium">Chứng từ</th>
          <th className="min-w-[170px] px-6 py-3 font-medium">Dự án</th>
          <th className="px-6 py-3 text-right font-medium whitespace-nowrap">Mức %</th>
          <th className="px-6 py-3 text-right font-medium whitespace-nowrap">Tiền về trong kỳ</th>
          <th className="px-6 py-3 text-right font-medium whitespace-nowrap">Lũy kế tiền về</th>
          <th className="px-6 py-3 text-right font-medium whitespace-nowrap">Đã chi trước kỳ</th>
          <th className="px-6 py-3 text-right font-medium whitespace-nowrap">Chi kỳ này</th>
        </tr>
      </thead>
      <tbody className="bg-white">
        {lines.map((line: any, i: number) => {
          const info = line.source_info || line
          const amount = Number(line.amount || 0)
          const isClawback = amount < 0
          const period =
            info.period_month && info.period_year
              ? `${String(info.period_month).padStart(2, '0')}/${info.period_year}`
              : '—'
          return (
            <tr key={info.line_id ?? i} className="hover:bg-neutral-20 text-[13px]">
              <td className="px-6 py-3.5 align-middle">
                <div className="font-medium text-neutral-900">{info.code || '—'}</div>
                <div className="mt-0.5 text-[11px] text-neutral-500">Kỳ {period}</div>
              </td>
              <td className="px-6 py-3.5 align-middle">
                <div className="text-neutral-900">{info.project?.name || '—'}</div>
                {info.project?.code ? (
                  <div className="mt-0.5 text-[11px] text-neutral-500">{info.project.code}</div>
                ) : null}
              </td>
              <td className="px-6 py-3.5 text-right align-middle font-medium text-neutral-700">
                {info.pct_payout != null ? `${formatNumber(Number(info.pct_payout))}%` : '—'}
              </td>
              <td className="px-6 py-3.5 text-right align-middle text-neutral-700">
                {formatCurrencyVND(Number(info.receipt_in_period || 0))}
              </td>
              <td className="px-6 py-3.5 text-right align-middle text-neutral-700">
                {formatCurrencyVND(Number(info.receipt_cum || 0))}
              </td>
              <td className="px-6 py-3.5 text-right align-middle text-neutral-700">
                {formatCurrencyVND(Number(info.paid_before || 0))}
              </td>
              <td
                className={`px-6 py-3.5 text-right align-middle font-bold ${
                  isClawback ? 'text-data-orange-default' : 'text-data-green-default'
                }`}
              >
                {isClawback
                  ? `Đòi lại ${formatCurrencyVND(Math.abs(amount))}`
                  : formatCurrencyVND(amount)}
              </td>
            </tr>
          )
        })}
        <tr className="border-border-1 bg-action-primary-red-activated text-action-primary-red-default border-t-2 text-[13px] font-bold">
          <td colSpan={6} className="px-6 py-4">
            TỔNG NHÓM
          </td>
          <td className="text-action-primary-red-default px-6 py-4 text-right">
            {formatCurrencyVND(total)}
          </td>
        </tr>
      </tbody>
    </table>
  )
}

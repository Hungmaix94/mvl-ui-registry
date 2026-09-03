import { useCallback, useMemo, useState } from 'react'
import { FormProvider } from 'react-hook-form'
import { useParams, useSearchParams } from 'react-router-dom'

import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { parseNumberSafe } from '@/features/accounting/_shares/utils/recipient-utils'
import { RATE_COLUMNS } from '@/features/project/sale-allocations/components/tbc-management-helpers'
import { useDealWorkspace } from '@/features/sales/deals/services/deal-service'
import useAppConstant from '@/hooks/useAppConstant'
import { useAbility } from '@/lib/ability'
import { useAuth } from '@/store'
import { hasPermission } from '@/utils/auth'

import { useCommissionSplitForm } from '../hooks/useCommissionSplitForm'
import { useWorksheetActions } from '../hooks/useWorksheetActions'
import { useWorksheetDial } from '../hooks/useWorksheetDial'
import {
  type CommissionSplitDetail,
  useCommissionSplits,
} from '../services/commission-splits-service'

import { BusyOverlay } from './BusyOverlay'
import type { FormValues } from './commission-split-form.types'
import { CommissionSplitPageHeader } from './CommissionSplitPageHeader'
import { DealPartiesSection } from './DealPartiesSection'
import { DealPaymentProgressTable } from './DealPaymentProgressTable'
import { ManagementCommissionSection } from './ManagementCommissionSection'
import { PaymentProgressTimeline } from './PaymentProgressTimeline'
import { PaymentSuspensionDialog } from './PaymentSuspensionDialog'
import { buildPayeeRows, computeRow } from './RecipientPayoutTable'
import { WorksheetPayoutSection } from './WorksheetPayoutSection'
import { WORKSHEET_STATUS } from './WorksheetStatusChip'
import { netAfterHold } from '../utils/payout-math'

const COMMISSION_PCT_TYPES = APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES

type Props = {
  detail: CommissionSplitDetail
  currentDetail: CommissionSplitDetail
  onBack: () => void
  onRefresh?: () => void
  /**
   * Bảng kê của kỳ đang xem đang được tải lại (đổi kỳ, hoặc tải lại nền sau khi ghi).
   * Query giữ dữ liệu cũ trong lúc chờ nên nếu không phủ overlay thì màn hiện số của kỳ
   * TRƯỚC mà không có dấu hiệu gì — xem chú thích ở hai trang gọi component này.
   */
  isRefreshing?: boolean
  isAdminView?: boolean
}

export const CommissionSplitDetailInfo = ({
  detail,
  currentDetail,
  onBack,
  onRefresh,
  isRefreshing = false,
  isAdminView = false,
}: Props) => {
  const { id: routeIdStr } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const worksheetIdParam = searchParams.get('worksheet_id')
  const pbtvIdParam = searchParams.get('pbtv_id')
  const worksheetId = worksheetIdParam ? Number(worksheetIdParam) : Number(routeIdStr)

  // Fetch all worksheets of the deal to build the period timeline and resolve pbtvId
  const { data: dealWorksheets, isPending: isDealWorksheetsPending } = useCommissionSplits(
    {
      deal: detail.deal_id,
      page_size: 100,
    },
    { enabled: !!detail.deal_id }
  )

  const activeWorksheet = useMemo(() => {
    if (!dealWorksheets?.results?.length) return null
    return (
      dealWorksheets.results.find(
        (w) => w.worksheet_id === worksheetId || w.representative_pbtv_id === worksheetId
      ) || dealWorksheets.results[0]
    )
  }, [dealWorksheets, worksheetId])

  const pbtvId = useMemo(() => {
    if (pbtvIdParam) return Number(pbtvIdParam)
    return activeWorksheet?.representative_pbtv_id || null
  }, [pbtvIdParam, activeWorksheet])

  const [suspendOpen, setSuspendOpen] = useState(false)
  // Kỳ đang RENDER (khớp 1-1 với `detail` object). Mọi state/con số của màn bám
  // vào đây thay vì URL. Khi đổi kỳ trên route, API giữ dữ liệu cũ (`keepPreviousData`),
  // nên màn hình CẦN tiếp tục dùng `currentWorksheet` của kỳ cũ cho đến khi `detail`
  // của kỳ mới về. Việc đồng bộ này ngăn giao diện chớp/nháy số loạn xạ (tiền kỳ A nhân với
  // dial kỳ B) trong thời gian load.
  const currentWorksheet = useMemo(() => {
    return dealWorksheets?.results?.find(
      (w) => w.period_year === detail.period_year && w.period_month === detail.period_month
    )
  }, [dealWorksheets, detail.period_year, detail.period_month])

  const renderedWorksheetId = currentWorksheet?.worksheet_id ?? worksheetId

  // `useDealWorkspace` trả `any` (drf-spectacular mất shape của `overview`) — neo hẹp đúng
  // hai nhánh trang này đọc, ngay tại biên, thay vì để `any` lan xuống dưới.
  const dealWorkspaceQuery = useDealWorkspace(detail.deal_id, {
    enabled: !!detail.deal_id,
  }) as {
    data?: {
      overview?: { project?: { name?: string | null; investor_name?: string | null } | null }
    }
  }
  const dealWorkspace = dealWorkspaceQuery.data

  // Dial của Mục ③. Ở lại cấp trang chứ không nằm trong section vì bản debounce là đầu vào
  // tính TIỀN của Mục ④/⑤⑥, và luồng "Duyệt chi thực nhận" bên dưới cũng gửi cả 4 giá trị.
  const {
    localFeePct,
    setLocalFeePct,
    localBonusPct,
    setLocalBonusPct,
    localF2Pct,
    setLocalF2Pct,
    localBonusF2Pct,
    setLocalBonusF2Pct,
    dialNote,
    setDialNote,
    debouncedFeePct,
    debouncedBonusPct,
    debouncedF2Pct,
    debouncedBonusF2Pct,
    hasF2,
    hasF2Bonus,
    sortedAllocations,
    dialCaps,
    feeDefaultPct,
    f2DefaultPct,
    maxFeePct,
    maxBonusPct,
    maxF2Pct,
    maxBonusF2Pct,
    totalCumPct,
    isDialSyncing,
  } = useWorksheetDial({
    detail,
    currentWorksheet,
    worksheets: dealWorksheets?.results,
    // Query hỏng cũng phải tính là "xong": nếu không, effect seed dial không bao giờ chạy và
    // `isDialSyncing` giữ `BusyOverlay` phủ chết Mục ③④⑤⑥ tới khi F5.
    isWorksheetListSettled: !isDealWorksheetsPending,
    worksheetId: renderedWorksheetId,
  })

  // `useAppConstant` trả túi `any` khoá theo tên hằng — neo về `unknown` ngay tại biên rồi
  // thu hẹp bên dưới, thay vì để `any` chảy vào `rawMgmtTypes`/`mgmtRoleLabels`.
  const appConstantQuery = useAppConstant({
    module: 'realestate',
    keys: [
      APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.MANAGEMENT_SECTION_PCT_TYPES,
      APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.MGMT_ROLE_LABELS,
    ],
  }) as { constants?: Record<string, unknown> }
  const constants = appConstantQuery.constants

  const rawMgmtTypes =
    constants?.[APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.MANAGEMENT_SECTION_PCT_TYPES]
  // mgmt_<role>_<category> — role labels from app-constant; category columns reuse the exact
  // definitions (labels + hidden) of the TBC config table on the sale-allocation targets tab.
  const mgmtRoleLabels = (constants?.[
    APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.MGMT_ROLE_LABELS
  ] || {}) as Record<string, string>

  // Bốn vị từ dưới đây được useCallback KHÔNG phải để tiết kiệm cấp phát, mà để giữ identity
  // ổn định: chúng là dependency thật của các memo bên dưới và của Mục ⑤⑥. Nếu mỗi lượt render
  // lại sinh hàm mới thì hoặc phải bỏ chúng khỏi deps (memo giữ kết quả tính bằng app constant
  // CŨ, sai lặng lẽ), hoặc để trong deps và mọi memo mất tác dụng.
  const isMgmt = useCallback(
    (type: string) => {
      if (type.startsWith('mgmt_')) return true
      if (Array.isArray(rawMgmtTypes)) return rawMgmtTypes.includes(type)
      return false
    },
    [rawMgmtTypes]
  )
  const isSale = useCallback((type: string) => !isMgmt(type), [isMgmt])

  // Split "mgmt_<role>_<category>" into its role code (category suffix stripped).
  const mgmtRoleCode = useCallback((pctType: string) => {
    const s = (pctType || '').replace(/^mgmt_/, '')
    for (const col of RATE_COLUMNS) {
      if (s.endsWith(`_${col.category}`)) return s.slice(0, -(String(col.category).length + 1))
    }
    return s
  }, [])
  // Category columns matched with the sale-allocation TBC config table (same fields, same
  // order, project_bonus hidden), with the shorter column labels requested for this screen.
  const MGMT_COL_LABEL: Record<string, string> = {
    agency_fee: 'Thưởng quản lý',
    investor_bonus: 'Thưởng quản lý từ CDT',
    mv_bonus: 'Thưởng quản lý bổ sung',
  }
  const mgmtCategories = RATE_COLUMNS.filter((c) => !c.hidden).map((c) => ({
    key: String(c.category),
    label: MGMT_COL_LABEL[String(c.category)] || c.label,
  }))

  const isCommissionType = useCallback((type: string) => {
    const COMMISSION_TYPES: string[] = [
      COMMISSION_PCT_TYPES.F1_SALE.pct,
      COMMISSION_PCT_TYPES.F1_SALE.amt,
      COMMISSION_PCT_TYPES.F2_SALE.pct,
      COMMISSION_PCT_TYPES.F2_SALE.amt,
    ]
    return COMMISSION_TYPES.includes(type)
  }, [])

  const hasBeenSplit = !!(
    detail.has_commission_payable ??
    detail.positions?.some((pos) => pos.recipients && pos.recipients.length > 0)
  )

  const { user } = useAuth()
  const ability = useAbility()
  const hasSplitPermission = useMemo(
    () =>
      hasPermission(user?.permissions || [], 'dealperiodworksheet.split_by_recipient') ||
      hasPermission(user?.permissions || [], 'commissionsplit.recipients'),
    [user?.permissions]
  )
  // Admin "Duyệt chi" (project admin confirms disbursement for this unit) — same permission
  // and gating as the "Duyệt chi" row action on the "Giao dịch tiền về đợt này" list.
  const canAdminApprove = ability.can('admin_approve', 'dealperiodworksheet')

  // Quyền LƯU dial "% thanh toán kỳ này" tách riêng khỏi quyền XEM (commissionsplit.recipients).
  // KETOAN_HHQL thấy dial nhưng không có set_period_progress → view-only (ẩn nút Lưu, không 403).
  const canEditDial = ability.can('set_period_progress', 'dealperiodworksheet')

  const isTkdaView = !hasSplitPermission || isAdminView

  const isKT = !isTkdaView

  // Thao tác ghi cấp trang (duyệt chi, mở lại bảng kê, bỏ tạm ngưng) + cờ "đang bận" mà
  // chúng áp lên Mục ③④ và lên effect nạp lại form.
  const {
    isApproving,
    isReopening,
    isReleasing,
    isWorksheetBusy,
    isPaymentSuspended,
    worksheetBusyRef,
    markWorksheetBusy,
    onApproveDisbursement,
    onReopenWorksheet,
    handleReleaseSuspension,
  } = useWorksheetActions({
    detail,
    worksheetId,
    currentWorksheet,
    activeWorksheet,
    pbtvId,
    isAdminView,
    hasBeenSplit,
    localFeePct,
    localBonusPct,
    localF2Pct,
    localBonusF2Pct,
    dialNote,
    onRefresh,
  })

  // Form chia thực nhận: bản ĐÃ LƯU (`form`) và bản ĐANG XEM sau khi rescale theo dial
  // (`effectivePositions`) — Mục ④/⑤⑥ đọc bản thứ hai.
  const { form, positionFields, watchedPositions, effectivePositions } = useCommissionSplitForm({
    detail,
    worksheetId,
    worksheetBusyRef,
    isWorksheetBusy,
    activeWorksheet,
    currentWorksheet,
    debouncedFeePct,
    debouncedBonusPct,
    debouncedF2Pct,
    debouncedBonusF2Pct,
  })

  // % phí ĐÃ LƯU ở server — mẫu để so với dial trên màn.
  const storedFeePctForBadge = useMemo(() => {
    if (activeWorksheet?.fee_progress_pct != null)
      return parseFloat(activeWorksheet.fee_progress_pct)
    if (activeWorksheet?.total_distribution_pct)
      return parseFloat(activeWorksheet.total_distribution_pct)
    return 0
  }, [activeWorksheet])

  const currentTotalPaid = useMemo(() => {
    if (!effectivePositions) return 0
    return effectivePositions
      .filter((pos) => isSale(pos.pct_type || ''))
      .reduce((sum, pos) => {
        const recips = pos.recipients || []
        const allocated = recips.reduce((s: number, r) => s + Number(r.amount || 0), 0)
        const hold = recips.reduce((s: number, r) => s + Number(r.hold_amount || 0), 0)
        return sum + netAfterHold(allocated, hold)
      }, 0)
  }, [effectivePositions, isSale])

  const currentMgmtTotalThis = useMemo(() => {
    if (!effectivePositions) return 0
    return effectivePositions
      .filter((p) => isMgmt(p.pct_type || ''))
      .reduce((sum, p) => {
        const recipsSum = p.recipients?.reduce((s, r) => s + parseNumberSafe(r.amount), 0) || 0
        const thisAmt = recipsSum > 0 ? recipsSum : Number(p.actual_amount || 0)
        return sum + thisAmt
      }, 0)
  }, [effectivePositions, isMgmt])

  const salesGroupedByPerson = useMemo(() => {
    const map = new Map<
      string,
      {
        code: string
        name: string
        recipient_id: number
        recipient_type: string
        positions: Array<{
          posIdx: number
          posData: FormValues['positions'][number]
        }>
      }
    >()

    positionFields.forEach((_, pIdx) => {
      const posData = effectivePositions[pIdx] || watchedPositions[pIdx]
      if (!posData || !isSale(posData.pct_type || '')) return

      const code = posData.owner_code || ''
      const name = posData.owner_name || ''
      const recipient_id = posData.recipient_id || 0
      const recipient_type = posData.recipient_type || 'employee'

      const existing = map.get(code)
      if (existing) {
        existing.positions.push({ posIdx: pIdx, posData })
      } else {
        map.set(code, {
          code,
          name,
          recipient_id,
          recipient_type,
          positions: [{ posIdx: pIdx, posData }],
        })
      }
    })

    // Within each group, order commission positions before bonus positions
    // (stable sort preserves the original relative order otherwise).
    map.forEach((group) => {
      group.positions.sort((a, b) => {
        const aRank = isCommissionType(a.posData.pct_type || '') ? 0 : 1
        const bRank = isCommissionType(b.posData.pct_type || '') ? 0 : 1
        return aRank - bRank
      })
    })

    return Array.from(map.values())
  }, [positionFields, effectivePositions, watchedPositions, isSale, isCommissionType])

  // Mục ④ KPI: aggregate per UNIQUE payee (account facts are per payee, not per stand
  // person) so a cross-share "nhận hộ" payee is not double-counted.
  const muc4Kpi = useMemo(() => {
    const byPayee = new Map<
      string,
      { thucNhan: number; paid: number; accountHold: number; ralHold: number }
    >()
    // First group (by code) where each payee appears — that group's table shows the
    // per-payee account columns (advance/hold/paid); later groups show a dash so a
    // cross-share "nhận hộ" payee is not double-displayed. Precomputed here instead of
    // mutating a Set during child renders (render-order dependent, StrictMode-unsafe).
    const accountOwnerByPayee = new Map<string, string>()
    salesGroupedByPerson.forEach((group) => {
      const rows = buildPayeeRows(group.positions, {
        isCommissionType,
        ownerType: group.recipient_type,
        ownerId: group.recipient_id,
      }).map(computeRow)
      rows.forEach((r) => {
        if (!accountOwnerByPayee.has(r.key)) accountOwnerByPayee.set(r.key, group.code)
        const e = byPayee.get(r.key) || { thucNhan: 0, paid: 0, accountHold: 0, ralHold: 0 }
        e.thucNhan += r.thucNhan
        e.paid = r.paid // per-payee account value; identical across rows, take as-is
        e.accountHold = r.accountHold // idem — do NOT sum across groups (would double-count)
        e.ralHold += r.ralHold // per-share hold — sums across the payee's positions/groups
        byPayee.set(r.key, e)
      })
    })
    let canChi = 0
    let daChi = 0
    let giuLai = 0
    byPayee.forEach((e) => {
      canChi += e.thucNhan
      daChi += e.paid
      // `ralHold` sums the payee's per-share holds, and a giảm-trừ share carries a NEGATIVE
      // one — correct as a net, but a payee whose deductions outweigh their commissions must
      // not subtract from the KPI (the BE clamps the same total at the account/summary level).
      giuLai += Math.max(0, e.accountHold > 0 ? e.accountHold : e.ralHold)
    })
    return { canChi, daChi, giuLai, accountOwnerByPayee }
  }, [salesGroupedByPerson, isCommissionType])

  // Enriched groups for the single Mục ④ table (band per đứng tên + participation %).
  const muc4Groups = useMemo(() => {
    return salesGroupedByPerson.map((group) => {
      // Participation = contribution split of the deal party (sale 55 / F2 45), read from
      // the group's commission share — NOT the money-weighted HH ratio. Take it from the
      // commission position of the group (each stand person carries one commission share).
      const commissionPos = group.positions.find((p) => isCommissionType(p.posData.pct_type || ''))
      const participation = commissionPos?.posData.participation
      return {
        code: group.code,
        name: group.name,
        recipient_type: group.recipient_type,
        recipient_id: group.recipient_id,
        participationPct: participation != null ? Math.round(Number(participation)) : null,
        positions: group.positions,
      }
    })
  }, [salesGroupedByPerson, isCommissionType])

  const muc4DisbursementLocked = !!(
    activeWorksheet?.worksheet_status === WORKSHEET_STATUS.APPROVED ||
    // `worksheet_status` chưa có trong schema sinh tự động của payload chi tiết — neo hẹp
    // đúng một field thay vì `as any` cho cả object.
    (detail as { worksheet_status?: string }).worksheet_status === WORKSHEET_STATUS.APPROVED ||
    detail.is_locked
  )

  /**
   * "Số trên màn chưa đáng tin" — gộp HAI nguồn, vì với người đọc chúng như nhau:
   *  - `isWorksheetBusy`: đang GHI (duyệt chi / lưu dial) — số giữa hai PATCH là số nửa vời.
   *  - `isRefreshing`: đang ĐỌC lại (đổi kỳ / tải lại nền) — query giữ dữ liệu cũ nên màn
   *    đang hiện số của kỳ TRƯỚC.
   * Mục ③④⑤⑥ đều bám kỳ đang chọn nên cùng phủ theo cờ này; Mục ①② bám theo CĂN (không
   * đổi khi chuyển kỳ) nên tự phủ theo query của riêng chúng.
   */
  const isPeriodDataBusy = isWorksheetBusy || isRefreshing || isDialSyncing

  return (
    <FormProvider {...form}>
      <div className="bg-background-1 flex h-full flex-col overflow-hidden">
        <CommissionSplitPageHeader
          detail={detail}
          activeWorksheet={activeWorksheet}
          projectName={dealWorkspace?.overview?.project?.name}
          investorName={dealWorkspace?.overview?.project?.investor_name}
          isAdminView={isAdminView}
          canAdminApprove={canAdminApprove}
          isApproving={isApproving}
          isReopening={isReopening}
          isReleasing={isReleasing}
          isPaymentSuspended={isPaymentSuspended}
          onBack={onBack}
          onApproveDisbursement={onApproveDisbursement}
          onReopenWorksheet={onReopenWorksheet}
          onReleaseSuspension={handleReleaseSuspension}
          onOpenSuspend={() => setSuspendOpen(true)}
        />

        <div className="bg-background-3 flex flex-grow flex-col gap-4 overflow-y-auto px-7 pt-4 pb-6">
          {/* ── ① Phân chia HH — Các bên tham gia (mượn khối của màn chi tiết deal) ── */}
          <DealPartiesSection dealId={detail.deal_id} />

          {/* ── ② Phí đại lý → Nhận về (dòng tiền thu theo kỳ, THU) ────── */}
          {/* Mã phiếu thu của các đợt đã đóng băng: bảng thu là nơi kế toán đọc "đợt nào",
              nên khoá phải hiện ngay tại dòng đó, không chỉ trong banner ở Mục ⑥. */}
          <DealPaymentProgressTable
            dealId={detail.deal_id}
            lockedReceiptCodes={(
              (detail.locked_tranches ?? []) as unknown as { receipt_code?: string }[]
            )
              .map((t) => t.receipt_code)
              .filter((code): code is string => !!code)}
          />

          {/* ── ③ Tiến độ thanh toán luỹ kế của căn ─────────────────────── */}
          {/* Overlay cùng lúc với Mục ④: dial là đầu vào của mọi con số bên dưới, để nó
              tương tác được trong lúc 2 PATCH đang chạy là mời race condition. */}
          <div className="relative">
            <BusyOverlay busy={isPeriodDataBusy} />
            <PaymentProgressTimeline
              detail={detail}
              currentDetail={currentDetail}
              sortedAllocations={sortedAllocations}
              worksheetId={renderedWorksheetId}
              routeIdStr={routeIdStr}
              localFeePct={localFeePct}
              setLocalFeePct={setLocalFeePct}
              localBonusPct={localBonusPct}
              setLocalBonusPct={setLocalBonusPct}
              localF2Pct={localF2Pct}
              setLocalF2Pct={setLocalF2Pct}
              localBonusF2Pct={localBonusF2Pct}
              setLocalBonusF2Pct={setLocalBonusF2Pct}
              maxFeePct={maxFeePct}
              maxBonusPct={maxBonusPct}
              maxF2Pct={maxF2Pct}
              maxBonusF2Pct={maxBonusF2Pct}
              hasF2={hasF2}
              hasF2Bonus={hasF2Bonus}
              dialCaps={dialCaps}
              totalCumPct={totalCumPct}
              currentTotalPaid={currentTotalPaid}
              currentMgmtTotalThis={currentMgmtTotalThis}
              isTkdaView={isTkdaView}
              canEditDial={canEditDial}
              onWriteStateChange={markWorksheetBusy}
              dialNote={dialNote}
              setDialNote={setDialNote}
              feeDefaultPct={feeDefaultPct}
              f2DefaultPct={f2DefaultPct}
            />
          </div>

          {/* BLOCK 4: Căn hộ & Hóa đơn (gộp từ Mục ① cũ) + Chia thực nhận theo đối tượng */}
          <WorksheetPayoutSection
            detail={detail}
            currentWorksheet={activeWorksheet || currentWorksheet}
            worksheetId={renderedWorksheetId}
            groups={muc4Groups}
            kpi={muc4Kpi}
            isCommissionType={isCommissionType}
            isKT={isKT}
            isAdminView={isAdminView}
            isWorksheetBusy={isPeriodDataBusy}
            isApproving={isApproving}
            localFeePct={localFeePct}
            localF2Pct={localF2Pct}
            localBonusPct={localBonusPct ?? dialCaps.bonusMax}
            localBonusF2Pct={localBonusF2Pct ?? dialCaps.bonusF2Max}
            storedFeePctForBadge={storedFeePctForBadge}
            isDisbursementLocked={muc4DisbursementLocked}
            hasF2={hasF2}
            pbtvId={pbtvId}
            onRefresh={onRefresh}
            isMgmt={isMgmt}
          />

          {/* BLOCKS 5 & 6: HH QUẢN LÝ & KPI.
              `flex flex-col gap-4` trên lớp bọc là BẮT BUỘC: section trả về một fragment gồm
              HAI panel (⑤ và ⑥). Trước khi bọc, chúng là con trực tiếp của vùng cuộn nên ăn
              `gap-4` của nó; bọc thêm một lớp mà không khai gap là hai panel dính liền nhau. */}
          <div className="relative flex flex-col gap-4">
            <BusyOverlay busy={isPeriodDataBusy} />
            <ManagementCommissionSection
              detail={detail}
              worksheetId={renderedWorksheetId}
              effectivePositions={effectivePositions}
              appliedFeePct={debouncedFeePct}
              isKT={isKT}
              isAdminView={isAdminView}
              isTkdaView={isTkdaView}
              categories={mgmtCategories}
              isMgmt={isMgmt}
              mgmtRoleCode={mgmtRoleCode}
              mgmtRoleLabels={mgmtRoleLabels}
            />
          </div>
        </div>
      </div>

      {isAdminView && suspendOpen && (
        <PaymentSuspensionDialog
          dealId={detail.deal_id}
          dealCode={detail.deal_code}
          isOpen={suspendOpen}
          onClose={() => setSuspendOpen(false)}
          onSuccess={onRefresh}
        />
      )}
    </FormProvider>
  )
}

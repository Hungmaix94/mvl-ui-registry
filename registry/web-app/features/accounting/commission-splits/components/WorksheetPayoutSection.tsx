import { type ComponentProps, useMemo, useState } from 'react'
import { useFormContext } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'

import { IconX } from '@/assets/icons'
import { ReferenceCode } from '@/components/commons'
import { Button } from '@/components/ui'
import {
  useDealCommissionConfigList,
  useDealWorkspace,
} from '@/features/sales/deals/services/deal-service'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect'
import { APP_PATH } from '@/routes'
import toastService from '@/services/toast-service'
import { formatCurrencyVND, formatPct } from '@/utils/common'
import { formatDate } from '@/utils/date-utils'
import { extractErrorMessage } from '@/utils/error-utils'

import { usePooledSplit } from '../hooks/usePooledSplit'
import type {
  CommissionSplitDetail,
  CommissionSplitListRow,
} from '../services/commission-splits-service'
import { useDealPaymentProgress, useUpdateRecipients } from '../services/commission-splits-service'
import { buildGroups } from '../utils/build-groups'
import { isDeductionType } from '../utils/payout-math'

import { BusyOverlay, ProvisionalBadge } from './BusyOverlay'
import type { FormValues } from './commission-split-form.types'
import { HoldDialog, useHoldDialog } from './HoldDialog'
import { KV } from './KV'
import { type LockedTranche, PartialLockBanner } from './PartialLockBanner'
import { PooledSplitDialog } from './PooledSplitDialog'
import { RecipientPayoutTable } from './RecipientPayoutTable'
import { RecipientSplitEditor } from './RecipientSplitEditor'
import { SubHead } from '@/components/commons/SubHead'
import { WorksheetDerivationStrip } from './WorksheetDerivationStrip'

/** Nhóm hàng của bảng chia thực nhận — lấy thẳng kiểu từ bảng để không định nghĩa trùng. */
type PayoutGroups = ComponentProps<typeof RecipientPayoutTable>['groups']
/**
 * KPI kỳ này: dải suy diễn ăn phần số tiền, bảng chia ăn thêm bản đồ payee ↦ nhóm sở hữu
 * cột tài khoản. Neo vào kiểu của CHÍNH hai component tiêu thụ nên đổi bên nào là báo lỗi
 * ngay tại đây, không phải định nghĩa lại một bản thứ ba dễ trôi.
 */
type PayoutKpi = NonNullable<ComponentProps<typeof WorksheetDerivationStrip>['kpi']> & {
  accountOwnerByPayee: ComponentProps<typeof RecipientPayoutTable>['accountOwnerByPayee']
}

export interface WorksheetPayoutSectionProps {
  detail: CommissionSplitDetail
  currentWorksheet?: CommissionSplitListRow
  /** Nhóm đã làm giàu cho bảng chia thực nhận (Mục ④). */
  groups: PayoutGroups
  /** KPI kỳ này + bản đồ payee ↦ nhóm sở hữu cột tài khoản. */
  kpi: PayoutKpi
  /** Vị mã HH này có thuộc loại "phí hoa hồng" hay không — hỏi theo từng `pct_type`. */
  isCommissionType: ComponentProps<typeof RecipientPayoutTable>['isCommissionType']
  isKT: boolean
  isAdminView: boolean
  isWorksheetBusy: boolean
  isApproving: boolean
  /** % TT phí của dial Mục ③ — cột "% thanh toán kỳ này" bám đúng ô này. */
  localFeePct: number
  localF2Pct?: number | null
  /** % TT thưởng đang áp cho kỳ — dial kế toán, hoặc trần nếu chưa chốt. */
  localBonusPct?: number | null
  localBonusF2Pct?: number | null
  /** % đã lưu trên server, để so với dial mà cảnh báo số tạm tính. */
  storedFeePctForBadge: number
  /** Đã duyệt chi thực nhận → khóa mọi thao tác sửa. */
  isDisbursementLocked: boolean
  hasF2: boolean
  /** Kỳ đang xem (`?worksheet_id=`, mặc định là kỳ trên route) — đích của mọi lệnh ghi. */
  worksheetId: number
  /** Phân bổ thực nhận của kỳ — đích của lệnh giữ / mở giữ. */
  pbtvId?: number | string | null
  onRefresh?: () => void
  /** Danh sách `pct_type` quản lý đến từ app constant lúc chạy, nên phải truyền vào. */
  isMgmt: (type: string) => boolean
}

/**
 * MỤC ④ — "Căn hộ & Chia thực nhận theo từng đối tượng".
 *
 * CR STT39 đã gộp Mục ① cũ ("Căn hộ & Hóa đơn") vào đây, nên thẻ này mang ba tầng:
 * hàng ĐỊNH DANH (căn / giao dịch / hóa đơn), dải CƠ SỞ TÍNH ⟂ KỲ NÀY, rồi mới tới
 * bảng chia tiền từng người.
 *
 * Ba query dưới đây gọi lại ở chính section thay vì nhận qua props: React Query dedupe
 * theo query key nên không phát sinh request thừa, đổi lại section tự đủ dữ liệu định
 * danh của mình và trang cha bớt một tầng khoan props.
 */
export function WorksheetPayoutSection({
  detail,
  currentWorksheet,
  groups,
  kpi,
  isCommissionType,
  isKT,
  isAdminView,
  isWorksheetBusy,
  isApproving,
  localFeePct,
  localF2Pct,
  localBonusPct = null,
  localBonusF2Pct = null,
  storedFeePctForBadge,
  isDisbursementLocked,
  hasF2,
  worksheetId,
  pbtvId,
  onRefresh,
  isMgmt,
}: WorksheetPayoutSectionProps) {
  // Form của cả trang do `CommissionSplitDetailInfo` sở hữu và bọc bằng `FormProvider`;
  // section lấy qua context thay vì để trang cha khoan `form` xuống từng tầng.
  const form = useFormContext<FormValues>()
  const navigate = useNavigate()
  const { loadEmployeeOptions } = useEmployeeSelect()
  const { mutateAsync: updateRecipients } = useUpdateRecipients()

  // Chia gộp cho đối tượng khác — state + ba thao tác áp/huỷ/sửa.
  const {
    pooledDialogOpen,
    setPooledDialogOpen,
    pooledEditing,
    setPooledEditing,
    savingPooled,
    pooledBands,
    pooledFeeGroups,
    submitPooledSplit,
    onCancelPooled,
    onEditPooled,
  } = usePooledSplit({
    detail,
    groups,
    currentWorksheet,
    worksheetId,
    isCommissionType,
    onRefresh,
  })

  // Tạm giữ / mở tạm giữ hoa hồng của một người nhận (theo nhóm hoặc theo người gộp).
  const {
    openGroupHold,
    openPooledHold,
    dialogProps: holdDialogProps,
  } = useHoldDialog({ groups, pbtvId, isCommissionType, onRefresh })

  // drf-spectacular làm mất shape của `workspace`, nên hook trả `any`. Ép hẹp NGAY tại lời
  // gọi về đúng ba nhánh màn này đọc — làm ở đây thì `any` không kịp lan xuống dưới.
  const dealWorkspaceQuery = useDealWorkspace(detail.deal_id, {
    enabled: !!detail.deal_id,
  }) as {
    data?: {
      overview?: {
        project?: { name?: string | null; investor_name?: string | null } | null
        source?: { type?: string; exchange_name?: string | null } | null
        pi?: { id?: number } | null
      } | null
      pricing?: { pct_revenue?: string | number | null } | null
    }
  }
  const dealWorkspace = dealWorkspaceQuery.data
  const { data: dealPaymentProgress } = useDealPaymentProgress(detail.deal_id, {
    enabled: !!detail.deal_id,
  })
  const { data: dealCommissionConfig } = useDealCommissionConfigList(detail.deal_id, {
    enabled: !!detail.deal_id,
  })

  const overviewSource = dealWorkspace?.overview?.source
  const propInventoryId = dealWorkspace?.overview?.pi?.id
  const saleFeePct = (
    dealCommissionConfig as { current?: { pct_sale_commission?: string | null } } | undefined
  )?.current?.pct_sale_commission

  /** Mọi số hóa đơn đã có phiếu thu của căn — hiện thành chuỗi pill dưới "Hóa đơn tháng". */
  const allInvoiceNos = useMemo(() => {
    const nos = (dealPaymentProgress?.periods ?? [])
      .map((p) => p.invoice_no)
      .filter((no): no is string => !!no)
    return Array.from(new Set(nos))
  }, [dealPaymentProgress])

  /**
   * Dial trên màn lệch số đã lưu ⇒ `effectivePositions` đang NHÂN CHIA LẠI tiền phía client
   * (cùng điều kiện `>= 1e-9` mà nó dùng để bật đường rescale). Lúc đó mọi ô tiền ở Mục 4 là
   * số tạm tính, không phải số server — phải nói ra, nếu không kế toán không phân biệt được.
   */
  const dialIsProvisional = useMemo(
    () => Math.abs(localFeePct - storedFeePctForBadge) >= 1e-9,
    [localFeePct, storedFeePctForBadge]
  )

  // ── Pooled split (chia gộp cho đối tượng khác) ────────────────────────────────
  // One outside payee takes fee_pct × basis in ONE row; every stand person keeps the
  // pro-rata remainder. Money still persists per RecipientAllocationLine on the BE —
  // the pooled header only carries the entered % + display grouping
  // (docs/plans/plan_pooled_payout_split_20260723.md).
  // ── Chia thực nhận theo từng người đứng tên (modal) ───────────────────────────
  // BE only touches groups in the payload, so sending just this group's positions
  // leaves the other groups untouched.
  const [editGroupCode, setEditGroupCode] = useState<string | null>(null)
  const [savingGroup, setSavingGroup] = useState(false)

  const openGroupEdit = (code: string) => {
    setEditGroupCode(code)
  }
  // Cancel: form.reset() (no args) restores the field arrays to the defaults last set by
  // the detail->form effect, so unsaved edits (incl. any on-mount normalization inside
  // PositionTableBlock) don't leak into the read table. Matches the original cancel.
  const cancelGroupEdit = () => {
    form.reset()
    setEditGroupCode(null)
  }

  const saveGroup = async () => {
    const group = groups.find((g) => g.code === editGroupCode)
    if (!group || !worksheetId) {
      toastService.error('Không tìm thấy ID bảng tính hoa hồng')
      return
    }
    const positions = form
      .getValues()
      .positions.filter(
        (p) =>
          // Only this person's SALE splits — never sweep in their mgmt_* rows, which may be
          // mid-edit in the management block (saveMgmt owns those). Nhóm giảm trừ ĐI CÙNG,
          // vì trình sửa đã cân sẵn nó theo tỉ lệ chia phí (hoặc theo số kế toán gõ tay) —
          // gửi đúng cái đang hiển thị, BE ghi y như nhận.
          !isMgmt(p.pct_type || '') &&
          p.recipient_type === group.recipient_type &&
          String(p.recipient_id) === String(group.recipient_id)
      )
      // Drop blank added rows (no identity, zero amount) and block rows that carry money
      // but no chosen payee — the BE requires exactly one identity per split. Pooled
      // (chia gộp) rows are NEVER sent: the BE validates the editor input against
      // `allocated − pooled` and re-appends the pooled rows itself.
      .map((p) => ({
        ...p,
        recipients: p.recipients.filter(
          (r) =>
            (r as { pooled_allocation_id?: number | null }).pooled_allocation_id == null &&
            (r.employee_id || r.collaborator_id || r.exchange_id || Number(r.amount || 0) !== 0)
        ),
      }))
    const missingIdentity = positions.some((p) =>
      p.recipients.some(
        (r) => !r.employee_id && !r.collaborator_id && !r.exchange_id && Number(r.amount || 0) !== 0
      )
    )
    if (missingIdentity) {
      toastService.error('Có dòng đã nhập tiền nhưng chưa chọn người nhận')
      return
    }

    // Validate that the sum of splits for each position equals its expected amount.
    for (const p of positions) {
      const expected = Number(p.expected_amount || 0)
      const sum = p.recipients.reduce((s, r) => s + Number(r.amount || 0), 0)
      if (Math.abs(sum - Math.round(expected)) > 1) {
        const typeLabel = isDeductionType(p)
          ? 'khấu trừ'
          : isCommissionType(p.pct_type || '')
            ? 'phí hoa hồng'
            : 'thưởng'
        toastService.error(
          `Tổng số tiền đã chia (${formatCurrencyVND(sum)} đ) phải bằng số tiền phân bổ (${formatCurrencyVND(expected)} đ) cho phần ${typeLabel}`
        )
        return
      }
    }

    try {
      setSavingGroup(true)
      await updateRecipients({
        id: worksheetId,
        data: { groups: buildGroups(positions, isMgmt) },
      })
      toastService.success('Đã lưu chia thực nhận')
      setEditGroupCode(null)
      onRefresh?.()
    } catch (error) {
      toastService.error(extractErrorMessage(error))
    } finally {
      setSavingGroup(false)
    }
  }

  // ── Tạm giữ / mở giữ (Giữ) ────────────────────────────────────────────────────
  const canUsePooled = !isAdminView && isKT && detail.recipients_editable
  const pooledDisabled =
    // Gate cả trong lúc duyệt chi: apply pooled giữa 2 PATCH sẽ ghi lên
    // composition mà approve đang chốt.
    isApproving || isDisbursementLocked || pooledFeeGroups.length === 0 || hasF2

  return (
    <>
      <div className="border-border-1 relative flex flex-col overflow-hidden rounded-md border bg-white">
        <BusyOverlay busy={isWorksheetBusy} />
        <SubHead
          n="4"
          title="Căn hộ & Chia thực nhận — theo từng đối tượng"
          subtitle="Căn / hóa đơn của bảng kê, cơ sở tính phí, và số tiền trả từng người trong kỳ (Sale / F2 / CTV). Bấm Chia/Sửa hoặc Giữ trên từng dòng để thao tác."
        />

        {/* CR STT39 — Mục ① "Căn hộ & Hóa đơn" đã gộp hẳn vào thẻ này, không còn thẻ
          riêng ở đầu trang. Hàng dưới đây là phần ĐỊNH DANH: bảng kê đang xem thuộc
          căn nào, giao dịch nào, hóa đơn tháng nào. */}
        <div className="border-border-1 grid grid-cols-1 gap-0 border-b md:grid-cols-4">
          <KV
            k="Dự án"
            v={
              <div className="flex flex-col gap-0.5">
                {detail.project_id && dealWorkspace?.overview?.project?.name ? (
                  <span
                    className="cursor-pointer font-bold text-neutral-900 hover:underline"
                    onClick={() =>
                      navigate(
                        APP_PATH.PROJECT_MANAGEMENT_DETAIL.replace(
                          ':id',
                          detail.project_id!.toString()
                        )
                      )
                    }
                  >
                    {dealWorkspace.overview.project.name}
                  </span>
                ) : (
                  <span className="font-bold text-neutral-900">
                    {dealWorkspace?.overview?.project?.name || '—'}
                  </span>
                )}
                <span className="text-[11px] text-neutral-500">
                  CĐT: {dealWorkspace?.overview?.project?.investor_name || '—'}
                </span>
                <span className="text-[11px] text-neutral-500">
                  Nguồn nhập:{' '}
                  {overviewSource?.exchange_name
                    ? `Sàn F2 · ${overviewSource.exchange_name}`
                    : overviewSource?.type || '—'}
                </span>
              </div>
            }
            noBorderB
          />
          <KV
            k="Mã giao dịch / Mã căn"
            v={
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-neutral-500">GD:</span>
                  <ReferenceCode
                    code={detail.deal_code}
                    enableCopy
                    linkTo={
                      detail.deal_id
                        ? APP_PATH.DEAL_DETAIL.replace(':id', String(detail.deal_id))
                        : undefined
                    }
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-neutral-500">Căn:</span>
                  <ReferenceCode
                    code={detail.unit_number || detail.prop_code}
                    enableCopy
                    linkTo={
                      propInventoryId
                        ? APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL.replace(
                            ':id',
                            String(propInventoryId)
                          )
                        : undefined
                    }
                  />
                </div>
              </div>
            }
            noBorderB
          />
          <KV
            k="Hóa đơn tháng"
            v={
              <div className="flex flex-col gap-1">
                <span className="font-bold text-neutral-900">
                  {detail.period_month && detail.period_year
                    ? `${String(detail.period_month).padStart(2, '0')}/${detail.period_year}`
                    : '—'}
                </span>
                {allInvoiceNos.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {allInvoiceNos.map((no) => (
                      <ReferenceCode
                        key={no}
                        code={no}
                        enableCopy
                        linkTo={`${APP_PATH.SALES_INVOICE}?search=${encodeURIComponent(no)}`}
                      />
                    ))}
                  </div>
                ) : (
                  <span className="text-[11px] text-neutral-400">Chưa xuất HĐ</span>
                )}
              </div>
            }
            noBorderB
          />
          <KV
            k="Ngày cọc"
            v={currentWorksheet?.deposit_date ? formatDate(currentWorksheet.deposit_date) : '—'}
            noBorderR
            noBorderB
          />
        </div>

        {dialIsProvisional && (
          <div className="border-border-1 bg-orange-10 flex items-center gap-2 border-b px-4 py-2">
            <ProvisionalBadge storedLabel={formatPct(storedFeePctForBadge, 2)} />
          </div>
        )}

        <div className="flex flex-col">
          {/* CR STT39 — CƠ SỞ TÍNH (nửa dưới Mục ① cũ) đứng CHUNG MỘT DÒNG với
            KỲ NÀY (KPI Mục ④). "Giá trị căn hộ tạm tính" bỏ hẳn theo yêu cầu.

            Bệ XÁM bọc ngoài là bắt buộc, không phải trang trí: các ô bên trong dải là thẻ
            TRẮNG có shadow, đặt thẳng lên nền trắng của panel thì chúng trông như trôi lơ
            lửng, không đọc ra được là đang thuộc mục nào. Bệ chỉ bọc dải suy diễn — KHÔNG
            bọc bảng bên dưới, nếu không bảng lại bị thụt lề so với các mục khác. */}
          <div className="border-border-1 bg-background-2 border-b px-4 py-3">
            <WorksheetDerivationStrip
              basis={currentWorksheet?.basis}
              saleFeePct={saleFeePct}
              pctRevenue={dealWorkspace?.pricing?.pct_revenue}
              kpi={groups.length > 0 ? kpi : null}
            />
          </div>
          {canUsePooled && (
            <div className="mb-3 flex items-center justify-end">
              <button
                type="button"
                disabled={pooledDisabled}
                onClick={() => {
                  setPooledEditing(null)
                  setPooledDialogOpen(true)
                }}
                title={
                  isDisbursementLocked
                    ? 'Đã duyệt chi thực nhận (Khóa sửa)'
                    : hasF2
                      ? 'Không hỗ trợ chia gộp khi deal có F2 tham gia'
                      : 'Chia 1 khoản % phí cho một người ngoài — các sale còn lại chia phần còn lại theo tỷ lệ tham gia'
                }
                className={
                  pooledDisabled
                    ? 'border-border-1 inline-flex cursor-not-allowed items-center gap-1 rounded border bg-neutral-100 px-3 py-1.5 text-[12px] font-medium text-neutral-400 opacity-60'
                    : 'border-border-1 hover:bg-neutral-30 inline-flex items-center gap-1 rounded border border-dashed bg-white px-3 py-1.5 text-[12px] font-medium text-neutral-700 transition-colors'
                }
              >
                + Chia gộp cho đối tượng khác
              </button>
            </div>
          )}
          <PartialLockBanner
            recipientsEditable={detail.recipients_editable}
            recipientsLockReason={detail.recipients_lock_reason}
            lockedAmount={detail.locked_amount}
            editableAmount={detail.editable_amount}
            // BE schema now types this as an opaque dict (drf-spectacular lost the concrete
            // shape) — the JSDoc on `locked_tranches` still documents the real runtime shape,
            // so anchor it back to LockedTranche instead of losing type safety at every caller.
            lockedTranches={(detail.locked_tranches ?? []) as unknown as LockedTranche[]}
            openTranches={
              ((detail as { open_tranches?: unknown }).open_tranches ?? []) as LockedTranche[]
            }
          />
          <RecipientPayoutTable
            groups={groups}
            isCommissionType={isCommissionType}
            accountOwnerByPayee={kpi.accountOwnerByPayee}
            canEdit={!!(isKT && detail.recipients_editable)}
            isDisbursementApproved={isDisbursementLocked}
            onEditGroup={openGroupEdit}
            onHoldGroup={openGroupHold}
            hideProxy={isAdminView}
            hideHoldCols={isAdminView}
            hideReceived={isAdminView}
            // CR STT20: cột "% TT phí kỳ này" bám đúng ô "% TT phí" của dial Mục 3 — cùng một
            // state, nên không bao giờ lệch. Từ 2026-08-05 hiển thị ở CẢ màn admin (đợt tiền
            // về): dial là con số của cả kỳ, mà API trả về một dòng gộp cho mỗi người nên hai
            // đợt cùng kỳ không sinh ra hai giá trị khác nhau để phải giấu đi.
            periodFeePct={localFeePct}
            periodF2Pct={localF2Pct}
            // Thưởng có tiến độ RIÊNG (đối chiếu CĐT × tỉ lệ tiền về), không đi theo dial phí.
            periodBonusPct={isAdminView ? null : (localBonusPct ?? 0)}
            periodBonusF2Pct={isAdminView ? null : (localBonusF2Pct ?? 0)}
            pooledBands={pooledBands}
            hidePooledRows
            // The band itself must render in the admin view — hidePooledRows is
            // unconditional now, so dropping it would make the pooled money vanish from
            // that screen. Its ACTIONS stay off: admin mirrors the "+ Chia gộp" button,
            // which is gated on !isAdminView.
            onEditPooled={isAdminView ? undefined : onEditPooled}
            onCancelPooled={isAdminView ? undefined : onCancelPooled}
            onHoldPooled={isAdminView ? undefined : openPooledHold}
          />
        </div>
      </div>

      {/* Pooled split dialog (chia gộp cho đối tượng khác) */}
      {pooledDialogOpen && (
        <PooledSplitDialog
          open
          onClose={() => {
            setPooledDialogOpen(false)
            setPooledEditing(null)
          }}
          groups={pooledFeeGroups}
          feeBasis={Number(currentWorksheet?.basis || 0)}
          loadEmployeeOptions={loadEmployeeOptions}
          saving={savingPooled}
          onSubmit={submitPooledSplit}
          initial={
            pooledEditing
              ? {
                  payee: {
                    kind: pooledEditing.payeeKey.split('-')[0] as
                      | 'employee'
                      | 'collaborator'
                      | 'exchange',
                    id: Number(pooledEditing.payeeKey.split('-').slice(1).join('-')),
                    name: pooledEditing.name,
                  },
                  feePct: pooledEditing.feePct != null ? pooledEditing.feePct.toFixed(4) : '',
                  // Prefill cả kênh thưởng: dialog là cấu hình ĐẦY ĐỦ của payee, mở lại
                  // mà thiếu kênh nào là vô tình tắt kênh đó khi bấm Lưu.
                  bonusPoolPct:
                    pooledEditing.bonusPoolPct != null ? pooledEditing.bonusPoolPct.toFixed(4) : '',
                  bonusAmount:
                    pooledEditing.bonusPoolPct == null && pooledEditing.bonus > 0
                      ? String(Math.round(pooledEditing.bonus))
                      : '',
                }
              : null
          }
        />
      )}

      {/* Per-group "chia thực nhận" edit modal (one đứng tên at a time) */}
      {editGroupCode != null &&
        (() => {
          const g = groups.find((x) => x.code === editGroupCode)
          if (!g) return null
          return (
            <Dialog.Root
              open
              onOpenChange={(o) => {
                if (!o) cancelGroupEdit()
              }}
            >
              <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30" />
                <Dialog.Content
                  className="border-border-1 fixed top-1/2 left-1/2 z-50 flex max-h-[88vh] w-[min(1120px,94vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl border bg-white shadow-xl"
                  onEscapeKeyDown={cancelGroupEdit}
                  // The recipient <Select> renders its dropdown in a body-level portal;
                  // clicking an option would otherwise be seen as an outside interaction
                  // and close this dialog. Only Hủy / X / Esc should close it.
                  onPointerDownOutside={(e) => e.preventDefault()}
                  onInteractOutside={(e) => e.preventDefault()}
                >
                  <div className="border-border-1 flex items-center justify-between border-b px-5 py-3">
                    <div>
                      <Dialog.Title className="text-[15px] font-bold text-neutral-900">
                        Chia thực nhận · {g.name}
                      </Dialog.Title>
                      <Dialog.Description className="mt-0.5 text-[12px] text-neutral-500">
                        {g.code} · phân bổ phí &amp; thưởng cho người thực nhận. Tổng mỗi loại phải
                        khớp mức phân bổ của nhóm.
                      </Dialog.Description>
                    </div>
                    <button
                      type="button"
                      onClick={cancelGroupEdit}
                      aria-label="Đóng"
                      className="rounded p-1 text-neutral-400 hover:bg-neutral-100"
                    >
                      <IconX className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    <RecipientSplitEditor
                      positions={g.positions}
                      isCommissionType={isCommissionType}
                      form={form}
                      loadEmployeeOptions={loadEmployeeOptions}
                      ownerType={g.recipient_type}
                      ownerId={g.recipient_id}
                    />
                  </div>
                  <div className="border-border-1 flex items-center justify-end gap-2 border-t px-5 py-3">
                    <Button
                      variant="secondary"
                      size="small"
                      onClick={cancelGroupEdit}
                      disabled={savingGroup}
                    >
                      Hủy
                    </Button>
                    <Button
                      variant="primary"
                      size="small"
                      onClick={saveGroup}
                      loading={savingGroup}
                    >
                      Lưu chia thực nhận
                    </Button>
                  </div>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
          )
        })()}

      <HoldDialog {...holdDialogProps} />
    </>
  )
}

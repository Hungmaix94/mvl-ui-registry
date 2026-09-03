import type { ReactNode } from 'react'
import { generatePath, Link, useInRouterContext } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Flex } from '@radix-ui/themes'

import { FullScreenLoading } from '@/components/ui'
import { IconEye } from '@/assets/icons'
import { APP_PATH } from '@/routes'
import { useAbility } from '@/lib/ability'
import { formatCurrencyVND, formatPercent } from '@/utils/common'
import { buildReconHistoryQuery } from '@/features/sales/_shared/reconciliation/recon-history-source'
import { filterPriorHistoryRows } from '@/features/sales/_shared/reconciliation/recon-calculations'
import {
  buildHistoryVM,
  type ReconRowVM,
} from '@/features/sales/_shared/reconciliation/ReconHistoryTable'
import { InvestorReconciliationStatusBadge } from '@/features/sales/_shared/reconciliation/InvestorReconciliationStatusBadge'

function vnd(value: number): string {
  return `${formatCurrencyVND(value, { maximumFractionDigits: 0 })} VNĐ`
}

function MutedDash() {
  return <span className="text-content-dark-3">—</span>
}

/** Dấu "VAT" nhỏ gắn sau một mục tiền — chỉ hiện khi mục đó bật cờ `is_*_include_vat` riêng. */
function VatBadge() {
  return (
    <span className="typo-body-xs-semibold bg-data-red-disabled text-data-red-default rounded-full px-2 py-0.5">
      VAT
    </span>
  )
}

/** "Ngày đối chiếu" cell — hàng chính là ngày, hàng phụ là người lập + tổ chức (chi nhánh - khối - phòng). */
function CreatedByCell({ vm }: { vm: ReconRowVM }) {
  const orgLine = [vm.createdByBranch, vm.createdByBlock, vm.createdByDept]
    .filter(Boolean)
    .join(' - ')
  return (
    <Flex direction="column" gap="1">
      <Flex direction="column" gap="0">
        <span className="typo-body-xs-regular text-content-dark-3">Ngày đối chiếu</span>
        <span className="typo-body-base-medium text-content-dark-2">{vm.effectiveDate}</span>
      </Flex>
      {vm.createdByName && (
        <Flex direction="column" gap="0">
          <span className="typo-body-sm-semibold text-content-dark-1">{vm.createdByName}</span>
          {orgLine && <span className="typo-body-xs-regular text-content-dark-3">{orgLine}</span>}
        </Flex>
      )}
    </Flex>
  )
}

/** "Giá tính phí" cell — hàng chính là giá, hàng phụ là % hoa hồng (hoặc "Cố định {tiền}"). */
function FeePriceCell({ vm }: { vm: ReconRowVM }) {
  let agencyFee: ReactNode
  if (vm.amtAgencyFee != null) agencyFee = `Cố định ${vnd(vm.amtAgencyFee)}`
  else if (vm.pctAgencyFee != null) agencyFee = formatPercent(vm.pctAgencyFee)
  else agencyFee = <MutedDash />

  return (
    <Flex direction="column" gap="1">
      <Flex direction="column" gap="0">
        <span className="typo-body-xs-regular text-content-dark-3">Giá tính phí</span>
        <span className="typo-body-base-medium text-content-dark-2">{vnd(vm.feePrice)}</span>
      </Flex>
      <Flex direction="column" gap="0">
        <span className="typo-body-xs-regular text-content-dark-3">% hoa hồng</span>
        <span className="typo-body-sm-medium text-content-dark-2">{agencyFee}</span>
      </Flex>
    </Flex>
  )
}

/** "Hoa hồng CĐT trả" cell — hàng chính là HH đợt (period_commission), hàng phụ là tiến độ from → to. */
function AgencyFeePaidCell({ vm }: { vm: ReconRowVM }) {
  return (
    <Flex direction="column" gap="1">
      <Flex direction="column" gap="0">
        <span className="typo-body-xs-regular text-content-dark-3">Hoa hồng CĐT trả</span>
        <Flex align="center" gap="2">
          <span className="typo-body-base-medium text-content-dark-2">
            {vm.periodCommission == null ? <MutedDash /> : vnd(vm.periodCommission)}
          </span>
          {vm.periodCommission != null && vm.agencyVat && <VatBadge />}
        </Flex>
      </Flex>
      <Flex direction="column" gap="0">
        <span className="typo-body-xs-regular text-content-dark-3">Tiến độ</span>
        <span className="typo-body-sm-medium text-content-dark-2">
          {vm.progressFrom != null && vm.progressTo != null ? (
            `${formatPercent(vm.progressFrom)} → ${formatPercent(vm.progressTo)}`
          ) : (
            <MutedDash />
          )}
        </span>
      </Flex>
    </Flex>
  )
}

function SimpleAmountCell({
  label,
  value,
  vatOn,
}: {
  label: string
  value: string
  vatOn?: boolean
}) {
  return (
    <Flex direction="column" gap="0">
      <span className="typo-body-xs-regular text-content-dark-3">{label}</span>
      <Flex align="center" gap="2">
        <span className="typo-body-base-medium text-content-dark-2">{value}</span>
        {vatOn && <VatBadge />}
      </Flex>
    </Flex>
  )
}

function TotalAmountCell({ vm }: { vm: ReconRowVM }) {
  const anyVat = vm.agencyVat || vm.extraVat || vm.supplementaryVat || vm.deductionVat
  return (
    <Flex direction="column" gap="0">
      <span className="typo-body-xs-regular text-content-dark-3">Thành tiền</span>
      <Flex align="center" gap="2">
        <span className="typo-body-base-semibold text-action-primary-red-default">
          {vnd(vm.totalWithVat)}
        </span>
        {anyVat && <VatBadge />}
      </Flex>
    </Flex>
  )
}

function HistoryRecordHeader({ vm }: { vm: ReconRowVM }) {
  const ability = useAbility()
  const inRouterContext = useInRouterContext()
  const canOpenDetail = ability.can('retrieve', 'investor_reconciliation_sheet')
  const detailPath =
    vm.sheetId != null && vm.sheetId > 0 && canOpenDetail
      ? generatePath(APP_PATH.INVESTOR_RECONCILIATION_DETAIL, { id: String(vm.sheetId) })
      : null

  return (
    <Flex align="center" gap="2">
      <span className="typo-body-base-semibold text-content-dark-1">{vm.code}</span>
      {vm.status && <InvestorReconciliationStatusBadge status={vm.status} />}
      {detailPath &&
        (inRouterContext ? (
          <Link
            to={detailPath}
            target="_blank"
            rel="noopener noreferrer"
            title={`Xem chi tiết đối chiếu ${vm.code}`}
            className="text-content-dark-3 hover:text-action-primary-red-default"
          >
            <IconEye size={16} />
          </Link>
        ) : (
          // Dialog content renders inside <GlobalDialog>, which sits OUTSIDE <RouterProvider> — <Link>
          // crashes here (no router context), so a plain anchor is used instead.
          <a
            href={detailPath}
            target="_blank"
            rel="noopener noreferrer"
            title={`Xem chi tiết đối chiếu ${vm.code}`}
            className="text-content-dark-3 hover:text-action-primary-red-default"
          >
            <IconEye size={16} />
          </a>
        ))}
    </Flex>
  )
}

function HistoryRecordCard({ vm }: { vm: ReconRowVM }) {
  return (
    <Flex direction="column" gap="3" className="bg-background-2 px-4 py-3">
      <HistoryRecordHeader vm={vm} />
      <div className="grid grid-cols-3 gap-x-6 gap-y-3 md:grid-cols-6">
        <CreatedByCell vm={vm} />
        <FeePriceCell vm={vm} />
        <AgencyFeePaidCell vm={vm} />
        <SimpleAmountCell
          label="Thưởng"
          value={vnd(vm.supplementary)}
          vatOn={vm.supplementaryVat}
        />
        <SimpleAmountCell
          label="Khấu trừ"
          value={vm.feeDeduction > 0 ? `-${vnd(vm.feeDeduction)}` : vnd(0)}
          vatOn={vm.deductionVat}
        />
        <TotalAmountCell vm={vm} />
      </div>
    </Flex>
  )
}

export interface AddInvestorReconciliationUnitHistoryCardsProps {
  /** Deal PK — lịch sử scope THEO DEAL (không theo mã căn), giống {@link ReconHistoryTable}. */
  dealId: number
  /** Phiếu đang xem/sửa — loại khỏi danh sách để không tự hiện lại chính mình (Detail page v2). */
  excludeInvestorSheetId?: number | null
}

/**
 * "Lịch sử đối chiếu" rút gọn cho dialog "Thêm căn" (2.0) — mỗi kỳ 1 card (mã ĐC + trạng thái + link
 * chi tiết, rồi lưới 6 ô: Ngày đối chiếu/người lập, Giá tính phí/% HH, Hoa hồng CĐT trả/tiến độ, Thưởng,
 * Khấu trừ, Thành tiền) thay vì bảng sổ cái đầy đủ của `ReconHistoryTable` (12+ cột, band màu, sticky
 * rail) — quá rậm cho không gian dialog. Tái sử dụng NGUYÊN data layer của bảng gốc (`buildHistoryVM`,
 * `buildReconHistoryQuery`, `filterPriorHistoryRows`) — chỉ viết mới phần trình bày.
 *
 * Tái dùng NGUYÊN component này cho "Lịch sử đối chiếu" trên Detail page v2
 * (`InvestorReconciliationUnitCard.tsx`) — chỉ khác `excludeInvestorSheetId` (phiếu đang xem, dialog
 * "Thêm căn" không cần vì phiếu chưa tồn tại).
 */
function AddInvestorReconciliationUnitHistoryCards({
  dealId,
  excludeInvestorSheetId,
}: AddInvestorReconciliationUnitHistoryCardsProps) {
  const { data, isLoading } = useQuery(buildReconHistoryQuery('investor', dealId))
  const priorRows = filterPriorHistoryRows(data?.results ?? [], excludeInvestorSheetId)
  // API sorts newest → oldest; reverse to render oldest (#1) at top, newest at the bottom.
  const historyRows = [...priorRows].reverse()

  if (isLoading) {
    return <FullScreenLoading className="h-[unset] min-h-[unset] flex-1 py-6" />
  }

  if (historyRows.length === 0) {
    return (
      <p className="typo-body-base text-content-dark-3 py-4 text-center">
        Không có lịch sử đối chiếu.
      </p>
    )
  }

  const rowVMs = historyRows.map((row, idx) =>
    buildHistoryVM(row, idx > 0 ? historyRows[idx - 1] : undefined, idx)
  )

  return (
    <Flex direction="column">
      {rowVMs.map((vm, idx) => (
        <div key={vm.key} className={idx > 0 ? 'border-border-1 border-t' : undefined}>
          <HistoryRecordCard vm={vm} />
        </div>
      ))}
    </Flex>
  )
}

export default AddInvestorReconciliationUnitHistoryCards

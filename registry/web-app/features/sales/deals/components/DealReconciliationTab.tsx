import { Flex } from '@radix-ui/themes'
import { generatePath } from 'react-router-dom'

import F2ReconciliationStatusBadge from '@/features/sales/f2-reconciliations/components/F2ReconciliationStatusBadge'
import CTVReconciliationStatusBadge from '@/features/sales/ctv-reconciliations/components/CTVReconciliationStatusBadge'
import { useInvestorReconciliations } from '@/features/sales/investor-reconciliations/services/investor-reconciliation-service'
import { useF2Reconciliations } from '@/features/sales/f2-reconciliations/services/f2-reconciliation-service'
import { useCTVReconciliations } from '@/features/sales/ctv-reconciliations/services/ctv-reconciliation-service'
import ReconHistoryTable from '@/features/sales/_shared/reconciliation/ReconHistoryTable'
import { type F2Reconciliation } from '@/features/sales/f2-reconciliations/types/f2-reconciliation'
import { type CTVReconciliation } from '@/features/sales/ctv-reconciliations/types/ctv-reconciliation'
import { useAbility } from '@/lib/ability'
import { APP_PATH } from '@/routes/AppRoute.constant'

import DealReconChildTable from './DealReconChildTable'

interface F2ReconciliationExtended extends F2Reconciliation {
  investor_reconciliation_code?: string | null
  period_pct?: string | null
  exchange_name?: string
}

interface CTVReconciliationExtended extends CTVReconciliation {
  investor_reconciliation_code?: string | null
  period_pct?: string | null
  collaborator_name?: string
}

interface DealReconciliationTabProps {
  dealId: number
  dealCode?: string
}

/**
 * Danh sách tra cứu (không phân trang UI) — BE mặc định cắt trang.
 *
 * Link "Sinh từ" KHÔNG còn phụ thuộc danh sách này (đọc thẳng `investor_sheet` trên nested,
 * PR #2833), nhưng cột "% TT" vẫn fallback sang `progress_*` của dòng CĐT cha — mà nested
 * không trả hai field đó — nên deal nhiều kỳ vẫn cần lấy đủ trong một lần gọi.
 */
const LOOKUP_PAGE_SIZE = 100

const parentDetailPath = (investorSheetId: number) =>
  generatePath(APP_PATH.INVESTOR_RECONCILIATION_DETAIL, { id: String(investorSheetId) })

const f2DetailPath = (row: F2ReconciliationExtended) =>
  generatePath(APP_PATH.F2_RECONCILIATION_DETAIL, { id: String(row.f2_sheet ?? row.id) })

const ctvDetailPath = (row: CTVReconciliationExtended) =>
  generatePath(APP_PATH.CTV_RECONCILIATION_DETAIL, { id: String(row.ctv_sheet ?? row.id) })

const f2CounterpartName = (row: F2ReconciliationExtended) => row.exchange_name
const ctvCounterpartName = (row: CTVReconciliationExtended) => row.collaborator_name

const f2FeeAmount = (row: F2ReconciliationExtended) => row.total_amount_with_vat
const ctvFeeAmount = (row: CTVReconciliationExtended) => row.total_amount

const renderF2Status = (row: F2ReconciliationExtended) => (
  <F2ReconciliationStatusBadge status={row.status} />
)
const renderCTVStatus = (row: CTVReconciliationExtended) => (
  <CTVReconciliationStatusBadge status={row.status} />
)

export const DealReconciliationTab = ({ dealId }: DealReconciliationTabProps) => {
  const ability = useAbility()
  const canViewInv = ability.can('list', 'investor_reconciliation_sheet')
  const canViewF2 = ability.can('list', 'f2_reconciliation_sheet')
  const canViewCTV = ability.can('list', 'ctv_reconciliation_sheet')

  const {
    data: invData,
    isLoading: invLoading,
    isError: invError,
  } = useInvestorReconciliations(
    { deal: dealId, page_size: LOOKUP_PAGE_SIZE },
    { enabled: !!dealId && canViewInv }
  )

  const {
    data: f2Data,
    isLoading: f2Loading,
    isError: f2Error,
  } = useF2Reconciliations(
    { deal: dealId, page_size: LOOKUP_PAGE_SIZE },
    { enabled: !!dealId && canViewF2 }
  )

  const {
    data: ctvData,
    isLoading: ctvLoading,
    isError: ctvError,
  } = useCTVReconciliations(
    { deal: dealId, page_size: LOOKUP_PAGE_SIZE },
    { enabled: !!dealId && canViewCTV }
  )

  const f2Reconciliations = (f2Data?.results || []) as unknown as F2ReconciliationExtended[]
  const ctvReconciliations = (ctvData?.results || []) as unknown as CTVReconciliationExtended[]
  const invReconciliations = invData?.results || []

  if (invLoading || f2Loading || ctvLoading) {
    return (
      <Flex align="center" justify="center" className="h-40">
        <span className="text-content-dark-3 text-sm">Đang tải dữ liệu...</span>
      </Flex>
    )
  }

  if (invError || f2Error || ctvError) {
    return (
      <Flex align="center" justify="center" className="h-40">
        <span className="text-data-red-default text-sm">
          Có lỗi xảy ra khi tải dữ liệu đối chiếu.
        </span>
      </Flex>
    )
  }

  return (
    <div className="py-4">
      {canViewInv && (
        <section className="m4-art" style={{ marginBottom: 16 }}>
          <div className="m4-card-head">
            <span className="num-tag">A</span>
            <div>
              <h4>Đối chiếu CĐT (HD04)</h4>
              <div className="sub">Lịch sử đối chiếu CĐT cho căn này</div>
            </div>
          </div>
          {dealId > 0 ? (
            <ReconHistoryTable dealId={dealId} currentRow={null} />
          ) : (
            <div className="text-content-dark-3 py-8 text-center text-sm">
              Không có dữ liệu đối chiếu
            </div>
          )}
        </section>
      )}

      {canViewF2 && (
        <DealReconChildTable
          sectionTag="B"
          title="Đối chiếu Sàn F2 (HD05)"
          subtitle="Tự sinh khi PDCDT tạo · LAD F2 tách biệt với LAD CĐT"
          counterpartLabel="Sàn F2"
          rows={f2Reconciliations}
          parentReconciliations={invReconciliations}
          canLinkParent={canViewInv}
          parentDetailPath={parentDetailPath}
          getCounterpartName={f2CounterpartName}
          getFeeAmount={f2FeeAmount}
          getDetailPath={f2DetailPath}
          detailLabel="Mở →"
          renderStatus={renderF2Status}
        />
      )}

      {canViewCTV && (
        <DealReconChildTable
          sectionTag="C"
          title="Đối chiếu Cộng tác viên"
          subtitle="Chi tiết đối chiếu CTV cho deal này"
          counterpartLabel="Cộng tác viên"
          rows={ctvReconciliations}
          parentReconciliations={invReconciliations}
          canLinkParent={canViewInv}
          parentDetailPath={parentDetailPath}
          getCounterpartName={ctvCounterpartName}
          getFeeAmount={ctvFeeAmount}
          getDetailPath={ctvDetailPath}
          detailLabel="Chi tiết →"
          renderStatus={renderCTVStatus}
        />
      )}
    </div>
  )
}

export default DealReconciliationTab

import { type ComponentProps, useMemo } from 'react'
import { useFieldArray, useFormContext } from 'react-hook-form'

import {
  type CommissionSplitDetail,
  useManagementKpi,
  type WorksheetKpiCommissionRow,
} from '../services/commission-splits-service'

import type { FormValues } from './commission-split-form.types'
import {
  type KpiManagerGroup,
  ManagementCommissionBlock,
  type MgmtManagerGroup,
} from './ManagementCommissionBlock'

type MgmtCategory = ComponentProps<typeof ManagementCommissionBlock>['categories'][number]

interface ManagementCommissionSectionProps {
  detail: CommissionSplitDetail
  worksheetId: number
  /** Tiền của form sau khi rescale theo dial — cha tính một lần, section chỉ đọc. */
  effectivePositions: FormValues['positions']
  /**
   * `% TT phí` đang áp (dial đã debounce) — CHÍNH tỷ lệ đã sinh ra tiền trong
   * `effectivePositions`, nên chú thích `cấu hình × %` dưới mỗi ô luôn khớp con số bên trên,
   * kể cả khi kế toán đang kéo dial. Đọc `detail.fee_progress_pct` thay vào đây là sai:
   * đó là số ĐÃ LƯU, còn lệch cho tới lúc bấm lưu.
   */
  appliedFeePct: number
  isKT: boolean
  isAdminView: boolean
  isTkdaView: boolean
  categories: MgmtCategory[]
  /**
   * Ba thứ dưới đây phải truyền vào chứ không tự suy: chúng dựng từ app constant lúc chạy
   * (MANAGEMENT_SECTION_PCT_TYPES, MGMT_ROLE_LABELS), không phải hằng số biên dịch.
   */
  isMgmt: (type: string) => boolean
  mgmtRoleCode: (pctType: string) => string
  mgmtRoleLabels: Record<string, string>
}

/**
 * Mục ⑤ Thưởng HH quản lý + Mục ⑥ HH theo KPI — **chỉ đọc, không có thao tác nào.**
 *
 * Tiền thưởng quản lý là số DẪN XUẤT — `CommissionShare.calculated_amount` (cấu hình cả căn)
 * × dial `% TT phí` của kỳ, do BE tính ở `set-period-progress`. Bảng ⑤ chưa từng có một ô
 * nhập nào, nên không có gì để lưu.
 *
 * Hai đường ghi đã từng có ở đây, gỡ theo đúng thứ tự này — ClickUp 86eyqgbct:
 *
 * 1. Nút **"Lưu thưởng quản lý"** (gỡ 25/08) gọi `PATCH …/split-by-recipient/` với các
 *    position `isMgmt`. Lời gọi đó **chưa bao giờ chạy được**: endpoint chỉ nhận
 *    `pct_type ∈ SALES_PCT_TYPES` (srs `deal-period-allocation/fsd.md:1281`; BE
 *    `_SPLITTABLE_PCT_TYPES`), nên mọi lần bấm đều ăn 400 `"mgmt_ceo_agency_fee" không phải
 *    là một lựa chọn hợp lệ`. Kể cả nếu BE nhận thì payload cũng chỉ là bản sao của chính
 *    những con số đang hiển thị.
 * 2. Nút **tạm giữ / bỏ giữ** ở cột "Thao tác" (gỡ 25/08, vòng 2). Bản vá (1) để nó đứng
 *    thẳng bằng quyền thay vì nấp sau cờ "đang sửa"; QA test thì lộ ra nó ghi xong (200)
 *    nhưng bảng không tự cập nhật, và BA chốt **bỏ hẳn action này** thay vì đi sửa.
 *
 * API `hold-share` / `release-share-hold` vẫn còn và vẫn là đặc tả hợp lệ ở cấp worksheet —
 * chỉ mục ⑤ không còn nút gọi. Cột "Giữ lại HH" giữ lại vì tiền vẫn có thể bị giữ từ bảng kê
 * tháng (20.14), và nó là phần chênh giữa tổng thưởng với "Thực nhận".
 */
export function ManagementCommissionSection({
  detail,
  worksheetId,
  effectivePositions,
  appliedFeePct,
  isKT,
  isAdminView,
  isTkdaView,
  categories,
  isMgmt,
  mgmtRoleCode,
  mgmtRoleLabels,
}: ManagementCommissionSectionProps) {
  const form = useFormContext<FormValues>()
  const { fields: positionFields } = useFieldArray({
    control: form.control,
    name: 'positions',
  })
  const watchedPositions = form.watch('positions')

  const { data: mgmtKpiData } = useManagementKpi(worksheetId)

  const kpiPositions = useMemo(() => {
    if (!mgmtKpiData) return []
    const list = Array.isArray(mgmtKpiData)
      ? mgmtKpiData
      : (mgmtKpiData as { results?: unknown[] }).results || []
    return list as WorksheetKpiCommissionRow[]
  }, [mgmtKpiData])

  // Compact KPI view mirroring "Thưởng HH quản lý": one row per payee (manager),
  // folding a payee's multiple KPI payables into a single row (amounts summed).
  // A payee's pct_type is their role, so it is kept as the row's designation.
  const kpiGroupedByManager = useMemo(() => {
    const map = new Map<string, KpiManagerGroup>()
    kpiPositions.forEach((kpi) => {
      const code = kpi.payee_employee?.code || `payable-${kpi.payable_id}`
      const existing = map.get(code)
      if (existing) {
        existing.rows.push(kpi)
      } else {
        map.set(code, {
          code,
          name: kpi.payee_employee?.fullname || '—',
          role: kpi.payee_employee?.position?.name || kpi.pct_type_display || kpi.pct_type || '',
          employeeId: kpi.payee_employee?.id ?? undefined,
          deptName: kpi.payee_employee?.department?.name || '',
          rows: [kpi],
        })
      }
    })
    return Array.from(map.values())
  }, [kpiPositions])

  const mgmtGroupedByManager = useMemo(() => {
    const map = new Map<string, MgmtManagerGroup>()

    positionFields.forEach((_, pIdx) => {
      const posData = effectivePositions[pIdx] || watchedPositions[pIdx]
      if (!posData || !isMgmt(posData.pct_type || '')) return

      const code = posData.owner_code || ''
      const name = posData.owner_name || ''
      const recipient_id = posData.recipient_id || 0

      const existing = map.get(code)
      if (existing) {
        existing.positions.push({ posIdx: pIdx, posData })
      } else {
        const firstType = posData.pct_type || ''
        const designation = mgmtRoleLabels[mgmtRoleCode(firstType)] || firstType

        map.set(code, {
          code,
          name,
          role: designation,
          recipient_id,
          positions: [{ posIdx: pIdx, posData }],
        })
      }
    })

    return Array.from(map.values())
    // `isMgmt`/`mgmtRoleCode` phải có mặt: chúng dựng từ app constant nạp bất đồng bộ, nên
    // lần đầu chúng trả kết quả khác lần sau. Bỏ ra khỏi deps thì bảng giữ nguyên kết quả
    // tính bằng bộ constant CŨ. Trang cha giữ chúng ổn định bằng useCallback nên thêm vào
    // đây không làm memo chạy lại mỗi lượt render.
  }, [positionFields, effectivePositions, watchedPositions, mgmtRoleLabels, isMgmt, mgmtRoleCode])

  const showMgmtBlock = isKT || isAdminView || (mgmtGroupedByManager.length > 0 && !isTkdaView)
  // Mirror showMgmtBlock: KPI block appears on both the split-sheet (ketoan) and the
  // deal-period-allocation (admin) screens, and for non-admin viewers only when populated.
  const showKpiBlock = isKT || isAdminView || (kpiGroupedByManager.length > 0 && !isTkdaView)

  const activeLabel =
    detail.period_month && detail.period_year
      ? `Kỳ ${String(detail.period_month).padStart(2, '0')}/${detail.period_year}`
      : 'kỳ này'

  return (
    <ManagementCommissionBlock
      showMgmtBlock={showMgmtBlock}
      activeLabel={activeLabel}
      mgmtGroupedByManager={mgmtGroupedByManager}
      appliedFeePct={appliedFeePct}
      categories={categories}
      isKT={isKT}
      kpiPositions={kpiPositions}
      kpiGroupedByManager={kpiGroupedByManager}
      showKpiBlock={showKpiBlock}
    />
  )
}

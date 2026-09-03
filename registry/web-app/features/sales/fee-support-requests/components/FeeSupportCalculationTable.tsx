import { ColoredValueVariant } from '@/api/schema'
import { Chip } from '@/components/ui'

import {
  FEE_SUPPORT_CALC_SOURCE,
  FEE_SUPPORT_CALC_WARNING_CODE,
  FEE_SUPPORT_CALC_WARNING_MESSAGE,
} from '../constants/fee-support-request-constants'
import type { FeeSupportCalculation } from '../services/fee-support-request-service'
import {
  formatCalcMoney as money,
  isNonZeroDecimal as isNonZero,
} from '../utils/fee-support-calc-format'
import FeeSupportCalculationSummary, {
  type FeeSupportSummaryOptions,
} from './FeeSupportCalculationSummary'

/**
 * `FeeSupportSummaryOptions` được GIAO vào chứ không khai lại: bảng này chỉ chuyền
 * tiếp option xuống `FeeSupportCalculationSummary`, khai lại là hai bên trôi khỏi
 * nhau lúc thêm option thứ hai mà `tsc` không kêu.
 */
type Props = FeeSupportSummaryOptions & {
  calculation: FeeSupportCalculation | null | undefined
  /** Dòng caption của bảng phẳng — bám 2 dòng đầu của file Excel tham chiếu. */
  projectName?: string | null
  unitNumber?: string | null
}

/**
 * Sao kê hỗ trợ phí (BE `calculation`, chỉ có ở màn chi tiết).
 *
 * Chỉ còn BẢNG PHẲNG. Khối "bóc tách hai chiều" (MV nhận từ CĐT / MV đã chi /
 * phiếu đang xem / còn lại) đã bỏ khỏi giao diện theo CR `86eyhjjug` — payload
 * BE vẫn trả đủ 4 nhánh, FE chỉ thôi render 3 nhánh kia.
 *
 * Mọi con số do BE tính — FE KHÔNG tính lại tiền. Ngoại lệ DUY NHẤT BA đã chốt
 * là dòng "Thưởng MV nhận" gộp 2 kênh, xem `FeeSupportCalculationSummary`.
 */
export function FeeSupportCalculationTable({
  calculation,
  projectName,
  unitNumber,
  bonusSupportIsAmountMode,
}: Props) {
  if (!calculation) return null

  const { request, source } = calculation
  // Giữ `?? []` kể cả khi schema đã regen (2026-07-27): BE cũ chưa deploy vẫn trả
  // thiếu field, mà `.map` trên undefined sẽ hỏng CẢ màn chi tiết chứ không riêng sao kê.
  const warnings = calculation.warnings ?? []
  const isProvisional = source === FEE_SUPPORT_CALC_SOURCE.TBC_PROVISIONAL
  const blocked = warnings.some((w) => w.code === FEE_SUPPORT_CALC_WARNING_CODE.NO_FEE_PRICE)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="typo-body-xl-semibold text-content-dark-1">Sao kê hỗ trợ phí</span>
        {isProvisional ? (
          <Chip
            label="Số tạm tính (chưa có giao dịch)"
            variant={ColoredValueVariant.ORANGE}
            size="small"
          />
        ) : null}
        {request.is_applied ? (
          <Chip label="Phiếu đã áp" variant={ColoredValueVariant.GREEN} size="small" />
        ) : null}
      </div>

      {/* BE có thể phát trùng `code` (vd `negative_remainder` cho nhiều pool) nên key kèm index. */}
      {warnings.map((warning, index) => (
        <div
          key={`${warning.code}-${index}`}
          className="border-data-orange-default bg-data-orange-disabled text-content-dark-2 typo-body-sm rounded-lg border px-4 py-3"
        >
          {FEE_SUPPORT_CALC_WARNING_MESSAGE[warning.code] ?? `Cảnh báo: ${warning.code}`}
          {isNonZero(warning.amount) ? ` (${money(warning.amount)})` : ''}
        </div>
      ))}

      {blocked ? null : (
        <>
          {/* Bảng chính — bám bố cục Excel tham chiếu của CR STT16. */}
          <FeeSupportCalculationSummary
            calculation={calculation}
            projectName={projectName}
            unitNumber={unitNumber}
            bonusSupportIsAmountMode={bonusSupportIsAmountMode}
          />

          {/* #2831: `bonus_support` NẰM TRONG `support_total`, chỉ là nó rút từ
              pool thưởng CĐT nên không bị trừ ở dòng "Phí đại lý còn lại". */}
          {isNonZero(request.bonus_support?.amount) ? (
            <span className="typo-body-sm text-content-dark-3">
              Xin hỗ trợ thưởng có nằm trong “Phí xin hỗ trợ”, nhưng rút từ pool thưởng CĐT nên
              không bị trừ ở dòng “Phí đại lý còn lại (MV)”.
            </span>
          ) : null}

          <span className="typo-body-sm text-content-dark-3">
            Số liệu theo cấu hình hoa hồng hiện tại của giao dịch — khối “Mức phí hiện tại” phía
            trên là ảnh chụp lúc tạo phiếu, lệch nhau sau khi đổi cấu hình là bình thường.
          </span>
        </>
      )}
    </div>
  )
}

export default FeeSupportCalculationTable

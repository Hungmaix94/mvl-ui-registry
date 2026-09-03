import { Chip } from '@/components/ui'
import { ColoredValueVariant } from '@/api/schema'
import { formatCurrencyVND, formatSignedCurrencyVND } from '@/utils/common'

import { DOC_TOTAL_BASIS_LABEL, type ReconDocumentTotalCheck } from './recon-document-total-check'

export type ReconDocumentTotalCheckViewProps = {
  /** Kết quả BE trả (`document_total_check`); `null` = kế toán chưa khai tổng nào. */
  check: ReconDocumentTotalCheck | null
  className?: string
}

/**
 * Kết quả tự kiểm tra "Tổng theo chứng từ CĐT" vs tổng phiếu — con số do BE tính, FE chỉ hiển thị.
 *
 * Có ô nhập mà không có kết quả thì kế toán vẫn phải tự trừ tay, nên hai thứ luôn đi cùng nhau. Khi
 * chênh lệch vượt ngưỡng, BE CHẶN xác nhận phiếu — nói thẳng ra ở đây để người dùng không phải đoán
 * lý do phiếu không duyệt được.
 *
 * Ngưỡng là "khe hở lớn nhất mà riêng việc làm tròn từng căn giải thích được" — KHÔNG hardcode "1 đ":
 * mỗi căn rơi đúng mốc `,5` góp nửa đồng nên trần là ±N/2 và phiếu nhiều căn đo được tới vài đồng
 * (xem mục "Khe hở làm tròn cấp PHIẾU" trong docs/ai/domain/accounting-reconciliation.md).
 */
function ReconDocumentTotalCheckView({ check, className }: ReconDocumentTotalCheckViewProps) {
  if (!check) {
    return (
      <span className="typo-body-base-regular text-content-dark-3">
        Chưa khai tổng theo chứng từ CĐT — không chạy đối chiếu tổng.
      </span>
    )
  }

  const basisLabel = check.basis ? DOC_TOTAL_BASIS_LABEL[check.basis] : null

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="typo-body-base-semibold text-content-dark-1 tabular-nums">
          {formatCurrencyVND(check.documentTotal)} đ
        </span>
        {basisLabel && (
          <span className="typo-body-sm-regular text-content-dark-3">({basisLabel})</span>
        )}
        <Chip
          size="small"
          type="contained"
          variant={check.withinTolerance ? ColoredValueVariant.GREEN : ColoredValueVariant.RED}
          label={check.withinTolerance ? 'Khớp' : 'Lệch quá ngưỡng'}
        />
      </div>

      <dl className="typo-body-sm-regular text-content-dark-3 mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
        <div className="flex gap-1">
          <dt>Tổng phiếu:</dt>
          <dd className="text-content-dark-2 tabular-nums">
            {formatCurrencyVND(check.sheetTotal)} đ
          </dd>
        </div>
        <div className="flex gap-1">
          <dt>Chênh lệch:</dt>
          <dd
            className={`whitespace-nowrap tabular-nums ${
              check.withinTolerance ? 'text-content-dark-2' : 'text-data-red-default font-semibold'
            }`}
            title="Chứng từ − phiếu. Số dương nghĩa là chứng từ khai nhiều hơn phiếu."
          >
            {formatSignedCurrencyVND(check.difference)} đ
          </dd>
        </div>
        <div className="flex gap-1">
          <dt>Ngưỡng làm tròn:</dt>
          <dd className="text-content-dark-2 tabular-nums">
            ±{formatCurrencyVND(Math.abs(check.tolerance))} đ
          </dd>
        </div>
      </dl>

      {!check.withinTolerance && (
        <p className="typo-body-sm-regular text-data-red-default mt-1">
          Chênh lệch vượt ngưỡng làm tròn — phiếu sẽ không xác nhận được cho tới khi số liệu khớp
          lại.
        </p>
      )}
    </div>
  )
}

export default ReconDocumentTotalCheckView

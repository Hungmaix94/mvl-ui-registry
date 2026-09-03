import { useMemo } from 'react'
import { Flex } from '@radix-ui/themes'

import { Button } from '@/components/ui'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { formatCurrencyVND } from '@/utils/common'
import type {
  BulkDraftCreated,
  BulkDraftResult,
  BulkDraftSkipped,
} from '@/features/accounting/promotion-distributions/services/promotion-distribution-service'
import {
  PROMOTION_BULK_SKIP_REASON,
  PROMOTION_BULK_SKIP_REASON_ORDER,
} from '@/features/accounting/promotion-distributions/constants/promotion-distribution-constants'

export type PromotionDistributionBulkDraftResultDialogProps = {
  result: BulkDraftResult
  periodLabel: string
  onClose: () => void
}

const HEADER_CELL =
  'text-content-dark-2 typo-body-sm-semibold px-3 py-2 text-left whitespace-nowrap'
const BODY_CELL = 'text-content-dark-1 typo-body-sm-regular px-3 py-2 align-top'

const projectLabel = (row: { project_code: string; project_name: string }) =>
  [row.project_code, row.project_name].filter(Boolean).join(' - ')

const CreatedTable = ({ rows }: { rows: BulkDraftCreated[] }) => (
  <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
    <table className="w-full min-w-[560px] border-collapse">
      <thead className="bg-[#F9FAFB]">
        <tr>
          <th className={HEADER_CELL}>Dự án</th>
          <th className={`${HEADER_CELL} text-right`}>Số căn</th>
          <th className={`${HEADER_CELL} text-right`}>Tiền về kỳ này</th>
          <th className={HEADER_CELL}>Mã phiếu</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.project_id} className="border-t border-[#E5E7EB]">
            <td className={BODY_CELL}>{projectLabel(row)}</td>
            <td className={`${BODY_CELL} text-right`}>{row.total_deals}</td>
            <td className={`${BODY_CELL} text-right`}>
              {formatCurrencyVND(row.total_receipt_in_period)}
            </td>
            <td className={BODY_CELL}>{row.distribution_code}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

const SkippedTable = ({
  rows,
  reasonLabels,
}: {
  rows: BulkDraftSkipped[]
  reasonLabels: Record<string, string> | undefined
}) => (
  <div className="overflow-x-auto rounded-lg border border-[#E5E7EB]">
    <table className="w-full min-w-[560px] border-collapse">
      <thead className="bg-[#F9FAFB]">
        <tr>
          <th className={HEADER_CELL}>Dự án</th>
          <th className={`${HEADER_CELL} text-right`}>Số căn</th>
          <th className={`${HEADER_CELL} text-right`}>Tiền về kỳ này</th>
          <th className={HEADER_CELL}>Lý do</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.project_id} className="border-t border-[#E5E7EB]">
            <td className={BODY_CELL}>{projectLabel(row)}</td>
            <td className={`${BODY_CELL} text-right`}>{row.total_deals}</td>
            <td className={`${BODY_CELL} text-right`}>
              {formatCurrencyVND(row.total_receipt_in_period)}
            </td>
            <td className={BODY_CELL}>{reasonLabels?.[row.reason] ?? row.reason}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

/**
 * Result of one press of "Thêm dự án có doanh thu".
 *
 * Shows BOTH tables — a project that collected money but got no draft (`no_config`) is the
 * case the accountant must act on, so it is never swallowed into a toast. Skipped rows are
 * ordered by PROMOTION_BULK_SKIP_REASON_ORDER: actionable groups first, "đã có phiếu" last.
 */
export const PromotionDistributionBulkDraftResultDialog = ({
  result,
  periodLabel,
  onClose,
}: PromotionDistributionBulkDraftResultDialogProps) => {
  const { keysMap } = useAppConstant({
    module: 'accounting',
    keys: [APP_CONSTANT_KEY.ACCOUNTING.PROMOTION_BULK_SKIP_REASON],
  })
  const reasonLabels = keysMap.get(APP_CONSTANT_KEY.ACCOUNTING.PROMOTION_BULK_SKIP_REASON) as
    | Record<string, string>
    | undefined

  const created = result.created ?? []
  const skipped = useMemo(() => {
    const order = PROMOTION_BULK_SKIP_REASON_ORDER as readonly string[]
    return [...(result.skipped ?? [])].sort((a, b) => {
      const rank = (reason: string) => {
        const index = order.indexOf(reason)
        return index === -1 ? order.length : index
      }
      return rank(a.reason) - rank(b.reason) || a.project_code.localeCompare(b.project_code)
    })
  }, [result.skipped])

  const needsAttention = skipped.filter(
    (row) =>
      row.reason === PROMOTION_BULK_SKIP_REASON.NO_CONFIG ||
      row.reason === PROMOTION_BULK_SKIP_REASON.ERROR
  ).length

  return (
    <div className="flex flex-col gap-5">
      <p className="typo-body-base-regular text-content-dark-2">
        Kỳ <b className="text-content-dark-1">{periodLabel}</b>: đã thêm{' '}
        <b className="text-content-dark-1">{result.created_count}</b> dự án
        {result.skipped_count > 0 ? (
          <>
            {' · bỏ qua '}
            <b className="text-content-dark-1">{result.skipped_count}</b> dự án
          </>
        ) : null}
        .
      </p>

      {needsAttention > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-[#FED7AA] bg-[#FFF7ED] px-4 py-3 text-sm">
          <span className="mt-0.5 flex h-4 w-4 flex-none items-center justify-center rounded-full bg-[#EA580C] text-[10px] font-bold text-white">
            !
          </span>
          <p className="text-content-dark-2 leading-relaxed">
            <b className="text-content-dark-1">{needsAttention} dự án có doanh thu</b> nhưng chưa
            vào được kỳ. Xử lý xong (cấu hình hoa hồng cho dự án) rồi bấm lại nút để thêm.
          </p>
        </div>
      )}

      {created.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="typo-body-base-semibold text-content-dark-1">
            Đã thêm ({created.length})
          </h4>
          <CreatedTable rows={created} />
        </div>
      )}

      {skipped.length > 0 && (
        <div className="flex flex-col gap-2">
          <h4 className="typo-body-base-semibold text-content-dark-1">Bỏ qua ({skipped.length})</h4>
          <SkippedTable rows={skipped} reasonLabels={reasonLabels} />
        </div>
      )}

      {created.length === 0 && skipped.length === 0 && (
        <p className="typo-body-base-regular text-content-dark-2">
          Kỳ này chưa có dự án nào phát sinh tiền về, nên không có gì để thêm.
        </p>
      )}

      <Flex justify="end" gap="3">
        <Button type="button" onClick={onClose}>
          Đóng
        </Button>
      </Flex>
    </div>
  )
}

export default PromotionDistributionBulkDraftResultDialog

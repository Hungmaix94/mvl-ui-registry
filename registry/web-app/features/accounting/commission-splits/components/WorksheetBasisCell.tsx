import type { components } from '@/api/schema'
import { IconCaretdown, IconCaretup } from '@/assets/icons'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { formatCurrencyVND } from '@/utils/common'

import { resolveBasisChange } from '../utils/basis-change'

/**
 * Ô "Giá tính phí" của hai màn danh sách worksheet — CR STT34 (`86eyf8grj`).
 *
 * Dùng chung cho "Chia HH theo tháng" (`CommissionSplitTable`) và "Giao dịch tiền về đợt này"
 * (`DealPeriodAllocationWorksheetTable`) — hai màn đọc CÙNG một endpoint và cùng field `basis`,
 * nên cảnh báo phải là một component duy nhất; tách đôi thì sửa một bên là bên kia lệch.
 *
 * Nhãn cột: **"Giá tính phí" ở CẢ HAI màn** kể từ 21/08/2026 (CR STT51 `86eymm0hq`) — BA chốt
 * *"Chỉ cần đổi lại tên, Thành tiền DT là số tiền khác"*.
 *
 * Lịch sử nhãn này rối, ghi lại đủ để không ai revert nhầm lần nữa:
 * tháng 6 là "Giá tính phí (VNĐ)" ở màn "Giao dịch tiền về đợt này" → `0e4bcc5bb` đổi → `492e71fa7`
 * revert IM LẶNG về nhãn gốc → CR STT17 (`86eydbph4`, 18/08) thống nhất **"Thành tiền DT" ở cả hai
 * màn** → CR STT51 (21/08) đảo lại thành **"Giá tính phí"**, lần này KHÔNG hậu tố "(VNĐ)".
 *
 * ⚠️ STT51 đảo chiều STT17 chỉ 3 ngày sau. BA được cho xem đúng lịch sử trên rồi mới chốt, nên đây
 * là quyết định có chủ đích chứ không phải revert sót — `docs/tech_debts/
 * debt_worksheet_export_column_label_divergence.md` bên backend còn liệt kê "Giá tính phí" ở cột
 * "vế sai đã bị loại bỏ", đừng đọc mỗi bảng đó rồi sửa ngược.
 */
type WorksheetBasisCellProps = {
  row: Pick<
    components['schemas']['DealPeriodWorksheetListRow'],
    'basis' | 'previous_basis' | 'basis_delta'
  >
}

export function WorksheetBasisCell({ row }: WorksheetBasisCellProps) {
  const change = resolveBasisChange(row)
  const isIncrease = change?.direction === 'increase'
  const changeLabel = isIncrease ? 'tăng' : 'giảm'

  // Xếp DỌC, số tiền trước rồi mới tới huy hiệu: cột chỉ rộng 160px, đủ cho "10.000.000.000"
  // chứ không đủ cho cả huy hiệu nằm cùng dòng — để cùng dòng thì ô tràn ra ngoài và đè lên
  // cột "Giá niêm yết" liền kề (đã thấy trên trình duyệt). Xếp dọc cũng giữ được hàng số của
  // cột thẳng baseline với các cột tiền khác.
  return (
    <div className="flex flex-col items-end gap-0.5">
      <span>{formatCurrencyVND(Number(row.basis || 0))}</span>
      {change && (
        <Tooltip>
          <TooltipTrigger
            type="button"
            // Hàng của cả hai bảng đều có `onRowClick` điều hướng sang màn chi tiết — không
            // chặn nổi bọt thì bấm vào cảnh báo để đọc lại bị quăng sang trang khác.
            onClick={(e) => e.stopPropagation()}
            aria-label={`Giá tính phí ${changeLabel} ${formatCurrencyVND(change.amount)} đồng so với kỳ đối chiếu liền kề trước đó`}
            className="bg-orange-10 text-orange-70 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap"
          >
            {isIncrease ? (
              <IconCaretup className="h-2.5 w-2.5" />
            ) : (
              <IconCaretdown className="h-2.5 w-2.5" />
            )}
            {isIncrease ? '+' : '-'}
            {formatCurrencyVND(change.amount)}
          </TooltipTrigger>
          <TooltipContent className="max-w-[320px]">
            Giá tính phí kỳ này {changeLabel}{' '}
            <span className="font-semibold">{formatCurrencyVND(change.amount)} đ</span> so với kỳ
            đối chiếu liền kề trước đó (kỳ trước:{' '}
            <span className="font-semibold">{formatCurrencyVND(change.previous)} đ</span> · kỳ này:{' '}
            <span className="font-semibold">{formatCurrencyVND(change.current)} đ</span>)
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

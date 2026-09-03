import type { DepositContract } from '@/features/sales/deposit-contracts/services/deposit-contract-service'

/**
 * Tổng tiền cọc của một hợp đồng — **đọc thẳng từ BE, không cộng lại ở đây**.
 *
 * BE trả `total_deposit_amount` read-only trên `BaseDepositContractSerializer` (backend PR
 * #3370, deploy 25/08/2026), nên cả màn danh sách lẫn màn chi tiết đều có sẵn con số này.
 * Trước đó FE phải tự cộng `registration_amount + supplementary_amount`, và đó là **bản sao
 * thứ chín** của một công thức vốn đã nằm rải rác 8 chỗ trong backend — chính sự rải rác ấy
 * sinh ra bug của ClickUp 86eyqjbtb.
 *
 * ⚠️ **Đừng "phòng xa" bằng cách cộng tay khi thiếu field.** Một nhánh dự phòng như vậy đưa
 * công thức quay lại FE — đúng thứ vừa bị bỏ đi — và tệ hơn: nếu BE với FE có ngày tính lệch
 * nhau thì nhánh dự phòng che mất chỗ lệch thay vì để nó lộ ra. Thiếu field thì trả `undefined`.
 *
 * Trả `undefined` nghĩa là **chưa biết**, không phải bằng 0. Caller dùng
 * `maxRefundAmount || Infinity`, nên trả 0 sẽ bị hiểu nhầm thành "không có trần"; còn hợp đồng
 * chưa tải xong thì đúng là chưa có trần để áp. Ca này vẫn còn thật, vì `useDepositContract`
 * trả `undefined` trong lúc query đang chạy.
 *
 * ⚠️ **Serializer lồng KHÔNG có field này** — `DepositContractNested`,
 * `DepositContractDropdown` và `DealWorkspaceOverviewDepositContract` đều không khai nó (kiểm
 * trên schema deploy 25/08). Truyền một trong số đó vào đây sẽ ra `undefined` chứ không phải
 * con số sai; cần tổng cọc ở những màn đó thì xin BE thêm field, đừng cộng tay.
 */
export function getTotalDepositAmount(
  contract: Pick<DepositContract, 'total_deposit_amount'> | null | undefined
): number | undefined {
  if (!contract?.total_deposit_amount) return undefined

  const total = Number(contract.total_deposit_amount)

  // Dữ liệu lạ (chuỗi không phải số) cho ra NaN; `NaN` lọt xuống zod sẽ làm mọi phép so sánh
  // thành false và người dùng bị chặn mà không có thông báo nào giải thích.
  return Number.isFinite(total) ? total : undefined
}

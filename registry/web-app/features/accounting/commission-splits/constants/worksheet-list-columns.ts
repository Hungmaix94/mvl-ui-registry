import type { ColumnConfig } from '@/types/table'

/**
 * Bộ cột LÕI của bảng worksheet kỳ — phần mà CẢ HAI màn đều phải có:
 *
 * - "Chia HH theo tháng" (`CommissionSplitTable`)
 * - "Giao dịch tiền về đợt này" (`DealPeriodAllocationWorksheetTable`)
 *
 * Hai màn đọc cùng một endpoint (`accounting_deal_period_worksheets_list`) và cùng row type
 * `DealPeriodWorksheetListRow`. CR STT17 (86eydbph4) bắt hai màn hiện ĐÚNG cùng một bộ cột.
 *
 * ⚠️ **File này KHÔNG còn là nguồn chạy thật.** `492e71fa7` (05/08/2026) dựng lại cả hai bảng
 * theo cấu trúc header 3 tầng (hàng chữ cái Excel + nhóm `l_group` gộp Sale/Sàn F2/CTV) và
 * **cắt luôn hai import** của file này — mỗi component từ đó tự khai `defaultColumnConfig`
 * riêng. Sửa danh sách ở đây **KHÔNG đổi giao diện**, phải sửa trong chính component.
 *
 * Lịch sử cụm "trả sale" — đọc trước khi định "dọn" bộ cột này:
 *
 * - 04/08: CR STT17 thêm 7 cột cụm trả sale vào màn "Giao dịch tiền về đợt này".
 * - 05/08: `492e71fa7` gỡ chúng ra, message commit không hề nhắc tới việc bỏ cột.
 * - 06/08: chốt "giữ nguyên hiện trạng", hạ yêu cầu test, tách 7 cột thành cụm riêng của màn
 *   "Chia HH theo tháng".
 * - 13/08: **BA bác quyết định đó** (comment trên ClickUp: *"Bên màn GDTV đợt này c thấy k có
 *   mấy cột này"*) ⇒ 7 cột quay lại bộ lõi, hai màn trùng khít trở lại.
 *
 * Vai trò còn lại: khoá bộ cột để một màn thêm/bớt/đổi tên mà quên màn kia thì
 * `worksheet-list-columns.test.ts` đỏ ngay, không đợi tới lượt QA.
 *
 * `order` đánh liên tiếp và chỉ mang tính tài liệu — không còn cấu hình localStorage nào đọc
 * file này nữa (trước đây phải giữ khoảng trống để không xáo trộn cấu hình người dùng).
 */
export const WORKSHEET_LIST_COLUMNS: readonly ColumnConfig[] = [
  { id: 'worksheet_code', label: 'Mã phân bổ', visible: false, order: 0 },
  // CR 86eym80zg (đợt 2, 13/08/2026): "Dự án" và "Mã BĐS" lên trước "Chủ đầu tư", và là hai
  // cột ĐÔNG CỨNG của bảng — xem `WORKSHEET_FROZEN_COLUMN_IDS` bên dưới.
  { id: 'project_name', label: 'Dự án', visible: true, order: 1 },
  { id: 'unit_number', label: 'Mã BĐS', visible: true, order: 2 },
  { id: 'investor_name', label: 'Chủ đầu tư / Nguồn hàng', visible: true, order: 3 },
  // CR 86eyj75hg (19/08/2026): ba cột đồng bán (`sales` · `f2_exchanges` · `ctvs`) gộp thành MỘT
  // cột `sellers`. Bản đầu còn tách thêm hai cột `seller_block` / `seller_department`; user bác
  // (20/08) nên khối/phòng ban về nằm INLINE trong ô người bán, không còn id cột nào.
  { id: 'l_group', label: 'Danh sách sale', visible: true, order: 4 },
  { id: 'sellers', label: 'Danh sách sale', visible: true, order: 5 },
  { id: 'deposit_date', label: 'Ngày cọc', visible: true, order: 6 },
  { id: 'list_price', label: 'Giá niêm yết', visible: true, order: 7 },
  // CR STT51 (86eymm0hq, 21/08/2026): BA ĐẢO CHIỀU 2 nhãn mà CR STT17 chốt ngày 18/08 —
  // "Thành tiền DT" -> "Giá tính phí", "Phí DT (%)" -> "Phí đại lý". Bỏ hậu tố "(%)" là CỐ Ý:
  // ô in SỐ TIỀN khi SA cấu hình phí đại lý theo số tiền (BA: "đôi khi là %, đôi khi là số
  // tiền … hãy hiển thị hết"). BA xác nhận SAU KHI được cho xem lịch sử STT17, nên quyết định
  // muộn hơn thắng — đừng "sửa lại cho khớp" changelog của STT17.
  { id: 'basis', label: 'Giá tính phí', visible: true, order: 8 },
  { id: 'fee_pct', label: 'Phí đại lý', visible: true, order: 9 },
  { id: 'fee_amount', label: 'Thành tiền phí', visible: true, order: 10 },
  // CR STT51: tỷ lệ với deal khai theo %, số tiền với deal khai cố định. Không có dòng tổng —
  // một cột mang hai đơn vị thì tổng của nó không đối chiếu được với gì.
  { id: 'revenue', label: 'Phí doanh thu', visible: true, order: 11 },
  { id: 'bonus', label: 'Thưởng', visible: true, order: 12 },
  { id: 'total', label: 'Tổng phí + thưởng', visible: true, order: 13 },
  // Cụm "trả sale" — xem `WORKSHEET_SALES_PAYOUT_COLUMN_IDS` bên dưới.
  { id: 'sales_fee_pct', label: 'Phí trả sale (%)', visible: true, order: 14 },
  { id: 'fee_progress_pct', label: '% TT Phí', visible: true, order: 15 },
  { id: 'sales_fee_amount', label: 'Thành tiền trả sale', visible: true, order: 16 },
  { id: 'bonus_progress_pct', label: '% TT Thưởng', visible: true, order: 17 },
  { id: 'sales_bonus', label: 'Thưởng trả sale', visible: true, order: 18 },
  { id: 'total_sales_payout', label: 'Tổng trả sale', visible: true, order: 19 },
  { id: 'f2_progress_pct', label: '% TT F2', visible: true, order: 20 },
  { id: 'invoice_no', label: 'Số hoá đơn', visible: true, order: 21 },
  // CR STT51 — đứng NGAY SAU "Số hoá đơn" vì hai ô đọc từ cùng một hoá đơn đại diện (BA Q8).
  { id: 'invoice_month', label: 'Tháng xuất hoá đơn', visible: true, order: 22 },
  { id: 'receipt_no', label: 'Số phiếu thu', visible: true, order: 23 },
  { id: 'paid_pct', label: '% Thanh toán', visible: true, order: 24 },
  { id: 'received_group', label: 'Thành tiền nhận về', visible: true, order: 25 },
  { id: 'payment_suspended', label: 'Tạm ngưng chi trả', visible: true, order: 26 },
  { id: 'status', label: 'Trạng thái', visible: true, order: 27 },
  // CR 86eym80zg (13/08/2026) — 3 cột này trước đứng ngay sau "Mã phân bổ" ở đầu bảng, nay
  // chuyển xuống cuối. Xem `WORKSHEET_TRAILING_COLUMN_IDS` bên dưới.
  { id: 'worksheet_status', label: 'Trạng thái duyệt', visible: true, order: 28 },
  { id: 'dial_deviates', label: 'Duyệt lệch tiền về', visible: true, order: 29 },
  { id: 'deal_code', label: 'Mã deal', visible: true, order: 30 },
]

/**
 * Cột đồng bán sau CR `86eyj75hg`: **đúng MỘT** cột, ở cả hai màn.
 *
 * Khai riêng vì đây là chỗ dễ trôi nhất trong bảng — đã bị viết lại bốn lần trong hai tuần
 * (`c2fb911c6` thêm tỷ lệ + nguồn F2 + loại tuyến CTV; `492e71fa7` gỡ sạch mà message chỉ nói là
 * thêm hàng chữ cái Excel; CR này gộp ba cột thành một; rồi 20/08 bỏ nốt hai cột org). Một phép so
 * danh sách 29 phần tử không nói được là "cụm đồng bán hỏng" — khoá riêng thì lỗi chỉ thẳng vào nó.
 *
 * Điều mà danh sách một phần tử này KHÔNG tự nói ra, và là lý do nó vẫn đáng tồn tại: khối và
 * phòng ban giờ nằm inline trong ô `sellers` (xem `SellerOrgLines`). Ai thấy bảng thiếu hai cột
 * đó mà thêm lại là quay ngược đúng thứ user đã bác.
 */
export const WORKSHEET_SELLER_COLUMN_IDS = ['sellers'] as const

/**
 * CR `86eym80zg`: ba cột này phải nằm ở **ba vị trí cuối cùng** của cả hai bảng worksheet.
 *
 * Khai riêng để test khoá được đúng yêu cầu của CR chứ không chỉ khoá "hai màn giống nhau" —
 * nếu về sau có ai chèn thêm cột mới vào đuôi bảng, hai màn vẫn khớp nhau nhưng CR đã bị phá.
 */
export const WORKSHEET_TRAILING_COLUMN_IDS = [
  'worksheet_status',
  'dial_deviates',
  'deal_code',
] as const

/**
 * CR `86eym80zg` (đợt 2): hai cột định danh này phải **đông cứng** khi kéo ngang, và đứng ngay
 * sau STT — kế toán dò một dòng rất rộng nên mất hai cột này là mất luôn điểm neo.
 *
 * Khai riêng để test khoá được **cả thứ tự lẫn việc `frozen` còn nguyên** ở cả hai màn. Đây là
 * hai bảng ĐẦU TIÊN trong repo vừa có header 3 tầng vừa đông cứng cột, nên `frozen` ở đây phải
 * khai ở **cả ba tầng** (nhóm chữ cái Excel · tầng nhãn · lá): `TableHeader` đọc meta theo từng
 * tầng header còn `TableRow` đọc meta của lá — thiếu tầng nào là tầng đó trôi trong khi các
 * tầng còn lại đứng yên. Offset do `calculateFrozenOffsets` cộng dồn theo LÁ.
 */
export const WORKSHEET_FROZEN_COLUMN_IDS = ['project_name', 'unit_number'] as const

/**
 * Cụm cột "trả sale" — CR STT17 (`86eydbph4`), phải có ở **cả hai** màn, **liền khối** và nằm
 * đúng giữa `total` và `invoice_no`.
 *
 * Khai riêng thay vì để lẫn trong bộ lõi vì cụm này đã bị gỡ khỏi màn "Giao dịch tiền về đợt
 * này" một lần (`492e71fa7`, 05/08/2026) mà không ai nhận ra suốt một tuần — commit chỉ nói là
 * thêm hàng chữ cái Excel. Có tên riêng thì test nói thẳng được "cụm trả sale biến mất ở màn X"
 * thay vì để lẫn vào một phép so danh sách dài 31 phần tử.
 *
 * Renderer của cụm này nằm ở `WorksheetPayoutCells.tsx` — dùng chung, đừng copy sang từng bảng.
 */
export const WORKSHEET_SALES_PAYOUT_COLUMN_IDS = [
  'sales_fee_pct',
  'fee_progress_pct',
  'sales_fee_amount',
  'bonus_progress_pct',
  'sales_bonus',
  'total_sales_payout',
  'f2_progress_pct',
] as const

/**
 * Bản sao ghi được của danh sách trên — `useColumnConfig` nhận `ColumnConfig[]` và bảng còn
 * lọc bớt vài id, nên mỗi lần gọi phải trả về mảng mới thay vì để hai màn dùng chung tham chiếu.
 */
export function buildWorksheetListColumns(): ColumnConfig[] {
  return WORKSHEET_LIST_COLUMNS.map((column) => ({ ...column }))
}

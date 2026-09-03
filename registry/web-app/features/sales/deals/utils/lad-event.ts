import { APP_PATH } from '@/routes/AppRoute.constant'

/**
 * Một dòng lịch sử cấu hình HH của GD (`DealCommissionConfig`) — chỉ khai báo các field
 * mà phần hiển thị "Lô áp dụng (LAD)" cần. Response được đọc dạng lỏng (`any`) ở tầng
 * component nên type này chỉ dùng để mô tả hợp đồng cho helper + test.
 */
export type LadEventConfig = {
  source?: string | null
  /** Mã lô, ví dụ `LAD-2026-0020`. Null với bản ghi khởi tạo (không thuộc lô nào). */
  batch_code?: string | null
  /** Tên lô do người tạo đặt — thứ người dùng thực sự nhận diện lô, ưu tiên số 1 khi hiển thị. */
  batch_name?: string | null
  /** Lý do áp dụng, copy từ `batch.reason` khi apply lô. */
  reason?: string | null
  batch_id?: number | null
  /** SA chủ quản của lô — cần để dựng link tới màn chi tiết LAD (nằm trong tab của SA). */
  batch_sales_allocation_id?: number | null
  version_number?: number | null
  name?: string | null
}

/**
 * Tiêu đề một sự kiện LAD trên timeline / modal chi tiết.
 *
 * Ưu tiên TÊN lô rồi tới LÝ DO — người dùng nhận diện lô bằng tên nghiệp vụ, không phải
 * nhãn kỹ thuật kèm % ("Hồi tố nội bộ — LAD-2026-0020 (-2,00%)"): loại lô và biến động %
 * đã có chip + block "Biến động phí môi giới" riêng nên nhắc lại ở tiêu đề là thừa.
 */
export function getLadEventTitle(config: LadEventConfig | null | undefined): string {
  if (!config) return '—'
  if (config.source === 'creation') return 'Khởi tạo từ Hợp đồng môi giới gốc'

  const batchName = config.batch_name?.trim()
  if (batchName) return batchName

  const reason = config.reason?.trim()
  if (reason) return reason

  const code = config.batch_code?.trim()
  if (config.source === 'reconciliation') {
    return code ? `Phiếu đối chiếu CĐT ${code}` : 'Phiếu đối chiếu CĐT'
  }
  if (config.source === 'bulk_retro') {
    return code ? `Lô áp dụng ${code}` : 'Lô áp dụng hồi tố'
  }

  return config.name?.trim() || `Cập nhật cấu hình phiên bản #${config.version_number ?? '—'}`
}

/**
 * Đường dẫn tới màn chi tiết LAD. Màn này là một sub-view của tab "Lô áp dụng" trong trang
 * chi tiết Sale Allocation (xem `useLadWizardState`), nên cần CẢ id SA lẫn id lô;
 * thiếu một trong hai ⇒ null và nơi gọi hiển thị mã lô dạng text thường.
 */
export function buildLadDetailPath(config: LadEventConfig | null | undefined): string | null {
  const batchId = config?.batch_id
  const saleAllocationId = config?.batch_sales_allocation_id
  if (!batchId || !saleAllocationId) return null
  const base = APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(':id', String(saleAllocationId))
  return `${base}?tab=lad&lad_view=detail&batch_id=${batchId}`
}

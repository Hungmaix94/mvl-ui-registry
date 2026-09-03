import { InvestorReconciliationSheetDoc_total_basis as DocTotalBasis } from '@/api/schema'
import type { InvestorReconciliationSheet } from '@/features/sales/investor-reconciliations/types/investor-reconciliation'

/**
 * "Tổng theo chứng từ CĐT" — con số kế toán GÕ TỪ bảng kê của chủ đầu tư, để hệ thống tự kiểm tra
 * chính nó.
 *
 * Hai field ghi được (`doc_total_amount` + `doc_total_basis`) đã có sẵn trong `schema.ts`; BE tự so
 * tổng phiếu với con số đó và trả kết quả read-only ở `document_total_check`. Biểu mẫu nhập Excel đã
 * dặn người dùng "điền 'Tổng theo chứng từ CĐT' ở màn phiếu" (rule 11) từ trước khi màn hình có ô
 * nhập — đây là ô đó.
 *
 * Ba luật đừng làm sai:
 *  1. **Bỏ trống là HỢP LỆ** và có nghĩa "không chạy kiểm tra" ⇒ `null`, không phải `0`. Gửi `0` là
 *     khai rằng CĐT ghi tổng bằng 0 và phiếu sẽ lệch đúng bằng cả tổng của nó.
 *  2. **`doc_total_basis` BẮT BUỘC khi có `doc_total_amount`** — cùng một con số đọc theo net hay
 *     gross lệch nhau đúng phần VAT.
 *  3. `document_total_check` là `null` khi không ai gõ tổng — hiện "chưa khai", đừng hiện "khớp".
 */

export { DocTotalBasis }

/**
 * Nhãn của hai gốc so sánh. Lấy đúng chữ trong JSDoc của enum sinh từ OpenAPI (`net` - Chưa gồm VAT,
 * `gross` - Đã gồm VAT) và keyed BẰNG enum, nên BE thêm gốc thứ ba là `tsc` đỏ ngay chứ không im
 * lặng hiện raw enum. Field mới nên chưa có `APP_CONSTANT_KEY` tương ứng để dùng `useAppConstant`.
 */
export const DOC_TOTAL_BASIS_LABEL: Record<DocTotalBasis, string> = {
  [DocTotalBasis.net]: 'Chưa gồm VAT',
  [DocTotalBasis.gross]: 'Đã gồm VAT',
}

export const DOC_TOTAL_BASIS_OPTIONS = [
  { value: DocTotalBasis.net, label: DOC_TOTAL_BASIS_LABEL[DocTotalBasis.net] },
  { value: DocTotalBasis.gross, label: DOC_TOTAL_BASIS_LABEL[DocTotalBasis.gross] },
]

export const DOC_TOTAL_BASIS_REQUIRED_MESSAGE =
  'Vui lòng chọn gốc so sánh (chưa gồm VAT / đã gồm VAT) cho tổng theo chứng từ CĐT'

/** Giá trị hai ô nhập trên form meta của phiếu. */
export type DocTotalFormValues = {
  doc_total_amount: number | null
  doc_total_basis: DocTotalBasis | null
}

/** `document_total_check` của BE, đã chuẩn hoá về số. */
export type ReconDocumentTotalCheck = {
  basis: DocTotalBasis | null
  documentTotal: number
  sheetTotal: number
  /** `document − sheet`; dương nghĩa là chứng từ khai NHIỀU hơn phiếu. */
  difference: number
  /** Khe hở lớn nhất mà riêng việc làm tròn từng căn có thể giải thích được. */
  tolerance: number
  withinTolerance: boolean
}

const toNumber = (value: string | number | null | undefined): number => {
  if (value === null || value === undefined || value === '') return 0
  const n = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(n) ? n : 0
}

/** Chỉ nhận số hữu hạn; chuỗi rỗng / null / NaN ⇒ `null` ("không khai"). */
export function toDocTotalAmount(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'string' ? Number(value) : value
  return Number.isFinite(n) ? n : null
}

/** Hydrate hai ô nhập từ phiếu đã lưu. */
export function docTotalFormValues(
  sheet:
    | Pick<InvestorReconciliationSheet, 'doc_total_amount' | 'doc_total_basis'>
    | null
    | undefined
): DocTotalFormValues {
  return {
    doc_total_amount: toDocTotalAmount(sheet?.doc_total_amount),
    doc_total_basis: sheet?.doc_total_basis ?? null,
  }
}

/**
 * Hai field cho payload PATCH.
 *
 * Xoá con số đã khai ⇒ gửi **`doc_total_amount: null` và BỎ HẲN `doc_total_basis`**. Không phải lựa
 * chọn thẩm mỹ: trong `schema.ts` chỉ `doc_total_amount` là nullable (`string | null`), còn
 * `doc_total_basis` khai `?: enum` **không nhận `null`** — gửi `null` là lỗi kiểu, và gửi một gốc so
 * sánh cho một con số không tồn tại thì cũng vô nghĩa. Bỏ qua CẢ HAI field thì BE giữ nguyên giá trị
 * cũ và kế toán không gỡ được số nhập nhầm, nên vế `amount: null` là bắt buộc phải có.
 */
export function toDocTotalPayload(values: DocTotalFormValues): {
  doc_total_amount: string | null
  doc_total_basis?: DocTotalBasis
} {
  if (values.doc_total_amount === null || values.doc_total_amount === undefined) {
    return { doc_total_amount: null }
  }
  return {
    doc_total_amount: String(values.doc_total_amount),
    // `undefined` chỉ xảy ra khi form lọt qua validation (Zod đã chặn) — để BE 400 chứ không bịa gốc.
    ...(values.doc_total_basis ? { doc_total_basis: values.doc_total_basis } : {}),
  }
}

/** `doc_total_basis` bắt buộc khi `doc_total_amount` có giá trị. */
export function isDocTotalBasisMissing(values: DocTotalFormValues): boolean {
  return values.doc_total_amount !== null && !values.doc_total_basis
}

/**
 * Đọc `document_total_check` (chỉ có trên sheet DETAIL). `null` khi kế toán chưa khai tổng nào.
 */
export function sheetDocumentTotalCheck(
  sheet: Pick<InvestorReconciliationSheet, 'document_total_check'> | null | undefined
): ReconDocumentTotalCheck | null {
  const raw = sheet?.document_total_check
  if (!raw) return null
  return {
    basis: raw.basis ?? null,
    documentTotal: toNumber(raw.document_total),
    sheetTotal: toNumber(raw.sheet_total),
    difference: toNumber(raw.difference),
    tolerance: toNumber(raw.tolerance),
    withinTolerance: raw.within_tolerance === true,
  }
}

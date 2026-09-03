import { BookingRefundSaleSale_type, components } from '@/api/schema'

/** `{id, code, name}` của một thực thể được tham chiếu. Export để component dùng chung một định
 *  nghĩa thay vì tự dẫn lại từ `components['schemas']` rồi lệch nhau lúc schema đổi. */
export type ParticipantRef = components['schemas']['WorksheetParticipantRef']

type Ref = ParticipantRef
type SalesParticipant = components['schemas']['WorksheetSalesParticipant']
type F2Participant = components['schemas']['WorksheetF2Participant']
type CtvParticipant = components['schemas']['WorksheetCtvParticipant']

/** Chi nhánh → Khối → Phòng ban của một dòng, luôn đi kèm ĐÚNG người của nó. */
export type ParticipantOrg = {
  branch: Ref | null
  block: Ref | null
  department: Ref | null
}

type BaseEntry = {
  /** Người/đơn vị đứng tên dòng đó. Đặt là `party` chứ KHÔNG phải `ref`: entry hay được spread
   *  vào component, mà `ref` là prop React giữ chỗ — React nuốt luôn field và cảnh báo runtime. */
  party: Ref | null
  /** Tỷ lệ tham gia của chính dòng đó — chuỗi 2 số lẻ từ BE ("40.00"). */
  pct: string | null
}

/** Nhân viên MaiVietLand đứng tên bán — có cụm tổ chức thật. */
export type MvSaleEntry = BaseEntry & ParticipantOrg

/** Sàn F2 đồng bán — KHÔNG có tổ chức, thay bằng NGUỒN đưa sàn vào deal. */
export type F2SellerEntry = BaseEntry & {
  /** Nhãn nguồn BE đã dịch sẵn — KHÔNG tự map lại từ `f2_source`. */
  sourceLabel: string
  /** Chỉ non-null khi `f2_source=director` (CheckConstraint ở DB ép 2 nguồn kia null). */
  sourceDirector: Ref | null
}

/** CTV đồng bán — tổ chức suy từ TUYẾN, rỗng với tuyến `independent`. */
export type CtvSellerEntry = BaseEntry &
  ParticipantOrg & {
    lineTypeLabel: string
    /** Chủ tuyến — non-null với tuyến `management` / `internal_sale` gắn với một người. */
    lineEmployee: Ref | null
  }

export type WorksheetParticipantSource = {
  sales_participants?: SalesParticipant[] | null
  f2_participants?: F2Participant[] | null
  ctv_participants?: CtvParticipant[] | null
}

/**
 * Nhân viên MV đứng tên bán.
 *
 * Lọc ĐÚNG `sale_type=mv`: `sales_participants` chứa sẵn cả dòng `partner` lẫn `collaborator`
 * (CR STT30), mà hai loại đó đã có cột riêng đọc từ `f2_participants`/`ctv_participants` — bản ở
 * đây thô hơn (không có nguồn F2 / loại tuyến CTV) nên để lọt là vừa nghèo thông tin vừa in lặp.
 */
export function buildMvSales(row?: WorksheetParticipantSource | null): MvSaleEntry[] {
  return (row?.sales_participants ?? [])
    .filter((p) => p.sale_type === BookingRefundSaleSale_type.mv)
    .map((p) => ({
      party: p.employee ?? null,
      pct: p.participation_percentage ?? null,
      branch: p.branch ?? null,
      block: p.block ?? null,
      department: p.department ?? null,
    }))
}

/** Sàn F2 đồng bán, kèm nguồn — thay `f2_exchanges` vốn chỉ có `{id, code, name}`. */
export function buildF2Sellers(row?: WorksheetParticipantSource | null): F2SellerEntry[] {
  return (row?.f2_participants ?? []).map((p) => ({
    party: p.exchange ?? null,
    pct: p.participation_percentage ?? null,
    sourceLabel: p.f2_source_display ?? '',
    sourceDirector: p.f2_source_director ?? null,
  }))
}

/** CTV đồng bán, kèm loại tuyến — thay `ctvs` vốn chỉ có `{id, code, name}`. */
export function buildCtvSellers(row?: WorksheetParticipantSource | null): CtvSellerEntry[] {
  return (row?.ctv_participants ?? []).map((p) => ({
    party: p.collaborator ?? null,
    pct: p.participation_percentage ?? null,
    lineTypeLabel: p.ctv_line_type_display ?? '',
    lineEmployee: p.ctv_line_employee ?? null,
    branch: p.branch ?? null,
    block: p.block ?? null,
    department: p.department ?? null,
  }))
}

/**
 * Nhãn cố định của cột "Khối" và "Phòng ban" trên một dòng sàn F2.
 *
 * Sàn F2 là đối tác NGOÀI cây tổ chức MVL nên BE trả `branch`/`block`/`department` = null (xem
 * docstring `WorksheetF2ParticipantSerializer`) — không phải thiếu dữ liệu, mà là không tồn tại.
 * CR `86eyj75hg` chốt hai ô đó đọc thẳng "Sàn F2" thay vì gạch ngang, để kế toán quét dọc cột
 * Khối là phân loại được ngay ba nhóm người nhận.
 */
export const F2_ORG_LABEL = 'Sàn F2'

/** Loại của một dòng trong cột đồng bán đã gộp. */
export type SellerKind = 'mv' | 'f2' | 'ctv'

/**
 * MỘT dòng của cột đồng bán đã gộp (CR `86eyj75hg`) — ba loại người bán quy về một hình dạng
 * chung để cột "Danh sách sale", cột "Khối" và cột "Phòng ban" duyệt CÙNG một mảng, cùng thứ tự.
 *
 * Đó là toàn bộ lý do gộp ở tầng dữ liệu thay vì ghép ở tầng JSX: CR đòi "Khối, phòng ban sắp
 * xếp lần lượt tương ứng với tên người bán", mà ba cột duyệt ba mảng khác nhau thì thứ tự chỉ
 * trùng nhau do may mắn — thêm một loại người bán là ba cột lệch nhau im lặng.
 */
export type WorksheetSellerEntry = BaseEntry & {
  kind: SellerKind
  /** Chi nhánh — hiện INLINE ngay dưới tên. Khối/Phòng ban đã tách thành cột riêng nên không
   *  còn nằm ở đây; chi nhánh thì CR không đòi cột nên giữ nguyên chỗ cũ (chốt với user 19/08). */
  branch: Ref | null
  /** Giá trị của ô cột "Khối" — đã áp quy tắc F2 ⇒ `F2_ORG_LABEL`. Rỗng = ô hiện gạch ngang. */
  blockLabel: string
  /** Giá trị của ô cột "Phòng ban" — cùng quy tắc. */
  departmentLabel: string
  /** Nhãn phân loại: nguồn F2 (dòng F2) hoặc loại tuyến (dòng CTV). Rỗng với dòng sale MV. */
  classifierLabel: string
  /** Nhân viên liên quan kèm nhãn của nó — "GĐ kinh doanh" (F2) hoặc "Chủ line" (CTV). */
  relatedEmployee: { label: string; employee: Ref } | null
}

/**
 * Gộp ba nhóm đồng bán thành MỘT danh sách, giữ nguyên thứ tự sale MV → sàn F2 → CTV.
 *
 * Thứ tự đó chính là thứ tự ba cột cũ đứng cạnh nhau trên bảng, nên kế toán đọc dọc cột gộp vẫn
 * gặp đúng trình tự quen thuộc thay vì phải học lại một trật tự mới.
 *
 * Nguồn của từng loại giữ nguyên như ba cột cũ: sale MV lấy từ `sales_participants`, còn F2/CTV
 * lấy từ `f2_participants`/`ctv_participants` chứ KHÔNG lấy bản thô cùng tên trong
 * `sales_participants` — bản thô thiếu nguồn F2, thiếu loại tuyến, và với CTV thì thiếu luôn
 * tổ chức suy từ tuyến (đúng thứ CR gọi là "hiển thị theo line").
 */
export function buildWorksheetSellers(
  row?: WorksheetParticipantSource | null
): WorksheetSellerEntry[] {
  const mv: WorksheetSellerEntry[] = buildMvSales(row).map((entry) => ({
    kind: 'mv',
    party: entry.party,
    pct: entry.pct,
    branch: entry.branch,
    blockLabel: entry.block?.name ?? '',
    departmentLabel: entry.department?.name ?? '',
    classifierLabel: '',
    relatedEmployee: null,
  }))

  const f2: WorksheetSellerEntry[] = buildF2Sellers(row).map((entry) => ({
    kind: 'f2',
    party: entry.party,
    pct: entry.pct,
    branch: null,
    blockLabel: F2_ORG_LABEL,
    departmentLabel: F2_ORG_LABEL,
    classifierLabel: entry.sourceLabel,
    relatedEmployee: entry.sourceDirector
      ? { label: 'GĐ kinh doanh', employee: entry.sourceDirector }
      : null,
  }))

  const ctv: WorksheetSellerEntry[] = buildCtvSellers(row).map((entry) => ({
    kind: 'ctv',
    party: entry.party,
    pct: entry.pct,
    branch: entry.branch,
    // Tuyến `independent` không thuộc phòng ban nào ⇒ BE trả null ⇒ ô để trống (gạch ngang).
    // Dòng vẫn phải có mặt vì CTV đó có tham gia bán.
    blockLabel: entry.block?.name ?? '',
    departmentLabel: entry.department?.name ?? '',
    classifierLabel: entry.lineTypeLabel,
    relatedEmployee: entry.lineEmployee
      ? { label: 'Chủ line', employee: entry.lineEmployee }
      : null,
  }))

  return [...mv, ...f2, ...ctv]
}

/** "mã - tên" — mã đi trước để tra cứu trực quan, khớp quy ước mọi cột tham chiếu khác. */
export function formatParticipantRef(ref?: Ref | null): string {
  if (!ref) return '—'
  return [ref.code, ref.name].filter(Boolean).join(' - ') || '—'
}

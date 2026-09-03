/**
 * Khe hở làm tròn cấp PHIẾU — khoảng cách giữa khối các căn và khối tổng, lấy từ BE.
 *
 * Màn đối chiếu hiển thị các căn (mỗi căn một số đã làm tròn) rồi hiển thị dòng tổng (cộng
 * giá trị CHÍNH XÁC rồi làm tròn MỘT lần, đúng cách CĐT tự cộng bảng kê của họ). `Σ round(x_i)`
 * không bằng `round(Σ x_i)`, nên hai khối lệch nhau một cách hợp lệ — mà trên màn hình không có
 * gì nói ra điều đó. Hoá đơn thì có: nó mang hẳn một dòng "Chenh lech lam tron"
 * (`sales_invoice_service._append_rounding_line`). Đây là đúng con số đó, phía đối chiếu.
 *
 * BA TRỤC, ĐO RIÊNG — bắt buộc, không phải cho tiện. Có phiếu thật mà dòng "Tổng (gồm VAT)"
 * khớp hoàn hảo trong khi hai dòng ngay trên nó mỗi dòng lệch 1đ NGƯỢC CHIỀU nhau
 * (TVVL-IRS0019, NSCP-IRS0021). Ai chỉ nhìn trục gồm-VAT sẽ kết luận phiếu sạch rồi để nguyên
 * hai dòng sai trên màn hình — tức là giấu đúng cái mình sinh ra để hiện. Vì thế
 * {@link hasRoundingGap} soi cả ba trục, không soi mỗi `withVat`.
 *
 * Dấu: `gap = tổng phiếu − Σ các căn`, nên **cộng gap vào khối căn thì ra đúng dòng tổng**.
 * Đây cũng là dấu hoá đơn ghi, và phải giữ nguyên như vậy — cùng một khe hở mà đọc `+5` ở phiếu
 * rồi `−5` ở hoá đơn do chính phiếu đó sinh ra thì tệ hơn là không hiện gì.
 *
 * KHÔNG giả định khe hở tối đa 1đ ở bất cứ đâu: mỗi căn nằm đúng mốc `,5` góp nửa đồng, nên trần
 * là ±N/2 — phiếu MT-IRS0011 (68 căn) đo được 5đ.
 */

/**
 * TODO(schema): `rounding_gap` đã có ở BE nhưng chưa có trong `schema.ts`. Gỡ type này và gỡ ép
 * kiểu ngay sau đợt `yarn api:update` kế tiếp.
 *
 * ĐÃ THỬ REGEN 2026-08-20, PHẢI REVERT — đừng thử lại một mình. Sinh lại `schema.ts` từ `dev`
 * hiện tại làm **vỡ `tsc` ở 18 chỗ hoàn toàn không liên quan** (project / payroll / auth), đúng
 * cái bẫy `AGENTS.md` mô tả: `--dedupe-enums` đặt tên enum theo URL path nào "thắng" ở lần sinh
 * đó, nên `PatchedProductInventoryRequestProduct_type` và `LoginRequestPlatform` biến mất khỏi
 * export, kéo theo mọi file đang import tên cũ. Kèm theo đó, vài endpoint sinh ra type `{}` do
 * schema BE còn 360 lỗi introspect.
 *
 * Nghĩa là regen KHÔNG phải một bước cơ học: nó là một task riêng, phải đi kèm việc chuyển các
 * import đó sang alias trong `src/constants/api-schema-aliases.ts` (đúng như `AGENTS.md` yêu cầu)
 * và dọn phía BE. Gộp vào một PR tính năng thì vừa không review nổi vừa rủi ro.
 */
type SheetRoundingGapField = {
  rounding_gap?: {
    net?: string | number | null
    vat?: string | number | null
    with_vat?: string | number | null
  } | null
}

export type ReconRoundingGap = {
  /** Chưa VAT. */
  net: number
  /** Tiền thuế. */
  vat: number
  /** Gồm VAT. */
  withVat: number
}

const NO_GAP: ReconRoundingGap = { net: 0, vat: 0, withVat: 0 }

function num(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

/**
 * Khe hở làm tròn của phiếu. Trả về 0/0/0 khi BE chưa gửi field — phiếu không hiện dòng nào,
 * đúng hành vi cũ, thay vì vỡ màn hình trong lúc chờ deploy.
 *
 * Ép kiểu ở đây, một chỗ duy nhất, thay vì rải `as` vào component (xem `AGENTS.md`: KHÔNG sửa
 * tay `schema.ts`).
 */
export function sheetRoundingGap(sheet: unknown): ReconRoundingGap {
  const raw = (sheet as SheetRoundingGapField)?.rounding_gap
  if (raw == null) return NO_GAP
  return { net: num(raw.net), vat: num(raw.vat), withVat: num(raw.with_vat) }
}

/**
 * Có trục nào lệch không. Soi CẢ BA trục: phiếu `TVVL-IRS0019` có `withVat = 0` trong khi
 * net `+1` và vat `−1`, và đó chính là phiếu cần hiện chú thích nhất.
 */
export function hasRoundingGap(gap: ReconRoundingGap): boolean {
  return gap.net !== 0 || gap.vat !== 0 || gap.withVat !== 0
}

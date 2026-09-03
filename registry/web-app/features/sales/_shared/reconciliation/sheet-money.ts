/**
 * Số tiền cấp PHIẾU — lấy từ BE, không cộng ở client.
 *
 * Khối "Tổng kết phiếu" có 4 dòng. Ba dòng đầu (chưa VAT / VAT / gồm VAT) vốn đã đọc thẳng từ
 * `sheet.*`. Riêng "TIỀN PHẢI THU CĐT" thì FE tự `reduce` `amount_to_collect` của từng căn — và
 * mỗi căn được làm tròn riêng, nên tổng của chúng lệch với dòng "Tổng tiền (Gồm VAT)" ngay phía
 * trên nó. Ca thật, phiếu CSTN-IRS0024 sau khi nhập HĐ 881:
 *
 *     Tổng tiền (Gồm VAT)   2.349.453.648      ← BE, cộng chính xác rồi làm tròn một lần
 *     TIỀN PHẢI THU CĐT     2.349.453.649      ← FE cộng 5 căn đã tròn
 *
 * `Σ round(x_i)` không bằng `round(Σ x_i)`. BE nay tính sẵn cả hai số ở cấp phiếu
 * (`InvestorReconciliationSheet.amount_to_collect` = gồm VAT − Σ tạm ứng), đúng cách
 * `SalesInvoice` vốn đã làm. Quy tắc `.agents/rules/main.md` §Money/Rate: **FE không tính tiền
 * client-side, tiền lấy từ backend.**
 */

/**
 * TODO(schema): field cấp phiếu BE mới thêm, chưa có trong `schema.ts` cho tới khi BE deploy +
 * `yarn api:update`. Gỡ type này, gỡ ép kiểu, và gỡ fallback cộng từng căn ngay sau đợt regen đó.
 */
type SheetMoneyFields = {
  amount_to_collect?: string | number | null
  total_prepaid_advance_amount?: string | number | null
  reconciliations?: ReadonlyArray<{
    amount_to_collect?: string | number | null
    shared_bonus_prepaid_amount?: string | number | null
  }> | null
}

function num(value: string | number | null | undefined): number {
  return Number(value ?? 0)
}

function sumLines(
  sheet: SheetMoneyFields,
  key: 'amount_to_collect' | 'shared_bonus_prepaid_amount'
): number {
  return (sheet.reconciliations ?? []).reduce((sum, line) => sum + num(line[key]), 0)
}

/**
 * Tiền còn phải thu CĐT của cả phiếu.
 *
 * Ưu tiên số BE tính. Fallback cộng từng căn là **lưới chống 0đ** cho tới khi BE lên môi trường:
 * không có nó thì phiếu hiện 0đ ở dòng quan trọng nhất — sai nặng hơn hẳn lệch 1đ.
 *
 * **Nó KHÔNG phải cách tính thay thế.** Nó tính một đại lượng KHÁC: `Σ round(từng căn)`, trong khi
 * số của phiếu là `round(Σ exact)` gộp theo từng thuế suất (BE `_sheet_totals`, NĐ 123 điều 10).
 * Hai quy tắc chỉ trùng nhau khi mọi căn tròn đồng — nên khi nhánh fallback chạy, con số hiện ra
 * có thể lệch 1đ so với chính nó sau khi BE deploy. Đó là lý do nó phải chết sớm, không phải là
 * lý do để đem đi dùng chỗ khác.
 *
 * Ép kiểu ở đây, một chỗ duy nhất, thay vì rải `as` vào component (xem `web/AGENTS.md`: KHÔNG
 * regen `schema.ts` từ dump BE local).
 *
 * **Gỡ fallback + ép kiểu ngay khi BE deploy và `yarn api:update` sinh lại `schema.ts`.**
 */
export function sheetAmountToCollect(sheet: unknown): number {
  const s = sheet as SheetMoneyFields
  return s?.amount_to_collect != null
    ? num(s.amount_to_collect)
    : sumLines(s ?? {}, 'amount_to_collect')
}

/** Σ tạm ứng đã cấn trừ của cả phiếu — cùng quy tắc như {@link sheetAmountToCollect}. */
export function sheetPrepaidAdvanceTotal(sheet: unknown): number {
  const s = sheet as SheetMoneyFields
  return s?.total_prepaid_advance_amount != null
    ? num(s.total_prepaid_advance_amount)
    : sumLines(s ?? {}, 'shared_bonus_prepaid_amount')
}

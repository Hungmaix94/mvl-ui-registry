# Đối chiếu CĐT — Spec các loại kỳ (line card)

> **Nguồn:** bóc tách từ mockup `../srs/mockups/Recon/recon_UI.html`
> (bundle React V5/V6 — component `LineCardV5` + `ConfigTable5` + `deriveV5` + `newLineV5`).
> Mục đích: agent sau **không cần** decode lại mockup. Khi sửa line card hãy đọc file này trước.
>
> Bản dựng FE hiện tại: `components/InvestorReconciliationLineCard.tsx`,
> `ReconLineCardHeader.tsx`, `ReconConfigTable.tsx`, `ReconHistoryTable.tsx`,
> `InvestorReconciliationSettlementCheck.tsx`. Hằng số: `constants/recon-period-type.ts`.

---

## 0. Tóm tắt nhanh (đọc cái này trước)

5 loại kỳ (`period_type` = `CTVReconciliationPeriod_type`):

| key schema                 | id mockup  | Nhãn đầy đủ               | Nhãn ngắn    | Màu    | Icon                       |
| -------------------------- | ---------- | ------------------------- | ------------ | ------ | -------------------------- |
| `normal_payment`           | `normal`   | Kỳ thanh toán thường      | TT thường    | blue   | coins (`IconCoin`)         |
| `progress_with_adjustment` | `progress` | Kỳ tiến độ kèm điều chỉnh | Tiến độ + ĐC | purple | layers (`IconStacksimple`) |
| `adjustment_only`          | `adjust`   | Kỳ điều chỉnh thuần       | ĐC thuần     | orange | edit (`IconNotepencil`)    |
| `bonus_deduction`          | `bonus`    | Kỳ thưởng / khấu trừ      | Thưởng / KT  | green  | target (`IconTarget`)      |
| `cancellation`             | `cancel`   | Kỳ hủy cọc                | Hủy cọc      | red    | warn (`IconWarning`)       |

> Strip màu = nền tint nhạt (`bg-data-{color}-disabled`) + chữ tone đậm (`text-data-{color}-hover`);
> riêng đỏ dùng `text-data-red-default`.

### ⚠ Phát hiện QUAN TRỌNG — `period_type` KHÔNG ẩn các Phần (trừ hủy cọc)

Trong mockup, `defaultPhan` của **cả 4 kỳ non-cancel đều giống hệt**: `{ p1:true, p2:true, p3:true }`
(+ `p4:false`). Tức là **mọi kỳ non-cancel đều hiển thị đủ Phần 0 + 1 + 2 + 3**. Comment gốc:
_"mặc định cả 3 phần bật sẵn — ai cần thì nhập"_.

`period_type` chỉ chi phối:

1. **Màu + icon + nhãn** của strip.
2. **Validations** (D1/D9…): vd `adjust` ở đợt đầu bị chặn (D1); `adjust` mà nhập `% TT đợt > 0` → gợi ý đổi sang `progress` (D9).
3. **Trọng tâm dòng tóm tắt** ở view thu gọn.
4. **Default toggle / semantics** khi thêm căn.

Chỉ **Kỳ hủy cọc** đổi part visibility: `{ p1:false, p2:false, p3:true }` → chỉ Phần 0 + Phần 3.

> 🔴 **Lệch với code hiện tại:** `constants/recon-period-type.ts` đang gate cứng từng kỳ
> (`normal`=p1, `progress`=p1+p2, `adjust`=p2, `bonus`=p3). Mockup KHÔNG làm vậy.
>
> ✅ **USER ĐÃ CHỐT (2026-06-02): theo MOCKUP show-all** — xác nhận qua 2 ví dụ DOM thật:
> kỳ TT thường render đủ Phần 0+1+2+3 + Tổng kết; kỳ Hủy cọc render Phần 0 + Phần 3 + Tổng kết.
> → Đợt 2 phải **bỏ `RECON_PART_VISIBILITY` gate-cứng-theo-kỳ**: non-cancel hiện 0+1+2+3, cancel hiện 0+3.
> Lưu ý: Phần 0 ở kỳ Hủy cọc (và mọi kỳ khi `p2` tắt) là **read-only** — ô CĐT hiện `= MV (…)`, không nhập được.

### 2 công tắc optional (thanh "Tùy chọn" trên strip, mặc định TẮT, ẩn ở kỳ hủy cọc)

- **Phí tăng thêm** (`p4`) → mở Phần 4 (tiến độ phí tăng thêm độc lập với base).
- **Giá riêng Sale/F2** (`useSaleBasis`) → thêm dòng "Giá tính phí riêng (Sale/F2)" ở Phần 0,
  chỉ ảnh hưởng HH Sale/F2 nội bộ, **không** ảnh hưởng đối chiếu CĐT.

---

## 1. Cấu trúc 1 line card (cả 2 trạng thái)

```
┌─ HEAD (LUÔN hiện) ──────────────────────────────────────────────────────────┐
│ [01]  [UnitPicker mã căn/HĐ]  HD06 · KH <tên> · HĐMB <giá> × <%HH> · Đã ĐC <%> │
│                              [Tiền nhận kỳ này <net>] [⚠Cảnh báo/Lỗi] [✓Xác    │
│                               nhận đối chiếu] [chevron] [🗑]                     │
├─ nếu THU GỌN → MINI STRIP ──────────────────────────────────────────────────┤
│ [chip icon+nhãn] % TT: a→b% · Phí ĐL: x ₫ · Truy hồi:… · Thưởng:… · …          │
├─ nếu MỞ RỘNG → STRIP + BODY ────────────────────────────────────────────────┤
│ [strip: icon + nhãn đầy đủ]                    Tùy chọn: (•Phí tăng thêm)(•Giá  │
│                                                          riêng Sale/F2)         │
│ • Lịch sử đối chiếu (collapsible)                                              │
│ • ConfigTable (1 <table> 4 cột: nhãn | CĐT đề nghị | MV ghi nhận | Đối chiếu)  │
│ • Settlement check (chỉ khi postPct ≥ 100)                                     │
│ • NegHandling (chỉ khi net < 0, ẩn ở hủy cọc)                                  │
│ • Ghi chú căn (textarea)                                                       │
├─ ISSUES (LUÔN hiện nếu có) ─────────────────────────────────────────────────┤
│ ⚠/✕/ℹ <message validation>                                                     │
└──────────────────────────────────────────────────────────────────────────────┘
```

### HEAD — luôn hiển thị (cả thu gọn & mở rộng)

| Vị trí    | Nội dung                                                                            | Nguồn                           |
| --------- | ----------------------------------------------------------------------------------- | ------------------------------- |
| Số thứ tự | `01`, `02`… (padStart 2)                                                            | `line.no`                       |
| Picker    | mã căn / mã HĐ (deal-based select)                                                  | `unit` → `product_inventory_id` |
| Meta      | `HD06 · KH <customer> · HĐMB <hdmb_price> ₫ × <broker_pct> · Đã ĐC <prior_pay_pct>` | `mv.*`                          |
| Pill phải | "Tiền nhận kỳ này" + `net` (xanh nếu >0, đỏ nếu <0, xám nếu =0)                     | `c.net`                         |
| Chip      | "Lỗi" (đỏ) nếu có err, else "Cảnh báo" (cam) nếu có warn                            | `issues`                        |
| Nút       | "✓ Đã xác nhận" / "+ Xác nhận đối chiếu" — **disabled khi còn err**                 | `line.verified` (FE-only)       |
| Nút       | chevron mở/thu                                                                      | `line.collapsed` (FE-only)      |
| Nút       | 🗑 xóa — chỉ bật ở đợt cuối (D8)                                                    | `canRemove`                     |

---

## 2. View THU GỌN (mini strip) — nội dung theo kỳ

Dòng mini = `[chip icon + nhãn đầy đủ]` + các meta sau (chỉ hiện khi có giá trị):

| Meta                    | Điều kiện hiện                               | Giá trị                                         |
| ----------------------- | -------------------------------------------- | ----------------------------------------------- |
| `% TT: a→b%`            | luôn                                         | `c.priorPct` → `c.postPct`                      |
| `Phí ĐL: x ₫`           | luôn                                         | `c.brokerThis`                                  |
| `Truy hồi: ±x`          | `c.truyHoi !== 0`                            | `c.truyHoi` (đỏ nếu <0)                         |
| `Thưởng: x ₫`           | `line.bonus > 0`                             | `line.bonus`                                    |
| `Khấu trừ: x ₫`         | `line.deduct > 0`                            | `line.deduct`                                   |
| `Tăng thêm: x ₫ (a→b%)` | `p4 && c.extraThis !== 0`                    | `c.extraThis`, `c.priorExtraPct→c.postExtraPct` |
| `Giá Sale/F2: x ₫`      | `useSaleBasis && c.saleBasis !== c.newBasis` | `c.saleBasis`                                   |

> Mini strip dùng **cùng** màu/icon/nhãn-đầy-đủ với strip mở rộng. Các meta chỉ là phần
> nổi bật của kỳ đó — vd kỳ thưởng sẽ chủ yếu thấy "Thưởng/Khấu trừ", kỳ tiến độ thấy "% TT/Phí ĐL".

---

## 3. View MỞ RỘNG — ConfigTable (1 bảng `<table>`, **4 cột**)

> ⚠ Đây là **MỘT thẻ `<table>` thật**, KHÔNG phải các div/Flex rời. **Mọi dòng dữ liệu đều có đúng 4
> ô** căn theo cùng 4 cột; ô nào trống thì hiện `—`. Tiêu đề nhóm là **dòng span full** (`colspan=4`).
> Tổng kết ("= TIỀN NHẬN KỲ NÀY (NET)"…) cũng là **các dòng NẰM TRONG cùng bảng này** (không tách ra ngoài).

### 3.0 Khung bảng (DOM gốc — bám sát class này)

```html
<table class="rf5-tbl">
  <thead>
    <tr>
      <th class="col-lbl"></th>
      <!-- cột nhãn, header rỗng -->
      <th class="col-cdt">CĐT đề nghị</th>
      <th class="col-mv">MV ghi nhận <small>(theo bảng theo dõi / HĐPP)</small></th>
      <th class="col-delta">Đối chiếu</th>
    </tr>
  </thead>
  <tbody>
    <!-- DÒNG TIÊU ĐỀ NHÓM = span full chiều ngang -->
    <tr class="rf5-phan-hd hd-{slate|blue|orange|green|purple|irish}">
      <td colspan="4"><b>{tên nhóm}</b></td>
    </tr>

    <!-- DÒNG DỮ LIỆU = đúng 4 ô -->
    <tr class="{row-strong|row-muted|row-warn}?">
      <td class="col-lbl">
        <span class="lbl-main">{nhãn}</span><span class="lbl-sub">{hint}</span>
      </td>
      <td class="col-cdt num">{ô nhập rf5-cell-edit} hoặc {giá trị}</td>
      <td class="col-mv num">{MV ref} hoặc <span class="muted">— (không quy định)</span></td>
      <td class="col-delta num">{chip Đối chiếu | ok-tick | <span class="muted">—</span>}</td>
    </tr>
  </tbody>
</table>
```

| Class                    | Ý nghĩa                                                                                                                                                                                                           |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rf5-phan-hd hd-{color}` | dòng band tiêu đề nhóm, `<td colspan=4>`. Màu: **slate** (Phần 0), **blue** (Phần 1 Tiến độ), **orange** (Phần 2 Truy hồi), **green** (Phần 3 Thưởng/KT), **purple** (Tổng kết), **irish** (Phần 4 Phí tăng thêm) |
| `col-lbl`                | ô nhãn: `lbl-main` (tên dòng) + `lbl-sub` (hint/công thức, ẩn ở chế độ readonly)                                                                                                                                  |
| `col-cdt num`            | ô **CĐT đề nghị** — input (`rf5-cell-edit`) hoặc giá trị tính; khi không nhập được hiện `<span class="muted">= MV (…)</span>`                                                                                     |
| `col-mv num`             | ô **MV ghi nhận** read-only; không có ref → `<span class="muted">— (không quy định)</span>`, hoặc `rf5-mv-stack` nhiều dòng phụ                                                                                   |
| `col-delta num`          | ô **Đối chiếu**: `rf5-chip-ok` (Khớp ✓) / `rf5-chip-warn` (Lệch ⚠ ±x) / `ok-tick` (✓ khi sameVal) / `<span class="muted">—</span>`                                                                               |
| `row-strong`             | dòng in đậm (Tiến độ sau ĐC, NET)                                                                                                                                                                                 |
| `row-muted`              | dòng mờ (giá trị tính, mv = `—`)                                                                                                                                                                                  |
| `row-warn`               | dòng cảnh báo                                                                                                                                                                                                     |

> Các nhóm Tiến độ / Truy hồi / Tổng-kết: ô **CĐT** chứa giá trị/ô nhập, ô **MV** thường `—` (muted),
> ô **Đối chiếu** là `ok-tick` (sameVal) hoặc `—`. Tức là **không** có "FieldRow 2 cột" — tất cả nằm trong lưới 4 cột.

### 3.0b Khác biệt FE so với mockup (cố ý — đừng flag lại)

- **Tiến độ (Phần 1 & Phần 4):** schema lưu `progress_from_pct` + `progress_to_pct` (KHÔNG có field delta).
  FE render 3 dòng kiểu mockup: **"trước đối chiếu"** = **read-only** hiển thị `from` (mặc định 0 ở đợt đầu —
  mockup không cho nhập); **"% đợt này"** = ô nhập **delta** (ghi `to = from + delta`, đồng thời materialise
  `from`→0 nếu null để công thức Δ tiến độ đúng); **"sau đối chiếu"** = read-only `to` (strong).
  Cột MV của 2 dòng **"trước/sau đối chiếu"** mirror đúng giá trị CĐT (không có ref độc lập) ⇒ Đối chiếu luôn
  ✓ (`ReconOkTick`, mockup `ok-tick`); riêng dòng **"% đợt này"** thì MV / Đối chiếu = `—`.
- **%HH & Tổng phí tăng thêm:** dùng `ReconPctAmountInline` — segmented toggle `[Số tiền (VND) | Tỷ lệ (%)]`
  - ô nhập trên **1 hàng ngang** (XOR `pct`/`amt`), thay popover `PctOrAmountEditableCell` cũ.
- **KHÔNG có dòng "Phí ĐL thực tế CĐT trả kỳ này" / "Phí tăng thêm thực tế kỳ này":** mockup không có
  (field `amt_payment_this_period` / `amt_extra_bonus_payment_this_period` vẫn trong schema nhưng FE không
  surface → gửi null; cảnh báo payment-variance vì vậy không kích hoạt).
- **Phần 3 KHÔNG có ô "Ghi chú thưởng" / "Ghi chú khấu trừ" inline** (mockup không có; breakdown ghi vào
  "Ghi chú căn"). `bonus_note` / `deduction_note` vẫn trong schema nhưng FE không nhập → gửi rỗng.
- **Phần 4 band màu vàng** (`YELLOW`) thay cho "irish/teal" của mockup — `ColoredValueVariant` không có
  token teal/cyan; vàng là màu trung tính còn trống (đỏ = danger, các màu khác đã dùng cho Phần 0–3 + Tổng kết).
- **Phần 4 — DualProgress:** 2 thanh **cạnh nhau** (base = xanh dương / extra = tím), mỗi thanh có pill
  `+Δ% đợt này` + dòng info "Hai luồng phí … riêng biệt …" (`ReconDualProgress`).
- **Phần 4 — "Tổng phí tăng thêm":** dùng `ReconPctAmountInline` (₫ trọn gói XOR % trên giá tính phí) + helper
  `= {amount} đ trên giá tính phí / trọn gói` + toggle VAT. ⚠ VAT ở đây ghi vào **cùng một** `vat_rate` cấp dòng
  với Phần 0 (schema chỉ có 1 `vat_rate`) — 2 toggle phản ánh chung 1 state. So khớp MV theo **số tiền**
  (`mv.amtInvestorBonus`); MV trống ⇒ `— (không quy định)` + chip `Lệch +{amount}`.
- **Tổng kết:** dùng nhãn theo field thật của FE (`Phải thu sau VAT`, `Thuế GTGT (x%)`, `Tỷ lệ chi trả`,
  `Đã nhận trước kỳ`) thay cho "Quy về chưa/có VAT" của mockup. Dòng "Điều chỉnh truy hồi" + "Phí tăng thêm
  đợt này" hiện khi giá trị ≠ 0 (KHÔNG gate theo part/toggle) để tổng line-item luôn khớp NET.

### 3.x Nội dung từng nhóm

Bên dưới mô tả từng dòng (nhãn `col-lbl` | ô nhập `col-cdt` | ref `col-mv` | chip `col-delta`):

### PHẦN 0 — Giá tính phí & Tỷ lệ HH (LUÔN hiển thị, mọi kỳ)

| Dòng                                            | CĐT đề nghị (input)                                                                                                                            | MV ghi nhận                                      | Đối chiếu (chip)                                                      | Ghi chú                         |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------- |
| **Giá tính phí (HĐMB)**                         | `MoneyVatNull` `new_basis` (placeholder = `mv.hdmb_price`, có nút clear, toggle VAT). Chỉ nhập được khi `p2` bật; `p2` tắt → hiện "= MV (giá)" | `mv.hdmb_price` (+ "Lần 1: …" nếu khác lịch sử)  | `deltaPriceChip()`: Khớp / Lệch ±(new_basis−hdmb) + "Khớp/Lệch lần 1" | hint đổi theo `p2`              |
| **% Hoa hồng (theo HĐPP)** / **Phí ĐL cố định** | `RateOrFlat` `new_pct` + toggle `%` ↔ `₫` (`new_pct_kind` pct/flat) + VAT. Chỉ khi `p2`                                                       | `mv.broker_pct`                                  | `deltaPctChip()`: Khớp HĐPP / Lệch HĐPP ±x% / "Dạng phí cố định"      | nhãn đổi theo `new_pct_kind`    |
| **Giá tính phí riêng (Sale/F2)**                | `MoneyVatNull` `sale_basis` (placeholder = `c.saleBasisSuggested ?? hdmb`)                                                                     | `c.saleBasisSuggested` hoặc "— (không quy định)" | "= HĐMB" hoặc "HH Sale/F2 ±x"                                         | **chỉ hiện khi `useSaleBasis`** |

### PHẦN 1 — Tiến độ thanh toán (`p1`)

| Dòng                              | CĐT đề nghị                                                    | MV           | Đối chiếu   |
| --------------------------------- | -------------------------------------------------------------- | ------------ | ----------- |
| Tiến độ đã đối chiếu các kỳ trước | `c.priorPct`                                                   | `c.priorPct` | ✓ (sameVal) |
| **% TT đợt này**                  | `NumV5` `new_pay_pct` (suffix %) — **bắt buộc > 0 khi p1 bật** | —            | —           |
| Tiến độ TT sau đối chiếu          | `c.postPct` (strong)                                           | `c.postPct`  | ✓           |

### PHẦN 2 — Điều chỉnh truy hồi (`p2`)

| Dòng                        | CĐT đề nghị           | MV  | Đối chiếu |
| --------------------------- | --------------------- | --- | --------- |
| Số tiền điều chỉnh truy hồi | `c.truyHoi` (đỏ/xanh) | —   | —         |

hint: `= (Tổng phí ĐL mới − Tổng phí ĐL cũ) × {priorPct}% (tỉ lệ đã đối chiếu). Áp khi đổi giá hoặc đổi % HH.`

### PHẦN 3 — Thưởng / Khấu trừ (`p3`)

| Dòng                           | CĐT đề nghị (input)                                                                                                                                              | MV ghi nhận                                                                                        | Đối chiếu      | Điều kiện                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | -------------- | ------------------------ |
| **Thưởng nhận về**             | `MoneyVat` `bonus` + VAT                                                                                                                                         | `mv.bonus_agreed` (+ "chia Sale `bonus_to_sale_agreed`", "MVL chịu", "Đã đối chiếu `prior_bonus`") | —              | luôn (khi p3)            |
| · Trong đó chia cho Sale       | số ₫ `bonus_to_sale` (max = bonus) + hint "còn lại … cho đại lý"                                                                                                 | `mv.bonus_to_sale_agreed`                                                                          | Khớp / Lệch ±x | **chỉ khi `bonus > 0`**  |
| **Giảm trừ khác**              | `MoneyVat` `deduct` + VAT                                                                                                                                        | `mv.deduct_agreed`, "Đã đối chiếu `prior_deduct`"                                                  | —              | luôn (khi p3)            |
| · Trong đó Sale / F2 phải chịu | số ₫ `deduct_to_sale` (max = deduct, Zod chặn vượt) + sub "để trống hoặc 0 = không trừ vào lương Sale" + hint "Đã trừ từ HH Sale/F2 lũy kế các kỳ đã duyệt: Y đ" | —                                                                                                  | —              | **chỉ khi `deduct > 0`** |

> Dòng "Giảm trừ khác" cũng mang hint lũy kế "Đã giảm trừ lũy kế các kỳ đã duyệt: X đ" (prop `priorDeduction`
> — pre-VAT, confirmed-only, khớp `prior_fee_deduction_*` BE; nguồn `useReconPriorDeduction` server-first,
> fallback lịch sử). Lưu căn có `deduct > 0` phải qua dialog "Xác nhận giảm trừ kỳ này" (local AppDialog,
> `useReconDeductionConfirm`).
> `bonus_to_sale` = **BE GAP** (chưa có trong schema). `deduct_to_sale` = `fee_deduction_to_sale_amount`
> (đã có; BE validate `∈ [0, fee_deduction]`, FE Zod mirror). Pass-through 100% xuống cấu hình lương sale.

### PHẦN 4 — Phí tăng thêm (tiến độ độc lập) — `p4` (optional)

| Dòng                                                                                                     | CĐT đề nghị                                                               | MV                                              | Đối chiếu                       |
| -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------- | --- |
| (DualProgress) 2 thanh: "Phí base" (`priorPct→postPct`) + "Phí tăng thêm" (`priorExtraPct→postExtraPct`) | colSpan 4                                                                 |                                                 |                                 |
| **Tổng phí tăng thêm (thỏa thuận)**                                                                      | `ExtraTotalV6` `extra_total` + toggle `%`↔`₫` (`extra_total_kind`) + VAT | `c.extraAgreed`, "Đã đối chiếu `priorExtraFee`" | Khớp / Lệch                     |     |
| Tiến độ tăng thêm trước ĐC                                                                               | `c.priorExtraPct`                                                         | `c.priorExtraPct`                               | ✓                               |
| **% tăng thêm đợt này**                                                                                  | `NumV5` `extra_pay_pct` (độc lập với % TT base)                           | —                                               | —                               |
| Tiến độ tăng thêm sau ĐC                                                                                 | `c.postExtraPct` (strong)                                                 | `c.postExtraPct`                                | ✓                               |
| Số tiền điều chỉnh truy hồi (tăng thêm)                                                                  | `c.extraTruyHoi`                                                          | —                                               | — (chỉ khi `priorExtraPct > 0`) |

### Nhóm "Số tiền đối chiếu kỳ này" (Tổng kết — màu purple, LUÔN ở cuối)

Các dòng (chỉ hiện khi điều kiện đúng):

| Dòng                             | Điều kiện                                  | Giá trị                  | hint                                                           |
| -------------------------------- | ------------------------------------------ | ------------------------ | -------------------------------------------------------------- |
| Hoa hồng đợt này (phí đại lý)    | `p1`                                       | `c.brokerThis` (sameVal) | `= Giá tính phí × %HH × %TT đợt` (hoặc `Phí ĐL cố định × %TT`) |
| · HH Sale/F2 đợt này (giá riêng) | `p1 && useSaleBasis && saleBasis≠newBasis` | `c.saleBrokerThis`       | tính trên giá riêng                                            |
| Phí tăng thêm đợt này            | `p4 && extraThis≠0`                        | `+c.extraThis`           | `= Tổng phí tăng thêm × %tăng thêm đợt`                        |
| Truy hồi phí tăng thêm           | `p4 && extraTruyHoi≠0`                     | `c.extraTruyHoi`         |                                                                |
| Điều chỉnh truy hồi              | `p2 && truyHoi≠0`                          | `c.truyHoi`              |                                                                |
| Thưởng kỳ này                    | `p3 && bonus>0`                            | `+bonus`                 | "Đại lý: … · Sale: …" nếu có chia                              |
| Khấu trừ kỳ này                  | `p3 && deduct>0`                           | `−deduct`                | "Đại lý: … · Sale: …" nếu có chia                              |
| **= TIỀN NHẬN KỲ NÀY (NET)**     | luôn (strong)                              | `c.net` (đỏ/xanh)        |                                                                |
| · Quy về chưa VAT                | luôn                                       | `c.netChua`              |                                                                |
| · Quy về có VAT (gồm 10%)        | luôn                                       | `c.netCo`                |                                                                |

---

## 4. Lịch sử đối chiếu (ReconHistory — đầu body khi mở rộng)

- Nếu `mv.prior_rounds` rỗng → "Lần đối chiếu đầu tiên cho căn này — chưa có lịch sử."
- Có lịch sử → header collapsible: `{n} lần · Đã ĐC {prior_pay_pct} · {Σ fee+truy_hoi+bonus} ₫`.
- Bảng cột: **Lần · Ngày·Mã ĐC · Loại kỳ · Giá tính phí · %HH · %TT đợt · Phí ĐL · Truy hồi · Thưởng · Ghi chú**.
  - Dòng chênh giá/`%` so với lần trước hiện mũi tên ↑/↓.
  - Dòng cuối "Lần này" (#n+1, "Đang lập") = đợt đang nhập (ẩn nếu kỳ hủy cọc).
- API thực tế: `/api/realestate/product-inventories/{id}/investor-reconciliation-history`.
  "Lũy kế đã/sẽ ĐC (gồm kỳ này)" = Σ `total_amount` của history items + kỳ này.

---

## 5. Settlement check (mockup `SettlementCheck5`) — hiện cho MỌI căn (≠ mockup), ẩn ở hủy cọc

> ⚠ **USER ĐÃ CHỐT (2026-06-03):** mockup gốc chỉ hiện ở `postPct ≥ 100`; FE đổi sang **hiện cho mọi căn**,
> panel tự đổi trạng thái theo tiến độ — 4 state: `progress` (<100%, tone xanh dương, thu gọn, Σ chip
> "Còn X% tiến độ", cột verdict "Còn …" trung tính), `ready` (=100% & khớp, xanh lá, thu gọn), `shortfall`
> (=100% & thiếu, đỏ, mở sẵn), `over` (=100% & dư, vàng). Vẫn ẩn ở kỳ hủy cọc.

Panel collapsible 4 cột: **Khoản mục | Lũy kế đã/sẽ ĐC | MV dự kiến nhận | Thiếu/Đủ** + dòng **∑ TỔNG**.
`diff = totalActual − totalExpected`, tolerance **1.000 ₫**. **Khớp / đang đối chiếu → thu gọn**, header 1 dòng
("Khớp … sẵn sàng tất toán" / "Chưa đến đợt tất toán · còn X%"); **=100% mà lệch → mở sẵn**, Σ chip
"Chưa đủ — thiếu …" / "Dư …", + note "tất toán = đóng
case, cần CĐT thanh toán đủ hoặc waiver bằng văn bản".

Công thức `deriveV5` (bóc tách từ mockup):

```
expectedTotalBase = isFlat ? usedPct : round(newBasis × usedPct/100)   // phí ĐL đầy đủ ở %HH của dòng
expectedBonus     = mv.bonus_agreed
expectedDeduct    = mv.deduct_agreed
cumulativeFee     = mv.prior_fee   + brokerThis + truyHoi
cumulativeBonus   = mv.prior_bonus + bonusAmt
cumulativeDeduct  = mv.prior_deduct + deductAmt
totalExpected = expectedTotalBase + expectedBonus − expectedDeduct + (hasExtra ? extraTotal     : 0)
totalActual   = cumulativeFee     + cumulativeBonus − cumulativeDeduct + (hasExtra ? cumulativeExtra : 0)
```

| Khoản                                | MV dự kiến (`expected`) | Lũy kế (`actual`)    |
| ------------------------------------ | ----------------------- | -------------------- | --------------------------- |
| Phí đại lý (base × %HH × 100%)       | `c.expectedTotalBase`   | `c.cumulativeFee`    |
| Phí tăng thêm (tiến độ riêng × 100%) | `c.extraTotal`          | `c.cumulativeExtra`  | (chỉ khi p4 & extraTotal>0) |
| Thưởng cam kết HĐPP                  | `c.expectedBonus`       | `c.cumulativeBonus`  |
| Khấu trừ cam kết (trừ vào Σ)         | `c.expectedDeduct`      | `c.cumulativeDeduct` |

> ✅ **FE đã wire lũy kế thật từ endpoint lịch sử** (`useProductInventoryInvestorReconciliationHistory`):
> Thưởng lũy kế = Σ `history.supplementary_amount` + kỳ này; Khấu trừ lũy kế = Σ `history.fee_deduction`
>
> - kỳ này (2 field này CÓ trên `InvestorReconciliationHistory` serializer). MV dự kiến: phí ĐL = cấu
>   hình HĐPP (`current_commission` agency fee); thưởng cam kết = `current_commission.investor_bonus`.
>
> ✅ **`prior_*` giảm trừ đã ship (BE branch 2026-07-28, chưa deploy):** envelope commission-config +
> line serializer trả `prior_fee_deduction_total` / `prior_fee_deduction_to_sale_total` (PRE-VAT,
> CONFIRMED non-voided) — FE đọc qua `useReconPriorDeduction` (narrow cast, TODO remove sau regen;
> fallback = 2 field lũy kế mới của `summarizeReconHistory`).
>
> 🔴 **BE-GAP còn lại:** (1) phí ĐL lũy kế dùng "đầy đủ ở 100%" thay vì Σ `period_commission` từng đợt —
> history chưa expose `period_commission`/`progress_*`/`retroactive_adjustment_amount`; (2) `deduct_agreed`
> (khấu trừ CAM KẾT/chốt như một committed figure riêng) vẫn chưa có — FE tạm dùng
> `deal.total_fee_deduction` (`ReconMvReference.deductAgreed`, narrow cast, null ⇒ expected = 0 như cũ)
> cho `expectedDeduct` của `deriveV5`; swap sang field cam kết thật khi BE chốt.

---

## 6. Net âm (NegHandling — chỉ khi `net < 0`, ẩn ở hủy cọc)

Radio bắt buộc chọn 1 (D7):

- **HOÀN TIỀN ngay** (`refund`): MVL sinh giao dịch hoàn về CĐT kỳ này.
- **BÙ TRỪ KỲ SAU** (`carryover`): số âm trừ vào đợt kế (không phát sinh dòng tiền kỳ này). _(default)_

> `neg_handling` = **BE GAP** (chưa có trong schema). Mockup id: `refund` | `carryover`
> (lưu ý: SRS/plan đôi chỗ gọi `offset_next` — thống nhất khi BE chốt).

---

## 7. Ghi chú căn (cuối body)

Textarea `note` — placeholder "Breakdown thưởng / lý do khấu trừ / lý do đổi giá / ghi chú chung…".
**Kỳ hủy cọc: bắt buộc** (lý do hủy ghi vào đây).

---

## 8. Ma trận theo từng loại kỳ

> Part visibility theo **mockup gốc** (xem cảnh báo mục 0). Toggle `p4`/`useSaleBasis` đều áp dụng được
> cho mọi kỳ non-cancel; mặc định TẮT.

| Loại kỳ                                                    | defaultPhan            | Phần hiển thị (mặc định) | Trọng tâm thu gọn      | Quy tắc đặc biệt                                                                                                                                    |
| ---------------------------------------------------------- | ---------------------- | ------------------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Kỳ thanh toán thường** (`normal_payment`)                | p1,p2,p3               | 0 + 1 + 2 + 3            | % TT, Phí ĐL           | D9 info nếu có nhập ĐC/thưởng → gợi ý đổi kỳ                                                                                                        |
| **Kỳ tiến độ kèm điều chỉnh** (`progress_with_adjustment`) | p1,p2,p3               | 0 + 1 + 2 + 3            | % TT, Phí ĐL, Truy hồi | kỳ "đủ" nhất — tăng tiến độ + đổi giá/%                                                                                                             |
| **Kỳ điều chỉnh thuần** (`adjustment_only`)                | p1,p2,p3               | 0 + 1 + 2 + 3            | Truy hồi               | **D1**: cấm ở đợt đầu (chưa có đợt trước để truy hồi). D9 nếu `%TT đợt>0` → gợi ý `progress`                                                        |
| **Kỳ thưởng / khấu trừ** (`bonus_deduction`)               | p1,p2,p3               | 0 + 1 + 2 + 3            | Thưởng / Khấu trừ      | trọng tâm Phần 3                                                                                                                                    |
| **Kỳ hủy cọc** (`cancellation`)                            | p1:false, p2:false, p3 | **0 + 3 only**           | Khấu trừ               | **note bắt buộc**; ẩn 2 toggle "Tùy chọn"; ẩn NegHandling & Settlement; D12 cấm nếu căn đã đóng case; số phải hoàn → Khấu trừ, CĐT bù thêm → Thưởng |

---

## 9. Validations (D1–D19) — lint theo mockup

| Mã            | Severity | Điều kiện                                                    | Message                                            |
| ------------- | -------- | ------------------------------------------------------------ | -------------------------------------------------- |
| (no unit)     | err      | `!unit`                                                      | thiếu mã căn / dữ liệu MV                          |
| **D1**        | err      | `adjust` & `priorPct===0`                                    | Đợt đầu không thể là Kỳ điều chỉnh thuần           |
| **D7**        | err      | `net<0` & !cancel & `!neg_handling`                          | Tiền nhận âm — phải chọn HOÀN TIỀN / BÙ TRỪ KỲ SAU |
| **D9**        | info     | `normal` có nhập ĐC/thưởng/khấu trừ                          | cân nhắc đổi loại kỳ cho khớp                      |
| **D9**        | info     | `adjust` & `new_pay_pct>0`                                   | cân nhắc đổi sang Kỳ tiến độ kèm điều chỉnh        |
| **D12**       | err      | `cancel` & căn đã đóng case                                  | Căn đã đóng case — không thể hủy cọc               |
| (vượt %)      | err      | `p1` & `new_pay_pct > 100−priorPct`                          | Vượt phần còn lại — chỉ còn x%                     |
| (tiến độ 0)   | info     | (normal/progress) & `new_pay_pct≤0`                          | loại kỳ này thường có tiến độ > 0                  |
| (thưởng note) | info     | `p3` & `bonus>0` & chưa ghi chú                              | nên ghi chú breakdown thưởng                       |
| (hủy note)    | err      | `cancel` & `!note`                                           | Lý do hủy là bắt buộc                              |
| **D15**       | warn     | có lịch sử & `p2` & `new_basis ≠ firstRoundPrice`            | Giá tính phí lệch lần 1 — cần ghi lý do            |
| **D16**       | warn     | `p2` & `new_pct(pct) ≠ broker_pct`                           | %HH lệch HĐPP MV — cần xác nhận điều khoản         |
| **D18**       | err      | `postPct≥100` & !cancel & phí base lũy kế < kỳ vọng (tol 1k) | Tất toán nhưng phí base còn thiếu x ₫              |
| **D19**       | warn     | `postPct≥100` & thưởng cam kết chưa thu đủ                   | Tất toán nhưng thưởng HĐPP còn thiếu x ₫           |
| (p4 trống)    | warn     | `p4` & `extraTotal≤0`                                        | Bật Phí tăng thêm nhưng chưa có tổng               |
| (p4 vượt)     | err      | `p4` & `extra_pay_pct > 100−priorExtraPct`                   | vượt phần còn lại                                  |
| (Sale basis)  | info     | `useSaleBasis` & `sale_basis==null`                          | đã bật giá riêng nhưng chưa nhập                   |

---

## 10. Data model — field của 1 line (`newLineV5`) ↔ schema

| Field mockup                                     | Mặc định          | Ý nghĩa                | Schema (`InvestorReconciliation*`)                       |
| ------------------------------------------------ | ----------------- | ---------------------- | -------------------------------------------------------- |
| `unit`                                           | ""                | mã căn (chọn qua deal) | `product_inventory_id`                                   |
| `kind`                                           | "normal"          | loại kỳ                | `period_type`                                            |
| `phan {p1,p2,p3,p4}`                             | theo kỳ; p4=false | part visibility        | FE-only (suy ra/điều khiển render)                       |
| `is_final`                                       | false             | kỳ tất toán            | (suy ra từ `postPct≥100`)                                |
| `new_pay_pct`                                    | 0                 | % TT đợt này (delta)   | `progress_to_pct − progress_from_pct`                    |
| `new_basis` / `new_basis_vat`                    | null/false        | giá tính phí mới       | `fee_calculation_price` / VAT                            |
| `new_pct` / `new_pct_kind` / `new_pct_vat`       | null/"pct"/false  | %HH hoặc phí cố định   | `pct_agency_fee` XOR `amt_agency_fee`                    |
| `extra_total` / `extra_total_kind`               | null/"flat"       | tổng phí tăng thêm     | `extra_bonus_amount` XOR `extra_bonus_pct`               |
| `extra_pay_pct` / `extra_vat`                    | 0/false           | % tăng thêm đợt        | `extra_bonus_progress_from/to_pct`                       |
| `useSaleBasis` / `sale_basis` / `sale_basis_vat` | false/null/false  | giá riêng Sale/F2      | `commission_fee_calculation_price` (A')                  |
| `bonus` / `bonus_vat` / `bonus_note`             | 0/false/""        | thưởng nhận về         | `supplementary_amount` / `bonus_note`                    |
| `bonus_to_sale`                                  | 0                 | thưởng chia thẳng Sale | **BE GAP**                                               |
| `deduct` / `deduct_vat` / `deduct_note`          | 0/false/""        | khấu trừ               | `fee_deduction` / `deduction_note`                       |
| `deduct_to_sale`                                 | 0                 | khấu trừ từ lương Sale | **BE GAP**                                               |
| `cancel_reason` / `mvl_keep`                     | ""/0              | hủy cọc                | `cancellation_reason` / `amount_retained`                |
| `neg_handling`                                   | "carryover"       | xử lý net âm           | **BE GAP** (`refund`/`carryover`)                        |
| `verified`                                       | false             | đã xác nhận hợp lệ     | **FE-only** review marker                                |
| `collapsed`                                      | false             | thu gọn UI             | **FE-only**                                              |
| `case_closed`                                    | false             | đóng case              | (suy ra)                                                 |
| (thực trả CĐT kỳ này)                            | —                 | phí ĐL CĐT trả thực tế | `amt_payment_this_period` (nullable → fallback computed) |

### MV reference (read-only "MV ghi nhận") — `mv.*`

`hd06`, `customer`, `hdmb_price` (→ `listed_price`), `broker_pct`, `prior_pay_pct`, `prior_fee`,
`prior_bonus`, `prior_deduct`, `bonus_agreed`, `deduct_agreed`, `bonus_to_sale_agreed`,
`extra_agreed`, `prior_extra_pct`, `prior_extra_fee`, `sale_basis_suggested`, `prior_rounds[]`.

### Computed (`deriveV5` → `c.*`)

`priorPct, postPct, newBasis, usedPct, isFlat, brokerThis, truyHoi, bonusAmt, deductAmt,`
`net, netChua, netCo, extraTotal, priorExtraPct, postExtraPct, extraThis, extraTruyHoi,`
`cumulativeExtra, saleBasis, saleBrokerThis, firstRoundPrice, expectedTotalBase, expectedBonus,`
`expectedDeduct, cumulativeFee, cumulativeBonus, cumulativeDeduct`.

Công thức chính:

- `postPct = min(100, priorPct + new_pay_pct)`
- `brokerThis = isFlat ? round(usedPct × new_pay_pct/100) : round(newBasis × usedPct/100 × new_pay_pct/100)`
- `truyHoi = priorPct>0 ? round((newTotal − oldTotal) × priorPct/100) : 0`
- `extraThis = round(extraTotal × extra_pay_pct/100)`
- `net = brokerThis + truyHoi + bonus − deduct + extraThis + extraTruyHoi`
- VAT: `netChua`/`netCo` = quy đổi từng khoản theo cờ VAT (gồm 10%).

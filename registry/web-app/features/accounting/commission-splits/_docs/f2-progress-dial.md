# Dial "% TT phí F2" trên màn chia thực nhận (split-sheets)

**Ngày**: 2026-07-11 · **Nhánh web**: feat/worksheet-f2-progress-dial · **BE**: feat/worksheet-f2-progress-dial

## Nghiệp vụ

Mục 3 "% THANH TOÁN KỲ NÀY" tách 4 dial thay vì 2:

- **Phí** (`fee_pct`, xanh lá) — sale + CTV + hoa hồng quản lý (giữ nguyên).
- **Phí F2** (`f2_pct`, xanh dương) — chỉ F2 commission. Trần thu = đối chiếu base
  × tỷ lệ tiền về (chung `fee_collected_cap_pct` với phí), trừ F2 đã chi kỳ trước
  (`f2_paid_prior_pct`). Prefill = `f2_default_pct` từ detail; BE: bỏ trống `f2_pct`
  = giữ nguyên F2, nên FE luôn gửi `f2_pct` khi lưu để chốt đúng giá trị gợi ý.
- **Thưởng** (`bonus_pct`, cam) — thưởng sale (investor/MV bonus to sale).
- **Thưởng F2** (`bonus_f2_pct`, tím) — chỉ `pct_f2_bonus`, tách khỏi thưởng sale.
  Trần dùng chung dial thưởng kỳ `bonus_dial_this_period_pct` (shared_bonus_to_sale_pct)
  với thưởng sale — sau fix dev đã bỏ trừ prior/`bonus_collected_cap_pct` để tránh đúp.
  `bonus_f2_paid_prior_pct` chỉ dùng cho hint "đã chi thưởng F2 kỳ trước".
  Bỏ trống = catch-up theo tiền về (giống thưởng sale), FE chỉ gửi khi kế toán chỉnh.

Dial F2 (phí) hiện khi deal có position `pct_f2_commission`/`amt_f2_commission` (`hasF2`);
dial Thưởng F2 hiện khi có `pct_f2_bonus`/`amt_f2_bonus` (`hasF2Bonus`).

## Đã sửa

- `PaymentProgressTimeline.tsx` — thêm props `localF2Pct/setLocalF2Pct/maxF2Pct/hasF2`,
  `DialCaps.f2Prior/f2Max`, `Allocation.f2_progress_pct`; hàng slider "Phí F2"; F2 %
  trên tóm tắt kỳ; `f2_pct` trong payload `set-period-progress`; dialChanged theo F2.
- `CommissionSplitDetailInfo.tsx` — state `localF2Pct`, `hasF2`, prefill (pinned →
  `f2_default_pct`), `dialCaps.f2Prior/f2Max`, `maxF2Pct`, `f2_progress_pct` trong
  `sortedAllocations`, truyền props.

## CỔNG: regen schema (BẮT BUỘC trước khi build)

Các field mới (`f2_pct`, `bonus_f2_pct`, `f2_default_pct`, `f2_paid_prior_pct`,
`f2_progress_pct`, `bonus_f2_progress_pct`, `bonus_f2_paid_prior_pct`) đến từ
`@/api/schema`. TS lỗi cho tới khi regen. Chạy khi BE `feat/worksheet-f2-progress-dial`
đang lên `:8000`:

```
# web/
yarn api:update:local   # openapi từ 127.0.0.1:8000/schema/ + prettier + type-check
```

KHÔNG hand-edit `src/api/schema.ts`, KHÔNG cast để lách type.

## Bổ sung 2026-07-29 — `fee_default_pct` là money-based

Dial "% TT phí" (Mục 3) prefill từ `fee_default_pct` của BE = `Σ distribution_pct`, tức
**tiền thật đã về / `fee_base_net`** — KHÔNG phải lũy kế `% TT phí` ở Mục 2, vốn tính theo
**span tiến độ** kế toán CĐT gõ tay. Hai con số lệch nhau là **bình thường** khi căn còn hóa
đơn treo bị lệch đơn giá (đổi giá giữa chừng): deal `HD06-2026-000004` — Mục 2 hiện 70,00%,
dial hiện 69,22%, chênh đúng phần xuất thừa của hóa đơn còn DRAFT chưa thu, tự tiêu khi thu đủ.

Đừng "sửa" cho hai số bằng nhau. Chi tiết + bằng chứng số: `docs/ai/domain/accounting-vouchers-commissions.md`
và plan BE `plan_recon_progress_retro_gaps_20260729.md`.

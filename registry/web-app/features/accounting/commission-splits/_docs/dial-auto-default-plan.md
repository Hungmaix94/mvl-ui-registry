# Plan web: dial auto-default + giải trình lệch tiến độ + badge cần tính lại

**Ngày**: 2026-07-27 · **Trạng thái**: **ĐÃ IMPLEMENT 2026-07-28** (nhánh `feature/dial-auto-default`) · **BE**: [MVL-ERP-3/backend#2812](https://github.com/MVL-ERP-3/backend/pull/2812)
**Base verify (khi implement)**: web `origin/dev` @ `16d907bf7` (sau #896 + #898) · backend nhánh `feature/dial-auto-default-recognition`

> ✅ **Đã implement 2026-07-28** cùng cặp với BE PR #2812 (BE chưa deploy nên field mới augment thủ công `TODO(schema)` trong `commission-splits-service.ts` + `accounting-period-service.ts` — theo tiền lệ "endpoint chưa deploy → typed extension, KHÔNG regen schema từ BE local"; chạy `yarn api:update:local` gộp lại sau khi BE lên môi trường). Những gì đã vào code:
>
> - Prefill dial phí = `fee_progress_pct ?? fee_default_pct ?? 0` — **bỏ fallback 3 tầng** (§3.1). Đối chiếu staging trước/sau cho worksheet đang chạy tầng-3 vẫn là checklist khi deploy (số hiển thị sẽ đổi, không phải no-op).
> - Ô giải trình + gửi `note` ở **cả 2 call site**; helper `dialDeviates2dp` (2dp, khớp BE); chặn client-side + BE 400 (§3.2).
> - Cột chip + filter `dial_deviates` trên list 20.8 (§3.3); cột "% Thanh toán" thống nhất 2dp.
> - Badge "Cần tính lại" (`RevenueRecomputeBadge`) đọc `AccountingPeriod.revenue_recompute_needed`, gắn ở `DepartmentMonthlyKpiTable` (§3.4).
> - Workaround "luôn gửi `f2_pct`" GIỮ NGUYÊN (BE auto-pin là lưới đỡ thứ hai, không phải lý do xoá — xoá chỉ sau khi verify trên staging).
> - Test: `dial-auto-default.test.tsx`; docs: SRS 20.8 fsd changelog + `docs/ai/domain/accounting-vouchers-commissions.md`.

## 1. Nghiệp vụ

Quy tắc đang áp dụng: **kế toán duyệt chi bao nhiêu thì ghi nhận doanh thu và hoa hồng bấy nhiêu** — mọi phòng ban khớp trên cùng một con số. Từ backend#2742 (24/07), doanh thu ghi nhận + KPI phòng/NV + pool HHQL phòng + SLK đều đi theo `worksheet.fee_progress_pct`.

Ba thay đổi phía web:

1. **Dial hiển thị = số sẽ được ghi nhận.** Hiện FE tự suy fallback 3 tầng, BE không lưu ⇒ kế toán thấy 55%, bấm Duyệt mà không bấm Lưu ⇒ BE vẫn NULL ⇒ doanh thu 0. Sau khi BE có `fee_default_pct` + auto-pin lúc duyệt, FE **bỏ tự suy**, đọc thẳng từ payload.
2. **Ô giải trình bắt buộc** khi kế toán hạ dial khác tỷ lệ tiền về (BE reject 400 nếu thiếu).
3. **Badge "cần tính lại"** trên màn doanh thu/KPI khi kỳ dirty — vì doanh thu là output đã persist, đổi dial không tự cập nhật.

## 2. Hiện trạng web đã verify

| Sự việc                                                                             | Vị trí                                                                                                   |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Fallback 3 tầng tự suy dial phí                                                     | `CommissionSplitDetailInfo.tsx:245-259`                                                                  |
| — tầng 1 `fee_progress_pct` (đã ghim)                                               | `:252`                                                                                                   |
| — tầng 2 `periodCollection.get(...).fee` ← **tầng thực chạy cho hầu hết worksheet** | `:255`                                                                                                   |
| — tầng 3 `total_distribution_pct`                                                   | `:257`                                                                                                   |
| Prefill F2 đã dùng đúng pattern mong muốn (`f2_default_pct` từ payload)             | `_docs/f2-progress-dial.md`                                                                              |
| Ô nhập dial + nút Lưu                                                               | `PaymentProgressTimeline.tsx:107` `DialRow`, save `:396`                                                 |
| Gọi lưu dial (đường thứ 2)                                                          | `CommissionSplitDetailInfo.tsx:820`                                                                      |
| Filter danh sách worksheet (pattern `Select`)                                       | `CommissionSplitFilter.tsx:47-56`                                                                        |
| Bảng danh sách worksheet                                                            | `CommissionSplitTable.tsx`                                                                               |
| Màn KPI/doanh thu (nơi đặt badge)                                                   | `commissions/components/CommKPI*.tsx`, `department-monthly-kpi/components/DepartmentMonthlyKpiTable.tsx` |

**Ghi chú quan trọng từ `_docs/f2-progress-dial.md`:** hiện FE **luôn gửi `f2_pct` khi lưu** để chốt đúng giá trị gợi ý, vì "bỏ trống = BE giữ nguyên". Đây chính là cách lách tạm cho đúng bệnh ta đang chữa. Sau khi BE auto-pin lúc duyệt, cần rà lại xem workaround này còn cần thiết không — **không xoá trước khi verify**, vì nó đang giữ cho dial F2 không bị bỏ trống.

## 3. Thay đổi dự kiến

### 3.1 Bỏ fallback 3 tầng (`CommissionSplitDetailInfo.tsx:245-259`)

```
localFeePct = currentWorksheet?.fee_progress_pct ?? currentWorksheet?.fee_default_pct ?? 0
```

`fee_default_pct` do BE tính (đã clamp vào trần thu tiền) ⇒ **một nguồn duy nhất**. Còn giữ fallback FE là còn hai nguồn ⇒ sớm muộn lại lệch, đúng bệnh đang chữa.

⚠️ BE default = `min(Σ distribution_pct, headroom trần)`. Tầng 2 hiện tại (`fee_collection_pct`) **cùng thang với vế trần**, tầng 3 (`total_distribution_pct`) thì không. Nên với worksheet đang chạy tầng 3, con số hiển thị **sẽ đổi** sau khi bỏ fallback. Cần đối chiếu vài worksheet thật trên staging trước/sau, không giả định là no-op.

Làm tương tự cho 3 dial còn lại nếu BE trả đủ 4 `*_default_pct` — plan BE hiện chỉ chốt `fee_default_pct`; **cần xác nhận** trước khi làm.

### 3.2 Ô giải trình khi lệch

- Hiện ô note (textarea) trong khu dial ở `PaymentProgressTimeline.tsx` khi `localFeePct !== fee_collected_pct_snapshot` (hoặc cờ `dial_deviates` BE trả)
- Gửi `note` trong payload `set-period-progress` ở **cả hai** call site (`PaymentProgressTimeline.tsx:396` và `CommissionSplitDetailInfo.tsx:820`) — thiếu một chỗ là 400 lẻ
- BE reject 400 khi lệch mà note rỗng ⇒ chặn client-side trước để không phải nếm lỗi server; vẫn phải `extractErrorMessage` cho ca race
- Hiện lại note đã lưu (read-only) cho worksheet đã duyệt

### 3.3 Cột + filter "duyệt lệch tiền về"

- `CommissionSplitTable.tsx` — thêm cột hiện `dial_deviates` (chip), tooltip nêu số lệch + note
- `CommissionSplitFilter.tsx` — thêm `Select` theo pattern `:47-56`: Tất cả / Duyệt lệch / Duyệt đúng tiền về
- Ngữ nghĩa cần ghi rõ trên UI: **"đúng tiền về" gộp cả "chưa ghim gì"** (BE: `dial IS NULL`). Muốn tách phải kết hợp `worksheet_status` — nếu kế toán cần phân biệt thì phải nêu với BE, đừng tự suy ở FE

### 3.4 Badge "cần tính lại"

Trên `CommKPI*` + `DepartmentMonthlyKpiTable` khi kỳ dirty. **Cần BE chốt** shape của cờ dirty (plan BE ghi `AccountingPeriod` là ứng viên, chưa xác nhận) — chưa có API thì chưa làm được.

Badge là bắt buộc, không phải nice-to-have: recompute chạy async (~15s cả kỳ), nếu job trễ mà UI hiện số cũ như số đúng thì ta lặp lại đúng bệnh "hiển thị khác tính" ở tầng khác.

## 4. CỔNG: regen schema (BẮT BUỘC trước khi build)

Mọi field mới đến từ `@/api/schema`. TS sẽ lỗi cho tới khi regen. Chạy khi BE nhánh tương ứng đang lên `:8000`:

```bash
yarn api:update:local
```

**Không** `as unknown as` để lách type thiếu, và **không** khai tay vào `commission-splits-service.ts`. Hiện file này đã có 4 field `TODO(schema)` chờ regen (`:87-94`) — đợt này nên dọn luôn.

## 5. Thứ tự

| #   | Việc                                                                             | Phụ thuộc              |
| --- | -------------------------------------------------------------------------------- | ---------------------- |
| 1   | BE#2785 được duyệt + implement + **merge**                                       | —                      |
| 2   | `yarn api:update:local`, dọn `TODO(schema)` trong `commission-splits-service.ts` | 1                      |
| 3   | Bỏ fallback 3 tầng (§3.1) + đối chiếu số trước/sau trên staging                  | 2                      |
| 4   | Ô note + gửi `note` ở cả 2 call site (§3.2)                                      | 2                      |
| 5   | Cột + filter lệch (§3.3)                                                         | 2                      |
| 6   | Badge dirty (§3.4)                                                               | BE chốt shape cờ dirty |
| 7   | E2E: duyệt-không-sửa-tay / sửa-tay-thiếu-note / sửa-tay-có-note                  | 3-5                    |

## 6. Rủi ro

| Rủi ro                                                        | Xử lý                                                                               |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Bỏ fallback làm đổi số đang hiện của worksheet chạy tầng 3    | §3.1 — đối chiếu staging trước/sau, không giả định no-op                            |
| Gửi `note` thiếu một call site ⇒ 400 lẻ khó tái hiện          | Sửa cả `PaymentProgressTimeline.tsx:396` **và** `CommissionSplitDetailInfo.tsx:820` |
| Xoá workaround "luôn gửi `f2_pct`" quá sớm ⇒ dial F2 bỏ trống | Chỉ xoá sau khi verify BE auto-pin phủ cả F2                                        |
| Deploy web trước BE ⇒ payload thiếu field                     | `cross-repo-be-web.md`: BE trước, luôn                                              |

## 7. Liên quan

- `_docs/f2-progress-dial.md` — tiền lệ dial + pattern `*_default_pct`
- backend `docs/plans/plan_dial_auto_default_recognition_20260727.md` (PR #2785)
- backend `docs/plans/plan_hhql_revenue_fee_progress_dial_20260724.md` (PR #2742 — nền quyết định)
- web#866 — sửa nhãn "Kỳ này chưa chia hết" ở cùng dải Mục 4

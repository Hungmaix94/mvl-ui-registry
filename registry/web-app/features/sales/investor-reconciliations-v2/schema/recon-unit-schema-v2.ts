import { z } from 'zod'

import {
  investorReconSheetObject,
  reconItemBaseSchema,
  refineInvestorReconItem,
  refineInvestorReconSheet,
} from '@/features/sales/_shared/reconciliation/recon-sheet-schema'

/**
 * Schema cho dialog "Thêm/Sửa căn" của Đối chiếu chủ đầu tư 2.0.
 *
 * GIỐNG HỆT schema dùng chung của v1 — tái dùng NGUYÊN `refineInvestorReconItem` +
 * `refineInvestorReconSheet` + object meta (không nhân bản rule) — CHỈ khác một điểm: **bỏ ràng buộc
 * `max(100)` trên `progress_from_pct`/`progress_to_pct`**.
 *
 * Vì sao chỉ sửa ở v2: `progress_from/to_pct` là field BE tính, readonly, KHÔNG gửi lên; tiến độ lũy kế
 * hoàn toàn có thể >100% (kỳ đối chiếu về sau, ví dụ 20% → 120%). `reconItemBaseSchema` (dùng chung với
 * v1/F2/CTV) áp `pctRange().max(100)` lên 2 field này ⇒ khi sửa một căn có `progress_to_pct > 100`
 * (dữ liệu hợp lệ), Zod fail ở path readonly → `onValid` không chạy → submit bị chặn ÂM THẦM (field
 * readonly không có ô input để hiện lỗi). Override tại v2 để KHÔNG đụng hành vi v1/F2/CTV.
 */
const reconUnitItemSchemaV2 = reconItemBaseSchema
  .extend({
    // Readonly BE-computed — không ràng buộc range (tiến độ lũy kế có thể >100%).
    progress_from_pct: z.coerce.number().nullable().default(null),
    progress_to_pct: z.coerce.number().nullable().default(null),
  })
  .superRefine(refineInvestorReconItem)

export const investorReconUnitSchemaV2 = investorReconSheetObject
  .extend({ items: z.array(reconUnitItemSchemaV2) })
  .superRefine(refineInvestorReconSheet)

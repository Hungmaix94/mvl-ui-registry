import { z } from 'zod'

const recipientSchema = z
  .object({
    employee_id: z.string().optional().nullable(),
    collaborator_id: z.string().optional().nullable(),
    exchange_id: z.string().optional().nullable(),
    amount: z.string().min(1, 'Vui lòng nhập số tiền thực nhận'),
    base_amount: z.string().optional().nullable(),
    bonus_amount: z.string().optional().nullable(),
    pct_of_parent: z.string().optional().nullable(),
    hold_amount: z.string().optional().nullable(),
    reason: z.string().optional(),
    recipient_type_label: z.string().optional(),
    recipient_name: z.string().optional(),
    hold_reason: z.string().optional(),
    tax_base: z.string().optional().nullable(),
    is_held: z.boolean().optional(),
    // BE Phase B per-payee account facts (cột AD/AJ/AK). `initialPositions` LUÔN map bốn
    // field này vào form, nên chúng phải có mặt ở schema: thiếu khai báo thì `FormValues`
    // nói dối về dữ liệu đang có, và mọi nơi đọc chúng buộc phải `as any` để lách.
    advance_granted_amount: z.string().optional().nullable(),
    advance_recovered_amount: z.string().optional().nullable(),
    account_hold_amount: z.string().optional().nullable(),
    paid_amount: z.string().optional().nullable(),
    // Pooled split tag (chia gộp): rows carrying it render ONCE in the pooled band and
    // are hidden under each stand person — must be mapped through initialPositions.
    pooled_allocation_id: z.number().optional().nullable(),
  })
  .refine((data) => data.employee_id || data.collaborator_id || data.exchange_id, {
    message: 'Vui lòng chọn người nhận',
    path: ['employee_id'],
  })

/**
 * Lệnh giữ theo TỪNG NGƯỜI NHẬN (WS2), gắn vào cặp (share, payee).
 *
 * Không nằm trong `recipients`: một lệnh đã materialize sẽ xoá dòng split tương ứng, nên
 * đây là nguồn DUY NHẤT còn lại để dựng dòng người nhận bị giữ (xem `buildPayeeRows`).
 * `hold_amount` null nghĩa là lệnh còn PENDING — số tiền chỉ chốt lúc duyệt phiếu.
 */
const payeeHoldSchema = z.object({
  id: z.number().optional().nullable(),
  payee_type: z.string().optional().nullable(),
  payee_id: z.union([z.number(), z.string()]).optional().nullable(),
  payee_name: z.string().optional().nullable(),
  /** 'auto_cert' = lệnh giữ tự động do thiếu CCMG — KHÔNG mở giữ bằng tay được. */
  origin: z.string().optional().nullable(),
  /** 'share' = lệnh đã materialize ở mức share; dùng để khỏi đếm đúp với held_amount. */
  scope: z.string().optional().nullable(),
  hold_reason: z.string().optional().nullable(),
  hold_amount: z.union([z.number(), z.string()]).optional().nullable(),
  tax_base: z.string().optional().nullable(),
})

export type PayeeHoldValues = z.infer<typeof payeeHoldSchema>

export const positionSchema = z.object({
  id: z.number().optional().nullable(),
  commission_share_id: z.number().nullable(),
  payable_id: z.number().nullable(),
  type: z.string().optional(),
  pct_type: z.string().optional(),
  pct: z.string().optional(),
  // Fee/bonus rate of the share (column AE). Contribution split of the deal party
  // on this share (sale 55 / F2 45) — Muc 5 shows this, not the money-weighted ratio.
  percentage: z.string().nullable().optional(),
  participation: z.string().nullable().optional(),
  owner_name: z.string().optional(),
  owner_code: z.string().optional(),
  expected_amount: z.string().optional(),
  share_full_amount: z.string().optional(),
  actual_amount: z.string().optional(),
  // Tiền của dòng tách theo đợt: phần đã chi ở đợt bị KHOÁ và phần còn ghi lại được.
  // `buildGroups` quy đổi số kế toán gõ về `editable_amount` — BE chỉ ghi lên các đợt chưa
  // khoá nên đây mới là tổng nó chấp nhận, còn `expected_amount` là tiền cả kỳ để hiển thị.
  locked_amount: z.string().optional(),
  editable_amount: z.string().optional(),
  admin_hold: z.string().optional(),
  recipient_type: z.enum(['employee', 'collaborator', 'exchange']).optional(),
  recipient_id: z.number().optional(),
  // Reconciliation fee-deduction bucket (BE rule (b)): NEGATIVE amounts. The editor
  // sets __ded_touched when the user hand-edits the per-payee deduction; untouched
  // deduction positions are NOT sent so the BE cascades them by the fee-track ratio.
  is_deduction: z.boolean().optional(),
  __ded_touched: z.boolean().optional(),
  // Lệnh giữ theo người nhận của share này — `initialPositions` luôn map vào, xem
  // `payeeHoldSchema`. Thiếu ở đây thì `buildPayeeRows` không thể đọc mà không ép kiểu.
  payee_holds: z.array(payeeHoldSchema).optional(),
  recipients: z.array(recipientSchema),
})

export const formSchema = z.object({
  positions: z.array(positionSchema),
})

export type FormValues = z.infer<typeof formSchema>
export type PositionValues = z.infer<typeof positionSchema>

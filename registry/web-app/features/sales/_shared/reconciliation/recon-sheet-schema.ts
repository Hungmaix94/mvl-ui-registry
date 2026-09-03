import { z } from 'zod'

import { CTVReconciliationPeriod_type, CTVReconciliationReconciliation_type } from '@/api/schema'
import { ReconciliationSourceType } from '@/constants/api-schema-aliases'
import { INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE } from '@/features/sales/_shared/reconciliation/recon-calculations'

export { INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE }

export const INVESTOR_RECONCILIATION_SHEET_DEFAULT_AGENCY_FEE_PCT = 1

/** ≤2 decimal places, float-safe. */
const isAtMost2Decimals = (v: number) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9

const pctRange = (label: string) =>
  z.coerce.number().min(0, `${label} phải từ 0 đến 100`).max(100, `${label} phải từ 0 đến 100`)

/**
 * Canonical reconciliation line OBJECT (investor superset) — NO refinements. Exported so domain
 * adapters that inherit read-only fields (F2/CTV: period_type, progress, VAT flags come from the
 * parent investor reconciliation, not user input) can attach their OWN lighter `superRefine` instead
 * of the CĐT one — without that, the investor-only rules (cancellation/adjustment-first guards,
 * required progress pair) would reject valid F2/CTV data the user cannot change.
 */
export const reconItemBaseSchema = z.object({
  product_inventory_id: z.coerce
    .number({
      required_error: 'Vui lòng chọn mã căn',
      invalid_type_error: 'Vui lòng chọn mã căn',
    })
    .positive('Vui lòng chọn mã căn'),
  reconciliation_type: z.nativeEnum(CTVReconciliationReconciliation_type).optional(),
  period_type: z
    .nativeEnum(CTVReconciliationPeriod_type)
    .default(CTVReconciliationPeriod_type.normal_payment),
  // Phần 0 — Giá tính phí & %HH
  fee_calculation_price: z
    .preprocess(
      (val) => (val === '' || val === null || val === undefined ? null : val),
      z.coerce.number().min(0).nullable()
    )
    .default(null),
  commission_fee_calculation_price: z.coerce.number().min(0).nullable().default(null), // A'
  pct_agency_fee: z.coerce.number().min(0).nullable().default(null),
  amt_agency_fee: z.coerce.number().min(0).nullable().default(null),
  // VAT luôn áp dụng cho căn (mặc định 10%); cờ is_*_include_vat chỉ nói số nhập đã gồm VAT chưa.
  vat_rate: pctRange('VAT (%)')
    .refine(isAtMost2Decimals, { message: 'VAT tối đa 2 chữ số thập phân' })
    .nullable()
    .default(INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE),
  // Cờ VAT theo từng input (BE: is_*_include_vat). Tạm thời 1 toggle bật/tắt cả 4 cùng lúc.
  is_agency_fee_include_vat: z.boolean().default(false),
  is_extra_bonus_include_vat: z.boolean().default(false),
  is_shared_bonus_include_vat: z.boolean().default(false),
  is_fee_deduction_include_vat: z.boolean().default(false),
  // Phần 1 — Tiến độ (BE tính & trả readonly; FE chỉ hiển thị, không gửi lên).
  progress_from_pct: pctRange('Tiến độ từ (%)').nullable().default(null),
  progress_to_pct: pctRange('Tiến độ đến (%)').nullable().default(null),
  /** "% ĐC đợt này" — XOR với `amt_period_commission` (nhập % hoặc ₫, không VAT). */
  pct_period_commission: pctRange('% ĐC đợt này').nullable().default(null),
  amt_period_commission: z.coerce.number().min(0).nullable().default(null),
  amt_payment_this_period: z.coerce.number().min(0).nullable().default(null),
  // Phần 2 — Điều chỉnh truy hồi: FE chỉ tính PREVIEW (derived.retroactiveAdjustment), KHÔNG gửi
  // lên — không adapter nào đưa field này vào payload (CĐT và CTV đều loại tường minh); BE là
  // nguồn số. CÓ THỂ ÂM ⇒ KHÔNG dùng .min(0). 0 ở kỳ thường / khi chưa đổi giá–%HH, và LUÔN 0
  // với CTV từ 2026-08-06 (truy hồi chuyển sang luồng chi hoa hồng).
  retroactive_adjustment_amount: z.coerce.number().nullable().default(null),
  // Phần 3 — Thưởng đại lý chia sẻ (shared bonus; đổi tên từ supplementary, BE 2026-06-23)
  // Tổng thưởng CĐT (benchmark cho recon_check) — XOR với shared_bonus_pct. KHÔNG vào sub_total.
  shared_bonus_amount: z.coerce.number().min(0).default(0),
  // Tổng thưởng CĐT theo % (XOR với shared_bonus_amount). shared_bonus = giá tính phí × pct / 100.
  shared_bonus_pct: z.coerce.number().min(0).nullable().default(null),
  // Thưởng ghi nhận kỳ này (INFLOW vào sub_total_commission). Nhập tay, mặc định 0.
  shared_bonus_period_amount: z.coerce.number().min(0).default(0),
  // Núm % chia thưởng cho sale/F2 kỳ này. null/0 = tạm dừng chia (vẫn ghi nhận period_amount).
  shared_bonus_to_sale_pct: pctRange('% chia cho sale').nullable().default(null),
  // Số CĐT khai đã tạm ứng trước cho căn này — kế toán NHẬP TAY từ bảng đối chiếu của CĐT,
  // không suy ra từ phiếu tạm ứng nào. Xác nhận dòng sẽ trừ vào công nợ quỹ tạm ứng CĐT,
  // và "còn phải thu" = tổng có VAT − số này.
  shared_bonus_prepaid_amount: z.coerce.number().min(0).default(0),
  bonus_note: z.string().optional(),
  fee_deduction: z.coerce.number().min(0).default(0),
  // Phần khấu trừ áp vào Sale (F2 + CTV) kỳ này. null = prefill 0 trên dòng F2/CTV; 0 = không khấu trừ vào sale.
  fee_deduction_to_sale_amount: z.coerce.number().min(0).nullable().default(null),
  deduction_note: z.string().optional(),
  // Phần 4 (V6) — Phí tăng thêm (tiến độ độc lập)
  extra_bonus_pct: z.coerce.number().min(0).nullable().default(null),
  extra_bonus_amount: z.coerce.number().min(0).nullable().default(null),
  extra_bonus_progress_from_pct: pctRange('Phí tăng thêm — tiến độ từ (%)')
    .nullable()
    .default(null),
  extra_bonus_progress_to_pct: pctRange('Phí tăng thêm — tiến độ đến (%)').nullable().default(null),
  amt_extra_bonus_payment_this_period: z.coerce.number().min(0).nullable().default(null),
  /**
   * GAP 4b — "Tổng tiền có VAT của dòng (theo bảng kê CĐT)" (cột V của bảng kê).
   *
   * Con số kiểm tra: kế toán GÕ LẠI tổng mà CĐT ghi cho chính căn này; BE tính lại từ các ô nhập
   * bên trên và TỪ CHỐI dòng khi lệch dù chỉ 1 đồng. Vì thế nó **write-only** — BE không trả lại
   * trên response, nên mở "Sửa căn" ô này luôn trống (đúng, không phải mất dữ liệu).
   *
   * Bỏ trống là HỢP LỆ ⇒ không chạy kiểm tra. Chỉ màn CĐT 2.0 render ô này; F2/CTV dùng chung
   * `reconItemBaseSchema` nên field để optional và hai màn đó không đổi hành vi.
   */
  total_amount_with_vat: z.coerce.number().nullish(),
  note: z.string().optional(),
})

/**
 * Investor (CĐT) canonical line schema = base object + the CĐT-only refinements. Re-exported as the
 * neutral `reconSheetItemSchema`; F2/CTV build their own from {@link reconItemBaseSchema}.
 */
/**
 * CĐT item-level cross-field rules (XOR %/₫, kỳ hủy/điều chỉnh, tiến độ phí tăng thêm). Tách thành hàm
 * export để v2 (`investor-reconciliations-v2`) tái dùng NGUYÊN các rule này khi build schema riêng của
 * nó — chỉ nới `progress_*` — mà không nhân bản logic. KHÔNG đổi hành vi v1.
 */
export function refineInvestorReconItem(
  item: z.infer<typeof reconItemBaseSchema>,
  ctx: z.RefinementCtx
) {
  const period = item.period_type
  const p1Active =
    period === CTVReconciliationPeriod_type.normal_payment ||
    period === CTVReconciliationPeriod_type.progress_with_adjustment

  // Kỳ hủy cọc = kỳ khấu trừ có nhãn riêng (BE: plan recon_cancellation_period_as_deduction_20260803).
  // Số tiền CĐT thu lại đi qua "Giảm trừ khác" (fee_deduction) để chảy đúng đường tiền — cascade xuống
  // sale/F2/CTV theo tỷ lệ tham gia. Kỳ này KHÔNG có phí đại lý: net = -fee_deduction.
  if (period === CTVReconciliationPeriod_type.cancellation) {
    // BE chặn confirm nếu ghi chú trống (code cancellation_note_required) — báo sớm tại form.
    if (!item.note?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['note'],
        message: 'Vui lòng nhập ghi chú lý do hủy cọc',
      })
    }
    // KHÔNG chặn phí/thưởng ghi nhận kỳ này (chốt 04/08/2026): kỳ hủy cọc VẪN ghi nhận các khoản
    // của kỳ — phí kỳ này, phí tăng thêm kỳ này, thưởng kỳ này — thứ nó không ghi nhận là TIẾN ĐỘ.
    // Tiến độ do BE quyết (resolve_period_progress trả None cho kỳ hủy), không phải việc của form.
  }

  // Phần 1 — "% ĐC đợt này": chỉ một trong % hoặc số tiền (XOR). Tiến độ lũy kế do BE tính.
  if (p1Active) {
    if (item.pct_period_commission != null && item.amt_period_commission != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['amt_period_commission'],
        message: 'Chỉ nhập % hoặc số tiền đối chiếu đợt này',
      })
    }
  }

  // Phí hoa hồng đại lý: chỉ một trong % hoặc số tiền
  if (item.pct_agency_fee != null && item.amt_agency_fee != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['amt_agency_fee'],
      message: 'Chỉ nhập % hoặc số tiền hoa hồng đại lý',
    })
  }

  // Thưởng đại lý chia sẻ: chỉ một trong % hoặc số tiền (XOR)
  if (item.shared_bonus_pct != null && (item.shared_bonus_amount ?? 0) > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['shared_bonus_pct'],
      message: 'Chỉ nhập % hoặc số tiền thưởng đại lý',
    })
  }

  // Trừ từ lương Sale ≤ Giảm trừ khác — mirror validate BE (`fee_deduction_to_sale_amount ∈ [0, fee_deduction]`,
  // 400 keyed on the field). min(0) đã nằm ở base schema; đây chặn cận trên. F2/CTV: rule vacuous
  // (không nhập field này). null = không trừ vào lương Sale ⇒ bỏ qua.
  if (
    item.fee_deduction_to_sale_amount != null &&
    item.fee_deduction_to_sale_amount > Number(item.fee_deduction ?? 0)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['fee_deduction_to_sale_amount'],
      message: 'Phần trừ từ lương Sale không được vượt quá Giảm trừ khác',
    })
  }

  // Phí tăng thêm: chỉ một trong % hoặc số tiền
  if (item.extra_bonus_pct != null && item.extra_bonus_amount != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['extra_bonus_amount'],
      message: 'Chỉ nhập % hoặc số tiền phí tăng thêm',
    })
  }

  // Phí tăng thêm — tiến độ riêng phải nhập đủ cặp và đến ≥ từ
  const ef = item.extra_bonus_progress_from_pct
  const et = item.extra_bonus_progress_to_pct
  if ((ef == null) !== (et == null)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['extra_bonus_progress_to_pct'],
      message: 'Vui lòng nhập đủ tiến độ phí tăng thêm từ và đến',
    })
  }
  if (ef != null && et != null && et < ef) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['extra_bonus_progress_to_pct'],
      message: 'Tiến độ phí tăng thêm đến phải lớn hơn hoặc bằng từ',
    })
  }

  // D5 — kỳ tất toán: BE kiểm tra tiến độ lũy kế (progress_to_pct readonly sau khi lưu).
}

export const investorReconciliationSheetCreateItemSchema =
  reconItemBaseSchema.superRefine(refineInvestorReconItem)

const projectRequired = 'Vui lòng chọn dự án'
const sourceTypeRequired = 'Vui lòng chọn loại nguồn'
/**
 * Object phiếu (chưa gắn superRefine) — export để v2 build schema riêng bằng cách `.extend({ items })`
 * với item đã nới `progress_*`, rồi gắn lại {@link refineInvestorReconSheet}. KHÔNG đổi hành vi v1.
 */
export const investorReconSheetObject = z.object({
  project_id: z.coerce
    .number({ required_error: projectRequired, invalid_type_error: projectRequired })
    .positive(projectRequired),
  source_type: z.nativeEnum(ReconciliationSourceType, {
    required_error: sourceTypeRequired,
    invalid_type_error: sourceTypeRequired,
  }),
  source_exchange_id: z.coerce.number().optional(),
  reconciliation_date: z.string().min(1, 'Vui lòng chọn ngày đối chiếu'),
  note: z.string().optional(),
  // Sheet-first: cho phép lưu phiếu chỉ với thông tin chung (0 căn) rồi thêm căn ở màn Edit.
  // BE chỉ bắt buộc ≥1 căn lúc xác nhận phiếu, không phải lúc tạo/sửa nháp.
  items: z.array(investorReconciliationSheetCreateItemSchema),
})

/** CĐT sheet-level rules (F0 cần nguồn hàng; đợt đầu không được là kỳ điều chỉnh thuần). */
export function refineInvestorReconSheet(
  data: z.infer<typeof investorReconSheetObject>,
  ctx: z.RefinementCtx
) {
  if (
    data.source_type === ReconciliationSourceType.F0 &&
    (!data.source_exchange_id || data.source_exchange_id <= 0)
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['source_exchange_id'],
      message: 'Vui lòng chọn nguồn hàng',
    })
  }

  // D1 — đợt đầu tiên không được là Kỳ điều chỉnh thuần
  if (data.items[0]?.period_type === CTVReconciliationPeriod_type.adjustment_only) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['items', 0, 'period_type'],
      message: 'Đợt đầu tiên không thể là Kỳ điều chỉnh thuần',
    })
  }
}

export const investorReconciliationSheetCreateSchema =
  investorReconSheetObject.superRefine(refineInvestorReconSheet)

export type InvestorReconciliationSheetCreateValues = z.infer<
  typeof investorReconciliationSheetCreateSchema
>
export type InvestorReconciliationSheetCreateItemValues = z.infer<
  typeof investorReconciliationSheetCreateItemSchema
>

export function createEmptyInvestorReconciliationSheetItem(): InvestorReconciliationSheetCreateItemValues {
  return {
    product_inventory_id: undefined as unknown as number,
    reconciliation_type: undefined as unknown as CTVReconciliationReconciliation_type,
    period_type: CTVReconciliationPeriod_type.normal_payment,
    fee_calculation_price: null,
    commission_fee_calculation_price: null,
    pct_agency_fee: INVESTOR_RECONCILIATION_SHEET_DEFAULT_AGENCY_FEE_PCT,
    amt_agency_fee: null,
    vat_rate: INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE,
    is_agency_fee_include_vat: false,
    is_extra_bonus_include_vat: false,
    is_shared_bonus_include_vat: false,
    is_fee_deduction_include_vat: false,
    progress_from_pct: null,
    progress_to_pct: null,
    pct_period_commission: null,
    amt_period_commission: null,
    amt_payment_this_period: null,
    retroactive_adjustment_amount: null,
    shared_bonus_amount: 0,
    shared_bonus_pct: null,
    shared_bonus_period_amount: 0,
    shared_bonus_to_sale_pct: null,
    shared_bonus_prepaid_amount: 0,
    bonus_note: '',
    fee_deduction: 0,
    fee_deduction_to_sale_amount: null,
    deduction_note: '',
    extra_bonus_pct: null,
    extra_bonus_amount: null,
    extra_bonus_progress_from_pct: null,
    extra_bonus_progress_to_pct: null,
    amt_extra_bonus_payment_this_period: null,
    total_amount_with_vat: null,
    note: '',
  }
}

const FLOAT_COMPARE_EPSILON = 0.000001

function toComparableNumber(value: unknown) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function toComparableText(value: unknown) {
  return String(value ?? '').trim()
}

export function isDefaultInvestorReconciliationSheetItem(
  item: InvestorReconciliationSheetCreateItemValues | undefined | null
) {
  if (!item) return true
  const defaultItem = createEmptyInvestorReconciliationSheetItem()

  const hasProductInventory =
    typeof item.product_inventory_id === 'number' &&
    Number.isFinite(item.product_inventory_id) &&
    item.product_inventory_id > 0

  if (hasProductInventory) return false
  if (item.period_type !== defaultItem.period_type) return false
  if (item.reconciliation_type != null) return false

  const numericFieldsEqual =
    Math.abs(
      toComparableNumber(item.fee_calculation_price) - (defaultItem.fee_calculation_price ?? 0)
    ) < FLOAT_COMPARE_EPSILON &&
    Math.abs(
      toComparableNumber(item.pct_agency_fee ?? 0) -
        toComparableNumber(defaultItem.pct_agency_fee ?? 0)
    ) < FLOAT_COMPARE_EPSILON &&
    Math.abs(toComparableNumber(item.shared_bonus_amount) - defaultItem.shared_bonus_amount) <
      FLOAT_COMPARE_EPSILON &&
    Math.abs(
      toComparableNumber(item.shared_bonus_period_amount) - defaultItem.shared_bonus_period_amount
    ) < FLOAT_COMPARE_EPSILON &&
    Math.abs(toComparableNumber(item.fee_deduction) - defaultItem.fee_deduction) <
      FLOAT_COMPARE_EPSILON &&
    // vat_rate mặc định 10 (legacy null coi như mặc định) — vẫn pristine khi chưa ai sửa.
    Math.abs(
      toComparableNumber(item.vat_rate ?? defaultItem.vat_rate) -
        toComparableNumber(defaultItem.vat_rate)
    ) < FLOAT_COMPARE_EPSILON

  if (!numericFieldsEqual) return false

  // Nullable fields that must remain null in a pristine row.
  const nullableUntouched =
    (item.amt_agency_fee ?? null) === null &&
    (item.commission_fee_calculation_price ?? null) === null &&
    (item.progress_from_pct ?? null) === null &&
    (item.progress_to_pct ?? null) === null &&
    (item.pct_period_commission ?? null) === null &&
    (item.amt_period_commission ?? null) === null &&
    (item.amt_payment_this_period ?? null) === null &&
    (item.shared_bonus_pct ?? null) === null &&
    (item.shared_bonus_to_sale_pct ?? null) === null &&
    (item.extra_bonus_pct ?? null) === null &&
    (item.extra_bonus_amount ?? null) === null &&
    (item.extra_bonus_progress_from_pct ?? null) === null &&
    (item.extra_bonus_progress_to_pct ?? null) === null &&
    (item.amt_extra_bonus_payment_this_period ?? null) === null

  if (!nullableUntouched) return false

  return (
    toComparableText(item.note) === toComparableText(defaultItem.note) &&
    toComparableText(item.bonus_note) === toComparableText(defaultItem.bonus_note) &&
    toComparableText(item.deduction_note) === toComparableText(defaultItem.deduction_note)
  )
}

export function hasInvestorReconciliationDetailUserData(
  items: InvestorReconciliationSheetCreateItemValues[] | undefined | null
) {
  if (!items || items.length === 0) return false
  if (items.length > 1) return true
  return !isDefaultInvestorReconciliationSheetItem(items[0])
}

/* -------------------------------------------------------------------------------------------------
 * Domain-neutral aliases (canonical reconciliation form model).
 *
 * The investor-named exports above remain the live symbols the CĐT screens import; these aliases
 * give the F2/CTV engine code neutral names to import the SAME canonical model, so per-domain
 * adapters map a single form shape. (Investor screens migrate to the neutral names as cleanup.)
 * ------------------------------------------------------------------------------------------------- */
export const reconSheetItemSchema = investorReconciliationSheetCreateItemSchema
export const reconSheetSchema = investorReconciliationSheetCreateSchema
export type ReconSheetItemValues = InvestorReconciliationSheetCreateItemValues
export type ReconSheetValues = InvestorReconciliationSheetCreateValues
export const createEmptyReconSheetItem = createEmptyInvestorReconciliationSheetItem
export const isDefaultReconSheetItem = isDefaultInvestorReconciliationSheetItem
export const hasReconDetailUserData = hasInvestorReconciliationDetailUserData
export const RECON_SHEET_DEFAULT_AGENCY_FEE_PCT =
  INVESTOR_RECONCILIATION_SHEET_DEFAULT_AGENCY_FEE_PCT
export const RECON_DEFAULT_VAT_RATE = INVESTOR_RECONCILIATION_DEFAULT_VAT_RATE

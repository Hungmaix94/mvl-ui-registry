/**
 * TẠM THỜI — hợp đồng type cho nhóm endpoint `/api/accounting/reports/*`.
 *
 * Bản OpenAPI regen ngày 2026-07-28 **mất annotation** của ~12 view report kế toán:
 * `parameters.query` và `responses.200.content` đều rỗng ("No response body"), kéo theo
 * các component `PartnerDebtResponse` / `UnitsNotFullyPaid*`
 * / `SalesCommissionPayout*` / `LegalEntity*Debt*` / `ProjectMoneyIn*` / `RevenueByBranch*`
 * / `ProjectSummary*` / `HhqlByProject*` / `IncomeBySalesperson*` biến mất khỏi `schema.ts`.
 * Bản thân endpoint + docstring nghiệp vụ vẫn còn nguyên, nên đây là lỗi annotation phía
 * BE (drf-spectacular), KHÔNG phải endpoint bị gỡ.
 *
 * Toàn bộ type dưới đây **copy nguyên xi** từ `src/api/schema.ts` bản trước khi regen
 * (git 683695fd6) — không phải tự bịa shape.
 *
 * XOÁ FILE NÀY khi BE khôi phục `@extend_schema(parameters=..., responses=...)` cho các
 * view report: chạy `yarn api:update` rồi trỏ import về lại `@/api/schema`.
 */
import type { components } from '@/api/schema'
import { type CommissionHoldBeneficiaryType } from '@/constants/api-schema-aliases'
/** `export=xlsx` — enum một giá trị, BE dùng chung cho mọi report. */
export type ReportExportFormat = 'xlsx'

// ---------------------------------------------------------------------------
// Query params
// ---------------------------------------------------------------------------

export type GetInvestorInvoiceReconciliationReportParams = {
  /** Keep only units whose deposit contract was signed on/after this date (ISO YYYY-MM-DD). */
  contract_date_from?: string
  /** Keep only units whose deposit contract was signed on/before this date (ISO YYYY-MM-DD). */
  contract_date_to?: string
  /** Filter to a single deal (unit) id. */
  deal?: number
  /** Set to `xlsx` to download the report as an Excel file (all units, unpaginated). */
  export?: ReportExportFormat
  /**
   * `true` keeps only units whose `remaining_amount` is strictly above zero — still to
   * reconcile. Fully-invoiced units (0) and over-invoiced ones (negative) both drop out.
   * Omit to list every unit.
   */
  has_remaining?: boolean
  /** Filter by investor id. */
  investor?: number
  /** Page number (default 1). */
  page?: number
  /** Units per page (default 25, max 100). */
  page_size?: number
  /** Filter by project id. */
  project?: number
}

export type PartnerDebtPartnerType = 'EXCHANGE' | 'INVESTOR'

export type GetPartnerDebtReportParams = {
  /** Set to `xlsx` to download the report as an Excel file instead of JSON. */
  export?: ReportExportFormat
  /** Filter by month (1-12). */
  month?: number
  /** Filter to one partner by id (paired with partner_type). */
  partner_id?: number
  /** Filter to a single partner kind (INVESTOR, or EXCHANGE = F2 partner). */
  partner_type?: PartnerDebtPartnerType
  /** Case-insensitive partner-name contains filter. */
  search?: string
  /** Filter by year (e.g. 2026). */
  year?: number
}

export type GetProjectMoneyInParams = {
  export?: ReportExportFormat
  month?: number
  project?: number
  /** Filter by product-inventory unit code. */
  unit_code?: string
  year?: number
  /** Nội bộ MV / sàn F2 / cộng tác viên — resolve qua sale line của HĐ cọc. */
  sale_type?: string
}

export type GetSalesCommissionPayoutParams = {
  export?: ReportExportFormat
  /**
   * Add per-row hold_release_details / advance_recovery_details itemizing which holds
   * and advances the supplement / recovery columns are made of. Ignored for export=xlsx.
   */
  include_details?: boolean
  month?: number
  /** Filter by beneficiary type (EMPLOYEE / COLLABORATOR / EXCHANGE). */
  type?: CommissionHoldBeneficiaryType
  year?: number
}

export type GetRevenueByBranchParams = {
  branch?: number
  export?: ReportExportFormat
  month?: number
  year?: number
}

/**
 * TẠM THỜI — `reports/revenue-by-branch-yearly/` (ClickUp 86eyd8hb2, backend PR
 * MVL-ERP-3/backend#3237) là endpoint HOÀN TOÀN MỚI, chưa merge vào backend `dev` nên chưa có
 * trong `schema.ts` (khác nhóm report phía trên trong file này — những report đó chỉ mất
 * annotation, endpoint đã tồn tại). Không dùng `ApiPaths.xxx` cho endpoint này (member chưa tồn
 * tại) — gọi qua path string thô, xem `getRevenueByBranchYearlyReport` trong `report-service.ts`.
 * XOÁ khối này + đổi service sang `ApiPaths.accounting_reports_revenue_by_branch_yearly_retrieve`
 * khi backend PR merge `dev` và `yarn api:update` lấy được endpoint.
 */
export type GetRevenueByBranchYearlyParams = {
  export?: ReportExportFormat
  year?: number
}

export type RevenueByBranchYearlyMetric = 'revenue' | 'cost_of_sale' | 'gross_margin'
export type RevenueByBranchYearlyBucket = 'f2_ctv' | 'branch_sale' | 'total'

export type RevenueByBranchYearlyRow = {
  metric: RevenueByBranchYearlyMetric
  bucket: RevenueByBranchYearlyBucket
  label: string
  /** 12 giá trị, index 0 = Tháng 1. */
  monthly: string[]
  total_year: string
}

export type RevenueByBranchYearlyResponse = {
  year: number
  rows: RevenueByBranchYearlyRow[]
}

export type GetUnitsNotFullyPaidParams = {
  export?: ReportExportFormat
  month?: number
  project?: number
  unit_code?: string
  year?: number
}

export type GetIncomeBySalespersonParams = {
  branch?: number
  block?: number
  department?: number
  employee?: number
  export?: ReportExportFormat
  month?: number
  q?: string
  year?: number
}

export type GetHhqlByProjectParams = {
  export?: ReportExportFormat
  month?: number
  /** Lọc đúng một dự án. Giữ lại cho link cũ — FE nay gửi `project__in`. */
  project?: number
  /**
   * Lọc nhiều dự án. Client gửi dạng nối phẩy (`project__in=12,37` — `querySerializer` khai
   * `explode: false`); BE nhận cả dạng lặp lẫn nối phẩy và hợp nhất với `project`.
   */
  project__in?: number[]
  year?: number
}

export type GetProjectSummaryParams = {
  export?: ReportExportFormat
  month?: number
  project?: number
  unit_code?: string
  year?: number
}

export type GetLegalEntityCommissionDebtParams = {
  export?: ReportExportFormat
  month?: number
  year?: number
}

export type GetLegalEntityInvoiceDebtParams = {
  export?: ReportExportFormat
}

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

/**
 * ✅ ĐÃ HẾT TẠM THỜI cho nhóm `InvestorInvoiceReport*` — BE đã trả lại annotation, nên
 * `schema.ts` có đủ 3 component này. Không copy tay nữa, alias thẳng về schema: bản
 * copy tay đã drift thật (`unit_code` trong khi schema là `unit_number`, và thiếu
 * `total_uncollected_revenue`), đúng lý do AGENTS.md § API Schema & Typing cấm tự khai
 * type khi schema đã có. Các type còn lại trong file này vẫn là copy tay vì BE chưa trả
 * annotation — xoá dần theo từng nhóm khi schema có lại.
 *
 * ⏳ DELTA CHỜ DEPLOY (backend#2872 — một gốc tiền chưa VAT + grain theo invoice line):
 * base vẫn là `components['schemas'][...]` (không tự khai lại), chỉ giao thêm những field
 * BE mới trả mà `schema.ts` chưa có, và nới `reconciliation_pct` thành nullable (BE trả
 * `null` khi gốc phí+thưởng = 0 để UI hiện "—" thay vì 0% gây hiểu sai).
 * **Xoá phần giao này và chạy `yarn api:update` ngay khi backend#2872 lên staging.**
 */
export type InvestorInvoiceReportInvoice = Omit<
  components['schemas']['InvestorInvoiceReportInvoice'],
  'reconciliation_pct'
> & {
  /** Phần PRE-VAT của căn này trong hóa đơn (Σ line_total các line của deal). */
  net_amount: string
  /** Đã thu trên các line của căn này, quy về PRE-VAT (`line.paid_amount_net`). */
  paid_amount: string
  /** Phần pre-VAT của hóa đơn này / gốc phí+thưởng của căn. `null` khi gốc = 0. */
  reconciliation_pct: string | null
}

/**
 * Mọi field tiền là PRE-VAT và mọi % neo cùng `reconciliation_amount`, nên
 * `invoiced_net_amount + remaining_amount === reconciliation_amount` và hai pct cộng đủ
 * 100. Chỉ `total_invoiced_amount_with_vat` và `amount_with_vat` (per-invoice) là có VAT —
 * không bao giờ trừ chéo chúng với các cột pre-VAT.
 */
export type InvestorInvoiceReportRow = Omit<
  components['schemas']['InvestorInvoiceReportRow'],
  'invoices'
> & {
  invoices: InvestorInvoiceReportInvoice[]
  /** Thưởng từ CĐT: thưởng chia sẻ + thưởng thêm (KHÔNG trừ giảm trừ phí). */
  bonus_amount: string
  /** % đối chiếu THEO HÓA ĐƠN ĐÃ GHI SỔ. `null` khi gốc = 0. */
  invoiced_reconciliation_pct: string | null
  /** Tiền pre-VAT đã đối chiếu bằng hóa đơn ghi sổ cho căn này. */
  invoiced_net_amount: string
  /** Pre-VAT còn phải đối chiếu = gốc − đã đối chiếu. Âm = xuất vượt. */
  remaining_amount: string
  /** 100 − `invoiced_reconciliation_pct`. `null` khi gốc = 0. */
  remaining_reconciliation_pct: string | null
  /** Đối ứng có VAT — phần hóa đơn đỏ của căn này. */
  total_invoiced_amount_with_vat: string
}

export type InvestorInvoiceReportResponse = Omit<
  components['schemas']['InvestorInvoiceReportResponse'],
  'results'
> & {
  results: InvestorInvoiceReportRow[]
}

export type PartnerDebtMetric = {
  /** Arising within the month. */
  period: string
  /** Outstanding balance as of month-end. */
  cumulative: string
}

export type PartnerDebtRow = {
  partner_id: number
  /** INVESTOR or EXCHANGE (F2 partner). */
  partner_type: string
  partner_name: string | null
  contact: string
  receivable: PartnerDebtMetric
  payable: PartnerDebtMetric
  balance: PartnerDebtMetric
}

export type PartnerDebtResponse = {
  year: number
  month: number
  results: PartnerDebtRow[]
}

/**
 * Một sale trên hợp đồng cọc của căn, kèm tỷ lệ tham gia.
 *
 * Đúng MỘT trong ba id được set — dùng để dẫn tên sang trang chi tiết của chính đối tượng đó.
 * Chọn link theo id nào có, KHÔNG theo `sale_type`: BE cố tình lấy theo FK để dòng nào khai
 * loại một đằng mà FK trỏ một nẻo thì link vẫn tới đúng bản ghi đã đặt ra cái tên đang hiện.
 */
export type UnitsNotFullyPaidSale = {
  name: string
  /** Phòng ban đóng băng lúc lập HĐ cọc; `null` khi sale là CTV/sàn F2 không thuộc phòng nào. */
  department: string | null
  participation_pct: string | null
  employee_id: number | null
  collaborator_id: number | null
  exchange_id: number | null
}

/** Một lần chi trả phần hoa hồng còn lại của căn. */
export type UnitsNotFullyPaidRelease = {
  /** Kỳ chi trả, dạng `yyyy-MM`. */
  period: string
  amount: string
  /** Tỷ lệ lần chi trả này trên tổng phải trả của căn. */
  pct: string | null
}

/**
 * KHÁC các type còn lại trong file: shape này **không** copy từ `schema.ts` bản cũ mà theo
 * contract mới của CR STT28+46 (ClickUp 86eyetcjn) — grain đổi từ (căn × người nhận) sang
 * (kỳ đối chiếu × BĐS), nên `sale`/`department`/`month_paid` dạng chuỗi đã bị thay bằng
 * `sales[]`/`month_paid_details[]`, và các cột tiền nay tính cho cả căn.
 */
export type UnitsNotFullyPaidRow = {
  recon_year: number
  recon_month: number
  project_id: number | null
  project_name: string | null
  investor_name?: string | null
  unit_number: string | null
  unit_code: string | null
  /** Sale trên HĐ cọc, tỷ lệ tham gia giảm dần. Rỗng khi HĐ cọc chưa có sale nào. */
  sales: UnitsNotFullyPaidSale[]
  collected_amount: string
  /** Tiền phải trả người bán trong kỳ, cộng trên mọi dòng người nhận của căn. */
  payable_amount: string
  paid_comm_amount: string
  remaining_comm_amount: string
  unpaid_pct: string | null
  note: string
  /** Mọi lần chi trả phần hoa hồng còn lại của căn, theo thứ tự thời gian. */
  month_paid_details: UnitsNotFullyPaidRelease[]
}

export type UnitsNotFullyPaidResponse = {
  results: UnitsNotFullyPaidRow[]
}

export type R2HoldReleaseDetail = {
  hold_id: number
  hold_code: string
  deal_id: number | null
  deal_code: string | null
  project_name: string | null
  hold_reason: string
  tax_base: string
  source_role: string
  /** YYYY-MM the hold was created in. */
  original_period: string | null
  original_amount: string
  /** Amount released into THIS period. */
  amount: string
  released_at: string | null
  release_reason: string
  released_by_name: string | null
  report_column: 'ccmg_supplement' | 'prior_month_supplement'
}

export type SalesCommissionPayoutRow = {
  beneficiary_type: string
  beneficiary_id: number | null
  beneficiary_name: string | null
  sale_amount: string
  prior_month_supplement: string
  htqc: string
  pit: string
  advance_to_recover: string
  hold_amount: string
  ccmg_supplement: string
  net_payable: string
  bank_transfer: string
  hold_release_details?: R2HoldReleaseDetail[]
  advance_recovery_details?: components['schemas']['_AdvanceRecoveryItem'][]
}

export type SalesCommissionPayoutResponse = {
  results: SalesCommissionPayoutRow[]
}

export type LegalEntityCommissionDebtRow = {
  legal_entity_id: number
  tax_code: string
  name: string
  commission_payable_total: string
}

export type LegalEntityCommissionDebtResponse = {
  results: LegalEntityCommissionDebtRow[]
}

export type LegalEntityInvoiceDebtRow = {
  legal_entity_id: number
  tax_code: string
  name: string
  receivable_total: string
  payable_total: string
  net: string
}

export type LegalEntityInvoiceDebtResponse = {
  results: LegalEntityInvoiceDebtRow[]
}

export type ProjectMoneyInRow = {
  project_id: number | null
  project_name: string | null
  investor_name?: string | null
  money_received: string
  revenue: string
  paid_sale_f2: string
  sale_bonus: string
  paid_sale_f2_actual: string
  sale_bonus_actual: string
  remaining: string
}

export type ProjectMoneyInResponse = {
  by_project: ProjectMoneyInRow[]
}

export type RevenueByBranchRow = {
  branch_id: number | null
  branch_name: string | null
  revenue: string
  cost_of_sale: string
  gross_margin: string
  mgmt_commission_cost: string
}

export type RevenueByBranchResponse = {
  by_branch: RevenueByBranchRow[]
}

export type ProjectSummaryRow = {
  project_id: number | null
  project_name: string | null
  investor_name?: string | null
  money_received: string
  sale_commission: string
  mgmt_commission: string
  ytd_money_received: string
  ytd_sale_commission: string
  ytd_mgmt_commission: string
}

export type ProjectSummaryResponse = {
  year: number
  month: number
  by_project: ProjectSummaryRow[]
}

export type HhqlByProjectRow = {
  project_id: number | null
  project_name: string | null
  truong_phong: string
  giam_doc: string
  tong_giam_doc: string
  gd_du_an: string
  thuong_gd_du_an: string
  total_mgmt: string
  promotion: string
  back_office: string
  slk: string
  grand_total: string
}

export type HhqlByProjectResponse = {
  by_project: HhqlByProjectRow[]
}

export type IncomeBySalespersonRow = {
  employee_id: number
  employee_code: string | null
  employee_name: string | null
  branch_id?: number | null
  block_id?: number | null
  department_id?: number | null
  department_name: string | null
  hh_bh: string
  hh_ql: string
  ad_support: string
  salary: string
  bonus: string
  bhxh: string
  total_income: string
  redirected_out_amount: string
  ytd_redirected_out_amount: string
  ytd_hh_bh: string
  ytd_hh_ql: string
  ytd_ad_support: string
  ytd_bonus: string
  ytd_total_income: string
}

export type IncomeBySalespersonResponse = {
  year: number
  month: number
  results: IncomeBySalespersonRow[]
}

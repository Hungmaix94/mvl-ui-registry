import type { components } from '@/api/schema'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { isStaffIncentivePctType } from '@/features/accounting/commission-splits/utils/pct-type'

// BE 2026-07-24 (plan_nhan_ho_monthly_summary_gaps): moi item trong sources.*.by_deal[].items[]
// co them received_on_behalf + original_beneficiary. Chua co trong schema.ts generated (BE chua
// deploy) — extend cuc bo, KHONG hand-edit schema.ts; xoa extension nay sau lan regen canonical.
export type OriginalBeneficiaryRef = {
  type: 'employee' | 'collaborator' | 'exchange'
  id: number
  name: string
}

export type DealPayableItemWithProxy = components['schemas']['_DealPayableItem'] & {
  received_on_behalf?: boolean
  original_beneficiary?: OriginalBeneficiaryRef | null
  // BE 2026-08-26 (plan_sale_monthly_proxy_deal_table): rate cua CHINH share nay + ty le
  // nhan ho. Xem buildDealCommissionSources — group key theo deal_id nen header chi noi
  // duoc cho MOT nguon. Chua co trong schema.ts generated: `api-schema.json` commit trong
  // repo web da lech han contract hien tai (tag 'Web: …' cua ban cu), regen se sinh diff
  // 125k dong khong lien quan. Xoa extension nay sau lan regen canonical.
  participation_pct?: string | null
  effective_commission_pct?: string | null
  proxy_pct?: string | null
  proxy_base_amount?: string | null
}

export type DealPayableGroup = Omit<components['schemas']['_DealPayableGroup'], 'items'> & {
  items: DealPayableItemWithProxy[]
  // Cung dot BE 2026-08-26, cung ly do chua co trong schema.ts generated.
  unit_id?: number | null
  worksheet_id?: number | null
  worksheet_code?: string | null
}

export const ORIGINAL_BENEFICIARY_TYPE_LABEL: Record<OriginalBeneficiaryRef['type'], string> = {
  employee: 'NV',
  collaborator: 'CTV',
  exchange: 'Sàn',
}

export function sumDealSubtotals(deals: DealPayableGroup[]): number {
  return deals.reduce((acc, deal) => acc + Number(deal.subtotal || 0), 0)
}

export function sumItemsByPctType(deals: DealPayableGroup[], pctType: string): number {
  return deals.reduce((acc, deal) => acc + sumDealItemsByPctType(deal, pctType), 0)
}

/**
 * Tổng tiền của MỘT `pct_type` trong MỘT deal group.
 *
 * ⚠️ Cộng, KHÔNG `find`. Một group được key theo `deal_id` (BE `_append_to_deal_group`), nên
 * người đứng ra nhận hộ N sale trên cùng một căn có N item cùng `pct_sale_commission` trong
 * một group. `find` chỉ lấy item đầu — đúng lỗi đo được trên summary 42 kỳ 08/2026: cột "HH
 * bán hàng" in 19.173.982 trong khi "HH ghi nhận" (đọc `subtotal`, cộng đủ) in 48.208.869.
 * Cùng luật với BE export `monthly_commission_deal_rows._sum_items`.
 */
export function sumDealItemsByPctType(deal: DealPayableGroup, pctType: string): number {
  return (deal.items || []).reduce((acc, item) => {
    if (item.pct_type !== pctType) return acc
    const amount = Number(item.amount)
    return Number.isFinite(amount) ? acc + amount : acc
  }, 0)
}

/**
 * "Thưởng MV" (`staff_incentive`) của MỘT deal — tiền chiến dịch chính MVL trả cho
 * nhân viên, khác nguồn với thưởng CĐT chia sẻ.
 *
 * Không dùng được `sumItemsByPctType`/bộ lọc theo tiền tố: đây là pct_type duy
 * nhất KHÔNG có tiền tố `pct_`/`amt_`, nên phải khớp qua
 * `isStaffIncentivePctType` — cùng định nghĩa với Mục 6 để hai màn không lệch.
 *
 * Cộng MỌI item khớp, không `find` item đầu: group được key theo `deal_id`, nên người nhận
 * hộ nhiều sale trên cùng một căn có nhiều item thưởng MV trong một group — cùng lý do đã
 * ghi ở [[sumDealItemsByPctType]].
 */
export function getDealStaffIncentive(deal: Pick<DealPayableGroup, 'items'>): number {
  return (deal.items || []).reduce((acc, item) => {
    if (!isStaffIncentivePctType(item.pct_type)) return acc
    // BE trả Decimal dưới dạng chuỗi số; chặn payload lạ để dòng TỔNG không thành NaN.
    const amount = Number(item.amount)
    return Number.isFinite(amount) ? acc + amount : acc
  }, 0)
}

/** Tổng "Thưởng MV" của cả danh sách deal — dùng cho dòng TỔNG của Mục 1. */
export function sumStaffIncentive(deals: DealPayableGroup[]): number {
  return deals.reduce((acc, deal) => acc + getDealStaffIncentive(deal), 0)
}

/**
 * "% HH" cua mot dong deal tren man Chia HH Sale/CTV theo thang — CR STT16 (86eyd8qvq).
 *
 * Ke toan chot trong thread 24/07: con so nay la % hoa hong nguoi do nhan TREN CA CAN, DA chia
 * theo ty le tham gia — khong phai % pool chung cua ca deal, cung khong phai % theo tien ve tung
 * dot.
 *
 * BE 2026-08-04 tra san `effective_commission_pct` (4dp) o moi deal group, tinh boi
 * `sales/services/commission_table.effective_display_rate` — CUNG con so voi
 * `actual_rate_percentage` cua bang chia HH man deal, va la cho DUY NHAT biet share
 * custom-override la share-own (khong nhan ty le tham gia). Uu tien doc thang field nay.
 *
 * Nhanh thu hai chi la luoi do cho lan deploy chuyen tiep (BE chua len, field con thieu).
 * Bug cu: FE lay `amount / (gia tinh phi x ty le tham gia)`. Ty le tham gia nam o CA tu so (BE da
 * chia no vao `amount`) lan mau so nen triet tieu, moi sale trong cung mot can deu doc ra dung %
 * pool — 2% cho ca ba sale tham gia 33/34/33 thay vi 0.66/0.68/0.66.
 *
 * KHONG suy % tu tien khi khong co rate: share amount-mode (F2 co dinh, override nhap thang tien)
 * khong he co % de hien, chia nguoc tu tien chi de ra mot con so nhin nhu that. Cung quy tac voi
 * bang chia thuc nhan man 20.8 (`buildPayeeRows`: percentage null -> feePct null -> '—').
 *
 * @param deal deal group tu API monthly summary
 * @returns % hieu dung, hoac null khi share khong co rate (o hien thi '—')
 */
export function getDealEffectiveCommissionPct(
  deal: Pick<
    DealPayableGroup,
    'commission_percentage' | 'participation_pct' | 'effective_commission_pct'
  >
): number | null {
  const servedPct = Number(deal.effective_commission_pct ?? NaN)
  if (Number.isFinite(servedPct) && servedPct > 0) return servedPct

  const poolPct = Number(deal.commission_percentage ?? NaN)
  if (!Number.isFinite(poolPct) || poolPct <= 0) return null
  // participation null = share nhan tron pool, giong nhanh `else Decimal("100")` cua BE.
  const participationPct = Number(deal.participation_pct ?? 100)
  return poolPct * ((Number.isFinite(participationPct) ? participationPct : 100) / 100)
}

/**
 * "HH ghi nhận" của MỘT deal — hoa hồng người này được hưởng khi tiền về ĐỦ 100%.
 *
 * Khác `subtotal`: subtotal chỉ là phần đã hạch toán trong kỳ, tính theo tiền CĐT đã thu.
 * Trên bảng chi tiết HH quản lý hai con số nằm cạnh nhau ("HH ghi nhận" vs "HH thực tế")
 * nên không được lẫn nhau.
 *
 * ⚠️ Nơi dùng hiện chỉ còn **HH quản lý** (`CommMgrDetail.tsx`, cột "HH ghi nhận"). Màn
 * **HH F2 theo tháng** đã bỏ cột này ngày 19/08/2026 theo yêu cầu BA — ClickUp 86eyh04b6.
 * Đừng xoá hàm khi dọn màn F2, và cũng đừng coi việc màn F2 không gọi nó là lỗi.
 *
 * BE trả sẵn `f2_total_commission` = `CommissionShare.calculated_amount`
 * (MVL-ERP/backend#3197). KHÔNG suy ngược `subtotal × 100 / payment_progress_pct`:
 * - `payment_progress_pct` BE đã quantize còn 2 chữ số, chia cho số đã làm tròn làm sai số
 *   nở thành tiền thật — càng ít tiền về lệch càng to (progress "0.01" nhân subtotal lên
 *   10.000 lần).
 * - Kỳ chưa có phiếu thu thì progress = 0, không có gì để chia, kết quả tụt về đúng bằng
 *   `subtotal` — đúng cái lỗi "ghi nhận 10tr · về 0% · thực tế 10tr" tự mâu thuẫn.
 *
 * Cũng KHÔNG suy từ `fee_calculation_price × effective_commission_pct`: công thức BE
 * (`commission_table._display_rate_unrounded`) còn hệ số khác, và share custom-override
 * không nhân tỷ lệ tham gia vào tiền — suy ra chỉ để có "một con số nhìn như thật".
 * Thiếu field thì trả null để màn hiện '—', giống quy tắc của
 * [[getDealEffectiveCommissionPct]] khi share không có rate.
 *
 * (Shim `TODO(schema)` đọc qua cast cục bộ đã gỡ ngày 19/08/2026: #3197 lên release, nên
 * `f2_total_commission` đã có thật trong `_DealPayableGroup` của `schema.ts`.)
 *
 * @returns số tiền HH ghi nhận, hoặc null khi BE chưa trả field (ô hiển thị '—')
 */
export function getDealRecognisedCommission(deal: DealPayableGroup): number | null {
  const served = deal.f2_total_commission
  if (served === null || served === undefined || served === '') return null
  const amount = Number(served)
  return Number.isFinite(amount) ? amount : null
}

/**
 * Tổng "HH ghi nhận" của cả danh sách deal — dùng cho dòng TỔNG CỘNG.
 *
 * Chỉ cộng những deal thực sự có số; trả null khi KHÔNG deal nào có, để dòng tổng hiện '—'
 * thay vì một số 0 trông như "không có hoa hồng nào".
 */
export function sumDealRecognisedCommission(deals: DealPayableGroup[]): number | null {
  let hasAny = false
  const total = deals.reduce((acc, deal) => {
    const amount = getDealRecognisedCommission(deal)
    if (amount === null) return acc
    hasAny = true
    return acc + amount
  }, 0)
  return hasAny ? total : null
}

/** 4 hang muc thuong HH quan ly, theo hau to cua `pct_type` (mgmt_<vai tro>_<hang muc>). */
export const MGMT_BONUS_CATEGORIES = [
  'agency_fee',
  'project_bonus',
  'investor_bonus',
  'mv_bonus',
] as const

export type MgmtBonusCategory = (typeof MGMT_BONUS_CATEGORIES)[number]

export function getMgmtBonusCategory(pctType?: string | null): MgmtBonusCategory | null {
  return MGMT_BONUS_CATEGORIES.find((c) => pctType?.endsWith(`_${c}`)) ?? null
}

/** Mot o hang muc: tien cua ky nay + so tien cau hinh da sinh ra no. */
export type MgmtBonusCell = {
  /** Tien thuc te ky nay = Σ `items[].amount`. */
  amount: number
  /** Σ `items[].share_full_amount` — so tien cau hinh ca can. null khi BE chua tra field. */
  configured: number | null
}

export type MgmtBonusDealRow = {
  key: string
  dealId?: number | null
  dealCode?: string | null
  /** "Ma can" hien duoi ma deal — `unit_number`, KHONG bao gio `unit_code`. Xem getDealUnitLabel. */
  unitLabel: string | null
  projectName: string
  customerName: string
  cells: Record<MgmtBonusCategory, MgmtBonusCell>
  /** Σ cau hinh cua ca 4 hang muc; null khi khong hang muc nao co field. */
  configuredTotal: number | null
  /** Σ tien thuc te ky nay cua ca dong. */
  actualAmount: number
  /** `% chia dot nay` — dial fee cua bang ke (deal x ky). Chuoi 10dp cua BE, hoac null. */
  dialPct: string | null
  /** `% tien ve` — tien CDT da thu trong ky / tong phi moi gioi cua deal. */
  paymentProgressPct: number
}

const emptyCells = (): Record<MgmtBonusCategory, MgmtBonusCell> => ({
  agency_fee: { amount: 0, configured: null },
  project_bonus: { amount: 0, configured: null },
  investor_bonus: { amount: 0, configured: null },
  mv_bonus: { amount: 0, configured: null },
})

const addConfigured = (current: number | null, raw: unknown): number | null => {
  if (raw === null || raw === undefined || raw === '') return current
  const value = Number(raw)
  if (!Number.isFinite(value)) return current
  return (current ?? 0) + value
}

/**
 * Gom cac dong MGMT theo deal cho bang "(2) Thuong HH quan ly" (man 20.14 quan ly).
 *
 * Thuong HH quan ly la MOT SO TIEN CAU HINH CO DINH (`CommissionShare.calculated_amount`,
 * BE tra o `items[].share_full_amount`) nhan voi dial phi cua bang ke ky do
 * (`dial_fee_progress_pct`) — KHONG phai % tren phi moi gioi. Vi vay:
 *
 * - o hang muc hien THANG `amount` cua BE, kem chu thich `cau hinh x % chia dot nay`;
 * - TUYET DOI khong suy nguoc `amount x 100 / payment_progress_pct`. `payment_progress_pct`
 *   la ty le TIEN VE (tien CDT thu trong ky / tong phi moi gioi), mot con so hoan toan
 *   khac: deal HD06-2026-001788 ky 08/2026 thu ve 30,80% trong khi dial dung o 24,2424%,
 *   nen phep chia nguoc thoi 12.121 len 39.354. Cung ly do da cam o
 *   [[getDealRecognisedCommission]] cho bang Muc 1.
 *
 * Hai ty le duoc giu RIENG hai cot tren man hinh, khong the thay the nhau.
 */
export function buildMgmtBonusDealRows(lines: unknown[]): MgmtBonusDealRow[] {
  const groups = new Map<string, MgmtBonusDealRow>()

  lines.forEach((raw, index) => {
    const line = (raw ?? {}) as {
      pct_type?: string | null
      amount?: string | number | null
      share_full_amount?: string | number | null
      source_info?: Record<string, any> | null
    }
    const info = line.source_info || {}
    const key = info.deal_id ? String(info.deal_id) : info.deal_code || `no-deal-${index}`

    let row = groups.get(key)
    if (!row) {
      row = {
        key,
        dealId: info.deal_id,
        dealCode: info.deal_code,
        unitLabel: getDealUnitLabel(info),
        projectName: info.project?.name || info.project_name || '',
        customerName: info.customer?.name || info.customer_name || '',
        cells: emptyCells(),
        configuredTotal: null,
        actualAmount: 0,
        // BE tra 10dp; giu nguyen chuoi va de formatPctFloor cat 2dp mot lan o cho hien thi.
        dialPct: info.dial_fee_progress_pct ?? null,
        paymentProgressPct: Number(info.payment_progress_pct ?? 0),
      }
      groups.set(key, row)
    }

    const amount = Number(line.amount ?? 0)
    const safeAmount = Number.isFinite(amount) ? amount : 0
    row.actualAmount += safeAmount
    row.configuredTotal = addConfigured(row.configuredTotal, line.share_full_amount)

    const category = getMgmtBonusCategory(line.pct_type)
    if (!category) return
    const cell = row.cells[category]
    cell.amount += safeAmount
    cell.configured = addConfigured(cell.configured, line.share_full_amount)
  })

  return [...groups.values()]
}

/**
 * Deal co mang "ma can": `_DealPayableGroup` (sources.*.by_deal) va `_KpiDealRef`
 * (sources.mgmt.kpi[].deal) — hai component khac nhau, cung mot field.
 */
export type DealUnitRef = {
  unit_number?: string | null
  /** Co trong payload nhung KHONG duoc hien thi — xem getDealUnitLabel. */
  unit_code?: string | null
}

/**
 * "Ma can" hien thi duoi ma deal tren cac bang chi tiet HH (Sale / CTV / F2 / quan ly).
 *
 * CHI doc `unit_number` (`ProductInventory.unit_number`, vd `A-12.05`). KHONG fallback ve
 * `unit_code` — do la `ProductInventory.code`, ma ban ghi noi bo dang `BH000002399`, khong
 * phai ma can nghiep vu doc; hien no ra chinh la bug nay. Khong co unit_number thi de trong.
 *
 * Van giu guard runtime: cac man quan ly doc qua `line.source_info` (kieu `any`, co the la
 * chuoi JSON chua parse — xem MonthlySummaryDetailTabs).
 */
export function getDealUnitLabel(deal: DealUnitRef | null | undefined): string | null {
  if (!deal || typeof deal !== 'object') return null
  return deal.unit_number || null
}

export type DealProxyInfo = {
  isProxy: boolean
  original: OriginalBeneficiaryRef | null
}

// Mot deal group la "nhan ho" khi co it nhat 1 item received_on_behalf; lay original cua item dau
// tien lam nhan hien thi (cac item cung 1 RAL recipient trong thuc te).
export function getDealProxyInfo(deal: DealPayableGroup): DealProxyInfo {
  const proxyItem = deal.items?.find((i) => i.received_on_behalf)
  if (!proxyItem) return { isProxy: false, original: null }
  return { isProxy: true, original: proxyItem.original_beneficiary ?? null }
}

export function formatProxyBadgeLabel(original: OriginalBeneficiaryRef | null): string {
  if (!original) return 'Nhận hộ'
  const typeLabel = ORIGINAL_BENEFICIARY_TYPE_LABEL[original.type] || ''
  return `Nhận hộ · ${typeLabel} ${original.name}`.replace('  ', ' ')
}

/**
 * Tên người đứng tên gốc, KHÔNG kèm chữ "Nhận hộ" — "NV Nguyễn Quỳnh Trang".
 *
 * Tách khỏi [[formatProxyBadgeLabel]] để bảng Mục ① xuống được hai dòng: pill ngắn (quan hệ +
 * tỷ lệ) rồi tên ở dòng dưới. Nhồi cả cụm vào một pill thì tên dài như "Nhận hộ · NV Nguyễn
 * Quỳnh Trang · 50%" wrap giữa pill và vỡ luôn viền bo — đúng lỗi bảng kê 45 kỳ 08/2026.
 */
export function formatOriginalOwnerLabel(original: OriginalBeneficiaryRef | null): string {
  if (!original) return 'Không rõ người đứng tên'
  const typeLabel = ORIGINAL_BENEFICIARY_TYPE_LABEL[original.type] || ''
  return `${typeLabel} ${original.name}`.trim()
}

/**
 * Một "nguồn hoa hồng" của người hưởng trên MỘT deal: tiền này vốn là suất của ai, và người
 * hưởng nhận bao nhiêu phần trăm suất đó.
 */
export type DealCommissionSource = {
  /** Khóa gộp: `self` (chính chủ) hoặc `<type>-<id>` của người đứng tên gốc. */
  key: string
  isProxy: boolean
  original: OriginalBeneficiaryRef | null
  /** Nhãn đầy đủ một dòng: "Chính chủ" / "Nhận hộ · NV Bùi Quang Cường" — dùng cho tooltip. */
  label: string
  /** Tên người đứng tên gốc, không kèm "Nhận hộ": "NV Bùi Quang Cường". null khi chính chủ. */
  ownerLabel: string | null
  /** `pct_of_parent` — nhận hộ bao nhiêu % suất của người gốc. null khi BE không có split. */
  proxyPct: number | null
  /** % HH người ĐỨNG TÊN GỐC hưởng trên cả căn (chưa nhân tỷ lệ nhận hộ). */
  effectivePct: number | null
  /** Phần % thực sự thuộc về người hưởng = `effectivePct × proxyPct / 100`. */
  contributedPct: number | null
  /** HH ghi nhận khi tiền về đủ 100% = Σ `share_full_amount × proxyPct / 100`. */
  recognised: number | null
  /** Tiền thực nhận kỳ này của riêng nguồn này = Σ `amount`. */
  actual: number
  items: DealPayableItemWithProxy[]
}

/** `proxy_pct` của một item; mặc định 100 khi BE chưa trả (suất trọn, không phải chia nhỏ). */
function readProxyPct(item: DealPayableItemWithProxy): number {
  const pct = Number(item.proxy_pct ?? NaN)
  return Number.isFinite(pct) ? pct : 100
}

function sourceKey(item: DealPayableItemWithProxy): string {
  if (!item.received_on_behalf) return 'self'
  const original = item.original_beneficiary
  return original ? `${original.type}-${original.id}` : 'proxy-unknown'
}

/**
 * Tách một deal group thành các nguồn HH theo NGƯỜI ĐỨNG TÊN GỐC.
 *
 * BE gom `sources.sale.by_deal` theo `deal_id` (`_append_to_deal_group`) và
 * `_deal_group_header` chỉ nói được cho MỘT `commission_share` — của payable đầu tiên. Đo
 * trên staging summary 42 / deal HD06-2026-000001 / kỳ 08/2026: ba nguồn 0,6300% (nhận hộ
 * 100%), 0,6300% (100%) và 0,5400% (chỉ 60%) đều hiện thành "0,6300%". Hàm này dựng lại các
 * nguồn từ `items[]`, nơi mỗi item mang rate của chính share nó.
 *
 * Thứ tự: giữ nguyên thứ tự xuất hiện của `items` (chính chủ thường đứng trước vì BE trả
 * payable theo id), để bảng không nhảy dòng giữa hai lần render.
 */
export function buildDealCommissionSources(deal: DealPayableGroup): DealCommissionSource[] {
  const map = new Map<string, DealCommissionSource>()

  for (const item of deal.items || []) {
    const key = sourceKey(item)
    let source = map.get(key)
    if (!source) {
      const isProxy = Boolean(item.received_on_behalf)
      source = {
        key,
        isProxy,
        original: item.original_beneficiary ?? null,
        label: isProxy ? formatProxyBadgeLabel(item.original_beneficiary ?? null) : 'Chính chủ',
        ownerLabel: isProxy ? formatOriginalOwnerLabel(item.original_beneficiary ?? null) : null,
        proxyPct: null,
        effectivePct: null,
        contributedPct: null,
        recognised: null,
        actual: 0,
        items: [],
      }
      map.set(key, source)
    }

    source.items.push(item)
    const amount = Number(item.amount)
    if (Number.isFinite(amount)) source.actual += amount

    const proxyPct = readProxyPct(item)
    // Mọi item của cùng một người đứng tên đi qua cùng một split, nên tỷ lệ giống nhau; lấy
    // của item đầu và không ghi đè để một item lạ (không có split) không kéo cả nhóm về 100%.
    if (source.proxyPct === null && item.proxy_pct != null) source.proxyPct = proxyPct

    const shareFull = Number(item.share_full_amount ?? NaN)
    if (Number.isFinite(shareFull)) {
      source.recognised = (source.recognised ?? 0) + (shareFull * proxyPct) / 100
    }

    // % HH đọc từ item HH BÁN HÀNG — cột "% HH" đứng cạnh cột "HH bán hàng", còn thưởng
    // nóng/thưởng CĐT có rate riêng và không phải thứ cột đó nói tới.
    const isSaleItem =
      item.pct_type === APP_CONSTANT_KEY.REALESTATE.COMMISSION_PCT_TYPES.F1_SALE.pct
    if (isSaleItem && source.effectivePct === null) {
      const pct = Number(item.effective_commission_pct ?? NaN)
      if (Number.isFinite(pct) && pct > 0) {
        source.effectivePct = pct
        source.contributedPct = (pct * proxyPct) / 100
      }
    }
  }

  return [...map.values()]
}

/**
 * "HH ghi nhận" của cả dòng deal — hoa hồng người hưởng được nhận khi tiền về ĐỦ 100%.
 *
 * = Σ `share_full_amount × proxy_pct / 100` trên mọi nguồn. Kiểm chứng trên số thật của
 * summary 42: 38.347.964 + 38.347.964 + 32.869.684×60% = 96.417.738, nhân dial 50% ra đúng
 * `subtotal` 48.208.869.
 *
 * KHÔNG dùng `subtotal` cho cột này: `subtotal` là phần ĐÃ hạch toán kỳ này (đã nhân dial),
 * nên in nó ở cả "HH ghi nhận" lẫn "HH thực tế" khiến hai cột "% tiền về" nằm giữa không
 * giải thích được gì — đúng hiện trạng trước 26/08/2026.
 *
 * Trả null khi KHÔNG item nào có `share_full_amount` (payable không gắn share), để ô hiện
 * '—' thay vì số 0 trông như "không có hoa hồng".
 */
export function getDealRecognisedTotal(deal: DealPayableGroup): number | null {
  const sources = buildDealCommissionSources(deal)
  let total = 0
  let hasAny = false
  for (const source of sources) {
    if (source.recognised === null) continue
    hasAny = true
    total += source.recognised
  }
  return hasAny ? total : null
}

/** Tổng "HH ghi nhận" của cả danh sách deal; null khi không deal nào có số. */
export function sumDealRecognisedTotal(deals: DealPayableGroup[]): number | null {
  let total = 0
  let hasAny = false
  for (const deal of deals) {
    const value = getDealRecognisedTotal(deal)
    if (value === null) continue
    hasAny = true
    total += value
  }
  return hasAny ? total : null
}

/**
 * "% HH" của cả dòng deal = Σ `effective_commission_pct × proxy_pct / 100` trên mọi nguồn.
 *
 * Cộng được vì mỗi nguồn là một suất RỜI trên cùng một căn: ba nguồn của summary 42 ra
 * 0,63 + 0,63 + 0,54×60% = 1,5840% — đúng tỷ lệ tiền của người hưởng trên giá tính phí,
 * thay cho 0,6300% (rate của riêng một sale) đang hiện.
 *
 * Trả null khi không nguồn nào có rate — cùng quy tắc '—' của [[getDealEffectiveCommissionPct]]
 * khi share không có rate; TUYỆT ĐỐI không suy % từ tiền.
 */
export function getDealAggregateCommissionPct(deal: DealPayableGroup): number | null {
  const sources = buildDealCommissionSources(deal)
  let total = 0
  let hasAny = false
  for (const source of sources) {
    if (source.contributedPct === null) continue
    hasAny = true
    total += source.contributedPct
  }
  if (hasAny) return total
  // Deal không có item HH bán hàng nào mang rate (chỉ thưởng) — rơi về rate của group header,
  // vẫn đúng khi group chỉ có một nguồn.
  return getDealEffectiveCommissionPct(deal)
}

// BE 2026-07-24: block informational tren detail cua NGUOI HUONG GOC — cac split cua ho
// ma nguoi khac nhan thay. KHONG cong vao bat ky tong nao cua summary nay.
export type RedirectedOutItem = {
  split_id: number
  deal_id: number | null
  deal_code: string | null
  payee: OriginalBeneficiaryRef | null
  amount: string
  status: string
  reason: string
}

export function getRedirectedOutItems(summary: unknown): RedirectedOutItem[] {
  const items = (summary as { redirected_out?: RedirectedOutItem[] })?.redirected_out
  return Array.isArray(items) ? items : []
}

export function sumRedirectedOut(items: RedirectedOutItem[]): number {
  return items.reduce((acc, item) => acc + Number(item.amount || 0), 0)
}

export type RedirectedOutGroup = {
  key: string
  deal_id: number | null
  deal_code: string | null
  payee: OriginalBeneficiaryRef | null
  amount: number
  status: string
  reasons: string[]
  split_count: number
}

// BE tra 1 item / PayoutSplitLine (moi phieu thu 1 split) — man hinh gop theo
// (deal, nguoi nhan) giong bang chia thuc nhan: cong tien, gop ly do, status
// = paid khi TAT CA da chi, nguoc lai confirmed.
export function groupRedirectedOut(items: RedirectedOutItem[]): RedirectedOutGroup[] {
  const map = new Map<string, RedirectedOutGroup>()
  for (const item of items) {
    const payeeKey = item.payee ? `${item.payee.type}-${item.payee.id}` : 'unknown'
    const key = `${item.deal_id ?? 'none'}|${payeeKey}`
    const existing = map.get(key)
    if (!existing) {
      map.set(key, {
        key,
        deal_id: item.deal_id,
        deal_code: item.deal_code,
        payee: item.payee,
        amount: Number(item.amount || 0),
        status: item.status?.toLowerCase?.() || '',
        reasons: item.reason ? [item.reason] : [],
        split_count: 1,
      })
      continue
    }
    existing.amount += Number(item.amount || 0)
    existing.split_count += 1
    const status = item.status?.toLowerCase?.() || ''
    if (status !== existing.status) existing.status = 'confirmed'
    if (item.reason && !existing.reasons.includes(item.reason)) existing.reasons.push(item.reason)
  }
  return Array.from(map.values())
}

// BE 2026-07-24 (backend#2741 double-tax fix): PIT da tam giu luc chi tam ung thuong CDT
// duoc cong nguoc vao thuc nhan (thue da thu tai nguon, khong khau tru lan hai). Field moi,
// schema.ts chua regen — doc qua cast cuc bo; xoa cast nay sau lan regen canonical.
export function getAdvancePitCredit(summary: unknown): number {
  return Number((summary as { advance_pit_credit?: string | number })?.advance_pit_credit || 0)
}

/**
 * Cơ sở tính thuế TNCN hiển thị ở dòng "Thu nhập tính thuế TNCN" (mục ②).
 *
 * = `pre_tax_total` (BE `taxable_total` — Σ MỌI dòng `is_taxable`, KỂ CẢ thưởng
 * `already_paid_externally`) − `pre_tax_hold_amount`.
 *
 * Bug 86eyeg058 (QA báo "tổng thực nhận tính sai", 2026-08-21): FE cũ cộng thêm `bonusTaxOnly`
 * (thưởng `already_paid_externally`) vào công thức này — nhưng `pre_tax_total` từ BE **đã**
 * gồm sẵn khoản đó, nên số hiển thị bị đếm trùng (146.854.545 thay vì đúng 144.854.545 trên
 * bản ghi id=282 kỳ 08/2026 dùng để kiểm chứng). Không nhận thêm tham số bonus ở đây — thêm lại
 * là tái tạo đúng bug này.
 */
export function getTaxableIncomeBase(summary: {
  pre_tax_total?: string | number | null
  pre_tax_hold_amount?: string | number | null
}): number {
  return Math.max(0, Number(summary.pre_tax_total || 0) - Number(summary.pre_tax_hold_amount || 0))
}

export type PayrollInfo = {
  totalIncome: string | null
  insuranceAmount: string | null
  dependentsCount: number | null
  totalDeduction: string | null
  salaryPit: string | null
}

/**
 * 5 số bảng lương hiển thị ở màn chi tiết (CR 86eyeg058) — đọc thẳng `summary.payroll_info`
 * (`_PayrollInfo`, BE `payroll_bridge.read_payroll_display_info`). `null` khi kỳ đó không có
 * phiếu lương DELIVERED khớp (NLĐ chưa lên bảng lương kỳ này, hoặc người hưởng không phải NV).
 */
export function getPayrollInfo(
  summary: components['schemas']['MonthlyBeneficiaryCommissionSummaryDetail']
): PayrollInfo {
  const p = summary.payroll_info
  if (!p) {
    return {
      totalIncome: null,
      insuranceAmount: null,
      dependentsCount: null,
      totalDeduction: null,
      salaryPit: null,
    }
  }

  return {
    totalIncome: p.total_income,
    insuranceAmount: p.insurance_amount,
    dependentsCount: p.dependents_count,
    totalDeduction: p.total_deduction,
    salaryPit: p.pit_amount,
  }
}

/**
 * Hai tỷ lệ "% tiền về" của một deal — GIỮ RIÊNG HAI CỘT, không thay thế nhau được.
 *
 * - `payment_progress_pct` — tiền CĐT **đã thu** trong kỳ / tổng phí môi giới cả deal.
 *   Một SỰ KIỆN THU TIỀN.
 * - `dial_fee_progress_pct` — núm vặn phí kế toán đặt trên bảng chia (deal × kỳ). Đây mới
 *   là tỷ lệ THỰC SỰ sinh ra số tiền phải trả của kỳ.
 *
 * Đo trên dev, deal HD06-2026-001788 kỳ 08/2026: thu **30,80%** trong khi dial đứng ở
 * **24,2424%**. Lấy số này thay số kia là sai tiền, nên BE phục vụ cả hai và màn hình +
 * file Excel đều in cả hai.
 *
 * ⚠️ **Thiếu field thì trả `null`, TUYỆT ĐỐI không mặc định 100%.** Đây đúng là lỗi đã
 * tồn tại tới 25/08/2026: cả `CommCtvMonthlyDetail` lẫn `CommSaleMonthlyDetail` đọc
 * `deal.payout_ratio ?? deal.payout_ratio_snapshot ?? 1.0`, mà **không field nào trong hai
 * cái đó tồn tại** trong `_DealPayableGroup` (`payout_ratio` chỉ có trên khối *promotion
 * distribution*, một nhánh khác hẳn). Biểu thức luôn rơi về `1.0` nên cột "% tiền về" hiện
 * **100,00% cho mọi deal, mọi người** — và vì hai file mang `@ts-nocheck` nên không ai báo.
 *
 * `0` là số THẬT (kỳ chưa có phiếu thu), không phải thiếu dữ liệu — nên chỉ `null`/rỗng/
 * không-phải-số mới trả null.
 */
function readPct(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

/** % tiền CĐT đã thu trong kỳ (đã nhân 100, BE quantize 2 chữ số). */
export function getDealPaymentProgressPct(
  deal: Pick<DealPayableGroup, 'payment_progress_pct'>
): number | null {
  return readPct(deal?.payment_progress_pct)
}

/** % ghi nhận theo núm vặn phí của bảng chia kỳ đó (đã nhân 100). */
export function getDealDialFeeProgressPct(
  deal: Pick<DealPayableGroup, 'dial_fee_progress_pct'>
): number | null {
  return readPct(deal?.dial_fee_progress_pct)
}

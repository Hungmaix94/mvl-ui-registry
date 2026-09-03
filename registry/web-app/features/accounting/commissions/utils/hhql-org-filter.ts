import type { HhqlOrgOptions, OrgOption } from '../components/KpiHhqlOrgFilter'

/**
 * Rút lựa chọn cho bộ lọc mục ② HHQL từ chính các dòng của bảng kê — CR ClickUp 86ey9mytk.
 *
 * Cố ý KHÔNG gọi danh mục tổ chức toàn công ty: một quản lý chỉ ăn HHQL từ vài phòng mình phụ
 * trách, nên dropdown đầy đủ thì gần như lựa chọn nào cũng ra 0 dòng. Rút từ phiếu thì chọn gì
 * cũng có dữ liệu, và bản thân danh sách đã trả lời "phiếu này gồm những phòng nào".
 *
 * Nguồn là `sources.hhql.kpi[]` (đã được làm phẳng vào `lines`), CÙNG một hàm `_kpi_mgmt_source`
 * mà endpoint `hhql-lines` dùng để dựng dòng — nên tập giá trị ở đây và tập BE lọc được luôn
 * khớp. Ai sửa một trong hai bên mà quên bên kia sẽ làm lệch chỗ này.
 */

type OrgRef = { id?: number | null; name?: string | null } | null | undefined

export type HhqlLineForOptions = {
  kpi_branch?: OrgRef
  kpi_block?: OrgRef
  kpi_department?: OrgRef
}

type Draft = Map<number, OrgOption>

const put = (into: Draft, ref: OrgRef, parents: Partial<OrgOption> = {}) => {
  const id = ref?.id
  if (id == null) return
  // Gặp lại cùng id thì giữ bản đầu: tên org không đổi giữa các dòng, còn ghi đè chỉ tổ làm thứ
  // tự phụ thuộc vào dòng cuối cùng đọc được.
  if (into.has(id)) return
  into.set(id, { label: ref?.name || `#${id}`, value: id, ...parents })
}

const sortByLabel = (options: Draft): OrgOption[] =>
  [...options.values()].sort((a, b) => a.label.localeCompare(b.label, 'vi'))

export function buildHhqlOrgOptions(lines: readonly HhqlLineForOptions[]): HhqlOrgOptions {
  const branches: Draft = new Map()
  const blocks: Draft = new Map()
  const departments: Draft = new Map()

  for (const line of lines) {
    const branchId = line.kpi_branch?.id ?? null
    const blockId = line.kpi_block?.id ?? null
    put(branches, line.kpi_branch)
    put(blocks, line.kpi_block, { branchId })
    put(departments, line.kpi_department, { branchId, blockId })
  }

  return {
    branches: sortByLabel(branches),
    blocks: sortByLabel(blocks),
    departments: sortByLabel(departments),
  }
}

/** Có ít nhất 2 lựa chọn ở một cấp nào đó thì bộ lọc mới có việc để làm. */
export function hasSomethingToFilter(options: HhqlOrgOptions): boolean {
  return options.branches.length > 1 || options.blocks.length > 1 || options.departments.length > 1
}

export type HhqlOrgFilterValue = {
  branch: number[]
  block: number[]
  department: number[]
}

export const EMPTY_HHQL_ORG_FILTER: HhqlOrgFilterValue = { branch: [], block: [], department: [] }

/** Tiền tố `hhql_` để section khác của màn chi tiết thêm bộ lọc sau vẫn không giẫm chân nhau. */
export const HHQL_FILTER_PARAM = {
  branch: 'hhql_branch',
  block: 'hhql_block',
  department: 'hhql_department',
} as const

const parseIds = (raw: string | null): number[] =>
  (raw ?? '')
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((n) => Number.isInteger(n) && n > 0)

export function readHhqlFilterFromParams(params: URLSearchParams): HhqlOrgFilterValue {
  return {
    branch: parseIds(params.get(HHQL_FILTER_PARAM.branch)),
    block: parseIds(params.get(HHQL_FILTER_PARAM.block)),
    department: parseIds(params.get(HHQL_FILTER_PARAM.department)),
  }
}

export function writeHhqlFilterToParams(
  params: URLSearchParams,
  value: HhqlOrgFilterValue
): URLSearchParams {
  const next = new URLSearchParams(params)
  for (const key of ['branch', 'block', 'department'] as const) {
    const ids = value[key]
    if (ids.length > 0) next.set(HHQL_FILTER_PARAM[key], ids.join(','))
    else next.delete(HHQL_FILTER_PARAM[key])
  }
  return next
}

export const countHhqlFilters = (value: HhqlOrgFilterValue): number =>
  value.branch.length + value.block.length + value.department.length

/**
 * Tham số gửi lên API. Tên `kpi_*` chứ KHÔNG phải `branch`/`block`/`department`: `get_object()`
 * bên DRF chạy filterset của màn danh sách trước khi lấy bản ghi, nên tham số tên `department`
 * sẽ lọc theo phòng của NGƯỜI HƯỞNG và làm chính bảng kê đang mở biến mất — API trả 404.
 */
export function toHhqlApiParams(value: HhqlOrgFilterValue): {
  kpi_branch?: string
  kpi_block?: string
  kpi_department?: string
} {
  const params: { kpi_branch?: string; kpi_block?: string; kpi_department?: string } = {}
  if (value.branch.length) params.kpi_branch = value.branch.join(',')
  if (value.block.length) params.kpi_block = value.block.join(',')
  if (value.department.length) params.kpi_department = value.department.join(',')
  return params
}

/** Nhãn chip trên thanh trạng thái — cần cả id lẫn tên để bấm ✕ gỡ đúng một giá trị. */
export function activeHhqlChips(
  value: HhqlOrgFilterValue,
  options: HhqlOrgOptions
): { key: keyof HhqlOrgFilterValue; id: number; label: string }[] {
  const pick = (key: keyof HhqlOrgFilterValue, list: OrgOption[]) =>
    value[key].map((id) => ({
      key,
      id,
      label: list.find((o) => o.value === id)?.label ?? `#${id}`,
    }))

  return [
    ...pick('branch', options.branches),
    ...pick('block', options.blocks),
    ...pick('department', options.departments),
  ]
}

import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type ManagementCommissionComputeRequest =
  components['schemas']['ManagementCommissionComputeRequest']

/**
 * Vai quản lý không tìm được người nhận lúc tính — phần hoa hồng của vai đó KHÔNG sinh
 * phiếu và rơi khỏi kỳ. `reason` chỉ đúng ô đang trống để người dùng biết sửa ở đâu.
 */
export type UnresolvedRole = {
  department_id: number
  department_code: string
  department_name: string
  branch_name: string | null
  role: string
  pct_type: string
  source: string
  pct: string
  reason:
    | 'missing_dept_leader'
    | 'missing_block_director'
    | 'missing_branch_director'
    | 'missing_system_config'
  skipped_amount: string
}

// Tên component đổi thành `_ManagementCommissionComputeResult` (thêm gạch dưới) ở lần
// `yarn api:update` ngày 18/08/2026 — drf-spectacular thêm tiền tố `_` cho component chỉ xuất hiện
// lồng bên trong response khác. Tên cũ biến mất khỏi schema nên `yarn type-check` đỏ ngay khi có
// người regen. Đây là tên do generator đặt, có thể đổi tiếp ở lần regen sau.
export type ManagementCommissionComputeResult =
  components['schemas']['_ManagementCommissionComputeResult']

/**
 * Các trường `compute` vừa trả thêm ở BE, chưa có trong `schema.ts` (chỉ sinh lại từ BE đã
 * deploy). Khai riêng thay vì `&` vào type sinh sẵn — AGENTS.md cấm bơm field tự chế vào type
 * schema trong service; nơi dùng tự ép kiểu.
 */
export type ManagementCommissionComputeExtras = {
  unresolved_roles: number
  unresolved_amount: string
  unresolved_detail: UnresolvedRole[]
  salary_period_locked: boolean
  salary_period_status: string | null
}

export type RecomputeBlocker = {
  type: 'period_closed' | 'summary_frozen'
  status: string
  action: 'reopen_period' | 'reopen_summary' | 'kpi_recipient_reassignment'
  detail?: string
  period_id?: number
  summary_id?: number
  beneficiary?: string
  amount?: string
  /** false = tiền đã chi, KHÔNG lùi được — phải bút toán điều chỉnh ở kỳ mở gần nhất */
  reopenable?: boolean
  reason?: string
}

export type RecomputePreflightResult = {
  year: number
  month: number
  can_recompute: boolean
  period_status: string
  /** Không chặn tính lại, nhưng bảng lương sẽ KHÔNG được cập nhật theo */
  salary_period_locked: boolean
  salary_period_status: string | null
  blockers: RecomputeBlocker[]
}

export type ReopenedSummary = {
  summary_id: number
  beneficiary: string
  status: string
  reason?: string
}

export type ReopenSummariesResult = {
  year: number
  month: number
  dry_run: boolean
  reopened: ReopenedSummary[]
  refused: ReopenedSummary[]
}

const PREFLIGHT_PATH = '/api/accounting/management-commission/compute_preflight/'
const REOPEN_SUMMARIES_PATH = '/api/accounting/management-commission/reopen_summaries/'

class ManagementCommissionService extends BaseApiService {
  /**
   * Tính — và tính lại — hoa hồng quản lý của một kỳ. BE chỉ có MỘT action: `compute` xoá sạch
   * kết quả KPI_* của kỳ rồi dựng lại, nên gọi lần hai chính là tính lại. Endpoint
   * `/recompute/` cũ đã bị gỡ ở BE (nó chỉ là `return compute(...)`).
   */
  async compute(data: ManagementCommissionComputeRequest) {
    return await this.post(ApiPaths.accounting_management_commission_compute_create, data)
  }

  /**
   * Những gì đang chặn việc tính lại kỳ này. Chỉ đọc, không đổi gì.
   *
   * `compute` dừng ở chướng ngại ĐẦU TIÊN và ném lỗi trống trơn, nên trước khi mời người dùng
   * bấm "Tính toán" phải hỏi cái này để biết có chặn không, chặn bao nhiêu, và gỡ được không.
   */
  async recomputePreflight(data: ManagementCommissionComputeRequest) {
    return await this.postRawJson<RecomputePreflightResult>(PREFLIGHT_PATH, data)
  }

  /**
   * Mở lại mọi bảng kê đang giữ phiếu KPI của kỳ, để `compute` xoá và dựng lại được.
   * `dry_run` để xem trước — thao tác này gỡ tiền đã chốt nên không được bấm mù.
   */
  async reopenSummaries(data: ManagementCommissionComputeRequest & { dry_run?: boolean }) {
    return await this.postRawJson<ReopenSummariesResult>(REOPEN_SUMMARIES_PATH, data)
  }

  /**
   * POST theo đường dẫn thô. Hai action trên vừa thêm ở BE nên chưa có trong `ApiPaths`;
   * sinh lại `schema.ts` từ BE local sẽ làm lệch cả file (xem `docs/ai/patterns.md`), nên gọi
   * thẳng và ép kiểu tại chỗ cho tới khi BE lên dev.
   */
  private async postRawJson<T>(path: string, body: unknown): Promise<T> {
    const response = (await (this.client.POST as never as (path: string, init: unknown) => unknown)(
      path as never,
      { body }
    )) as { data?: { data?: T } | T; error?: unknown }

    if (response.error) throw response.error
    const payload = response.data as { data?: T } | undefined
    return ((payload && 'data' in payload ? payload.data : payload) ?? {}) as T
  }

  async getManagementCommissionHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.accounting_management_commission_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getManagementCommissionHistory(id: number, logId: string) {
    return await this.get(ApiPaths.accounting_management_commission_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }
}

let _service: ManagementCommissionService | null = null

export function getManagementCommissionService(): ManagementCommissionService {
  if (!_service) _service = new ManagementCommissionService()
  return _service
}

export function useComputeManagementCommission() {
  return useApiMutation(
    (data: ManagementCommissionComputeRequest) => getManagementCommissionService().compute(data),
    {
      mutationKey: QUERY_KEYS.ACCOUNTING.MANAGEMENT_COMMISSION.COMPUTE(),
    }
  )
}

export function useComputePreflight() {
  return useApiMutation(
    (data: ManagementCommissionComputeRequest) =>
      getManagementCommissionService().recomputePreflight(data),
    { mutationKey: QUERY_KEYS.ACCOUNTING.MANAGEMENT_COMMISSION.COMPUTE_PREFLIGHT() }
  )
}

export function useReopenSummariesForPeriod() {
  return useApiMutation(
    (data: ManagementCommissionComputeRequest & { dry_run?: boolean }) =>
      getManagementCommissionService().reopenSummaries(data),
    { mutationKey: QUERY_KEYS.ACCOUNTING.MANAGEMENT_COMMISSION.REOPEN_SUMMARIES() }
  )
}

export function useManagementCommissionHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.MANAGEMENT_COMMISSION.HISTORIES(id, params || {}),
    () => getManagementCommissionService().getManagementCommissionHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useManagementCommissionHistory(
  id: number,
  logId: string,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.ACCOUNTING.MANAGEMENT_COMMISSION.HISTORY_DETAIL(id, logId),
    () => getManagementCommissionService().getManagementCommissionHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

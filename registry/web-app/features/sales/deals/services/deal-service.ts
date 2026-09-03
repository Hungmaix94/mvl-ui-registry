import { BaseApiService } from '@/api/base-service'
import { extractApiData } from '@/api/response-handler.ts'
import { ApiPaths, components, paths } from '@/api/schema.ts'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

/**
 * Các cột "đối chiếu theo hoá đơn" (BE đã có, chờ deploy để `schema.ts` sinh lại).
 *
 * Nguồn tiền là `SalesInvoiceLine` đã ghi sổ (ISSUED/PARTIAL/PAID, chưa void) lọc theo căn,
 * mẫu số là `total_amount` — chính cột "Tổng phí & thưởng" cùng dòng. Nhờ vậy
 * `invoiced_net_amount + remaining_amount === total_amount` và hai cột % cộng đúng 100.
 *
 * KHÁC `reconciliation_rate` / `total_advanced_amount` ở cùng bảng: hai cột đó neo theo tiến độ
 * HD04. Chúng lệch nhau là hợp lệ — mỗi khi có phiếu đối chiếu đã confirm nhưng chưa xuất hoá đơn.
 *
 * `null` ở 2 cột % nghĩa là mẫu số bằng 0 (tỷ lệ không xác định), không phải 0%.
 */
type DealInvoiceReconciliationFields = {
  invoiced_reconciliation_pct?: string | number | null
  invoiced_net_amount?: string | number
  bonus_amount?: string | number
  remaining_amount?: string | number
  remaining_reconciliation_pct?: string | number | null
}

/**
 * Cột "Họ và tên sale tổng hợp" (BE đã có, chờ deploy để `schema.ts` sinh lại).
 *
 * Một phần tử cho MỖI sale có tên trên hợp đồng cọc, tên do BE giải theo
 * `employee → collaborator (CTV) → exchange (sàn)`. Deal F2 vì thế vẫn ra tên sàn — đó là lý do
 * cột này thay được cột "Đại lý" cũ mà không mất thông tin. Xem
 * `utils/sales-participants-summary.ts` cho định dạng hiển thị.
 */
type DealSalesParticipantsSummaryField = {
  sales_participants_summary?: {
    name?: string | null
    participation_percentage?: string | number | null
  }[]
}

export type Deal = components['schemas']['DealList'] &
  DealInvoiceReconciliationFields &
  DealSalesParticipantsSummaryField & { note?: string }
export type DealSalesParticipant = components['schemas']['DealSalesParticipant']
export type CommissionLog = components['schemas']['CommissionShareChangeLog']
export type CommissionShare = components['schemas']['CommissionRecipientRow']
export type DealWorkspaceResponse = any
export type DealWorkspaceCashflowResponse = components['schemas']['DealWorkspaceCashflow']
export type DealCashflowBreakdownResponse = components['schemas']['DealCashflowBreakdown']
export type DealWorkspaceCommissionResponse = components['schemas']['DealWorkspaceCommission']
/**
 * PHẢI là `...WithSummaryList`, KHÔNG phải `PaginatedDealListList`.
 *
 * BE (PR #2852) đặt tên riêng cho wrapper của `/api/sales/deals/` để khối `summary` được khai
 * trong schema công bố. Wrapper cũ `PaginatedDealListList` vẫn tồn tại — nó phục vụ
 * `SalesAllocationViewSet.deals`. Nên nếu để alias trỏ vào tên cũ thì `tsc` vẫn xanh, chỉ có
 * điều `summary` biến mất khỏi kiểu và FE lại phải ép kiểu tay. Không có cảnh báo nào bắt được.
 */
export type PaginatedDealList = components['schemas']['PaginatedDealListWithSummaryList']
/** Khối tổng hợp tính trên TOÀN BỘ tập kết quả sau filter (không phải trang đang xem). */
export type DealListSummary = NonNullable<PaginatedDealList['summary']>
export type CommissionSectionType = 'split' | 'management'

// Lịch sử đối chiếu SCOPE THEO DEAL (không theo mã căn) — tránh kéo nhầm đối chiếu của deal cũ đã
// hủy cọc khi 1 căn được giao dịch lại. Path param `{id}` = deal PK.
export type DealInvestorReconciliationHistoryResponse =
  components['schemas']['PaginatedInvestorReconciliationHistoryList']
export type DealF2ReconciliationHistoryResponse =
  components['schemas']['PaginatedF2ReconciliationHistoryList']
export type DealCTVReconciliationHistoryResponse =
  components['schemas']['PaginatedCTVReconciliationHistoryList']

export interface DealCommissionShareResponse {
  summary: Record<string, any>
  commission_shares: CommissionShare[]
  fee_calculation_price?: string
  raw_data?: components['schemas']['CommissionSectionTable']
}

export type GetDealsParams = paths['/api/sales/deals/']['get']['parameters']['query']
export type ApplyTargetDealRequest = any
export type MarkCompletedDealRequest = NonNullable<
  paths['/api/sales/deals/{id}/mark-completed/']['post']['requestBody']
>['content']['application/json']
export interface OverrideShareRateRequest {
  share_id?: number | string | null
  reason: string
  pct_type?: string | null
  recipient_kind?: string | null
  recipient_id?: number | null
  percentage?: string | number | null
  fixed_amount?: string | number | null
  // Kênh phân số (F2 = 1/3 của một số gốc…) — loại trừ với percentage/fixed_amount.
  // BE tính tiền 1 lần qua resolve_amount() và lưu spec để FE render lại phân số.
  rate_spec?: components['schemas']['RateSpecRequest'] | null
  contribution_percentage?: string | number | null
  attachments?: string[] | null
  attachment_files?: number[] | null
}
export type CtvLineSourceRequest = NonNullable<
  paths['/api/sales/deals/{id}/ctv-line-source/']['post']['requestBody']
>['content']['application/json']
export type ClearShareRequest = NonNullable<
  paths['/api/sales/deals/{id}/shares/split/{share_id}/clear/']['post']['requestBody']
>['content']['application/json']
export type CreateDealCommissionConfigRequest = NonNullable<
  paths['/api/sales/deals/{deal_pk}/commission-config/']['post']['requestBody']
>['content']['application/json']
export type UpdateCommissionFeePriceRequest = NonNullable<
  paths['/api/sales/deals/{id}/update-commission-fee-price/']['post']['requestBody']
>['content']['application/json']

type MutationVariablesWithId<TData = undefined> = {
  id: number
  data?: TData
}

// ----------------------------------------------------------------------

class DealService extends BaseApiService {
  async getDeals(params?: GetDealsParams) {
    return await this.getPaginated(ApiPaths.sales_deals_list, params as any)
  }

  async applyTargetDeal(id: number, data: ApplyTargetDealRequest) {
    return await this.post(ApiPaths.sales_deals_apply_target_create, data, {
      path: { id },
    })
  }

  async getDealCommissionBalance(id: number) {
    return await this.get(ApiPaths.sales_deals_commission_logs_retrieve, { path: { id } })
  }

  async getDealWorkspace(id: number): Promise<DealWorkspaceResponse> {
    const res = await this.get(ApiPaths.sales_deals_workspace_retrieve, { path: { id } })
    return res as unknown as DealWorkspaceResponse
  }

  async getDealWorkspaceCashflow(id: number): Promise<DealWorkspaceCashflowResponse> {
    const res = await this.get(ApiPaths.sales_deals_workspace_cashflow_retrieve, { path: { id } })
    return res as unknown as DealWorkspaceCashflowResponse
  }

  async getDealWorkspaceCashflowBreakdown(id: number): Promise<DealCashflowBreakdownResponse> {
    const res = await this.get(ApiPaths.sales_deals_workspace_cashflow_breakdown_retrieve, {
      path: { id },
    })
    return res as unknown as DealCashflowBreakdownResponse
  }

  async getDealWorkspaceCommission(id: number): Promise<DealWorkspaceCommissionResponse> {
    const res = await this.get(ApiPaths.sales_deals_workspace_commission_retrieve, { path: { id } })
    return res as unknown as DealWorkspaceCommissionResponse
  }

  async getDealCommissionHistory(id: number, section: CommissionSectionType) {
    switch (section) {
      case 'split':
        return await this.get(ApiPaths.sales_deals_commission_history_split_retrieve, {
          path: { id },
        })
      case 'management':
        return await this.get(ApiPaths.sales_deals_commission_history_management_retrieve, {
          path: { id },
        })
      default:
        throw new Error(`Invalid section: ${section}`)
    }
  }

  async markCompletedDeal(id: number, data?: MarkCompletedDealRequest) {
    return await this.post(ApiPaths.sales_deals_mark_completed_create, data ?? { note: '' }, {
      path: { id },
    })
  }

  async overrideShareRate(
    id: number,
    section: CommissionSectionType,
    data: OverrideShareRateRequest
  ) {
    const { share_id, ...payload } = data
    if (section === 'split' && payload.contribution_percentage != null) {
      const isBonusPct =
        payload.pct_type === 'pct_investor_bonus_to_sale' ||
        payload.pct_type === 'pct_mv_bonus_to_sale'
      if (isBonusPct) {
        const num = Number(payload.contribution_percentage)
        if (!isNaN(num)) {
          payload.contribution_percentage = String(num / 100)
        }
      }
    }
    switch (section) {
      case 'split':
        if (share_id) {
          return await this.patch(
            ApiPaths.sales_deals_shares_split_partial_update,
            payload as unknown as components['schemas']['PatchedUpdateShareRequest'],
            {
              path: { id, share_id: String(share_id) },
            }
          )
        }
        return await this.post(
          ApiPaths.sales_deals_shares_split_create,
          payload as unknown as components['schemas']['CreateShareRequest'],
          {
            path: { id },
          }
        )
      case 'management':
        if (share_id) {
          return await this.patch(
            ApiPaths.sales_deals_shares_management_partial_update,
            payload as unknown as components['schemas']['PatchedUpdateShareRequest'],
            {
              path: { id, share_id: String(share_id) },
            }
          )
        }
        return await this.post(
          ApiPaths.sales_deals_shares_management_create,
          payload as unknown as components['schemas']['CreateShareRequest'],
          {
            path: { id },
          }
        )
      default:
        throw new Error(`Invalid section: ${section}`)
    }
  }

  async ctvLineSourceCreate(id: number, data: CtvLineSourceRequest) {
    return await this.post(ApiPaths.sales_deals_ctv_line_source_create, data, { path: { id } })
  }

  async getDealRevenueAllocations(id: number) {
    return await this.get(ApiPaths.sales_deals_revenue_allocations_retrieve, { path: { id } })
  }

  async getDealSalesParticipants(id: number) {
    return await this.get(ApiPaths.sales_deals_sales_participants_list, { path: { id } })
  }

  async getDealCommissionLogs(id: number) {
    return await this.get(ApiPaths.sales_deals_commission_logs_retrieve, { path: { id } })
  }

  async getDealRateChangeHistory(id: number) {
    return await this.get(ApiPaths.sales_deals_rate_change_history_retrieve, { path: { id } })
  }

  async getDealCommissionConfigList(id: number) {
    return await this.get(ApiPaths.sales_deals_commission_config_list, { path: { deal_pk: id } })
  }

  // Tạo (snapshot lại) cấu hình HH cho deal — path param là deal_pk.
  async createDealCommissionConfig(id: number, data: CreateDealCommissionConfigRequest) {
    return await this.post(ApiPaths.sales_deals_commission_config_create, data, {
      path: { deal_pk: id },
    })
  }

  async updateDealCommissionFeePrice(id: number, data: UpdateCommissionFeePriceRequest) {
    return await this.post(ApiPaths.sales_deals_update_commission_fee_price_create, data, {
      path: { id },
    })
  }

  async getDealCommissionShares(
    id: number,
    section: CommissionSectionType
  ): Promise<DealCommissionShareResponse> {
    let res: any
    switch (section) {
      case 'split':
        res = await this.get(ApiPaths.sales_deals_commission_shares_split_retrieve, {
          path: { id },
        })
        break
      case 'management':
        res = await this.get(ApiPaths.sales_deals_commission_shares_management_retrieve, {
          path: { id },
        })
        break
      default:
        throw new Error(`Invalid section: ${section}`)
    }

    let commission_shares: any[] = []
    let summary: any = {}
    let extraData: any = {}

    // Handle CommissionSectionTable structure
    // Note: res is already unwrapped by extractApiData, so it's the CommissionSectionTable directly
    const isSplitResponse = section === 'split' && res?.rows && res?.columns !== undefined
    const isOtherSectionResponse = section !== 'split' && res?.rows
    const tableData = isSplitResponse || isOtherSectionResponse ? res : null

    if (tableData && tableData.rows) {
      const rowsArray = Array.isArray(tableData.rows)
        ? tableData.rows
        : Object.values(tableData.rows)

      const buildRecipientKey = (row: any, index: number) => {
        if (row.employee?.id) return `emp_${row.employee.id}`
        if (row.collaborator?.id) return `col_${row.collaborator.id}`
        if (row.exchange?.id) return `exc_${row.exchange.id}`
        if (row.recipient_kind) return `kind_${row.recipient_kind}`
        return `unknown_${index}`
      }

      if (section === 'split') {
        const splitRows = rowsArray as components['schemas']['CommissionSplitRow'][]
        splitRows.forEach((row, index) => {
          let key = buildRecipientKey(row, index)

          const details: Record<string, any> = {}
          if (row.commissions) {
            for (const [pct_type, cell] of Object.entries(row.commissions)) {
              if (cell) {
                details[pct_type] = {
                  share_id: cell.share_id,
                  id: cell.share_id,
                  pct_type,
                  contribution_percentage:
                    (pct_type === 'pct_investor_bonus_to_sale' ||
                      pct_type === 'pct_mv_bonus_to_sale') &&
                    cell.contribution_percentage != null
                      ? String(Number(cell.contribution_percentage) * 100)
                      : cell.contribution_percentage,
                  actual_rate_percentage: cell.rate,
                  percentage: cell.rate,
                  rate_spec: cell.rate_spec ?? null,
                  calculated_amount: cell.amount,
                  is_custom_override: cell.is_custom_override,
                  fixed_amount: cell.is_custom_override ? cell.amount : null,
                  label: cell.label,
                  is_active: true,
                  employee: row.employee,
                  collaborator: row.collaborator,
                  exchange: row.exchange,
                  department: row.department,
                  position: row.position,
                  recipient_kind: row.recipient_kind,
                }
              }
            }
          }

          commission_shares.push({
            id: key,
            employee: row.employee,
            collaborator: row.collaborator,
            exchange: row.exchange,
            department: row.department,
            position: row.position,
            recipient_kind: row.recipient_kind,
            // Nguồn F2 THEO TỪNG DÒNG (86eya66m0). Map này là DANH SÁCH TRẮNG: field nào không
            // liệt kê ở đây thì không bao giờ tới được Mục 05, dù BE đã trả. Thiếu 2 field dưới
            // đây, dòng F2 rơi về mặc định `linked` và hiện "Nguồn sàn liên kết" cho MỌI giao dịch.
            f2_source: row.f2_source,
            f2_source_director_detail: row.f2_source_director_detail,
            // v3 (18.8): cờ khoản cắt khách — màn tạm ứng map dòng này sang recipient_collaborator
            is_customer_cut: row.is_customer_cut,
            // giữ đúng field khai báo trên CommissionRecipientRow để consumer đọc typed
            calculated_amount: String(row.totals?.amount || 0),
            total_calculated_amount: Number(row.totals?.amount || 0),
            details,
          })
        })
        summary = {
          calculated_amount: tableData.totals?.amount || '0',
          in_house_amount: String(
            commission_shares
              .filter((s) => !s.exchange && !s.collaborator)
              .reduce((sum, s) => sum + Number(s.total_calculated_amount || 0), 0)
          ),
        }
        const rawDataWithCalculatedAmount = {
          ...tableData,
          totals: {
            ...tableData.totals,
            calculated_amount: tableData.totals?.amount || '0',
          },
        }
        extraData = {
          fee_calculation_price: tableData.fee_calculation_price,
          raw_data: rawDataWithCalculatedAmount,
        }
      } else {
        const grouped: Record<string, any> = {}
        for (const row of rowsArray) {
          if (row && (row as any).recipients) {
            const recipientsArray = Array.isArray((row as any).recipients)
              ? (row as any).recipients
              : Object.values((row as any).recipients)
            for (const rec of recipientsArray as (CommissionShare & {
              fixed_amount?: string | null
            })[]) {
              let key = buildRecipientKey(rec, 0)
              if (key.startsWith('unknown_')) key = `share_${rec.share_id}`

              if (!grouped[key]) {
                grouped[key] = {
                  id: key, // Using unique key as row id
                  employee: rec.employee,
                  collaborator: rec.collaborator,
                  exchange: rec.exchange,
                  department: rec.department,
                  position: rec.position,
                  recipient_kind: rec.recipient_kind,
                  total_calculated_amount: 0,
                  details: {},
                }
              }

              grouped[key].details[row.pct_type] = {
                share_id: rec.share_id,
                id: rec.share_id, // alias for UI components expecting id
                pct_type: row.pct_type,
                contribution_percentage: rec.contribution_percentage,
                actual_rate_percentage: rec.actual_rate_percentage,
                percentage: rec.actual_rate_percentage,
                calculated_amount: rec.calculated_amount,
                is_custom_override: rec.is_custom_override,
                fixed_amount: rec.fixed_amount || null,
                label: row.label,
                is_active: true,
                // Include recipient references for EditableCommissionCell header
                employee: rec.employee,
                collaborator: rec.collaborator,
                exchange: rec.exchange,
                department: rec.department,
                position: rec.position,
                recipient_kind: rec.recipient_kind,
              }

              grouped[key].total_calculated_amount += Number(rec.calculated_amount || 0)
            }
          }
        }
        commission_shares = Object.values(grouped)
        summary = tableData.totals || {}
        extraData = { fee_calculation_price: tableData.fee_calculation_price, raw_data: tableData }
      }
    } else if (Array.isArray(res)) {
      commission_shares = res
    } else if (res && Array.isArray(res.results)) {
      commission_shares = res.results
      summary = res.summary || {}
    } else if (res && Array.isArray(res.commission_shares)) {
      commission_shares = res.commission_shares
      summary = res.summary || {}
    } else if (res && Array.isArray(res.data)) {
      // If res is { data: [...] }
      commission_shares = res.data
      summary = res.summary || {}
    } else if (res) {
      // Fallback if the object is something else
      commission_shares = res.commission_shares || res.data || []
      summary = res.summary || {}
    }

    return { summary, commission_shares, ...extraData } as unknown as DealCommissionShareResponse
  }

  async clearDealManagementShare(id: number, shareId: string, data: ClearShareRequest) {
    return await this.post(ApiPaths.sales_deals_shares_management_clear_create, data, {
      path: { id, share_id: shareId },
    })
  }

  async clearDealSplitShare(id: number, shareId: string, data: ClearShareRequest) {
    return await this.post(ApiPaths.sales_deals_shares_split_clear_create, data, {
      path: { id, share_id: shareId },
    })
  }

  async getDealHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.sales_deals_histories_retrieve, {
      path: { id: String(id) },
      query: params,
    })
  }

  async getDealHistory(id: number, logId: string) {
    return await this.get(ApiPaths.sales_deals_history_retrieve, {
      path: { id: String(id), log_id: logId },
    })
  }

  // Lịch sử đối chiếu theo DEAL — scope đúng theo giao dịch hiện tại (không lẫn deal cũ của cùng căn).
  async getDealInvestorReconciliationHistory(id: number) {
    return await this.get(ApiPaths.sales_deals_investor_reconciliation_history_list, {
      path: { id },
    })
  }

  async getDealF2ReconciliationHistory(id: number) {
    return await this.get(ApiPaths.sales_deals_f2_reconciliation_history_list, {
      path: { id },
    })
  }

  async getDealCTVReconciliationHistory(id: number) {
    return await this.get(ApiPaths.sales_deals_ctv_reconciliation_history_list, {
      path: { id },
    })
  }

  /**
   * Export BC chi tiết bảng hàng (full cột).
   * Endpoint dùng ExportXLSXMixin: trả JSON envelope { success, data } bọc quanh
   * { task_id } (async) hoặc { file_url,... } (delivery=link). PHẢI bóc envelope qua
   * extractApiData như mọi service khác để useExport đọc được `task_id` ở cấp cao nhất
   * → bật polling `/api/export/status/`. Trả nguyên envelope sẽ khiến task_id = undefined
   * và dialog kẹt ở "pending" (không polling).
   * NOTE: endpoint chưa có trong schema.ts; sau khi BE deploy + `yarn api:update:local`,
   * chuyển sang dùng ApiPaths.sales_deals_export_retrieve.
   */
  async exportDeals(params: Record<string, unknown>): Promise<Record<string, unknown>> {
    const response = await (
      this.client.GET as unknown as (
        path: string,
        init: unknown
      ) => Promise<{ data?: Record<string, unknown>; error?: unknown; response?: Response }>
    )('/api/sales/deals/export/', {
      params: { query: params },
    })

    if (response.error) {
      throw this.withStatus(response)
    }

    return extractApiData<Record<string, unknown>>(response)
  }
}

let _dealService: DealService | null = null

export function getDealService(): DealService {
  if (!_dealService) _dealService = new DealService()
  return _dealService
}

// ----------------------------------------------------------------------
// Hooks
// ----------------------------------------------------------------------

export function useDeals(params?: GetDealsParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'deals', 'list', JSON.stringify(params || {})],
    () => getDealService().getDeals(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useDealWorkspace(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'deals', 'workspace', id],
    () => getDealService().getDealWorkspace(id),
    {
      enabled: !!id && (options?.enabled ?? true),
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useDealWorkspaceCashflow(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'deals', 'workspace', 'cashflow', id],
    () => getDealService().getDealWorkspaceCashflow(id),
    {
      enabled: !!id && (options?.enabled ?? true),
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useDealWorkspaceCashflowBreakdown(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'deals', 'workspace', 'cashflow-breakdown', id],
    () => getDealService().getDealWorkspaceCashflowBreakdown(id),
    {
      enabled: !!id && (options?.enabled ?? true),
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useDealWorkspaceCommission(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'deals', 'workspace', 'commission', id],
    () => getDealService().getDealWorkspaceCommission(id),
    {
      enabled: !!id && (options?.enabled ?? true),
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useApplyTargetDeal() {
  return useApiMutation((variables: { id: number; data: ApplyTargetDealRequest }) =>
    getDealService().applyTargetDeal(variables.id, variables.data)
  )
}

export function useDealCommissionBalance(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'deals', id, 'commission-balance'],
    () => getDealService().getDealCommissionBalance(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useDealCommissionHistory(
  id: number,
  section: CommissionSectionType,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['sales', 'deals', id, 'commission-history', section],
    () => getDealService().getDealCommissionHistory(id, section),
    { enabled: !!id && !!section && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useMarkCompletedDeal() {
  return useApiMutation((variables: MutationVariablesWithId<MarkCompletedDealRequest>) =>
    getDealService().markCompletedDeal(variables.id, variables.data)
  )
}

export function useOverrideShareRate() {
  return useApiMutation(
    (variables: { id: number; section: CommissionSectionType; data: OverrideShareRateRequest }) =>
      getDealService().overrideShareRate(variables.id, variables.section, variables.data)
  )
}

export function useCtvLineSourceCreate() {
  return useApiMutation((variables: { id: number; data: CtvLineSourceRequest }) =>
    getDealService().ctvLineSourceCreate(variables.id, variables.data)
  )
}

export function useDealRevenueAllocations(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'deals', id, 'revenue-allocations'],
    () => getDealService().getDealRevenueAllocations(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useDealSalesParticipants(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'deals', id, 'sales-participants'],
    () => getDealService().getDealSalesParticipants(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useDealCommissionLogs(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'deals', id, 'commission-logs'],
    () => getDealService().getDealCommissionLogs(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useDealRateChangeHistory(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'deals', id, 'rate-change-history'],
    () => getDealService().getDealRateChangeHistory(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useDealCommissionConfigList(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'deals', id, 'commission-config-list'],
    () => getDealService().getDealCommissionConfigList(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useDealCommissionShares(
  id: number,
  section: CommissionSectionType,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['sales', 'deals', id, 'commission-shares', section],
    () => getDealService().getDealCommissionShares(id, section),
    { enabled: !!id && !!section && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateDealCommissionConfig() {
  return useApiMutation((variables: { id: number; data: CreateDealCommissionConfigRequest }) =>
    getDealService().createDealCommissionConfig(variables.id, variables.data)
  )
}

export function useUpdateDealCommissionFeePrice() {
  return useApiMutation((variables: { id: number; data: UpdateCommissionFeePriceRequest }) =>
    getDealService().updateDealCommissionFeePrice(variables.id, variables.data)
  )
}

export function useClearDealManagementShare() {
  return useApiMutation((variables: { id: number; shareId: string; data: ClearShareRequest }) =>
    getDealService().clearDealManagementShare(variables.id, variables.shareId, variables.data)
  )
}

export function useClearDealSplitShare() {
  return useApiMutation((variables: { id: number; shareId: string; data: ClearShareRequest }) =>
    getDealService().clearDealSplitShare(variables.id, variables.shareId, variables.data)
  )
}

export function useDealHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['sales', 'deals', id, 'histories', JSON.stringify(params || {})],
    () => getDealService().getDealHistories(id, params),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useDealHistory(id: number, logId: string, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'deals', id, 'history-detail', logId],
    () => getDealService().getDealHistory(id, logId),
    { enabled: !!id && !!logId && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useClearShareRate() {
  return useApiMutation(
    (variables: {
      id: number
      section: CommissionSectionType
      shareId: string
      data: ClearShareRequest
    }) => {
      switch (variables.section) {
        case 'split':
          return getDealService().clearDealSplitShare(
            variables.id,
            variables.shareId,
            variables.data
          )
        case 'management':
          return getDealService().clearDealManagementShare(
            variables.id,
            variables.shareId,
            variables.data
          )
        default:
          throw new Error(`Invalid section: ${variables.section}`)
      }
    }
  )
}

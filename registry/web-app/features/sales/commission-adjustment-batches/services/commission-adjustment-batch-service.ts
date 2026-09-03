/**
 * LAD service — Lô Áp Dụng (Điều chỉnh hoa hồng theo lô).
 *
 * Wraps `/api/sales/commission-adjustment-batches/` + sub-routes. Mirrors the investor-reconciliation
 * service: extends BaseApiService, types from generated `paths`, lazy singleton, React Query hooks.
 *
 * base-service signatures used here (verified):
 *   getPaginated(path, queryParams, pathParams)   ← pathParams is the 3rd POSITIONAL arg
 *   post(path, body|undefined, { path })          ← body may be undefined for action endpoints
 *   patch(path, body, { path })  ·  delete(path, { path })
 * Line ops path = { id: number, line_id: string }  (line_id is a STRING in the schema).
 */
import { useQueryClient } from '@tanstack/react-query'
import { BaseApiService } from '@/api/base-service'
import { extractApiData } from '@/api/response-handler'
import { ApiPaths, components } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type {
  ApproveLadRequest,
  CreateLadBatchRequest,
  CreateLadLineRequest,
  GetLadF2sParams,
  GetLadLinesParams,
  LadBatchListQuery,
  PatchLadBatchRequest,
  PatchLadLineRequest,
  RejectLadRequest,
} from '../types/lad-types'

export type UpdateLadBatchRequest = components['schemas']['CommissionAdjustmentBatchUpdateDocRequest']
export type LadImportResult = components['schemas']['LadImportResult']

class CommissionAdjustmentBatchService extends BaseApiService {
  // --- Batches ---
  async getBatches(params?: LadBatchListQuery) {
    return await this.getPaginated(ApiPaths.sales_commission_adjustment_batches_list, params)
  }

  async getBatch(id: number) {
    return await this.get(ApiPaths.sales_commission_adjustment_batches_retrieve, { path: { id } })
  }

  async createBatch(data: CreateLadBatchRequest) {
    return await this.post(ApiPaths.sales_commission_adjustment_batches_create, data)
  }

  async updateBatch(id: number, data: UpdateLadBatchRequest) {
    return await this.put(ApiPaths.sales_commission_adjustment_batches_update, data, {
      path: { id },
    })
  }

  async patchBatch(id: number, data: PatchLadBatchRequest) {
    return await this.patch(ApiPaths.sales_commission_adjustment_batches_partial_update, data, {
      path: { id },
    })
  }

  // Tóm tắt cấu hình HH hiện hành của các GD trong lô (so sánh trước khi áp dụng).
  async getCurrentConfigSummary(id: number) {
    return await this.get(
      ApiPaths.sales_commission_adjustment_batches_current_config_summary_retrieve,
      { path: { id } }
    )
  }

  async deleteBatch(id: number) {
    return await this.delete(ApiPaths.sales_commission_adjustment_batches_destroy, { path: { id } })
  }

  // --- Workflow actions ---
  async preview(id: number) {
    return await this.post(ApiPaths.sales_commission_adjustment_batches_preview_create, undefined, {
      path: { id },
    })
  }

  async submit(id: number) {
    return await this.post(ApiPaths.sales_commission_adjustment_batches_submit_create, undefined, {
      path: { id },
    })
  }

  async approve(id: number, data: ApproveLadRequest = {}) {
    return await this.post(ApiPaths.sales_commission_adjustment_batches_approve_create, data, {
      path: { id },
    })
  }

  async reject(id: number, data: RejectLadRequest) {
    return await this.post(ApiPaths.sales_commission_adjustment_batches_reject_create, data, {
      path: { id },
    })
  }

  async clone(id: number) {
    return await this.post(ApiPaths.sales_commission_adjustment_batches_clone_create, undefined, {
      path: { id },
    })
  }

  // Đưa lô từ pending về draft (chỉ khi chưa duyệt).
  async revertToDraft(id: number) {
    return await this.post(
      ApiPaths.sales_commission_adjustment_batches_revert_to_draft_create,
      undefined,
      { path: { id } }
    )
  }

  // --- F2s (sàn liên kết bị ảnh hưởng) ---
  // Một dòng / F2 tham gia (qua CommissionShare) trong các GD không-loại-trừ của lô, kèm rate
  // hiện hành (HH/thưởng/khấu trừ). is_uniform=false ⇒ các GD của F2 mang % khác nhau.
  async getF2s(id: number, params?: GetLadF2sParams) {
    return await this.getPaginated(ApiPaths.sales_commission_adjustment_batches_f2s_list, params, {
      id,
    })
  }

  // --- Lines (GD trong lô) ---
  async getLines(id: number, params?: GetLadLinesParams) {
    return await this.getPaginated(
      ApiPaths.sales_commission_adjustment_batches_lines_list,
      params,
      { id }
    )
  }

  async createLine(id: number, data: CreateLadLineRequest) {
    return await this.post(ApiPaths.sales_commission_adjustment_batches_lines_create, data, {
      path: { id },
    })
  }

  // Import GD vào lô từ file .xlsx/.csv (cột deal_code + note tuỳ chọn).
  // Endpoint nhận multipart/form-data thuần (schema khai báo binary là `file: string`)
  // nên không đi qua this.post (chỉ serialize JSON). Body typed thoả schema; file thật
  // được gửi qua bodySerializer — openapi-fetch tự bỏ Content-Type JSON khi body là
  // FormData để browser tự đặt multipart boundary.
  async importLines(id: number, file: File) {
    const response = await this.client.POST(
      ApiPaths.sales_commission_adjustment_batches_lines_import_create,
      {
        params: { path: { id } },
        body: { file: file.name },
        bodySerializer: () => {
          const formData = new FormData()
          formData.append('file', file)
          return formData
        },
      }
    )
    if (response.error) throw response.error
    return extractApiData<LadImportResult>(response)
  }

  async patchLine(id: number, lineId: number, data: PatchLadLineRequest) {
    return await this.patch(
      ApiPaths.sales_commission_adjustment_batches_lines_partial_update,
      data,
      { path: { id, line_id: String(lineId) } }
    )
  }

  async deleteLine(id: number, lineId: number) {
    return await this.delete(ApiPaths.sales_commission_adjustment_batches_lines_destroy, {
      path: { id, line_id: String(lineId) },
    })
  }
}

// ----------------------------------------------------------------------
// Lazy singleton
// ----------------------------------------------------------------------
let _service: CommissionAdjustmentBatchService | null = null
export function getLadService(): CommissionAdjustmentBatchService {
  if (!_service) _service = new CommissionAdjustmentBatchService()
  return _service
}

// ----------------------------------------------------------------------
// Queries
// ----------------------------------------------------------------------
export function useLadBatches(params?: LadBatchListQuery, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.SALES.COMMISSION_ADJUSTMENT_BATCH.LIST(params ?? {}),
    () => getLadService().getBatches(params),
    { enabled: options?.enabled ?? true }
  )
}

export function useLadBatch(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.SALES.COMMISSION_ADJUSTMENT_BATCH.DETAIL(id),
    () => getLadService().getBatch(id),
    { enabled: (options?.enabled ?? true) && id > 0 }
  )
}

export function useLadLines(
  id: number,
  params?: GetLadLinesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.COMMISSION_ADJUSTMENT_BATCH.LINES(id, params ?? {}),
    () => getLadService().getLines(id, params),
    { enabled: (options?.enabled ?? true) && id > 0 }
  )
}

export function useLadF2s(id: number, params?: GetLadF2sParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.SALES.COMMISSION_ADJUSTMENT_BATCH.F2S(id, params ?? {}),
    () => getLadService().getF2s(id, params),
    { enabled: (options?.enabled ?? true) && id > 0 }
  )
}

export function useLadCurrentConfigSummary(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.SALES.COMMISSION_ADJUSTMENT_BATCH.CURRENT_CONFIG_SUMMARY(id),
    () => getLadService().getCurrentConfigSummary(id),
    { enabled: (options?.enabled ?? true) && id > 0 }
  )
}

// ----------------------------------------------------------------------
// Mutations
// ----------------------------------------------------------------------
export function useCreateLadBatch() {
  return useApiMutation((data: CreateLadBatchRequest) => getLadService().createBatch(data))
}

export function usePatchLadBatch() {
  const queryClient = useQueryClient()
  // Draft edits (payload_snapshot / reason / filter_criteria / last_modified_step) must NOT fire the
  // default app-wide invalidateQueries() — that refetches me/permissions/constants/SA/tbc… (a storm).
  // But we DO need to refresh THIS batch's read model: each wizard step re-seeds its local state from
  // `batch` on (re)mount, and the detail view reads the same DETAIL(id) cache. Without a targeted
  // refresh, the 5-min global staleTime serves stale data → edits look reverted on back-nav / detail.
  return useApiMutation(
    (vars: { id: number; data: PatchLadBatchRequest }) =>
      getLadService().patchBatch(vars.id, vars.data),
    {
      skipInvalidateOnSuccess: true,
      onSuccess: (_data, vars) => {
        void queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.SALES.COMMISSION_ADJUSTMENT_BATCH.DETAIL(vars.id),
        })
      },
    }
  )
}

export function useUpdateLadBatch() {
  return useApiMutation((vars: { id: number; data: UpdateLadBatchRequest }) =>
    getLadService().updateBatch(vars.id, vars.data)
  )
}

export function useDeleteLadBatch() {
  return useApiMutation((id: number) => getLadService().deleteBatch(id))
}

export function usePreviewLad() {
  return useApiMutation((id: number) => getLadService().preview(id), {
    skipInvalidateOnSuccess: true,
  })
}

export function useSubmitLad() {
  return useApiMutation((id: number) => getLadService().submit(id))
}

export function useApproveLad() {
  return useApiMutation((vars: { id: number; data?: ApproveLadRequest }) =>
    getLadService().approve(vars.id, vars.data)
  )
}

export function useRejectLad() {
  return useApiMutation((vars: { id: number; data: RejectLadRequest }) =>
    getLadService().reject(vars.id, vars.data)
  )
}

export function useCloneLad() {
  return useApiMutation((id: number) => getLadService().clone(id))
}

export function useRevertLadToDraft() {
  return useApiMutation((id: number) => getLadService().revertToDraft(id))
}

export function useImportLadLines() {
  return useApiMutation((vars: { id: number; file: File }) =>
    getLadService().importLines(vars.id, vars.file)
  )
}

export function useCreateLadLine() {
  return useApiMutation((vars: { id: number; data: CreateLadLineRequest }) =>
    getLadService().createLine(vars.id, vars.data)
  )
}

export function usePatchLadLine() {
  return useApiMutation((vars: { id: number; lineId: number; data: PatchLadLineRequest }) =>
    getLadService().patchLine(vars.id, vars.lineId, vars.data)
  )
}

export function useDeleteLadLine() {
  return useApiMutation((vars: { id: number; lineId: number }) =>
    getLadService().deleteLine(vars.id, vars.lineId)
  )
}

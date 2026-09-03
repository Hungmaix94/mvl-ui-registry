import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

export type FeeSupportRequest = components['schemas']['FeeSupportRequest'] & {
  project_detail?: components['schemas']['ProjectNested'] | null
  project_name?: string | null
  product_inventory_detail?: components['schemas']['ProductInventoryNested'] | null
  unit_number?: string | null
}
export type FeeSupportCalculation = components['schemas']['FeeSupportCalculation']
export type FeeSupportCalculationRow = components['schemas']['FeeSupportCalculationRow']
export type FeeSupportRequestLine = components['schemas']['FeeSupportRequestLine']
export type FeeSupportConfirmationLog = components['schemas']['FeeSupportConfirmationLog']
export type FeeSupportRequestBrief = components['schemas']['FeeSupportRequestBrief']
export type FeeSupportRequestCreateRequest = components['schemas']['FeeSupportRequestCreateRequest']
export type FeeSupportRequestEditRequest =
  components['schemas']['PatchedFeeSupportRequestEditRequest']
export type FeeSupportRejectRequest = components['schemas']['FeeSupportRejectRequest']
export type FeeSupportWithdrawRequest = components['schemas']['FeeSupportWithdrawRequest']
export type FeeSupportSupplementDocumentsRequest =
  components['schemas']['FeeSupportSupplementDocumentsRequest']
export type FeeSupportDocumentRejectRequest =
  components['schemas']['FeeSupportDocumentRejectRequest']
export type FeeSupportHoldReleaseRequest = components['schemas']['FeeSupportHoldReleaseRequest']
export type GetFeeSupportRequestsParams =
  paths['/api/sales/fee-support-requests/']['get']['parameters']['query']

/**
 * Web dùng list/retrieve/create/approve/reject + PATCH sửa (86eyqf9m3 — creator
 * sửa phiếu web_secretary của chính mình khi còn DRAFT/PENDING_TP_ADMIN, khoá từ
 * APPROVED trở đi). Destroy vẫn là dead path (BE không có DELETE); BR7 (từ chối là
 * terminal, tạo phiếu mới thay vì sửa lại) không đổi — edit chỉ mở cho giai đoạn
 * TRƯỚC khi có quyết định duyệt/từ chối.
 */
class FeeSupportRequestService extends BaseApiService {
  async getList(params?: GetFeeSupportRequestsParams) {
    return await this.getPaginated(ApiPaths.sales_fee_support_requests_list, params)
  }

  async getById(id: number) {
    return await this.get(ApiPaths.sales_fee_support_requests_retrieve, { path: { id } })
  }

  /**
   * Nhật ký xác nhận / duyệt từng cấp. Đây là endpoint CON — serializer của phiếu
   * KHÔNG nhúng `confirmation_logs` như HĐ cọc / phiếu TT giao dịch / hoàn cọc,
   * nên màn chi tiết phải gọi riêng chứ không đọc ra từ `record`.
   */
  async getConfirmationLogs(requestId: number) {
    return await this.getPaginated(
      ApiPaths.sales_fee_support_requests_confirmation_logs_list,
      undefined,
      { request_pk: requestId }
    )
  }

  async create(data: FeeSupportRequestCreateRequest) {
    return await this.post(ApiPaths.sales_fee_support_requests_create, data)
  }

  /**
   * 86eyqf9m3 — creator sửa phiếu web_secretary của chính mình khi còn
   * DRAFT/PENDING_TP_ADMIN. BE gate ownership + status trong service
   * (`fee_support_service._authorize_edit`, nhánh `web_creator`) — sai chủ/sai
   * trạng thái trả 400, không phải 403/404.
   */
  async update(id: number, data: FeeSupportRequestEditRequest) {
    return await this.patch(ApiPaths.sales_fee_support_requests_partial_update, data, {
      path: { id },
    })
  }

  /** Duyệt cấp hiện hành theo origin của phiếu (BE tự đẩy bước) — POST không body. */
  async approve(id: number) {
    return await this.post(ApiPaths.sales_fee_support_requests_approve_create, undefined, {
      path: { id },
    })
  }

  /** Từ chối (terminal, D13) — bắt buộc reason. */
  async reject(id: number, data: FeeSupportRejectRequest) {
    return await this.post(ApiPaths.sales_fee_support_requests_reject_create, data, {
      path: { id },
    })
  }

  /** Thu hồi phiếu (dùng khi bỏ tick "đề xuất hỗ trợ phí" trên HĐ cọc) — cần reason. */
  async withdraw(id: number, data: FeeSupportWithdrawRequest) {
    return await this.post(ApiPaths.sales_fee_support_requests_withdraw_create, data, {
      path: { id },
    })
  }

  /**
   * v3 — Bổ sung hồ sơ và/hoặc người-nhận-hộ. Bước TỰ DO (trước/trong/sau duyệt
   * chủ trương, tới khi kế toán duyệt hồ sơ); mỗi call cần ≥1 trong 2 khối.
   * KHÔNG chạm chia hoa hồng — proxy chỉ được ghi nhận, tiền đổi người nhận
   * lúc kế toán approve-documents.
   */
  async supplementDocuments(id: number, data: FeeSupportSupplementDocumentsRequest) {
    return await this.post(ApiPaths.sales_fee_support_requests_supplement_documents_create, data, {
      path: { id },
    })
  }

  /** v3 — Kế toán duyệt hồ sơ (tiền đề: cọc đã duyệt + phiếu approved) → nhả gate D22. */
  async approveDocuments(id: number) {
    return await this.post(
      ApiPaths.sales_fee_support_requests_approve_documents_create,
      undefined,
      {
        path: { id },
      }
    )
  }

  /** v3 — Kế toán yêu cầu bổ sung hồ sơ (reason bắt buộc) → needs_supplement. */
  async rejectDocuments(id: number, data: FeeSupportDocumentRejectRequest) {
    return await this.post(ApiPaths.sales_fee_support_requests_reject_documents_create, data, {
      path: { id },
    })
  }

  /** v3 — Kế toán mở thủ công cờ giữ-đủ-tiền (Q4); `note` optional phía BE. */
  async releaseHoldFull(id: number, data?: FeeSupportHoldReleaseRequest) {
    return await this.post(
      ApiPaths.sales_fee_support_requests_release_hold_full_create,
      data ?? { note: '' },
      { path: { id } }
    )
  }
}

let _service: FeeSupportRequestService | null = null
export function getFeeSupportRequestService() {
  if (!_service) _service = new FeeSupportRequestService()
  return _service
}

export function useFeeSupportRequests(
  params?: GetFeeSupportRequestsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.FEE_SUPPORT_REQUESTS.LIST((params as Record<string, unknown>) || {}),
    () => getFeeSupportRequestService().getList(params),
    { staleTime: 1000 * 60 * 5, enabled: options?.enabled ?? true }
  )
}

export function useFeeSupportRequest(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.SALES.FEE_SUPPORT_REQUESTS.DETAIL(id),
    () => getFeeSupportRequestService().getById(id),
    { enabled: (options?.enabled ?? true) && !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useFeeSupportConfirmationLogs(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.SALES.FEE_SUPPORT_REQUESTS.CONFIRMATION_LOGS(id),
    () => getFeeSupportRequestService().getConfirmationLogs(id),
    { enabled: (options?.enabled ?? true) && !!id, staleTime: 1000 * 60 * 5 }
  )
}

export function useCreateFeeSupportRequest() {
  return useApiMutation((data: FeeSupportRequestCreateRequest) =>
    getFeeSupportRequestService().create(data)
  )
}

export function useUpdateFeeSupportRequest() {
  return useApiMutation(({ id, data }: { id: number; data: FeeSupportRequestEditRequest }) =>
    getFeeSupportRequestService().update(id, data)
  )
}

export function useApproveFeeSupportRequest() {
  return useApiMutation((id: number) => getFeeSupportRequestService().approve(id))
}

export function useRejectFeeSupportRequest() {
  return useApiMutation(({ id, data }: { id: number; data: FeeSupportRejectRequest }) =>
    getFeeSupportRequestService().reject(id, data)
  )
}

export function useWithdrawFeeSupportRequest() {
  return useApiMutation(({ id, data }: { id: number; data: FeeSupportWithdrawRequest }) =>
    getFeeSupportRequestService().withdraw(id, data)
  )
}

export function useSupplementFeeSupportDocuments() {
  return useApiMutation(
    ({ id, data }: { id: number; data: FeeSupportSupplementDocumentsRequest }) =>
      getFeeSupportRequestService().supplementDocuments(id, data)
  )
}

export function useApproveFeeSupportDocuments() {
  return useApiMutation((id: number) => getFeeSupportRequestService().approveDocuments(id))
}

export function useRejectFeeSupportDocuments() {
  return useApiMutation(({ id, data }: { id: number; data: FeeSupportDocumentRejectRequest }) =>
    getFeeSupportRequestService().rejectDocuments(id, data)
  )
}

export function useReleaseFeeSupportHoldFull() {
  return useApiMutation(({ id, data }: { id: number; data?: FeeSupportHoldReleaseRequest }) =>
    getFeeSupportRequestService().releaseHoldFull(id, data)
  )
}

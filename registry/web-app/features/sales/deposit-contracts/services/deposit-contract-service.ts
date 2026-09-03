import { useQueryClient } from '@tanstack/react-query'

import { BaseApiService } from '@/api/base-service'
import { ApiPaths, BookingRefundSaleSale_type, components, paths } from '@/api/schema'
import { DepositContractApprovalStatus } from '@/constants/api-schema-aliases'
import { QUERY_KEYS } from '@/constants'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'
import type {
  InvestorRecoveryRequest,
  RefundPaymentConfirmRequest,
} from '@/features/project/refund-booking/types/refund-payment-types'
import type {
  BulkApproveItemRequest,
  BulkApproveResult,
} from '@/features/sales/_shared/bulk-approve/bulk-approve-model'

// ===== STATUS ENUM (manual - generated enum is incomplete) =====
export enum DepositStatus {
  NEW = 'new',
  PENDING_CONFIRM = 'pending_confirm',
  PENDING_MANAGER = 'pending_manager',
  PENDING_ADMIN_LEAD = 'pending_admin_lead',
  PENDING_ACCOUNTANT = 'pending_accountant',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PENDING_APPROVAL = 'pending_approval',
  ABANDONED = 'abandoned',
  REFUNDED = 'refunded',
}

// ===== SALE TYPE (from generated schema) =====
export const SaleType = BookingRefundSaleSale_type
export type SaleType = BookingRefundSaleSale_type

// ===== TYPE DEFINITIONS =====
export type DepositContract = components['schemas']['DepositContract']
export type DepositContractDetail = components['schemas']['DepositContractDetail']
export type DepositContractSale = components['schemas']['DepositContractSale']
export type DepositContractRequest = components['schemas']['DepositContractRequest']
export type PatchedDepositContractRequest = components['schemas']['PatchedDepositContractRequest']
export type DepositContractDropdown = components['schemas']['DepositContractDropdown']

// `status` và `approval_status` đều nới ra `| string` vì giá trị vào từ URL
// (`searchParams.get(...)`) là `string` thô, không thu hẹp về union sinh từ schema được.
// Lưu ý: TS gộp `Union | string` thành `string`, nên KHÔNG còn gợi ý giá trị hợp lệ ở đây —
// muốn đúng danh sách thì lấy từ app-constant `DepositContract_APPROVAL_STATUS_CHOICES`
// (BE là nguồn sự thật), đừng tự gõ chuỗi.
export type GetDepositContractsParams = Omit<
  NonNullable<paths['/api/sales/deposit-contracts/']['get']['parameters']['query']>,
  'status' | 'approval_status'
> & {
  status?: DepositStatus | string
  approval_status?: DepositContractApprovalStatus | string
}

// ===== SERVICE CLASS =====
export class DepositContractService extends BaseApiService {
  /**
   * Get deposit contracts list
   */
  async getDepositContracts(params?: GetDepositContractsParams) {
    return await this.getPaginated(ApiPaths.sales_deposit_contracts_list, params)
  }

  /**
   * Get deposit contract by ID
   */
  async getDepositContract(id: number) {
    return await this.get(ApiPaths.sales_deposit_contracts_retrieve, {
      path: { id },
    })
  }

  /**
   * Create deposit contract
   */
  async createDepositContract(data: DepositContractRequest) {
    return await this.post(ApiPaths.sales_deposit_contracts_create, data)
  }

  /**
   * Update deposit contract (partial)
   */
  async updateDepositContract(id: number, data: PatchedDepositContractRequest) {
    return await this.patch(ApiPaths.sales_deposit_contracts_partial_update, data, {
      path: { id },
    })
  }

  /**
   * Delete deposit contract
   */
  async deleteDepositContract(id: number) {
    return await this.delete(ApiPaths.sales_deposit_contracts_destroy, {
      path: { id },
    })
  }

  /**
   * Approve deposit contract
   */
  async approveDepositContract(id: number, data?: { note?: string }) {
    return await this.post(
      ApiPaths.sales_deposit_contracts_approve_create,
      { ...(data ?? {}), is_approved: true } as any,
      {
        path: { id },
      }
    )
  }

  /**
   * Reject deposit contract
   */
  async rejectDepositContract(id: number, data: { note: string }) {
    return await this.post(
      ApiPaths.sales_deposit_contracts_approve_create,
      { ...data, is_approved: false } as any,
      {
        path: { id },
      }
    )
  }

  /**
   * Duyệt nhiều HĐ cọc trong một lần gọi (CR STT35).
   *
   * BE tự suy bàn duyệt theo `approval_status` của TỪNG bản ghi, nên danh sách lẫn nhiều trạng
   * thái vẫn gửi chung được. Kết quả là thành-công-một-phần: bản ghi không duyệt được nằm ở
   * `skipped` kèm lý do thay vì làm hỏng cả lô.
   */
  async bulkApproveDepositContracts(items: BulkApproveItemRequest[]) {
    return (await this.post(ApiPaths.sales_deposit_contracts_bulk_approve_create, {
      items,
    })) as BulkApproveResult
  }

  /**
   * Accountant approve/reject deposit contract
   */
  async accountantApproveDepositContract(
    id: number,
    data: { is_approved: boolean; note?: string }
  ) {
    return await this.post(
      ApiPaths.sales_deposit_contracts_accountant_approve_create,
      data as any,
      { path: { id } }
    )
  }

  /**
   * Admin Lead confirm/reject deposit contract
   */
  async adminLeadApproveDepositContract(id: number, data: { is_approved: boolean; note?: string }) {
    return await this.post(
      ApiPaths.sales_deposit_contracts_admin_lead_approve_create,
      data as any,
      {
        path: { id },
      }
    )
  }

  /**
   * Get deposit contract dropdown options
   */
  async getDropdown(params?: GetDepositContractsParams) {
    return await this.getPaginated(ApiPaths.sales_deposit_contracts_dropdown_list, params)
  }

  /**
   * Abandon deposit contract
   */
  async abandonDepositContract(
    id: number,
    data?: { note?: string; confirm_unpaid_reconciliation?: boolean }
  ) {
    return await this.post(ApiPaths.sales_deposit_contracts_abandon_create, data as any, {
      path: { id },
    })
  }

  /**
   * Refund deposit contract
   */
  async refundDepositContract(
    id: number,
    data?: {
      note?: string
      refunded_amount?: number
      confirm_unpaid_reconciliation?: boolean
      // Bắt buộc từ 12/08/2026: endpoint này quyết định tiền quay về đâu mà
      // trước giờ không hề hỏi. Lý do giữ lại bắt buộc khi hoàn thiếu.
      refund_payee_account_name?: string
      refund_payee_account_number?: string
      refund_payee_bank_name?: string
      retained_reason?: string
      retained_note?: string
    }
  ) {
    return await this.post(ApiPaths.sales_deposit_contracts_refund_create, data as any, {
      path: { id },
    })
  }

  /**
   * Xác nhận đã chi tiền hoàn cọc — bước tách khỏi lệnh hoàn ở trên.
   *
   * TODO(schema): đổi sang typed sau khi BE lên dev và chạy `yarn api:update:local`.
   * Chưa có trong schema.ts nên gọi raw path (F-QĐ3 của kế hoạch).
   */
  async confirmRefundPayment(id: number, data: RefundPaymentConfirmRequest) {
    return await this.post(
      '/api/sales/deposit-contracts/{id}/refund-payment/' as any,
      data as any,
      { path: { id } } as any
    )
  }

  /** Cổng CĐT: xác nhận đã đòi lại được tiền, mở đường cho bước chi. */
  async confirmInvestorRecovery(id: number, data: InvestorRecoveryRequest) {
    return await this.post(
      '/api/sales/deposit-contracts/{id}/confirm-investor-recovery/' as any,
      data as any,
      { path: { id } } as any
    )
  }

  /**
   * Preview Reclaimed Email
   */
  async previewReclaimedEmail(id: number) {
    return await this.post(
      ApiPaths.sales_deposit_contracts_reclaimed_email_preview_create,
      {} as any,
      {
        path: { id },
      }
    )
  }

  /**
   * Send Reclaimed Email
   */
  async sendReclaimedEmail(id: number) {
    return await this.post(
      ApiPaths.sales_deposit_contracts_reclaimed_email_send_create,
      {} as any,
      {
        path: { id },
      }
    )
  }
}

// ===== SERVICE SINGLETON =====
let _depositContractService: DepositContractService | null = null

export function getDepositContractService(): DepositContractService {
  if (!_depositContractService) {
    _depositContractService = new DepositContractService()
  }
  return _depositContractService
}

// ===== REACT QUERY HOOKS =====
export function useDepositContracts(
  params?: GetDepositContractsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.DEPOSIT_CONTRACTS.LIST((params as unknown as Record<string, unknown>) || {}),
    () => getDepositContractService().getDepositContracts(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useDepositContract(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.SALES.DEPOSIT_CONTRACTS.DETAIL(id),
    () => getDepositContractService().getDepositContract(id),
    {
      enabled: (options?.enabled ?? true) && !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useCreateDepositContract() {
  return useApiMutation((data: DepositContractRequest) =>
    getDepositContractService().createDepositContract(data)
  )
}

export function useUpdateDepositContract() {
  return useApiMutation(({ id, data }: { id: number; data: PatchedDepositContractRequest }) =>
    getDepositContractService().updateDepositContract(id, data)
  )
}

export function useDeleteDepositContract() {
  return useApiMutation((id: number) => getDepositContractService().deleteDepositContract(id), {
    showErrorToast: true,
  })
}

/**
 * 4 hook duyệt/từ chối dưới đây KHÔNG bật `showErrorToast`.
 *
 * Màn chi tiết HĐ cọc tự bóc lỗi để hiện đúng hộp thoại (chặn hoá đơn, cảnh báo đối
 * chiếu, trùng căn, cổng đề xuất hỗ trợ phí) và đã có toast fallback ở nhánh cuối.
 * Bật thêm toast ở tầng hook làm mọi lỗi hiện HAI toast giống hệt nhau.
 */
export function useApproveDepositContract() {
  return useApiMutation(({ id, note }: { id: number; note?: string }) =>
    getDepositContractService().approveDepositContract(id, { note })
  )
}

/**
 * Duyệt nhiều HĐ cọc (CR STT35). Không bật `showErrorToast` cùng lý do như 4 hook duyệt lẻ:
 * màn danh sách tự hiện dialog kết quả, và lỗi cấp-lô đã có toast riêng ở call site.
 *
 * Invalidate theo tiền tố `['sales','deposit-contracts']` chứ không theo đúng key của trang
 * đang mở: lô này đổi trạng thái nhiều bản ghi nên cả list (mọi bộ lọc đã cache) lẫn detail
 * đều cũ. Không invalidate thì bảng vẫn hiện trạng thái trước khi duyệt.
 */
export function useBulkApproveDepositContracts() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (items: BulkApproveItemRequest[]) =>
      getDepositContractService().bulkApproveDepositContracts(items),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['sales', 'deposit-contracts'] })
      },
    }
  )
}

export function useRejectDepositContract() {
  return useApiMutation(({ id, note }: { id: number; note: string }) =>
    getDepositContractService().rejectDepositContract(id, { note })
  )
}

export function useAccountantApproveDepositContract() {
  return useApiMutation(
    ({ id, isApproved, note }: { id: number; isApproved: boolean; note?: string }) =>
      getDepositContractService().accountantApproveDepositContract(id, {
        is_approved: isApproved,
        note,
      })
  )
}

export function useAdminLeadApproveDepositContract() {
  return useApiMutation(
    ({ id, isApproved, note }: { id: number; isApproved: boolean; note?: string }) =>
      getDepositContractService().adminLeadApproveDepositContract(id, {
        is_approved: isApproved,
        note,
      })
  )
}

export function useDepositContractDropdown(
  params?: GetDepositContractsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.DEPOSIT_CONTRACTS.DROPDOWN(
      (params as unknown as Record<string, unknown>) || {}
    ),
    () => getDepositContractService().getDropdown(params),
    {
      staleTime: 1000 * 60 * 15,
      enabled: options?.enabled ?? true,
    }
  )
}

// Cố tình KHÔNG cập nhật lạc quan (optimistic) trạng thái sang `abandoned`.
// API abandon chạy rất lâu (đo được ~30s trên dev), nên cập nhật lạc quan làm chip trạng thái
// nhảy sang "Đã bỏ" ngay khi bấm, trong khi hộp thoại còn đứng chờ phản hồi — người dùng thấy
// "trạng thái đã đổi mà popup không đóng" và tưởng hệ thống lỗi (ClickUp 86eyfapdx). Tệ hơn,
// khi request hỏng (ví dụ 400 cảnh báo đối chiếu chưa thanh toán) thì chip còn nhấp nháy đổi
// rồi trả về. Trạng thái chỉ được đổi sau khi server xác nhận, danh sách tự refetch ở
// `finishSuccess`. Bỏ luôn `onError` rollback để `showErrorToast` của `useApiMutation` không
// bị ghi đè — nhờ đó lỗi thật mới hiện toast.
export function useAbandonDepositContract() {
  return useApiMutation(
    ({
      id,
      note,
      confirmUnpaidReconciliation,
    }: {
      id: number
      note?: string
      confirmUnpaidReconciliation?: boolean
    }) =>
      getDepositContractService().abandonDepositContract(id, {
        note,
        confirm_unpaid_reconciliation: confirmUnpaidReconciliation,
      }),
    { showErrorToast: true }
  )
}

export function useRefundDepositContract() {
  return useApiMutation(
    ({
      id,
      note,
      refunded_amount,
      confirmUnpaidReconciliation,
      refund_payee_account_name,
      refund_payee_account_number,
      refund_payee_bank_name,
      retained_reason,
      retained_note,
    }: {
      id: number
      note?: string
      refunded_amount?: number
      confirmUnpaidReconciliation?: boolean
      refund_payee_account_name?: string
      refund_payee_account_number?: string
      refund_payee_bank_name?: string
      retained_reason?: string
      retained_note?: string
    }) =>
      getDepositContractService().refundDepositContract(id, {
        note,
        refunded_amount,
        confirm_unpaid_reconciliation: confirmUnpaidReconciliation,
        refund_payee_account_name,
        refund_payee_account_number,
        refund_payee_bank_name,
        retained_reason,
        retained_note,
      }),
    { showErrorToast: true }
  )
}

/** Bước chi tiền hoàn cọc — tách khỏi lệnh hoàn (kế hoạch 12/08/2026 §9.2). */
export function useConfirmDepositRefundPayment() {
  return useApiMutation(
    ({ id, data }: { id: number; data: RefundPaymentConfirmRequest }) =>
      getDepositContractService().confirmRefundPayment(id, data),
    // Lỗi ở đây có mã riêng và cần dialog riêng (cổng CĐT, lệch tài khoản),
    // nên caller tự xử lý thay vì đổ toast chung.
    { showErrorToast: false }
  )
}

/** Cổng CĐT cho hợp đồng cọc. */
export function useConfirmDepositInvestorRecovery() {
  return useApiMutation(
    ({ id, data }: { id: number; data: InvestorRecoveryRequest }) =>
      getDepositContractService().confirmInvestorRecovery(id, data),
    { showErrorToast: true }
  )
}

export function usePreviewReclaimedDepositEmail() {
  return useApiMutation((id: number) => getDepositContractService().previewReclaimedEmail(id), {
    showErrorToast: true,
  })
}

export function useSendReclaimedDepositEmail() {
  return useApiMutation((id: number) => getDepositContractService().sendReclaimedEmail(id), {
    showErrorToast: true,
  })
}

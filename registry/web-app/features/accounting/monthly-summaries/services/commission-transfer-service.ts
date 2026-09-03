import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema'
import { useApiMutation, useApiQuery } from '@/hooks/useApiQuery'

/**
 * "Khấu trừ hoa hồng để thưởng cho người khác" + khấu trừ vĩnh viễn.
 *
 * Hai nghiệp vụ tách nhau ở tầng dữ liệu (một cái có người nhận và phải cân bằng
 * tổng = 0, một cái thì tiền ở lại công ty) nhưng màn chi tiết gộp chúng vào cùng
 * mục "Khấu trừ HHQL" nên kế toán chỉ thấy một chỗ.
 *
 * Cả hai đều là TRƯỚC THUẾ: thuế TNCN của người bị khấu trừ và người được thưởng
 * đều được tính lại, nên chỉ thao tác được khi bảng tổng hợp còn DRAFT.
 */

export type CommissionTransfer = components['schemas']['CommissionTransfer']
export type CommissionTransferTarget = components['schemas']['CommissionTransferTarget']
export type CommissionDeduction = components['schemas']['CommissionDeduction']
export type TransferCaps = components['schemas']['TransferCaps']
export type CommissionTransferCreateRequest =
  components['schemas']['CommissionTransferCreateRequest']
export type CommissionDeductionCreateRequest =
  components['schemas']['CommissionDeductionCreateRequest']
export type CommissionTransferTargetsUpdateRequest =
  components['schemas']['PatchedCommissionTransferTargetsUpdateRequest']
export type CancelRequest = components['schemas']['CancelRequest']
/**
 * Enum sinh từ schema — xuất lại dưới tên gọn để màn gọi khỏi hard-code chuỗi.
 * Phải dùng chính enum của schema chứ không gõ lại object chuỗi: schema sinh ra
 * `enum` thật của TS, mà chuỗi thường thì không gán được vào enum.
 */
export {
  CommissionDeductionSourceBucket as TransferSourceBucket,
  CommissionDeductionReasonKind as DeductionReasonKind,
} from '@/constants/api-schema-aliases'
export type GetCommissionTransfersParams =
  paths['/api/accounting/commission-transfers/']['get']['parameters']['query']
export type GetCommissionDeductionsParams =
  paths['/api/accounting/commission-deductions/']['get']['parameters']['query']

class CommissionTransferService extends BaseApiService {
  async getTransfers(params?: GetCommissionTransfersParams) {
    return await this.getPaginated(ApiPaths.accounting_commission_transfers_list, params as never)
  }

  async getTransfer(id: number): Promise<CommissionTransfer> {
    return await this.get(ApiPaths.accounting_commission_transfers_retrieve, { path: { id } })
  }

  /** Số còn khấu trừ được của từng rổ thu nhập — nuôi thanh tiến trình của dialog. */
  async getCaps(params: { employee: number; year: number; month: number }): Promise<TransferCaps> {
    return await this.get(ApiPaths.accounting_commission_transfers_caps_retrieve, {
      query: params,
    })
  }

  async createTransfer(data: CommissionTransferCreateRequest): Promise<CommissionTransfer> {
    return await this.post(ApiPaths.accounting_commission_transfers_create, data)
  }

  /** Thay TOÀN BỘ danh sách người được thưởng (cùng ngữ nghĩa set-entries của batch thưởng). */
  async setTargets(
    id: number,
    data: CommissionTransferTargetsUpdateRequest
  ): Promise<CommissionTransfer> {
    return await this.patch(
      ApiPaths.accounting_commission_transfers_set_targets_partial_update,
      data,
      {
        path: { id },
      }
    )
  }

  async cancelTransfer(id: number, reason = ''): Promise<CommissionTransfer> {
    return await this.post(
      ApiPaths.accounting_commission_transfers_cancel_create,
      { reason },
      {
        path: { id },
      }
    )
  }

  async getDeductions(params?: GetCommissionDeductionsParams) {
    return await this.getPaginated(ApiPaths.accounting_commission_deductions_list, params as never)
  }

  async createDeduction(data: CommissionDeductionCreateRequest): Promise<CommissionDeduction> {
    return await this.post(ApiPaths.accounting_commission_deductions_create, data)
  }

  async cancelDeduction(id: number, reason = ''): Promise<CommissionDeduction> {
    return await this.post(
      ApiPaths.accounting_commission_deductions_cancel_create,
      { reason },
      {
        path: { id },
      }
    )
  }
}

let service: CommissionTransferService | undefined

export function getCommissionTransferService(): CommissionTransferService {
  if (!service) service = new CommissionTransferService()
  return service
}

export const COMMISSION_TRANSFER_QUERY_KEY = 'commission-transfers'
export const COMMISSION_TRANSFER_CAPS_QUERY_KEY = 'commission-transfer-caps'

export function useCommissionTransfers(params?: GetCommissionTransfersParams) {
  // Key nhận primitive nên tham số phải serialize, không truyền thẳng object.
  return useApiQuery([COMMISSION_TRANSFER_QUERY_KEY, JSON.stringify(params ?? {})], () =>
    getCommissionTransferService().getTransfers(params)
  )
}

/** Nạp 1 phiếu để mở dialog ở chế độ SỬA (cần cả danh sách người nhận, `sources` không có). */
export function useCommissionTransfer(id?: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    [COMMISSION_TRANSFER_QUERY_KEY, 'detail', id],
    () => getCommissionTransferService().getTransfer(id as number),
    { enabled: !!id && (options?.enabled ?? true) }
  )
}

export function useCommissionTransferCaps(
  params: { employee?: number; year?: number; month?: number },
  options?: { enabled?: boolean }
) {
  const { employee, year, month } = params
  return useApiQuery(
    [COMMISSION_TRANSFER_CAPS_QUERY_KEY, employee, year, month],
    () =>
      getCommissionTransferService().getCaps({
        employee: employee as number,
        year: year as number,
        month: month as number,
      }),
    { enabled: !!employee && !!year && !!month && (options?.enabled ?? true) }
  )
}

export function useCreateCommissionTransfer() {
  return useApiMutation((data: CommissionTransferCreateRequest) =>
    getCommissionTransferService().createTransfer(data)
  )
}

export function useSetCommissionTransferTargets() {
  return useApiMutation((variables: { id: number; data: CommissionTransferTargetsUpdateRequest }) =>
    getCommissionTransferService().setTargets(variables.id, variables.data)
  )
}

export function useCancelCommissionTransfer() {
  return useApiMutation((variables: { id: number; reason?: string }) =>
    getCommissionTransferService().cancelTransfer(variables.id, variables.reason ?? '')
  )
}

export function useCreateCommissionDeduction() {
  return useApiMutation((data: CommissionDeductionCreateRequest) =>
    getCommissionTransferService().createDeduction(data)
  )
}

export function useCancelCommissionDeduction() {
  return useApiMutation((variables: { id: number; reason?: string }) =>
    getCommissionTransferService().cancelDeduction(variables.id, variables.reason ?? '')
  )
}

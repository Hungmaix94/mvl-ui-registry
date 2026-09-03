import { useQueryClient } from '@tanstack/react-query'

import { BaseApiService } from '@/api/base-service'
import { ApiPaths, components, paths } from '@/api/schema.ts'
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

export type Customer = components['schemas']['Customer']
export type CustomerRequest = components['schemas']['CustomerRequest']
export type PatchedCustomerRequest = components['schemas']['PatchedCustomerRequest']
export type PaginatedCustomerList = components['schemas']['PaginatedCustomerList']
export type CustomerDropdown = components['schemas']['CustomerDropdown']
export type PaginatedCustomerDropdownList = components['schemas']['PaginatedCustomerDropdownList']
export type GetCustomerDropdownParams =
  paths['/api/sales/customers/dropdown/']['get']['parameters']['query']
export type ImportStartRequest = components['schemas']['ImportStartRequest']

export type Booking = components['schemas']['Booking']
export type BookingRequest = components['schemas']['BookingRequest']
export type PatchedBookingRequest = components['schemas']['PatchedBookingRequest']
export type BookingApproveRequest = components['schemas']['BookingApproveRequest']
export type BookingAccountantApproveRequest =
  components['schemas']['BookingAccountantApproveRequest']
export type BookingRejectRequest = { note: string }
export type BookingTransferRequest = components['schemas']['BookingTransferRequest']
export type BookingDropdown = components['schemas']['BookingDropdown']
export type PaginatedBookingList = components['schemas']['PaginatedBookingList']
export type PaginatedBookingDropdownList = components['schemas']['PaginatedBookingDropdownList']

export type BookingRefund = components['schemas']['BookingRefund']
export type BookingRefundRequest = components['schemas']['BookingRefundRequest']
export type PatchedBookingRefundRequest = components['schemas']['PatchedBookingRefundRequest']
export type PaginatedBookingRefundList = components['schemas']['PaginatedBookingRefundList']
export type RefundApproveRequest = components['schemas']['RefundApproveRequest']
export type RefundAccountantApproveRequest = components['schemas']['RefundAccountantApproveRequest']
export type RefundAdminLeadApproveRequest = components['schemas']['RefundAdminLeadApproveRequest']
export type RefundTreasurerConfirmRequest = components['schemas']['RefundTreasurerConfirmRequest']
export type RefundRejectRequest = { note: string }
export type DepositRefundRequest = components['schemas']['DepositRefundRequest']

export type Collaborator = components['schemas']['Collaborator']
export type CollaboratorRequest = components['schemas']['CollaboratorRequest']
export type PatchedCollaboratorRequest = components['schemas']['PatchedCollaboratorRequest']
export type PaginatedCollaboratorList = components['schemas']['PaginatedCollaboratorList']

export type DepositContract = components['schemas']['DepositContract']
export type DepositContractRequest = components['schemas']['DepositContractRequest']
export type PatchedDepositContractRequest = components['schemas']['PatchedDepositContractRequest']
export type DepositApproveRequest = components['schemas']['DepositApproveRequest']
export type DepositRejectRequest = { note: string }
export type DepositContractDropdown = components['schemas']['DepositContractDropdown']
export type PaginatedDepositContractList = components['schemas']['PaginatedDepositContractList']
export type PaginatedDepositContractDropdownList =
  components['schemas']['PaginatedDepositContractDropdownList']

export type TransactionSheet = components['schemas']['TransactionSheet']
export type TransactionSheetRequest = components['schemas']['TransactionSheetRequest']
export type PatchedTransactionSheetRequest = components['schemas']['PatchedTransactionSheetRequest']
export type TransactionApproveRequest = components['schemas']['TransactionApproveRequest']
export type TransactionRejectRequest = components['schemas']['TransactionRejectRequest']
export type TransactionSheetDropdown = components['schemas']['TransactionSheetDropdown']
export type PaginatedTransactionSheetList = components['schemas']['PaginatedTransactionSheetList']
export type PaginatedTransactionSheetDropdownList =
  components['schemas']['PaginatedTransactionSheetDropdownList']

export type AuditLogSummary = components['schemas']['AuditLogSummary']
export type AuditLogSearchResponse = components['schemas']['AuditLogSearchResponse']

export type GetCustomersParams = paths['/api/sales/customers/']['get']['parameters']['query']
export type GetBookingsParams = paths['/api/sales/bookings/']['get']['parameters']['query']
export type GetBookingHistoryParams =
  paths['/api/sales/bookings/{id}/histories/']['get']['parameters']['query']
export type GetBookingConfirmationLogsParams =
  paths['/api/sales/booking-confirmation-logs/']['get']['parameters']['query']
export type GetBookingDropdownParams =
  paths['/api/sales/bookings/dropdown/']['get']['parameters']['query']
export type GetBookingRefundsParams =
  paths['/api/sales/booking-refunds/']['get']['parameters']['query']
export type GetDepositContractsParams = NonNullable<
  paths['/api/sales/deposit-contracts/']['get']['parameters']['query']
>
export type GetDepositContractDropdownParams =
  paths['/api/sales/deposit-contracts/dropdown/']['get']['parameters']['query']
export type GetDepositContractHistoriesParams =
  paths['/api/sales/deposit-contracts/{id}/histories/']['get']['parameters']['query']
export type GetTransactionSheetsParams =
  paths['/api/sales/transaction-sheets/']['get']['parameters']['query']
export type GetTransactionSheetDropdownParams =
  paths['/api/sales/transaction-sheets/dropdown/']['get']['parameters']['query']
export type GetTransactionSheetHistoriesParams =
  paths['/api/sales/transaction-sheets/{id}/histories/']['get']['parameters']['query']

export type BookingPriorityOrderRequest = components['schemas']['BookingPriorityOrderRequest']
export type GetBookingRefundHistoriesParams =
  paths['/api/sales/booking-refunds/{id}/histories/']['get']['parameters']['query']
export type TransactionManagerConfirmRequest =
  components['schemas']['TransactionManagerConfirmRequest']

export type GetCollaboratorsParams =
  paths['/api/sales/collaborators/']['get']['parameters']['query']
export type GetDepositConfirmationLogsParams =
  paths['/api/sales/deposit-confirmation-logs/']['get']['parameters']['query']
export type RejectBookingRefundByManagerRequest = NonNullable<
  paths['/api/sales/booking-refunds/{id}/reject/']['post']['requestBody']
>['content']['application/json']

export class SaleService extends BaseApiService {
  async getCustomers(params?: GetCustomersParams) {
    return await this.getPaginated(ApiPaths.sales_customers_list, params)
  }

  async createCustomer(data: CustomerRequest) {
    return await this.post(ApiPaths.sales_customers_create, data)
  }

  async getCustomer(id: number) {
    return await this.get(ApiPaths.sales_customers_retrieve, {
      path: { id },
    })
  }

  async updateCustomer(id: number, data: CustomerRequest) {
    return await this.put(ApiPaths.sales_customers_update, data, {
      path: { id },
    })
  }

  async partialUpdateCustomer(id: number, data: PatchedCustomerRequest) {
    return await this.patch(ApiPaths.sales_customers_partial_update, data, {
      path: { id },
    })
  }

  async deleteCustomer(id: number) {
    return await this.delete(ApiPaths.sales_customers_destroy, {
      path: { id },
    })
  }

  async getCustomerDropdown(params?: GetCustomerDropdownParams) {
    return await this.getPaginated(ApiPaths.sales_customers_dropdown_list, params)
  }

  async startCustomerImport(data: ImportStartRequest) {
    return await this.post(ApiPaths.sales_customers_import_create, data)
  }

  async downloadCustomerImportTemplate() {
    return await this.get(ApiPaths.sales_customers_import_template_retrieve)
  }

  async getBookings(params?: GetBookingsParams) {
    return await this.getPaginated(ApiPaths.sales_bookings_list, params)
  }

  async createBooking(data: BookingRequest) {
    return await this.post(ApiPaths.sales_bookings_create, data)
  }

  async getBooking(id: number) {
    return await this.get(ApiPaths.sales_bookings_retrieve, {
      path: { id },
    })
  }

  async updateBooking(id: number, data: BookingRequest) {
    return await this.put(ApiPaths.sales_bookings_update, data, {
      path: { id },
    })
  }

  async partialUpdateBooking(id: number, data: PatchedBookingRequest) {
    return await this.patch(ApiPaths.sales_bookings_partial_update, data, {
      path: { id },
    })
  }

  async deleteBooking(id: number) {
    return await this.delete(ApiPaths.sales_bookings_destroy, {
      path: { id },
    })
  }

  async accountantApproveBooking(id: number, data: BookingAccountantApproveRequest) {
    return await this.post(ApiPaths.sales_bookings_accountant_approve_create, data, {
      path: { id },
    })
  }

  async approveBooking(id: number, data: BookingApproveRequest) {
    return await this.post(ApiPaths.sales_bookings_approve_create, data, {
      path: { id },
    })
  }

  /**
   * Duyệt nhiều HĐ đặt chỗ trong một lần gọi (CR STT35).
   *
   * BE suy bàn duyệt theo `approval_status` của TỪNG bản ghi, nên gửi lẫn trạng thái vẫn được;
   * bản ghi không duyệt được nằm ở `skipped` kèm lý do chứ không làm hỏng cả lô.
   */
  async bulkApproveBookings(items: BulkApproveItemRequest[]) {
    return (await this.post(ApiPaths.sales_bookings_bulk_approve_create, {
      items,
    })) as BulkApproveResult
  }

  async adminLeadApproveBooking(
    id: number,
    data: components['schemas']['BookingAdminLeadApproveRequest']
  ) {
    return await this.post(ApiPaths.sales_bookings_admin_lead_approve_create, data, {
      path: { id },
    })
  }

  async rejectBooking(id: number, data: BookingRejectRequest) {
    const payload: BookingApproveRequest = { ...data, is_approved: false }
    return await this.post(ApiPaths.sales_bookings_approve_create, payload, {
      path: { id },
    })
  }

  async transferBooking(id: number, data: BookingTransferRequest) {
    return await this.post(ApiPaths.sales_bookings_transfer_create, data, {
      path: { id },
    })
  }

  async getBookingHistories(id: number, params?: GetBookingHistoryParams) {
    return await this.get(ApiPaths.sales_bookings_histories_retrieve, {
      path: { id },
      query: params,
    })
  }

  async getBookingConfirmationLogs(params?: GetBookingConfirmationLogsParams) {
    return await this.getPaginated(ApiPaths.sales_booking_confirmation_logs_list, params)
  }

  async getBookingDropdown(params?: GetBookingDropdownParams) {
    return await this.getPaginated(ApiPaths.sales_bookings_dropdown_list, params)
  }

  async getBookingRefunds(params?: GetBookingRefundsParams) {
    return await this.getPaginated(ApiPaths.sales_booking_refunds_list, params)
  }

  async createBookingRefund(data: BookingRefundRequest) {
    return await this.post(ApiPaths.sales_booking_refunds_create, data)
  }

  async getBookingRefund(id: number) {
    return await this.get(ApiPaths.sales_booking_refunds_retrieve, {
      path: { id },
    })
  }

  async updateBookingRefund(id: number, data: BookingRefundRequest) {
    return await this.put(ApiPaths.sales_booking_refunds_update, data, {
      path: { id },
    })
  }

  async partialUpdateBookingRefund(id: number, data: PatchedBookingRefundRequest) {
    return await this.patch(ApiPaths.sales_booking_refunds_partial_update, data, {
      path: { id },
    })
  }

  async deleteBookingRefund(id: number) {
    return await this.delete(ApiPaths.sales_booking_refunds_destroy, {
      path: { id },
    })
  }

  async approveBookingRefund(id: number, data: RefundApproveRequest) {
    return await this.post(ApiPaths.sales_booking_refunds_approve_create, data, {
      path: { id },
    })
  }

  /**
   * Duyệt nhiều phiếu hoàn tiền đặt chỗ trong một lần gọi (CR STT35).
   *
   * Thang duyệt của hoàn tiền khoá theo `status` (không phải `approval_status`), và BE cố ý
   * KHÔNG nhận `pending_confirm` (bàn xác nhận của sale) lẫn `pending_treasurer` (bàn chi tiền,
   * cần nhập thông tin thanh toán) — hai bàn đó không thuộc ba endpoint duyệt.
   */
  async bulkApproveBookingRefunds(items: BulkApproveItemRequest[]) {
    return (await this.post(ApiPaths.sales_booking_refunds_bulk_approve_create, {
      items,
    })) as BulkApproveResult
  }

  async rejectBookingRefund(id: number, data: RefundRejectRequest) {
    return await this.post(ApiPaths.sales_booking_refunds_reject_create, data, {
      path: { id },
    })
  }

  async getDepositContracts(params?: GetDepositContractsParams) {
    return await this.getPaginated(ApiPaths.sales_deposit_contracts_list, params)
  }

  async createDepositContract(data: DepositContractRequest) {
    return await this.post(ApiPaths.sales_deposit_contracts_create, data)
  }

  async getDepositContract(id: number) {
    return await this.get(ApiPaths.sales_deposit_contracts_retrieve, {
      path: { id },
    })
  }

  async updateDepositContract(id: number, data: DepositContractRequest) {
    return await this.put(ApiPaths.sales_deposit_contracts_update, data, {
      path: { id },
    })
  }

  async partialUpdateDepositContract(id: number, data: PatchedDepositContractRequest) {
    return await this.patch(ApiPaths.sales_deposit_contracts_partial_update, data, {
      path: { id },
    })
  }

  async deleteDepositContract(id: number) {
    return await this.delete(ApiPaths.sales_deposit_contracts_destroy, {
      path: { id },
    })
  }

  async approveDepositContract(id: number, data: DepositApproveRequest) {
    return await this.post(ApiPaths.sales_deposit_contracts_approve_create, data, {
      path: { id },
    })
  }

  async adminLeadApproveDepositContract(
    id: number,
    data: components['schemas']['DepositAdminLeadApproveRequest']
  ) {
    return await this.post(ApiPaths.sales_deposit_contracts_admin_lead_approve_create, data, {
      path: { id },
    })
  }

  async rejectDepositContract(id: number, data: DepositRejectRequest) {
    const payload: DepositApproveRequest = { ...data, is_approved: false }
    return await this.post(ApiPaths.sales_deposit_contracts_approve_create, payload, {
      path: { id },
    })
  }

  async getDepositContractDropdown(params?: GetDepositContractDropdownParams) {
    return await this.getPaginated(ApiPaths.sales_deposit_contracts_dropdown_list, params)
  }

  async getDepositContractHistories(id: number, params?: GetDepositContractHistoriesParams) {
    return await this.get(ApiPaths.sales_deposit_contracts_histories_retrieve, {
      path: { id },
      query: params,
    })
  }

  async getDepositContractHistory(id: number, logId: number) {
    return await this.get(ApiPaths.sales_deposit_contracts_history_retrieve, {
      path: { id, log_id: logId },
    })
  }

  async getTransactionSheets(params?: GetTransactionSheetsParams) {
    return await this.getPaginated(ApiPaths.sales_transaction_sheets_list, params)
  }

  async createTransactionSheet(data: TransactionSheetRequest) {
    return await this.post(ApiPaths.sales_transaction_sheets_create, data)
  }

  async getTransactionSheet(id: number) {
    return await this.get(ApiPaths.sales_transaction_sheets_retrieve, {
      path: { id },
    })
  }

  async updateTransactionSheet(id: number, data: TransactionSheetRequest) {
    return await this.put(ApiPaths.sales_transaction_sheets_update, data, {
      path: { id },
    })
  }

  async partialUpdateTransactionSheet(id: number, data: PatchedTransactionSheetRequest) {
    return await this.patch(ApiPaths.sales_transaction_sheets_partial_update, data, {
      path: { id },
    })
  }

  async deleteTransactionSheet(id: number) {
    return await this.delete(ApiPaths.sales_transaction_sheets_destroy, {
      path: { id },
    })
  }

  async approveTransactionSheet(id: number, data: TransactionApproveRequest) {
    return await this.post(ApiPaths.sales_transaction_sheets_approve_create, data, {
      path: { id },
    })
  }

  async adminLeadApproveTransactionSheet(
    id: number,
    data: components['schemas']['TransactionAdminLeadApproveRequest']
  ) {
    return await this.post(ApiPaths.sales_transaction_sheets_admin_lead_approve_create, data, {
      path: { id },
    })
  }

  async rejectTransactionSheet(id: number, data: TransactionRejectRequest) {
    return await this.post(ApiPaths.sales_transaction_sheets_reject_create, data, {
      path: { id },
    })
  }

  async managerConfirmTransactionSheet(id: number, data: TransactionManagerConfirmRequest) {
    return await this.post(ApiPaths.sales_transaction_sheets_manager_confirm_create, data, {
      path: { id },
    })
  }

  async getNeedManagerConfirmTransactionSheet() {
    return await this.get(ApiPaths.sales_transaction_sheets_need_manager_confirm_list)
  }

  async getTransactionSheetDropdown(params?: GetTransactionSheetDropdownParams) {
    return await this.getPaginated(ApiPaths.sales_transaction_sheets_dropdown_list, params)
  }

  async getTransactionSheetHistories(id: number, params?: GetTransactionSheetHistoriesParams) {
    return await this.get(ApiPaths.sales_transaction_sheets_histories_retrieve, {
      path: { id },
      query: params,
    })
  }

  async getTransactionSheetHistory(id: number, logId: number) {
    return await this.get(ApiPaths.sales_transaction_sheets_history_retrieve, {
      path: { id, log_id: logId },
    })
  }

  async rejectBookingRefundByManager(id: number, data: Record<string, unknown>) {
    return await this.post(ApiPaths.sales_booking_refunds_reject_create, data as never, {
      path: { id },
    })
  }

  async getDepositConfirmationLogs(params?: GetDepositConfirmationLogsParams) {
    return await this.getPaginated(ApiPaths.sales_deposit_confirmation_logs_list, params)
  }

  async getDepositConfirmationLog(id: number) {
    return await this.get(ApiPaths.sales_deposit_confirmation_logs_retrieve, {
      path: { id },
    })
  }

  async getBookingConfirmationLog(id: number) {
    return await this.get(ApiPaths.sales_booking_confirmation_logs_retrieve, {
      path: { id },
    })
  }

  // Booking Refund approval actions
  async accountantApproveBookingRefund(id: number, data: RefundAccountantApproveRequest) {
    return await this.post(ApiPaths.sales_booking_refunds_accountant_approve_create, data, {
      path: { id },
    })
  }

  async adminLeadApproveBookingRefund(id: number, data: RefundAdminLeadApproveRequest) {
    return await this.post(ApiPaths.sales_booking_refunds_admin_lead_approve_create, data, {
      path: { id },
    })
  }

  async treasurerConfirmBookingRefund(id: number, data: RefundTreasurerConfirmRequest) {
    return await this.post(ApiPaths.sales_booking_refunds_treasurer_confirm_create, data, {
      path: { id },
    })
  }

  // ── Bước xác nhận đã chi (kế hoạch thu-chi tiền khách 12/08/2026) ──────
  // TODO(schema): đổi sang typed sau khi BE lên dev và chạy `yarn api:update:local`.
  // Bốn endpoint dưới đây chưa có trong schema.ts nên gọi raw path + cast —
  // KHÔNG tự khai type vào schema.ts (F-QĐ1/F-QĐ3 của kế hoạch).

  async confirmRefundBookingPayment(id: number, data: RefundPaymentConfirmRequest) {
    return (await this.post(
      '/api/sales/booking-refunds/{id}/confirm-payment/' as any,
      data as any,
      { path: { id } } as any
    )) as unknown as BookingRefund
  }

  async confirmRefundBookingInvestorRecovery(id: number, data: InvestorRecoveryRequest) {
    return (await this.post(
      '/api/sales/booking-refunds/{id}/confirm-investor-recovery/' as any,
      data as any,
      { path: { id } } as any
    )) as unknown as BookingRefund
  }

  async confirmDepositRefundPayment(id: number, data: RefundPaymentConfirmRequest) {
    return (await this.post(
      '/api/sales/deposit-contracts/{id}/refund-payment/' as any,
      data as any,
      { path: { id } } as any
    )) as unknown as unknown
  }

  async confirmDepositInvestorRecovery(id: number, data: InvestorRecoveryRequest) {
    return (await this.post(
      '/api/sales/deposit-contracts/{id}/confirm-investor-recovery/' as any,
      data as any,
      { path: { id } } as any
    )) as unknown as unknown
  }

  // Deposit Contract actions
  async abandonDepositContract(id: number) {
    // Regen 2026-07-27: body `DepositAbandonRequest` có `note` bắt buộc (default rỗng).
    // Regen 2026-07-30: thêm `confirm_unpaid_reconciliation` bắt buộc (default false, bug 86expaf56).
    // Bản có nhập lý do nằm ở deposit-contract-service; đây là đường legacy.
    return await this.post(
      ApiPaths.sales_deposit_contracts_abandon_create,
      { note: '', confirm_unpaid_reconciliation: false },
      { path: { id } }
    )
  }

  async previewReclaimedEmailDepositContract(id: number, data: DepositContractRequest) {
    return await this.post(ApiPaths.sales_deposit_contracts_reclaimed_email_preview_create, data, {
      path: { id },
    })
  }

  async sendReclaimedEmailDepositContract(id: number) {
    return await this.post(
      ApiPaths.sales_deposit_contracts_reclaimed_email_send_create,
      undefined,
      { path: { id } }
    )
  }

  async refundDepositContract(id: number, data: DepositRefundRequest) {
    return await this.post(ApiPaths.sales_deposit_contracts_refund_create, data, {
      path: { id },
    })
  }

  // Collaborators
  async getCollaborators(params?: GetCollaboratorsParams) {
    return await this.getPaginated(ApiPaths.sales_collaborators_list, params)
  }

  async createCollaborator(data: CollaboratorRequest) {
    return await this.post(ApiPaths.sales_collaborators_create, data)
  }

  async getCollaborator(id: number) {
    return await this.get(ApiPaths.sales_collaborators_retrieve, {
      path: { id },
    })
  }

  async updateCollaborator(id: number, data: CollaboratorRequest) {
    return await this.put(ApiPaths.sales_collaborators_update, data, {
      path: { id },
    })
  }

  async partialUpdateCollaborator(id: number, data: PatchedCollaboratorRequest) {
    return await this.patch(ApiPaths.sales_collaborators_partial_update, data, {
      path: { id },
    })
  }

  async deleteCollaborator(id: number) {
    return await this.delete(ApiPaths.sales_collaborators_destroy, {
      path: { id },
    })
  }

  async getCollaboratorHistories(id: number, params?: Record<string, unknown>) {
    return await this.get(ApiPaths.sales_collaborators_histories_retrieve, {
      path: { id },
      query: params,
    })
  }

  async getCollaboratorHistory(id: number, logId: string) {
    return await this.get(ApiPaths.sales_collaborators_history_retrieve, {
      path: { id, log_id: logId },
    })
  }

  async setPriorityOrderBooking(id: number, data: BookingPriorityOrderRequest) {
    return await this.post(ApiPaths.sales_bookings_set_priority_order_create, data, {
      path: { id },
    })
  }

  async getBookingHistory(id: number, logId: number) {
    return await this.get(ApiPaths.sales_bookings_history_retrieve, {
      path: { id, log_id: logId },
    })
  }

  async getBookingRefundHistories(id: number, params?: GetBookingRefundHistoriesParams) {
    return await this.get(ApiPaths.sales_booking_refunds_histories_retrieve, {
      path: { id },
      query: params,
    })
  }

  async getBookingRefundHistory(id: number, logId: number) {
    return await this.get(ApiPaths.sales_booking_refunds_history_retrieve, {
      path: { id, log_id: logId },
    })
  }
}

let _saleService: SaleService | null = null

export function getSaleService(): SaleService {
  if (!_saleService) {
    _saleService = new SaleService()
  }
  return _saleService
}

export const saleService = {
  get instance() {
    return getSaleService()
  },
}

export function useCustomers(params?: GetCustomersParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.SALES.CUSTOMERS.LIST(params || {}),
    () => getSaleService().getCustomers(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useCustomer(id: number) {
  return useApiQuery(
    QUERY_KEYS.SALES.CUSTOMERS.DETAIL(id),
    () => getSaleService().getCustomer(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useCreateCustomer() {
  return useApiMutation((data: CustomerRequest) => getSaleService().createCustomer(data))
}

export function useUpdateCustomer() {
  return useApiMutation((variables: { id: number; data: CustomerRequest }) =>
    getSaleService().updateCustomer(variables.id, variables.data)
  )
}

export function usePartialUpdateCustomer() {
  return useApiMutation((variables: { id: number; data: PatchedCustomerRequest }) =>
    getSaleService().partialUpdateCustomer(variables.id, variables.data)
  )
}

export function useDeleteCustomer() {
  return useApiMutation((id: number) => getSaleService().deleteCustomer(id))
}

export function useCustomerDropdown(
  params?: GetCustomerDropdownParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.CUSTOMERS.DROPDOWN(params || {}),
    () => getSaleService().getCustomerDropdown(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useStartCustomerImport() {
  return useApiMutation((data: ImportStartRequest) => getSaleService().startCustomerImport(data))
}

export function useCustomerImportTemplate(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.SALES.CUSTOMERS.IMPORT_TEMPLATE(),
    () => getSaleService().downloadCustomerImportTemplate(),
    options
  )
}

export function useBookings(params?: GetBookingsParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.SALES.BOOKINGS.LIST(params || {}),
    () => getSaleService().getBookings(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useBooking(id: number) {
  return useApiQuery(QUERY_KEYS.SALES.BOOKINGS.DETAIL(id), () => getSaleService().getBooking(id), {
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateBooking() {
  return useApiMutation((data: BookingRequest) => getSaleService().createBooking(data))
}

export function useUpdateBooking() {
  return useApiMutation((variables: { id: number; data: BookingRequest }) =>
    getSaleService().updateBooking(variables.id, variables.data)
  )
}

export function usePartialUpdateBooking() {
  return useApiMutation((variables: { id: number; data: PatchedBookingRequest }) =>
    getSaleService().partialUpdateBooking(variables.id, variables.data)
  )
}

export function useDeleteBooking() {
  return useApiMutation((id: number) => getSaleService().deleteBooking(id))
}

export function useAccountantApproveBooking() {
  return useApiMutation((variables: { id: number; data: BookingAccountantApproveRequest }) =>
    getSaleService().accountantApproveBooking(variables.id, variables.data)
  )
}

export function useApproveBooking() {
  return useApiMutation((variables: { id: number; data: BookingApproveRequest }) =>
    getSaleService().approveBooking(variables.id, variables.data)
  )
}

/**
 * Duyệt nhiều HĐ đặt chỗ (CR STT35) — màn danh sách tự hiện dialog kết quả.
 *
 * Invalidate theo tiền tố `['sales','bookings']`: một lô đổi trạng thái nhiều bản ghi nên mọi
 * list đã cache (kể cả bộ lọc khác) và detail đều cũ.
 */
export function useBulkApproveBookings() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (items: BulkApproveItemRequest[]) => getSaleService().bulkApproveBookings(items),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['sales', 'bookings'] })
      },
    }
  )
}

export function useAdminLeadApproveBooking() {
  return useApiMutation(
    (variables: { id: number; data: components['schemas']['BookingAdminLeadApproveRequest'] }) =>
      getSaleService().adminLeadApproveBooking(variables.id, variables.data)
  )
}

export function useTransferBooking() {
  return useApiMutation((variables: { id: number; data: BookingTransferRequest }) =>
    getSaleService().transferBooking(variables.id, variables.data)
  )
}

export function useRejectBooking() {
  return useApiMutation((variables: { id: number; data: BookingRejectRequest }) =>
    getSaleService().rejectBooking(variables.id, variables.data)
  )
}

export function useBookingDropdown(
  params?: GetBookingDropdownParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.BOOKINGS.DROPDOWN(params || {}),
    () => getSaleService().getBookingDropdown(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useBookingRefunds(
  params?: GetBookingRefundsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.BOOKING_REFUNDS.LIST(params || {}),
    () => getSaleService().getBookingRefunds(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useBookingRefund(id: number) {
  return useApiQuery(
    QUERY_KEYS.SALES.BOOKING_REFUNDS.DETAIL(id),
    () => getSaleService().getBookingRefund(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useCreateBookingRefund() {
  return useApiMutation((data: BookingRefundRequest) => getSaleService().createBookingRefund(data))
}

export function useUpdateBookingRefund() {
  return useApiMutation((variables: { id: number; data: BookingRefundRequest }) =>
    getSaleService().updateBookingRefund(variables.id, variables.data)
  )
}

export function usePartialUpdateBookingRefund() {
  return useApiMutation((variables: { id: number; data: PatchedBookingRefundRequest }) =>
    getSaleService().partialUpdateBookingRefund(variables.id, variables.data)
  )
}

export function useDeleteBookingRefund() {
  return useApiMutation((id: number) => getSaleService().deleteBookingRefund(id))
}

export function useApproveBookingRefund() {
  return useApiMutation((variables: { id: number; data: RefundApproveRequest }) =>
    getSaleService().approveBookingRefund(variables.id, variables.data)
  )
}

/**
 * Duyệt nhiều phiếu hoàn tiền đặt chỗ (CR STT35) — màn danh sách tự hiện dialog kết quả.
 *
 * Invalidate cả `booking-refunds` lẫn `bookings`: duyệt xong phiếu hoàn tiền thì trạng thái đặt
 * chỗ gốc cũng đi theo, nên để nguyên cache `bookings` là màn HĐ đặt chỗ hiện số cũ.
 */
export function useBulkApproveBookingRefunds() {
  const queryClient = useQueryClient()
  return useApiMutation(
    (items: BulkApproveItemRequest[]) => getSaleService().bulkApproveBookingRefunds(items),
    {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['sales', 'booking-refunds'] })
        queryClient.invalidateQueries({ queryKey: ['sales', 'bookings'] })
      },
    }
  )
}

export function useRejectBookingRefund() {
  return useApiMutation((variables: { id: number; data: RefundRejectRequest }) =>
    getSaleService().rejectBookingRefund(variables.id, variables.data)
  )
}

export function useBookingRefundHistories(
  id: number,
  params?: GetBookingRefundHistoriesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.BOOKING_REFUNDS.HISTORIES(id, params || {}),
    () => getSaleService().getBookingRefundHistories(id, params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: !!id && (options?.enabled ?? true),
    }
  )
}

export function useBookingRefundHistory(
  id: number,
  logId: number,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.BOOKING_REFUNDS.HISTORY_DETAIL(id, logId),
    () => getSaleService().getBookingRefundHistory(id, logId),
    {
      staleTime: 1000 * 60 * 5,
      enabled: !!id && !!logId && (options?.enabled ?? true),
    }
  )
}

export function useDepositContracts(
  params?: GetDepositContractsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.DEPOSIT_CONTRACTS.LIST(params || {}),
    () => getSaleService().getDepositContracts(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useDepositContract(id: number) {
  return useApiQuery(
    QUERY_KEYS.SALES.DEPOSIT_CONTRACTS.DETAIL(id),
    () => getSaleService().getDepositContract(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useCreateDepositContract() {
  return useApiMutation((data: DepositContractRequest) =>
    getSaleService().createDepositContract(data)
  )
}

export function useUpdateDepositContract() {
  return useApiMutation((variables: { id: number; data: DepositContractRequest }) =>
    getSaleService().updateDepositContract(variables.id, variables.data)
  )
}

export function usePartialUpdateDepositContract() {
  return useApiMutation((variables: { id: number; data: PatchedDepositContractRequest }) =>
    getSaleService().partialUpdateDepositContract(variables.id, variables.data)
  )
}

export function useDeleteDepositContract() {
  return useApiMutation((id: number) => getSaleService().deleteDepositContract(id))
}

export function useApproveDepositContract() {
  return useApiMutation((variables: { id: number; data: DepositApproveRequest }) =>
    getSaleService().approveDepositContract(variables.id, variables.data)
  )
}

export function useAdminLeadApproveDepositContract() {
  return useApiMutation(
    (variables: { id: number; data: components['schemas']['DepositAdminLeadApproveRequest'] }) =>
      getSaleService().adminLeadApproveDepositContract(variables.id, variables.data)
  )
}

export function useRejectDepositContract() {
  return useApiMutation((variables: { id: number; data: DepositRejectRequest }) =>
    getSaleService().rejectDepositContract(variables.id, variables.data)
  )
}

export function useDepositContractDropdown(
  params?: GetDepositContractDropdownParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.DEPOSIT_CONTRACTS.DROPDOWN(params || {}),
    () => getSaleService().getDepositContractDropdown(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useDepositContractHistories(
  id: number,
  params?: GetDepositContractHistoriesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.DEPOSIT_CONTRACTS.HISTORIES(id, params || {}),
    () => getSaleService().getDepositContractHistories(id, params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: !!id && (options?.enabled ?? true),
    }
  )
}

export function useDepositContractHistory(
  id: number,
  logId: number,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.DEPOSIT_CONTRACTS.HISTORY_DETAIL(id, logId),
    () => getSaleService().getDepositContractHistory(id, logId),
    {
      staleTime: 1000 * 60 * 5,
      enabled: !!id && !!logId && (options?.enabled ?? true),
    }
  )
}

export function useTransactionSheets(
  params?: GetTransactionSheetsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.TRANSACTION_SHEETS.LIST(params || {}),
    () => getSaleService().getTransactionSheets(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useTransactionSheet(id: number) {
  return useApiQuery(
    QUERY_KEYS.SALES.TRANSACTION_SHEETS.DETAIL(id),
    () => getSaleService().getTransactionSheet(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useCreateTransactionSheet() {
  return useApiMutation((data: TransactionSheetRequest) =>
    getSaleService().createTransactionSheet(data)
  )
}

export function useUpdateTransactionSheet() {
  return useApiMutation((variables: { id: number; data: TransactionSheetRequest }) =>
    getSaleService().updateTransactionSheet(variables.id, variables.data)
  )
}

export function usePartialUpdateTransactionSheet() {
  return useApiMutation((variables: { id: number; data: PatchedTransactionSheetRequest }) =>
    getSaleService().partialUpdateTransactionSheet(variables.id, variables.data)
  )
}

export function useDeleteTransactionSheet() {
  return useApiMutation((id: number) => getSaleService().deleteTransactionSheet(id))
}

export function useApproveTransactionSheet() {
  return useApiMutation((variables: { id: number; data: TransactionApproveRequest }) =>
    getSaleService().approveTransactionSheet(variables.id, variables.data)
  )
}

export function useAdminLeadApproveTransactionSheet() {
  return useApiMutation(
    (variables: {
      id: number
      data: components['schemas']['TransactionAdminLeadApproveRequest']
    }) => getSaleService().adminLeadApproveTransactionSheet(variables.id, variables.data)
  )
}

export function useRejectTransactionSheet() {
  return useApiMutation((variables: { id: number; data: TransactionRejectRequest }) =>
    getSaleService().rejectTransactionSheet(variables.id, variables.data)
  )
}

export function useManagerConfirmTransactionSheet() {
  return useApiMutation((variables: { id: number; data: TransactionManagerConfirmRequest }) =>
    getSaleService().managerConfirmTransactionSheet(variables.id, variables.data)
  )
}

export function useNeedManagerConfirmTransactionSheet(options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.SALES.TRANSACTION_SHEETS.NEED_MANAGER_CONFIRM(),
    () => getSaleService().getNeedManagerConfirmTransactionSheet(),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useTransactionSheetDropdown(
  params?: GetTransactionSheetDropdownParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.TRANSACTION_SHEETS.DROPDOWN(params || {}),
    () => getSaleService().getTransactionSheetDropdown(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useTransactionSheetHistories(
  id: number,
  params?: GetTransactionSheetHistoriesParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.TRANSACTION_SHEETS.HISTORIES(id, params || {}),
    () => getSaleService().getTransactionSheetHistories(id, params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: !!id && (options?.enabled ?? true),
    }
  )
}

export function useTransactionSheetHistory(
  id: number,
  logId: number,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.TRANSACTION_SHEETS.HISTORY_DETAIL(id, logId),
    () => getSaleService().getTransactionSheetHistory(id, logId),
    {
      staleTime: 1000 * 60 * 5,
      enabled: !!id && !!logId && (options?.enabled ?? true),
    }
  )
}

export function useBookingHistories(id: number, params?: GetBookingHistoryParams) {
  return useApiQuery(
    QUERY_KEYS.SALES.BOOKINGS.HISTORY(id),
    () => getSaleService().getBookingHistories(id, params),
    {
      enabled: !!id,
    }
  )
}

export function useBookingHistory(id: number, logId: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.SALES.BOOKINGS.HISTORY_DETAIL(id, logId),
    () => getSaleService().getBookingHistory(id, logId),
    {
      staleTime: 1000 * 60 * 5,
      enabled: !!id && !!logId && (options?.enabled ?? true),
    }
  )
}

export function useSetPriorityOrderBooking() {
  return useApiMutation((variables: { id: number; data: BookingPriorityOrderRequest }) =>
    getSaleService().setPriorityOrderBooking(variables.id, variables.data)
  )
}

export function useBookingConfirmationLogs(
  params?: GetBookingConfirmationLogsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.BOOKINGS.CONFIRMATION_LOGS(
      params as GetBookingConfirmationLogsParams | undefined
    ),
    () => getSaleService().getBookingConfirmationLogs(params),
    options
  )
}

export function useRejectBookingRefundByManager() {
  return useApiMutation((variables: { id: number; data: RejectBookingRefundByManagerRequest }) =>
    getSaleService().rejectBookingRefundByManager(variables.id, variables.data)
  )
}

export function useDepositConfirmationLogs(
  params?: GetDepositConfirmationLogsParams,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    ['sales', 'deposit-confirmation-logs', 'list', JSON.stringify(params || {})],
    () => getSaleService().getDepositConfirmationLogs(params),
    { enabled: options?.enabled ?? true, staleTime: 1000 * 60 * 5 }
  )
}

export function useDepositConfirmationLog(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'deposit-confirmation-logs', 'detail', id],
    () => getSaleService().getDepositConfirmationLog(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

export function useBookingConfirmationLog(id: number, options?: { enabled?: boolean }) {
  return useApiQuery(
    ['sales', 'booking-confirmation-logs', 'detail', id],
    () => getSaleService().getBookingConfirmationLog(id),
    { enabled: !!id && (options?.enabled ?? true), staleTime: 1000 * 60 * 5 }
  )
}

// Booking Refund approval hooks
export function useAccountantApproveBookingRefund() {
  return useApiMutation((variables: { id: number; data: RefundAccountantApproveRequest }) =>
    getSaleService().accountantApproveBookingRefund(variables.id, variables.data)
  )
}

export function useAdminLeadApproveBookingRefund() {
  return useApiMutation((variables: { id: number; data: RefundAdminLeadApproveRequest }) =>
    getSaleService().adminLeadApproveBookingRefund(variables.id, variables.data)
  )
}

export function useTreasurerConfirmBookingRefund() {
  return useApiMutation((variables: { id: number; data: RefundTreasurerConfirmRequest }) =>
    getSaleService().treasurerConfirmBookingRefund(variables.id, variables.data)
  )
}

export function useConfirmRefundBookingPayment() {
  return useApiMutation((variables: { id: number; data: RefundPaymentConfirmRequest }) =>
    getSaleService().confirmRefundBookingPayment(variables.id, variables.data)
  )
}

export function useConfirmRefundBookingInvestorRecovery() {
  return useApiMutation((variables: { id: number; data: InvestorRecoveryRequest }) =>
    getSaleService().confirmRefundBookingInvestorRecovery(variables.id, variables.data)
  )
}

export function useConfirmDepositRefundPayment() {
  return useApiMutation((variables: { id: number; data: RefundPaymentConfirmRequest }) =>
    getSaleService().confirmDepositRefundPayment(variables.id, variables.data)
  )
}

export function useConfirmDepositInvestorRecovery() {
  return useApiMutation((variables: { id: number; data: InvestorRecoveryRequest }) =>
    getSaleService().confirmDepositInvestorRecovery(variables.id, variables.data)
  )
}

// Deposit Contract action hooks
export function useAbandonDepositContract() {
  return useApiMutation((id: number) => getSaleService().abandonDepositContract(id))
}

export function usePreviewReclaimedEmailDepositContract() {
  return useApiMutation((variables: { id: number; data: DepositContractRequest }) =>
    getSaleService().previewReclaimedEmailDepositContract(variables.id, variables.data)
  )
}

export function useSendReclaimedEmailDepositContract() {
  return useApiMutation((id: number) => getSaleService().sendReclaimedEmailDepositContract(id))
}

export function useRefundDepositContract() {
  return useApiMutation((variables: { id: number; data: DepositRefundRequest }) =>
    getSaleService().refundDepositContract(variables.id, variables.data)
  )
}

// Collaborator hooks
export function useCollaborators(params?: GetCollaboratorsParams, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.SALES.COLLABORATORS.LIST(params || {}),
    () => getSaleService().getCollaborators(params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: options?.enabled ?? true,
    }
  )
}

export function useCollaborator(id: number) {
  return useApiQuery(
    QUERY_KEYS.SALES.COLLABORATORS.DETAIL(id),
    () => getSaleService().getCollaborator(id),
    {
      enabled: !!id,
      staleTime: 1000 * 60 * 5,
    }
  )
}

export function useCreateCollaborator() {
  return useApiMutation((data: CollaboratorRequest) => getSaleService().createCollaborator(data))
}

export function useUpdateCollaborator() {
  return useApiMutation((variables: { id: number; data: CollaboratorRequest }) =>
    getSaleService().updateCollaborator(variables.id, variables.data)
  )
}

export function usePartialUpdateCollaborator() {
  return useApiMutation((variables: { id: number; data: PatchedCollaboratorRequest }) =>
    getSaleService().partialUpdateCollaborator(variables.id, variables.data)
  )
}

export function useDeleteCollaborator() {
  return useApiMutation((id: number) => getSaleService().deleteCollaborator(id))
}

export function useCollaboratorHistories(
  id: number,
  params?: Record<string, unknown>,
  options?: { enabled?: boolean }
) {
  return useApiQuery(
    QUERY_KEYS.SALES.COLLABORATORS.HISTORIES(id, params || {}),
    () => getSaleService().getCollaboratorHistories(id, params),
    {
      staleTime: 1000 * 60 * 5,
      enabled: !!id && (options?.enabled ?? true),
    }
  )
}

export function useCollaboratorHistory(id: number, logId: string, options?: { enabled?: boolean }) {
  return useApiQuery(
    QUERY_KEYS.SALES.COLLABORATORS.HISTORY_DETAIL(id, logId),
    () => getSaleService().getCollaboratorHistory(id, logId),
    {
      staleTime: 1000 * 60 * 5,
      enabled: !!id && !!logId && (options?.enabled ?? true),
    }
  )
}

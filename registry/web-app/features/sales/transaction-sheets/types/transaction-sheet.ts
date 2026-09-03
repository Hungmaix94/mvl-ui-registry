import type { components } from '@/api/schema'

export type TransactionSheet = components['schemas']['TransactionSheet']
export type TransactionSale = components['schemas']['TransactionSale']
export type TransactionSheetDropdown = components['schemas']['TransactionSheetDropdown']

export type GetTransactionSheetsParams = components['schemas']['PaginatedTransactionSheetList']
export type GetTransactionSheetParams = components['schemas']['TransactionSheet']

export enum TransactionSheetStatus {
  PENDING_CONFIRM = 'pending_confirm',
  PENDING_MANAGER = 'pending_manager',
  PENDING_ADMIN = 'pending_admin',
  PENDING_ADMIN_LEAD = 'pending_admin_lead',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export const TRANSACTION_SHEET_STATUS: Record<TransactionSheetStatus, string> = {
  pending_confirm: 'Chờ NV xác nhận',
  pending_manager: 'Chờ Quản lý duyệt',
  pending_admin: 'Chờ Thư ký duyệt',
  pending_admin_lead: 'Chờ Trưởng nhóm Admin duyệt',
  approved: 'Đã duyệt',
  rejected: 'Đã từ chối',
}

export type TransactionSaleType = NonNullable<components['schemas']['TransactionSale']['sale_type']>

export const TRANSACTION_SALE_TYPE: Record<TransactionSaleType, string> = {
  mv: 'Nhân viên',
  partner: 'Sàn liên kết',
  collaborator: 'Cộng tác viên',
}

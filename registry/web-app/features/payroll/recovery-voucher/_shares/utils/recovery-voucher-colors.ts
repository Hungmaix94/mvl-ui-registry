import { ColoredValueVariant } from '@/api/schema.ts'
import { RecoveryVoucherStatus, RecoveryVoucherType } from '@/constants/api-schema-aliases'

/**
 * Color mapping for voucher types (from constants)
 */
export const VOUCHER_TYPE_COLOR_MAP: Record<string, ColoredValueVariant> = {
  [RecoveryVoucherType.RECOVERY]: ColoredValueVariant.BLUE,
  [RecoveryVoucherType.BACK_PAY]: ColoredValueVariant.GREEN,
}

/**
 * Color mapping for status (from constants)
 */
export const STATUS_COLOR_MAP: Record<string, ColoredValueVariant> = {
  [RecoveryVoucherStatus.CALCULATED]: ColoredValueVariant.GREY,
  [RecoveryVoucherStatus.NOT_CALCULATED]: ColoredValueVariant.RED,
}

/**
 * Get color variant for voucher type
 */
export const getVoucherTypeVariant = (voucherType: string): ColoredValueVariant => {
  return VOUCHER_TYPE_COLOR_MAP[voucherType] || ColoredValueVariant.GREY
}

/**
 * Get color variant for status
 */
export const getStatusVariant = (status: string): ColoredValueVariant => {
  return STATUS_COLOR_MAP[status] || ColoredValueVariant.GREY
}

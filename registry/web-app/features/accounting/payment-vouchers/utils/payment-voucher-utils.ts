import type useAppConstant from '@/hooks/useAppConstant.ts'
import type { PaymentVoucher } from '@/features/accounting/payment-vouchers/services/payment-voucher-service.ts'
import { APP_PATH } from '@/routes'
import { PaymentVoucherPayeeType as PayeeType } from '@/constants/api-schema-aliases'
type KeysMap = ReturnType<typeof useAppConstant>['keysMap']

/** Trích tên file từ URL chứng từ đính kèm (fallback nhãn mặc định khi parse lỗi). */
export function attachmentNameFromUrl(url: string): string {
  try {
    const segment = new URL(url).pathname.split('/').pop() ?? ''
    return decodeURIComponent(segment) || 'Chứng từ đính kèm'
  } catch {
    return 'Chứng từ đính kèm'
  }
}

// keysMap value có union lỏng (Record | string | number | null) — narrow an toàn về label string
export function labelFrom(keysMap: KeysMap, key: string, value: string): string {
  const labels = keysMap.get(key)
  if (labels && typeof labels === 'object') {
    const label = labels[value]
    if (typeof label === 'string') return label
  }
  return value
}

// payee_name là snapshot chốt khi ghi sổ — ưu tiên nó; phiếu nháp chưa có snapshot
// nên fallback sang detail của đối tượng tương ứng (BE trả null cho 2 detail còn lại)
export function resolvePayee(record: PaymentVoucher): { name: string; code: string } {
  return {
    name:
      record.payee_name ||
      record.payee_employee_detail?.fullname ||
      record.payee_collaborator_detail?.name ||
      record.payee_exchange_detail?.name ||
      '',
    code:
      record.payee_employee_detail?.code ||
      record.payee_collaborator_detail?.code ||
      record.payee_exchange_detail?.code ||
      '',
  }
}

// Subject quyền + trang chi tiết theo loại đối tượng chi.
// SUPPLIER (payee_legal_entity) không có trang chi tiết → không link.
export type PayeeSubject = 'employee' | 'collaborator' | 'exchange'

export function resolvePayeeLink(record: PaymentVoucher): {
  linkTo: string | null
  subject: PayeeSubject | null
} {
  switch (record.payee_type) {
    case PayeeType.EMPLOYEE:
      return {
        linkTo: record.payee_employee
          ? APP_PATH.EMPLOYEE_MANAGEMENT_DETAIL.replace(':id', String(record.payee_employee))
          : null,
        subject: 'employee',
      }
    case PayeeType.COLLABORATOR:
      return {
        linkTo: record.payee_collaborator
          ? APP_PATH.COLLABORATOR_DETAIL.replace(':id', String(record.payee_collaborator))
          : null,
        subject: 'collaborator',
      }
    case PayeeType.EXCHANGE:
      return {
        linkTo: record.payee_exchange
          ? APP_PATH.EXCHANGE_MANAGEMENT_DETAIL.replace(':id', String(record.payee_exchange))
          : null,
        subject: 'exchange',
      }
    default:
      return { linkTo: null, subject: null }
  }
}

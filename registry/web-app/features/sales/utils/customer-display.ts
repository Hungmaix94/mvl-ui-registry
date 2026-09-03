import { CustomerType } from '@/constants/api-schema-aliases'

/**
 * Khách hàng cá nhân và khách hàng doanh nghiệp lưu danh tính ở HAI cặp cột khác nhau:
 * `full_name` / `id_number` cho cá nhân, `business_name` / `business_tax_code` cho doanh
 * nghiệp. Cặp còn lại luôn để trống. Màn nào đọc thẳng một cặp là màn đó hiện `-` cho
 * đúng một nửa số khách (bug 86eyphhtb).
 *
 * Backend đã chuẩn hoá sẵn thành `name` / `identify_number` (property trên model
 * `Customer`, và là field của `CustomerNested`), nên đó là nguồn ưu tiên. Hai cặp cột thô
 * chỉ còn là đường lui cho serializer nào chưa gửi cặp chuẩn hoá.
 *
 * Chỉ trả VỀ GIÁ TRỊ, không trả nhãn: mỗi màn đang dùng chữ khác nhau cho cùng một ô
 * (`CMND / CCCD` ở chi tiết giao dịch, `CCCD` ở `CustomerPreviewBox`), và thống nhất lại
 * chữ hiển thị là quyết định của nghiệp vụ chứ không phải của helper này.
 *
 * `CustomerPreviewBox.tsx` đang giữ đúng bộ luật này viết inline. Nó KHÔNG hỏng nên lần
 * này không đụng vào; chuyển nó sang dùng helper là việc nên làm nhưng là một thay đổi
 * riêng.
 */
export type CustomerDisplaySource = {
  customer_type?: string | null
  /** Tên đã chuẩn hoá theo loại khách — nguồn ưu tiên. */
  name?: string | null
  /** Định danh đã chuẩn hoá theo loại khách — nguồn ưu tiên. */
  identify_number?: string | null
  full_name?: string | null
  id_number?: string | null
  business_name?: string | null
  business_tax_code?: string | null
}

export type CustomerDisplay = {
  isBusiness: boolean
  /** Rỗng khi không có nguồn nào — người gọi tự quyết ký tự thay thế (`-` hay `—`). */
  name: string
  /** Rỗng khi không có nguồn nào. */
  identifyNumber: string
}

const firstNonEmpty = (...values: Array<string | null | undefined>): string =>
  values.find((value) => typeof value === 'string' && value.trim() !== '') ?? ''

export function resolveCustomerDisplay(
  customer: CustomerDisplaySource | null | undefined
): CustomerDisplay {
  const isBusiness = customer?.customer_type === CustomerType.business

  return {
    isBusiness,
    name: firstNonEmpty(customer?.name, isBusiness ? customer?.business_name : customer?.full_name),
    identifyNumber: firstNonEmpty(
      customer?.identify_number,
      isBusiness ? customer?.business_tax_code : customer?.id_number
    ),
  }
}

export default resolveCustomerDisplay

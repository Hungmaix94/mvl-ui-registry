import { Flex } from '@radix-ui/themes'
import { formatDate } from '@/utils/date-utils'
import { components } from '@/api/schema'
import { useMemo } from 'react'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { DetailRow } from '@/components/commons'
import { Grid } from '@/components/ui'
import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection.tsx'
import { Separator } from '@radix-ui/themes'
import { CustomerType as CustomerType } from '@/constants/api-schema-aliases'

type Customer = components['schemas']['Customer']

interface CustomerDetailProps {
  customer?: Customer
}

export function CustomerDetail({ customer }: CustomerDetailProps) {
  const { keysMap } = useAppConstant({
    module: 'sales',
    keys: [APP_CONSTANT_KEY.SALES.CUSTOMER.TYPE],
  })

  const customerTypeLabel = useMemo(() => {
    const typeMap = keysMap.get(APP_CONSTANT_KEY.SALES.CUSTOMER.TYPE) as
      | Record<string, string>
      | null
      | undefined
    return (
      (customer?.customer_type && typeMap?.[customer.customer_type]) ||
      customer?.customer_type ||
      '-'
    )
  }, [keysMap, customer?.customer_type])

  return (
    <Flex direction="column" gap="5" className="px-10 py-4">
      <h2 className="text-content-dark-primary text-lg font-semibold">Chi tiết khách hàng</h2>
      {customer?.customer_type === CustomerType.individual && (
        <Grid cols={2} gap="6">
          <div>
            <DetailRow label="Mã khách hàng" value={customer?.code} />
            <DetailRow label="Loại khách hàng" value={customerTypeLabel} />
            <DetailRow
              label="Họ và tên"
              value={
                (customer as unknown as { name?: string; full_name?: string })?.name ||
                customer?.full_name
              }
            />
            <DetailRow label="Số điện thoại" value={customer?.phone} />
            <DetailRow label="Email" value={customer?.email} />
            <DetailRow
              label="Giới tính"
              value={
                customer?.gender === 'male' ? 'Nam' : customer?.gender === 'female' ? 'Nữ' : '-'
              }
            />
          </div>
          <div>
            <DetailRow
              label="Ngày sinh"
              value={customer?.date_of_birth ? formatDate(new Date(customer.date_of_birth)) : '-'}
            />
            <DetailRow label="CCCD" value={customer?.id_number} />
            <DetailRow
              label="Ngày cấp CCCD"
              value={customer?.id_issued_date ? formatDate(new Date(customer.id_issued_date)) : '-'}
            />
            <DetailRow label="Tỉnh/Thành phố" value={customer?.province_detail?.name} />
            <DetailRow label="Phường/Xã" value={customer?.ward_detail?.name} />
            <DetailRow label="Địa chỉ thường trú (theo CCCD)" value={customer?.address_detail} />
            <DetailRow label="Ghi chú" value={customer?.note} />
          </div>
        </Grid>
      )}

      {customer?.customer_type === CustomerType.business && (
        <Grid cols={2} gap="6">
          <div>
            <DetailRow label="Mã khách hàng" value={customer?.code} />
            <DetailRow label="Loại khách hàng" value={customerTypeLabel} />
            <DetailRow label="Số điện thoại" value={customer?.phone} />
            <DetailRow label="Email" value={customer?.email} />
            <DetailRow label="Tên doanh nghiệp" value={customer?.business_name} />
            <DetailRow label="Mã số thuế" value={customer?.business_tax_code} />
          </div>
          <div>
            <DetailRow
              label="Người đại diện doanh nghiệp (theo PL/UQ)"
              value={customer?.business_representative}
            />
            <DetailRow
              label="Chức vụ người đại diện"
              value={customer?.business_representative_title}
            />
            <DetailRow label="Tỉnh/Thành phố" value={customer?.business_province_detail?.name} />
            <DetailRow label="Phường/Xã" value={customer?.business_ward_detail?.name} />
            <DetailRow label="Địa chỉ (theo ĐKKD)" value={customer?.business_address} />
            <DetailRow label="Ghi chú" value={customer?.note} />
          </div>
        </Grid>
      )}

      <Separator orientation="horizontal" className="my-4 !w-full" />

      <AttachmentSection
        attachments={
          (
            customer && 'attachments' in customer
              ? (customer as unknown as { attachments: any[] }).attachments
              : undefined
          )
            ? (customer as unknown as { attachments: any[] }).attachments.map((file: any) => ({
                id: file.id,
                file_name: file.file_name,
                file_path: file.file_path,
                size: file.size,
                download_url: file.download_url,
              }))
            : []
        }
        isRequired={false}
      />
    </Flex>
  )
}

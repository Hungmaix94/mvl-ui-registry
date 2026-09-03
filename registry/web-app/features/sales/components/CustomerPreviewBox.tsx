import React from 'react'
import { DisplayField } from '@/components/commons/DisplayField'
import Chip from '@/components/ui/chip/Chip'
import { ColoredValueVariant } from '@/api/schema'

type CustomerPreviewBoxProps = {
  customerData: any
}

export const CustomerPreviewBox: React.FC<CustomerPreviewBoxProps> = ({ customerData }) => {
  if (!customerData || (!customerData.id && !customerData.code)) return null

  const isBusiness =
    customerData.customer_type === 'business' || customerData.customer_type === 'Business'

  const displayName =
    customerData.name || customerData.full_name || customerData.business_name || '-'
  const displayId =
    customerData.identify_number || customerData.id_number || customerData.business_tax_code || '-'

  return (
    <div className="border-border-1 bg-surface-primary-default mt-4 rounded-xl border p-6 lg:col-span-3">
      <div className="border-border-1 mb-4 flex items-center gap-3 border-b pb-4">
        <h4 className="text-text-primary-default text-lg font-semibold">{displayName}</h4>
        <Chip
          label={isBusiness ? 'Doanh nghiệp' : 'Cá nhân'}
          variant={ColoredValueVariant.BLUE}
          size="small"
        />
      </div>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <DisplayField
          label={isBusiness ? 'Tên doanh nghiệp' : 'Tên khách hàng'}
          value={displayName}
        />
        <DisplayField label={isBusiness ? 'Mã số thuế' : 'CCCD'} value={displayId} />
        <DisplayField label="SĐT" value={customerData.phone || '-'} />
        <DisplayField label="Email" value={customerData.email || '-'} />
      </div>
    </div>
  )
}

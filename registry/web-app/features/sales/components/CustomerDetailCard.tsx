import { Flex } from '@radix-ui/themes'
import { Text } from '@/components/ui'
import Chip from '@/components/ui/chip/Chip'
import { ColoredValueVariant } from '@/api/schema'
import { Link } from 'react-router-dom'
import { APP_PATH } from '@/routes/AppRoute.constant'

export type SharedCustomerData = {
  id?: number | string | null
  customer_type?: 'individual' | 'business' | string | null
  code?: string | null
  name?: string | null
  identify_number?: string | null
  phone?: string | null
  email?: string | null
}

type Props = {
  customer: SharedCustomerData
}

export const CustomerDetailCard = ({ customer }: Props) => {
  const isBusiness = customer.customer_type === 'business'
  const displayName = customer.name || '-'
  const displayId = customer.identify_number || '-'

  return (
    <div className="border-border-1 bg-surface-primary-default flex rounded-xl border p-6">
      <div className="w-full">
        {/* Header Khu vực thẻ */}
        <Flex direction="column" gap="2" className="border-border-1 mb-4 border-b pb-4">
          <Text className="text-content-dark-3 typo-body-base-regular">{customer.code || '-'}</Text>
          <Flex align="center" gap="3">
            {customer.id ? (
              <Link
                to={APP_PATH.CUSTOMER_MANAGER_DETAIL.replace(':id', String(customer.id))}
                className="text-brand-primary hover:text-brand-secondary typo-body-xl-semibold transition-colors"
                target="_blank"
              >
                {displayName}
              </Link>
            ) : (
              <Text className="text-content-dark-1 typo-body-xl-semibold">{displayName}</Text>
            )}
            <Chip
              label={isBusiness ? 'Doanh nghiệp' : 'Cá nhân'}
              variant={ColoredValueVariant.BLUE}
              size="small"
            />
          </Flex>
        </Flex>

        <div className="grid grid-cols-1 gap-x-4 gap-y-6 md:grid-cols-4">
          <div className="col-span-1 flex flex-col gap-1 md:col-span-1">
            <Text className="text-content-dark-3 typo-body-small-medium">
              {isBusiness ? 'Tên doanh nghiệp' : 'Tên khách hàng'}
            </Text>
            <Text className="text-content-dark-1 typo-body-base-regular">{displayName}</Text>
          </div>
          <div className="col-span-1 flex flex-col gap-1">
            <Text className="text-content-dark-3 typo-body-small-medium">
              {isBusiness ? 'Mã số thuế' : 'CCCD'}
            </Text>
            <Text className="text-content-dark-1 typo-body-base-regular">{displayId}</Text>
          </div>
          {customer.phone && (
            <div className="col-span-1 flex flex-col gap-1">
              <Text className="text-content-dark-3 typo-body-small-medium">SĐT</Text>
              <Text className="text-content-dark-1 typo-body-base-regular">{customer.phone}</Text>
            </div>
          )}
          {customer.email && (
            <div className="col-span-1 flex flex-col gap-1 md:col-span-1">
              <Text className="text-content-dark-3 typo-body-small-medium">Email</Text>
              <Text className="text-content-dark-1 typo-body-base-regular">{customer.email}</Text>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

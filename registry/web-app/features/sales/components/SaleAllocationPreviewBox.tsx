import React from 'react'
import { APP_PATH } from '@/routes'
import { Link } from 'react-router-dom'
import { Flex, Text } from '@radix-ui/themes'
import { IconEye } from '@/assets/icons'
import { DisplayField } from '@/components/commons/DisplayField'
import { components } from '@/api/schema'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

type SaleAllocation = components['schemas']['SalesAllocation'] | any

type SaleAllocationPreviewBoxProps = {
  saleAllocationData: SaleAllocation
  productType?: string
  sourceType?: string
  investorName?: string
  sourceExchangeName?: string
}

export const SaleAllocationPreviewBox: React.FC<SaleAllocationPreviewBoxProps> = ({
  saleAllocationData,
  sourceType,
  investorName,
  sourceExchangeName,
}) => {
  const { keysMapOptions } = useAppConstant({
    module: 'realestate',
    keys: [
      APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_PRODUCT_TYPE_CHOICES,
      APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_SOURCE_TYPE_CHOICES,
      APP_CONSTANT_KEY.REALESTATE.SALES_ALLOCATION_SOURCE_TYPE_CHOICES,
    ],
  })

  if (!saleAllocationData || !saleAllocationData.id) return null

  // We fall back to sa properties if explicit overrides aren't provided
  const st = sourceType || saleAllocationData.source_type
  const invName =
    investorName || saleAllocationData.investor?.name || saleAllocationData.project?.investor?.name
  const exName = sourceExchangeName || saleAllocationData.source_exchange?.name

  const getLabel = (key: string, val: string) => {
    const options = keysMapOptions.get(key) || []
    const option = options.find((opt: any) => opt.value === val)
    return option ? option.label : val
  }

  return (
    <div className="group border-border-1 bg-surface-primary-default mt-2 flex flex-col gap-6 rounded-lg border p-6 transition-colors hover:border-gray-300">
      <Flex direction="column" gap="1">
        <Text className="text-content-dark-3 typo-body-base-medium">
          {saleAllocationData.code || '-'}
        </Text>
        <div className="flex items-center gap-2">
          <Text className="text-content-dark-1 typo-body-xl-semibold">
            {saleAllocationData.name || '-'}
          </Text>
          <Link
            to={APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(
              ':id',
              String(saleAllocationData.id)
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-brand-primary text-gray-400 transition-colors"
            title="Xem chi tiết thông tin bán hàng"
          >
            <IconEye size={18} />
          </Link>
        </div>
      </Flex>

      <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-5">
        <DisplayField
          label="Loại nguồn nhập"
          value={
            getLabel(APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_SOURCE_TYPE_CHOICES, st) ||
            getLabel(APP_CONSTANT_KEY.REALESTATE.SALES_ALLOCATION_SOURCE_TYPE_CHOICES, st) ||
            '-'
          }
        />
        <DisplayField label="Nguồn nhập" value={st === 'F0' ? exName || '-' : invName || '-'} />
        <DisplayField
          label="Giai đoạn hiện tại"
          value={saleAllocationData.process_status || 'Đang mở bán'}
        />
        <div className="col-span-1 md:col-span-1">
          <DisplayField label="Chủ đầu tư" value={invName || '-'} />
        </div>
      </div>
    </div>
  )
}

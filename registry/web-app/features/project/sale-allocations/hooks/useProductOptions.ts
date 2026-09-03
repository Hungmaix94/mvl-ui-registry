import { useMemo } from 'react'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import useAppConstant from '@/hooks/useAppConstant'
import { ProductStatus } from '@/features/project/sale-allocations/types/product'
import { ColoredValueVariant } from '@/api/schema.ts'

export const STATUS_VARIANTS: Record<ProductStatus | string, ColoredValueVariant> = {
  [ProductStatus.AVAILABLE]: ColoredValueVariant.GREEN,
  [ProductStatus.RESERVED]: ColoredValueVariant.YELLOW,
  [ProductStatus.DEPOSITED]: ColoredValueVariant.BLUE,
  [ProductStatus.SOLD]: ColoredValueVariant.RED,
  [ProductStatus.LOCKED]: ColoredValueVariant.GREY,
}

export const useProductOptions = () => {
  const { keysMapOptions } = useAppConstant({
    module: 'realestate',
    keys: [
      APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_PRODUCT_TYPE_CHOICES,
      APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_STATUS_CHOICES,
      APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_SOURCE_TYPE_CHOICES,
    ],
  })

  const productTypeOptions = useMemo(
    () =>
      keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_PRODUCT_TYPE_CHOICES) ?? [],
    [keysMapOptions]
  )

  const statusOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_STATUS_CHOICES) ?? [],
    [keysMapOptions]
  )

  const sourceTypeOptions = useMemo(
    () =>
      keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.PRODUCT_INVENTORY_SOURCE_TYPE_CHOICES) ?? [],
    [keysMapOptions]
  )

  const getStatusLabel = (statusValue?: string) => {
    if (!statusValue) return '-'
    const found = statusOptions.find((opt) => opt.value === statusValue)
    return found ? found.label : statusValue
  }

  const getProductTypeLabel = (typeValue?: string) => {
    if (!typeValue) return '-'
    const found = productTypeOptions.find((opt) => opt.value === typeValue)
    return found ? found.label : typeValue
  }

  const getSourceTypeLabel = (sourceValue?: string) => {
    if (!sourceValue) return '-'
    const found = sourceTypeOptions.find((opt) => opt.value === sourceValue)
    return found ? found.label : sourceValue
  }

  return {
    productTypeOptions,
    statusOptions,
    sourceTypeOptions,
    getStatusLabel,
    getProductTypeLabel,
    getSourceTypeLabel,
  }
}

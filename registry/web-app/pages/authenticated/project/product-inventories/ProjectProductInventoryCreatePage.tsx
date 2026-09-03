import { useNavigate, useSearchParams } from 'react-router-dom'
import { useRef } from 'react'
import { Flex } from '@radix-ui/themes'
import { useQueryClient } from '@tanstack/react-query'

import { PageTitle } from '@/components/ui'
import { QUERY_KEYS } from '@/constants'
import type { ProductInventoryFormValues } from '@/features/project/product-inventories/types/product-inventory-form-types'
import { useSalesAllocation } from '@/features/project/sale-allocations/services/sales-allocation-service'
import { useCreateSalesAllocationProductInventory } from '@/services/realestate-service'
import type { ProductInventoryRequest } from '@/services/realestate-service'
import toastService from '@/services/toast-service'
import { handleApiError } from '@/utils/error-utils'

import ProductInventoryForm, {
  type ProductInventoryFormRef,
} from './components/ProductInventoryForm'

export const ProjectProductInventoryCreatePage = () => {
  const [searchParams] = useSearchParams()
  const saId = searchParams.get('saId') ?? ''
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const formRef = useRef<ProductInventoryFormRef>(null)

  const { data: salesAllocation, isLoading: isSaloading } = useSalesAllocation(saId ?? '')
  const { mutateAsync: createProductInventory, isPending } =
    useCreateSalesAllocationProductInventory()

  const handleSubmit = async (values: ProductInventoryFormValues) => {
    try {
      if (!saId) {
        toastService.error('Không tìm thấy đợt bán hàng')
        return
      }
      const { investor_id, project_id, ...submitData } = values

      const payload: ProductInventoryRequest = {
        ...submitData,
        sales_allocation_id: Number(saId),
        product_type: submitData.product_type as ProductInventoryRequest['product_type'],
        tower: submitData.tower || '',
        listed_price: String(submitData.listed_price),
        fee_calculation_price: String(submitData.fee_calculation_price),
        price_per_sqm: submitData.price_per_sqm ? String(submitData.price_per_sqm) : null,
        area: submitData.area ? String(submitData.area).replace(/,/g, '.') : undefined,
        ...(submitData.files && submitData.files.length > 0
          ? { files: { attachments: submitData.files } }
          : { files: undefined }),
      }

      await createProductInventory({ saPk: Number(saId), data: payload })
      toastService.success('Tạo bất động sản thành công')
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.REALESTATE.SALES_ALLOCATIONS.PRODUCT_INVENTORIES.LIST(
          Number(saId),
          {}
        ),
      })
      navigate(-1)
    } catch (error: any) {
      console.error('Failed to create product inventory', error)
      handleApiError(error, formRef.current?.setError)
    }
  }

  return (
    <>
      <PageTitle enableBackButton />
      <Flex flexGrow={'1'} direction="column" gap="4" className="px-10 py-4 pb-10">
        {isSaloading ? (
          <div>Đang tải...</div>
        ) : (
          <ProductInventoryForm
            ref={formRef}
            initialValues={
              salesAllocation
                ? {
                    project_id: salesAllocation.project?.id,
                    investor_id: salesAllocation.investor?.id,
                    sales_allocation_id: saId ? Number(saId) : undefined,
                  }
                : undefined
            }
            contextSaId={saId ? Number(saId) : undefined}
            onSubmit={handleSubmit}
            onCancel={() => navigate(-1)}
            isSubmitting={isPending}
          />
        )}
      </Flex>
    </>
  )
}

export default ProjectProductInventoryCreatePage

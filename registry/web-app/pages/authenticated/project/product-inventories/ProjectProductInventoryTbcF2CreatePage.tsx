import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useRef } from 'react'
import { PageTitle } from '@/components/ui/page-title'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { Button } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import {
  ProjectProductInventoryTbcF2Form,
  TbcF2FormRef,
} from '@/features/project/product-inventories/components/tbc/ProjectProductInventoryTbcF2Form'
import {
  useCreateProductInventoryTbc,
  useProductInventoryTbcItem,
} from '@/features/project/product-inventories/services/product-inventory-tbc-service'
import { useProductInventory } from '@/services/realestate-service'
import { handleApiError } from '@/utils/error-utils'
import toastService from '@/services/toast-service'
import { useAbility } from '@/lib/ability'

export default function ProjectProductInventoryTbcF2CreatePage() {
  const ability = useAbility()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const exchangeIdStr = searchParams.get('exchangeId')
  const exchangeName = searchParams.get('exchangeName') || 'Sàn'
  const cloneId = searchParams.get('cloneId')
  const navigate = useNavigate()

  const formRef = useRef<TbcF2FormRef>(null)

  const { data: productInventory } = useProductInventory(Number(id))
  const saId = productInventory?.sales_allocation?.id
    ? String(productInventory.sales_allocation.id)
    : ''

  const { data: cloneData, isLoading: isLoadingClone } = useProductInventoryTbcItem(
    id as string,
    'tbc-f2s',
    cloneId as string
  )

  const cloneRecord = cloneData?.record || cloneData

  const initialValues: any = cloneRecord
    ? {
        ...cloneRecord,
        effective_from: undefined,
        effective_to: undefined,
        exchange: cloneRecord.exchange?.id ?? cloneRecord.exchange,
      }
    : undefined

  const isInitializing = !!cloneId && isLoadingClone

  const { mutateAsync: createPeriod, isPending: isCreating } = useCreateProductInventoryTbc(
    id as string,
    'tbc-f2s'
  )

  const handleBack = () => {
    navigate(
      `${APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL.replace(':saId', saId as string).replace(':id', id as string)}?tab=f2`
    )
  }

  const handleSave = () => {
    if (formRef.current) {
      formRef.current.handleSubmit(async (payload: any) => {
        try {
          await createPeriod(payload)
          toastService.success('Tạo cấu hình mới thành công!')
          handleBack()
        } catch (error) {
          handleApiError(error, formRef.current?.setError as any)
        }
      })()
    }
  }

  return (
    <>
      <PageTitle
        title={
          exchangeIdStr
            ? `Thêm thiết lập hoa hồng — ${exchangeName}`
            : 'Tạo cấu hình sàn liên kết mới'
        }
        enableBackButton
        breadcrumb={[
          { label: 'Quản lý thông tin bán hàng', href: APP_PATH.PROJECT_SALE_ALLOCATIONS },
          {
            label: productInventory?.unit_number || 'Chi tiết thông tin bán hàng',
            href: APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL.replace(
              ':saId',
              saId as string
            ).replace(':id', id as string),
          },
          {
            label: 'Cấu hình sàn liên kết',
            href:
              APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL.replace(':saId', saId as string).replace(
                ':id',
                id as string
              ) + '?tab=f2',
          },
          { label: 'Tạo mới', isCurrentPage: true },
        ]}
        handleBackButton={handleBack}
      />
      <DetailPageWrapper
        isLoading={isInitializing}
        isError={false}
        isNotFound={false}
        // Lượt GET-by-id DUY NHẤT trang này luôn gọi để render (breadcrumb + `saId` cho nút quay lại)
        // là `useProductInventory(id)` → `product_inventory.retrieve`. Lượt `useProductInventoryTbcItem`
        // chỉ chạy khi có `cloneId` nên không phải điều kiện vào màn.
        // KHÔNG lấy `project.update` của route: subject cắt ở dấu chấm cuối nên `project` ≠
        // `product_inventory` (tiền lệ ProductInventoryTable, ClickUp 86eynyqfh).
        hasPermission={ability.can('retrieve', 'product_inventory')}
      >
        <Flex flexGrow="1" direction="column" gap="5" className="px-10 py-4">
          {!isInitializing && (
            <div className="flex flex-col gap-6">
              <ProjectProductInventoryTbcF2Form
                ref={formRef}
                exchangeId={exchangeIdStr ? Number(exchangeIdStr) : undefined}
                exchangeName={exchangeName}
                initialValues={initialValues}
              />
              <Flex gap="3" justify="end" className="mt-4">
                <Button
                  variant="secondary"
                  onClick={handleBack}
                  disabled={isCreating}
                  className="min-w-[120px]"
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSave}
                  loading={isCreating}
                  disabled={isCreating}
                  className="min-w-[120px]"
                >
                  Lưu
                </Button>
              </Flex>
            </div>
          )}
        </Flex>
      </DetailPageWrapper>
    </>
  )
}

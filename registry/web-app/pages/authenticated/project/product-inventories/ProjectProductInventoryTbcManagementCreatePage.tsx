import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useRef } from 'react'
import { PageTitle } from '@/components/ui/page-title'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { Button } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import {
  SaleAllocationTbcManagementForm,
  TbcManagementFormRef,
  TbcManagementFormValues,
} from '@/features/project/sale-allocations/components/SaleAllocationTbcManagementForm'
import {
  useCreateProductInventoryTbc,
  useProductInventoryTbcItem,
} from '@/features/project/product-inventories/services/product-inventory-tbc-service'
import { useSalesAllocationTbc } from '@/features/project/sale-allocations/services/sales-allocation-service'
import { useProductInventory } from '@/services/realestate-service'
import { handleApiError } from '@/utils/error-utils'
import toastService from '@/services/toast-service'
import { serializeRatesForApi } from '@/features/project/sale-allocations/components/tbc-management-helpers'
import { formatDateToApi } from '@/utils/date-utils'
import { useAbility } from '@/lib/ability'

export default function ProjectProductInventoryTbcManagementCreatePage() {
  const ability = useAbility()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const cloneFromId = searchParams.get('cloneFrom')
  const cloneFromType = searchParams.get('cloneFromType')
  const navigate = useNavigate()

  const formRef = useRef<TbcManagementFormRef>(null)

  const { data: productInventory } = useProductInventory(Number(id))
  const saId = productInventory?.sales_allocation?.id
    ? String(productInventory.sales_allocation.id)
    : ''

  const { data: cloneDataPI, isLoading: isLoadingClonePI } = useProductInventoryTbcItem(
    id as string,
    'tbc-management',
    cloneFromType !== 'sa' ? (cloneFromId as string) : undefined
  )

  const { data: cloneDataSA, isLoading: isLoadingCloneSA } = useSalesAllocationTbc(
    saId as string,
    'tbc-management',
    cloneFromType === 'sa' ? (cloneFromId as string) : undefined
  )

  const cloneData = cloneFromType === 'sa' ? cloneDataSA : cloneDataPI
  const isLoadingClone = cloneFromType === 'sa' ? isLoadingCloneSA : isLoadingClonePI

  const { mutateAsync: createPeriod, isPending: isCreating } = useCreateProductInventoryTbc(
    id as string,
    'tbc-management'
  )

  const handleBack = () => {
    navigate(
      `${APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL.replace(':saId', saId as string).replace(':id', id as string)}?tab=tbc`
    )
  }

  const handleSave = () => {
    if (formRef.current) {
      formRef.current.handleSubmit(async (values: TbcManagementFormValues) => {
        try {
          const formattedDate = values.effective_from
            ? formatDateToApi(values.effective_from)
            : null

          const payload = {
            ...values,
            effective_from: formattedDate,
            effective_to: values.effective_to ? formatDateToApi(values.effective_to) : null,
            rates: serializeRatesForApi(values.rates),
          }
          await createPeriod(payload)
          toastService.success('Tạo cấu hình mới thành công!')
          handleBack()
        } catch (error) {
          handleApiError(error, formRef.current?.setError as any)
        }
      })()
    }
  }

  const cloneRecord = cloneData?.record || cloneData

  const initialValues: Partial<TbcManagementFormValues> | undefined = cloneRecord
    ? {
        ...cloneRecord,
        effective_from: undefined,
        effective_to: undefined,
      }
    : undefined

  // Wait for cloneData to be ready if cloneFromId is present
  const isInitializing = !!cloneFromId && isLoadingClone

  return (
    <>
      <PageTitle
        title="Tạo mới Thưởng HH quản lý"
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
            label: 'Cấu hình phí và thưởng',
            href:
              APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL.replace(':saId', saId as string).replace(
                ':id',
                id as string
              ) + '?tab=tbc',
          },
          { label: 'Tạo mới Thưởng HH quản lý', isCurrentPage: true },
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
            <SaleAllocationTbcManagementForm
              ref={formRef}
              initialValues={initialValues}
              onSubmit={() => {}} // handled by handleSave
            />
          )}
          <Flex gap="3" justify="end" className="border-neutral-20 mt-4 border-t pt-6">
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
        </Flex>
      </DetailPageWrapper>
    </>
  )
}

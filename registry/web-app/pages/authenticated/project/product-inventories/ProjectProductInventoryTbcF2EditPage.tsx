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
  useProductInventoryTbcItem,
  useUpdateProductInventoryTbc,
} from '@/features/project/product-inventories/services/product-inventory-tbc-service'
import { useProductInventory } from '@/services/realestate-service'
import { handleApiError } from '@/utils/error-utils'
import toastService from '@/services/toast-service'
import { useAbility } from '@/lib/ability'

export default function ProjectProductInventoryTbcF2EditPage() {
  const ability = useAbility()
  const { id, tbcId } = useParams()
  const [searchParams] = useSearchParams()
  const exchangeName = searchParams.get('exchangeName') || 'Sàn'
  const navigate = useNavigate()

  const formRef = useRef<TbcF2FormRef>(null)

  const { data: productInventory } = useProductInventory(Number(id))
  const saId = productInventory?.sales_allocation?.id
    ? String(productInventory.sales_allocation.id)
    : ''

  const { data: tbcItem, isLoading: isLoadingItem } = useProductInventoryTbcItem(
    id as string,
    'tbc-f2s',
    tbcId as string
  )

  const { mutateAsync: updatePeriod, isPending: isUpdating } = useUpdateProductInventoryTbc(
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
          await updatePeriod({ id: tbcId as string, data: payload })
          toastService.success('Cập nhật cấu hình thành công!')
          handleBack()
        } catch (error) {
          handleApiError(error, formRef.current?.setError as any)
        }
      })()
    }
  }

  const record = tbcItem?.record || tbcItem

  const initialValues = record
    ? {
        ...record,
      }
    : undefined

  const initialDateRange = record
    ? {
        from: record.effective_from ? new Date(record.effective_from) : undefined,
        to: record.effective_to ? new Date(record.effective_to) : undefined,
      }
    : undefined

  return (
    <>
      <PageTitle
        title={`Chỉnh sửa cấu hình sàn liên kết - ${exchangeName}`}
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
          { label: 'Chỉnh sửa', isCurrentPage: true },
        ]}
        handleBackButton={handleBack}
      />
      <DetailPageWrapper
        isLoading={isLoadingItem}
        isError={false}
        isNotFound={false}
        // Trang gọi HAI lượt GET-by-id để render, nên cần HAI mã (tiền lệ "một hành động, hai bước
        // ⇒ hai mã" ở docs/ai/conventions.md): `useProductInventoryTbcItem(id,'tbc-f2s',tbcId)`
        // → `GET .../tbc-f2s/{id}/` → `pi_tbc_f2.retrieve` (chính bản ghi đang sửa), và
        // `useProductInventory(id)` → `product_inventory.retrieve` (breadcrumb + `saId`).
        // KHÔNG lấy `project.update` của route: subject cắt ở dấu chấm cuối nên `project` là một
        // subject khác hẳn (tiền lệ ProductInventoryTable, ClickUp 86eynyqfh).
        hasPermission={
          ability.can('retrieve', 'pi_tbc_f2') && ability.can('retrieve', 'product_inventory')
        }
      >
        <Flex flexGrow="1" direction="column" gap="5" className="px-10 py-4">
          <div className="flex flex-col gap-6">
            {!isLoadingItem && record && (
              <ProjectProductInventoryTbcF2Form
                ref={formRef}
                initialValues={initialValues}
                initialDateRange={initialDateRange}
                exchangeId={record.exchange}
                exchangeName={exchangeName}
              />
            )}
            <Flex gap="3" justify="end" className="mt-4">
              <Button
                variant="secondary"
                onClick={handleBack}
                disabled={isUpdating}
                className="min-w-[120px]"
              >
                Hủy
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                loading={isUpdating}
                disabled={isUpdating}
                className="min-w-[120px]"
              >
                Lưu
              </Button>
            </Flex>
          </div>
        </Flex>
      </DetailPageWrapper>
    </>
  )
}

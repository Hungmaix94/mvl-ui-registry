import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useState, useRef, useMemo } from 'react'
import { Tabs, Flex, Text } from '@radix-ui/themes'
import { useAbility } from '@/lib/ability'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'

import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { PageTitle, Button } from '@/components/ui'
import { IconPencil, IconCheck, IconX } from '@/assets/icons'
import toastService from '@/services/toast-service'
import { APP_PATH } from '@/routes'
import { useProductInventory, useUpdateProductInventory } from '@/services/realestate-service'
import type { ProductInventoryRequest } from '@/services/realestate-service'
import type { ProductInventoryFormValues } from '@/features/project/product-inventories/types/product-inventory-form-types'
import { QUERY_KEYS } from '@/constants'

import ProductInventoryDetail from './components/ProductInventoryDetail.tsx'
import {
  ProductInventoryForm,
  type ProductInventoryFormRef,
} from './components/ProductInventoryForm'
import { handleApiError } from '@/utils/error-utils'
import ProjectProductInventoryTbcManagementTable from '@/features/project/product-inventories/components/tbc/ProjectProductInventoryTbcManagementTable'
import { PiF2Table } from '@/features/project/product-inventories/components/tbc/PiF2Table'
import ProjectProductInventoryTbcCommissionTable from '@/features/project/product-inventories/components/tbc/ProjectProductInventoryTbcCommissionTable'

const ProjectProductInventoryDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const ability = useAbility()
  const queryClient = useQueryClient()
  const formRef = useRef<ProductInventoryFormRef>(null)

  const { user } = useAuth()

  const canViewTbc = ability.can('list', 'pi_tbc')
  const canViewF2 = ability.can('list', 'pi_tbc_f2')
  const canViewTargets =
    ability.can('list', 'pi_tbc_management') &&
    (user?.is_superuser || user?.role?.code === 'super_admin' || user?.role?.code === 'manager')

  const activeTabFromUrl = searchParams.get('tab') || 'general'
  const activeTab = useMemo(() => {
    if (activeTabFromUrl === 'tbc' && !canViewTbc) return 'general'
    if (activeTabFromUrl === 'f2' && !canViewF2) return 'general'
    if (activeTabFromUrl === 'targets' && !canViewTargets) return 'general'
    return activeTabFromUrl
  }, [activeTabFromUrl, canViewTbc, canViewF2, canViewTargets])
  const isEditmode = searchParams.get('isEditmode') === 'true'
  const [isEditingGeneral, setIsEditingGeneral] = useState(isEditmode && activeTab === 'general')

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val })
  }

  const { mutateAsync: updateProductInventory, isPending: isUpdating } = useUpdateProductInventory()

  const handleUpdateGeneral = async (data: ProductInventoryFormValues) => {
    if (!id) return
    try {
      const { investor_id, project_id, ...submitData } = data

      const payload: ProductInventoryRequest = {
        ...submitData,
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

      await updateProductInventory({ id: Number(id), data: payload })
      toastService.success('Cập nhật Bất động sản thành công')
      setIsEditingGeneral(false)
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.REALESTATE.PRODUCT_INVENTORIES.DETAIL(Number(id)),
      })
    } catch (error: any) {
      console.error('Failed to update product inventory', error)
      handleApiError(error, formRef.current?.setError)
    }
  }

  const { data: productInfo, isLoading, error: loadError } = useProductInventory(Number(id))

  const salesAllocationId = productInfo?.sales_allocation?.id

  const isError = !!loadError
  const isNotFound =
    !!loadError && (loadError as unknown as Record<string, any>)?.response?.status === 404

  // Quyền của trang lấy theo endpoint trang GỌI để render: `useProductInventory(id)` →
  // `GET /realestate/product-inventories/{id}/` → `product_inventory.retrieve`.
  // KHÔNG lấy `project.retrieve` của route: `parsePermissionCode` cắt subject ở dấu chấm CUỐI nên
  // `project` và `product_inventory` là hai subject hoàn toàn khác — đúng tiền lệ ProductInventoryTable
  // (ClickUp 86eynyqfh), ở đó 6 vai trò Kế toán có `product_inventory.*` mà thiếu `project.*`.
  return (
    <>
      <PageTitle
        title={productInfo?.unit_number}
        enableBackButton
        handleShowHistory={() =>
          navigate(APP_PATH.PROJECT_PRODUCT_INVENTORIES_HISTORY.replace(':id', String(id)))
        }
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isError={isError}
        isNotFound={isNotFound}
        hasPermission={ability.can('retrieve', 'product_inventory')}
      >
        {productInfo && (
          <Flex flexGrow={'1'} direction="column" gap="5" className="px-10 py-4">
            <Tabs.Root value={activeTab} onValueChange={handleTabChange}>
              <Tabs.List
                size="2"
                className="[&>button]:minw-0 mb-5 flex flex-wrap gap-2 [&>button]:flex-[0_0_calc(20%-6.4px)]"
              >
                <Tabs.Trigger value="general">Thông tin chung</Tabs.Trigger>
                {canViewTbc && <Tabs.Trigger value="tbc">Phí và Thưởng</Tabs.Trigger>}
                {canViewF2 && <Tabs.Trigger value="f2">Sàn liên kết</Tabs.Trigger>}
                {canViewTargets && <Tabs.Trigger value="targets">Thưởng HH quản lý</Tabs.Trigger>}
                <Tabs.Trigger value="deposits">Tiền ký quỹ</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="deposits" className="outline-none">
                <Flex
                  direction="column"
                  align="center"
                  justify="center"
                  gap="3"
                  className="py-20 text-center"
                >
                  <span className="text-5xl">🚧</span>
                  <Text className="typo-heading-h3 text-content-dark-1 font-semibold">
                    Tính năng đang phát triển
                  </Text>
                  <Text className="typo-body-base-regular text-content-dark-3 max-w-sm">
                    Tính năng quản lý tiền ký quỹ sẽ sớm được ra mắt. Vui lòng quay lại sau.
                  </Text>
                </Flex>
              </Tabs.Content>

              <Tabs.Content value="general" className="outline-none">
                <Flex direction="column" gap="4">
                  <Flex justify="end" align="center" className="min-h-[40px]">
                    {activeTab === 'general' && (
                      <Flex gap="3">
                        {isEditingGeneral ? (
                          <>
                            <Button
                              variant="secondary"
                              onClick={() => setIsEditingGeneral(false)}
                              disabled={isUpdating}
                              leftIcon={<IconX />}
                            >
                              Hủy
                            </Button>
                            <Button
                              variant="primary"
                              type="submit"
                              form="product-inventory-form"
                              loading={isUpdating}
                              leftIcon={<IconCheck />}
                            >
                              Lưu thay đổi
                            </Button>
                          </>
                        ) : ability.can('update', 'project') ? (
                          <Button
                            variant="secondary-border"
                            onClick={() => setIsEditingGeneral(true)}
                            leftIcon={<IconPencil />}
                          >
                            Chỉnh sửa
                          </Button>
                        ) : null}
                      </Flex>
                    )}
                  </Flex>

                  {isEditingGeneral ? (
                    <ProductInventoryForm
                      ref={formRef}
                      id="product-inventory-form"
                      initialValues={
                        {
                          ...productInfo,
                          source_exchange_id: productInfo.source_exchange?.id,
                          distribution_exchange_id: productInfo.distribution_exchange?.id,
                          investor_id: productInfo.investor?.id,
                          project_id: productInfo.project?.id,
                          sales_allocation_id: productInfo.sales_allocation?.id,
                        } as any
                      }
                      onSubmit={handleUpdateGeneral}
                      onCancel={() => setIsEditingGeneral(false)}
                      isSubmitting={isUpdating}
                      isEdit={true}
                      hideFooter
                    />
                  ) : (
                    <ProductInventoryDetail data={productInfo} />
                  )}
                </Flex>
              </Tabs.Content>

              {canViewTbc && (
                <Tabs.Content value="tbc" className="outline-none">
                  <Flex direction="column" gap="5">
                    <ProjectProductInventoryTbcCommissionTable
                      productInventoryId={Number(id)}
                      salesAllocationId={salesAllocationId}
                      isReadOnly={!ability.can('update', 'project')}
                    />
                  </Flex>
                </Tabs.Content>
              )}

              {canViewTargets && (
                <Tabs.Content value="targets">
                  <ProjectProductInventoryTbcManagementTable
                    productInventoryId={Number(id)}
                    salesAllocationId={salesAllocationId}
                    isReadOnly={!ability.can('update', 'project')}
                  />
                </Tabs.Content>
              )}

              {canViewF2 && (
                <Tabs.Content value="f2">
                  <PiF2Table
                    productInventoryId={Number(id)}
                    salesAllocationId={salesAllocationId}
                    isReadOnly={!ability.can('update', 'project')}
                  />
                </Tabs.Content>
              )}
            </Tabs.Root>
          </Flex>
        )}
      </DetailPageWrapper>
    </>
  )
}

export default ProjectProductInventoryDetailPage

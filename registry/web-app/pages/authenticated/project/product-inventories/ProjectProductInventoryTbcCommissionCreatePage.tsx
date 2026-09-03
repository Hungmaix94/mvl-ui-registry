import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useRef } from 'react'
import { PageTitle } from '@/components/ui/page-title'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { Button } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import {
  SaleAllocationTbcCommissionForm,
  TbcCommissionFormRef,
  TbcCommissionFormValues,
} from '@/features/project/sale-allocations/components/SaleAllocationTbcCommissionForm'
import {
  useCreateProductInventoryTbc,
  useProductInventoryTbcItem,
} from '@/features/project/product-inventories/services/product-inventory-tbc-service'
import { useSalesAllocationTbc } from '@/features/project/sale-allocations/services/sales-allocation-service'
import { useProductInventory, useCommissionWorkspacePICore } from '@/services/realestate-service'
import { handleApiError } from '@/utils/error-utils'
import toastService from '@/services/toast-service'
import { formatDateToApi } from '@/utils/date-utils'
import { useAbility } from '@/lib/ability'

export default function ProjectProductInventoryTbcCommissionCreatePage() {
  const ability = useAbility()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const cloneFromId = searchParams.get('cloneFrom')
  const cloneFromType = searchParams.get('cloneFromType')
  const navigate = useNavigate()

  const formRef = useRef<TbcCommissionFormRef>(null)

  const { data: productInventory } = useProductInventory(Number(id))
  const saId = productInventory?.sales_allocation?.id
    ? String(productInventory.sales_allocation.id)
    : ''

  const { data: cloneDataPI, isLoading: isLoadingClonePI } = useProductInventoryTbcItem(
    id as string,
    'tbc-commissions',
    cloneFromType !== 'sa' ? (cloneFromId as string) : undefined
  )

  const { data: cloneDataSA, isLoading: isLoadingCloneSA } = useSalesAllocationTbc(
    saId,
    'tbc-commissions',
    cloneFromType === 'sa' ? (cloneFromId as string) : undefined
  )

  const cloneData = cloneFromType === 'sa' ? cloneDataSA : cloneDataPI
  const isLoadingClone = cloneFromType === 'sa' ? isLoadingCloneSA : isLoadingClonePI

  const { data: workspace } = useCommissionWorkspacePICore(Number(id))

  const { mutateAsync: createPeriod, isPending: isCreating } = useCreateProductInventoryTbc(
    id as string,
    'tbc-commissions'
  )

  const piDetailPath = APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL.replace(':id', id ?? '')

  const handleBack = () => {
    navigate(`${piDetailPath}?tab=tbc`)
  }

  const handleSave = () => {
    if (formRef.current) {
      formRef.current.handleSubmit(async (values: TbcCommissionFormValues) => {
        const formattedDate = values.effective_from ? formatDateToApi(values.effective_from) : null

        const existingPeriods = workspace?.periods || []
        const isDuplicate = existingPeriods.some((p: any) => {
          const r = p.record || p
          const existingDate = r.effective_from || null
          return existingDate === formattedDate
        })

        if (isDuplicate) {
          toastService.error(
            'Ngày bắt đầu hiệu lực đã tồn tại trong hệ thống. Vui lòng chọn ngày khác!'
          )
          formRef.current?.setError('effective_from', {
            type: 'manual',
            message: 'Ngày bắt đầu hiệu lực trùng với cấu hình đã tồn tại.',
          })
          return
        }

        try {
          const payload = {
            ...values,
            effective_from: formattedDate,
            effective_to: values.effective_to ? formatDateToApi(values.effective_to) : null,
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

  const initialValues: Partial<TbcCommissionFormValues> | undefined = cloneRecord
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
        title="Tạo Phí và thưởng mới"
        enableBackButton
        breadcrumb={[
          { label: 'Thư ký dự án', href: APP_PATH.PROJECT_ADMIN },
          { label: 'Dự án', href: APP_PATH.PROJECT_MANAGEMENT },
          { label: 'Quản lý bất động sản', href: APP_PATH.PROJECT_MANAGEMENT },
          { label: productInventory?.unit_number, href: piDetailPath },
          { label: 'Phí và thưởng', href: `${piDetailPath}?tab=tbc` },
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
              <SaleAllocationTbcCommissionForm
                ref={formRef}
                initialValues={initialValues}
                onSubmit={() => {}} // handled by handleSave
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

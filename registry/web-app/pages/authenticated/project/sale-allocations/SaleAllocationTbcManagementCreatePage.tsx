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
  useCreateSalesAllocationTbc,
  useSalesAllocationTbc,
  useSalesAllocation,
} from '@/features/project/sale-allocations/services/sales-allocation-service'
import { handleApiError } from '@/utils/error-utils'
import toastService from '@/services/toast-service'
import { serializeRatesForApi } from '@/features/project/sale-allocations/components/tbc-management-helpers'
import { queryClient } from '@/api'
import { formatDateToApi } from '@/utils/date-utils'
import { useAbility } from '@/lib/ability'

export default function SaleAllocationTbcManagementCreatePage() {
  const ability = useAbility()
  const { saId } = useParams()
  const [searchParams] = useSearchParams()
  const cloneFromId = searchParams.get('cloneFrom')
  const navigate = useNavigate()

  const formRef = useRef<TbcManagementFormRef>(null)

  const { data: salesAllocation } = useSalesAllocation(saId ?? '')

  const { data: cloneData, isLoading: isLoadingClone } = useSalesAllocationTbc(
    saId as string,
    'tbc-management',
    cloneFromId as string
  )

  const { mutateAsync: createPeriod, isPending: isCreating } = useCreateSalesAllocationTbc(
    saId as string,
    'tbc-management'
  )

  const handleBack = () => {
    navigate(
      `${APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(':id', saId as string)}?tab=targets`
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
          queryClient.invalidateQueries({ queryKey: ['commission-workspace'] })
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
        title="Tạo mớiTạo mới Thưởng HH quản lý"
        enableBackButton
        breadcrumb={[
          { label: 'Thư ký dự án', href: APP_PATH.PROJECT_ADMIN },
          { label: 'Dự án', href: APP_PATH.PROJECT_MANAGEMENT },
          { label: 'Quản lý thông tin bán hàng', href: APP_PATH.PROJECT_SALE_ALLOCATIONS },
          {
            label: salesAllocation?.name || '',
            href: APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(':id', saId as string),
          },
          {
            label: 'Thưởng HH quản lý',
            href:
              APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(':id', saId as string) +
              '?tab=targets',
          },
          { label: 'Tạo mới', isCurrentPage: true },
        ]}
        handleBackButton={handleBack}
      />
      <DetailPageWrapper
        isLoading={isInitializing}
        isError={false}
        isNotFound={false}
        // Lượt GET-by-id DUY NHẤT trang này luôn gọi để render là `useSalesAllocation(saId)`
        // → `GET /realestate/sales-allocations/{id}/` → `sales_allocation.retrieve`. Lượt
        // `useSalesAllocationTbc` chỉ chạy khi có `cloneFromId` nên không phải điều kiện vào màn.
        // KHÔNG lấy `project.update` của route: subject cắt ở dấu chấm CUỐI nên `project` ≠
        // `sales_allocation` (tiền lệ ProductInventoryTable, ClickUp 86eynyqfh).
        hasPermission={ability.can('retrieve', 'sales_allocation')}
      >
        <Flex flexGrow="1" direction="column" gap="5" className="px-10 py-4">
          {!isInitializing && (
            <div className="flex flex-col gap-6">
              <SaleAllocationTbcManagementForm
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

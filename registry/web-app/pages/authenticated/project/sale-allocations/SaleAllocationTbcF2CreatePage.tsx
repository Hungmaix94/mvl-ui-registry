import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useMemo, useRef } from 'react'
import { PageTitle } from '@/components/ui/page-title'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { Button } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import {
  SaleAllocationTbcF2Form,
  TbcF2FormRef,
} from '@/features/project/sale-allocations/components/SaleAllocationTbcF2Form'
import {
  useCreateSalesAllocationTbc,
  useSalesAllocationTbc,
} from '@/features/project/sale-allocations/services/sales-allocation-service'
import { useSalesAllocation } from '@/services/realestate-service'
import { handleApiError } from '@/utils/error-utils'
import toastService from '@/services/toast-service'
import { useAbility } from '@/lib/ability'

export default function SaleAllocationTbcF2CreatePage() {
  const ability = useAbility()
  const { saId } = useParams()
  const [searchParams] = useSearchParams()
  const exchangeIdStr = searchParams.get('exchangeId')
  const exchangeName = searchParams.get('exchangeName') || 'Sàn'
  const cloneId = searchParams.get('cloneId')
  const navigate = useNavigate()

  const formRef = useRef<TbcF2FormRef>(null)

  const { data: salesAllocation } = useSalesAllocation(Number(saId))

  const { data: cloneData, isLoading: isLoadingClone } = useSalesAllocationTbc(
    saId as string,
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

  const { mutateAsync: createPeriod, isPending: isCreating } = useCreateSalesAllocationTbc(
    saId as string,
    'tbc-f2s'
  )

  const handleBack = () => {
    navigate(`${APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(':id', saId as string)}?tab=f2`)
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

  const saDetailPath = useMemo(
    () =>
      APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(
        ':id',
        salesAllocation?.id ? String(salesAllocation?.id) : ''
      ),
    [salesAllocation?.id]
  )

  const pageTitle = useMemo(
    () =>
      exchangeIdStr ? `Thêm thiết lập hoa hồng — ${exchangeName}` : 'Tạo cấu hình sàn liên kết mới',
    [exchangeIdStr]
  )

  return (
    <>
      <PageTitle
        title={pageTitle}
        enableBackButton
        breadcrumb={[
          { label: 'Thư ký dự án', href: APP_PATH.PROJECT_ADMIN },
          { label: 'Dự án', href: APP_PATH.PROJECT_MANAGEMENT },
          { label: 'Quản lý thông tin bán hàng', href: APP_PATH.PROJECT_SALE_ALLOCATIONS },
          { label: salesAllocation?.name, href: saDetailPath },
          {
            label: 'Cấu hình sàn liên kết',
            href:
              APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(':id', saId as string) + '?tab=f2',
          },
          { label: pageTitle, isCurrentPage: true },
        ]}
        handleBackButton={handleBack}
      />
      <DetailPageWrapper
        isLoading={isInitializing}
        isError={false}
        isNotFound={false}
        // Lượt GET-by-id DUY NHẤT trang này luôn gọi để render là `useSalesAllocation(saId)`
        // → `GET /realestate/sales-allocations/{id}/` → `sales_allocation.retrieve`. Lượt
        // `useSalesAllocationTbc` chỉ chạy khi có `cloneId` nên không phải điều kiện vào màn.
        // KHÔNG lấy `project.update` của route: subject cắt ở dấu chấm CUỐI nên `project` ≠
        // `sales_allocation` (tiền lệ ProductInventoryTable, ClickUp 86eynyqfh).
        hasPermission={ability.can('retrieve', 'sales_allocation')}
      >
        <Flex flexGrow="1" direction="column" gap="5" className="px-10 py-4">
          {!isInitializing && (
            <div className="flex flex-col gap-6">
              <SaleAllocationTbcF2Form
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

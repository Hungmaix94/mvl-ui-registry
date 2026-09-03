import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useRef } from 'react'
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
  useUpdateSalesAllocationTbc,
  useSalesAllocationTbc,
} from '@/features/project/sale-allocations/services/sales-allocation-service'
import { useSalesAllocation } from '@/services/realestate-service'
import { handleApiError } from '@/utils/error-utils'
import toastService from '@/services/toast-service'
import { useAbility } from '@/lib/ability'

export default function SaleAllocationTbcF2EditPage() {
  const ability = useAbility()
  const { saId, id: tbcId } = useParams()
  const [searchParams] = useSearchParams()
  const exchangeName = searchParams.get('exchangeName') || 'Sàn'
  const navigate = useNavigate()

  const formRef = useRef<TbcF2FormRef>(null)

  const { data: salesAllocation } = useSalesAllocation(Number(saId))

  const { data: tbcItem, isLoading: isLoadingItem } = useSalesAllocationTbc(
    Number(saId),
    'tbc-f2s',
    Number(tbcId)
  )

  const { mutateAsync: updatePeriod, isPending: isUpdating } = useUpdateSalesAllocationTbc(
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
            label: salesAllocation?.name || 'Chi tiết thông tin bán hàng',
            href: APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(':id', saId as string),
          },
          {
            label: 'Cấu hình sàn liên kết',
            href:
              APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(':id', saId as string) + '?tab=f2',
          },
          { label: 'Chỉnh sửa', isCurrentPage: true },
        ]}
        handleBackButton={handleBack}
      />
      <DetailPageWrapper
        isLoading={isLoadingItem}
        isError={false}
        isNotFound={false}
        // Trang gọi HAI lượt GET-by-id để render: `useSalesAllocationTbc(saId,'tbc-f2s',id)`
        // → `GET /realestate/sales-allocations/{sa_pk}/tbc-f2s/{id}/` → `sa_tbc_f2.retrieve`
        // (chính bản ghi đang sửa), và `useSalesAllocation(saId)` → `sales_allocation.retrieve`.
        // KHÔNG lấy `project.update` của route: subject cắt ở dấu chấm CUỐI nên `project` là một
        // subject khác hẳn (tiền lệ ProductInventoryTable, ClickUp 86eynyqfh).
        hasPermission={
          ability.can('retrieve', 'sa_tbc_f2') && ability.can('retrieve', 'sales_allocation')
        }
      >
        <Flex flexGrow="1" direction="column" gap="5" className="px-10 py-4">
          <div className="flex flex-col gap-6">
            {!isLoadingItem && record && (
              <SaleAllocationTbcF2Form
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

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
  useCreateSalesAllocationTbc,
  useSalesAllocationTbc,
  useSalesAllocation,
} from '@/features/project/sale-allocations/services/sales-allocation-service'
import toastService from '@/services/toast-service'
import { queryClient } from '@/api'
import { handleApiError } from '@/utils/error-utils'
import { formatDateToApi } from '@/utils/date-utils'
import { useCommissionWorkspaceSACore } from '@/services/realestate-service'
import { useAbility } from '@/lib/ability'

export default function SaleAllocationTbcCommissionCreatePage() {
  const ability = useAbility()
  const { saId } = useParams()
  const [searchParams] = useSearchParams()
  const cloneFromId = searchParams.get('cloneFrom')
  const navigate = useNavigate()

  const formRef = useRef<TbcCommissionFormRef>(null)

  const { data: salesAllocation } = useSalesAllocation(saId ?? '')

  const { data: cloneData, isLoading: isLoadingClone } = useSalesAllocationTbc(
    saId as string,
    'tbc-commissions',
    cloneFromId as string
  )

  const { data: workspace } = useCommissionWorkspaceSACore(Number(saId))

  const { mutateAsync: createPeriod, isPending: isCreating } = useCreateSalesAllocationTbc(
    saId as string,
    'tbc-commissions'
  )

  const handleBack = () => {
    navigate(`${APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(':id', saId as string)}?tab=tbc`)
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
          queryClient.invalidateQueries({ queryKey: ['commission-workspace'] })
          handleBack()
        } catch (error: any) {
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
          { label: 'Quản lý thông tin bán hàng', href: APP_PATH.PROJECT_SALE_ALLOCATIONS },
          {
            label: salesAllocation?.name || 'Chi tiết thông tin bán hàng',
            href: APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(':id', saId as string),
          },
          {
            label: 'Phí và thưởng',
            href:
              APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(':id', saId as string) + '?tab=tbc',
          },
          { label: 'Tạo Phí và thưởng mới', isCurrentPage: true },
        ]}
        handleBackButton={handleBack}
        customActions={
          <Flex gap="3">
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
        }
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
            <SaleAllocationTbcCommissionForm
              ref={formRef}
              initialValues={initialValues}
              onSubmit={() => {}} // handled by handleSave
            />
          )}
        </Flex>
      </DetailPageWrapper>
    </>
  )
}

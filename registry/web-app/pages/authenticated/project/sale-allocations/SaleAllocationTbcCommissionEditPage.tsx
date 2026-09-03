import { useNavigate, useParams } from 'react-router-dom'
import { useRef } from 'react'
import { PageTitle, type PageTitleRef } from '@/components/ui/page-title'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { Button } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { useDialog } from '@/hooks/useDialog'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import {
  SaleAllocationTbcCommissionForm,
  TbcCommissionFormRef,
  TbcCommissionFormValues,
} from '@/features/project/sale-allocations/components/SaleAllocationTbcCommissionForm'
import {
  useUpdateSalesAllocationTbc,
  useSalesAllocationTbc,
  useSalesAllocation,
} from '@/features/project/sale-allocations/services/sales-allocation-service'
import {
  parseCommissionLockError,
  useCommissionWorkspaceSACore,
} from '@/services/realestate-service'
import { formatDate, formatDateToApi } from '@/utils/date-utils'
import toastService from '@/services/toast-service'
import { queryClient } from '@/api'
import { handleApiError } from '@/utils/error-utils'
import { useAbility } from '@/lib/ability'

export default function SaleAllocationTbcCommissionEditPage() {
  const ability = useAbility()
  const { saId, id } = useParams()
  const navigate = useNavigate()
  const { displayConfirm, displayClose } = useDialog()

  const { data: salesAllocation } = useSalesAllocation(saId ?? '')

  const formRef = useRef<TbcCommissionFormRef>(null)
  const pageTitleRef = useRef<PageTitleRef>(null)

  const {
    data: record,
    isLoading,
    error,
  } = useSalesAllocationTbc(saId as string, 'tbc-commissions', id as string)

  const { mutateAsync: updatePeriod, isPending: isUpdating } = useUpdateSalesAllocationTbc(
    saId as string,
    'tbc-commissions'
  )

  const handleCreateClone = () => {
    navigate(
      `${APP_PATH.PROJECT_SA_TBC_COMMISSION_CREATE.replace(':saId', saId as string)}?cloneFrom=${id}`
    )
  }

  const { data: workspace } = useCommissionWorkspaceSACore(Number(saId))

  const handleSave = () => {
    if (formRef.current) {
      formRef.current.handleSubmit(async (values: TbcCommissionFormValues) => {
        const formattedDate = values.effective_from ? formatDateToApi(values.effective_from) : null

        const existingPeriods = workspace?.periods || []
        const isDuplicate = existingPeriods.some((p: any) => {
          const r = p.record || p
          if (id && String(r.id) === String(id)) {
            return false
          }
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
          await updatePeriod({ id: id as string, data: payload })
          toastService.success('Cập nhật cấu hình thành công!')
          queryClient.invalidateQueries({ queryKey: ['commission-workspace'] })
          pageTitleRef.current?.handleBackBtn()
        } catch (error) {
          const lockError = parseCommissionLockError(error)
          if (lockError.recommended_action === 'clone_new_period') {
            displayConfirm({
              title: 'Cấu hình đang bị khóa',
              description: `${lockError.lock_reason}. Bạn có muốn tạo mới cấu hình từ đây không?`,
              confirmText: 'Tạo period mới',
              onConfirm: () => {
                handleCreateClone()
                displayClose()
              },
            })
          } else if (lockError.recommended_action === 'historical_correction') {
            toastService.warning(
              'Cấu hình đã khóa do đã phát sinh hoa hồng. Vui lòng liên hệ Admin để điều chỉnh!'
            )
          } else {
            handleApiError(error, formRef.current?.setError as any)
          }
        }
      })()
    }
  }

  const initialValues: Partial<TbcCommissionFormValues> | undefined = record
    ? {
        ...record,
        effective_from: record?.effective_from ? formatDate(record.effective_from) : undefined,
        effective_to: record?.effective_to ? formatDate(record.effective_to) : undefined,
      }
    : undefined

  const isError = !!error
  const isNotFound = isError && (error as any)?.response?.status === 404

  return (
    <>
      <PageTitle
        ref={pageTitleRef}
        title="Chỉnh sửa cấu hình Phí và thưởng"
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
          {
            label: 'Chỉnh sửa Phí và thưởng',
            isCurrentPage: true,
          },
        ]}
        customActions={
          <Flex gap="3">
            <Button
              variant="secondary"
              onClick={() => pageTitleRef.current?.handleBackBtn()}
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
        }
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isError={isError}
        isNotFound={isNotFound}
        // Trang gọi HAI lượt GET-by-id để render: `useSalesAllocationTbc(saId,'tbc-commissions',id)`
        // → `GET /realestate/sales-allocations/{sa_pk}/tbc-commissions/{id}/` → `sa_tbc.retrieve`
        // (chính bản ghi đang sửa), và `useSalesAllocation(saId)` → `sales_allocation.retrieve`.
        // KHÔNG lấy `project.update` của route: subject cắt ở dấu chấm CUỐI nên `project` là một
        // subject khác hẳn (tiền lệ ProductInventoryTable, ClickUp 86eynyqfh).
        hasPermission={
          ability.can('retrieve', 'sa_tbc') && ability.can('retrieve', 'sales_allocation')
        }
      >
        <Flex flexGrow="1" direction="column" gap="5" className="px-10 py-4">
          {!isLoading && initialValues && (
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

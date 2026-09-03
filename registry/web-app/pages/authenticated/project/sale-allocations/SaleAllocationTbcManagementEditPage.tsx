import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useRef } from 'react'
import { PageTitle } from '@/components/ui/page-title'
import { APP_PATH } from '@/routes/AppRoute.constant'
import { Button } from '@/components/ui'
import { Flex, Table } from '@radix-ui/themes'
import { useDialog } from '@/hooks/useDialog'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import {
  SaleAllocationTbcManagementForm,
  TbcManagementFormRef,
  TbcManagementFormValues,
} from '@/features/project/sale-allocations/components/SaleAllocationTbcManagementForm'
import {
  useUpdateSalesAllocationTbc,
  useSalesAllocationTbc,
  useSalesAllocation,
  useDeleteSalesAllocationTbc,
} from '@/features/project/sale-allocations/services/sales-allocation-service'
import { parseCommissionLockError } from '@/services/realestate-service'
import { handleApiError } from '@/utils/error-utils'
import { formatDate } from '@/utils/date-utils'
import toastService from '@/services/toast-service'
import { DisplayFieldRow } from '@/components/commons/DisplayField'
import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection'
import { formatDateToApi } from '@/utils/date-utils'
import {
  serializeRatesForApi,
  RATE_COLUMNS,
  findRate,
  formatPctAmt,
} from '@/features/project/sale-allocations/components/tbc-management-helpers'
import { MANAGEMENT_ROLES } from '@/features/project/sale-allocations/components/SaleAllocationTbcManagementForm'
import { queryClient } from '@/api'
import { useAbility } from '@/lib/ability'

export default function SaleAllocationTbcManagementEditPage() {
  const ability = useAbility()
  const { saId, id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { displayConfirm, displayClose } = useDialog()
  const isViewMode = searchParams.get('mode') === 'view'

  const { data: salesAllocation } = useSalesAllocation(saId ?? '')

  const formRef = useRef<TbcManagementFormRef>(null)

  const {
    data: record,
    isLoading,
    error,
  } = useSalesAllocationTbc(saId as string, 'tbc-management', id as string)

  const { mutateAsync: updatePeriod, isPending: isUpdating } = useUpdateSalesAllocationTbc(
    saId as string,
    'tbc-management'
  )

  const { mutateAsync: deletePeriod } = useDeleteSalesAllocationTbc(
    saId as string,
    'tbc-management'
  )

  const handleBack = () => {
    navigate(
      `${APP_PATH.PROJECT_SALE_ALLOCATIONS_DETAIL.replace(':id', saId as string)}?tab=targets`
    )
  }

  const handleCreateClone = () => {
    navigate(
      `${APP_PATH.PROJECT_SA_TBC_MANAGEMENT_CREATE.replace(':saId', saId as string)}?cloneFrom=${id}`
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
          await updatePeriod({ id: id as string, data: payload })
          toastService.success('Cập nhật cấu hình thành công!')
          queryClient.invalidateQueries({ queryKey: ['commission-workspace'] })
          handleBack()
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

  const handleDelete = () => {
    displayConfirm({
      title: 'Xóa cấu hình',
      description: 'Bạn có chắc chắn muốn xóa cấu hình này không?',
      confirmText: 'Xóa',
      cancelText: 'Hủy',
      onConfirm: async () => {
        try {
          await deletePeriod(id as string)
          toastService.success('Đã xóa cấu hình!')
          queryClient.invalidateQueries({ queryKey: ['commission-workspace'] })
          handleBack()
        } catch (error) {
          toastService.error('Có lỗi xảy ra khi xóa')
        }
      },
    })
  }

  const initialValues: Partial<TbcManagementFormValues> | undefined = record
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
        title={isViewMode ? 'Chi tiết' : 'Chỉnh sửa'}
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
          {
            label: isViewMode ? 'Chi tiết' : 'Chỉnh sửa',
            isCurrentPage: true,
          },
        ]}
        handleBackButton={handleBack}
        handleEdit={
          isViewMode
            ? () =>
                navigate(
                  `${APP_PATH.PROJECT_SA_TBC_MANAGEMENT_EDIT.replace(':saId', saId as string).replace(':id', id as string)}`
                )
            : undefined
        }
        handleDelete={isViewMode ? handleDelete : undefined}
        handleShowHistory={
          isViewMode
            ? () =>
                navigate(APP_PATH.PROJECT_SALE_ALLOCATIONS_HISTORY.replace(':id', saId as string))
            : undefined
        }
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isError={isError}
        isNotFound={isNotFound}
        // Trang gọi HAI lượt GET-by-id để render: `useSalesAllocationTbc(saId,'tbc-management',id)`
        // → `GET /realestate/sales-allocations/{sa_pk}/tbc-management/{id}/` → `sa_tbc_management.retrieve`
        // (chính bản ghi đang sửa), và `useSalesAllocation(saId)` → `sales_allocation.retrieve`.
        // KHÔNG lấy `project.update` của route: subject cắt ở dấu chấm CUỐI nên `project` là một
        // subject khác hẳn (tiền lệ ProductInventoryTable, ClickUp 86eynyqfh).
        hasPermission={
          ability.can('retrieve', 'sa_tbc_management') &&
          ability.can('retrieve', 'sales_allocation')
        }
      >
        <Flex flexGrow="1" direction="column" gap="5" className="px-10 py-4">
          {!isLoading &&
            initialValues &&
            (isViewMode ? (
              <TbcManagementDetailView record={record} />
            ) : (
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
            ))}
        </Flex>
      </DetailPageWrapper>
    </>
  )
}

function TbcManagementDetailView({ record }: { record: any }) {
  if (!record) return null
  const rates = record.rates ?? []

  return (
    <div className="flex flex-col gap-6">
      {/* Thông tin thời gian */}
      <div className="bg-surface-primary-default flex flex-col">
        <h3 className="text-content-dark-1 mb-2 text-lg font-semibold">Thông tin thời gian</h3>
        <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
          <div className="divide-border-1 flex flex-col divide-y">
            <DisplayFieldRow
              label="Ngày bắt đầu hiệu lực"
              value={record.effective_from ? formatDate(record.effective_from) : '-'}
            />
          </div>
          <div className="divide-border-1 flex flex-col divide-y">
            <DisplayFieldRow
              label="Ngày kết thúc hiệu lực"
              value={record.effective_to ? formatDate(record.effective_to) : '-'}
            />
          </div>
        </div>
      </div>

      {/* Cấu hình Thưởng HH quản lý — bảng ma trận role × category */}
      <div className="bg-surface-primary-default flex flex-col">
        <h3 className="text-content-dark-1 mb-2 text-lg font-semibold">
          Cấu hình Thưởng HH quản lý cơ bản
        </h3>
        <div className="border-border-1 overflow-x-auto rounded-md border">
          <Table.Root className="w-full border-collapse text-left text-sm">
            <Table.Header className="bg-[#F0F2F5]">
              <Table.Row>
                <Table.ColumnHeaderCell className="border-border-1 typo-body-base-medium border-r border-b px-4 py-3 align-middle font-semibold text-[#4B4B4B]">
                  Chức vụ
                </Table.ColumnHeaderCell>
                {RATE_COLUMNS.filter((col) => !col.hidden).map((col) => (
                  <Table.ColumnHeaderCell
                    key={col.category}
                    className="border-border-1 typo-body-base-medium border-r border-b px-4 py-3 align-middle font-semibold text-[#4B4B4B] last:border-r-0"
                  >
                    {col.label}
                  </Table.ColumnHeaderCell>
                ))}
              </Table.Row>
            </Table.Header>
            <Table.Body className="bg-white">
              {MANAGEMENT_ROLES.map((role) => (
                <Table.Row
                  key={role.value}
                  className="border-border-1 hover:bg-surface-primary-hover border-b transition-colors last:border-b-0"
                >
                  <Table.Cell className="border-border-1 border-r px-4 py-4 align-middle font-medium">
                    {role.label}
                  </Table.Cell>
                  {RATE_COLUMNS.filter((col) => !col.hidden).map((col) => {
                    const { pct, amt, pctRoleTotal } = findRate(rates, role.value, col.category)
                    return (
                      <Table.Cell
                        key={col.category}
                        className="border-border-1 border-r px-4 py-4 align-middle last:border-r-0"
                      >
                        {formatPctAmt(pct, amt, pctRoleTotal)}
                      </Table.Cell>
                    )
                  })}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </div>
      </div>

      {/* Ghi chú */}
      <div className="bg-surface-primary-default flex flex-col">
        <div className="divide-border-1 flex flex-col divide-y">
          <DisplayFieldRow label="Ghi chú" value={record.note || '-'} />
        </div>
      </div>

      {/* Tài liệu đính kèm */}
      <div className="bg-surface-primary-default flex flex-col">
        <AttachmentSection attachments={record.attachments || []} isRequired={false} />
      </div>
    </div>
  )
}

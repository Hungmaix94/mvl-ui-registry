import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useRef } from 'react'
import { PageTitle } from '@/components/ui/page-title'
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
  useUpdateProductInventoryTbc,
  useProductInventoryTbcItem,
  useDeleteProductInventoryTbc,
} from '@/features/project/product-inventories/services/product-inventory-tbc-service'
import {
  parseCommissionLockError,
  useProductInventory,
  useCommissionWorkspacePICore,
} from '@/services/realestate-service'
import { formatDate } from '@/utils/date-utils'
import { formatCurrencyVND, formatPercent } from '@/utils'
import toastService from '@/services/toast-service'
import { handleApiError } from '@/utils/error-utils'
import { DisplayFieldRow } from '@/components/commons/DisplayField'
import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection'
import { formatDateToApi } from '@/utils/date-utils'
import { useAbility } from '@/lib/ability'

export default function ProjectProductInventoryTbcCommissionEditPage() {
  const ability = useAbility()
  const { id, tbcId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { displayConfirm, displayClose } = useDialog()
  const isViewMode = searchParams.get('mode') === 'view'

  const { data: productInventory } = useProductInventory(Number(id))
  const saId = productInventory?.sales_allocation?.id
    ? String(productInventory.sales_allocation.id)
    : ''

  const formRef = useRef<TbcCommissionFormRef>(null)

  const {
    data: record,
    isLoading,
    error,
  } = useProductInventoryTbcItem(id as string, 'tbc-commissions', tbcId as string)

  const { mutateAsync: updatePeriod, isPending: isUpdating } = useUpdateProductInventoryTbc(
    id as string,
    'tbc-commissions'
  )

  const { mutateAsync: deletePeriod } = useDeleteProductInventoryTbc(
    id as string,
    'tbc-commissions'
  )

  const handleBack = () => {
    navigate(
      `${APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL.replace(':saId', saId as string).replace(':id', id as string)}?tab=tbc`
    )
  }

  const handleCreateClone = () => {
    navigate(
      `${APP_PATH.PROJECT_PRODUCT_INVENTORIES_TBC_CREATE.replace(':saId', saId as string).replace(':id', id as string)}?cloneFrom=${tbcId}`
    )
  }

  const { data: workspace } = useCommissionWorkspacePICore(Number(id))

  const handleSave = () => {
    if (formRef.current) {
      formRef.current.handleSubmit(async (values: TbcCommissionFormValues) => {
        const formattedDate = values.effective_from ? formatDateToApi(values.effective_from) : null

        const existingPeriods = workspace?.periods || []
        const isDuplicate = existingPeriods.some((p: any) => {
          const r = p.record || p
          if (tbcId && String(r.id) === String(tbcId)) {
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
          await updatePeriod({ id: tbcId as string, data: payload })
          toastService.success('Cập nhật cấu hình thành công!')
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
          await deletePeriod(tbcId as string)
          toastService.success('Đã xóa cấu hình!')
          handleBack()
        } catch (error) {
          toastService.error('Có lỗi xảy ra khi xóa')
        }
      },
    })
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

  const piDetailPath = APP_PATH.PROJECT_PRODUCT_INVENTORIES_DETAIL.replace(':id', id ?? '')

  return (
    <>
      <PageTitle
        title={isViewMode ? 'Chi tiết cấu hình Phí và thưởng' : 'Chỉnh sửa cấu hình Phí và thưởng'}
        enableBackButton
        breadcrumb={[
          { label: 'Thư ký dự án', href: APP_PATH.PROJECT_ADMIN },
          { label: 'Dự án', href: APP_PATH.PROJECT_MANAGEMENT },
          { label: 'Quản lý bất động sản', href: APP_PATH.PROJECT_MANAGEMENT },
          { label: productInventory?.unit_number, href: piDetailPath },
          { label: 'Phí và thưởng', href: `${piDetailPath}?tab=tbc` },
          { label: isViewMode ? 'Chi tiết' : 'Chỉnh sửa', isCurrentPage: true },
        ]}
        handleBackButton={handleBack}
        handleEdit={
          isViewMode
            ? () =>
                navigate(
                  `${APP_PATH.PROJECT_PRODUCT_INVENTORIES_TBC_EDIT.replace(':saId', saId as string)
                    .replace(':id', id as string)
                    .replace(':tbcId', tbcId as string)}`
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
        // Trang gọi HAI lượt GET-by-id để render, nên cần HAI mã (tiền lệ "một hành động, hai bước
        // ⇒ hai mã" ở docs/ai/conventions.md): `useProductInventoryTbcItem(id,'tbc-commissions',tbcId)`
        // → `GET .../tbc-commissions/{id}/` → `pi_tbc.retrieve` (chính bản ghi đang sửa), và
        // `useProductInventory(id)` → `product_inventory.retrieve` (breadcrumb + `saId`).
        // KHÔNG lấy `project.update` của route: subject cắt ở dấu chấm cuối nên `project` là một
        // subject khác hẳn (tiền lệ ProductInventoryTable, ClickUp 86eynyqfh).
        hasPermission={
          ability.can('retrieve', 'pi_tbc') && ability.can('retrieve', 'product_inventory')
        }
      >
        <Flex flexGrow="1" direction="column" gap="5" className="px-10 py-4">
          {!isLoading &&
            initialValues &&
            (isViewMode ? (
              <TbcCommissionDetailView record={record} />
            ) : (
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

const commissionCategories = [
  { key: 'agency_fee', label: 'Phí đại lý' },
  { key: 'investor_bonus', label: 'Phí đại lý tăng thêm' },
  { key: 'shared_bonus', label: 'Thưởng đại lý' },
  { key: 'sale_commission', label: 'HH nhân viên bán hàng' },
  { key: 'investor_bonus_to_sale', label: 'Thưởng cho sale' },
  { key: 'revenue', label: 'Tỉ lệ doanh thu' },
  { key: 'kpi_revenue_slk', label: 'Doanh thu KPI Sàn liên kết' },
] as const

const VAT_AWARE_CATEGORIES = new Set<string>(['agency_fee', 'investor_bonus', 'shared_bonus'])

function formatCommissionValue(
  pct: any,
  amt: any,
  includeVat?: boolean | null,
  isVatAware?: boolean
): string {
  const parts: string[] = []
  if (pct != null && pct !== '') parts.push(formatPercent(pct))
  if (amt != null && amt !== '') parts.push(`${formatCurrencyVND(Number(amt))} VNĐ`)
  if (parts.length === 0) return '-'
  const vatLabel =
    isVatAware && (pct != null || amt != null)
      ? includeVat === true
        ? ' (VAT)'
        : ' (Không VAT)'
      : ''
  return parts.join(' / ') + vatLabel
}

function TbcCommissionDetailView({ record }: { record: any }) {
  if (!record) return null

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

      {/* Cấu hình Phí và Thưởng */}
      <div className="bg-surface-primary-default flex flex-col">
        <h3 className="text-content-dark-1 mb-2 text-lg font-semibold">Cấu hình Phí và Thưởng</h3>
        <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
          <div className="divide-border-1 flex flex-col divide-y">
            {commissionCategories
              .filter((_, i) => i % 2 === 0)
              .map((cat) => (
                <DisplayFieldRow
                  key={cat.key}
                  label={cat.label}
                  value={formatCommissionValue(
                    record[`pct_${cat.key}`],
                    record[`amt_${cat.key}`],
                    record[`is_${cat.key}_include_vat`],
                    VAT_AWARE_CATEGORIES.has(cat.key)
                  )}
                />
              ))}
          </div>
          <div className="divide-border-1 flex flex-col divide-y">
            {commissionCategories
              .filter((_, i) => i % 2 === 1)
              .map((cat) => (
                <DisplayFieldRow
                  key={cat.key}
                  label={cat.label}
                  value={formatCommissionValue(
                    record[`pct_${cat.key}`],
                    record[`amt_${cat.key}`],
                    record[`is_${cat.key}_include_vat`],
                    VAT_AWARE_CATEGORIES.has(cat.key)
                  )}
                />
              ))}
          </div>
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

import { useCallback, useMemo, useState, useRef, useEffect } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
import {
  useSaleAllocationTabPermissions,
  SA_TAB_ORDER,
} from './hooks/useSaleAllocationTabPermissions'
import { Flex } from '@radix-ui/themes'
import { useQueryClient } from '@tanstack/react-query'
import { ColoredValueVariant } from '@/api/schema.ts'
import { Chip, PageTitle, Button, Text } from '@/components/ui'
import { type PageTitleTabConfig } from '@/components/ui/page-title/PageTitle'

import {
  useSalesAllocation,
  useUpdateSalesAllocation,
} from '@/features/project/sale-allocations/services/sales-allocation-service'
import { useAbility } from '@/lib/ability.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { APP_PATH } from '@/routes'
import { formatCurrencyVND } from '@/utils'
import { useProjectStaffs } from '@/services/realestate-service'
import { getActiveProjectStaff } from '@/features/sales/utils/projectStaffUtils'

import AttachmentSection from '@/components/ui/attachment-section/AttachmentSection'
import { DisplayFieldRow, DisplayField } from '@/components/commons/DisplayField'
import { DetailPageWrapper } from '@/components/commons/DetailPageWrapper'
import { formatDate } from '@/utils/date-utils'
import { FormProvider, useForm } from 'react-hook-form'
import { IconPencil, IconX, IconCheck } from '@/assets/icons'
import toastService from '@/services/toast-service'

import { EmployeePreviewBox } from '@/features/sales/components/EmployeePreviewBox'
import { ProjectPreviewBox } from '@/features/sales/components/ProjectPreviewBox'

import {
  SaleAllocationF2Table,
  type F2TabSlots,
} from '@/features/project/sale-allocations/components/SaleAllocationF2Table'
import SaleAllocationTbcCommissionTable from '@/features/project/sale-allocations/components/SaleAllocationTbcCommissionTable'
import SaleAllocationTbcManagementTable from '@/features/project/sale-allocations/components/SaleAllocationTbcManagementTable'
import {
  SaleAllocationForm,
  type SaleAllocationFormRef,
} from '@/features/project/sale-allocations/components/SaleAllocationForm'
import SaleAllocationInventories from '@/features/project/sale-allocations/components/SaleAllocationInventories'
import SaleAllocationDeals from '@/features/project/sale-allocations/components/SaleAllocationDeals'
import {
  SaleAllocationLadTab,
  type LadTabSlots,
} from '@/features/sales/commission-adjustment-batches/components/SaleAllocationLadTab'

const STATUS_VARIANTS: Record<string, ColoredValueVariant> = {
  preparation: ColoredValueVariant.BLUE,
  selling: ColoredValueVariant.GREEN,
  handover: ColoredValueVariant.ORANGE,
  completed: ColoredValueVariant.GREY,
  suspended: ColoredValueVariant.RED,
  cancelled: ColoredValueVariant.RED,
}

export const SaleAllocationDetailPage = () => {
  const { id } = useParams<{ id: string }>()

  const ability = useAbility()
  const tabPermissions = useSaleAllocationTabPermissions()
  const [searchParams, setSearchParams] = useSearchParams()

  const rawActiveTab = searchParams.get('tab') || 'general'
  const isEditmode = searchParams.get('isEditmode') === 'true'

  // If the requested tab is not visible (no permission), fall back to the
  // first tab the user *can* view so we never land on a blank/hidden tab.
  const activeTab = useMemo(() => {
    const requested = SA_TAB_ORDER.find((t) => t.value === rawActiveTab)
    if (requested && tabPermissions[requested.canViewKey]) return rawActiveTab
    return SA_TAB_ORDER.find((t) => tabPermissions[t.canViewKey])?.value ?? rawActiveTab
  }, [rawActiveTab, tabPermissions])

  const navigate = useNavigate()

  const handleTabChange = useCallback(
    (val: string) => {
      setSearchParams({ tab: val })
    },
    [setSearchParams]
  )

  const handleShowHistory = useCallback(() => {
    if (id) {
      const path = APP_PATH.PROJECT_SALE_ALLOCATIONS_HISTORY.replace(':id', id)
      navigate(path)
    }
  }, [id, navigate])

  // LAD tab lifts its own toolbar (search / filter / Tạo lô mới) into the PageTitle tab toolbar.
  const [ladTabSlots, setLadTabSlots] = useState<LadTabSlots | null>(null)
  // F2 ("Sàn liên kết") tab lifts its create toolbar (Thêm sàn / Thêm cấu hình) — cùng pattern.
  const [f2TabSlots, setF2TabSlots] = useState<F2TabSlots | null>(null)

  // Tabs rendered by PageTitle (project tabs pattern). History is a per-tab action so it stays
  // visible on every tab (PageTitle reads action handlers from the active tab config when tabs exist).
  const tabs: PageTitleTabConfig[] = useMemo(() => {
    const showHistory = ability.can('histories', 'project') ? handleShowHistory : undefined
    const items: PageTitleTabConfig[] = []
    if (tabPermissions.canViewGeneral)
      items.push({ value: 'general', label: 'Thông tin chung', handleShowHistory: showHistory })
    if (tabPermissions.canViewInventory)
      items.push({ value: 'inventory', label: 'DS căn', handleShowHistory: showHistory })
    if (tabPermissions.canViewTbc)
      items.push({ value: 'tbc', label: 'Phí và Thưởng', handleShowHistory: showHistory })
    if (tabPermissions.canViewF2)
      items.push({
        value: 'f2',
        label: 'Sàn liên kết',
        handleShowHistory: showHistory,
        toolbarProps: f2TabSlots?.toolbarProps,
      })
    if (tabPermissions.canViewTargets)
      items.push({ value: 'targets', label: 'Thưởng HH quản lý', handleShowHistory: showHistory })
    if (tabPermissions.canViewDeposits)
      items.push({ value: 'deposits', label: 'Tiền ký quỹ', handleShowHistory: showHistory })
    if (tabPermissions.canViewTransactions)
      items.push({ value: 'transactions', label: 'DS giao dịch', handleShowHistory: showHistory })
    // LAD ("Lô áp dụng") is a self-contained sub-app: no SA-level history / "Tạo Bất động sản".
    // Its own toolbar (search / filter / Tạo lô mới) is lifted into this tab's toolbarProps.
    if (tabPermissions.canViewLad)
      items.push({ value: 'lad', label: 'Lô áp dụng', toolbarProps: ladTabSlots?.toolbarProps })
    return items
  }, [
    tabPermissions,
    ability,
    handleShowHistory,
    ladTabSlots?.toolbarProps,
    f2TabSlots?.toolbarProps,
  ])

  const queryClient = useQueryClient()
  const { data: sa, isLoading, error } = useSalesAllocation(id ?? '')
  const { mutateAsync: updateSaleAllocation, isPending: isUpdating } = useUpdateSalesAllocation()

  const projectId = sa?.project?.id
  const { data: staffsResponse } = useProjectStaffs(
    projectId ? { project: projectId } : undefined,
    { enabled: !!projectId }
  )
  const staffs = staffsResponse?.results || []

  const activeDirector =
    sa?.project_director || getActiveProjectStaff(staffs, 'project_director', null)
  const activeSecretary =
    sa?.project_secretary || getActiveProjectStaff(staffs, 'project_secretary', null)

  const [isEditingGeneral, setIsEditingGeneral] = useState(isEditmode && activeTab === 'general')
  const generalFormRef = useRef<SaleAllocationFormRef>(null)

  useEffect(() => {
    if (isEditmode && activeTab === 'general' && !isEditingGeneral) {
      setIsEditingGeneral(true)
      const newParams = new URLSearchParams(searchParams)
      newParams.delete('isEditmode')
      setSearchParams(newParams, { replace: true })
    }
  }, [isEditmode, activeTab, isEditingGeneral, searchParams, setSearchParams])

  const handleSaveGeneralSubmit = async (values: any) => {
    if (!id) return
    const payload = { ...values }

    // Format dates before sending to API

    if (
      payload.attachment_tokens?.length ||
      payload.attachment_ids?.length ||
      payload.attachments?.length
    ) {
      payload.files = { attachments: payload.attachment_tokens || [] }
      payload.existing_files = { attachments: payload.attachment_ids || [] }
    }
    delete payload.attachment_ids
    delete payload.attachment_tokens
    delete payload.attachments

    // Clean up undefined fields
    Object.keys(payload).forEach((key) => {
      const typedPayload = payload as Record<string, unknown>
      if (typedPayload[key] === undefined) {
        delete typedPayload[key]
      }
    })

    await updateSaleAllocation({ id, data: payload })
    queryClient.invalidateQueries({ queryKey: ['sales-allocations'] })
    setIsEditingGeneral(false)
    toastService.success('Cập nhật thông tin dự án thành công')
  }

  const handleSaveGeneral = () => {
    if (generalFormRef.current) {
      generalFormRef.current.handleSubmit(handleSaveGeneralSubmit)()
    }
  }

  const form = useForm({
    defaultValues: sa || {},
    values: sa || {},
  })

  const { keysMapOptions } = useAppConstant({
    module: 'realestate',
    keys: [
      APP_CONSTANT_KEY.REALESTATE.SALES_ALLOCATION_SOURCE_TYPE_CHOICES,
      APP_CONSTANT_KEY.REALESTATE.SALES_ALLOCATION_PHASE_CHOICES,
      APP_CONSTANT_KEY.REALESTATE.SALES_ALLOCATION_STAFF_ROLE_CHOICES,
    ],
  })

  const sourceTypeOptions =
    keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.SALES_ALLOCATION_SOURCE_TYPE_CHOICES) ?? []
  const phaseOptions =
    keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.SALES_ALLOCATION_PHASE_CHOICES) ?? []

  const sourceTypeLabel = (value: string | null | undefined) => {
    if (!value) return '-'
    return sourceTypeOptions.find((o) => o.value === value)?.label ?? value
  }

  const statusChip = useMemo(() => {
    if (!sa?.phase) return '-'
    const phase = sa.phase as string
    const phaseLabel = phaseOptions.find((o) => o.value === phase)?.label ?? phase
    return (
      <Chip
        label={phaseLabel}
        variant={STATUS_VARIANTS[phase] || ColoredValueVariant.GREY}
        size="small"
      />
    )
  }, [sa, phaseOptions])

  // "F0" source type -> show exchange name, otherwise show investor name
  const sourceEntityName = useMemo(() => {
    if (!sa) return '-'
    return sa.source_type === 'F0' ? (sa.source_exchange?.name ?? '-') : (sa.investor?.name ?? '-')
  }, [sa])

  const isError = !!error
  const isNotFound = !!error && (error as unknown as Record<string, any>)?.response?.status === 404

  return (
    <>
      <PageTitle
        title={sa?.name || ''}
        idLabel={sa?.name || ''}
        enableBackButton
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        customActions={
          // SA-level action — hidden on the self-contained LAD tab (it has its own toolbar).
          activeTab !== 'lad' && ability.can('create', 'project') ? (
            <Button
              variant="secondary-border"
              onClick={() => navigate(`${APP_PATH.PROJECT_PRODUCT_INVENTORIES_CREATE}?saId=${id}`)}
            >
              Tạo Bất động sản
            </Button>
          ) : undefined
        }
      />
      <DetailPageWrapper
        isLoading={isLoading}
        isNotFound={isNotFound}
        isError={isError}
        // Trang render từ `useSalesAllocation(id)` → `GET /realestate/sales-allocations/{id}/`
        // → `sales_allocation.retrieve`. KHÔNG lấy `project.retrieve` của route: subject cắt ở dấu
        // chấm CUỐI nên `project` ≠ `sales_allocation` (tiền lệ ProductInventoryTable, 86eynyqfh).
        hasPermission={ability.can('retrieve', 'sales_allocation')}
      >
        {sa && (
          <FormProvider {...form}>
            <Flex flexGrow={'1'} direction="column" gap="5" className="px-7 pb-5">
              {activeTab === 'general' && tabPermissions.canViewGeneral && (
                <Flex direction="column" gap="5">
                  <Flex justify="end" align="center">
                    {ability.can('update', 'project') && (
                      <Flex gap="3">
                        {isEditingGeneral ? (
                          <>
                            <Button
                              variant="secondary-border"
                              onClick={() => setIsEditingGeneral(false)}
                              disabled={isUpdating}
                              className="text-content-dark-3 hover:text-content-dark-1"
                              leftIcon={<IconX />}
                            >
                              Hủy
                            </Button>
                            <Button
                              variant="primary"
                              onClick={handleSaveGeneral}
                              disabled={isUpdating}
                              leftIcon={<IconCheck />}
                            >
                              Lưu
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="secondary-border"
                            onClick={() => setIsEditingGeneral(true)}
                            leftIcon={<IconPencil />}
                          >
                            Chỉnh sửa
                          </Button>
                        )}
                      </Flex>
                    )}
                  </Flex>

                  {isEditingGeneral ? (
                    <SaleAllocationForm
                      ref={generalFormRef}
                      initialValues={sa as unknown as Record<string, unknown>}
                      onSubmit={() => {}}
                      isSubmitting={isUpdating}
                      isEdit={true}
                    />
                  ) : (
                    <div className="flex flex-col gap-9">
                      {/* Box 1: Thông tin chung */}
                      <Flex direction="column" gap="4">
                        <h3 className="text-content-dark-1 border-none text-lg font-semibold">
                          Thông tin bán hàng
                        </h3>
                        <div className="bg-surface-primary-default flex flex-col">
                          {/* Thông tin chung */}
                          <div className="grid grid-cols-1 gap-x-12 md:grid-cols-2">
                            {/* Cột Trái */}
                            <div className="divide-border-1 border-border-1 flex flex-col divide-y border-b md:border-b-0">
                              <DisplayFieldRow
                                label="Mã thông tin bán hàng"
                                value={sa.code || '-'}
                              />
                              <DisplayFieldRow
                                label="Tên thông tin bán hàng"
                                value={sa.name || '-'}
                              />
                              <DisplayFieldRow
                                label="Chủ đầu tư"
                                value={sa.investor?.name || '-'}
                              />
                              <DisplayFieldRow label="Dự án" value={sa.project?.name || '-'} />
                            </div>
                            {/* Cột Phải */}
                            <div className="divide-border-1 flex flex-col divide-y">
                              <DisplayFieldRow label="Giai đoạn hiện tại" value={statusChip} />
                              <DisplayFieldRow
                                label="Loại hình dự án"
                                value={
                                  sa.project_type ? (
                                    <Chip
                                      label={sa.project_type}
                                      variant={ColoredValueVariant.GREEN}
                                      size="small"
                                    />
                                  ) : (
                                    '-'
                                  )
                                }
                              />
                              <DisplayFieldRow
                                label="Loại nguồn nhập hàng"
                                value={sourceTypeLabel(sa.source_type)}
                              />
                              {sa.source_type === 'F0' && (
                                <DisplayFieldRow label="Nguồn nhập hàng" value={sourceEntityName} />
                              )}
                            </div>
                          </div>

                          <div className="border-border-1 grid grid-cols-1 gap-x-12 border-t md:grid-cols-2">
                            <div className="divide-border-1 flex flex-col divide-y">
                              <DisplayFieldRow
                                label="Giá bán TB dự kiến"
                                value={
                                  sa.expected_avg_selling_price
                                    ? `${formatCurrencyVND(sa.expected_avg_selling_price)} VNĐ`
                                    : '-'
                                }
                              />
                            </div>
                          </div>

                          <div className="border-border-1 grid grid-cols-1 gap-x-12 border-t pb-6 md:grid-cols-2">
                            <div className="divide-border-1 flex flex-col divide-y">
                              <DisplayFieldRow
                                label="Số tiền đặt chỗ tối thiểu"
                                value={
                                  sa.min_booking_amount
                                    ? `${formatCurrencyVND(sa.min_booking_amount)} VNĐ`
                                    : '-'
                                }
                              />
                            </div>
                            <div className="divide-border-1 flex flex-col divide-y">
                              <DisplayFieldRow
                                label="Số tiền đặt cọc tối thiểu"
                                value={
                                  sa.min_deposit_amount
                                    ? `${formatCurrencyVND(sa.min_deposit_amount)} VNĐ`
                                    : '-'
                                }
                              />
                            </div>
                          </div>

                          <div className="border-border-1 grid grid-cols-1 gap-x-12 border-t pb-6 md:grid-cols-1">
                            <div className="divide-border-1 flex flex-col divide-y">
                              <DisplayFieldRow label="Mô tả" value={sa.note || '-'} />
                            </div>
                          </div>

                          {/* Thông tin dự án */}
                          <ProjectPreviewBox
                            projectData={sa.project}
                            projectDirector={activeDirector}
                            projectSecretary={activeSecretary}
                          />

                          {/* Row Ngày tạo / Ngày sửa */}
                          <div className="mt-6 flex flex-col gap-6">
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
                              <DisplayField
                                label="Người tạo"
                                value={sa.created_by?.fullname || '-'}
                              />
                              <DisplayField
                                label="Ngày tạo"
                                value={sa.created_at ? formatDate(sa.created_at) : '-'}
                              />
                              <DisplayField
                                label="Người cập nhật"
                                value={sa.updated_by?.fullname || '-'}
                              />
                              <DisplayField
                                label="Ngày sửa"
                                value={sa.updated_at ? formatDate(sa.updated_at) : '-'}
                              />
                            </div>
                            <DisplayField label="Ghi chú" value={sa.note || '-'} />
                          </div>

                          {/* Nhân sự phụ trách bán */}
                          <div className="border-border-1 flex flex-col gap-4 border-t py-5">
                            <h3 className="text-content-dark-1 border-none text-lg font-semibold">
                              Đầu mối dự án
                            </h3>
                            {activeDirector || activeSecretary ? (
                              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                                {activeDirector && (
                                  <EmployeePreviewBox
                                    employeeData={activeDirector}
                                    title="Giám đốc dự án"
                                  />
                                )}
                                {activeSecretary && (
                                  <EmployeePreviewBox
                                    employeeData={activeSecretary}
                                    title="Thư ký dự án"
                                  />
                                )}
                              </div>
                            ) : (
                              <Text className="typo-body-base-regular text-content-dark-3">
                                Chưa có nhân sự nào được phân công
                              </Text>
                            )}
                          </div>

                          {/* Tệp đính kèm */}
                          <div className="border-border-1 flex flex-col border-t py-5">
                            <AttachmentSection
                              attachments={sa.attachments || []}
                              isRequired={false}
                            />
                          </div>
                        </div>
                      </Flex>
                    </div>
                  )}
                </Flex>
              )}

              {activeTab === 'inventory' && tabPermissions.canViewInventory && (
                <SaleAllocationInventories saleAllocationId={Number(id)} />
              )}

              {activeTab === 'tbc' && tabPermissions.canViewTbc && (
                <SaleAllocationTbcCommissionTable
                  saleAllocationId={Number(id)}
                  isReadOnly={!ability.can('update', 'project')}
                />
              )}

              {activeTab === 'f2' && tabPermissions.canViewF2 && (
                <SaleAllocationF2Table
                  saleAllocationId={Number(id)}
                  isReadOnly={!ability.can('update', 'project')}
                  setTabSlots={setF2TabSlots}
                />
              )}

              {activeTab === 'targets' && tabPermissions.canViewTargets && (
                <SaleAllocationTbcManagementTable saleAllocationId={Number(id)} />
              )}

              {activeTab === 'deposits' && tabPermissions.canViewDeposits && (
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
              )}

              {activeTab === 'transactions' && tabPermissions.canViewTransactions && (
                <SaleAllocationDeals saleAllocationId={Number(id)} />
              )}

              {activeTab === 'lad' && tabPermissions.canViewLad && (
                <SaleAllocationLadTab
                  saleAllocationId={Number(id)}
                  isReadOnly={!ability.can('create', 'deal_commission_adjustment_batch')}
                  setTabSlots={setLadTabSlots}
                />
              )}
            </Flex>
          </FormProvider>
        )}
      </DetailPageWrapper>
    </>
  )
}

export default SaleAllocationDetailPage

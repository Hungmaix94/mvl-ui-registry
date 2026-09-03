import { formatPercent } from '@/utils/common'
import { TbcSource } from '@/features/project/sale-allocations/types/product'
import { Table, Flex } from '@radix-ui/themes'
import React, { useCallback, useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { formatDateToApi, formatDate } from '@/utils/date-utils'
import { Button } from '@/components/ui'
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form'
import { Plus, Info } from 'lucide-react'
import { IconPencil, IconTrash, IconX, IconCheck, IconPlus } from '@/assets/icons'
import { FullCellNumberInput } from '@/components/commons'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { useDialog } from '@/hooks/useDialog'
import {
  TimePeriodDialog,
  type TimePeriodDialogRef,
} from '@/features/project/sale-allocations/components/TimePeriodDialog'
import {
  useCreateProductInventoryTbc,
  useUpdateProductInventoryTbc,
  useDeleteProductInventoryTbc,
} from '@/features/project/product-inventories/services/product-inventory-tbc-service'

import toastService from '@/services/toast-service'

/** Inline SA reference indicator — shows when SA value differs from current PI value */
const SaReferenceIndicator = ({
  saValue,
  currentValue,
  suffix,
}: {
  saValue: any
  currentValue: any
  suffix: string
}) => {
  if (saValue == null || saValue === '' || String(saValue) === String(currentValue || ''))
    return null

  return (
    <div className="flex shrink-0 items-center gap-1 pl-3">
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 shrink-0 cursor-pointer text-[#8C8C8C]" />
          </TooltipTrigger>
          <TooltipContent className="rounded border-none">
            <p className="text-xs">Giá trị trong thông tin bán hàng</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <span className="typo-body-small-regular whitespace-nowrap text-[#8C8C8C]">
        {saValue}
        {suffix}
      </span>
    </div>
  )
}

const SaOriginalValue = ({
  saValue,
  suffix,
  isEditing,
}: {
  saValue: any
  suffix: string
  isEditing: boolean
}) => {
  if (saValue == null || saValue === '') return null

  const displayValue = `${Number(saValue).toLocaleString('vi-VN')}${suffix}`

  if (isEditing) {
    return (
      <div className="pointer-events-none absolute left-2 z-[1] flex items-center gap-1">
        <span className="typo-body-small-regular whitespace-nowrap text-[#8C8C8C]">
          {displayValue}
        </span>
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="pointer-events-auto h-3.5 w-3.5 cursor-pointer text-[#8C8C8C]" />
            </TooltipTrigger>
            <TooltipContent className="rounded border-none">
              <p className="text-xs">Giá trị trong thông tin bán hàng</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-1 pl-3">
      <span className="typo-body-small-regular whitespace-nowrap text-[#8C8C8C]">
        {displayValue}
      </span>
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 shrink-0 cursor-pointer text-[#8C8C8C]" />
          </TooltipTrigger>
          <TooltipContent className="rounded border-none">
            <p className="text-xs">Giá trị trong thông tin bán hàng</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  )
}

const roles = [
  { key: 'ceo', label: 'Tổng giám đốc' },
  { key: 'ceo_mv_paid', label: 'Tổng giám đốc (MV chi trả)' },
  { key: 'sales_director', label: 'Giám đốc Kinh doanh' },
  { key: 'sales_manager', label: 'Trưởng bộ phận KD' },
  { key: 'project_director', label: 'Giám đốc Dự án' },
  { key: 'project_secretary', label: 'Thư ký Dự án' },
]

type ManagementFormValues = {
  tbc_managements: Array<{
    id?: number
    effective_from?: string | null
    effective_to?: string | null
    note?: string | null
    pct_ceo?: number | string | null
    amt_ceo?: number | string | null
    pct_ceo_mv_paid?: number | string | null
    amt_ceo_mv_paid?: number | string | null
    pct_sales_director?: number | string | null
    amt_sales_director?: number | string | null
    pct_sales_manager?: number | string | null
    amt_sales_manager?: number | string | null
    pct_project_director?: number | string | null
    amt_project_director?: number | string | null
    pct_project_secretary?: number | string | null
    amt_project_secretary?: number | string | null
  }>
}

import { useQueryClient } from '@tanstack/react-query'
import { TBC_SOURCE } from '@/constants/commission'

export type PiTbcManagementTableProps = {
  productInventoryId: number
  tbcSource?: 'sa' | 'pi'
  isReadOnly?: boolean
  initialIsEditing?: boolean
  initialData?: any[]
}

const PiTbcManagementTable: React.FC<PiTbcManagementTableProps> = ({
  productInventoryId,
  tbcSource = 'sa',
  isReadOnly = false,
  initialIsEditing = false,
  initialData = [],
}) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [isEditing, setIsEditing] = useState(false)
  const queryClient = useQueryClient()
  const { mutateAsync: createTbcManagement } = useCreateProductInventoryTbc(
    productInventoryId,
    'tbc-management'
  )
  const { mutateAsync: updateTbcManagement } = useUpdateProductInventoryTbc(
    productInventoryId,
    'tbc-management'
  )
  const { mutateAsync: deleteTbcManagement } = useDeleteProductInventoryTbc(
    productInventoryId,
    'tbc-management'
  )

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ManagementFormValues>({
    defaultValues: { tbc_managements: [] },
  })

  const { fields, append, remove, replace, update } = useFieldArray({
    control,
    name: 'tbc_managements',
  })

  const watchedManagements = useWatch({ control, name: 'tbc_managements' })

  useEffect(() => {
    if (initialData.length > 0 && !isEditing) {
      replace(initialData.map((item: any) => ({ ...item })))
    } else if (!initialData.length && !isEditing) {
      replace([])
    }
  }, [initialData, isEditing, replace])

  useEffect(() => {
    if (initialIsEditing && initialData && !isEditing) {
      setIsEditing(true)
      const newParams = new URLSearchParams(searchParams)
      if (newParams.has('isEditmode')) {
        newParams.delete('isEditmode')
        setSearchParams(newParams, { replace: true })
      }
    }
  }, [initialIsEditing, initialData, isEditing, searchParams, setSearchParams])

  const { displayFormContent, displayClose } = useDialog()

  const handleEdit = useCallback(() => setIsEditing(true), [])
  const handleCancel = useCallback(() => {
    setIsEditing(false)
    if (initialData.length > 0) {
      replace(initialData)
    } else {
      replace([])
    }
  }, [initialData, replace])

  const onSubmit = async (formData: ManagementFormValues) => {
    try {
      const items = formData.tbc_managements

      if (tbcSource === TbcSource.SA) {
        for (const item of items) {
          const { id, ...createPayload } = item as any
          await createTbcManagement(createPayload)
        }
      } else {
        for (const item of items) {
          if (typeof item.id === 'number') {
            await updateTbcManagement({ id: item.id, data: item })
          } else {
            // Remove react-hook-form's string UUID injected 'id' before creating
            const { id, ...createPayload } = item as any
            await createTbcManagement(createPayload)
          }
        }

        const currentIds = items.map((i) => i.id).filter((id) => typeof id === 'number') as number[]
        const existingIds = initialData.map((i: any) => i.id) || []
        const idsToDelete = existingIds.filter((id: number) => !currentIds.includes(id))

        for (const id of idsToDelete) {
          await deleteTbcManagement(id)
        }
      }

      toastService.success('Cập nhật hoa hồng Quản lý thành công')
      setIsEditing(false)
      // Invalidate context to update tbc_source and trigger refetch
      queryClient.invalidateQueries({
        queryKey: ['realestate', 'product-inventories', productInventoryId, 'tbc-context'],
      })
    } catch (error) {
      console.error(error)
      toastService.error('Có lỗi xảy ra khi cập nhật hoa hồng. Vui lòng thử lại.')
    }
  }

  const handleAddPeriodItem = (periodData: any, editIndex?: number) => {
    if (typeof editIndex === 'number') {
      const existingValues = fields[editIndex]
      update(editIndex, { ...existingValues, ...periodData })
    } else {
      append({
        ...periodData,
        pct_ceo: null,
        amt_ceo: null,
        pct_ceo_mv_paid: null,
        amt_ceo_mv_paid: null,
        pct_sales_director: null,
        amt_sales_director: null,
        pct_sales_manager: null,
        amt_sales_manager: null,
        pct_project_director: null,
        amt_project_director: null,
        pct_project_secretary: null,
        amt_project_secretary: null,
      })
      if (!isEditing) setIsEditing(true)
    }
  }

  const handleAddPeriod = () => {
    const dialogRef = React.createRef<TimePeriodDialogRef>()
    displayFormContent({
      title: 'Thêm mới thời gian áp dụng',
      confirmText: 'Thêm mới',
      onConfirm: async () => {
        const isValid = await dialogRef.current?.submit()
        if (!isValid) throw { isValidationError: true }
      },
      content: (
        <TimePeriodDialog
          ref={dialogRef}
          showDefaultValue={false}
          onApply={(range) => {
            if (range) {
              const updatedData = {
                effective_from: formatDateToApi(range.from),
                effective_to: range.to ? formatDateToApi(range.to) : null,
              }
              handleAddPeriodItem(updatedData)
              displayClose()
            }
          }}
        />
      ),
    })
  }

  const handleEditPeriod = (index: number) => {
    const currentValues = fields[index]
    const dialogRef = React.createRef<TimePeriodDialogRef>()
    displayFormContent({
      title: 'Chỉnh sửa thời gian áp dụng',
      confirmText: 'Cập nhật',
      onConfirm: async () => {
        const isValid = await dialogRef.current?.submit()
        if (!isValid) throw { isValidationError: true }
      },
      content: (
        <TimePeriodDialog
          ref={dialogRef}
          initialDateRange={{
            from: currentValues.effective_from ? new Date(currentValues.effective_from) : undefined,
            to: currentValues.effective_to ? new Date(currentValues.effective_to) : undefined,
          }}
          isEditing
          onApply={(range) => {
            if (range) {
              const updatedData = {
                effective_from: formatDateToApi(range.from),
                effective_to: range.to ? formatDateToApi(range.to) : null,
              }
              handleAddPeriodItem(updatedData, index)
              displayClose()
            }
          }}
        />
      ),
    })
  }

  const renderContent = () => {
    return (
      <div className="border-border-1 relative w-full overflow-hidden border shadow-sm">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle outline-none">
            <Table.Root className="w-full border-collapse text-left outline-none">
              <Table.Header className="border-border-1 border-b bg-[#F0F2F5]">
                <Table.Row>
                  <Table.ColumnHeaderCell
                    className="typo-body-base-medium border-border-1 sticky left-0 z-20 border-r bg-[#F0F2F5] px-3 py-3 text-center align-middle"
                    style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}
                  >
                    STT
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell
                    className="border-border-1 typo-body-base-medium sticky left-[60px] z-20 border-r bg-[#F0F2F5] px-4 py-3 align-middle font-medium text-[#4B4B4B]"
                    style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }}
                  >
                    Hạng mục
                  </Table.ColumnHeaderCell>
                  {fields.map((period: any, i: number) => (
                    <Table.ColumnHeaderCell
                      key={period.id || i}
                      className="typo-body-base-medium border-border-1 min-w-[200px] border-r px-3 py-3 align-middle"
                    >
                      <div className="flex items-center justify-between px-2">
                        <span className="typo-body-base-medium font-medium text-[#4B4B4B]">
                          {period.effective_from
                            ? `${formatDate(period.effective_from)} - ${period.effective_to ? formatDate(period.effective_to) : 'Nay'}`
                            : period.effective_to
                              ? `- ${formatDate(period.effective_to)}`
                              : 'Chưa xác định'}
                        </span>
                        {isEditing && (
                          <div className="flex gap-1">
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => handleEditPeriod(i)}
                              className="bg-neutral-30 h-9 w-9 p-2.5"
                              title="Chỉnh sửa khoảng thời gian"
                            >
                              <IconPencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => remove(i)}
                              className="bg-neutral-30 text-data-red-default hover:text-data-red-hover h-9 w-9 p-2.5"
                              title="Xoá khoảng thời gian này"
                            >
                              <IconTrash className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </Table.ColumnHeaderCell>
                  ))}
                  {isEditing && (
                    <Table.ColumnHeaderCell className="typo-body-base-medium border-border-1 max-w-[40px] min-w-[40px] border-r px-3 py-3 text-center align-middle">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={handleAddPeriod}
                        className="bg-neutral-30 mx-auto h-9 w-9 p-2.5"
                        title="Thêm khoảng thời gian"
                      >
                        <IconPlus className="text-content-dark-2 h-4 w-4" />
                      </Button>
                    </Table.ColumnHeaderCell>
                  )}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {roles.flatMap((role, rowIdx) => [
                  <Table.Row
                    key={`pct_${role.key}`}
                    className="border-border-1 hover:bg-surface-primary-hover border-b transition-colors"
                  >
                    <Table.Cell
                      className="border-border-1 typo-body-base-medium sticky left-0 z-20 border-r bg-white px-2 py-2 text-center align-middle font-medium text-gray-500 group-hover:bg-[#F3F4F6]"
                      style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}
                    >
                      {rowIdx * 2 + 1}
                    </Table.Cell>
                    <Table.Cell
                      className="border-border-1 typo-body-base-medium text-content-dark-1 sticky left-[60px] z-20 border-r bg-white px-4 py-2 align-middle font-medium shadow-[1px_0_0_#e5e7eb] group-hover:bg-[#F3F4F6]"
                      style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }}
                    >
                      <div className="flex items-center gap-2">
                        <span>{role.label}</span>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-500">
                          %
                        </span>
                      </div>
                    </Table.Cell>
                    {fields.map((period: any, colIdx: number) => {
                      const isSa = String(period.tbc_source).toLowerCase() === TBC_SOURCE.SA
                      const saRef = isSa ? period[`pct_${role.key}`] : period[`sa_pct_${role.key}`]
                      const curVal = (watchedManagements as any)?.[colIdx]?.[`pct_${role.key}`]
                      const hasSaRef =
                        saRef != null && saRef !== '' && String(saRef) !== String(curVal || '')

                      return (
                        <Table.Cell
                          key={`pct_${colIdx}`}
                          className="border-border-1 typo-body-base-regular h-full border-r bg-white !p-0 align-top"
                        >
                          {isEditing ? (
                            <Controller
                              control={control}
                              name={`tbc_managements.${colIdx}.pct_${role.key}` as any}
                              render={({ field }) => (
                                <div className="relative flex h-full w-full items-center">
                                  {saRef != null && saRef !== '' && (
                                    <SaOriginalValue saValue={saRef} suffix="%" isEditing={true} />
                                  )}
                                  <FullCellNumberInput
                                    value={field.value as number | undefined}
                                    onChange={field.onChange}
                                    placeholder="0"
                                    suffix="%"
                                    className={saRef != null && saRef !== '' ? 'pl-8' : ''}
                                  />
                                </div>
                              )}
                            />
                          ) : (
                            <div className="relative flex h-full w-full items-center">
                              {hasSaRef && (
                                <SaReferenceIndicator
                                  saValue={saRef}
                                  currentValue={curVal}
                                  suffix="%"
                                />
                              )}
                              {isSa && !hasSaRef && (
                                <SaOriginalValue saValue={saRef} suffix="%" isEditing={false} />
                              )}
                              <FullCellNumberInput
                                value={curVal != null ? Number(curVal) : undefined}
                                disabled={true}
                                suffix="%"
                                className={`rounded-none border-none pr-8 text-right shadow-none hover:ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${isSa && !hasSaRef ? 'pl-8' : ''}`}
                              />
                            </div>
                          )}
                        </Table.Cell>
                      )
                    })}
                    {isEditing && (
                      <Table.Cell className="border-border-1 max-w-[40px] min-w-[40px] border-r bg-[#F0F2F5] px-3 py-3 text-center align-middle" />
                    )}
                  </Table.Row>,
                  <Table.Row
                    key={`amt_${role.key}`}
                    className="group border-border-1 hover:bg-surface-primary-hover border-b transition-colors last:border-b-0"
                  >
                    <Table.Cell
                      className="border-border-1 typo-body-base-medium sticky left-0 z-20 border-r bg-white px-2 py-2 text-center align-middle font-medium text-gray-500 group-hover:bg-[#F3F4F6]"
                      style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}
                    >
                      {rowIdx * 2 + 2}
                    </Table.Cell>
                    <Table.Cell
                      className="border-border-1 typo-body-base-medium text-content-dark-1 sticky left-[60px] z-20 border-r bg-white px-4 py-2 align-middle font-medium shadow-[1px_0_0_#e5e7eb] group-hover:bg-[#F3F4F6]"
                      style={{ width: '200px', minWidth: '200px', maxWidth: '200px' }}
                    >
                      <div className="flex items-center gap-2">
                        <span>{role.label}</span>
                        <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-semibold text-gray-500">
                          VNĐ
                        </span>
                      </div>
                    </Table.Cell>
                    {fields.map((period: any, colIdx: number) => {
                      const isSa = String(period.tbc_source).toLowerCase() === TBC_SOURCE.SA
                      const saRef = isSa ? period[`amt_${role.key}`] : period[`sa_amt_${role.key}`]
                      const curVal = (watchedManagements as any)?.[colIdx]?.[`amt_${role.key}`]
                      const hasSaRef =
                        saRef != null && saRef !== '' && String(saRef) !== String(curVal || '')

                      return (
                        <Table.Cell
                          key={`amt_${colIdx}`}
                          className="border-border-1 typo-body-base-regular h-full border-r bg-white !p-0 align-top"
                        >
                          {isEditing ? (
                            <Controller
                              control={control}
                              name={`tbc_managements.${colIdx}.amt_${role.key}` as any}
                              render={({ field }) => (
                                <div className="relative flex h-full w-full items-center">
                                  {saRef != null && saRef !== '' && (
                                    <SaOriginalValue
                                      saValue={saRef}
                                      suffix=" VNĐ"
                                      isEditing={true}
                                    />
                                  )}
                                  <FullCellNumberInput
                                    value={field.value as number | undefined}
                                    onChange={field.onChange}
                                    placeholder="0"
                                    suffix=" VNĐ"
                                    className={saRef != null && saRef !== '' ? 'pl-8' : ''}
                                  />
                                </div>
                              )}
                            />
                          ) : (
                            <div className="relative flex h-full w-full items-center">
                              {hasSaRef && (
                                <SaReferenceIndicator
                                  saValue={saRef}
                                  currentValue={curVal}
                                  suffix=" VNĐ"
                                />
                              )}
                              {isSa && !hasSaRef && (
                                <SaOriginalValue saValue={saRef} suffix=" VNĐ" isEditing={false} />
                              )}
                              <FullCellNumberInput
                                value={curVal != null ? Number(curVal) : undefined}
                                disabled={true}
                                suffix="VNĐ"
                                className={`rounded-none border-none pr-12 text-right shadow-none hover:ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${isSa && !hasSaRef ? 'pl-8' : ''}`}
                              />
                            </div>
                          )}
                        </Table.Cell>
                      )
                    })}
                    {isEditing && (
                      <Table.Cell className="border-border-1 max-w-[40px] min-w-[40px] border-r bg-[#F0F2F5] px-3 py-3 text-center align-middle" />
                    )}
                  </Table.Row>,
                ])}
              </Table.Body>
            </Table.Root>
          </div>
        </div>
      </div>
    )
  }

  const renderActiveSummary = () => {
    if (!initialData || !initialData.length) return null
    const now = new Date().getTime()
    const active =
      [...initialData]
        .sort(
          (a, b) =>
            new Date(b.effective_from || 0).getTime() - new Date(a.effective_from || 0).getTime()
        )
        .find((period: any) => {
          if (!period.effective_from) return true
          const from = new Date(period.effective_from).getTime()
          const to = period.effective_to ? new Date(period.effective_to).getTime() : Infinity
          return from <= now && now <= to
        }) || initialData[0] // Fallback to the latest one if none matches strictly

    return (
      <div className="border-border-1 mb-6 rounded-[4px] border bg-[#F8F9FA] p-4">
        <h3 className="text-content-dark-1 mb-3 text-sm font-semibold">
          Cấu hình hoa hồng đang được áp dụng
        </h3>
        <div className="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => {
            const pct = active ? active[`pct_${role.key}`] : null
            const amt = active ? active[`amt_${role.key}`] : null

            return (
              <div key={role.key} className="flex flex-col">
                <span className="text-content-dark-3 mb-1 text-xs">{role.label}</span>
                <span className="text-content-dark-1 typo-body-base-medium font-medium">
                  {pct == null && amt == null ? (
                    '---'
                  ) : (
                    <>
                      {amt != null ? `${Number(amt).toLocaleString('vi-VN')} VNĐ` : ''}
                      {pct != null && amt != null ? ' / ' : ''}
                      {pct != null ? formatPercent(pct) : ''}
                    </>
                  )}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {renderActiveSummary()}
      <Flex justify="between" align="center">
        <h3 className="text-content-dark-1 text-base font-semibold">Lịch sử cấu hình</h3>
        {!isReadOnly && (
          <Flex gap="3">
            {!isEditing && (
              <Button
                onClick={() => {
                  if (fields.length === 0) {
                    setIsEditing(true)
                    handleAddPeriod()
                  } else {
                    handleEdit()
                  }
                }}
                variant="secondary-border"
                leftIcon={fields.length === 0 ? <Plus className="h-4 w-4" /> : <IconPencil />}
              >
                {fields.length === 0 ? 'Thêm mới' : 'Chỉnh sửa'}
              </Button>
            )}
            {isEditing && (
              <>
                <Button
                  variant="secondary"
                  type="button"
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="text-content-dark-3 hover:text-content-dark-1"
                  leftIcon={<IconX />}
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<IconCheck />}
                  onClick={handleSubmit(onSubmit)}
                  loading={isSubmitting}
                >
                  Lưu
                </Button>
              </>
            )}
          </Flex>
        )}
      </Flex>
      <form onSubmit={handleSubmit(onSubmit)}>{renderContent()}</form>
    </div>
  )
}

export default PiTbcManagementTable

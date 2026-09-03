import { Table, Flex } from '@radix-ui/themes'
import React, { useCallback, useState, useEffect, useMemo } from 'react'
import { formatDateToApi, formatDate } from '@/utils/date-utils'
import { Button, IconButton, Text, CurrencyInput, Select } from '@/components/ui'
import { useFormContext, useFieldArray, Controller } from 'react-hook-form'
import { Trash2, Plus, Edit2, Calendar } from 'lucide-react'

import { useDialog } from '@/hooks/useDialog'
import AddF2Dialog from './AddF2Dialog'
import { TimePeriodDialog, TimePeriodDialogRef } from './TimePeriodDialog'
import { getRealEstateService } from '@/services/realestate-service'
import { formatCurrencyVND } from '@/utils'

import { PenSquare, X, Save } from 'lucide-react'

export type SaleAllocationTargetTableProps = {
  isEditing?: boolean
  onEditingChange?: (val: boolean) => void
  onSave?: () => void
  isSaving?: boolean
  hasPermission?: boolean
}

export const SaleAllocationTargetTable = ({
  isEditing = false,
  onEditingChange,
  onSave,
  isSaving = false,
  hasPermission = false,
}: SaleAllocationTargetTableProps) => {
  const [exchangeMap, setExchangeMap] = useState<Record<number, string>>({})
  const { control } = useFormContext<any>()
  const { fields, append, remove, update } = useFieldArray({
    control,
    name: 'targets',
  })

  const targetTypeOptions = useMemo(
    () => [
      { value: 'revenue', label: 'Doanh thu' },
      { value: 'booking_count', label: 'Số lượng giao dịch' },
    ],
    []
  )

  useEffect(() => {
    let isMounted = true
    const missingIds = fields
      .map((f: any) => f.exchange_id)
      .filter((id: number) => id && !exchangeMap[id])
    if (missingIds.length > 0) {
      Promise.all(
        missingIds.map((id: number) =>
          getRealEstateService()
            .getExchange(id)
            .catch(() => null)
        )
      ).then((results) => {
        if (!isMounted) return
        const newMap = { ...exchangeMap }
        results.forEach((res) => {
          if (res) newMap[res.id] = res.name
        })
        setExchangeMap(newMap)
      })
    }
    return () => {
      isMounted = false
    }
  }, [fields, exchangeMap])

  const { displayFormContent, displayClose } = useDialog()

  const handleEditPeriod = (index: number) => {
    const period = fields[index] as any
    const dialogRef = React.createRef<TimePeriodDialogRef>()

    displayFormContent({
      title: 'Khoảng thời gian áp dụng KPIs',
      confirmText: 'Cập nhật',
      onConfirm: async () => {
        const isValid = await dialogRef.current?.submit()
        if (!isValid) throw { isValidationError: true }
      },
      content: (
        <TimePeriodDialog
          ref={dialogRef}
          initialDateRange={{
            from: period.effective_from ? new Date(period.effective_from) : undefined,
            to: period.effective_to ? new Date(period.effective_to) : undefined,
          }}
          isEditing
          onApply={(range: any) => {
            const updatedRow = { ...period }
            if (range) {
              updatedRow.effective_from = formatDateToApi(range.from)
              updatedRow.effective_to = range.to ? formatDateToApi(range.to) : null
            } else {
              updatedRow.effective_from = null
              updatedRow.effective_to = null
            }
            update(index, updatedRow)
            displayClose()
          }}
        />
      ),
    })
  }

  const handleAddF2 = useCallback(() => {
    if (!isEditing && !hasPermission) return
    displayFormContent({
      title: 'Thêm sàn liên kết vào KPI',
      content: (
        <AddF2Dialog
          existingExchangeIds={fields.map((f: any) => f.exchange_id) || []}
          onConfirm={async (data) => {
            let name = 'Đang tải...'
            try {
              if (data.exchange_id && !exchangeMap[data.exchange_id]) {
                const ex = await getRealEstateService().getExchange(data.exchange_id)
                name = ex.name
                setExchangeMap((prev) => ({ ...prev, [ex.id]: ex.name }))
              } else if (data.exchange_id) {
                name = exchangeMap[data.exchange_id]
              }
            } catch (e) {}

            append({
              exchange_id: data.exchange_id as number,
              exchange_name: name,
              type: 'revenue',
              target_revenue: null,
              note: data.note,
              effective_from: null,
              effective_to: null,
            })
            displayClose()
          }}
          onCancel={displayClose}
        />
      ),
      confirmText: '',
      hideFooter: true,
    })
  }, [isEditing, hasPermission, fields, exchangeMap, displayFormContent, displayClose, append])

  const handleAddPeriod = (exchangeId: number, exchangeName: string) => {
    append({
      exchange_id: exchangeId,
      exchange_name: exchangeName,
      type: 'revenue',
      target_revenue: null,
      note: '',
      effective_from: null,
      effective_to: null,
    })
  }

  const groupedByExchange = fields.reduce((acc: any, item: any, index: number) => {
    const key = item.exchange_id
    if (!key) {
      // support legacy targets without exchange_id
      if (!acc['global']) acc['global'] = []
      acc['global'].push({ ...item, originalIndex: index })
      return acc
    }
    if (!acc[key]) acc[key] = []
    acc[key].push({ ...item, originalIndex: index })
    return acc
  }, {})

  return (
    <div className="flex flex-col gap-4">
      <Flex justify="between" align="center">
        <Text className="text-brand-primary text-lg font-semibold">Danh sách KPIs Sàn Đại lý</Text>
        {hasPermission && (
          <Flex gap="3">
            {!isEditing && (
              <Button
                onClick={() => {
                  onEditingChange?.(true)
                  handleAddF2()
                }}
                variant="secondary-border"
                size="medium"
                leftIcon={<Plus className="h-4 w-4" />}
                className="min-w-[100px]"
              >
                Thêm mới
              </Button>
            )}
            {isEditing ? (
              <>
                <Button
                  type="button"
                  onClick={handleAddF2}
                  variant="secondary-border"
                  size="medium"
                  leftIcon={<Plus className="h-4 w-4" />}
                  className="min-w-[100px]"
                >
                  Thêm mới
                </Button>
                <Button
                  variant="secondary-border"
                  size="medium"
                  onClick={() => onEditingChange?.(false)}
                  disabled={isSaving}
                  leftIcon={<X className="h-4 w-4" />}
                  className="min-w-[100px]"
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  size="medium"
                  onClick={onSave}
                  loading={isSaving}
                  disabled={isSaving}
                  leftIcon={<Save className="h-4 w-4" />}
                  className="min-w-[100px]"
                >
                  Lưu
                </Button>
              </>
            ) : (
              <Button
                onClick={() => onEditingChange?.(true)}
                variant="secondary-border"
                size="medium"
                leftIcon={<PenSquare className="h-4 w-4" />}
                className="min-w-[100px]"
              >
                Chỉnh sửa
              </Button>
            )}
          </Flex>
        )}
      </Flex>

      {fields.length === 0 ? (
        <div className="border-border-1 bg-neutral-10 flex flex-col items-center justify-center gap-4 border border-dashed p-6">
          <Text className="text-content-dark-3 typo-body-base-regular">
            Chưa có KPIs nào được phân bổ
          </Text>
          {hasPermission && !isEditing && (
            <Button
              type="button"
              variant="secondary-border"
              size="medium"
              onClick={() => {
                onEditingChange?.(true)
                handleAddF2()
              }}
              leftIcon={<Plus className="h-4 w-4" />}
              className="min-w-[200px]"
            >
              Thêm KPIs Sàn
            </Button>
          )}
          {hasPermission && isEditing && (
            <Button
              type="button"
              variant="secondary-border"
              size="medium"
              onClick={handleAddF2}
              leftIcon={<Plus className="h-4 w-4" />}
              className="min-w-[200px]"
            >
              Thêm KPIs Sàn
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(groupedByExchange).map(([exchangeIdStr, items]: [string, any]) => {
            const isGlobal = exchangeIdStr === 'global'
            const exchangeId = isGlobal ? null : Number(exchangeIdStr)
            const exchangeName = isGlobal
              ? 'KPI Chung (Không thuộc sàn)'
              : items[0]?.exchange_name ||
                exchangeMap[exchangeId!] ||
                `Đang tải sàn #${exchangeId}...`

            return (
              <div key={exchangeIdStr} className="flex flex-col gap-2">
                <Flex justify="between" align="center">
                  <Text className="text-brand-primary text-base font-semibold">{exchangeName}</Text>
                  {isEditing && !isGlobal && (
                    <Button
                      type="button"
                      variant="text"
                      size="small"
                      onClick={() => handleAddPeriod(exchangeId!, exchangeName)}
                      leftIcon={<Plus className="h-4 w-4" />}
                    >
                      Thêm thời gian áp dụng
                    </Button>
                  )}
                </Flex>
                <div className="border-border-1 overflow-x-auto rounded-none border shadow-sm">
                  <Table.Root
                    className="w-full border-collapse rounded-none"
                    style={{ borderRadius: 0 }}
                  >
                    <Table.Header className="border-border-1 bg-background-2 border-b">
                      <Table.Row>
                        <Table.ColumnHeaderCell
                          className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-left align-middle text-[#4B4B4B]"
                          style={{ width: '60px' }}
                        >
                          STT
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell
                          className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-center align-middle text-[#4B4B4B]"
                          style={{ width: '250px' }}
                        >
                          Thời gian áp dụng
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell
                          className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-left align-middle text-[#4B4B4B]"
                          style={{ width: '200px' }}
                        >
                          Loại Target
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell
                          className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-right align-middle text-[#4B4B4B]"
                          style={{ width: '250px' }}
                        >
                          Doanh thu mục tiêu (VND)
                        </Table.ColumnHeaderCell>

                        {isEditing && (
                          <Table.ColumnHeaderCell
                            className="typo-body-base-medium border-border-1 bg-background-2 sticky right-0 z-[10] px-3 py-3 text-center align-middle shadow-[-1px_0_0_#e5e7eb]"
                            style={{ width: '60px', minWidth: '60px' }}
                          ></Table.ColumnHeaderCell>
                        )}
                      </Table.Row>
                    </Table.Header>
                    <Table.Body>
                      {items.map((item: any, rowIdx: number) => {
                        const index = item.originalIndex

                        const typeLabel =
                          targetTypeOptions.find((o) => o.value === item.type)?.label ||
                          item.type ||
                          '-'

                        return (
                          <Table.Row
                            key={item.id || index}
                            className="border-border-1 border-b last:border-b-0"
                          >
                            <Table.Cell className="border-border-1 typo-body-base-medium text-content-dark-3 border-r px-3 py-2 text-left align-middle">
                              {rowIdx + 1}
                            </Table.Cell>
                            <Table.Cell className="border-border-1 typo-body-base-medium border-r px-3 py-2 text-center align-middle">
                              {isEditing ? (
                                <div
                                  className="flex cursor-pointer items-center justify-center gap-2 text-[#0065F2] hover:underline"
                                  onClick={() => handleEditPeriod(index)}
                                >
                                  {item.effective_from ? (
                                    <>
                                      Từ {formatDate(item.effective_from)}
                                      {item.effective_to
                                        ? ` đến ${formatDate(item.effective_to)}`
                                        : ''}
                                      <Edit2 className="h-4 w-4" />
                                    </>
                                  ) : (
                                    <>
                                      Chọn thời gian
                                      <Calendar className="h-4 w-4" />
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div className="text-center">
                                  {item.effective_from ? (
                                    <>
                                      Từ {formatDate(item.effective_from)}
                                      {item.effective_to
                                        ? ` đến ${formatDate(item.effective_to)}`
                                        : ''}
                                    </>
                                  ) : (
                                    '-'
                                  )}
                                </div>
                              )}
                            </Table.Cell>

                            <Table.Cell className="border-border-1 typo-body-base-medium border-r px-0 py-0 text-left align-middle">
                              {isEditing ? (
                                <Controller
                                  control={control}
                                  name={`targets.${index}.type`}
                                  render={({ field }) => (
                                    <div className="p-2">
                                      <Select
                                        {...field}
                                        options={targetTypeOptions}
                                        className="h-full w-full border-none shadow-none outline-none focus:ring-0"
                                      />
                                    </div>
                                  )}
                                />
                              ) : (
                                <div className="px-3 py-2 text-left">{typeLabel}</div>
                              )}
                            </Table.Cell>

                            <Table.Cell className="border-border-1 typo-body-base-semibold border-r px-0 py-0 text-right align-middle">
                              {isEditing ? (
                                <Controller
                                  control={control}
                                  name={`targets.${index}.target_revenue`}
                                  render={({ field }) => (
                                    <CurrencyInput
                                      value={field.value === null ? undefined : field.value}
                                      onChange={(val: any) => field.onChange(val)}
                                      placeholder="0"
                                      className="h-full w-full min-w-[120px] border-none px-3 py-2 text-right shadow-none outline-none focus:ring-0"
                                    />
                                  )}
                                />
                              ) : (
                                <div className="px-3 py-2 text-right text-[#E5202B]">
                                  {item.target_revenue
                                    ? formatCurrencyVND(item.target_revenue)
                                    : '-'}
                                </div>
                              )}
                            </Table.Cell>

                            {isEditing && (
                              <Table.Cell className="border-border-1 sticky right-0 z-[1] bg-white px-3 py-2 text-center align-middle shadow-[-1px_0_0_#e5e7eb]">
                                <IconButton
                                  variant="text"
                                  size="small"
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="hover:text-red-70 text-red-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </IconButton>
                              </Table.Cell>
                            )}
                          </Table.Row>
                        )
                      })}
                    </Table.Body>
                  </Table.Root>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SaleAllocationTargetTable

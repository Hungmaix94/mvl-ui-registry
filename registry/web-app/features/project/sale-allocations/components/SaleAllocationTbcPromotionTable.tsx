import { formatPercent } from '@/utils/common'
import { Table, Flex } from '@radix-ui/themes'
import React, { useCallback, useState, useEffect } from 'react'
import { formatDateToApi, formatDate } from '@/utils/date-utils'
import { Button } from '@/components/ui'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { PenSquare, X, MoreVertical } from 'lucide-react'
import { IconPencil, IconTrash } from '@/assets/icons'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { FullCellNumberInput } from '@/components/commons'

import { useDialog } from '@/hooks/useDialog'
import { TimePeriodDialog, TimePeriodDialogRef } from './TimePeriodDialog'
import {
  useSalesAllocationTbcList,
  useCreateSalesAllocationTbc,
  useUpdateSalesAllocationTbc,
  useDeleteSalesAllocationTbc,
} from '@/features/project/sale-allocations/services/sales-allocation-service'

import toastService from '@/services/toast-service'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const roles = [
  { key: 'relationship', label: 'Đầu mối quan hệ', pct: 'pct_relationship' },
  { key: 'planning', label: 'Lên kế hoạch - đảm bảo Ký HĐ', pct: 'pct_planning' },
  { key: 'packaging', label: 'Đóng gói sản phẩm', pct: 'pct_packaging' },
  { key: 'sales_support', label: 'Hỗ trợ kinh doanh', pct: 'pct_sales_support' },
  { key: 'coordination', label: 'Điều phối chung Dự án', pct: 'pct_coordination' },
]

const promotionSchema = z.object({
  tbc_promotions: z.array(
    z.object({
      id: z.number().optional(),
      effective_from: z.string().nullish(),
      effective_to: z.string().nullish(),
      note: z.string().nullish(),
      pct_relationship: z.string().or(z.number()).nullish(),
      pct_planning: z.string().or(z.number()).nullish(),
      pct_packaging: z.string().or(z.number()).nullish(),
      pct_sales_support: z.string().or(z.number()).nullish(),
      pct_coordination: z.string().or(z.number()).nullish(),
    })
  ),
})

type PromotionFormValues = z.infer<typeof promotionSchema>

export type SaleAllocationTbcPromotionTableProps = {
  saleAllocationId: number
  isReadOnly?: boolean
}

export const SaleAllocationTbcPromotionTable = ({
  saleAllocationId,
  isReadOnly = false,
}: SaleAllocationTbcPromotionTableProps) => {
  const [isEditing, setIsEditing] = useState(false)

  const { data, isLoading, refetch } = useSalesAllocationTbcList(saleAllocationId, 'tbc-promotion')
  const { mutateAsync: createTbcPromotion } = useCreateSalesAllocationTbc(
    saleAllocationId,
    'tbc-promotion'
  )
  const { mutateAsync: updateTbcPromotion } = useUpdateSalesAllocationTbc(
    saleAllocationId,
    'tbc-promotion'
  )
  const { mutateAsync: deleteTbcPromotion } = useDeleteSalesAllocationTbc(
    saleAllocationId,
    'tbc-promotion'
  )

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<PromotionFormValues>({
    resolver: zodResolver(promotionSchema),
    defaultValues: {
      tbc_promotions: [],
    },
  })

  const { fields, remove, replace, update } = useFieldArray({
    control,
    name: 'tbc_promotions',
  })

  useEffect(() => {
    if (data?.results && !isEditing) {
      replace(data.results.map((item: any) => ({ ...item })))
    } else if (!data?.results?.length && !isEditing) {
      replace([])
    }
  }, [data?.results, isEditing, replace])

  const { displayFormContent, displayClose } = useDialog()

  const handleEdit = useCallback(() => setIsEditing(true), [])
  const handleCancel = useCallback(() => {
    setIsEditing(false)
    if (data?.results) {
      replace(data.results)
    } else {
      replace([])
    }
  }, [data, replace])

  const onSubmit = async (formData: PromotionFormValues) => {
    try {
      const items = formData.tbc_promotions

      for (const item of items) {
        // Clean empty string values to null for decimal fields
        const payload = { ...item }
        const decimalFields = [
          'pct_relationship',
          'pct_planning',
          'pct_packaging',
          'pct_sales_support',
          'pct_coordination',
        ]
        decimalFields.forEach((field) => {
          if ((payload as any)[field] === '') {
            ;(payload as any)[field] = null
          }
        })

        if (typeof item.id === 'number') {
          await updateTbcPromotion({ id: item.id, data: payload })
        } else {
          const { id, ...createPayload } = payload
          await createTbcPromotion(createPayload)
        }
      }

      const currentIds = items.map((i) => i.id).filter((id) => typeof id === 'number') as number[]
      const existingIds = data?.results?.map((i: any) => i.id) || []
      const idsToDelete = existingIds.filter((id: number) => !currentIds.includes(id))

      for (const id of idsToDelete) {
        await deleteTbcPromotion(id)
      }

      toastService.success('Cập nhật hoa hồng Xúc tiến thành công')
      setIsEditing(false)
      refetch()
    } catch (error) {
      console.error(error)
      toastService.error('Có lỗi xảy ra khi cập nhật hoa hồng. Vui lòng thử lại.')
    }
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
              const updatedRow = {
                ...fields[index],
                effective_from: formatDateToApi(range.from),
                effective_to: range.to ? formatDateToApi(range.to) : null,
              }
              update(index, updatedRow)
              displayClose()
            }
          }}
        />
      ),
    })
  }

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex h-32 items-center justify-center">
          <div className="text-gray-500">Đang tải biểu phí...</div>
        </div>
      )
    }

    return (
      <div className="border-border-1 relative w-full overflow-hidden border shadow-sm">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle outline-none">
            <Table.Root className="w-full border-collapse text-left outline-none">
              <Table.Header className="border-border-1 border-b bg-[#F0F2F5]">
                <Table.Row>
                  <Table.ColumnHeaderCell
                    className="typo-body-base-medium border-border-1 border-r px-3 py-3 text-center align-middle"
                    style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}
                  >
                    STT
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="border-border-1 typo-body-base-medium min-w-[220px] border-r px-4 py-3 align-middle font-medium text-[#4B4B4B]">
                    Hạng mục
                  </Table.ColumnHeaderCell>
                  {fields.map((period: any, i: number) => (
                    <Table.ColumnHeaderCell
                      key={period.id || i}
                      className="typo-body-base-medium border-border-1 min-w-[200px] border-r px-3 py-3 text-center align-middle"
                    >
                      <div className="flex items-center justify-between px-2">
                        <span className="typo-body-base-medium font-medium text-[#4B4B4B]">
                          {period.effective_from && formatDate(period.effective_from)}
                          {' - '}
                          {period.effective_to ? formatDate(period.effective_to) : 'Nay'}
                        </span>
                        {isEditing && (
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="text"
                                iconOnly
                                className="text-content-dark-1 hover:text-content-dark-1/80 h-8 w-8 p-1.5"
                              >
                                <MoreVertical className="h-5 w-5" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="end"
                              side="bottom"
                              className="min-w-[150px] rounded-[3px] border-none bg-white p-2 shadow-lg"
                            >
                              <div className="flex flex-col">
                                <Button
                                  type="button"
                                  variant="text"
                                  className="hover:bg-background-3 flex w-full justify-start px-3 py-2 text-left transition-colors"
                                  onClick={() => handleEditPeriod(i)}
                                  leftIcon={<IconPencil className="h-4 w-4" />}
                                >
                                  <span className="text-sm font-normal">Chỉnh sửa</span>
                                </Button>
                                <Button
                                  type="button"
                                  variant="text"
                                  className="hover:bg-background-3 flex w-full justify-start px-3 py-2 text-left tracking-normal text-red-500 transition-colors"
                                  onClick={() => remove(i)}
                                  leftIcon={<IconTrash className="h-4 w-4 text-red-500" />}
                                >
                                  <span className="text-sm font-normal">Xoá</span>
                                </Button>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )}
                      </div>
                    </Table.ColumnHeaderCell>
                  ))}
                  {/* No "+" add period column — commission_recipient does not support adding new time periods */}
                  {isEditing && (
                    <Table.ColumnHeaderCell className="typo-body-base-medium border-border-1 max-w-[40px] min-w-[40px] border-r bg-[#F0F2F5] px-0 py-3 text-center align-middle" />
                  )}
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {roles.map((role, rowIdx) => (
                  <Table.Row
                    key={role.key}
                    className="border-border-1 hover:bg-surface-primary-hover border-b transition-colors last:border-b-0"
                  >
                    <Table.Cell className="border-border-1 border-r px-3 py-3 text-center align-middle text-gray-700">
                      {rowIdx + 1}
                    </Table.Cell>
                    <Table.Cell className="border-border-1 border-r px-4 py-3 align-middle font-medium text-gray-700">
                      {role.label}
                    </Table.Cell>
                    {fields.map((field, colIdx) => (
                      <Table.Cell
                        key={`${role.key}-${field.id || colIdx}`}
                        className="border-border-1 h-full border-r bg-white !p-0 align-top"
                      >
                        {isEditing ? (
                          <Controller
                            control={control}
                            name={`tbc_promotions.${colIdx}.${role.pct}` as any}
                            render={({ field: controllerField }) => (
                              <FullCellNumberInput
                                value={controllerField.value as number | undefined}
                                onChange={controllerField.onChange}
                                placeholder="0"
                              />
                            )}
                          />
                        ) : (
                          <div className="flex h-full min-h-[52px] items-center justify-end px-3 py-3">
                            <span className="font-semibold text-[#E5202B]">
                              {field[role.pct as keyof typeof field] !== null &&
                              field[role.pct as keyof typeof field] !== undefined
                                ? formatPercent(field[role.pct as keyof typeof field])
                                : '-'}
                            </span>
                          </div>
                        )}
                      </Table.Cell>
                    ))}
                    {isEditing && (
                      <Table.Cell className="border-border-1 max-w-[40px] min-w-[40px] border-r bg-[#F0F2F5] px-3 py-3 align-middle" />
                    )}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit(onSubmit)}>
        <Flex justify="end" align="center" className="mb-4">
          {!isReadOnly && (
            <Flex gap="3">
              {!isEditing && (
                <Button
                  onClick={handleEdit}
                  variant="secondary-border"
                  size="medium"
                  leftIcon={<PenSquare className="h-4 w-4" />}
                  className="min-w-[100px]"
                >
                  Chỉnh sửa
                </Button>
              )}
              {isEditing && (
                <>
                  <Button
                    type="button"
                    variant="secondary"
                    size="medium"
                    onClick={handleCancel}
                    leftIcon={<X className="h-4 w-4" />}
                    disabled={isSubmitting}
                    className="min-w-[100px]"
                  >
                    Hủy
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="medium"
                    loading={isSubmitting}
                    className="min-w-[100px]"
                  >
                    Lưu
                  </Button>
                </>
              )}
            </Flex>
          )}
        </Flex>

        {renderContent()}
      </form>
    </div>
  )
}

import { TbcSource } from '@/features/project/sale-allocations/types/product'
import React, { useState } from 'react'
import { useFormContext, useWatch, useFieldArray, Controller } from 'react-hook-form'
import { Table } from '@radix-ui/themes'
import { Button, Checkbox } from '@/components/ui'
import { IconPencil, IconTrash, IconPlus } from '@/assets/icons'
import { FullCellNumberInput } from '@/components/commons'
import { formatDateToApi, formatDate } from '@/utils/date-utils'
import { TimePeriodDialog, TimePeriodDialogRef } from './TimePeriodDialog'
import { useDialog } from '@/hooks/useDialog'
import { toast } from 'react-toastify'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { MoreVertical, Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const VatCheckboxToggle = ({
  name,
  vatField,
  isReadOnly,
}: {
  name: string
  vatField: string
  isReadOnly?: boolean
}) => {
  const { control, setValue } = useFormContext()
  const items = useWatch({ control, name }) || []

  const isChecked = items.length > 0 ? items.every((i: any) => i[vatField] !== false) : true

  const handleChange = (checked: boolean | 'indeterminate') => {
    const val = !!checked
    items.forEach((_: any, idx: number) => {
      setValue(`${name}.${idx}.${vatField}`, val, { shouldDirty: true, shouldValidate: true })
    })
  }

  return (
    <label className="mt-1.5 flex w-fit cursor-pointer items-center gap-2">
      <Checkbox
        checked={isChecked}
        onCheckedChange={handleChange}
        disabled={isReadOnly || items.length === 0}
        className="h-4 w-4 rounded border-gray-300"
      />
      <span className="text-sm font-normal text-gray-500">Bao gồm VAT</span>
    </label>
  )
}

interface CategoryOption {
  value: string
  label: string
  hasVatToggle?: string
}

type DynamicTimeBoundCommissionTableProps = {
  name: string
  categories: CategoryOption[]
  isReadOnly?: boolean
}

export const DynamicTimeBoundCommissionTable: React.FC<DynamicTimeBoundCommissionTableProps> = ({
  name,
  categories,
  isReadOnly = true,
}) => {
  const { control } = useFormContext()
  const { append, remove, update } = useFieldArray({ control, name })
  const watchedItemsRaw = useWatch({ control, name })
  const watchedItems = Array.isArray(watchedItemsRaw) ? watchedItemsRaw : []
  const { displayFormContent, displayClose } = useDialog()

  const handleApplyPeriod = (range: { from: Date; to: Date; percentage?: number }) => {
    const nFrom = range.from.getTime()
    const nTo = range.to ? range.to.getTime() : Infinity

    const isOverlap = watchedItems.some((period) => {
      if (!period.effective_from) return false

      const iFrom = new Date(period.effective_from).getTime()
      const iTo = period.effective_to ? new Date(period.effective_to).getTime() : Infinity

      return Math.max(iFrom, nFrom) < Math.min(iTo, nTo)
    })

    if (isOverlap) {
      toast.error('Khoảng thời gian này bị trùng lặp với khoảng thời gian đã có')
      return false
    }

    const newRow: any = {
      effective_from: formatDateToApi(range.from),
      effective_to: range.to ? formatDateToApi(range.to) : null,
    }

    categories.forEach((cat) => {
      newRow[`pct_${cat.value}`] = range.percentage || null
      newRow[`amt_${cat.value}`] = null

      if (cat.hasVatToggle) {
        const lastItem = watchedItems[watchedItems.length - 1]
        newRow[cat.hasVatToggle] =
          lastItem && lastItem[cat.hasVatToggle] != null ? lastItem[cat.hasVatToggle] : true
      }
    })

    append(newRow)
    return true
  }

  const handleUpdatePeriod = (index: number, range: { from: Date; to: Date }) => {
    const nFrom = range.from.getTime()
    const nTo = range.to ? range.to.getTime() : Infinity

    const isOverlap = watchedItems.some((period, i) => {
      if (i === index) return false
      if (!period.effective_from) return false

      const iFrom = new Date(period.effective_from).getTime()
      const iTo = period.effective_to ? new Date(period.effective_to).getTime() : Infinity

      return Math.max(iFrom, nFrom) < Math.min(iTo, nTo)
    })

    if (isOverlap) {
      toast.error('Khoảng thời gian này bị trùng lặp với khoảng thời gian đã có')
      return false
    }

    const updatedRow = { ...watchedItems[index] }
    updatedRow.effective_from = formatDateToApi(range.from)
    updatedRow.effective_to = range.to ? formatDateToApi(range.to) : null

    update(index, updatedRow)
    return true
  }

  const handleEditPeriod = (index: number) => {
    const period = watchedItems[index]
    if (!period) return
    const dialogRef = React.createRef<TimePeriodDialogRef>()

    displayFormContent({
      title: 'Chỉnh sửa khoảng thời gian',
      confirmText: 'Cập nhật',
      onConfirm: async () => {
        const isValid = dialogRef.current?.submit()
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
          onApply={(range) => {
            if (handleUpdatePeriod(index, range)) {
              displayClose()
            }
          }}
        />
      ),
    })
  }

  const handleOpenPeriodDialog = () => {
    const dialogRef = React.createRef<TimePeriodDialogRef>()
    displayFormContent({
      title: 'Thêm khoảng thời gian',
      confirmText: 'Thêm mới',
      onConfirm: async () => {
        const isValid = dialogRef.current?.submit()
        if (!isValid) throw { isValidationError: true }
      },
      content: (
        <TimePeriodDialog
          ref={dialogRef}
          onApply={(range) => {
            if (handleApplyPeriod(range)) {
              displayClose()
            }
          }}
        />
      ),
    })
  }

  const handleRemovePeriod = (index: number) => {
    if (isReadOnly) return
    remove(index)
  }

  return (
    <div className="border-border-1 relative mt-4 w-full overflow-hidden border shadow-sm">
      <div className="overflow-x-auto">
        <Table.Root className="w-full min-w-[1000px] border-collapse bg-white">
          <Table.Header className="border-border-1 border-b bg-[#F0F2F5]">
            <Table.Row>
              <Table.ColumnHeaderCell
                className="typo-body-base-medium border-border-1 border-r px-3 py-3 text-center align-middle"
                style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}
              >
                STT
              </Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell className="typo-body-base-medium border-border-1 min-w-[200px] border-r px-4 py-3 align-middle">
                Hạng mục
              </Table.ColumnHeaderCell>
              {watchedItems.map((period, i) => (
                <Table.ColumnHeaderCell
                  key={i}
                  className="typo-body-base-medium border-border-1 min-w-[200px] border-r px-3 py-3 text-center align-middle"
                >
                  <div className="flex items-center justify-between px-2">
                    <span>
                      {period.effective_from && formatDate(period.effective_from)} -{' '}
                      {period.effective_to ? formatDate(period.effective_to) : 'Nay'}
                    </span>
                    {!isReadOnly && (
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
                              onClick={() => handleRemovePeriod(i)}
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
              {!isReadOnly && (
                <Table.ColumnHeaderCell className="typo-body-base-medium border-border-1 max-w-[40px] min-w-[40px] border-r px-3 py-3 text-center align-middle">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleOpenPeriodDialog}
                    className="bg-neutral-30 mx-auto h-9 w-9 p-2.5"
                    title="Thêm khoảng thời gian"
                  >
                    <IconPlus className="h-4 w-4" />
                  </Button>
                </Table.ColumnHeaderCell>
              )}
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {categories.map((cat, rowIdx) => (
              <Table.Row
                key={cat.value}
                className="border-border-1 hover:bg-surface-primary-hover border-b transition-colors last:border-b-0"
              >
                <Table.Cell className="border-border-1 border-r px-2 py-2 text-center align-middle">
                  {rowIdx + 1}
                </Table.Cell>
                <Table.Cell className="border-border-1 typo-body-base-regular text-content-dark-1 border-r px-4 py-2 align-middle">
                  <div className="flex flex-col gap-0.5">
                    <span>{cat.label}</span>
                    {cat.hasVatToggle && (
                      <VatCheckboxToggle
                        name={name}
                        vatField={cat.hasVatToggle}
                        isReadOnly={isReadOnly}
                      />
                    )}
                  </div>
                </Table.Cell>
                {watchedItems.map((_, colIdx) => (
                  <Table.Cell
                    key={colIdx}
                    className="border-border-1 typo-body-base-regular h-full border-r bg-white !p-0 align-top"
                  >
                    <CommissionValueCell
                      name={name}
                      index={colIdx}
                      category={cat.value}
                      isReadOnly={isReadOnly}
                      initialAmtValue={watchedItems[colIdx]?.[`amt_${cat.value}`]}
                    />
                  </Table.Cell>
                ))}
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </div>
    </div>
  )
}

const CommissionValueCell = ({
  name,
  index,
  category,
  isReadOnly,
  initialAmtValue,
}: {
  name: string
  index: number
  category: string
  isReadOnly: boolean
  initialAmtValue?: any
}) => {
  const { control, setValue } = useFormContext()
  const [isToggled, setIsToggled] = useState(() => {
    return initialAmtValue !== null && initialAmtValue !== undefined && initialAmtValue !== ''
  })

  const pctField = `${name}.${index}.pct_${category}`
  const amtField = `${name}.${index}.amt_${category}`
  const saPctField = `${name}.${index}.sa_pct_${category}`
  const saAmtField = `${name}.${index}.sa_amt_${category}`

  const handleToggle = () => {
    if (isToggled) {
      setValue(amtField, null, { shouldDirty: true, shouldValidate: true })
    } else {
      setValue(pctField, null, { shouldDirty: true, shouldValidate: true })
    }
    setIsToggled(!isToggled)
  }

  const tbcSource = useWatch({ control, name: `${name}.${index}.tbc_source` })
  const saPctValue = useWatch({ control, name: saPctField })
  const saAmtValue = useWatch({ control, name: saAmtField })
  const currentPctValue = useWatch({ control, name: pctField })
  const currentAmtValue = useWatch({ control, name: amtField })

  const isSaRow = tbcSource === TbcSource.SA

  // Determine if we have a SA reference value that differs from current
  const saRefValue = isToggled ? saAmtValue : saPctValue
  const currentValue = isToggled ? currentAmtValue : currentPctValue
  const hasSaRef =
    saRefValue != null && saRefValue !== '' && String(saRefValue) !== String(currentValue || '')

  const formatDisplayValue = (val: any, suffix: string) => {
    if (val == null || val === '') return null
    return `${val}${suffix}`
  }

  const saDisplayValue = formatDisplayValue(saRefValue, isToggled ? ' VNĐ' : '%')

  return (
    <div className="hover:ring-neutral-80 relative flex h-full w-full min-w-[150px] items-center transition-colors ring-inset focus-within:ring-1 focus-within:ring-neutral-100 hover:ring-1">
      {/* SA reference value - shown on the left when SA value differs */}
      {hasSaRef && isReadOnly && (
        <div className="flex shrink-0 items-center gap-1 pl-3">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 shrink-0 cursor-pointer text-[#8C8C8C]" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Giá trị trong thông tin bán hàng</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <span className="typo-body-small-regular whitespace-nowrap text-[#8C8C8C]">
            {saDisplayValue}
          </span>
        </div>
      )}
      {/* SA indicator for inherited rows without override */}
      {isSaRow && !hasSaRef && isReadOnly && (
        <div className="absolute left-2 z-10 flex cursor-default items-center gap-1">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 cursor-pointer text-[#8C8C8C]" />
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Giá trị trong thông tin bán hàng</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      <Controller
        name={isToggled ? amtField : pctField}
        control={control}
        render={({ field }) => (
          <FullCellNumberInput
            value={field.value}
            onChange={field.onChange}
            disabled={isReadOnly}
            variant="ghost"
            suffix={isReadOnly ? (isToggled ? 'VNĐ' : '%') : ''}
            max={isToggled ? Number.MAX_SAFE_INTEGER : 100}
            className={`rounded-none border-none text-right shadow-none hover:ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 ${
              isReadOnly ? (isToggled ? 'pr-12' : 'pr-8') : 'pr-3'
            } ${isSaRow && !hasSaRef ? 'pl-8' : ''}`}
            placeholder="0"
          />
        )}
      />
      {!isReadOnly && (
        <button
          type="button"
          tabIndex={-1}
          onClick={handleToggle}
          className="typo-body-base-regular ml-1 cursor-pointer border-l pr-2 pl-2 text-blue-500 hover:text-blue-700 focus:outline-none"
        >
          {isToggled ? 'VNĐ' : '%'}
        </button>
      )}
    </div>
  )
}

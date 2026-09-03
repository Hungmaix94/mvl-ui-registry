import React, { useMemo, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import { Table } from '@radix-ui/themes'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { Button } from '@/components/ui'
import { resolveRecipientOrgFields } from '@/features/project/shared/utils/resolveRecipientOrgFields'
import { formatNumber } from '@/utils/common'
import {
  useForm,
  useFieldArray,
  useWatch,
  Controller,
  FormProvider,
  useFormContext,
} from 'react-hook-form'
import { IconPencil, IconTrash, IconPlus } from '@/assets/icons'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { FullCellNumberInput } from '@/components/commons'
import AddContributorDialog, {
  type ContributorDialogValues,
} from '@/features/project/sale-allocations/components/AddContributorDialog'
import { useDepartmentsDropdown } from '@/features/org/services/department-service'
import { usePositionsDropdown } from '@/features/org/services/position-service'
import { useBranchesDropdown } from '@/features/org/services/branch-service'
import { useBlocksDropdown } from '@/features/org/services/block-service'
import { Info } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker'
import FormController from '@/components/ui/form/FormController'
import { isBefore, parse } from 'date-fns'
import { scrollToFirstError } from '@/utils/form-utils'
import { formatDateToApi } from '@/utils/date-utils'

// ─── helpers ──────────────────────────────────────────────────────────────────

const calculateActual = (
  approved: number | string | null | undefined,
  contribution: number | string | null | undefined
) => {
  const a = Number(approved) || 0
  const c = Number(contribution) || 0
  if (a === 0 || c === 0) return '0.00'
  return ((a * c) / 100).toFixed(2)
}

/** Fixed display order for TBC recipient group rows */
const PCT_TYPE_ORDER = [
  'pct_relationship',
  'pct_planning',
  'pct_packaging',
  'pct_sales_support',
  'pct_coordination',
] as const

const sortPctTypeOptions = (options: { value: unknown; label: string }[]) =>
  [...options].sort((a, b) => {
    const ai = PCT_TYPE_ORDER.indexOf(String(a.value) as (typeof PCT_TYPE_ORDER)[number])
    const bi = PCT_TYPE_ORDER.indexOf(String(b.value) as (typeof PCT_TYPE_ORDER)[number])
    const an = ai === -1 ? Infinity : ai
    const bn = bi === -1 ? Infinity : bi
    return an - bn
  })

// ─── schema ───────────────────────────────────────────────────────────────────

const contributorSchema = z.object({
  id: z.number().optional(),
  contribution_level: z.string().or(z.number()).nullish(),
  actual_rate: z.string().or(z.number()).nullish(),
  branch_id: z.number().nullable().optional(),
  branch_name: z.string().optional(),
  block_id: z.number().nullable().optional(),
  block_name: z.string().optional(),
  department: z.number().nullable().optional(),
  department_name: z.string().optional(),
  position: z.number().nullable().optional(),
  position_name: z.string().optional(),
  employee: z.number().nullable().optional(),
  employee_name: z.string().optional(),
})

const recipientGroupSchema = z.object({
  pct_type: z.string(),
  recipients: z.array(contributorSchema),
})

const formSchema = z
  .object({
    id: z.number().optional(),
    effective_from: z.string({ required_error: 'Vui lòng chọn ngày hiệu lực' }),
    effective_to: z.string().optional(),
    pct_relationship: z.string().or(z.number()).nullish(),
    pct_planning: z.string().or(z.number()).nullish(),
    pct_packaging: z.string().or(z.number()).nullish(),
    pct_sales_support: z.string().or(z.number()).nullish(),
    pct_coordination: z.string().or(z.number()).nullish(),
    sa_pct_relationship: z.string().or(z.number()).nullish(),
    sa_pct_planning: z.string().or(z.number()).nullish(),
    sa_pct_packaging: z.string().or(z.number()).nullish(),
    sa_pct_sales_support: z.string().or(z.number()).nullish(),
    sa_pct_coordination: z.string().or(z.number()).nullish(),
    groups: z.array(recipientGroupSchema),
  })
  .refine(
    (data) => {
      if (data.effective_from && data.effective_to) {
        const from = parse(data.effective_from, 'dd/MM/yyyy', new Date())
        const to = parse(data.effective_to, 'dd/MM/yyyy', new Date())
        return !isBefore(to, from)
      }
      return true
    },
    {
      message: 'Ngày kết thúc không được nhỏ hơn ngày hiệu lực',
      path: ['effective_to'],
    }
  )

export type TbcRecipientFormValues = z.infer<typeof formSchema>

const formatDepartmentDisplay = (
  item: any,
  deptOptions: { value: string | number; label: string }[] = [],
  posOptions: { value: string | number; label: string }[] = [],
  branchOptions: { value: string | number; label: string }[] = [],
  blockOptions: { value: string | number; label: string }[] = []
) => {
  const deptName =
    item?.department_name ||
    deptOptions.find((o) => String(o.value) === String(item?.department))?.label
  const branchName =
    item?.branch_name || branchOptions.find((o) => String(o.value) === String(item?.branch))?.label
  const blockName =
    item?.block_name || blockOptions.find((o) => String(o.value) === String(item?.block))?.label

  const orgName =
    deptName || blockName || branchName || (item?.department ? `Bộ phận #${item.department}` : null)

  const pName =
    item?.position_name || posOptions.find((o) => String(o.value) === String(item?.position))?.label
  const posName = pName || null

  const parts = []
  if (orgName) parts.push(orgName)
  if (posName) parts.push(posName)

  return parts.length > 0 ? parts.join(' - ') : '—'
}

type TableRowGroupProps = {
  mechIndex: number
  isEditing: boolean
  departmentOptions: any[]
  positionOptions: any[]
  branchOptions: any[]
  blockOptions: any[]
}

const TableRowGroup = ({
  mechIndex,
  isEditing,
  departmentOptions,
  positionOptions,
  branchOptions,
  blockOptions,
}: TableRowGroupProps) => {
  const { control } = useFormContext<TbcRecipientFormValues>()
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [editIndex, setEditIndex] = useState<number | null>(null)

  const {
    fields: contributors,
    append,
    remove,
    update,
  } = useFieldArray({
    control,
    name: `groups.${mechIndex}.recipients`,
  })

  const watchedPctType = useWatch({
    control,
    name: `groups.${mechIndex}.pct_type`,
  })

  const approvedRevenue = useWatch({
    control,
    name: watchedPctType as any,
  })

  const saFieldName = watchedPctType ? `sa_${watchedPctType}` : undefined
  const saApprovedRevenue = useWatch({
    control,
    name: (saFieldName || '') as keyof TbcRecipientFormValues,
  })

  const watchedContributors = useWatch({
    control,
    name: `groups.${mechIndex}.recipients`,
  })

  const rowSpan = Math.max(1, contributors.length)

  const { keysMapOptions: pctKeysMap } = useAppConstant({
    module: 'realestate',
    keys: [APP_CONSTANT_KEY.REALESTATE.TBC_PROMOTION_RECIPIENT_PCT_TYPE_CHOICES],
  })
  const pctTypeOptions = sortPctTypeOptions(
    pctKeysMap.get(APP_CONSTANT_KEY.REALESTATE.TBC_PROMOTION_RECIPIENT_PCT_TYPE_CHOICES) ?? []
  )

  const pctTypeLabel = useMemo(
    () => pctTypeOptions.find((o) => o.value === watchedPctType)?.label ?? watchedPctType ?? '—',
    [watchedPctType, pctTypeOptions]
  )

  const { setValue } = useFormContext<TbcRecipientFormValues>()
  const handleAddDept = (values: ContributorDialogValues) => {
    append({
      contribution_level: values.contribution_level,
      actual_rate: values.actual_rate,
      branch_id: values.branch_id,
      branch_name: values.branch_name,
      block_id: values.block_id,
      block_name: values.block_name,
      department: values.department_id,
      department_name: values.department_name,
      position: values.position_id,
      position_name: values.position_name,
      employee: values.employee_id,
      employee_name: values.employee_name,
    })

    if (values.inhouse_rate !== undefined && values.inhouse_rate !== '') {
      setValue(watchedPctType as any, Number(values.inhouse_rate), { shouldDirty: true })
    }
    setAddDialogOpen(false)
  }

  const handleEditDept = (values: ContributorDialogValues) => {
    if (editIndex != null) {
      const current = watchedContributors?.[editIndex]
      update(editIndex, {
        ...current,
        branch_id: values.branch_id,
        branch_name: values.branch_name,
        block_id: values.block_id,
        block_name: values.block_name,
        department: values.department_id,
        department_name: values.department_name,
        position: values.position_id,
        position_name: values.position_name,
        employee: values.employee_id,
        employee_name: values.employee_name,
        contribution_level: values.contribution_level,
        actual_rate: values.actual_rate,
      })

      if (values.inhouse_rate !== undefined && values.inhouse_rate !== '') {
        setValue(watchedPctType as any, Number(values.inhouse_rate), { shouldDirty: true })
      }
      setEditIndex(null)
    }
  }

  const editContributor = editIndex != null ? watchedContributors?.[editIndex] : null

  return (
    <>
      <AddContributorDialog
        open={addDialogOpen}
        title="Thêm bộ phận đóng góp"
        approvedRevenue={approvedRevenue as number | null | undefined}
        onClose={() => setAddDialogOpen(false)}
        onConfirm={handleAddDept}
      />
      <AddContributorDialog
        open={editIndex != null}
        title="Chỉnh sửa bộ phận đóng góp"
        approvedRevenue={approvedRevenue as number | null | undefined}
        initialValues={
          editIndex != null
            ? {
                branch_id: editContributor?.branch_id,
                branch_name: editContributor?.branch_name,
                block_id: editContributor?.block_id,
                block_name: editContributor?.block_name,
                department_id: editContributor?.department,
                department_name: editContributor?.department_name,
                position_id: editContributor?.position,
                position_name: editContributor?.position_name,
                employee_id: editContributor?.employee,
                employee_name: editContributor?.employee_name,
                contribution_level:
                  editContributor?.contribution_level != null &&
                  String(editContributor.contribution_level) !== '0'
                    ? String(editContributor.contribution_level)
                    : '',
                actual_rate:
                  editContributor?.actual_rate != null &&
                  String(editContributor.actual_rate) !== '0'
                    ? String(editContributor.actual_rate)
                    : calculateActual(approvedRevenue, editContributor?.contribution_level),
              }
            : undefined
        }
        onClose={() => setEditIndex(null)}
        onConfirm={handleEditDept}
      />
      {(contributors.length > 0 ? contributors : [{ id: `empty-${mechIndex}` } as any]).map(
        (contributor, cIndex) => {
          const item = watchedContributors?.[cIndex] || {}
          const actualPct = calculateActual(approvedRevenue, item.contribution_level)

          return (
            <Table.Row
              key={contributor.id || cIndex}
              className="border-border-1 hover:bg-surface-primary-hover border-b bg-white transition-colors last:border-b-0"
            >
              {cIndex === 0 && (
                <Table.Cell
                  rowSpan={rowSpan}
                  className="border-border-1 border-r bg-white px-2 py-2 text-center align-middle"
                  style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}
                >
                  {isEditing && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setAddDialogOpen(true)}
                      className="bg-neutral-30 mx-auto h-9 w-9 p-2.5"
                      title="Thêm phòng ban đóng góp"
                    >
                      <IconPlus className="h-4 w-4" />
                    </Button>
                  )}
                </Table.Cell>
              )}
              {cIndex === 0 && (
                <Table.Cell
                  rowSpan={rowSpan}
                  className="border-border-1 typo-body-base-medium border-r bg-white px-4 py-3 align-middle font-medium text-gray-700"
                  style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }}
                >
                  <div className="flex flex-col gap-1">
                    <span>{pctTypeLabel}</span>
                  </div>
                </Table.Cell>
              )}
              {cIndex === 0 && (
                <Table.Cell
                  rowSpan={rowSpan}
                  className="border-border-1 h-full border-r bg-white !p-0 align-middle"
                  style={{ width: '150px' }}
                >
                  {isEditing ? (
                    <Controller
                      control={control}
                      name={watchedPctType as any}
                      render={({ field }) => (
                        <FullCellNumberInput
                          ref={field.ref}
                          name={field.name}
                          value={field.value ?? ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            field.onChange(e.target.value !== '' ? e.target.value : null)
                          }
                          placeholder="0.00"
                          min={0}
                          max={100}
                        />
                      )}
                    />
                  ) : (
                    <div className="flex h-full min-h-[48px] items-center px-3">
                      {saApprovedRevenue != null &&
                        saApprovedRevenue !== '' &&
                        String(saApprovedRevenue) !== String(approvedRevenue || '') && (
                          <div className="flex shrink-0 items-center gap-1">
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
                              {formatNumber(saApprovedRevenue as string | number, { maximumFractionDigits: 2 })}%
                            </span>
                          </div>
                        )}
                      <div className="flex-1 text-right font-semibold text-[#E5202B]">
                        {approvedRevenue != null ? `${formatNumber(approvedRevenue, { maximumFractionDigits: 2 })}%` : '—'}
                      </div>
                    </div>
                  )}
                </Table.Cell>
              )}
              <Table.Cell
                className="border-border-1 h-full border-r !p-0 align-middle"
                style={{ width: '150px' }}
              >
                {isEditing ? (
                  <Controller
                    control={control}
                    name={`groups.${mechIndex}.recipients.${cIndex}.contribution_level`}
                    render={({ field }) => (
                      <FullCellNumberInput
                        ref={field.ref}
                        name={field.name}
                        value={field.value ?? ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          field.onChange(e.target.value !== '' ? e.target.value : null)
                        }
                        placeholder="0.00"
                        min={0}
                        max={100}
                      />
                    )}
                  />
                ) : (
                  <div className="flex h-full min-h-[44px] items-center justify-end px-3">
                    {item.contribution_level != null ? `${formatNumber(item.contribution_level, { maximumFractionDigits: 2 })}%` : '—'}
                  </div>
                )}
              </Table.Cell>
              <Table.Cell
                className="border-border-1 h-full border-r !p-0 align-middle"
                style={{ width: '150px' }}
              >
                <div className="flex h-full min-h-[44px] items-center justify-end px-3 font-semibold text-[#E5202B]">
                  {formatNumber(actualPct, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                </div>
              </Table.Cell>
              <Table.Cell className="border-border-1 border-r px-4 py-3 align-middle">
                <span className="typo-body-base-regular text-content-dark-1">
                  {formatDepartmentDisplay(
                    item,
                    departmentOptions,
                    positionOptions,
                    branchOptions,
                    blockOptions
                  )}
                </span>
              </Table.Cell>
              <Table.Cell className="px-2 py-2 text-center align-middle" style={{ width: '90px' }}>
                {isEditing && (
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setEditIndex(cIndex)}
                      className="bg-neutral-30 h-9 w-9 p-2.5"
                      title="Chỉnh sửa bộ phận"
                    >
                      <IconPencil className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => remove(cIndex)}
                      className="bg-neutral-30 text-data-red-default hover:text-data-red-hover h-9 w-9 p-2.5"
                      title="Xóa dòng này"
                    >
                      <IconTrash className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </Table.Cell>
            </Table.Row>
          )
        }
      )}
    </>
  )
}

type InnerProps = {
  isEditing: boolean
  departmentOptions: { value: string | number; label: string }[]
  positionOptions: { value: string | number; label: string }[]
  branchOptions: { value: string | number; label: string }[]
  blockOptions: { value: string | number; label: string }[]
}

const CommissionRecipientTableInner = ({
  isEditing,
  departmentOptions,
  positionOptions,
  branchOptions,
  blockOptions,
}: InnerProps) => {
  const { watch } = useFormContext<TbcRecipientFormValues>()
  const { fields } = useFieldArray<TbcRecipientFormValues, 'groups'>({
    name: 'groups',
  })

  const watchedGroups = watch('groups')
  const watchedForm = watch()

  const totalActual = useMemo(() => {
    return ((watchedGroups as any) || [])
      .reduce((acc: number, mech: any) => {
        const approvedRevenue = (watchedForm as Record<string, any>)[mech.pct_type]
        const mechTotal = (mech?.recipients || []).reduce(
          (sum: number, c: any) =>
            sum + (Number(calculateActual(approvedRevenue, c.contribution_level)) || 0),
          0
        )
        return acc + mechTotal
      }, 0)
      .toFixed(2)
  }, [watchedGroups, watchedForm])

  return (
    <div className="border-border-1 relative w-full overflow-hidden border shadow-sm">
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full align-middle outline-none">
          <Table.Root className="w-full min-w-[900px] border-collapse bg-white outline-none">
            <Table.Header className="border-border-1 border-b bg-[#F0F2F5]">
              <Table.Row>
                <Table.ColumnHeaderCell
                  className="typo-body-base-medium border-border-1 border-r px-3 py-3 text-center align-middle"
                  style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}
                >
                  <span className="sr-only">Thêm</span>
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-medium border-r px-4 py-3 text-left align-middle font-medium text-[#4B4B4B]"
                  style={{ width: '180px', minWidth: '180px', maxWidth: '180px' }}
                >
                  Diễn giải
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-right align-middle font-medium text-[#4B4B4B]"
                  style={{ width: '150px' }}
                >
                  Tỷ lệ In-house (%)
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-right align-middle font-medium text-[#4B4B4B]"
                  style={{ width: '150px' }}
                >
                  Mức độ đóng góp (%)
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-right align-middle font-medium text-[#4B4B4B]"
                  style={{ width: '150px' }}
                >
                  Tỷ lệ thực tế (%)
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  className="border-border-1 typo-body-base-medium border-r px-3 py-3 text-left align-middle font-medium text-[#4B4B4B]"
                  style={{ minWidth: '180px' }}
                >
                  Bộ phận / Phòng ban
                </Table.ColumnHeaderCell>
                <Table.ColumnHeaderCell
                  style={{ width: '90px' }}
                  className="typo-body-base-medium border-border-1 border-r px-2 py-3 align-middle"
                >
                  <span className="sr-only">Hành động</span>
                </Table.ColumnHeaderCell>
              </Table.Row>
            </Table.Header>

            <Table.Body>
              {fields.map((field, index) => (
                <TableRowGroup
                  key={field.id}
                  mechIndex={index}
                  isEditing={isEditing}
                  departmentOptions={departmentOptions}
                  positionOptions={positionOptions}
                  branchOptions={branchOptions}
                  blockOptions={blockOptions}
                />
              ))}
            </Table.Body>

            <Table.Body>
              <Table.Row className="bg-[#F0F2F5]">
                <Table.Cell
                  colSpan={4}
                  className="border-border-1 typo-body-base-semibold border-t border-r px-4 py-3 text-right align-middle text-[#4B4B4B]"
                >
                  Tổng cộng
                </Table.Cell>
                <Table.Cell className="border-border-1 typo-body-base-semibold text-primary-default border-t border-r px-3 py-3 text-right align-middle">
                  {formatNumber(totalActual, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%
                </Table.Cell>
                <Table.Cell
                  colSpan={2}
                  className="border-border-1 border-t px-3 py-3 align-middle"
                />
              </Table.Row>
            </Table.Body>
          </Table.Root>
        </div>
      </div>
    </div>
  )
}

export type TbcRecipientFormRef = {
  handleSubmit: (onSubmit: (data: any) => void) => () => void
  reset: (data: any) => void
}

export type SaleAllocationTbcRecipientFormProps = {
  initialValues?: Partial<TbcRecipientFormValues>
  isReadOnly?: boolean
}

export const SaleAllocationTbcRecipientForm = forwardRef<
  TbcRecipientFormRef,
  SaleAllocationTbcRecipientFormProps
>(({ initialValues, isReadOnly = false }, ref) => {
  const { data: deptData } = useDepartmentsDropdown({ page_size: 1000 })
  const { data: posData } = usePositionsDropdown({ page_size: 1000 })
  const { data: branchData } = useBranchesDropdown({ page_size: 1000 })
  const { data: blockData } = useBlocksDropdown({ page_size: 1000 })

  const departmentOptions = useMemo(
    () =>
      deptData?.results?.map((d: any) => ({
        value: String(d.id),
        label: d.name,
      })) || [],
    [deptData]
  )

  const positionOptions = useMemo(
    () =>
      posData?.results?.map((p: any) => ({
        value: String(p.id),
        label: p.name,
      })) || [],
    [posData]
  )

  const branchOptions = useMemo(
    () =>
      branchData?.results?.map((b: any) => ({
        value: String(b.id),
        label: b.name,
      })) || [],
    [branchData]
  )

  const blockOptions = useMemo(
    () =>
      blockData?.results?.map((b: any) => ({
        value: String(b.id),
        label: b.name,
      })) || [],
    [blockData]
  )

  const { keysMapOptions: pctKeysMap } = useAppConstant({
    module: 'realestate',
    keys: [APP_CONSTANT_KEY.REALESTATE.TBC_PROMOTION_RECIPIENT_PCT_TYPE_CHOICES],
  })

  const pctTypeOptions = useMemo(
    () =>
      sortPctTypeOptions(
        pctKeysMap.get(APP_CONSTANT_KEY.REALESTATE.TBC_PROMOTION_RECIPIENT_PCT_TYPE_CHOICES) || []
      ),
    [pctKeysMap]
  )

  const methods = useForm<TbcRecipientFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialValues || { groups: [] },
  })

  const initialValuesString = JSON.stringify(initialValues)

  useEffect(() => {
    // Only map if we have the config loaded
    if (pctTypeOptions.length === 0) return

    if (initialValues) {
      let fetchedRecipients = (initialValues as any).recipients || []
      // We handle mapping `groups` back from `initialValues` which usually gives `recipients` directly.
      if (initialValues.groups) {
        methods.reset(initialValues)
      } else {
        const configuredGroups = pctTypeOptions.map((o) => ({
          pct_type: String(o.value),
          recipients: fetchedRecipients.filter((r: any) => r.pct_type === String(o.value)),
        }))
        methods.reset({ ...initialValues, groups: configuredGroups })
      }
    } else {
      const emptyGroups = pctTypeOptions.map((o) => ({
        pct_type: String(o.value),
        recipients: [],
      }))
      methods.reset({ groups: emptyGroups })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValuesString, methods, pctTypeOptions])

  useImperativeHandle(ref, () => ({
    handleSubmit: (onValid) =>
      methods.handleSubmit(
        (data) => {
          // flatten + sanitize recipients
          const allRecipients = (data.groups || []).flatMap((g) =>
            g.recipients
              .map((r: any) => {
                const {
                  id: rid,
                  branch_name,
                  block_name,
                  department_name,
                  position_name,
                  employee_name,
                  actual_rate,
                  branch_id,
                  block_id,
                  ...rest
                } = r

                const clean: any =
                  typeof rid === 'number'
                    ? { id: rid, pct_type: g.pct_type, contribution_level: rest.contribution_level }
                    : { pct_type: g.pct_type, contribution_level: rest.contribution_level }

                const rawBranch = rest.branch ?? branch_id ?? null
                const rawBlock = rest.block ?? block_id ?? null

                const orgFields = resolveRecipientOrgFields({
                  employee: rest.employee ?? null,
                  department: rest.department ?? null,
                  branch: rawBranch,
                  block: rawBlock,
                  position: rest.position ?? null,
                })

                return { ...clean, ...orgFields }
              })
              .filter(
                (r: any) =>
                  r.employee != null ||
                  r.department != null ||
                  r.branch != null ||
                  r.block != null ||
                  r.position != null
              )
          )

          const formattedFrom = data.effective_from
            ? formatDateToApi(parse(data.effective_from, 'dd/MM/yyyy', new Date()))
            : null
          const formattedTo = data.effective_to
            ? formatDateToApi(parse(data.effective_to, 'dd/MM/yyyy', new Date()))
            : null

          const payload = {
            effective_from: formattedFrom,
            effective_to: formattedTo,
            pct_relationship: data.pct_relationship,
            pct_planning: data.pct_planning,
            pct_packaging: data.pct_packaging,
            pct_sales_support: data.pct_sales_support,
            pct_coordination: data.pct_coordination,
            recipients: allRecipients,
          } as any
          onValid(payload)
        },
        (errors) => {
          console.log('FORM ERRORS:', errors)
          scrollToFirstError(errors)
        }
      ),
    reset: (data) => methods.reset(data),
  }))

  const watchedFromDate = methods.watch('effective_from')
  const disabledDaysForToDate = useMemo(() => {
    if (!watchedFromDate) return undefined
    try {
      const fromDate = parse(watchedFromDate, 'dd/MM/yyyy', new Date())
      if (isNaN(fromDate.getTime())) return undefined
      return { before: fromDate }
    } catch {
      return undefined
    }
  }, [watchedFromDate])

  return (
    <FormProvider {...methods}>
      <form className="flex flex-col gap-5">
        {!isReadOnly && (
          <div className="bg-surface-primary-default rounded-md">
            <div className="mb-4">
              <h3 className="text-text-primary-default text-lg font-semibold">
                Thông tin thời gian
              </h3>
            </div>
            <div className="grid w-full grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2">
              <FormController
                control={methods.control}
                register={methods.register}
                name="effective_from"
                Field={DatePicker as any}
                fieldProps={{
                  placeholder: 'dd/MM/yyyy',
                  label: 'Ngày bắt đầu hiệu lực',
                  required: true,
                  clearable: true,
                }}
              />
              <FormController
                control={methods.control}
                register={methods.register}
                name="effective_to"
                Field={DatePicker as any}
                fieldProps={{
                  placeholder: 'dd/MM/yyyy',
                  label: 'Ngày kết thúc hiệu lực',
                  disabledDays: disabledDaysForToDate,
                  clearable: true,
                }}
              />
            </div>
          </div>
        )}

        <div className="bg-surface-primary-default rounded-md">
          <CommissionRecipientTableInner
            isEditing={!isReadOnly}
            departmentOptions={departmentOptions}
            positionOptions={positionOptions}
            branchOptions={branchOptions}
            blockOptions={blockOptions}
          />
        </div>
      </form>
    </FormProvider>
  )
})

SaleAllocationTbcRecipientForm.displayName = 'SaleAllocationTbcRecipientForm'

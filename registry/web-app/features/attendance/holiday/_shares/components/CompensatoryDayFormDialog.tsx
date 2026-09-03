import { useCallback, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Flex } from '@radix-ui/themes'
import { format, parse } from 'date-fns'
import { Button, Checkbox, RadioGroup, TextArea } from '@/components/ui'
import { DatePicker } from '@/components/ui/calendar/date-single-picker/date-picker.tsx'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import type {
  CompensatoryWorkday,
  CompensatoryWorkdayRequest,
} from '@/features/attendance/services/holiday-service'
import { useDialog } from '@/hooks/useDialog.ts'
import { CompensatoryDateInputSession } from '@/api/schema.ts'
import { formatDateToApi } from '@/utils/date-utils.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import TreeSelect from '@/components/ui/tree-select/TreeSelect'
import { useDepartments } from '@/features/org/services/department-service'
import { TreeNodeData } from '@/components/ui/tree-select/types'
import { CheckedState } from '@radix-ui/react-checkbox'

const compensatoryDaySchema = z.object({
  date: z.string().min(1, 'Chưa chọn ngày'),
  for_date: z.string().nullable().optional(),
  session: z.nativeEnum(CompensatoryDateInputSession, {
    required_error: 'Chưa chọn buổi',
  }),
  notes: z.string().optional(),
  department_ids: z.array(z.number()).optional(),
  apply_to_all: z.boolean(),
})

interface CompensatoryDayFormValues {
  date: string
  for_date?: string | null
  session: CompensatoryDateInputSession
  notes?: string
  department_ids?: number[]
  apply_to_all: boolean
}

// Extend CompensatoryWorkday to include department_ids locally until API schema is updated
type ExtendedCompensatoryWorkday = CompensatoryWorkday & {
  department_ids?: number[]
}

interface CompensatoryDayFormDialogProps {
  initialData?: ExtendedCompensatoryWorkday
  onSubmit: (data: any, workdayId?: number) => Promise<void>
}

const CompensatoryDayFormDialog = ({ initialData, onSubmit }: CompensatoryDayFormDialogProps) => {
  const { displayClose } = useDialog()
  const isEditMode = useMemo(() => !!initialData, [initialData])

  // Get session options from app constants
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.COMPENSATORY_WORKDAY_SESSION],
  })
  const sessionOptions = keysMapOptions.get(APP_CONSTANT_KEY.HRM.COMPENSATORY_WORKDAY_SESSION) || []

  // Fetch all departments
  const { data: departmentData } = useDepartments({ page_size: 1000 })

  // Transform departments into Branch -> Block -> Department tree
  const treeData = useMemo<TreeNodeData[]>(() => {
    if (!departmentData?.results) return []

    const departments = departmentData.results

    // Structure: BranchId -> { branch, blocks: BlockId -> { block, depts: [] }, directDepts: [] }
    const branches = new Map<
      string | number,
      {
        id: string | number
        name: string
        blocks: Map<string | number, { id: string | number; name: string; depts: TreeNodeData[] }>
        directDepts: TreeNodeData[]
      }
    >()

    const OTHER_BRANCH_ID = 'other'

    departments.forEach((dept) => {
      // Ensure we have a valid department
      if (!dept || !dept.id) return

      const branchId = dept.branch?.id
      const branchName = dept.branch?.name
      const blockId = dept.block?.id
      const blockName = dept.block?.name

      // Determine Branch Key
      const safeBranchKey = branchId || OTHER_BRANCH_ID
      const safeBranchName = branchName || 'Khác'

      if (!branches.has(safeBranchKey)) {
        branches.set(safeBranchKey, {
          id: branchId ? `branch-${branchId}` : `branch-${OTHER_BRANCH_ID}`,
          name: safeBranchName,
          blocks: new Map(),
          directDepts: [],
        })
      }
      const branchById = branches.get(safeBranchKey)!

      const deptNode: TreeNodeData = {
        id: dept.id,
        name: dept.name,
        children: [], // LEAF NODE: Always empty
      }

      if (blockId) {
        // Has Block -> Add to Block
        if (!branchById.blocks.has(blockId)) {
          branchById.blocks.set(blockId, {
            id: `block-${blockId}`,
            name: blockName || `Block ${blockId}`,
            depts: [],
          })
        }
        const blockById = branchById.blocks.get(blockId)!

        // Prevent duplicates in block (paranoid check)
        if (!blockById.depts.some((d) => d.id === deptNode.id)) {
          blockById.depts.push(deptNode)
        }
      } else {
        // No Block -> Add directly to Branch
        if (!branchById.directDepts.some((d) => d.id === deptNode.id)) {
          branchById.directDepts.push(deptNode)
        }
      }
    })

    // Convert Maps to TreeNodeData array and sort
    const sortedBranches = Array.from(branches.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    )

    const finalTree = sortedBranches.map((branch) => {
      const blockNodes = Array.from(branch.blocks.values())
        .map((block) => ({
          id: block.id,
          name: block.name,
          children: block.depts.sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => a.name.localeCompare(b.name))

      const directDepts = branch.directDepts.sort((a, b) => a.name.localeCompare(b.name))

      const children = [...blockNodes, ...directDepts]

      return {
        id: branch.id,
        name: branch.name,
        children: children,
      }
    })

    return finalTree
  }, [departmentData])

  const defaultValues = useMemo<CompensatoryDayFormValues>(() => {
    const departments = initialData?.departments || []
    const deptIds = initialData?.department_ids || departments.map((d: any) => d.id)

    return {
      // initialData.date (from API) is in server format 'yyyy-MM-dd'; convert to display format 'dd/MM/yyyy'
      date: initialData?.date
        ? format(parse(initialData.date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')
        : '',
      for_date: initialData?.for_date
        ? format(parse(initialData.for_date, 'yyyy-MM-dd', new Date()), 'dd/MM/yyyy')
        : '',
      session: initialData?.session || CompensatoryDateInputSession.morning,
      notes: initialData?.notes || '',
      department_ids: deptIds,
      apply_to_all:
        initialData?.for_all_employees ?? (isEditMode ? departments.length === 0 : false),
    }
  }, [initialData, isEditMode])

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
    register,
    setValue,
    watch,
  } = useForm<CompensatoryDayFormValues>({
    resolver: zodResolver(compensatoryDaySchema),
    defaultValues,
  })

  const applyToAll = watch('apply_to_all')
  const departmentIds = watch('department_ids')

  const handleTreeSelectChange = useCallback(
    (ids: (string | number)[]) => {
      // Filter out branch/block IDs (strings) and keep only department IDs (numbers)
      const numericIds = ids.filter((id): id is number => typeof id === 'number')
      setValue('department_ids', numericIds, { shouldDirty: true })
    },
    [setValue]
  )

  const onFormSubmit = useCallback(
    async (data: CompensatoryDayFormValues) => {
      const formattedDate = formatDateToApi(data.date)
      const formattedForDate = data.for_date ? formatDateToApi(data.for_date) : null

      const payload: Omit<CompensatoryWorkdayRequest, 'department_ids'> & {
        department_ids?: number[]
      } = {
        date: formattedDate,
        for_date: formattedForDate,
        session: data.session,
        notes: data.notes,
        for_all_employees: data.apply_to_all,
        department_ids: data.apply_to_all ? [] : data.department_ids,
      }

      await onSubmit(payload, initialData?.id)
    },
    [onSubmit, initialData?.id]
  )

  return (
    <Form loading={isSubmitting} onSubmit={onFormSubmit} handleSubmit={handleSubmit}>
      <Flex direction="column" gap="5" className="w-full">
        <FormController
          register={register}
          name="date"
          control={control}
          Field={DatePicker as any}
          fieldProps={{
            label: 'Chọn ngày làm bù',
            required: true,
            placeholder: 'DD/MM/YYYY',
            disabled: isSubmitting,
          }}
        />

        <FormController
          register={register}
          name="for_date"
          control={control}
          Field={DatePicker as any}
          fieldProps={{
            label: 'Ngày nghỉ thêm',
            placeholder: 'DD/MM/YYYY',
            disabled: isSubmitting,
          }}
        />

        <FormController
          register={register}
          name="session"
          control={control}
          Field={RadioGroup as any}
          fieldProps={{
            id: 'session',
            label: 'Chọn buổi',
            required: true,
            options: sessionOptions,
            disabled: isSubmitting,
          }}
        />

        {/* Use raw TreeSelect controlled manuualy to handle ID filtering */}
        <div className="flex h-full w-full flex-col gap-3">
          <label className="typo-body-base-semibold text-content-dark-2 leading-none font-medium peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Đơn vị áp dụng
          </label>

          <FormController
            register={register}
            name="apply_to_all"
            control={control}
            Field={Checkbox as any}
            fieldProps={{
              label: 'Áp dụng cho toàn công ty',
              disabled: isSubmitting,
              checked: applyToAll,
              onCheckedChange: (checked: CheckedState) => {
                setValue('apply_to_all', !!checked, { shouldDirty: true })
                setValue('department_ids', [], { shouldDirty: true })
              },
            }}
          />

          {!applyToAll && (
            <TreeSelect
              data={treeData}
              value={departmentIds || []}
              onChange={handleTreeSelectChange}
              placeholder="Chọn đơn vị"
            />
          )}
        </div>

        <FormController
          register={register}
          name="notes"
          control={control}
          Field={TextArea as any}
          fieldProps={{
            label: 'Ghi chú',
            placeholder: 'Nhập ghi chú (không bắt buộc)',
            rows: 3,
            disabled: isSubmitting,
          }}
        />

        <Flex gap="3" justify="end" className="mt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={displayClose}
            disabled={isSubmitting}
            className="min-w-[100px]"
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting}
            loading={isSubmitting}
            className="min-w-[100px]"
          >
            {isEditMode ? 'Cập nhật' : 'Thêm'}
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}

export default CompensatoryDayFormDialog

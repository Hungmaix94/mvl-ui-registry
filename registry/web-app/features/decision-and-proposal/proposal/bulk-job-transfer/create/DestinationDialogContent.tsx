import { forwardRef, useCallback, useImperativeHandle, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button, Table, type ColumnDef } from '@/components/ui'
import { IconX } from '@/assets/icons'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { useBranchSelect } from '@/hooks/useBranchSelect.ts'
import { useBlockSelect } from '@/hooks/useBlockSelect.ts'
import { useDepartmentSelect } from '@/hooks/useDepartmentSelect.ts'
import type { SelectableEmployee, ResultCardDestination } from './wizard-logic'

const REQUIRED_DEPARTMENT_MESSAGE = 'Vui lòng chọn phòng ban đích'

const destinationSchema = z.object({
  department_id: z
    .number({ required_error: REQUIRED_DEPARTMENT_MESSAGE })
    .positive(REQUIRED_DEPARTMENT_MESSAGE),
})

type DestinationFormValues = z.infer<typeof destinationSchema>

export type DestinationDialogContentRef = {
  submit: () => Promise<void>
}

type DestinationDialogContentProps = {
  employees: SelectableEmployee[]
  onConfirm: (destination: ResultCardDestination, employees: SelectableEmployee[]) => void
}

const DestinationDialogContent = forwardRef<
  DestinationDialogContentRef,
  DestinationDialogContentProps
>(function DestinationDialogContent({ employees, onConfirm }, ref) {
  const { loadInitialBranchOptions } = useBranchSelect()
  const { loadInitialBlockOptions } = useBlockSelect()
  const { loadInitialDepartmentOptions } = useDepartmentSelect()
  const [meta, setMeta] = useState<{
    branchId?: number
    branchName?: string
    blockId?: number
    blockName?: string
    departmentId?: number
    departmentName?: string
  }>({})
  const [currentEmployees, setCurrentEmployees] = useState<SelectableEmployee[]>(employees)

  const {
    setValue,
    trigger,
    formState: { errors },
  } = useForm<DestinationFormValues>({
    resolver: zodResolver(destinationSchema),
    defaultValues: { department_id: undefined },
    mode: 'onTouched',
  })

  const handleRemoveEmployee = useCallback((employeeId: number) => {
    setCurrentEmployees((prev) => prev.filter((employee) => employee.id !== employeeId))
  }, [])

  const employeeColumns: ColumnDef<SelectableEmployee>[] = useMemo(
    () => [
      { accessorKey: 'code', header: 'Mã NV', meta: { width: 'w-32' } },
      { accessorKey: 'fullname', header: 'Tên nhân viên', meta: { width: 'w-80' } },
      {
        id: 'remove',
        header: '',
        cell: ({ row }) => (
          <Button
            type="button"
            variant="secondary"
            iconOnly
            size="medium"
            leftIcon={<IconX />}
            onClick={() => handleRemoveEmployee(row.original.id)}
            className="bg-data-red-disabled text-data-red-default p-2"
            title="Loại bỏ khỏi danh sách"
          />
        ),
        meta: { width: 'w-[56px]', align: 'right' },
      },
    ],
    [handleRemoveEmployee]
  )

  useImperativeHandle(ref, () => ({
    submit: async () => {
      const isValid = await trigger()
      // Only the org IDs are reliably emitted by the cascade — branch/block/department NAMES are
      // best-effort and often empty (useCascadeSelect runs useOrganization with fetch*: false, so
      // its option arrays used for label lookup stay empty). So gate on the IDs only.
      if (
        !isValid ||
        !meta.branchId ||
        !meta.blockId ||
        !meta.departmentId ||
        currentEmployees.length === 0
      ) {
        const validationError = new Error('Validation failed')
        ;(validationError as any).isValidationError = true
        throw validationError
      }
      // Resolve the destination org names for the result-card header. Prefer the names the
      // cascade emitted; otherwise look them up by id (cached, cheap), falling back to the id.
      let branchName = meta.branchName
      if (!branchName) {
        const options = await loadInitialBranchOptions([meta.branchId])
        branchName = options[0]?.label ?? `Chi nhánh ${meta.branchId}`
      }
      let blockName = meta.blockName
      if (!blockName) {
        const options = await loadInitialBlockOptions([meta.blockId])
        blockName = options[0]?.label ?? `Khối ${meta.blockId}`
      }
      let departmentName = meta.departmentName
      if (!departmentName) {
        const options = await loadInitialDepartmentOptions([meta.departmentId])
        departmentName = options[0]?.label ?? `Phòng ${meta.departmentId}`
      }
      onConfirm(
        {
          branchId: meta.branchId,
          branchName,
          blockId: meta.blockId,
          blockName,
          departmentId: meta.departmentId,
          departmentName,
        },
        currentEmployees
      )
    },
  }))

  return (
    <div className="flex flex-col gap-5 p-6">
      <CascadeSelectGroupOrganization
        showEmployee={false}
        showPosition={false}
        showBlock
        showDepartment
        branchRequired
        blockRequired
        departmentRequired
        departmentLabel="Phòng ban đích"
        skipValidation
        formErrors={{ department_id: errors.department_id }}
        onFormChange={(data) => {
          const departmentId =
            data.department_id && data.department_id > 0 ? data.department_id : undefined
          setMeta({
            branchId: data.branch_id && data.branch_id > 0 ? data.branch_id : undefined,
            branchName: data.branch_name,
            blockId: data.block_id && data.block_id > 0 ? data.block_id : undefined,
            blockName: data.block_name,
            departmentId,
            departmentName: data.department_name,
          })
          setValue('department_id', departmentId as unknown as number, { shouldValidate: true })
        }}
      />

      <div className="flex flex-col gap-2">
        <p className="typo-body-base-semibold text-content-dark-2">
          Nhân viên được chọn ({currentEmployees.length})
        </p>
        <Table
          data={currentEmployees}
          columns={employeeColumns}
          showSTT
          showActions={false}
          enablePagination={false}
          emptyMessage="Chưa có nhân viên nào được chọn"
          className="px-0 pb-0"
        />
      </div>
    </div>
  )
})

export default DestinationDialogContent

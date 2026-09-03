import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import {
  CascadeSelectGroupOrganization,
  type CascadeSelectFormData,
  type CascadeSelectGroupRef,
} from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import { BlockType } from '@/constants/api-schema-aliases'
export type DepartmentFilterFormData = {
  branch_id?: number
  block_id?: number
  block_type?: BlockType
}

export type DepartmentFilterFormRef = {
  clearForm: () => void
  getValues: () => DepartmentFilterFormData
}

type DepartmentFilterFormProps = {
  initialValues?: DepartmentFilterFormData
  isOpen?: boolean
}

const schema = z.object({
  branch_id: z.number().optional(),
  block_id: z.number().optional(),
  block_type: z.enum(['business', 'support']).optional(),
})

const DepartmentFilterForm = forwardRef<DepartmentFilterFormRef, DepartmentFilterFormProps>(
  ({ initialValues, isOpen }, ref) => {
    const [formKey, setFormKey] = useState(0)
    const prevIsOpenRef = useRef(false)
    const cascadeRef = useRef<CascadeSelectGroupRef | null>(null)

    const form = useForm<DepartmentFilterFormData>({
      resolver: zodResolver(schema) as never,
      defaultValues: {
        branch_id: initialValues?.branch_id,
        block_id: initialValues?.block_id,
        block_type: initialValues?.block_type,
      },
    })
    const { getValues, reset, setValue } = form

    useEffect(() => {
      const justOpened = isOpen && !prevIsOpenRef.current
      prevIsOpenRef.current = !!isOpen
      if (justOpened) {
        reset({
          branch_id: initialValues?.branch_id,
          block_id: initialValues?.block_id,
          block_type: initialValues?.block_type,
        })
        setFormKey((k) => k + 1)
      }
    }, [isOpen, initialValues, reset])

    const handleCascadeChange = useCallback(
      (data: CascadeSelectFormData) => {
        const branchId = data.branch_id && data.branch_id > 0 ? data.branch_id : undefined
        const blockId = data.block_id && data.block_id > 0 ? data.block_id : undefined
        const blockType = data.block_types?.[0] as BlockType | undefined
        setValue('branch_id', branchId, { shouldDirty: true })
        setValue('block_id', blockId, { shouldDirty: true })
        setValue('block_type', blockType, { shouldDirty: true })
      },
      [setValue]
    )

    useImperativeHandle(
      ref,
      () => ({
        clearForm: () => {
          const cleared: DepartmentFilterFormData = {
            branch_id: undefined,
            block_id: undefined,
            block_type: undefined,
          }
          reset(cleared, { keepDefaultValues: false, keepValues: false })
          cascadeRef.current?.clearAll()
        },
        getValues: () => getValues(),
      }),
      [reset, getValues]
    )

    return (
      <div className="flex flex-col gap-4">
        <CascadeSelectGroupOrganization
          ref={cascadeRef}
          key={formKey}
          initialValues={{
            branch: initialValues?.branch_id?.toString(),
            block: initialValues?.block_id?.toString(),
            block_types: initialValues?.block_type ? [initialValues.block_type] : [],
          }}
          onFormChange={handleCascadeChange}
          showDepartment={false}
          showEmployee={false}
          showPosition={false}
          showBlockTypeFilter={true}
          blockTypeLabel="Loại khối"
          blockTypeVariant="select"
          layout="grid"
          skipValidation={true}
          className="gap-5"
        />
      </div>
    )
  }
)

DepartmentFilterForm.displayName = 'DepartmentFilterForm'

export default DepartmentFilterForm

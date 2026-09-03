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
export type BlockFilterFormData = {
  branch_id?: number
  block_type?: BlockType
}

export type BlockFilterFormRef = {
  clearForm: () => void
  getValues: () => BlockFilterFormData
}

type BlockFilterFormProps = {
  initialValues?: BlockFilterFormData
  isOpen?: boolean
}

const schema = z.object({
  branch_id: z.number().optional(),
  block_type: z.enum(['business', 'support']).optional(),
})

const BlockFilterForm = forwardRef<BlockFilterFormRef, BlockFilterFormProps>(
  ({ initialValues, isOpen }, ref) => {
    const [formKey, setFormKey] = useState(0)
    const prevIsOpenRef = useRef(false)
    const cascadeRef = useRef<CascadeSelectGroupRef | null>(null)

    const form = useForm<BlockFilterFormData>({
      resolver: zodResolver(schema) as never,
      defaultValues: {
        branch_id: initialValues?.branch_id,
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
          block_type: initialValues?.block_type,
        })
        setFormKey((k) => k + 1)
      }
    }, [isOpen, initialValues, reset])

    const handleCascadeChange = useCallback(
      (data: CascadeSelectFormData) => {
        const branchId = data.branch_id && data.branch_id > 0 ? data.branch_id : undefined
        const blockType = data.block_types?.[0] as BlockType | undefined
        setValue('branch_id', branchId, { shouldDirty: true })
        setValue('block_type', blockType, { shouldDirty: true })
      },
      [setValue]
    )

    useImperativeHandle(
      ref,
      () => ({
        clearForm: () => {
          const cleared: BlockFilterFormData = {
            branch_id: undefined,
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
      <div className="flex flex-col gap-3">
        <CascadeSelectGroupOrganization
          ref={cascadeRef}
          key={formKey}
          initialValues={{
            branch: initialValues?.branch_id?.toString(),
            block: undefined,
            block_types: initialValues?.block_type ? [initialValues.block_type] : [],
          }}
          onFormChange={handleCascadeChange}
          showDepartment={false}
          showBlock={false}
          showEmployee={false}
          showPosition={false}
          showBlockTypeFilter={true}
          blockTypeLabel="Loại khối"
          blockTypeVariant="select"
          layout="grid"
          skipValidation={true}
          compactFilterLayout={true}
          className="w-full"
        />
      </div>
    )
  }
)

BlockFilterForm.displayName = 'BlockFilterForm'

export default BlockFilterForm

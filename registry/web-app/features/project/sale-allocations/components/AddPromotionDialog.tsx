import { useForm, useWatch } from 'react-hook-form'
import { Button, Select } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import { useDepartmentSelect } from '@/hooks/useDepartmentSelect'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect'
import { useSaleAllocationLoadOptions } from '../services/useSaleAllocationLoadOptions'
import { useEffect } from 'react'

type FormValues = {
  relationship: 'employee' | 'department' | 'exchange' | 'collaborator' | ''
  entity_id: number | null
  entity_name: string
  note: string | null
}

export type AddPromotionDialogProps = {
  onConfirm: (data: FormValues) => void
  onCancel?: () => void
  existingKeys?: string[] // list of "relationship:id" to filter out
}

export const AddPromotionDialog = ({
  onConfirm,
  onCancel,
  existingKeys = [],
}: AddPromotionDialogProps) => {
  const { loadDepartmentOptions } = useDepartmentSelect()
  const { loadEmployeeOptions } = useEmployeeSelect()
  const { loadExchangeOptions } = useSaleAllocationLoadOptions()

  const { register, control, handleSubmit, setValue } = useForm<FormValues>({
    defaultValues: {
      relationship: '',
      entity_id: null,
      entity_name: '',
      note: '',
    },
  })

  const relationship = useWatch({ control, name: 'relationship' })

  // Reset entity_id when relationship changes
  useEffect(() => {
    setValue('entity_id', null)
    setValue('entity_name', '')
  }, [relationship, setValue])

  const loadFilteredOptions = async (loadParams: any, loadFn: any, rel: string) => {
    try {
      const res = await loadFn(loadParams)
      if (!existingKeys.length) return res
      return {
        ...res,
        items: res.items.filter((opt: any) => !existingKeys.includes(`${rel}:${opt.value}`)),
      }
    } catch {
      return { items: [], hasNextPage: false, nextPage: null }
    }
  }

  const getLoadMethod = () => {
    switch (relationship) {
      case 'employee':
        return (params: any) => loadFilteredOptions(params, loadEmployeeOptions, 'employee')
      case 'department':
        return (params: any) => loadFilteredOptions(params, loadDepartmentOptions, 'department')
      case 'exchange':
        return (params: any) => loadFilteredOptions(params, loadExchangeOptions, 'exchange')
      default:
        // No collaborator hook currently, fallback to empty
        return async () => ({ items: [], hasNextPage: false, nextPage: null })
    }
  }

  const onSubmit = (data: FormValues) => {
    onConfirm({ ...data, entity_name: `ID: ${data.entity_id}` })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
      <FormController<FormValues, any>
        register={register}
        control={control}
        name="relationship"
        Field={Select}
        fieldProps={{
          label: 'Phân loại',
          options: [
            { label: 'Cá nhân (Nhân sự)', value: 'employee' },
            { label: 'Phòng ban', value: 'department' },
            { label: 'Đại lý phân phối', value: 'exchange' },
            { label: 'Cộng tác viên', value: 'collaborator' },
          ],
          placeholder: 'Chọn phân loại...',
          required: true,
        }}
      />

      <FormController<FormValues, any>
        register={register}
        control={control}
        name="entity_id"
        Field={Select}
        fieldProps={{
          label: 'Đối tượng',
          loadOptions: getLoadMethod(),
          enableSearch: true,
          searchPlaceholder: 'Tìm kiếm...',
          placeholder: 'Chọn đối tượng...',
          required: true,
          disabled: !relationship || relationship === 'collaborator', // TODO: support collaborators
        }}
      />

      <div className="border-border-1 mt-6 flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="secondary-border" onClick={onCancel}>
          Hủy
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={!relationship || !control._getWatch('entity_id')}
        >
          Xác nhận
        </Button>
      </div>
    </form>
  )
}

export default AddPromotionDialog

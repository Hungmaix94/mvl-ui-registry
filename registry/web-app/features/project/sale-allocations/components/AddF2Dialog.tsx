import { useForm } from 'react-hook-form'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Info } from 'lucide-react'
import { Button, Select, TextField } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import { useSaleAllocationLoadOptions } from '../services/useSaleAllocationLoadOptions'

type FormValues = {
  exchange_id: number | null
  note: string | null
}

export type AddF2DialogProps = {
  onConfirm: (data: FormValues) => void
  onCancel?: () => void
  existingExchangeIds?: number[]
}

export const AddF2Dialog = ({
  onConfirm,
  onCancel,
  existingExchangeIds = [],
}: AddF2DialogProps) => {
  const { loadExchangeOptions } = useSaleAllocationLoadOptions()
  const { register, control, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      exchange_id: null,
      note: '',
    },
  })

  const loadFilteredExchangeOptions = async (loadParams: any) => {
    const res = await loadExchangeOptions(loadParams)
    if (!existingExchangeIds.length) return res
    return {
      ...res,
      items: res.items.filter((opt: any) => !existingExchangeIds.includes(Number(opt.value))),
    }
  }

  const onSubmit = (data: FormValues) => {
    onConfirm(data)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
      <FormController<FormValues, any>
        register={register}
        control={control}
        name="exchange_id"
        Field={Select}
        fieldProps={{
          label: (
            <div className="flex items-center gap-1">
              <span>Sàn liên kết</span>
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="text-neutral-60 h-3.5 w-3.5 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">Phân phối độc quyền</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          ),
          loadOptions: loadFilteredExchangeOptions,
          enableSearch: true,
          searchPlaceholder: 'Tìm sàn...',
          placeholder: 'Chọn sàn liên kết...',
          required: true,
        }}
      />

      <FormController<FormValues, any>
        register={register}
        control={control}
        name="note"
        Field={TextField}
        fieldProps={{ label: 'Ghi chú' }}
      />

      <div className="border-border-1 mt-6 flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="secondary-border" onClick={onCancel}>
          Hủy
        </Button>
        <Button type="submit" variant="primary">
          Xác nhận
        </Button>
      </div>
    </form>
  )
}

export default AddF2Dialog

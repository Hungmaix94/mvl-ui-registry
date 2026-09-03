import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import FormController from '@/components/ui/form/FormController'
import { TextField } from '@/components/ui'
const schema = z.object({
  name: z.string().min(1, 'Vui lòng nhập tên thư mục'),
})

export type CreateFolderFormData = z.infer<typeof schema>

export type ProjectDocumentCreateFolderFormRef = {
  submit: () => Promise<CreateFolderFormData | null>
  setApiError: (message: string | null) => void
}

type ProjectDocumentCreateFolderFormProps = {
  initialName?: string
  onEnter?: () => void | Promise<void>
  onValidityChange?: (valid: boolean) => void
}

const ProjectDocumentCreateFolderForm = forwardRef<
  ProjectDocumentCreateFolderFormRef,
  ProjectDocumentCreateFolderFormProps
>(function ProjectDocumentCreateFolderForm({ initialName = '', onEnter, onValidityChange }, ref) {
  const [apiError, setApiErrorState] = useState<string | null>(null)

  const {
    control,
    register,
    formState: { errors, isValid },
    getValues,
    trigger,
  } = useForm<CreateFolderFormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: initialName },
    mode: 'onChange',
  })

  useEffect(() => {
    onValidityChange?.(isValid)
  }, [isValid, onValidityChange])

  useImperativeHandle(
    ref,
    () => ({
      submit: async () => {
        const valid = await trigger()
        if (!valid) return null
        setApiErrorState(null)
        return getValues()
      },
      setApiError: (message: string | null) => {
        setApiErrorState(message)
      },
    }),
    [trigger, getValues]
  )

  return (
    <FormController<CreateFolderFormData, Record<string, unknown>>
      name="name"
      control={control}
      register={register}
      Field={TextField}
      fieldProps={{
        label: 'Tên thư mục',
        placeholder: 'Nhập tên thư mục',
        required: true,
        error: apiError ?? errors.name?.message,
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          e.stopPropagation()
          void onEnter?.()
        },
      }}
    />
  )
})

export default ProjectDocumentCreateFolderForm

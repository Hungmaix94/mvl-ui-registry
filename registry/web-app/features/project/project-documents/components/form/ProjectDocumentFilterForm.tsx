import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Flex } from '@radix-ui/themes'
import FormController from '@/components/ui/form/FormController.tsx'
import { Select } from '@/components/ui'
import { useElibraryCategorySelect } from '@/hooks/useElibraryCategorySelect'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { ElibraryVisibility } from '@/constants/api-schema-aliases'

const VALID_VISIBILITY = Object.values(ElibraryVisibility)

const Schema = z.object({
  visibility: z
    .enum(VALID_VISIBILITY as [string, ...string[]])
    .nullable()
    .optional(),
  category: z.number().int().positive().nullable().optional(),
})

export type ProjectDocumentFilterValues = z.infer<typeof Schema>

export type ProjectDocumentFilterFormRef = {
  getValues: () => ProjectDocumentFilterValues
  reset: () => void
}

type ProjectDocumentFilterFormProps = {
  initialValues?: ProjectDocumentFilterValues
  onApply?: (values: ProjectDocumentFilterValues) => void
  /** When true (e.g. dialog just opened), form syncs from initialValues */
  isDialogOpen?: boolean
  hideVisibilityField?: boolean
  visibilityConstantConfig?: {
    module: 'files' | 'elibrary'
    key: string
  }
}

const ProjectDocumentFilterForm = forwardRef<
  ProjectDocumentFilterFormRef,
  ProjectDocumentFilterFormProps
>(({ initialValues, isDialogOpen, hideVisibilityField = false, visibilityConstantConfig }, ref) => {
  const prevDialogOpenRef = useRef(false)
  const { keysMapOptions } = useAppConstant({
    module: visibilityConstantConfig?.module ?? 'files',
    keys: [visibilityConstantConfig?.key ?? APP_CONSTANT_KEY.FILES.DOCUMENT_VISIBILITY],
  })

  const visibilityOptions = useMemo(() => {
    const key = visibilityConstantConfig?.key ?? APP_CONSTANT_KEY.FILES.DOCUMENT_VISIBILITY
    return keysMapOptions.get(key) ?? []
  }, [keysMapOptions, visibilityConstantConfig?.key])

  const { loadCategoryOptions, loadInitialCategoryOptions } = useElibraryCategorySelect()

  const { control, getValues, reset, register } = useForm<ProjectDocumentFilterValues>({
    resolver: zodResolver(
      Schema
    ) as import('react-hook-form').Resolver<ProjectDocumentFilterValues>,
    defaultValues: {
      visibility: initialValues?.visibility ?? null,
      category: initialValues?.category ?? null,
    },
  })

  useEffect(() => {
    const justOpened = isDialogOpen === true && prevDialogOpenRef.current === false
    if (isDialogOpen === false) prevDialogOpenRef.current = false
    if (justOpened && initialValues) {
      prevDialogOpenRef.current = true
      reset({
        visibility: initialValues.visibility ?? null,
        category: initialValues.category ?? null,
      })
    }
  }, [isDialogOpen, initialValues, reset])

  useImperativeHandle(ref, () => ({
    getValues: () => getValues(),
    reset: () =>
      reset({
        visibility: null,
        category: null,
      }),
  }))

  return (
    <Flex direction="column" gap="3">
      {!hideVisibilityField && (
        <FormController
          register={register}
          control={control}
          name="visibility"
          Field={Select}
          fieldProps={{
            label: 'Phạm vi truy cập',
            placeholder: 'Hãy chọn phạm vi truy cập',
            options: visibilityOptions,
          }}
        />
      )}
      <FormController
        register={register}
        control={control}
        name="category"
        Field={Select}
        fieldProps={{
          label: 'Danh mục',
          placeholder: 'Hãy chọn danh mục',
          loadOptions: loadCategoryOptions,
          loadInitialOptions: loadInitialCategoryOptions,
          enableSearch: true,
        }}
      />
    </Flex>
  )
})

ProjectDocumentFilterForm.displayName = 'ProjectDocumentFilterForm'

export default ProjectDocumentFilterForm

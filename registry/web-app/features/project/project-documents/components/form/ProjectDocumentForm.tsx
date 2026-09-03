import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Flex } from '@radix-ui/themes'
import FormController from '@/components/ui/form/FormController.tsx'
import { RadioGroup, Select, TextField } from '@/components/ui'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import type {
  RealestatePatchedLibraryItemUpdateRequest,
  RealestateLibraryFileRead,
} from '@/services/document-service'
import { useElibraryCategorySelect } from '@/hooks/useElibraryCategorySelect'
import { ElibraryVisibility } from '@/constants/api-schema-aliases'

const VALID_VISIBILITY = Object.values(ElibraryVisibility)

const schema = z.object({
  title: z.string().min(1, 'Vui lòng nhập tên tài liệu'),
  description: z.string().default(''),
  visibility: z.enum(VALID_VISIBILITY as [string, ...string[]]),
  category: z.number().int().positive().nullable().optional(),
})

export type ProjectDocumentFormData = z.infer<typeof schema>

type ProjectDocumentFormProps = {
  onSubmit: (data: RealestatePatchedLibraryItemUpdateRequest) => void
  isSubmitting: boolean
  initialData?: Pick<
    RealestateLibraryFileRead,
    | 'name'
    | 'description'
    | 'parent'
    | 'visibility'
    | 'file_name'
    | 'download_url'
    | 'view_url'
    | 'category'
    | 'category_name'
  >
}

export type ProjectDocumentFormRef = {
  submit: () => void
}

const ProjectDocumentForm = forwardRef<ProjectDocumentFormRef, ProjectDocumentFormProps>(
  function ProjectDocumentForm({ onSubmit, isSubmitting, initialData }, ref) {
    const { keysMapOptions: visibilityOptionsMap } = useAppConstant({
      module: 'files',
      keys: [APP_CONSTANT_KEY.FILES.DOCUMENT_VISIBILITY],
    })

    const visibilityOptions = useMemo(
      () => visibilityOptionsMap.get(APP_CONSTANT_KEY.FILES.DOCUMENT_VISIBILITY) ?? [],
      [visibilityOptionsMap]
    )

    const { loadCategoryOptions, loadInitialCategoryOptions } = useElibraryCategorySelect({
      initialLabelById:
        initialData?.category != null && initialData.category_name
          ? { [Number(initialData.category)]: initialData.category_name }
          : undefined,
    })

    const defaultValues = useMemo(
      () => ({
        title: initialData?.name ?? '',
        description: initialData?.description ?? '',
        visibility: initialData?.visibility ?? ElibraryVisibility.department,
        category: initialData?.category ?? null,
      }),
      [initialData]
    )

    const { control, register, handleSubmit, reset } = useForm<ProjectDocumentFormData>({
      resolver: zodResolver(schema) as import('react-hook-form').Resolver<ProjectDocumentFormData>,
      defaultValues,
    })

    useEffect(() => {
      if (!initialData) return
      reset({
        title: initialData.name ?? '',
        description: initialData.description ?? '',
        visibility: initialData.visibility ?? ElibraryVisibility.department,
        category: initialData.category ?? null,
      })
    }, [initialData, reset])

    const handleFormSubmit: SubmitHandler<ProjectDocumentFormData> = useCallback(
      (data) => {
        const payload = {
          title: data.title.trim(),
          description: data.description?.trim() ?? '',
          visibility: data.visibility as ElibraryVisibility,
          category: data.category ?? null,
        }
        onSubmit({
          name: payload.title,
          description: payload.description,
          visibility: payload.visibility,
          category: payload.category,
        })
      },
      [onSubmit]
    )

    useImperativeHandle(
      ref,
      () => ({
        submit: () => {
          void handleSubmit(handleFormSubmit)()
        },
      }),
      [handleSubmit, handleFormSubmit]
    )

    return (
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void handleSubmit(handleFormSubmit)(event)
        }}
        noValidate
      >
        <Flex direction="column" gap="4">
          {initialData?.file_name && (
            <Flex direction="column" gap="1" className="mt-1">
              <span className="typo-body-base-semibold text-content-dark-1">File hiện tại</span>
              {initialData.download_url || initialData.view_url ? (
                <a
                  href={initialData.download_url ?? initialData.view_url ?? undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="typo-body-base-regular text-action-primary-red-default hover:text-action-primary-red-hover w-fit"
                >
                  {initialData.file_name}
                </a>
              ) : (
                <span className="typo-body-base-regular text-content-dark-2">
                  {initialData.file_name}
                </span>
              )}
            </Flex>
          )}

          <FormController
            register={register}
            control={control}
            name="title"
            Field={TextField}
            fieldProps={{
              label: 'Tên tài liệu',
              placeholder: 'Nhập tên tài liệu',
              required: true,
            }}
          />

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

          <FormController
            register={register}
            control={control}
            name="description"
            Field={TextField}
            fieldProps={{
              label: 'Mô tả',
              placeholder: 'Nhập mô tả',
              required: false,
            }}
          />

          <FormController
            register={register}
            control={control}
            name="visibility"
            Field={RadioGroup}
            fieldProps={{
              label: 'Phạm vi truy cập',
              id: 'visibility',
              disabled: isSubmitting,
              options: visibilityOptions,
            }}
          />

          {/* Edit mode: actions (Cập nhật / Huỷ) được handle bởi dialog (displayCustom) */}
        </Flex>
      </form>
    )
  }
)

export default ProjectDocumentForm

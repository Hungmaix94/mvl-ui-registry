import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Flex, Grid } from '@radix-ui/themes'

import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Select } from '@/components/ui'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '@/components/ui/select/Select'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect.ts'
import type { paths } from '@/api/schema'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { getRealEstateService } from '@/services/realestate-service.ts'
import { PAGE_SIZE } from '@/constants/table.ts'

export type ProjectFilterFormData = NonNullable<
  paths['/api/realestate/projects/']['get']['parameters']['query']
>

export type ProjectFilterFormRef = {
  clearForm: () => void
  getValues: () => ProjectFilterFormData
}

type ProjectFilterFormProps = {
  initialValues?: ProjectFilterFormData
  isOpen?: boolean
}

const Schema = z.object({
  investor: z.number().optional(),
  project_type: z.string().optional(),
  source_type: z.string().optional(),
  is_active: z.union([z.boolean(), z.string()]).optional(),
  project_secretary: z.number().optional(),
  project_director: z.number().optional(),
})

const ProjectFilterForm = forwardRef<ProjectFilterFormRef, ProjectFilterFormProps>(
  ({ initialValues, isOpen }, ref) => {
    const [formKey, setFormKey] = useState(0)
    const prevIsOpenRef = useRef(false)

    const { loadEmployeeOptions, loadInitialEmployeeOptions } = useEmployeeSelect({
      valueType: 'id',
    })

    const { keysMapOptions } = useAppConstant({
      module: 'realestate',
      keys: [
        APP_CONSTANT_KEY.REALESTATE.PROJECT_PROJECT_TYPE_CHOICES,
        APP_CONSTANT_KEY.REALESTATE.PROJECT_SOURCE_TYPE_CHOICES,
      ],
    })

    const projectTypeOptions = useMemo((): Array<{ value: string; label: string }> => {
      return keysMapOptions.has(APP_CONSTANT_KEY.REALESTATE.PROJECT_PROJECT_TYPE_CHOICES)
        ? keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.PROJECT_PROJECT_TYPE_CHOICES) || []
        : []
    }, [keysMapOptions])

    const sourceTypeOptions = useMemo((): Array<{ value: string; label: string }> => {
      return keysMapOptions.has(APP_CONSTANT_KEY.REALESTATE.PROJECT_SOURCE_TYPE_CHOICES)
        ? keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.PROJECT_SOURCE_TYPE_CHOICES) || []
        : []
    }, [keysMapOptions])

    const loadInvestorOptions = useCallback(
      async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
        try {
          const paginatedData = await getRealEstateService().getInvestorDropdown({
            search: params.query || undefined,
            page: params.page,
            page_size: params.pageSize || PAGE_SIZE,
          })
          if (!paginatedData?.results) {
            return { items: [], nextPage: null, hasNextPage: false }
          }
          let nextPage: number | null = null
          const hasNext = !!paginatedData.next
          if (hasNext && paginatedData.next) {
            try {
              const nextUrl = paginatedData.next.startsWith('http')
                ? new URL(paginatedData.next)
                : new URL(paginatedData.next, window.location.origin)
              const nextPageParam = nextUrl.searchParams.get('page')
              if (nextPageParam) nextPage = Number(nextPageParam)
            } catch {
              const pageMatch = paginatedData.next.match(/[?&]page=(\d+)/)
              nextPage = pageMatch ? Number(pageMatch[1]) : params.page + 1
            }
          }
          const items: SelectOption[] = paginatedData.results.map((r) => ({
            value: r.id,
            label: r.name ?? r.code ?? String(r.id),
          }))
          return { items, nextPage, hasNextPage: hasNext }
        } catch {
          return { items: [], nextPage: null, hasNextPage: false }
        }
      },
      []
    )

    const { control, register, reset, getValues, handleSubmit } = useForm<ProjectFilterFormData>({
      resolver: zodResolver(Schema) as any,
      defaultValues: {
        investor: initialValues?.investor,
        project_type: initialValues?.project_type,
        source_type: initialValues?.source_type,
        is_active: initialValues?.is_active,
        project_secretary: initialValues?.project_secretary,
        project_director: initialValues?.project_director,
      },
    })

    useEffect(() => {
      const justOpened = isOpen && !prevIsOpenRef.current
      prevIsOpenRef.current = !!isOpen
      if (justOpened && initialValues) {
        reset({
          investor: initialValues.investor,
          project_type: initialValues.project_type,
          source_type: initialValues.source_type,
          is_active: initialValues.is_active,
          project_secretary: initialValues.project_secretary,
          project_director: initialValues.project_director,
        })
        setFormKey((k) => k + 1)
      }
    }, [isOpen, initialValues, reset])

    useImperativeHandle(
      ref,
      () => ({
        clearForm: () => {
          setFormKey((k) => k + 1)
          reset({
            investor: undefined,
            project_type: undefined,
            source_type: undefined,
            is_active: undefined,
            project_secretary: undefined,
            project_director: undefined,
          })
        },
        getValues: () => getValues(),
      }),
      [reset, getValues]
    )

    const onSubmit = (_data: ProjectFilterFormData) => {}

    return (
      <Form key={formKey} handleSubmit={handleSubmit as any} onSubmit={onSubmit} loading={false}>
        <Flex direction="column" gap="4">
          <Grid columns="2" gap="4" width="100%">
            <FormController
              register={register}
              name="investor"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Nhà đầu tư',
                placeholder: 'Chọn nhà đầu tư',
                loadOptions: loadInvestorOptions,
                pageSize: PAGE_SIZE,
                enableSearch: true,
                searchPlaceholder: 'Tìm nhà đầu tư',
              }}
            />
            <FormController
              register={register}
              name="project_type"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Loại dự án',
                placeholder: 'Chọn loại dự án',
                options: projectTypeOptions,
              }}
            />
            <FormController
              register={register}
              name="source_type"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Loại nguồn',
                placeholder: 'Chọn loại nguồn',
                options: sourceTypeOptions,
              }}
            />
            <FormController
              register={register}
              name="is_active"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Trạng thái mở bán',
                placeholder: 'Chọn trạng thái',
                options: [
                  { value: 'true', label: 'Đang mở bán' },
                  { value: 'false', label: 'Ngừng mở bán' },
                ],
                clearable: true,
              }}
            />
            <FormController
              register={register}
              name="project_secretary"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Thư ký dự án',
                placeholder: 'Chọn thư ký dự án',
                loadOptions: loadEmployeeOptions,
                loadInitialOptions: loadInitialEmployeeOptions,
                enableSearch: true,
                clearable: true,
              }}
            />
            <FormController
              register={register}
              name="project_director"
              control={control}
              Field={Select}
              fieldProps={{
                label: 'Giám đốc dự án',
                placeholder: 'Chọn giám đốc dự án',
                loadOptions: loadEmployeeOptions,
                loadInitialOptions: loadInitialEmployeeOptions,
                enableSearch: true,
                clearable: true,
              }}
            />
          </Grid>
        </Flex>
      </Form>
    )
  }
)

ProjectFilterForm.displayName = 'ProjectFilterForm'

export default ProjectFilterForm

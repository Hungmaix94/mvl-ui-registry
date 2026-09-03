import { forwardRef, useImperativeHandle, useEffect, useCallback, useMemo, useRef } from 'react'
import { useForm, FormProvider, useWatch } from 'react-hook-form'
import { Select } from '@/components/ui'
import FormController from '@/components/ui/form/FormController'
import { useProjectSelect } from '@/hooks/useProjectSelect'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { getRealEstateService } from '@/services/realestate-service'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '@/components/ui/select/Select'

export type ProjectMoneyInFilterFormData = {
  project?: string
  unit_code?: string
  sale_type?: string
}

export type ProjectMoneyInFilterRef = {
  getValues: () => ProjectMoneyInFilterFormData
  clearForm: () => void
}

type Props = {
  initialValues?: ProjectMoneyInFilterFormData
  isOpen?: boolean
}

export const ProjectMoneyInFilter = forwardRef<ProjectMoneyInFilterRef, Props>(
  ({ initialValues, isOpen }, ref) => {
    const form = useForm<ProjectMoneyInFilterFormData>({
      defaultValues: initialValues ?? {},
    })
    const { control, register, getValues, setValue } = form

    const projectValue = useWatch({ control, name: 'project' })

    const { loadProjectOptions, loadInitialProjectOptions } = useProjectSelect()

    const { keysMapOptions } = useAppConstant({
      module: 'sales',
      keys: [APP_CONSTANT_KEY.SALES.BOOKING_SALE.SALE_TYPE_CHOICES],
    })

    const saleTypeOptions = useMemo(
      () => keysMapOptions.get(APP_CONSTANT_KEY.SALES.BOOKING_SALE.SALE_TYPE_CHOICES) ?? [],
      [keysMapOptions]
    )

    const prevProjectRef = useRef(projectValue)
    useEffect(() => {
      if (prevProjectRef.current === projectValue) return
      prevProjectRef.current = projectValue
      setValue('unit_code', '')
    }, [projectValue, setValue])

    const loadProductInventoryOptions = useCallback(
      async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
        if (!params) {
          return { items: [], hasNextPage: false, nextPage: null }
        }
        try {
          const selectedProject = getValues('project')
          const paginatedData = await getRealEstateService().getProductInventoryDropdown({
            page: params.page,
            page_size: params.pageSize || 25,
            search: params.query || undefined,
            project: selectedProject ? Number(selectedProject) : undefined,
          })

          if (!paginatedData || !paginatedData.results) {
            return { items: [], hasNextPage: false, nextPage: null }
          }

          const items: SelectOption[] = paginatedData.results.map((item) => ({
            label:
              item.unit_number && item.unit_number !== item.code
                ? `${item.code} - ${item.unit_number}`
                : item.code,
            value: item.code || item.unit_number,
          }))

          return {
            items,
            hasNextPage: !!paginatedData.next,
            nextPage: params.page + 1,
          }
        } catch {
          return { items: [], hasNextPage: false, nextPage: null }
        }
      },
      [getValues]
    )

    const loadInitialProductInventoryOptions = useCallback(
      async (values: (string | number)[]): Promise<SelectOption[]> => {
        if (!values || values.length === 0) return []
        try {
          const results = await Promise.all(
            values.map(async (raw): Promise<SelectOption | null> => {
              const val = String(raw)
              if (!val) return null
              const paginatedData = await getRealEstateService().getProductInventoryDropdown({
                search: val,
                page_size: 10,
              })
              const found = paginatedData?.results?.find(
                (item) => item.code === val || item.unit_number === val
              )
              if (found) {
                return {
                  label:
                    found.unit_number && found.unit_number !== found.code
                      ? `${found.code} - ${found.unit_number}`
                      : found.code,
                  value: found.code,
                }
              }
              return { label: val, value: val }
            })
          )
          return results.filter((item): item is SelectOption => item !== null)
        } catch {
          return values.map((val) => ({ label: String(val), value: String(val) }))
        }
      },
      []
    )

    useEffect(() => {
      if (isOpen && initialValues) form.reset(initialValues)
    }, [isOpen, initialValues, form])

    useImperativeHandle(ref, () => ({
      getValues: () => form.getValues(),
      clearForm: () =>
        form.reset({
          project: '',
          unit_code: '',
          sale_type: '',
        }),
    }))

    return (
      <FormProvider {...form}>
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <FormController<ProjectMoneyInFilterFormData, any>
            register={register}
            control={control}
            name="project"
            Field={Select}
            fieldProps={{
              label: 'Dự án',
              placeholder: 'Chọn dự án',
              loadOptions: loadProjectOptions,
              loadInitialOptions: loadInitialProjectOptions,
              enableSearch: true,
              clearable: true,
            }}
          />

          <FormController<ProjectMoneyInFilterFormData, any>
            key={`unit_code-${projectValue ?? 'all'}`}
            register={register}
            control={control}
            name="unit_code"
            Field={Select}
            fieldProps={{
              label: 'Mã căn',
              placeholder: 'Chọn mã căn',
              loadOptions: loadProductInventoryOptions,
              loadInitialOptions: loadInitialProductInventoryOptions,
              enableSearch: true,
              clearable: true,
            }}
          />

          <FormController<ProjectMoneyInFilterFormData, any>
            register={register}
            control={control}
            name="sale_type"
            Field={Select}
            fieldProps={{
              label: 'Loại hình sale',
              placeholder: 'Chọn loại hình sale',
              options: saleTypeOptions,
              clearable: true,
            }}
          />
        </div>
      </FormProvider>
    )
  }
)

ProjectMoneyInFilter.displayName = 'ProjectMoneyInFilter'

export default ProjectMoneyInFilter

import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usePermissionStructure } from '@/services'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Select } from '@/components/ui'
import type { SelectOption } from '@/components/ui/select'
import { Flex } from '@radix-ui/themes'

export type PermissionManagementFilterFormRef = {
  clearForm: () => void
  getFormData: () => z.infer<typeof Schema>
}

const Schema = z.object({
  code: z.string().optional(),
  description: z.string().optional(),
  ordering: z.string().optional(),
  search: z.string().optional(),
  module: z.string().nullable().optional(),
  submodule: z.string().nullable().optional(),
})

type PermissionManagementFilterFormProps = {
  initialValues?: Record<string, any>
}

const PermissionManagementFilterForm = forwardRef<
  PermissionManagementFilterFormRef,
  PermissionManagementFilterFormProps
>(({ initialValues }, ref) => {
  const [isLoading, setIsLoading] = useState<boolean>(false)

  const {
    control,
    handleSubmit,
    register,
    reset,
    getValues,
    formState: {
      // errors,
      // isDirty,
      // isValid,
    },
  } = useForm<z.infer<typeof Schema>>({
    resolver: zodResolver(Schema),
    defaultValues: {
      search: initialValues?.search || '',
      code: initialValues?.code || '',
      description: initialValues?.description || '',
      ordering: initialValues?.ordering || '',
      module: initialValues?.module || null,
      submodule: initialValues?.submodule || null,
    },
  })

  const { data: structureData, isLoading: isLoadingStructure } = usePermissionStructure()

  // Update form values when initialValues change (when dialog reopens)
  useEffect(() => {
    if (initialValues !== undefined) {
      reset({
        search: initialValues?.search || '',
        code: initialValues?.code || '',
        description: initialValues?.description || '',
        ordering: initialValues?.ordering || '',
        module: initialValues?.module || null,
        submodule: initialValues?.submodule || null,
      })
    }
  }, [initialValues, reset])

  // Transform modules to SelectOptions
  const selectedModule = getValues('module')
  const moduleOptions: SelectOption[] = useMemo(() => {
    if (!structureData) return []
    // Tree structure: { [module: string]: string[] }
    if (
      typeof structureData === 'object' &&
      !Array.isArray(structureData) &&
      Object.keys(structureData).length > 0
    ) {
      // If keys are not 'modules' or 'submodules', treat as tree
      const keys = Object.keys(structureData)
      if (!keys.includes('modules') && !keys.includes('submodules')) {
        return keys.map((module) => ({ label: module, value: module }))
      }
      // Flat structure
      if (Array.isArray((structureData as any).modules)) {
        return (structureData as any).modules.map((module: string) => ({
          label: module,
          value: module,
        }))
      }
    }
    return []
  }, [structureData])

  const submoduleOptions: SelectOption[] = useMemo(() => {
    if (!structureData || !selectedModule) return []
    // Tree structure
    if (
      typeof structureData === 'object' &&
      !Array.isArray(structureData) &&
      Object.keys(structureData).length > 0
    ) {
      const keys = Object.keys(structureData)
      if (!keys.includes('modules') && !keys.includes('submodules')) {
        const submodules = (structureData as Record<string, string[]>)[selectedModule] || []
        return submodules.map((sub) => ({ label: sub, value: sub }))
      }
      // Flat structure
      if (Array.isArray((structureData as any).submodules)) {
        return (structureData as any).submodules.map((sub: string) => ({ label: sub, value: sub }))
      }
    }
    return []
  }, [structureData, selectedModule])

  // Expose clearForm and getFormData functions through ref
  useImperativeHandle(
    ref,
    () => ({
      clearForm: () => {
        // Use reset with null for select fields to properly clear them
        reset(
          {
            search: '',
            code: '',
            description: '',
            ordering: '',
            module: null,
            submodule: null,
          },
          {
            keepDefaultValues: false,
          }
        )
      },
      getFormData: () => {
        return getValues()
      },
    }),
    [reset, getValues]
  )

  // @ts-ignore
  const onSubmit = async (data: z.infer<typeof Schema>) => {
    setIsLoading(true)
    try {
      // setFilters({
      //   module: data.module,
      //   submodule: data.submodule,
      //   search: data.search,
      //   code: data.code,
      //   description: data.description,
      //   ordering: data.ordering,
      // });
    } catch (error) {
      console.error('Error submitting form:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // todo: reset form when clearFilterForm triggered

  return (
    <>
      <Form
        loading={isLoading || isLoadingStructure}
        onSubmit={onSubmit}
        handleSubmit={handleSubmit}
      >
        <Flex direction={'column'} gap={'4'}>
          <FormController
            register={register}
            name="module"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Phân hệ',
              options: moduleOptions,
              placeholder: isLoadingStructure ? 'Đang tải...' : 'Chọn phân hệ',
              disabled: isLoadingStructure,
              onChange: (value: string | null) => {
                reset(
                  {
                    ...getValues(),
                    module: value,
                    submodule: null,
                  },
                  { keepDefaultValues: false }
                )
              },
            }}
          />

          <FormController
            register={register}
            name="submodule"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Phân hệ con',
              options: submoduleOptions,
              placeholder: isLoadingStructure ? 'Đang tải...' : 'Chọn phân hệ con',
              disabled: isLoadingStructure || !selectedModule,
            }}
          />
        </Flex>
      </Form>
    </>
  )
})

PermissionManagementFilterForm.displayName = 'PermissionManagementFilterForm'

export default PermissionManagementFilterForm

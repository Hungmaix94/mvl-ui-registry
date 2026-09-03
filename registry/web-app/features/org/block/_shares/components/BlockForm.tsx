import { SubmitHandler, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Flex } from '@radix-ui/themes'

import { Button, Grid, RadioGroup, Select, TextArea, TextField } from '@/components/ui'
import { type Block } from '@/features/org/services/block-service'
import {
  blockFormSchema,
  BlockFormValues,
} from '@/features/org/block/_shares/types/block-form-types.ts'
import FormController from '@/components/ui/form/FormController.tsx'
import { useEffect, useMemo } from 'react'
import { cn } from '@/utils'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import useOrganization from '@/hooks/useOrganization.tsx'
import { useBranchSelect } from '@/hooks/useBranchSelect.ts'
import { useEmployeeSelect } from '@/hooks/useEmployeeSelect.ts'
import { PAGE_SIZE } from '@/constants/table.ts'
import { BlockType } from '@/constants/api-schema-aliases'

type BlockFormProps = {
  initialData?: Block // For editing
  onSubmit: (values: BlockFormValues) => void
  onCancel: () => void // Add onCancel prop
  isSubmitting?: boolean
  isEdit?: boolean
}

export const BlockForm = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting,
  isEdit = false,
}: BlockFormProps) => {
  const form = useForm<BlockFormValues>({
    resolver: zodResolver(blockFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          block_type: initialData.block_type,
          branch_id: initialData.branch.id,
          director_id: initialData.director?.id ?? null,
          description: initialData.description || '',
        }
      : {
          name: '',
          block_type: BlockType.business,
          branch_id: undefined,
          director_id: null,
          description: '',
        },
  })
  const { register, control, setValue } = form

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.BLOCK.TYPE],
  })
  // Transform block type constants
  const blockTypeOptions = useMemo(
    () => keysMapOptions.get(APP_CONSTANT_KEY.BLOCK.TYPE) || [],
    [keysMapOptions]
  )

  const { branches, isBranchesLoading: isLoadingBranches } = useOrganization({})
  const { loadBranchOptions, loadInitialBranchOptions } = useBranchSelect({
    pageSize: PAGE_SIZE,
  })
  const directorSelectAdditionalParams = useMemo(
    () => ({ position__is_leadership: true }) as Record<string, any>,
    []
  )

  const { loadEmployeeOptions, loadInitialEmployeeOptions } = useEmployeeSelect({
    valueType: 'id',
    pageSize: PAGE_SIZE,
    additionalParams: directorSelectAdditionalParams,
  })

  // Ensure form values are set correctly when data is loaded (for edit mode)
  useEffect(() => {
    if (initialData && !isLoadingBranches && branches.length > 0) {
      const currentBranchId = initialData.branch?.id

      if (currentBranchId) {
        setValue('branch_id', currentBranchId)
      }
    }
  }, [initialData, isLoadingBranches, branches, setValue])

  const submitButtonText = useMemo(() => (initialData ? 'Lưu' : 'Tạo mới'), [initialData])

  const handleSubmit: SubmitHandler<BlockFormValues> = (values) => {
    onSubmit(values)
  }

  // Show loading if branches data is still being fetched (for edit mode)
  if (initialData && isLoadingBranches) {
    return (
      <div className="my-[20px] space-y-8">
        <div className="flex items-center justify-center py-8">
          <div className="text-content-dark-3">Đang tải dữ liệu...</div>
        </div>
      </div>
    )
  }

  return (
    <form
      key={`block-form-${initialData?.id || 'create'}-${branches.length}`}
      onSubmit={form.handleSubmit(handleSubmit)}
      className="space-y-6 px-10 py-4"
    >
      <Flex direction="column" gap={'20px'} className="w-full px-10 py-4">
        <Flex direction="column" gap="2">
          <div className={cn(isEdit ? 'flex-1' : 'hidden')}>
            <TextField
              {...{
                label: 'Mã khối',
                value: initialData?.code,
                required: true,
                placeholder: 'Nhập mã khối',
                name: 'code',
                type: 'text',
                disabled: true,
              }}
            />
          </div>

          <Grid cols={2} gap={5}>
            <FormController
              register={register}
              name="name"
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Tên khối',
                required: true,
                placeholder: 'Nhập tên khối',
                autoFocus: true,
                name: 'name',
                type: 'text',
                disabled: isSubmitting,
                className: 'flex-1',
              }}
            />
            <div className={'flex-1'}>
              <FormController
                register={register}
                name="block_type"
                control={control}
                Field={RadioGroup}
                fieldProps={{
                  label: 'Loại khối',
                  required: true,
                  name: 'block_type',
                  disabled: isSubmitting,
                  options: blockTypeOptions,
                  className: 'flex gap-[26px] items-center',
                }}
              />
            </div>
          </Grid>

          <FormController
            register={register}
            name="branch_id"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Chi nhánh',
              required: true,
              name: 'branch_id',
              placeholder: 'Chọn chi nhánh',
              disabled: isSubmitting,
              loadOptions: loadBranchOptions,
              loadInitialOptions: loadInitialBranchOptions,
              pageSize: PAGE_SIZE,
              searchPlaceholder: 'Tìm kiếm chi nhánh...',
              enableSearch: true,
              triggerVariant: 'count' as const,
            }}
          />
          <FormController
            register={register}
            name="director_id"
            control={control}
            Field={Select}
            fieldProps={{
              label: 'Giám đốc khối',
              required: false,
              name: 'director_id',
              placeholder: 'Chọn giám đốc khối',
              disabled: isSubmitting,
              loadOptions: loadEmployeeOptions,
              loadInitialOptions: loadInitialEmployeeOptions,
              pageSize: PAGE_SIZE,
              searchPlaceholder: 'Tìm kiếm giám đốc...',
              enableSearch: true,
              triggerVariant: 'count' as const,
            }}
          />
          <FormController
            register={register}
            name="description"
            control={control}
            Field={TextArea}
            fieldProps={{
              label: 'Mô tả',
              required: false,
              disabled: isSubmitting,
              rows: 4,
            }}
          />
        </Flex>
      </Flex>
      <Flex gap="3" mt="4" justify="end" className="px-10">
        <Button variant={'secondary'} type="button" onClick={onCancel} className={'w-[150px]'}>
          Huỷ
        </Button>
        <Button variant={'primary'} type="submit" disabled={isSubmitting} className={'w-[150px]'}>
          {submitButtonText}
        </Button>
      </Flex>
    </form>
  )
}

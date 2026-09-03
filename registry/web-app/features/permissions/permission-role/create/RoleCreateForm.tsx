import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  roleFormSchema,
  type RoleFormData,
} from '@/features/permissions/permission-role/_shares/schemas/role-schema.ts'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { TextField, TextArea, Button } from '@/components/ui'
import { Flex, Text } from '@radix-ui/themes'
import { useCreateRole } from '@/services/role-service.ts'
import { useCallback } from 'react'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { PermissionSection } from '@/features/permissions/permission-role/_shares/components/PermissionSection.tsx'
import DataScopeSection from '@/features/permissions/permission-role/_shares/components/DataScopeSection.tsx'
import { PatchedRoleRequestData_scope_level } from '@/api/schema.ts'

interface RoleCreateFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

const RoleCreateForm = ({ onSuccess, onCancel }: RoleCreateFormProps) => {
  const createRoleMutation = useCreateRole()

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
    setError,
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: '',
      description: '',
      permission_ids: [],
      data_scope_level: PatchedRoleRequestData_scope_level.root,
      branch_scope_ids: [],
      block_scope_ids: [],
      department_scope_ids: [],
    },
  })

  const dataScopeLevel = useWatch({ control, name: 'data_scope_level' })

  const onSubmit = useCallback(
    async (data: RoleFormData) => {
      try {
        await createRoleMutation.mutateAsync(data)
        toastService.success('Tạo vai trò thành công')
        onSuccess?.()
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [createRoleMutation, onSuccess]
  )

  return (
    <Form loading={createRoleMutation.isPending} onSubmit={onSubmit} handleSubmit={handleSubmit}>
      <Flex direction="column" gap="5" className="w-full px-10 py-4">
        {/* Section: Thông tin chung */}
        <Text className="typo-body-xl-semibold text-content-dark-1">Thông tin chung</Text>

        {/* Fields */}
        <Flex direction="column" gap="2">
          {/* Tên vai trò */}
          <FormController
            register={register}
            name="name"
            control={control}
            Field={TextField}
            fieldProps={{
              label: 'Tên vai trò',
              required: true,
              placeholder: 'Nhập tên vai trò',
              autoFocus: true,
              name: 'name',
              type: 'text',
              error: errors.name?.message,
              disabled: createRoleMutation.isPending,
            }}
          />

          {/* Mô tả */}
          <FormController
            register={register}
            name="description"
            control={control}
            Field={TextArea}
            fieldProps={{
              label: 'Mô tả',
              required: false,
              placeholder: 'Nhập mô tả về vai trò',
              name: 'description',
              rows: 4,
              error: errors.description?.message,
              disabled: createRoleMutation.isPending,
            }}
          />

          {/* Phân quyền */}
          <PermissionSection
            initialAssignedIds={[]}
            onChange={(permissionIds) => {
              setValue('permission_ids', permissionIds, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }}
            disabled={createRoleMutation.isPending}
          />

          {/* Phạm vi dữ liệu */}
          <DataScopeSection
            control={control}
            setValue={setValue}
            level={dataScopeLevel}
            disabled={createRoleMutation.isPending}
          />
        </Flex>

        {/* Action Buttons */}
        <Flex gap="2" justify="end">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={createRoleMutation.isPending}
            className={'w-[150px]'}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={createRoleMutation.isPending}
            loading={createRoleMutation.isPending}
            className={'w-[150px]'}
          >
            Lưu
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}

export default RoleCreateForm

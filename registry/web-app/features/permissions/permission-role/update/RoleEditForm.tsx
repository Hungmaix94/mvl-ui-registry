import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  type RoleFormData,
  type RoleEditFormData,
  roleFormSchema,
} from '@/features/permissions/permission-role/_shares/schemas/role-schema.ts'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { Button, TextArea, TextField } from '@/components/ui'
import { Flex, Text } from '@radix-ui/themes'
import { useUpdateRole } from '@/services/role-service.ts'
import { useCallback } from 'react'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { PermissionSection } from '@/features/permissions/permission-role/_shares/components/PermissionSection.tsx'
import DataScopeSection from '@/features/permissions/permission-role/_shares/components/DataScopeSection.tsx'
import { PatchedRoleRequestData_scope_level } from '@/api/schema.ts'

interface RoleEditFormProps {
  initialData?: RoleEditFormData
  onSuccess?: () => void
  onCancel?: () => void
}

const RoleEditForm = ({ initialData, onSuccess, onCancel }: RoleEditFormProps) => {
  const updateRoleMutation = useUpdateRole()

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
    setError,
  } = useForm<RoleFormData>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: initialData
      ? {
          name: initialData.name,
          description: initialData.description,
          permission_ids: initialData.permission_ids,
          data_scope_level: initialData.data_scope_level ?? PatchedRoleRequestData_scope_level.root,
          branch_scope_ids: initialData.branch_scope_ids ?? [],
          block_scope_ids: initialData.block_scope_ids ?? [],
          department_scope_ids: initialData.department_scope_ids ?? [],
        }
      : undefined,
  })

  const dataScopeLevel = useWatch({ control, name: 'data_scope_level' })

  const onSubmit = useCallback(
    async (data: RoleFormData) => {
      try {
        if (!initialData?.id) {
          throw new Error('Role ID is required for update')
        }
        await updateRoleMutation.mutateAsync({ id: initialData.id, data })
        toastService.success('Cập nhật vai trò thành công')
        onSuccess?.()
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [updateRoleMutation, onSuccess, initialData?.id]
  )

  return (
    <Form loading={updateRoleMutation.isPending} onSubmit={onSubmit} handleSubmit={handleSubmit}>
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
              disabled: updateRoleMutation.isPending,
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
              disabled: updateRoleMutation.isPending,
            }}
          />

          {/* Phân quyền */}
          <PermissionSection
            initialAssignedIds={initialData?.permission_ids || []}
            onChange={(permissionIds) => {
              setValue('permission_ids', permissionIds, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }}
            disabled={updateRoleMutation.isPending}
          />

          {/* Phạm vi dữ liệu */}
          <DataScopeSection
            control={control}
            setValue={setValue}
            level={dataScopeLevel}
            disabled={updateRoleMutation.isPending}
          />
        </Flex>

        {/* Action Buttons */}
        <Flex gap="2" justify="end">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={updateRoleMutation.isPending}
            className={'w-[150px]'}
          >
            Hủy
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={updateRoleMutation.isPending}
            loading={updateRoleMutation.isPending}
            className={'w-[150px]'}
          >
            Lưu
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}

export default RoleEditForm

import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Flex } from '@radix-ui/themes'
import { SubmitHandler, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import { Button, TextField, RadioGroup, TextArea } from '@/components/ui'
import {
  useCreateAttendanceDevice,
  useUpdateAttendanceDevice,
  type AttendanceDevice,
  type AttendanceDeviceRequest,
} from '@/features/attendance/services/attendance-device-service'
import { APP_PATH } from '@/routes'
import { QUERY_KEYS } from '@/constants'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import FormController from '@/components/ui/form/FormController.tsx'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { IconWarningcircle } from '@/assets/icons'
import { withRememberedSearch } from '@/utils/list-url-memory'

// Validation schema matching API AttendanceDeviceRequest
// Accept both boolean and string ('true'/'false') for radio group interoperability
const attendanceDeviceSchema = z.object({
  name: z.string().min(1, 'Tên thiết bị không được để trống'),
  block_id: z.number().optional(),
  ip_address: z.string().min(1, 'Địa chỉ IP không được để trống'),
  port: z
    .string({ required_error: 'Nhập port' })
    .min(1, 'Port không được để trống')
    .regex(/^\d+$/, 'Port chỉ được nhập số'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
  is_enabled: z.coerce.boolean().optional(),
  note: z.string().optional(),
})

type AttendanceDeviceFormValues = z.infer<typeof attendanceDeviceSchema>

interface AttendanceDeviceFormProps {
  mode?: 'create' | 'edit'
  deviceData?: AttendanceDevice
  deviceLoading?: boolean
  onSuccess?: () => void
  onCancel?: () => void
}

export const AttendanceDeviceForm = ({
  mode = 'create',
  deviceData,
  deviceLoading = false,
  onSuccess,
  onCancel,
}: AttendanceDeviceFormProps) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const createMutation = useCreateAttendanceDevice()
  const updateMutation = useUpdateAttendanceDevice()

  // Get device state options from app constants
  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.WIFI_ATTENDANCE_DEVICE_STATE],
  })
  const isEnabledRadioOptions =
    keysMapOptions.get(APP_CONSTANT_KEY.HRM.WIFI_ATTENDANCE_DEVICE_STATE)?.map((item) => ({
      value: item.value === 'in_use' ? 'true' : 'false',
      label: item.label,
    })) || []

  // Prepare cascade initial values for edit mode
  const cascadeInitialValues = useMemo(() => {
    if (mode === 'edit' && deviceData?.block) {
      return {
        branch: deviceData.block.branch?.id?.toString() || undefined,
        block: deviceData.block.id?.toString() || undefined,
      }
    }
    return undefined
  }, [mode, deviceData])

  // Map device data to form values
  const mapDeviceToFormValues = useCallback(
    (device: AttendanceDevice | undefined): AttendanceDeviceFormValues => {
      if (!device) {
        return {
          name: '',
          ip_address: '',
          port: '',
          password: '',
          is_enabled: true,
          note: '',
        }
      }

      return {
        name: device.name,
        block_id: device.block?.id,
        ip_address: device.ip_address,
        port: device.port ? String(device.port) : '',
        password: device.password,
        is_enabled: device.is_enabled,
        note: device.note || '',
      }
    },
    []
  )

  const form = useForm<AttendanceDeviceFormValues>({
    resolver: zodResolver(attendanceDeviceSchema),
    defaultValues: mapDeviceToFormValues(deviceData),
  })

  const { register, control, reset, setValue, watch } = form

  // Update form when device data changes (for edit mode)
  useEffect(() => {
    if (mode === 'edit' && deviceData) {
      reset(mapDeviceToFormValues(deviceData))
    }
  }, [deviceData, mode, reset, mapDeviceToFormValues])

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
    } else if (mode === 'edit' && deviceData) {
      navigate(APP_PATH.ATTENDANCE_DEVICE_DETAIL.replace(':id', String(deviceData.id)))
    } else {
      navigate(withRememberedSearch(APP_PATH.ATTENDANCE_DEVICE))
    }
  }, [navigate, mode, deviceData, onCancel])

  const handleSubmit: SubmitHandler<AttendanceDeviceFormValues> = useCallback(
    async (values) => {
      try {
        const requestData: AttendanceDeviceRequest = {
          name: values.name,
          block_id: values.block_id,
          ip_address: values.ip_address,
          port: parseInt(values.port, 10),
          password: values.password,
          is_enabled: values.is_enabled,
          note: values.note,
        }

        if (mode === 'create') {
          await createMutation.mutateAsync(requestData)
          toastService.success('Tạo thiết bị chấm công thành công')
        } else {
          if (!deviceData?.id) {
            toastService.error('Không tìm thấy thiết bị để cập nhật')
            return
          }
          await updateMutation.mutateAsync({ id: deviceData.id, data: requestData })
          toastService.success('Cập nhật thiết bị chấm công thành công')
        }

        // Invalidate queries
        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.HRM.ATTENDANCE_DEVICES.LIST({}),
        })

        if (mode === 'edit' && deviceData?.id) {
          await queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.HRM.ATTENDANCE_DEVICES.DETAIL(deviceData.id),
          })
        }

        // Handle success navigation
        if (onSuccess) {
          onSuccess()
        } else {
          navigate(APP_PATH.ATTENDANCE_DEVICE)
        }
      } catch (error: any) {
        handleApiError(error, form.setError)
      }
    },
    [mode, deviceData, createMutation, updateMutation, queryClient, navigate, onSuccess]
  )

  const isLoading = createMutation.isPending || updateMutation.isPending || deviceLoading

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="my-[20px] space-y-8 px-10">
      <Flex direction="column" gap={'20px'} className="w-full py-4">
        {mode === 'edit' && deviceData && (
          <TextField
            label="Mã máy chấm công"
            placeholder="Nhập mã máy chấm công"
            type="text"
            className="flex-1"
            disabled={true}
            value={deviceData.code || ''}
            readOnly
          />
        )}
        <FormController
          register={register}
          name="name"
          control={control}
          Field={TextField}
          fieldProps={{
            label: 'Tên máy chấm công',
            required: true,
            placeholder: 'Nhập tên máy chấm công',
            autoFocus: true,
            type: 'text',
            className: 'flex-1',
            maxLength: 100,
            showCharacterCount: true,
            error: form.formState.errors.name?.message,
          }}
        />
        <CascadeSelectGroupOrganization
          initialValues={cascadeInitialValues}
          showEmployee={false}
          showPosition={false}
          skipValidation={true}
          showDepartment={false}
          onFormChange={(data) => {
            if (data.block_id > 0) {
              setValue('block_id', data.block_id, { shouldDirty: true })
            }
          }}
          className="!gap-0"
        />
        <Flex gap={'6px'} className="w-full">
          <FormController
            register={register}
            name="is_enabled"
            control={control}
            Field={RadioGroup}
            fieldProps={{
              label: 'Trạng thái sử dụng',
              options: isEnabledRadioOptions,
              orientation: 'horizontal',
              // Ensure RadioGroup receives string value and updates boolean in form state
              value: String(watch('is_enabled')),
              onChange: (v: string) => setValue('is_enabled', v === 'true', { shouldDirty: true }),
            }}
          />
          <div className="flex items-center py-2">
            <IconWarningcircle
              title="Bỏ chọn nếu thiết bị tạm ngừng sử dụng để hệ thống ngừng lấy dữ liệu từ máy"
              size={20}
              className="text-content-dark-3 self-end"
            />
          </div>
        </Flex>
        <FormController
          register={register}
          name="ip_address"
          control={control}
          Field={TextField}
          fieldProps={{
            label: 'Tên miền',
            required: true,
            placeholder: 'Nhập tên miền',
            type: 'text',
            className: 'flex-1',
            maxLength: 100,
            showCharacterCount: true,
          }}
        />
        <FormController
          register={register}
          name="password"
          control={control}
          Field={TextField}
          fieldProps={{
            label: 'Mật khẩu',
            placeholder: 'Nhập mật khẩu',
            className: 'flex-1',
            required: true,
            maxLength: 40,
            showCharacterCount: true,
          }}
        />
        <FormController
          register={register}
          name="port"
          control={control}
          Field={TextField}
          fieldProps={{
            label: 'Port',
            placeholder: 'Nhập port',
            type: 'text',
            inputMode: 'numeric',
            pattern: '[0-9]*',
            required: true,
            maxLength: 5,
            showCharacterCount: true,
            error: form.formState.errors.port?.message,
          }}
        />
        <FormController
          register={register}
          name="note"
          control={control}
          Field={TextArea}
          fieldProps={{
            label: 'Ghi chú',
            placeholder: 'Nhập ghi chú',
            type: 'text',
            className: 'flex-1',
            rows: 4,
            maxCharacters: 500,
          }}
        />
      </Flex>

      <Flex gap="3" mt="4" justify="end">
        <Button variant={'secondary'} type="button" onClick={handleCancel} className={'w-[150px]'}>
          Huỷ
        </Button>
        <Button variant={'primary'} type="submit" disabled={isLoading} className={'w-[150px]'}>
          {mode === 'create' ? 'Thêm' : 'Lưu'}
        </Button>
      </Flex>
    </form>
  )
}

export default AttendanceDeviceForm

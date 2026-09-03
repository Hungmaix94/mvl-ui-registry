import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Flex } from '@radix-ui/themes'
import { SubmitHandler, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { handleApiError } from '@/utils/error-utils.ts'
import { Button, TextField, RadioGroup, TextArea } from '@/components/ui'
import { AttendanceWifiDeviceState } from '@/api/schema.ts'
import {
  useCreateAttendanceWifiDevice,
  useUpdateAttendanceWifiDevice,
  type AttendanceWifiDevice,
  type AttendanceWifiDeviceRequest,
} from '@/features/attendance/services/attendance-wifi-service'
import { APP_PATH } from '@/routes'
import { QUERY_KEYS } from '@/constants'
import toastService from '@/services/toast-service.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization.tsx'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { withRememberedSearch } from '@/utils/list-url-memory'

const MAC_REGEX = /^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/i

function parseBssidsString(val: string): string[] {
  return val
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

// Validation schema for WiFi Attendance Device
const wifiDeviceSchema = z.object({
  name: z.string().min(1, 'Tên wifi chấm công không được để trống'),
  branch_id: z.number().optional(),
  block_id: z.number().optional(),
  bssids: z.string().refine(
    (val) => {
      const parts = parseBssidsString(val)
      if (parts.length === 0) return false
      const invalid = parts.filter((p) => !MAC_REGEX.test(p))
      return invalid.length === 0
    },
    (val) => {
      const parts = parseBssidsString(val)
      const invalid = parts.filter((p) => !MAC_REGEX.test(p))
      if (parts.length === 0) return { message: 'BSSID không được để trống' }
      if (invalid.length > 0)
        return {
          message: `Các BSSID không đúng định dạng (XX:XX:XX:XX:XX:XX): ${invalid.join(', ')}`,
        }
      return { message: 'Vui lòng nhập ít nhất một BSSID' }
    }
  ),
  state: z.nativeEnum(AttendanceWifiDeviceState, {
    required_error: 'Vui lòng chọn trạng thái sử dụng',
  }),
  notes: z.string().optional(),
})

export type WifiAttendanceDeviceFormValues = z.infer<typeof wifiDeviceSchema>

interface WifiAttendanceDeviceFormProps {
  mode?: 'create' | 'edit'
  deviceData?: AttendanceWifiDevice
  deviceLoading?: boolean
  onSuccess?: () => void
  onCancel?: () => void
}

const WifiAttendanceDeviceForm = ({
  mode = 'create',
  deviceData,
  deviceLoading = false,
  onSuccess,
  onCancel,
}: WifiAttendanceDeviceFormProps) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const createMutation = useCreateAttendanceWifiDevice()
  const updateMutation = useUpdateAttendanceWifiDevice()

  const { keysMapOptions } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.WIFI_ATTENDANCE_DEVICE_STATE],
  })

  const stateOptions = keysMapOptions.get(APP_CONSTANT_KEY.HRM.WIFI_ATTENDANCE_DEVICE_STATE) || []

  const cascadeInitialValues = useMemo(() => {
    if (mode === 'edit' && deviceData?.block) {
      return {
        branch: deviceData.branch?.id?.toString() || undefined,
        block: deviceData.block.id?.toString() || undefined,
      }
    }
    return undefined
  }, [mode, deviceData])

  const mapDeviceToFormValues = useCallback(
    (device: AttendanceWifiDevice | undefined): WifiAttendanceDeviceFormValues => {
      if (!device) {
        return {
          name: '',
          bssids: '',
          state: AttendanceWifiDeviceState.in_use,
          notes: '',
        }
      }

      return {
        name: device.name,
        block_id: device.block?.id,
        bssids: device.bssids?.join(', ') ?? '',
        state: (device.state as AttendanceWifiDeviceState) || AttendanceWifiDeviceState.in_use,
        notes: device.notes || '',
      }
    },
    []
  )

  const form = useForm<WifiAttendanceDeviceFormValues>({
    resolver: zodResolver(wifiDeviceSchema),
    defaultValues: mapDeviceToFormValues(deviceData),
    mode: 'onChange',
    reValidateMode: 'onChange',
  })

  const { register, control, reset, setValue, setError } = form

  useEffect(() => {
    if (mode === 'edit' && deviceData) {
      reset(mapDeviceToFormValues(deviceData))
    }
  }, [deviceData, mode, reset, mapDeviceToFormValues])

  const handleCancel = useCallback(() => {
    if (onCancel) {
      onCancel()
    } else if (mode === 'edit' && deviceData) {
      navigate(APP_PATH.ATTENDANCE_WIFI_DEVICE_DETAIL.replace(':id', String(deviceData.id)))
    } else {
      navigate(withRememberedSearch(APP_PATH.ATTENDANCE_WIFI_DEVICE))
    }
  }, [navigate, mode, deviceData, onCancel])

  const handleSubmit: SubmitHandler<WifiAttendanceDeviceFormValues> = useCallback(
    async (values) => {
      try {
        const requestData: AttendanceWifiDeviceRequest = {
          name: values.name,
          branch_id: values.branch_id ?? null,
          block_id: values.block_id ?? null,
          bssids: parseBssidsString(values.bssids),
          state: values.state,
          notes: values.notes,
        }

        if (mode === 'create') {
          await createMutation.mutateAsync(requestData)
          toastService.success('Tạo wifi chấm công thành công')
        } else {
          if (!deviceData?.id) {
            toastService.error('Không tìm thấy wifi để cập nhật')
            return
          }
          await updateMutation.mutateAsync({ id: deviceData.id, data: requestData })
          toastService.success('Cập nhật wifi chấm công thành công')
        }

        await queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.HRM.WIFI_ATTENDANCE_DEVICES.LIST({}),
        })

        if (mode === 'edit' && deviceData?.id) {
          await queryClient.invalidateQueries({
            queryKey: QUERY_KEYS.HRM.WIFI_ATTENDANCE_DEVICES.DETAIL(deviceData.id),
          })
        }

        if (onSuccess) {
          onSuccess()
        } else {
          navigate(APP_PATH.ATTENDANCE_WIFI_DEVICE)
        }
      } catch (error: unknown) {
        handleApiError(error, setError)
      }
    },
    [mode, deviceData, createMutation, updateMutation, queryClient, navigate, onSuccess, setError]
  )

  const isLoading = createMutation.isPending || updateMutation.isPending || deviceLoading

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="my-[20px] space-y-8 px-10">
      <Flex direction="column" gap={'20px'} className="w-full py-4">
        {mode === 'edit' && deviceData && (
          <TextField
            label="Mã wifi chấm công"
            placeholder="Nhập mã"
            type="text"
            className="flex-1"
            disabled
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
            label: 'Tên wifi chấm công',
            required: true,
            placeholder: 'Nhập tên wifi chấm công',
            autoFocus: true,
            type: 'text',
            className: 'flex-1',
            maxLength: 100,
            showCharacterCount: true,
          }}
        />
        <CascadeSelectGroupOrganization
          initialValues={cascadeInitialValues}
          showEmployee={false}
          showPosition={false}
          skipValidation={true}
          showDepartment={false}
          onFormChange={(data) => {
            setValue('block_id', data.block_id > 0 ? data.block_id : undefined, {
              shouldDirty: true,
            })
          }}
          className="!gap-0"
        />
        <FormController
          register={register}
          name="bssids"
          control={control}
          Field={TextArea}
          fieldProps={{
            label: 'BSSID',
            required: true,
            placeholder:
              'Nhập một hoặc nhiều BSSID, cách nhau bởi dấu phẩy (ví dụ: AA:BB:CC:DD:EE:FF, 11:22:33:44:55:66). Định dạng MAC: XX:XX:XX:XX:XX:XX.',
            className: 'flex-1',
            rows: 4,
          }}
        />
        <FormController
          register={register}
          name="state"
          control={control}
          Field={RadioGroup}
          fieldProps={{
            label: 'Trạng thái sử dụng',
            required: true,
            options: stateOptions,
            orientation: 'horizontal',
          }}
        />
        <FormController
          register={register}
          name="notes"
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

export default WifiAttendanceDeviceForm

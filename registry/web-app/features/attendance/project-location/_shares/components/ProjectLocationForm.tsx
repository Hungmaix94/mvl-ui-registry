import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { attendanceGeolocationSchema } from '../schemas/attendanceGeolocationSchema.ts'
import Form from '@/components/ui/form/Form.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import {
  Button,
  Grid,
  LoadSuggestionsParams,
  SearchableInput,
  Select,
  Suggestion,
  TextArea,
  TextField,
} from '@/components/ui'
import { LocationChangeProps, ProjectLocationMap } from './ProjectLocationMap.tsx'
import { useCallback, useMemo } from 'react'

import {
  useCreateAttendanceGeolocation,
  useUpdateAttendanceGeolocation,
} from '@/features/attendance/services/attendance-geolocation-service'
import { type GetProjectsParams } from '@/services/realestate-service'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { Flex } from '@radix-ui/themes'
import { getAddressSuggestions, getPlaceDetails } from '@/services/goong-service.ts'
import { LoadOptionsParams } from '@/components/ui/select'
import { getRealEstateService } from '@/services'

type ProjectLocationFormData = z.infer<typeof attendanceGeolocationSchema> & {
  id?: string | number
}

interface ProjectLocationFormProps {
  initialData?: ProjectLocationFormData
  onSuccess?: () => void
  onCancel?: () => void
}

export function ProjectLocationForm({
  initialData,
  onSuccess,
  onCancel,
}: ProjectLocationFormProps) {
  const isEditMode = useMemo(() => !!initialData, [initialData])
  const createMutation = useCreateAttendanceGeolocation()
  const updateMutation = useUpdateAttendanceGeolocation()

  const isLoading = updateMutation.isPending || createMutation.isPending

  const loadProjectOptions = useCallback(async (params: LoadOptionsParams) => {
    const realEstateService = getRealEstateService()
    const requestParams: GetProjectsParams = {
      page: params.page,
      page_size: params.pageSize,
      search: params.query,
    }
    const response = await realEstateService.getProjects(requestParams)

    const items =
      response.results?.map((project) => ({
        value: project.id,
        label: project.name,
      })) || []

    return {
      items,
      nextCursor: response.next,
      hasNextPage: !!response.next,
    }
  }, [])

  const loadAddressSuggestions = useCallback(async (params: LoadSuggestionsParams) => {
    const suggestions = await getAddressSuggestions(params.query)
    return {
      items: suggestions,
      hasNextPage: false,
    }
  }, [])

  const form = useForm<ProjectLocationFormData>({
    resolver: zodResolver(attendanceGeolocationSchema),
    defaultValues: initialData || {
      name: '',
      project_id: undefined,
      address: '',
      radius_m: 100,
      notes: '',
    },
    values: initialData,
  })

  const {
    register,
    control,
    handleSubmit,
    formState: {},
    setError,
    setValue,
  } = form

  const handleLocationChange = ({ latitude, longitude, address }: LocationChangeProps) => {
    setValue('latitude', latitude, { shouldValidate: true, shouldDirty: true })
    setValue('longitude', longitude, { shouldValidate: true, shouldDirty: true })
    setValue('latlong', latitude + ',' + longitude)
    if (address) {
      setValue('address', address, { shouldValidate: true, shouldDirty: true })
    }
  }
  const onSubmit = useCallback(
    async (data: ProjectLocationFormData) => {
      try {
        const serverData = {
          ...data,
          project_id: data.project_id as number,
          longitude: String(data.longitude),
          latitude: String(data.latitude),
        }

        if (isEditMode && initialData?.id) {
          await updateMutation.mutateAsync({
            id: Number(initialData.id),
            data: serverData,
          })
          toastService.success('Đã cập nhật định vị dự án thành công.')
        } else {
          await createMutation.mutateAsync(serverData)
          toastService.success('Đã tạo định vị dự án thành công.')
        }
        onSuccess?.()
      } catch (error) {
        handleApiError(error, setError)
      }
    },
    [isEditMode, initialData?.id, updateMutation, createMutation, onSuccess, setError]
  )

  const submitButtonText = useMemo(() => (isEditMode ? 'Lưu' : 'Thêm'), [isEditMode])
  const longitude = useWatch({ control, name: 'longitude' })
  const latitude = useWatch({ control, name: 'latitude' })
  const latlong = useWatch({ control, name: 'latlong' })
  const radius = useWatch({ control, name: 'radius_m' })
  return (
    <Form loading={isLoading} onSubmit={onSubmit} handleSubmit={handleSubmit} className={'w-full'}>
      <Flex direction="column" gap="5" className="w-full py-4">
        <FormController
          register={register}
          name="name"
          control={control}
          Field={TextField}
          fieldProps={{
            label: 'Tên định vị',
            required: true,
            placeholder: 'Nhập tên định vị',
            disabled: isLoading,
          }}
        />
        <FormController
          register={register}
          name="project_id"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Dự án',
            placeholder: 'Chọn dự án',
            disabled: isLoading,
            required: true,
            loadOptions: loadProjectOptions,
            onSearchChange: () => {},
          }}
        />

        <FormController
          register={register}
          name="address"
          control={control}
          Field={SearchableInput}
          fieldProps={{
            label: 'Vị trí',
            required: true,
            debounceMs: 1000,
            searchPlaceholder: 'Nhập địa điểm',
            disabled: isLoading,
            loadSuggestions: loadAddressSuggestions,
            onSelect: async (item: Suggestion) => {
              const placeDetails = await getPlaceDetails(item.value as string)
              if (placeDetails) {
                setValue('address', placeDetails.formatted_address, { shouldDirty: true })
                setValue('latitude', placeDetails.geometry.location.lat, {
                  shouldDirty: true,
                })
                setValue('longitude', placeDetails.geometry.location.lng, {
                  shouldDirty: true,
                })
                setValue(
                  'latlong',
                  placeDetails.geometry.location.lat + ',' + placeDetails.geometry.location.lng
                )
              }
            },
            onSearchChange: () => {},
          }}
        />

        <Grid cols={2} gap="5">
          <FormController
            register={register}
            name="latlong"
            control={control}
            Field={TextField}
            fieldProps={{
              value: latlong,
              label: 'Tọa độ',
              required: true,
              disabled: true,
            }}
          />
          <FormController
            register={register}
            name="radius_m"
            control={control}
            Field={TextField}
            fieldProps={{
              label: 'Bán kính (m)',
              type: 'number',
              required: true,
              disabled: isLoading,
              showCharacterCount: true,
              maxLength: 5,
            }}
          />
        </Grid>

        <ProjectLocationMap
          latitude={latitude}
          longitude={longitude}
          radius={radius}
          onLocationChange={handleLocationChange}
        />

        <FormController
          register={register}
          name="notes"
          control={control}
          Field={TextArea}
          fieldProps={{
            label: 'Ghi chú',
            placeholder: 'Nhập ghi chú',
            rows: 4,
            maxCharacters: 500,
            disabled: isLoading,
          }}
        />

        <Flex gap="4" justify="end" className="pt-4">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isLoading}
            className={'w-[150px]'}
          >
            Huỷ
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={isLoading}
            loading={isLoading}
            className="w-[150px]"
          >
            {submitButtonText}
          </Button>
        </Flex>
      </Flex>
    </Form>
  )
}

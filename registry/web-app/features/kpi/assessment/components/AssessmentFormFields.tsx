import { Flex, Text } from '@radix-ui/themes'
import { Controller, useFormContext } from 'react-hook-form'
import { useLocation } from 'react-router-dom'
import { RadioGroup } from '@/components/ui/radio-group.tsx'
import { TextArea } from '@/components/ui/text-area'
import { AssessmentFormValues } from '../schema.ts'

export const AssessmentFormFields = () => {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<AssessmentFormValues>()
  const location = useLocation()
  const isManagerMode = location.pathname.startsWith('/kpi/manager')
  const totalManagerScore = watch('total_manager_score')

  return (
    <Flex direction="column" gap="6" className="w-full">
      {!isManagerMode && (
        <>
          <Text className="text-content-dark-1 typo-body-xl-semibold">
            Đánh giá của cấp trên trực tiếp
          </Text>

          <Flex direction="column" className="w-full">
            {/* Kết quả đánh giá */}
            <Flex
              direction="row"
              align="center"
              gap="5"
              className="border-border-1 w-full border-b py-4"
            >
              <Text className="text-content-dark-2 typo-body-base-medium w-[168px] min-w-[168px] shrink-0">
                Kết quả đánh giá
              </Text>
              <div className="flex-1">
                <Text className="text-content-dark-1 typo-body-lg-regular">
                  {totalManagerScore ?? '0'}
                </Text>
              </div>
            </Flex>

            {/* Xếp loại */}
            <Flex
              direction="row"
              align="center"
              gap="5"
              className="border-border-1 w-full border-b py-4"
            >
              <Text className="text-content-dark-2 typo-body-base-medium w-[168px] min-w-[168px] shrink-0">
                Xếp loại
              </Text>
              <div className="flex-1">
                <Text className="text-content-dark-1 typo-body-lg-regular">
                  {watch('grade_manager_overridden') || '-'}
                </Text>
              </div>
            </Flex>

            {/* Ý kiến */}
            <Flex
              direction="row"
              align="center"
              gap="5"
              className="border-border-1 w-full border-b py-4"
            >
              <Text className="text-content-dark-2 typo-body-base-medium w-[168px] min-w-[168px] shrink-0">
                Ý kiến
              </Text>
              <div className="flex-1">
                <Text className="text-content-dark-1 typo-body-lg-regular">
                  {watch('manager_assessment') || '-'}
                </Text>
              </div>
            </Flex>
          </Flex>
        </>
      )}

      <Flex direction="column" gap="4">
        <Flex gap="1" align="center">
          <Text className="text-content-dark-1 typo-body-base-semibold">Xếp loại KPI</Text>
          <Text className="text-action-primary-red-default font-semibold">*</Text>
        </Flex>

        <Controller
          control={control}
          name={isManagerMode ? 'grade' : 'grade_hrm'}
          render={({ field }) => (
            <RadioGroup
              id={isManagerMode ? 'grade' : 'grade_hrm'}
              label="Xếp loại KPI"
              hiddenLabel
              options={['A', 'B', 'C', 'D'].map((grade) => ({
                value: grade,
                label: grade,
              }))}
              disabled={field.disabled ?? false}
              onChange={field.onChange}
              value={field.value || ''}
              className="flex gap-6"
            />
          )}
        />
      </Flex>

      {/* Ghi chú field (Editable for both modes if in assessment? Or always?) */}
      <Flex direction="column" gap="4" className="mt-4">
        <Text className="text-content-dark-1 typo-body-base-semibold">
          {isManagerMode ? 'Nhận xét của quản lý' : 'Ghi chú'}
        </Text>
        <Controller
          control={control}
          name="note"
          render={({ field }) => (
            <TextArea
              {...field}
              placeholder="Nhập ghi chú hoặc nhận xét..."
              value={field.value || ''}
              className="min-h-[100px]"
              maxCharacters={250}
              error={errors.note?.message}
            />
          )}
        />
      </Flex>
    </Flex>
  )
}

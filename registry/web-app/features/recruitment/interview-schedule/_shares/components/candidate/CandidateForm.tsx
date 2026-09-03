import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Select, TextField } from '@/components/ui'
import TimePicker from '@/components/ui/time-picker/TimePicker.tsx'
import FormController from '@/components/ui/form/FormController.tsx'
import {
  type RecruitmentCandidate,
  useRecruitmentCandidates,
} from '@/features/recruitment/services/recruitment-candidate-service'
import { PAGE_SIZE } from '@/constants/table.ts'

const CandidateSchema = z.object({
  recruitment_candidate_id: z.number({
    required_error: 'Vui lòng chọn ứng viên',
  }),
  interview_time: z.string().min(1, 'Vui lòng chọn thời gian phỏng vấn'),
})

type CandidateForm = z.infer<typeof CandidateSchema>

interface CandidateFormProps {
  onSubmit: (data: CandidateForm) => Promise<void>
  initialData?: Partial<CandidateForm>
}

export interface IRefCandidateForm {
  handleFormSubmit: () => void
}

const CandidateForm = forwardRef<IRefCandidateForm, CandidateFormProps>(function AddCandidateForm(
  { onSubmit, initialData },
  ref
) {
  const [selectedCandidate, setSelectedCandidate] = useState<RecruitmentCandidate | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const form = useForm<CandidateForm>({
    resolver: zodResolver(CandidateSchema),
    defaultValues: {
      recruitment_candidate_id: initialData?.recruitment_candidate_id || undefined,
      interview_time: initialData?.interview_time || '08:00',
    },
    shouldFocusError: true,
    mode: 'onSubmit',
  })

  const { control, handleSubmit, setValue, formState } = form

  // Manual focus on first error field when validation fails
  useEffect(() => {
    if (formState.isSubmitted && Object.keys(formState.errors).length > 0) {
      const firstErrorField = Object.keys(formState.errors)[0]

      // Try multiple selectors to find the error field, including Select component
      const selectors = [`[data-field-name="${firstErrorField}"]`]

      let errorElement: HTMLElement | null = null
      for (const selector of selectors) {
        errorElement = document.querySelector(selector) as HTMLElement
        if (errorElement) break
      }

      // If still not found, try to find by looking for the field container
      if (!errorElement) {
        const fieldContainer = document.querySelector(
          `[data-field-name="${firstErrorField}"]`
        ) as HTMLElement
        if (fieldContainer) {
          // Look for any focusable element within the container
          errorElement = fieldContainer.querySelector(
            'button, input, select, [tabindex]'
          ) as HTMLElement
        }
      }

      if (errorElement) {
        // Small delay to ensure DOM is updated and dialog is ready
        setTimeout(() => {
          errorElement?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          errorElement?.focus()
        }, 200)
      } else {
        // Fallback: scroll to the top of the form if we can't find the specific field
        const formElement = document.querySelector('form') as HTMLElement
        if (formElement) {
          setTimeout(() => {
            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }, 200)
        }
      }
    }
  }, [formState.isSubmitted, formState.errors])

  // Fetch recruitment candidates with search
  const { data: candidatesResponse, isLoading } = useRecruitmentCandidates({
    search: searchQuery || undefined,
    page: 1,
    page_size: PAGE_SIZE, // Increase to get more candidates
  })
  const candidates = useMemo(() => candidatesResponse?.results || [], [candidatesResponse?.results])

  // Set selected candidate when initialData is provided
  useEffect(() => {
    if (initialData?.recruitment_candidate_id && candidates.length > 0) {
      const candidate = candidates.find((c) => c.id === initialData.recruitment_candidate_id)
      if (candidate) {
        setSelectedCandidate(candidate)
        // Set form value after candidate is found and data is loaded
        setValue('recruitment_candidate_id', candidate.id)
      }
    }
  }, [initialData?.recruitment_candidate_id, candidates, setValue])

  // Convert candidates to select options
  const candidateOptions = useMemo(() => {
    const options = candidates.map((candidate) => ({
      value: candidate.id,
      label: `${candidate.code} - ${candidate.name}`,
    }))

    // Debug log to check matching
    if (initialData?.recruitment_candidate_id) {
      console.log('🔍 Candidate Options Debug:', {
        candidatesData: candidates,
        options,
        initialCandidateId: initialData.recruitment_candidate_id,
        matchingOption: options.find((opt) => opt.value === initialData.recruitment_candidate_id),
      })
    }

    return options
  }, [candidates, initialData?.recruitment_candidate_id])

  // Handle candidate selection
  const handleCandidateSelect = useCallback(
    (candidateId: number) => {
      const candidate = candidates.find((c) => c.id === candidateId)
      if (candidate) {
        setSelectedCandidate(candidate)
        setValue('recruitment_candidate_id', candidateId)
      }
    },
    [candidates, setValue]
  )

  // Handle search change
  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  const handleFormSubmit = handleSubmit((data) => onSubmit(data).then())

  useImperativeHandle(ref, () => ({
    handleFormSubmit,
  }))

  return (
    <div className="flex w-full flex-col gap-5">
      {/* Candidate Selector */}
      <div data-field-name="recruitment_candidate_id">
        <FormController
          register={form.register}
          name="recruitment_candidate_id"
          control={control}
          Field={Select}
          fieldProps={{
            label: 'Ứng viên',
            required: true,
            placeholder: 'Chọn hoặc nhập họ tên/mã ứng viên',
            options: candidateOptions,
            searchable: true,
            onSearchChange: handleSearchChange,
            onChange: (value: number) => handleCandidateSelect(value),
            isLoading,
          }}
        />
      </div>

      {/* CCCD Field (Disabled) */}
      <TextField
        label="CCCD"
        disabled
        value={selectedCandidate?.citizen_id || ''}
        placeholder="Sẽ được điền tự động"
        maxLength={12}
        showCharacterCount
      />

      {/* Phone Field (Disabled) */}
      <TextField
        label="Số điện thoại"
        disabled
        value={selectedCandidate?.phone || ''}
        placeholder="Sẽ được điền tự động"
        maxLength={100}
        showCharacterCount
      />

      {/* Email Field (Disabled) */}
      <TextField
        label="Email"
        disabled
        value={selectedCandidate?.email || ''}
        placeholder="Sẽ được điền tự động"
        maxLength={100}
        showCharacterCount
      />

      {/* Interview Time */}
      <div data-field-name="interview_time">
        <FormController
          register={form.register}
          name="interview_time"
          control={control}
          Field={TimePicker}
          fieldProps={{
            label: 'Chọn thời gian phỏng vấn',
            required: true,
            onChange: (value: string) => setValue('interview_time', value),
            contentClassName: 'flex-1 self-start',
          }}
        />
      </div>
    </div>
  )
})

CandidateForm.displayName = 'CandidateForm'

export default CandidateForm

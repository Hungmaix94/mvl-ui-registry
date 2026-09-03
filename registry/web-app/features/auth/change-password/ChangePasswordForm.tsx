import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'

import Form from '@/components/ui/form/Form'
import FormController from '@/components/ui/form/FormController'
import { Button, TextField } from '@/components/ui'
import { IconLocksimple } from '@/assets/icons'
import { IconReveal } from '@/components/ui/icon/IconReveal'
import { TextFieldRef } from '@/components/ui/text-field/TextField'
import { useChangePassword } from '@/services/auth-service'
import toastService from '@/services/toast-service.tsx'
import { handleApiError } from '@/utils/error-utils.ts'

// Error message constants
const ERROR_MESSAGES = {
  CURRENT_PASSWORD_REQUIRED: 'Vui lòng nhập mật khẩu cũ',
  NEW_PASSWORD_REQUIRED: 'Vui lòng nhập lại mật khẩu mới',
  PASSWORD_MIN_LENGTH: 'Mật khẩu mới phải lớn hơn 8 ký tự',
  PASSWORD_UPPERCASE: 'Mật khẩu mới phải bao gồm chữ hoa',
  PASSWORD_LOWERCASE: 'Mật khẩu mới phải bao gồm chữ thường',
  PASSWORD_DIGIT: 'Mật khẩu mới phải bao gồm số',
  PASSWORD_SPECIAL_CHAR: 'Mật khẩu mới phải bao gồm ký tự đặc biệt',
  PASSWORD_COMPLEXITY:
    'Mật khẩu mới phải lớn hơn 8 ký tự, bao gồm chữ hoa, chữ thường, số và ký tự đặc biệt.',
  PASSWORD_MISMATCH: 'Xác nhận mật khẩu không khớp',
  CHANGE_PASSWORD_SUCCESS: 'Đổi mật khẩu thành công',
  CHANGE_PASSWORD_ERROR: 'Có lỗi xảy ra khi đổi mật khẩu. Vui lòng thử lại.',
} as const

/**
 * Validation schema for change password form
 *
 * Field names match API schema (snake_case):
 * - old_password, new_password, confirm_password
 */
const ChangePasswordSchema = z
  .object({
    old_password: z.string().min(1, ERROR_MESSAGES.CURRENT_PASSWORD_REQUIRED),
    new_password: z
      .string()
      .min(8, ERROR_MESSAGES.PASSWORD_MIN_LENGTH)
      .regex(/[A-Z]/, ERROR_MESSAGES.PASSWORD_UPPERCASE)
      .regex(/[a-z]/, ERROR_MESSAGES.PASSWORD_LOWERCASE)
      .regex(/[0-9]/, ERROR_MESSAGES.PASSWORD_DIGIT)
      .regex(/[^A-Za-z0-9]/, ERROR_MESSAGES.PASSWORD_SPECIAL_CHAR),
    confirm_password: z.string().min(1, ERROR_MESSAGES.NEW_PASSWORD_REQUIRED),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: ERROR_MESSAGES.PASSWORD_MISMATCH,
    path: ['confirm_password'],
  })

type ChangePasswordFormData = z.infer<typeof ChangePasswordSchema>

// Helper function to filter out "Required" error messages
const getErrorMessage = (errorMessage?: string) => {
  return errorMessage && errorMessage !== 'Required' ? errorMessage : undefined
}

export const ChangePasswordForm = () => {
  const navigate = useNavigate()
  const { mutate: changePassword, isPending } = useChangePassword()

  // Refs for password fields to handle focus after reveal
  const refCurrentPassword = useRef<TextFieldRef>(null)
  const refNewPassword = useRef<TextFieldRef>(null)
  const refConfirmPassword = useRef<TextFieldRef>(null)

  // AbortController for request cancellation
  const abortRef = useRef<AbortController | null>(null)

  // State for password visibility
  const [isRevealCurrentPwd, setIsRevealCurrentPwd] = useState(false)
  const [isRevealNewPwd, setIsRevealNewPwd] = useState(false)
  const [isRevealConfirmPwd, setIsRevealConfirmPwd] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    watch,
    trigger,
    formState: { errors },
    setError,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(ChangePasswordSchema),
    mode: 'onBlur', // Show errors on blur instead of onChange
  })

  // Watch new_password to trigger confirm_password validation
  const newPassword = watch('new_password')
  useEffect(() => {
    if (newPassword) {
      trigger('confirm_password')
    }
  }, [newPassword, trigger])

  const onSubmit = async (data: ChangePasswordFormData) => {
    // Create new AbortController for this request
    const abortController = new AbortController()
    abortRef.current = abortController

    // Data already matches API schema, no mapping needed
    const request = {
      old_password: data.old_password,
      new_password: data.new_password,
      confirm_password: data.new_password,
    }

    changePassword(request, {
      onSuccess: () => {
        abortRef.current = null // Clear controller after response
        toastService.success(ERROR_MESSAGES.CHANGE_PASSWORD_SUCCESS)
        navigate(-1) // Go back to previous page
      },
      onError: (err: any) => {
        abortRef.current = null // Clear controller after response
        // Don't show toast for aborted requests
        if (err?.name !== 'AbortError') {
          handleApiError(err, setError)
        }
      },
    })
  }

  // Handle page reload/tab close - abort in-flight request
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (abortRef.current) {
        abortRef.current.abort()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  // Handle component unmount - abort in-flight request
  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort()
      }
    }
  }, [])

  return (
    <>
      <Form loading={isPending} onSubmit={onSubmit} handleSubmit={handleSubmit}>
        <div className="flex w-full flex-col gap-15">
          {/* Form Fields */}
          <div className="flex flex-col gap-4">
            {/* Current Password Field */}
            <FormController
              register={register}
              name="old_password"
              control={control}
              Field={TextField}
              fieldProps={{
                ref: refCurrentPassword,
                label: 'Mật khẩu cũ',
                required: true,
                placeholder: 'Nhập mật khẩu',
                name: 'old_password',
                type: isRevealCurrentPwd ? 'text' : 'password',
                prefix: <IconLocksimple className="text-content-dark-1" />,
                suffix: (
                  <IconReveal
                    isReveal={isRevealCurrentPwd}
                    isLoading={isPending}
                    cbShow={() => {
                      setIsRevealCurrentPwd(true)
                      refCurrentPassword?.current?.focus()
                    }}
                    cbHide={() => {
                      setIsRevealCurrentPwd(false)
                    }}
                  />
                ),
                disabled: isPending,
                error: getErrorMessage(errors.old_password?.message), // Show error message on blur, but not "Required"
              }}
            />

            {/* New Password Field */}
            <FormController
              register={register}
              name="new_password"
              control={control}
              Field={TextField}
              fieldProps={{
                ref: refNewPassword,
                label: 'Mật khẩu mới',
                required: true,
                placeholder: 'Nhập mật khẩu',
                name: 'new_password',
                type: isRevealNewPwd ? 'text' : 'password',
                prefix: <IconLocksimple className="text-content-dark-1" />,
                suffix: (
                  <IconReveal
                    isReveal={isRevealNewPwd}
                    isLoading={isPending}
                    cbShow={() => {
                      setIsRevealNewPwd(true)
                      refNewPassword?.current?.focus()
                    }}
                    cbHide={() => {
                      setIsRevealNewPwd(false)
                    }}
                  />
                ),
                caption: ERROR_MESSAGES.PASSWORD_COMPLEXITY,
                disabled: isPending,
                error: getErrorMessage(errors.new_password?.message), // Show error message on blur, but not "Required"
              }}
            />

            {/* Confirm Password Field */}
            <FormController
              register={register}
              name="confirm_password"
              control={control}
              Field={TextField}
              fieldProps={{
                ref: refConfirmPassword,
                label: 'Nhập lại mật khẩu mới',
                required: true,
                placeholder: 'Nhập mật khẩu',
                name: 'confirm_password',
                type: isRevealConfirmPwd ? 'text' : 'password',
                prefix: <IconLocksimple className="text-content-dark-1" />,
                suffix: (
                  <IconReveal
                    isReveal={isRevealConfirmPwd}
                    isLoading={isPending}
                    cbShow={() => {
                      setIsRevealConfirmPwd(true)
                      refConfirmPassword?.current?.focus()
                    }}
                    cbHide={() => {
                      setIsRevealConfirmPwd(false)
                    }}
                  />
                ),
                disabled: isPending,
                error: getErrorMessage(errors.confirm_password?.message), // Show error message on blur, but not "Required"
              }}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4">
            <Button
              type="submit"
              variant="primary"
              size="large"
              loading={isPending}
              disabled={isPending}
              className="w-[150px]"
            >
              Lưu
            </Button>
          </div>
        </div>
      </Form>
    </>
  )
}

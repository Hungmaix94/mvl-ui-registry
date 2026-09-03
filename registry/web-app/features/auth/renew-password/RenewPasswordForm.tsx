import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flex, Text } from '@radix-ui/themes'
import { cn } from '@/utils'
import { Button, TextField } from '@/components/ui'
import { IconCheckcircle, IconLocksimple } from '@/assets/icons'
import { useForgotPasswordChangePassword } from '@/services/auth-service'
import { APP_PATH } from '@/routes'
import { z } from 'zod'
import { IconReveal } from '@/components/ui/icon/IconReveal.tsx'
import { handleApiError } from '@/utils/error-utils.ts'

/**
 * Validation schema for renew password form
 *
 * Field names match API schema (snake_case):
 * - new_password, confirm_password
 */
const Schema = z
  .object({
    new_password: z.string().min(8, 'Mật khẩu cần tối thiểu 8 kí tự'),
    confirm_password: z.string().min(8, 'Cần nhập lại mật khẩu mới'),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'Mật khẩu không trùng khớp',
    path: ['confirm_password'],
  })

function RenewPasswordForm() {
  const navigate = useNavigate()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isRevealPwd, setIsRevealPwd] = useState(false)
  const [isRevealNewPwd, setIsRevealNewPwd] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})

  const [isCompleted, setIsCompleted] = useState<boolean>(false)

  const renewPasswordMutation = useForgotPasswordChangePassword()

  const isLoading = renewPasswordMutation.isPending

  const handleSubmit = async () => {
    // Prevent double submission - check both isLoading and isPending
    if (isLoading || renewPasswordMutation.isPending || isCompleted) {
      return
    }

    try {
      // Validate form data with Zod (field names already match API)
      const formData = { new_password: newPassword, confirm_password: confirmPassword }
      const validatedData = Schema.parse(formData)

      // Clear any previous errors
      setErrors({})

      // Call renew password API - data already matches API schema
      const result = await renewPasswordMutation.mutateAsync({
        new_password: validatedData.new_password,
        confirm_password: validatedData.confirm_password,
      })

      // Only set completed if mutation was successful
      if (result) {
        setIsCompleted(true)
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        const fieldErrors: Record<string, string> = {}
        error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0] as string] = err.message
          }
        })
        setErrors(fieldErrors)
      } else {
        // Handle API errors - check for field-specific errors
        const apiError = error as any

        // Try to extract error data from various possible structures
        let errorData = null

        // Check if error object itself contains field errors (direct structure)
        if (apiError && typeof apiError === 'object' && !apiError.message) {
          const hasFieldErrors = Object.keys(apiError).some(
            (key) =>
              ['new_password', 'confirm_password', 'non_field_errors'].includes(key) &&
              Array.isArray(apiError[key])
          )
          if (hasFieldErrors) {
            errorData = apiError
          }
        }

        // Try nested structures if direct check didn't work
        if (!errorData) {
          if (apiError?.server) {
            errorData = apiError.server
          } else if (apiError?.response?.data?.error) {
            errorData = apiError.response.data.error
          } else if (apiError?.response?.data) {
            errorData = apiError.response.data
          } else if (apiError?.error) {
            errorData = apiError.error
          } else if (apiError?.data?.error) {
            errorData = apiError.data.error
          }
        }

        // Check if we have field-level validation errors
        if (errorData && typeof errorData === 'object') {
          const fieldErrors: Record<string, string> = {}

          // Extract field errors from API response - field names already match
          Object.keys(errorData).forEach((field) => {
            const messages = errorData[field]
            if (Array.isArray(messages) && messages.length > 0) {
              if (field === 'non_field_errors') {
                // Handle general errors
                fieldErrors['general'] = messages[0]
              } else {
                // Handle field-specific errors - no mapping needed
                fieldErrors[field] = messages[0]
              }
            }
          })

          if (Object.keys(fieldErrors).length > 0) {
            setErrors(fieldErrors)
            return // Exit early, don't call handleApiError
          }
        }

        // Fallback to general error handler
        handleApiError(error)
      }
    }
  }

  const handleBackToLogin = () => {
    navigate(APP_PATH.LOGIN)
  }

  if (isCompleted) {
    return (
      <>
        <Flex direction={'column'} gap={'8'}>
          <Flex direction={'column'} align={'start'} gap={'3'}>
            <IconCheckcircle color={'var(--color-action-primary-red-default)'} size={80} />

            <Flex direction={'column'} gap={'4'}>
              <Text className={'typo-h3 text-content-dark-1'}>Hoàn tất đổi mật khẩu</Text>

              <Text className={'typo-body-base-medium text-content-dark-2'}>
                <span>Tạo mật khẩu mới thành công!</span>
                <br />
                <span>Bạn có thể tiếp tục đăng nhập.</span>
              </Text>
            </Flex>
          </Flex>

          <Button variant={'primary'} size={'large'} onClick={() => navigate(APP_PATH.LOGIN)}>
            Đăng nhập
          </Button>
        </Flex>
      </>
    )
  }

  return (
    <Flex direction={'column'} gap={'6'}>
      {/* Title */}
      <Flex direction={'column'} gap={'3'} align={'start'}>
        <Text className={'typo-h3 text-content-dark-1'}>Tạo mật khẩu mới</Text>
        <Text className={'typo-body-base-medium text-content-dark-2'}>
          Vui lòng nhập mật khẩu mới cho tài khoản của bạn.
        </Text>
        <ul className={cn('list-disc', 'text-content-dark-2', 'typo-body-base-medium')}>
          <Text className={cn('typo-body-base-medium', 'text-content-dark-2')}>Gợi ý bảo mật:</Text>
          <li className={'ml-4'}>Ít nhất 8 ký tự</li>
          <li className={'ml-4'}>Bao gồm chữ hoa, chữ thường và số</li>
        </ul>
      </Flex>

      {/* Form */}
      <Flex direction={'column'} gap={'4'}>
        <TextField
          label="Mật khẩu mới"
          required
          placeholder="Nhập mật khẩu mới"
          value={newPassword}
          onChange={setNewPassword}
          type={isRevealPwd ? 'text' : 'password'}
          prefix={<IconLocksimple className={'text-content-dark-1'} />}
          suffix={
            <IconReveal
              isLoading={isLoading}
              isReveal={isRevealPwd}
              cbShow={() => setIsRevealPwd(true)}
              cbHide={() => setIsRevealPwd(false)}
            />
          }
          disabled={renewPasswordMutation.isPending}
          error={errors.new_password}
        />

        <TextField
          label="Xác nhận mật khẩu"
          required
          placeholder="Nhập lại mật khẩu mới"
          value={confirmPassword}
          onChange={setConfirmPassword}
          type={isRevealNewPwd ? 'text' : 'password'}
          prefix={<IconLocksimple className={'text-content-dark-1'} />}
          suffix={
            <IconReveal
              isLoading={isLoading}
              isReveal={isRevealNewPwd}
              cbShow={() => setIsRevealNewPwd(true)}
              cbHide={() => setIsRevealNewPwd(false)}
            />
          }
          disabled={renewPasswordMutation.isPending}
          error={errors.confirm_password}
        />

        {/* General error message */}
        {errors.general && (
          <Text className={'typo-body-base-sm text-data-red-default'}>{errors.general}</Text>
        )}

        <Flex gap={'4'}>
          <Button
            type="button"
            variant={'secondary'}
            size={'large'}
            onClick={handleBackToLogin}
            disabled={renewPasswordMutation.isPending}
            className={'flex-1'}
          >
            Huỷ
          </Button>

          <Button
            variant={'primary'}
            size={'large'}
            disabled={
              !newPassword.trim() || !confirmPassword.trim() || renewPasswordMutation.isPending
            }
            loading={renewPasswordMutation.isPending}
            className={'flex-1'}
            onClick={handleSubmit}
          >
            {renewPasswordMutation.isPending ? (
              <>
                Đang cập nhật
                <span className={'dot-loader'} />
              </>
            ) : (
              'Lưu mật khẩu'
            )}
          </Button>
        </Flex>
      </Flex>
    </Flex>
  )
}

export default RenewPasswordForm

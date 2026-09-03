import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flex, Text } from '@radix-ui/themes'
import { cn } from '@/utils'
import { Button, TextField } from '@/components/ui'
import { IconUser } from '@/assets/icons'
import { PasswordResetResponse, useForgotPassword } from '@/services/auth-service'
import { APP_PATH } from '@/routes'
import OtpForm from '@/features/auth/otp/OtpForm.tsx'
import { handleApiError } from '@/utils/error-utils.ts'

function ForgotPasswordForm() {
  const navigate = useNavigate()
  const [emailOrPhone, setEmailOrPhone] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>('')

  const [forgotPasswordResponse, setForgotPasswordResponse] = useState<
    PasswordResetResponse | undefined
  >(undefined)

  const forgotPasswordMutation = useForgotPassword()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!emailOrPhone.trim()) return

    setErrorMessage('')

    try {
      const response = await forgotPasswordMutation.mutateAsync({
        identifier: emailOrPhone.trim(),
      })

      if (response) {
        // refresh token is get from here
        setForgotPasswordResponse(response)
      }

      setIsSuccess(true)
    } catch (error: any) {
      // Extract error message from API response
      console.log('Forgot password error:', error)

      // The error structure is: error.non_field_errors (array)
      if (error?.non_field_errors && Array.isArray(error.non_field_errors)) {
        setErrorMessage(error.non_field_errors[0])
      } else if (error?.error?.non_field_errors && Array.isArray(error.error.non_field_errors)) {
        setErrorMessage(error.error.non_field_errors[0])
      } else {
        handleApiError(error)
      }
    }
  }

  const handleBackToLogin = () => {
    navigate(APP_PATH.LOGIN)
  }

  if (isSuccess) {
    return (
      <OtpForm
        forgotPasswordResponse={forgotPasswordResponse}
        forgotPasswordIdentifier={emailOrPhone.trim()}
      />
    )
  }

  return (
    <Flex direction={'column'} gap={'6'}>
      {/* Title */}
      <Flex direction={'column'} gap={'3'} align={'start'}>
        <Text className={cn('typo-h3 text-content-dark-1')}>Quên mật khẩu</Text>
        <Text className={'typo-body-base-medium text-content-dark-2'}>
          Vui lòng nhập <b>Email hoặc Số điện thoại đã đăng ký</b> để lấy lại mật khẩu.
          <br />
          Chúng tôi sẽ gửi mã xác thực OTP để bạn đặt lại mật khẩu mới.
        </Text>
      </Flex>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Flex direction={'column'} gap={'4'}>
          <TextField
            label="Email/Số điện thoại"
            required
            placeholder="Nhập email hoặc số điện thoại"
            value={emailOrPhone}
            onChange={setEmailOrPhone}
            type="text"
            prefix={<IconUser className={'text-content-dark-1'} />}
            disabled={forgotPasswordMutation.isPending}
            error={errorMessage}
          />

          <Flex gap={'4'}>
            <Button
              type="button"
              variant={'secondary'}
              size={'large'}
              onClick={handleBackToLogin}
              disabled={forgotPasswordMutation.isPending}
              className={'flex-1'}
            >
              Huỷ
            </Button>

            <Button
              type="submit"
              variant={'primary'}
              size={'large'}
              disabled={!emailOrPhone.trim() || forgotPasswordMutation.isPending}
              loading={forgotPasswordMutation.isPending}
              className={'flex-1'}
            >
              {forgotPasswordMutation.isPending ? (
                <>
                  Đang gửi
                  <span className={'dot-loader'} />
                </>
              ) : (
                'Gửi mã xác nhận'
              )}
            </Button>
          </Flex>
        </Flex>
      </form>
    </Flex>
  )
}

export default ForgotPasswordForm

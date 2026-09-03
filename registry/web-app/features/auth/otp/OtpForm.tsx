/**
 * OTP Form Component
 *
 * NOTE: This component is currently DISABLED in the new login flow.
 * Login now returns tokens directly without requiring OTP verification.
 *
 * This file is preserved for future use if business logic changes and OTP flow needs to be re-enabled.
 *
 * To re-enable OTP flow:
 * 1. Uncomment the OTP route in src/routes/AppRoute.tsx
 * 2. Update auth-service.ts login() method to return LoginResponse instead of tokens
 * 3. Re-enable verifyOtp() method in auth-service.ts
 * 4. Update useAuthOperations() in src/hooks/useAuth.ts to navigate to OTP page after login
 * 5. Update API schema if OTP endpoints are re-added
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flex, Text } from '@radix-ui/themes'
import { cn } from '@/utils'
import { Button, InputOtp } from '@/components/ui'
import { useAuth } from '@/hooks/useAuth'
import { APP_PATH } from '@/routes'
import { z } from 'zod'
// import { LOCAL_STORAGE_KEY } from '@/constants' // Not used
import { InputOtpRef } from '@/components/ui/input-otp/InputOtp'
import {
  useVerifyOtp,
  // OTPVerificationRequest,
  useForgotPasswordVerifyOtp,
  PasswordResetOTPVerificationRequest,
  PasswordResetResponse,
  useForgotPassword,
  getAuthService,
} from '@/services/auth-service'
import { storeAuthData, clearAuthFlowInProgress, type TokenData } from '@/utils'
import { tokenManager } from '@/services/token-manager'
import { TOKEN_CONFIG } from '@/constants'
import { useOtpCountdown } from '@/hooks/useOtpCountdown'
import { handleApiError } from '@/utils/error-utils.ts'

// const VerifyOTPSchema = z.object({
//   username: z.string().min(1, 'Username is required'),
//   otp_code: z.string().length(6, 'OTP must be exactly 6 digits'),
//   device_id: z.string().optional(),
// }) satisfies z.ZodType<OTPVerificationRequest>

const VerifyOTPForgotPasswordSchema = z.object({
  otp_code: z.string().length(6, 'OTP must be exactly 6 digits'),
  reset_token: z.string(),
}) satisfies z.ZodType<PasswordResetOTPVerificationRequest>

type OtpFormProps = {
  forgotPasswordResponse?: PasswordResetResponse
  forgotPasswordIdentifier?: string
}

function OtpForm({ forgotPasswordResponse, forgotPasswordIdentifier }: OtpFormProps) {
  const refBtnConfirm = useRef<HTMLButtonElement>(null)
  const refInputOtp = useRef<InputOtpRef>(null)
  const navigate = useNavigate()

  const { logout, user, tempLoginCredentials, clearTempLoginCredentials } = useAuth()

  const [otpValue, setOtpValue] = useState<string[]>([])
  const [hasError, setHasError] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [currentResetToken, setCurrentResetToken] = useState<string | undefined>(
    forgotPasswordResponse?.reset_token
  )

  // API mutations
  const verifyOTPMutation = useVerifyOtp()
  const verifyOTPForgotPasswordMutation = useForgotPasswordVerifyOtp()
  const forgotPasswordMutation = useForgotPassword()

  // Determine flow type and current credential for countdown
  const flowType = forgotPasswordResponse ? 'forgot-password' : 'login'
  const currentCredential = forgotPasswordResponse
    ? forgotPasswordIdentifier || ''
    : tempLoginCredentials?.username || ''

  // OTP countdown hook
  const { remainingSeconds, isCountdownActive, startCountdown, clearCountdown, formattedTime } =
    useOtpCountdown(flowType, currentCredential)

  // Focus first OTP input when component mounts
  useEffect(() => {
    focusFirstOtpInput()
  }, [])

  // Cleanup countdown on unmount only (not credentials - they're cleared on verify/cancel)
  useEffect(() => {
    return () => {
      // Only clear countdown, NOT credentials
      // Credentials are cleared explicitly in handleVerify success and handleCancel
      clearCountdown()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Loading state
  const isLoading =
    verifyOTPMutation.isPending ||
    verifyOTPForgotPasswordMutation.isPending ||
    forgotPasswordMutation.isPending

  // Helper function to focus on a specific OTP input by index
  const focusOtpInputByIndex = (index: number) => {
    setTimeout(() => {
      refInputOtp.current?.focusInputByIndex(index)
    }, 100) // Increased timeout to ensure DOM is ready
  }

  const focusFirstOtpInput = () => {
    focusOtpInputByIndex(0)
  }

  const focusLastOtpInput = () => {
    focusOtpInputByIndex(5)
  }

  const handleOtpChange = (value: string[]) => {
    setOtpValue(value)
    setHasError(false)
    setIsValid(false)

    // Auto-focus confirm button when all 6 digits are filled and not empty
    if (value.every((digit) => digit !== '' && digit !== undefined)) {
      setTimeout(() => {
        refBtnConfirm.current?.focus()
      }, 0)
    }
  }

  const handleVerify = async () => {
    if (isLoading) {
      return
    }

    try {
      const otpString = otpValue.join('')

      // Forgot password flow (no user logged in)
      if (forgotPasswordResponse) {
        const formData: PasswordResetOTPVerificationRequest = {
          otp_code: otpString,
          reset_token: currentResetToken || forgotPasswordResponse.reset_token,
        }
        const validatedData = VerifyOTPForgotPasswordSchema.parse(formData)

        const result = await verifyOTPForgotPasswordMutation.mutateAsync(validatedData)

        if (result) {
          // Lưu tokens để sử dụng cho bước change-password
          if (result.tokens) {
            const tokenData: TokenData = {
              accessToken: result.tokens.access,
              refreshToken: result.tokens.refresh,
              expiresIn: Date.now() + TOKEN_CONFIG.DEFAULT_EXPIRY,
              tokenType: 'Bearer',
            }
            // Lưu với user = null vì chưa có thông tin user
            storeAuthData(null, tokenData)
            tokenManager.resetRefreshAuthFailure()
          }

          setIsValid(true)
          setHasError(false)

          // Cleanup
          clearCountdown()

          // Navigate to renew password form
          navigate(APP_PATH.LOGIN_RENEW_PASSWORD)
        } else {
          setHasError(true)
          setIsValid(false)
          focusLastOtpInput()
        }
      }
      // NORMAL LOGIN FLOW
      else if (user?.username) {
        // NOTE: uncomment OTP for OTP feature
        // Use regular verifyOTP API for normal login flow
        // const formData = {
        //   username: user.username,
        //   otp_code: otpString,
        // }
        // const validatedData = VerifyOTPSchema.parse(formData)
        // const result = await verifyOTPMutation.mutateAsync(validatedData)
        // if (result) {
        //   setIsValid(true)
        //   setHasError(false)
        //
        //   // Cleanup
        //   clearTempLoginCredentials()
        //   clearCountdown()
        //   clearAuthFlowInProgress() // Clear auth flow flag after successful OTP verification
        //
        //   // Handle successful verification - navigate to dashboard
        //   navigate('/')
        // } else {
        //   setHasError(true)
        //   setIsValid(false)
        //   focusLastOtpInput()
        // }
      } else {
        throw new Error('No username found')
      }
    } catch (error) {
      setHasError(true)
      setIsValid(false)
      handleApiError(error)
      focusLastOtpInput()
    }
  }

  const handleCancel = async () => {
    if (isLoading) return

    // Only clear temp credentials, NOT countdown
    // Countdown will persist and be validated on next login based on username
    clearTempLoginCredentials()
    clearAuthFlowInProgress() // Clear auth flow flag when cancelling

    // Logout user and navigate to login
    await logout()
    navigate(APP_PATH.LOGIN)
  }

  const handleResend = async () => {
    if (isLoading || isResending) return

    try {
      setIsResending(true)
      setOtpValue([])
      setHasError(false)
      setIsValid(false)

      if (forgotPasswordResponse && forgotPasswordIdentifier) {
        // Forgot password flow - resend OTP
        const result = await forgotPasswordMutation.mutateAsync({
          identifier: forgotPasswordIdentifier,
        })

        if (result.reset_token) {
          setCurrentResetToken(result.reset_token)
        }

        startCountdown()
      } else if (tempLoginCredentials) {
        // Login flow - resend OTP
        // Use direct API call to avoid side effects from useLogin hook
        await getAuthService().login(tempLoginCredentials)
        startCountdown()
      }
    } catch (error) {
      // Clear countdown on error, cho phép retry ngay
      clearCountdown()
      handleApiError(error)
    } finally {
      setIsResending(false)
      // Focus first input after resending OTP
      focusFirstOtpInput()
    }
  }

  return (
    <Flex direction={'column'} gap={'6'}>
      {/* Title */}
      <Flex direction={'column'} gap={'3'} align={'start'}>
        <Text className={cn('typo-h3', 'text-content-dark-1')}>Nhập mã OTP</Text>
        <Text className={'typo-body-base-medium text-content-dark-2'}>
          {forgotPasswordResponse ? (
            <>
              Chúng tôi đã gửi một mã xác thực gồm 6 chữ số đến:
              <br />
              <b>{forgotPasswordResponse.email_hint}</b>
              <br />
              Vui lòng nhập mã này để xác thực và đặt lại mật khẩu mới.
            </>
          ) : (
            <>
              Chúng tôi đã gửi một mã xác thực gồm 6 chữ số đến email của bạn.
              <br />
              Vui lòng nhập mã này để tiếp tục đăng nhập vào hệ thống.
            </>
          )}
        </Text>
      </Flex>

      {/* OTP Input */}
      <Flex direction={'column'} align={{ initial: 'center', md: 'start' }} gap={'2'}>
        <InputOtp
          ref={refInputOtp}
          value={otpValue}
          onChange={handleOtpChange}
          length={6}
          error={hasError}
          isValid={isValid}
          disabled={isLoading}
          autoFocus
          className={'w-full justify-between'}
        />
        {hasError && (
          <Text className={'text-data-red-default typo-body-sm'}>
            Mã OTP không chính xác. Vui lòng thử lại.
          </Text>
        )}
      </Flex>

      {/*Buttons*/}
      <Flex align={'center'} justify={'between'} gap={'3'}>
        <Button
          onClick={handleCancel}
          variant={'secondary'}
          disabled={isLoading}
          className={'flex-1'}
        >
          Huỷ
        </Button>
        <Button
          ref={refBtnConfirm}
          variant={'primary'}
          onClick={handleVerify}
          disabled={
            otpValue.length !== 6 ||
            !otpValue.every((digit) => digit !== '' && digit !== undefined) ||
            isLoading
          }
          loading={verifyOTPMutation.isPending}
          className={'flex-1'}
        >
          {verifyOTPMutation.isPending ? (
            <>
              Đang xác thực
              <span className={'dot-loader'} />
            </>
          ) : (
            'Xác thực'
          )}
        </Button>
      </Flex>

      {/*Resend message*/}
      <Flex align={'center'} justify={'center'} gap={'1'}>
        {isResending ? (
          <Text className={'typo-body-base-medium text-content-dark-2'}>
            Đang gửi
            <span className={'dot-loader'} />
          </Text>
        ) : isCountdownActive && remainingSeconds > 0 ? (
          <>
            <Text className={'typo-body-base-medium text-content-dark-2'}>Không nhận được mã?</Text>
            <Text className={'typo-body-base-medium text-content-dark-2'}>Gửi lại mã sau</Text>
            <Text className={'typo-body-base-medium text-action-primary-red-default'}>
              {formattedTime}
            </Text>
          </>
        ) : (
          <>
            <Text className={'typo-body-base-medium text-content-dark-2'}>Không nhận được mã?</Text>
            <Button
              variant={'link'}
              onClick={handleResend}
              disabled={isLoading}
              className={cn(
                'text-action-primary-red-default',
                'hover:text-action-primary-red-hover hover:!no-underline',
                'focus:text-action-primary-red-focus'
              )}
            >
              Gửi lại mã
            </Button>
          </>
        )}
      </Flex>
    </Flex>
  )
}

export default OtpForm

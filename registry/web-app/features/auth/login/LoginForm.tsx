import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import Form from '@/components/ui/form/Form.tsx'
import { useAuthOperations } from '@/hooks/useAuth.ts'
import { LoginRequest } from '@/services/auth-service.ts'
import FormController from '@/components/ui/form/FormController.tsx'
import { Button, TextField } from '@/components/ui'
import { Flex, Text } from '@radix-ui/themes'
import { cn } from '@/utils'
import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { IconLocksimple, IconUser } from '@/assets/icons'
import { TextFieldRef } from '@/components/ui/text-field/TextField.tsx'
import { IconReveal } from '@/components/ui/icon/IconReveal.tsx'

const Schema = z.object({
  username: z.string().min(1, 'Không được để trống'),
  password: z.string().min(1, 'Không được để trống'),
}) satisfies z.ZodType<LoginRequest>

// Preserve form values across component remounts
let preservedFormValues: LoginRequest = { username: '', password: '' }

const LoginForm = () => {
  const refPassword = useRef<TextFieldRef>(null)
  const navigate = useNavigate()

  const { login, isLoading, error } = useAuthOperations()

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isDirty, isValid },
  } = useForm<LoginRequest>({
    resolver: zodResolver(Schema),
    defaultValues: preservedFormValues,
  })

  const [isRevealPwd, setIsRevealPwd] = useState<boolean>(false)

  // Preserve form values across remounts
  const watchedValues = watch()
  useEffect(() => {
    preservedFormValues = {
      username: watchedValues.username || '',
      password: watchedValues.password || '',
    }
  }, [watchedValues.username, watchedValues.password])

  const onSubmit = async (data: LoginRequest) => {
    // NOTE: OTP flow is disabled - login returns tokens directly
    // Temp credentials are no longer needed, but kept for backward compatibility
    await login(data)
  }

  const handleForgotPassword = () => {
    navigate('/login/forgot-password')
  }

  return (
    <>
      <Form loading={isLoading} onSubmit={onSubmit} handleSubmit={handleSubmit}>
        <Flex direction={'column'} gap={'7'} justify={'between'}>
          <Flex direction={'column'} gap={'3'}>
            <Text className="typo-h3 text-content-dark-1">Đăng nhập</Text>
            <Text className={'typo-body-base-medium text-content-dark-2'}>
              Vui lòng nhập thông tin tài khoản để tiếp tục.
            </Text>
          </Flex>

          <Flex direction="column" gap={'4'}>
            <FormController
              register={register}
              name={'username'}
              control={control}
              Field={TextField}
              fieldProps={{
                label: 'Tên đăng nhập',
                required: true,
                placeholder: 'Nhập tên đăng nhập',
                autoFocus: true,
                autoComplete: 'username',
                name: 'username',
                type: 'text',
                prefix: <IconUser className={'text-content-dark-1'} />,
                error: !!error,
                disabled: isLoading,
              }}
            />

            <FormController
              register={register}
              name={'password'}
              control={control}
              Field={TextField}
              fieldProps={{
                ref: refPassword,
                label: 'Password',
                required: true,
                placeholder: '',
                name: 'password',
                type: isRevealPwd ? 'text' : 'password',
                autoComplete: 'current-password',
                prefix: <IconLocksimple className={'text-content-dark-1'} />,
                suffix: (
                  <>
                    <IconReveal
                      isReveal={isRevealPwd}
                      isLoading={isLoading}
                      cbShow={() => {
                        setIsRevealPwd(true)
                        refPassword?.current?.focus()
                      }}
                      cbHide={() => {
                        setIsRevealPwd(false)
                      }}
                    />
                  </>
                ),
                error: errors.password?.message ?? (error || undefined),
                disabled: isLoading,
              }}
            />
          </Flex>

          <Flex direction={'column'} gap={'4'}>
            <Button
              type="submit"
              variant={'primary'}
              size={'large'}
              disabled={isDirty && !isValid}
              loading={isLoading}
            >
              Đăng nhập
            </Button>
            {/* Button forgot password */}
            <Button
              type="button"
              variant={'link'}
              size={'small'}
              disabled={isLoading}
              onClick={handleForgotPassword}
              className={cn(
                'h-5',
                'text-action-primary-red-default',
                'hover:text-action-primary-red-hover hover:!no-underline',
                'focus:text-action-primary-red-focus',
                'disabled:no-underline'
              )}
            >
              Quên mật khẩu?
            </Button>
          </Flex>
        </Flex>
      </Form>
    </>
  )
}

export default LoginForm

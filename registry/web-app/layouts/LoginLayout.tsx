import { Outlet } from 'react-router-dom'
import { Box, Flex, Text } from '@radix-ui/themes'
import Logo from '@/assets/svg/logo.tsx'
import { cn } from '@/utils'
import { Fragment, Suspense } from 'react'
import LogoContainer from '@/components/LogoContainer.tsx'
import { Loading } from '@/components/Loading.tsx'

function LoginLayout() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LogoContainer>
        <Flex direction={'row'} align={'center'} className={cn('h-full min-h-0 w-full')}>
          {/* Left Panel - Branding - Hidden on small screens */}
          <Flex
            display={{ initial: 'none', md: 'flex' }}
            className={cn(
              'flex-1',
              'h-full',
              'pl-4 sm:pl-8 md:pl-12 lg:pl-16 xl:pl-20',
              'pr-4 sm:pr-8 md:pr-0'
            )}
            direction={'column'}
            justify={'center'}
          >
            <Flex direction={'column'} justify={'between'} className={'h-[50%]'}>
              <Fragment>&nbsp;</Fragment>

              <Flex
                direction={'column'}
                gap={{ initial: '3', sm: '4', md: '5' }}
                justify={'center'}
                align={'start'}
                className={cn('h-full')}
              >
                <Text
                  className={cn(
                    'text-2xl sm:text-3xl md:text-4xl lg:text-[40px]',
                    'text-content-light-1',
                    'font-bold',
                    'font-family-inter',
                    'uppercase',
                    'leading-tight'
                  )}
                >
                  mai viet land
                </Text>
                <Text
                  className={cn(
                    'text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl',
                    'text-content-light-2',
                    'font-family-inter',
                    'uppercase',
                    'leading-tight'
                  )}
                >
                  Sàn giao dịch bất động sản xuất sắc 2022
                </Text>
              </Flex>

              <Text
                className={cn('text-sm sm:text-base md:text-lg', 'text-action-primary-red-focus')}
              >
                maivietland.vn
              </Text>
            </Flex>
          </Flex>

          {/* Right Panel - Form */}
          <Box
            className={cn(
              'flex-1',
              'w-full',
              'p-2 sm:p-4 md:p-8 lg:p-10 xl:p-14',
              'h-full',
              'overflow-auto',
              '!flex items-center justify-center md:!block'
            )}
          >
            <Flex
              direction={'column'}
              justify={{ initial: 'center', md: 'between' }}
              className={cn(
                'overflow-y-auto rounded-lg',
                'bg-[var(--color-background-1)]',
                'h-full',
                'max-h-[calc(100vh-2rem)] md:max-h-[min(904px,calc(100vh-4rem))]',
                'md:min-h-[400px]',
                'mx-auto w-full',
                'max-w-[350px] sm:max-w-[400px] md:max-w-[600px] lg:max-w-[705px]',
                'p-4 sm:p-6 md:p-12 lg:p-16'
              )}
            >
              <div className="hidden md:block">
                <Logo />
              </div>

              <Suspense
                fallback={
                  <div className="flex min-h-[300px] flex-1 items-center justify-center">
                    <Loading size="lg" message="Đang tải..." />
                  </div>
                }
              >
                <Outlet />
              </Suspense>
              <Fragment>&nbsp;</Fragment>
            </Flex>
          </Box>
        </Flex>
      </LogoContainer>
    </div>
  )
}

export default LoginLayout

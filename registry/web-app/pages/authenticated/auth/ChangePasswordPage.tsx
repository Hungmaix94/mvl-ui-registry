import { ChangePasswordForm } from '@/features/auth/change-password/ChangePasswordForm.tsx'
import { Container } from '@radix-ui/themes'
import { PageTitle } from '@/components/ui'

const ChangePasswordPage = () => {
  return (
    <>
      <PageTitle />

      <Container pt={'20px'} className={'px-10'}>
        <ChangePasswordForm />
      </Container>
    </>
  )
}

export default ChangePasswordPage

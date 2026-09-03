import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageLoading } from '@/components/Loading'

type IndexRedirectProps = {
  redirectTo: string
}

export default function IndexRedirect({ redirectTo }: IndexRedirectProps) {
  const navigate = useNavigate()

  useEffect(() => {
    navigate(redirectTo, { replace: true })
  }, [navigate, redirectTo])

  return <PageLoading />
}

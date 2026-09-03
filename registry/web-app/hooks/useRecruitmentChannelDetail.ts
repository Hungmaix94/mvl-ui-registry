import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  useRecruitmentChannel,
  type RecruitmentChannel,
} from '@/features/recruitment/services/recruitment-channel-service'
import { isNotFoundError } from '@/utils/error-utils'

type UseRecruitmentChannelDetailReturn = {
  channel: RecruitmentChannel | null
  isLoading: boolean
  error: Error | null
  isNotFound: boolean
  isError: boolean
  channelId: number
}

/**
 * Custom hook to fetch and manage recruitment channel detail data
 * Extracts channelId from URL params and fetches channel data using the HRM service
 *
 * @returns Recruitment channel detail data with loading, error, and not found states
 */
export const useRecruitmentChannelDetail = (): UseRecruitmentChannelDetailReturn => {
  const { id } = useParams<{ id: string }>()
  const channelId = Number(id)

  // Fetch recruitment channel data using the HRM service hook
  const { data: channelResponse, isLoading, error } = useRecruitmentChannel(channelId)

  // Extract channel data from response
  const channel = useMemo(() => {
    return channelResponse && Object.keys(channelResponse).length > 0
      ? (channelResponse as RecruitmentChannel)
      : null
  }, [channelResponse])

  // Determine if channel was not found (404 error or no data)
  const isNotFound = useMemo(() => {
    if (isLoading) return false
    if (error && isNotFoundError(error)) return true
    return !channel
  }, [isLoading, error, channel])

  // Determine if there's a non-404 error
  const isError = useMemo(() => {
    if (isLoading || !error) return false
    return !isNotFoundError(error)
  }, [isLoading, error])

  return {
    channel,
    isLoading,
    error: error as Error | null,
    isNotFound,
    isError,
    channelId,
  }
}

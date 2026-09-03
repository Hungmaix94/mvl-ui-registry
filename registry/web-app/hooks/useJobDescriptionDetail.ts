import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import {
  useJobDescription,
  type JobDescription,
} from '@/features/recruitment/services/job-description-service'

type UseJobDescriptionDetailReturn = {
  jobDescription: JobDescription | null
  isLoading: boolean
  error: Error | null
  isNotFound: boolean
  jobDescriptionId: number
}

/**
 * Custom hook to fetch and manage job description detail data
 * Extracts jobDescriptionId from URL params and fetches job description data using the HRM service
 *
 * @returns Job description detail data with loading, error, and not found states
 */
export const useJobDescriptionDetail = (): UseJobDescriptionDetailReturn => {
  const { id } = useParams<{ id: string }>()
  const jobDescriptionId = Number(id)

  // Fetch job description data using the HRM service hook
  const { data: jobDescriptionResponse, isLoading, error } = useJobDescription(jobDescriptionId)

  // Extract job description data from response
  const jobDescription = useMemo(() => jobDescriptionResponse || null, [jobDescriptionResponse])

  // Determine if job description was not found
  const isNotFound = useMemo(() => {
    return !isLoading && !error && !jobDescription
  }, [isLoading, error, jobDescription])

  return {
    jobDescription,
    isLoading,
    error: error as Error | null,
    isNotFound,
    jobDescriptionId,
  }
}

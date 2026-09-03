import { useCallback, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  getRecruitmentCandidateService,
  type GetRecruitmentCandidatesParams,
  type RecruitmentCandidate,
  type RecruitmentCandidateDropdown,
} from '@/features/recruitment/services/recruitment-candidate-service'
import { QUERY_KEYS } from '@/constants'
import { PAGE_SIZE } from '../constants/table.ts'
import type {
  LoadOptionsParams,
  LoadOptionsResult,
  SelectOption,
} from '../ui/select/Select.tsx'

type UseRecruitmentCandidateSelectOptions = {
  pageSize?: number
  additionalParams?: GetRecruitmentCandidatesParams | (() => GetRecruitmentCandidatesParams)
}

export function useRecruitmentCandidateSelect(options: UseRecruitmentCandidateSelectOptions = {}) {
  const { pageSize = PAGE_SIZE, additionalParams } = options
  const queryClient = useQueryClient()
  const dropdownCacheRef = useRef<Map<number, RecruitmentCandidateDropdown>>(new Map())

  const getCachedCandidateById = useCallback(
    (id: number): RecruitmentCandidateDropdown | undefined => {
      return dropdownCacheRef.current.get(id)
    },
    []
  )

  const loadRecruitmentCandidateOptions = useCallback(
    async (params: LoadOptionsParams): Promise<LoadOptionsResult<SelectOption>> => {
      if (!params) {
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }

      try {
        const resolvedAdditionalParams =
          typeof additionalParams === 'function' ? additionalParams() : additionalParams || {}

        const apiParams: GetRecruitmentCandidatesParams = {
          page: params.page,
          page_size: params.pageSize || pageSize,
          ...resolvedAdditionalParams,
        }

        if (params.query) {
          apiParams.search = params.query
        }

        const queryKey = QUERY_KEYS.HRM.RECRUITMENT_CANDIDATES.LIST(apiParams)
        const paginatedData = await queryClient.fetchQuery({
          queryKey,
          queryFn: () => getRecruitmentCandidateService().getRecruitmentCandidates(apiParams),
          staleTime: 1000 * 60 * 10, // 10 minutes cache
        })

        if (!paginatedData || !paginatedData.results) {
          console.warn('No results in recruitment candidates API response:', paginatedData)
          return {
            items: [],
            hasNextPage: false,
            nextPage: null,
          }
        }

        let nextPage: number | null = null
        const hasNext = !!paginatedData.next

        if (hasNext && paginatedData.next) {
          try {
            const nextUrl = paginatedData.next.startsWith('http')
              ? new URL(paginatedData.next)
              : new URL(paginatedData.next, window.location.origin)
            const nextPageParam = nextUrl.searchParams.get('page')
            if (nextPageParam) {
              nextPage = Number(nextPageParam)
            }
          } catch (error) {
            const pageMatch = paginatedData.next.match(/[?&]page=(\d+)/)
            if (pageMatch) {
              nextPage = Number(pageMatch[1])
            } else {
              nextPage = params.page + 1
            }
          }
        }

        // Cache minimal dropdown data by id so consumers can use it without refetch
        paginatedData.results.forEach((candidate: RecruitmentCandidate) => {
          const nationalityId = candidate.nationality?.id ?? null
          const citizenIdFilesIds =
            candidate.citizen_id_files?.map((f) => f.id).filter((id): id is number => id != null) ??
            []

          dropdownCacheRef.current.set(candidate.id, {
            id: candidate.id,
            code: candidate.code,
            name: candidate.name,
            citizen_id: candidate.citizen_id,
            email: candidate.email,
            phone: candidate.phone,
            date_of_birth: candidate.date_of_birth,
            gender: candidate.gender,
            place_of_birth: candidate.place_of_birth,
            citizen_id_issued_date: candidate.citizen_id_issued_date,
            citizen_id_issued_place: candidate.citizen_id_issued_place,
            emergency_contact_phone: candidate.emergency_contact_phone,
            nationality_id: nationalityId,
            ethnicity: candidate.ethnicity,
            religion: candidate.religion,
            marital_status: candidate.marital_status,
            tax_code: candidate.tax_code,
            residential_address: candidate.residential_address,
            permanent_address: candidate.permanent_address,
            citizen_id_files_ids: citizenIdFilesIds,
            citizen_id_files: candidate.citizen_id_files ?? null,
            branch: candidate.branch,
            block: candidate.block,
            department: candidate.department,
          })
        })

        const items: SelectOption[] = paginatedData.results.map(
          (candidate: RecruitmentCandidate) => ({
            label: `${candidate.code} - ${candidate.name}`,
            value: candidate.id,
          })
        )

        return {
          items,
          hasNextPage: hasNext,
          nextPage,
        }
      } catch (error) {
        console.error('Error loading recruitment candidate options:', error)
        return {
          items: [],
          hasNextPage: false,
          nextPage: null,
        }
      }
    },
    [additionalParams, pageSize, queryClient]
  )

  const loadInitialRecruitmentCandidateOptions = useCallback(
    async (values: (string | number)[]): Promise<SelectOption[]> => {
      if (!values || values.length === 0) {
        return []
      }

      try {
        const results: SelectOption[] = []

        for (const rawId of values) {
          const candidateId = Number(rawId)
          if (Number.isNaN(candidateId) || candidateId <= 0) {
            results.push({
              label: String(rawId),
              value: String(rawId),
            })
            continue
          }

          // Try to get from dropdown cache first
          const cached = getCachedCandidateById(candidateId)
          if (cached) {
            results.push({
              label: `${cached.code} - ${cached.name}`,
              value: cached.id,
            })
            continue
          }

          // Fallback: fetch via detail API and populate cache
          const candidate = (await getRecruitmentCandidateService().getRecruitmentCandidate(
            candidateId
          )) as RecruitmentCandidate

          if (candidate) {
            const nationalityId = candidate.nationality?.id ?? null
            const citizenIdFilesIds =
              candidate.citizen_id_files
                ?.map((f) => f.id)
                .filter((id): id is number => id != null) ?? []

            dropdownCacheRef.current.set(candidate.id, {
              id: candidate.id,
              code: candidate.code,
              name: candidate.name,
              citizen_id: candidate.citizen_id,
              email: candidate.email,
              phone: candidate.phone,
              date_of_birth: candidate.date_of_birth,
              gender: candidate.gender,
              place_of_birth: candidate.place_of_birth,
              citizen_id_issued_date: candidate.citizen_id_issued_date,
              citizen_id_issued_place: candidate.citizen_id_issued_place,
              emergency_contact_phone: candidate.emergency_contact_phone,
              nationality_id: nationalityId,
              ethnicity: candidate.ethnicity,
              religion: candidate.religion,
              marital_status: candidate.marital_status,
              tax_code: candidate.tax_code,
              residential_address: candidate.residential_address,
              permanent_address: candidate.permanent_address,
              citizen_id_files_ids: citizenIdFilesIds,
              citizen_id_files: candidate.citizen_id_files ?? null,
              branch: candidate.branch,
              block: candidate.block,
              department: candidate.department,
            })

            results.push({
              label: `${candidate.code} - ${candidate.name}`,
              value: candidate.id,
            })
          } else {
            results.push({
              label: String(rawId),
              value: String(rawId),
            })
          }
        }

        return results
      } catch (error) {
        console.error('Error loading initial recruitment candidate options:', error)
        return values.map((value) => ({
          label: String(value),
          value: String(value),
        })) as SelectOption[]
      }
    },
    [getCachedCandidateById, queryClient]
  )

  return {
    loadRecruitmentCandidateOptions,
    loadInitialRecruitmentCandidateOptions,
    getCachedCandidateById,
  }
}

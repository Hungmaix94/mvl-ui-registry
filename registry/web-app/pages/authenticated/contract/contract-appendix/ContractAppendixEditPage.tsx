import { useRef, useCallback, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import { Button } from '@/components/ui'
import ContractAppendixForm, {
  type ContractAppendixFormRef,
} from '@/features/contract/contract-appendix/_shares/components/ContractAppendixForm.tsx'
import {
  useContractAppendix,
  useUpdateContractAppendix,
  usePublishContractAppendix,
} from '@/features/contract/services/contract-appendix-service'
import toastService from '@/services/toast-service.tsx'
import { DATE_SERVER_FORMAT } from '@/constants/date-format.ts'
import { format, parse } from 'date-fns'
import { DATE_FORMAT } from '@/constants/date-format.ts'
import { FullScreenLoading } from '@/components/ui'
import type { ContractAppendixFormValues } from '@/features/contract/contract-appendix/_shares/components/ContractAppendixForm.tsx'
import { handleApiError } from '@/utils/error-utils.ts'
import { PageTitleRef } from '@/components/ui/page-title/PageTitle.tsx'

const ContractAppendixEditPage = () => {
  const refPageTitle = useRef<PageTitleRef>(null)
  const formRef = useRef<ContractAppendixFormRef>(null)

  const { id } = useParams<{ id: string }>()

  const appendixId = useMemo(() => Number(id), [id])

  const updateMutation = useUpdateContractAppendix()
  const publishMutation = usePublishContractAppendix()

  const { data: appendixData, isLoading: isLoadingAppendix } = useContractAppendix(appendixId)

  const handleSaveDraft = useCallback(async () => {
    if (!formRef.current || !appendixId) return

    const handleSubmit = formRef.current.handleSubmit
    await handleSubmit(async (data: ContractAppendixFormValues) => {
      try {
        // Convert date strings to server format
        const payload = {
          employee_id: data.employee_id,
          parent_contract_id: data.parent_contract_id,
          sign_date: format(parse(data.sign_date, DATE_FORMAT, new Date()), DATE_SERVER_FORMAT),
          effective_date: format(
            parse(data.effective_date, DATE_FORMAT, new Date()),
            DATE_SERVER_FORMAT
          ),
          expiration_date: data.expiration_date
            ? format(parse(data.expiration_date, DATE_FORMAT, new Date()), DATE_SERVER_FORMAT)
            : null,
          base_salary: data.base_salary?.toString(),
          kpi_salary: data.kpi_salary?.toString(),
          lunch_allowance: data.lunch_allowance?.toString() || null,
          phone_allowance: data.phone_allowance?.toString() || null,
          other_allowance: data.other_allowance?.toString() || null,
          content: data.content,
          note: data.note || null,
        }

        await updateMutation.mutateAsync({
          id: appendixId,
          data: payload,
        })
        toastService.success('Cập nhật phụ lục hợp đồng thành công!')
        refPageTitle?.current?.handleBackBtn()
      } catch (error: any) {
        if (formRef.current) {
          handleApiError(error, formRef.current.setError as any)
        } else {
          handleApiError(error)
        }
      }
    })()
  }, [updateMutation, appendixId])

  const handlePublish = useCallback(async () => {
    if (!formRef.current || !appendixId) return

    const handleSubmit = formRef.current.handleSubmit
    await handleSubmit(async (data: ContractAppendixFormValues) => {
      try {
        // First update the appendix
        const payload = {
          employee_id: data.employee_id,
          parent_contract_id: data.parent_contract_id,
          sign_date: format(parse(data.sign_date, DATE_FORMAT, new Date()), DATE_SERVER_FORMAT),
          effective_date: format(
            parse(data.effective_date, DATE_FORMAT, new Date()),
            DATE_SERVER_FORMAT
          ),
          expiration_date: data.expiration_date
            ? format(parse(data.expiration_date, DATE_FORMAT, new Date()), DATE_SERVER_FORMAT)
            : null,
          base_salary: data.base_salary?.toString(),
          kpi_salary: data.kpi_salary?.toString(),
          lunch_allowance: data.lunch_allowance?.toString() || null,
          phone_allowance: data.phone_allowance?.toString() || null,
          other_allowance: data.other_allowance?.toString() || null,
          content: data.content,
          note: data.note || null,
        }

        await updateMutation.mutateAsync({
          id: appendixId,
          data: payload,
        })

        // Then publish it
        await publishMutation.mutateAsync(appendixId)
        toastService.success('Ban hành phụ lục hợp đồng thành công!')
        refPageTitle?.current?.handleBackBtn()
      } catch (error: any) {
        if (formRef.current) {
          handleApiError(error, formRef.current.setError as any)
        } else {
          handleApiError(error)
        }
      }
    })()
  }, [updateMutation, publishMutation, appendixId])

  const isLoading = updateMutation.isPending || publishMutation.isPending

  if (isLoadingAppendix) {
    return <FullScreenLoading className="h-['unset'] min-h-['unset'] flex-1" />
  }

  if (!appendixData) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="typo-body-lg-regular text-content-dark-3">Không tìm thấy phụ lục hợp đồng</p>
      </div>
    )
  }

  return (
    <>
      <PageTitle ref={refPageTitle} enableBackButton title="Chỉnh sửa phụ lục hợp đồng" />

      <div className="flex flex-col gap-8 px-10 py-6">
        <ContractAppendixForm ref={formRef} mode="edit" initialData={appendixData} />

        <Flex justify="end" gap="4" className="w-full">
          <Button
            type="button"
            variant="text"
            onClick={() => refPageTitle?.current?.handleBackBtn()}
            disabled={isLoading}
            className="text-action-primary-red-default hover:text-action-primary-red-hover"
          >
            Huỷ
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleSaveDraft}
            disabled={isLoading}
            loading={updateMutation.isPending}
            className="min-w-[150px]"
          >
            Lưu nháp
          </Button>
          <Button
            type="button"
            variant="primary"
            onClick={handlePublish}
            disabled={isLoading}
            loading={isLoading}
            className="min-w-[150px]"
          >
            Ban hành
          </Button>
        </Flex>
      </div>
    </>
  )
}

export default ContractAppendixEditPage

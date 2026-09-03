import { Employee } from '@/services'
import RecordDetail from '@/features/employee/management/_shares/components/RecordDetail.tsx'
import { Grid } from '@radix-ui/themes'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { useMemo } from 'react'

const PersonalInfo = ({
  employee,
  formatDate,
}: {
  employee: Employee
  formatDate: (dateString: string | null | undefined) => string
}) => {
  const { keysMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.EMPLOYEE.GENDER, APP_CONSTANT_KEY.EMPLOYEE.MARITAL_STATUS],
  })

  const genderLabels = useMemo(() => {
    if (keysMap.has(APP_CONSTANT_KEY.EMPLOYEE.GENDER)) {
      return keysMap.get(APP_CONSTANT_KEY.EMPLOYEE.GENDER) || {}
    }
    return { MALE: 'Nam', FEMALE: 'Nữ' }
  }, [keysMap])

  const maritalStatusLabels = useMemo(() => {
    if (keysMap.has(APP_CONSTANT_KEY.EMPLOYEE.MARITAL_STATUS)) {
      return keysMap.get(APP_CONSTANT_KEY.EMPLOYEE.MARITAL_STATUS) || {}
    }
    return {
      SINGLE: 'Độc thân',
      MARRIED: 'Đã kết hôn',
      DIVORCED: 'Đã ly hôn',
      WIDOWED: 'Góa',
    }
  }, [keysMap])

  const getGenderText = (gender?: 'MALE' | 'FEMALE') => {
    return gender ? genderLabels[gender] || '-' : '-'
  }

  const getMaritalStatusText = (status?: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED') => {
    return status ? maritalStatusLabels[status] || '-' : '-'
  }

  return (
    <>
      <div className="flex flex-col gap-5">
        <h2 className="text-content-dark-primary text-lg font-semibold">Thông tin cá nhân</h2>

        <Grid columns={'2'} gap={'9'} width={'100%'}>
          <div className="flex grow flex-col items-start">
            <RecordDetail label="Ngày sinh" content={formatDate(employee.date_of_birth)} />

            <RecordDetail label="Email cá nhân" content={employee.personal_email || '-'} />

            <RecordDetail label="Mã số thuế" content={employee.tax_code || '-'} />

            <RecordDetail label="Số CMND/CCCD" content={employee.citizen_id || '-'} />

            <RecordDetail label="Ngày cấp" content={formatDate(employee.citizen_id_issued_date)} />

            <RecordDetail label="Nơi cấp" content={employee.citizen_id_issued_place || '-'} />

            <RecordDetail label="Nơi sinh" content={employee.place_of_birth || '-'} />

            <RecordDetail
              label="Địa chỉ cư trú"
              content={employee.residential_address || '-'}
              isShowSeparator={false}
            />
          </div>

          <div className="flex grow flex-col items-start">
            <RecordDetail label="Giới tính" content={getGenderText(employee.gender)} />

            <RecordDetail label="Số điện thoại" content={employee.phone || '-'} />

            <RecordDetail
              label="Tình trạng hôn nhân"
              content={getMaritalStatusText(employee.marital_status)}
            />

            <RecordDetail label="Quốc tịch" content={employee.nationality?.name || '-'} />

            <RecordDetail label="Dân tộc" content={employee.ethnicity || '-'} />

            <RecordDetail label="Tôn giáo" content={employee.religion || '-'} />

            <RecordDetail
              label="Địa chỉ thường trú"
              content={employee.permanent_address || '-'}
              isShowSeparator={false}
            />
          </div>
        </Grid>
      </div>
    </>
  )
}

export default PersonalInfo

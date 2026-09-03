import { PageTitle } from '@/components/ui'
import { Flex } from '@radix-ui/themes'
import WifiAttendanceDeviceForm from '@/features/attendance/wifi-device/_shares/components/WifiAttendanceDeviceForm.tsx'

const WifiDeviceCreatePage = () => {
  return (
    <>
      <PageTitle enableBackButton title="Tạo wifi chấm công mới" />
      <Flex flexGrow={'1'} direction="column" gap="4" className={'pb-6'}>
        <WifiAttendanceDeviceForm mode="create" deviceLoading={false} />
      </Flex>
    </>
  )
}

export default WifiDeviceCreatePage

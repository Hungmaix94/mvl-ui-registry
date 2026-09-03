import { Employee } from '@/services'
import CitizenIdFileDisplay from '@/features/hrm/_shares/CitizenIdFileDisplay.tsx'

const CitizenIdAttachment = ({ employee }: { employee: Employee }) => {
  return <CitizenIdFileDisplay files={employee.citizen_id_files} />
}

export default CitizenIdAttachment

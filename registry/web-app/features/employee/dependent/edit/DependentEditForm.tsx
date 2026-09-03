import DependentForm from '@/features/employee/dependent/_shares/components/DependentForm.tsx'
import { type EmployeeDependent } from '@/features/employee/services/employee-dependent-service'

interface DependentEditFormProps {
  initialData: EmployeeDependent
  onSuccess?: () => void
  onCancel?: () => void
}

export default function DependentEditForm({
  initialData,
  onSuccess,
  onCancel,
}: DependentEditFormProps) {
  return <DependentForm initialData={initialData} onSuccess={onSuccess} onCancel={onCancel} />
}

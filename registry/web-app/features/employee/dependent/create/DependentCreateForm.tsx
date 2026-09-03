import DependentForm from '@/features/employee/dependent/_shares/components/DependentForm.tsx'

interface DependentCreateFormProps {
  onSuccess?: () => void
  onCancel?: () => void
}

export default function DependentCreateForm({ onSuccess, onCancel }: DependentCreateFormProps) {
  return <DependentForm initialData={undefined} onSuccess={onSuccess} onCancel={onCancel} />
}

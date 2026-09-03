import { ReactNode } from 'react'
import { FieldErrors, FieldValues, UseFormHandleSubmit } from 'react-hook-form'
import { cn } from '@/utils'

export type FormProps<T extends FieldValues> = {
  children: ReactNode
  handleSubmit: UseFormHandleSubmit<T>
  onSubmit: (data: T) => void
  onError?: (errors: FieldErrors<T>) => void
  loading: boolean
  className?: string
  noValidate?: boolean
  id?: string
}

function Form<T extends FieldValues>({
  children,
  handleSubmit,
  onSubmit,
  onError,
  loading,
  className,
  noValidate,
  id,
}: FormProps<T>) {
  const onSubmitHandler = loading ? undefined : handleSubmit(onSubmit, onError)

  return (
    <form
      id={id}
      onSubmit={(e) => {
        e.preventDefault()
        if (onSubmitHandler) {
          onSubmitHandler(e)
        }
      }}
      className={cn(className)}
      noValidate={noValidate}
    >
      {children}
    </form>
  )
}

export default Form

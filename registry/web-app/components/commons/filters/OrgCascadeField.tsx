import { useCallback } from 'react'
import type {
  FieldValues,
  Path,
  PathValue,
  UseFormGetValues,
  UseFormSetValue,
} from 'react-hook-form'
import { CascadeSelectGroupOrganization } from '@/components/commons/filters/CascadeSelectGroupOrganization'

/** Org ids as the URL-backed filter hooks store them — strings, not the numbers BE returns. */
export type OrgCascadeValues = {
  branch?: string
  block?: string
  department?: string
}

const ORG_FIELDS = ['branch', 'block', 'department'] as const

type Props = {
  /**
   * Bump-to-remount key, not data: the cascade owns its internal selection state, so an RHF
   * `reset` on the parent form cannot empty it — only a remount can.
   */
  formKey: number
  /** URL-backed values to hydrate with; pass `undefined` once the user hit "Xoá bộ lọc". */
  initialValues?: OrgCascadeValues
  onChange: (values: OrgCascadeValues) => void
  className?: string
}

/**
 * Chi nhánh → Khối → Phòng ban cascade as the report filter dialogs use it: employee/position
 * levels off, validation skipped (every level is optional in a filter), and the numeric ids the
 * cascade emits normalised to the string ids the filter hooks put in the URL.
 */
export default function OrgCascadeField({
  formKey,
  initialValues,
  onChange,
  className = 'w-full gap-5',
}: Props) {
  return (
    <CascadeSelectGroupOrganization
      key={formKey}
      initialValues={initialValues}
      showEmployee={false}
      showPosition={false}
      skipValidation
      onFormChange={({ branch_id, block_id, department_id }) =>
        onChange({
          branch: branch_id ? String(branch_id) : undefined,
          block: block_id ? String(block_id) : undefined,
          department: department_id ? String(department_id) : undefined,
        })
      }
      className={className}
    />
  )
}

/**
 * Mirrors the cascade's emissions into RHF state.
 *
 * Guarded on purpose: the cascade re-emits on each of its own renders, so writing identical
 * values straight back would bounce it in a loop. `shouldDirty: false` because a programmatic
 * mirror is not a user edit.
 */
export function useOrgCascadeSync<TValues extends FieldValues & OrgCascadeValues>(
  getValues: UseFormGetValues<TValues>,
  setValue: UseFormSetValue<TValues>
) {
  return useCallback(
    (next: OrgCascadeValues) => {
      const current = getValues()
      if (ORG_FIELDS.every((field) => current[field] === next[field])) return

      ORG_FIELDS.forEach((field) => {
        setValue(field as Path<TValues>, next[field] as PathValue<TValues, Path<TValues>>, {
          shouldDirty: false,
        })
      })
    },
    [getValues, setValue]
  )
}

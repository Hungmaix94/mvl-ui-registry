import { useMemo, useCallback } from 'react'
import { format } from 'date-fns'
import { useFieldArray, useFormContext } from 'react-hook-form'
import { Button } from '@/components/ui'
import { Table, Flex, Text, Grid, Badge } from '@radix-ui/themes'
import { Plus, ArrowLeftRight, UserCog, Users, Clock } from 'lucide-react'
import { formatDate } from '@/utils/date-utils'
import type { ProjectFormValues } from '../types/project-form-types'
import { useDialog } from '@/hooks/useDialog'
import ProjectStaffFormHandoverDialog from './ProjectStaffFormHandoverDialog'
import { PROJECT_ROLE_OPTIONS } from '../../sale-allocations/constants/sale-allocation-constants'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'

export const ProjectStaffAssignmentsTable = ({ isEdit = false }: { isEdit?: boolean }) => {
  const {
    control,
    watch,
    formState: { errors },
  } = useFormContext<ProjectFormValues>()
  const { fields, append, update } = useFieldArray({
    control,
    name: 'staff_assignments',
  })

  const staffAssignments = watch('staff_assignments') || []

  const getLocalDateStr = useCallback((val: Date | string | null | undefined): string | null => {
    if (!val) return null
    if (val instanceof Date) {
      return format(val, 'yyyy-MM-dd')
    }
    if (typeof val === 'string') {
      return val.substring(0, 10)
    }
    return null
  }, [])

  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

  const { activeGdda, upcomingGdda, activeTkda, upcomingTkda } = useMemo(() => {
    const listGdda = staffAssignments.filter((s: any) => s.role === 'project_director')
    const activeGD = listGdda.find((s: any) => {
      const from = getLocalDateStr(s.effective_from) || ''
      const to = getLocalDateStr(s.effective_to) || ''
      return from <= today && (!to || to >= today)
    })
    const upcomingGD = listGdda.find((s: any) => {
      const from = getLocalDateStr(s.effective_from) || ''
      return from > today
    })

    const listTkda = staffAssignments.filter((s: any) => s.role === 'project_secretary')
    const activeTK = listTkda.find((s: any) => {
      const from = getLocalDateStr(s.effective_from) || ''
      const to = getLocalDateStr(s.effective_to) || ''
      return from <= today && (!to || to >= today)
    })
    const upcomingTK = listTkda.find((s: any) => {
      const from = getLocalDateStr(s.effective_from) || ''
      return from > today
    })

    return {
      activeGdda: activeGD,
      upcomingGdda: upcomingGD,
      activeTkda: activeTK,
      upcomingTkda: upcomingTK,
    }
  }, [staffAssignments, today, getLocalDateStr])

  const sortedFields = useMemo(() => {
    return fields
      .map((field, index) => ({ field, index, data: staffAssignments[index] }))
      .sort((a, b) => {
        const aDate = a.data?.effective_from ? new Date(a.data.effective_from).getTime() : 0
        const bDate = b.data?.effective_from ? new Date(b.data.effective_from).getTime() : 0
        return bDate - aDate
      })
  }, [fields, staffAssignments])

  const { keysMapOptions } = useAppConstant({
    module: 'realestate',
    keys: [APP_CONSTANT_KEY.REALESTATE.SALES_ALLOCATION_STAFF_ROLE_CHOICES],
  })

  const roleOptions = useMemo(() => {
    const opts = keysMapOptions.get(APP_CONSTANT_KEY.REALESTATE.SALES_ALLOCATION_STAFF_ROLE_CHOICES)
    return opts && opts.length > 0 ? opts : PROJECT_ROLE_OPTIONS
  }, [keysMapOptions])

  // getRoleLabel from project_role_options
  const { displayFormContent, displayClose } = useDialog()

  const handleOpenHandoverForRole = (role: string, roleShort: string) => {
    // Check if there is an active coordinator for this role
    const activeForRole = staffAssignments.some((s: any) => {
      if (s.role !== role) return false
      const from = getLocalDateStr(s.effective_from) || ''
      const to = getLocalDateStr(s.effective_to) || ''
      return from <= today && (!to || to >= today)
    })

    const title = activeForRole ? `Chuyển giao ${roleShort}` : `Phân công ${roleShort}`

    displayFormContent({
      title,
      content: (
        <ProjectStaffFormHandoverDialog
          roleOptions={roleOptions}
          existingAssignments={staffAssignments}
          defaultRole={role}
          disableRoleSelect
          onConfirm={(data) => {
            // 1. If predecessor is found, update its effective_to
            if (data.predecessorIndex !== null) {
              const predItem = staffAssignments[data.predecessorIndex]
              update(data.predecessorIndex, {
                ...(fields[data.predecessorIndex] as any),
                ...predItem,
                effective_to: data.predecessorNewEnd,
              })
            }

            // 2. Append successor
            append({
              effective_from: data.successor.effective_from,
              effective_to: data.successor.effective_to,
              employee_id: data.successor.employee_id,
              role: data.successor.role,
              employee_detail: data.successor.employee_detail,
              attachment_tokens: data.successor.attachment_tokens || [],
              attachments: [],
              attachment_keep_ids: [],
            })
          }}
          onCancel={() => displayClose()}
        />
      ),
      hideFooter: true,
      confirmText: '',
    })
  }

  const getInitials = (name: string): string => {
    if (!name) return '?'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (
      (parts[parts.length - 2]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')
    ).toUpperCase()
  }

  const renderStatusChip = useCallback(
    (s: any) => {
      const from = getLocalDateStr(s.effective_from) || ''
      const to = getLocalDateStr(s.effective_to) || ''
      if (from > today) {
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e8f0fe] px-2.5 py-0.5 text-[11px] font-semibold text-[#1a73e8]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#1a73e8]" />
            Sắp hiệu lực
          </span>
        )
      }
      if (from <= today && (!to || to >= today)) {
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e6f4ea] px-2.5 py-0.5 text-[11px] font-semibold text-[#137333]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#137333]" />
            Đang hiệu lực
          </span>
        )
      }
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#f1f3f4] px-2.5 py-0.5 text-[11px] font-semibold text-[#3c4043]">
          Đã kết thúc
        </span>
      )
    },
    [today, getLocalDateStr]
  )

  const gddaFields = useMemo(() => {
    return sortedFields.filter((f) => f.data?.role === 'project_director')
  }, [sortedFields])

  const tkdaFields = useMemo(() => {
    return sortedFields.filter((f) => f.data?.role === 'project_secretary')
  }, [sortedFields])

  return (
    <Flex id="staff_assignments" direction="column" gap="3" className="w-full">
      <Text className="typo-body-xl-semibold text-content-dark-1 mt-4 block">
        Nhân sự phụ trách
      </Text>

      {/* 2 Cards side-by-side */}
      <Grid columns={{ initial: '1', md: '2' }} gap="4">
        {/* GDDA Card */}
        <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
          <Flex align="center" justify="between" className="mb-4 w-full">
            <Flex align="center" gap="3">
              <div className="bg-brand-secondary/15 text-brand-primary flex h-9 w-9 items-center justify-center rounded-lg">
                <UserCog className="h-5 w-5 text-[#b32b2f]" />
              </div>
              <div>
                <Text className="text-content-dark-3 typo-body-xs-semibold block tracking-wider uppercase">
                  GDDA · Giám đốc dự án
                </Text>
                <Text className="text-content-dark-1 typo-body-lg-bold">
                  {activeGdda?.employee_detail?.fullname ||
                    activeGdda?.employee_detail?.code ||
                    '— Chưa phân công —'}
                </Text>
              </div>
            </Flex>
            <Button
              type="button"
              variant="secondary"
              size="small"
              leftIcon={
                activeGdda ? <ArrowLeftRight className="h-4 w-4" /> : <Plus className="h-4 w-4" />
              }
              onClick={() => handleOpenHandoverForRole('project_director', 'GDDA')}
              className="gap-2"
            >
              {activeGdda ? 'Chuyển giao' : 'Thêm'}
            </Button>
          </Flex>
          {activeGdda ? (
            <div className="bg-surface-secondary-default border-border-1 flex items-center justify-between rounded-lg border p-4">
              <div>
                <Text className="text-content-dark-3 typo-body-sm-medium block">
                  {activeGdda.employee_detail?.code} ·{' '}
                  {activeGdda.employee_detail?.department?.name || 'Phòng Kinh doanh'}
                </Text>
                <Text className="text-content-dark-3 typo-body-sm-medium mt-1 block">
                  Hiệu lực từ {formatDate(activeGdda.effective_from)} →{' '}
                  {activeGdda.effective_to ? formatDate(activeGdda.effective_to) : 'nay'}
                </Text>
              </div>
              <Badge color="green">Đang hiệu lực</Badge>
            </div>
          ) : (
            <div className="border-border-1 text-content-dark-3 typo-body-sm-medium flex items-center justify-center rounded-lg border border-dashed p-6 italic">
              Hiện chưa có Giám đốc dự án phụ trách
            </div>
          )}
          {upcomingGdda && (
            <div className="bg-surface-secondary-default/50 text-content-dark-2 typo-body-sm-medium mt-3 flex items-center gap-2 rounded-lg p-3">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>
                <b>{upcomingGdda.employee_detail?.fullname}</b> sẽ nhận GDDA từ{' '}
                <b>{formatDate(upcomingGdda.effective_from)}</b>
              </span>
            </div>
          )}
        </div>

        {/* TKDA Card */}
        <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
          <Flex align="center" justify="between" className="mb-4 w-full">
            <Flex align="center" gap="3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Users className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <Text className="text-content-dark-3 typo-body-xs-semibold block tracking-wider uppercase">
                  TKDA · Thư ký dự án
                </Text>
                <Text className="text-content-dark-1 typo-body-lg-bold">
                  {activeTkda?.employee_detail?.fullname ||
                    activeTkda?.employee_detail?.code ||
                    '— Chưa phân công —'}
                </Text>
              </div>
            </Flex>
            <Button
              type="button"
              variant="secondary"
              size="small"
              leftIcon={
                activeTkda ? <ArrowLeftRight className="h-4 w-4" /> : <Plus className="h-4 w-4" />
              }
              onClick={() => handleOpenHandoverForRole('project_secretary', 'TKDA')}
              className="gap-2"
            >
              {activeTkda ? 'Chuyển giao' : 'Thêm'}
            </Button>
          </Flex>
          {activeTkda ? (
            <div className="bg-surface-secondary-default border-border-1 flex items-center justify-between rounded-lg border p-4">
              <div>
                <Text className="text-content-dark-3 typo-body-sm-medium block">
                  {activeTkda.employee_detail?.code} ·{' '}
                  {activeTkda.employee_detail?.department?.name || 'Thư ký dự án'}
                </Text>
                <Text className="text-content-dark-3 typo-body-sm-medium mt-1 block">
                  Hiệu lực từ {formatDate(activeTkda.effective_from)} →{' '}
                  {activeTkda.effective_to ? formatDate(activeTkda.effective_to) : 'nay'}
                </Text>
              </div>
              <Badge color="green">Đang hiệu lực</Badge>
            </div>
          ) : (
            <div className="border-border-1 text-content-dark-3 typo-body-sm-medium flex items-center justify-center rounded-lg border border-dashed p-6 italic">
              Hiện chưa có Thư ký dự án phụ trách
            </div>
          )}
          {upcomingTkda && (
            <div className="bg-surface-secondary-default/50 text-content-dark-2 typo-body-sm-medium mt-3 flex items-center gap-2 rounded-lg p-3">
              <Clock className="h-4 w-4 text-blue-500" />
              <span>
                <b>{upcomingTkda.employee_detail?.fullname}</b> sẽ nhận TKDA từ{' '}
                <b>{formatDate(upcomingTkda.effective_from)}</b>
              </span>
            </div>
          )}
        </div>
      </Grid>

      {isEdit && (
        <>
          <div className="border-border-1 bg-surface-primary-default mt-6 flex flex-col overflow-hidden rounded-xl border p-0">
            <div className="border-border-1 flex items-center justify-between border-b bg-white px-5 py-4">
              <div className="flex items-baseline gap-2">
                <Text className="text-content-dark-1 text-[15px] leading-none font-bold">
                  Lịch sử bổ nhiệm
                </Text>
                <span className="text-content-dark-3 text-xs italic">
                  Sửa trực tiếp thông qua nút Thêm / Chuyển giao bên trên
                </span>
              </div>
              {errors.staff_assignments ? (
                <span className="text-data-red-default text-sm">
                  {Array.isArray(errors.staff_assignments)
                    ? 'Vui lòng kiểm tra lại thông tin nhân sự ở các dòng'
                    : (errors.staff_assignments as any)?.root?.message ||
                      (errors.staff_assignments as any)?.message}
                </span>
              ) : null}
            </div>

            {/* GDDA Block */}
            <div className="py-2.5">
              <div className="text-brand-primary flex items-center gap-2 px-5 pt-3 pb-2 text-xs font-bold tracking-[0.04em] uppercase">
                <UserCog className="h-[15px] w-[15px]" />
                <span>GDDA — Giám đốc dự án</span>
              </div>
              <div className="relative w-full overflow-hidden px-5">
                <div className="border-border-1 overflow-x-auto rounded-lg border">
                  <Table.Root className="w-full border-collapse bg-white text-left text-sm">
                    <Table.Header className="border-border-1 border-b bg-[#F0F2F5]">
                      <Table.Row>
                        <Table.ColumnHeaderCell className="typo-body-base-medium border-border-1 text-content-dark-3 w-[35%] px-4 py-2 text-[11px] font-semibold tracking-wider uppercase">
                          Nhân sự
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell className="typo-body-base-medium border-border-1 text-content-dark-3 px-4 py-2 text-right text-[11px] font-semibold tracking-wider uppercase">
                          Ngày hiệu lực
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell className="typo-body-base-medium border-border-1 text-content-dark-3 px-4 py-2 text-right text-[11px] font-semibold tracking-wider uppercase">
                          Ngày kết thúc
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell className="typo-body-base-medium border-border-1 text-content-dark-3 px-4 py-2 text-[11px] font-semibold tracking-wider uppercase">
                          Trạng thái
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell className="typo-body-base-medium text-content-dark-3 px-4 py-2 text-center text-[11px] font-semibold tracking-wider uppercase">
                          Đính kèm
                        </Table.ColumnHeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body className="divide-border-1 divide-y">
                      {gddaFields.length > 0 ? (
                        gddaFields.map(({ field, data }) => {
                          const employeeId = data?.employee_id
                          const empName =
                            (field as any).employee_detail?.fullname ||
                            (field as any)._employee_name ||
                            (employeeId ? `ID: ${employeeId}` : '---')
                          const fromDate = data?.effective_from
                          const toDate = data?.effective_to

                          return (
                            <Table.Row
                              key={field.id}
                              className="hover:bg-surface-secondary-default transition-colors"
                            >
                              <Table.Cell className="border-border-1 w-[35%] px-4 py-3 align-middle">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#f1f5f9] text-[10.5px] font-semibold text-[#475569]">
                                    {getInitials(empName)}
                                  </div>
                                  <div className="truncate">
                                    <div className="text-content-dark-1 truncate text-[13px] leading-tight font-semibold">
                                      {empName}
                                    </div>
                                    <div className="text-content-dark-3 mt-0.5 block truncate text-[11px]">
                                      {(field as any).employee_detail?.code || ''}
                                    </div>
                                  </div>
                                </div>
                              </Table.Cell>
                              <Table.Cell className="border-border-1 text-content-dark-2 px-4 py-3 text-right align-middle font-medium">
                                {fromDate ? formatDate(fromDate) : '---'}
                              </Table.Cell>
                              <Table.Cell className="border-border-1 text-content-dark-2 px-4 py-3 text-right align-middle font-medium">
                                {toDate ? formatDate(toDate) : '---'}
                              </Table.Cell>
                              <Table.Cell className="border-border-1 px-4 py-3 align-middle">
                                {renderStatusChip(data)}
                              </Table.Cell>
                              <Table.Cell className="px-4 py-3 text-center align-middle">
                                {data?.attachments?.length ? (
                                  <div className="flex flex-col items-center gap-1">
                                    {data.attachments.map((file: any, idx: number) => {
                                      const name =
                                        file.name ||
                                        file.file_name ||
                                        file.filename ||
                                        `Tệp ${idx + 1}`
                                      const url = file.url || file.file
                                      return url ? (
                                        <a
                                          key={idx}
                                          href={url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-brand-primary text-xs whitespace-nowrap hover:underline"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {name}
                                        </a>
                                      ) : (
                                        <span
                                          key={idx}
                                          className="text-content-dark-1 text-xs whitespace-nowrap"
                                        >
                                          {name}
                                        </span>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  '---'
                                )}
                              </Table.Cell>
                            </Table.Row>
                          )
                        })
                      ) : (
                        <Table.Row>
                          <Table.Cell
                            colSpan={5}
                            className="text-content-dark-3 px-4 py-4 text-center text-[13px] italic"
                          >
                            Chưa có ai được phân công.
                          </Table.Cell>
                        </Table.Row>
                      )}
                    </Table.Body>
                  </Table.Root>
                </div>
              </div>
            </div>

            {/* TKDA Block */}
            <div className="py-2.5 pb-4">
              <div className="flex items-center gap-2 px-5 pt-3 pb-2 text-xs font-bold tracking-[0.04em] text-[#2E7D32] uppercase">
                <Users className="h-[15px] w-[15px]" />
                <span>TKDA — Thư ký dự án</span>
              </div>
              <div className="relative w-full overflow-hidden px-5">
                <div className="border-border-1 overflow-x-auto rounded-lg border">
                  <Table.Root className="w-full border-collapse bg-white text-left text-sm">
                    <Table.Header className="border-border-1 border-b bg-[#F0F2F5]">
                      <Table.Row>
                        <Table.ColumnHeaderCell className="typo-body-base-medium border-border-1 text-content-dark-3 w-[35%] px-4 py-2 text-[11px] font-semibold tracking-wider uppercase">
                          Nhân sự
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell className="typo-body-base-medium border-border-1 text-content-dark-3 px-4 py-2 text-right text-[11px] font-semibold tracking-wider uppercase">
                          Ngày hiệu lực
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell className="typo-body-base-medium border-border-1 text-content-dark-3 px-4 py-2 text-right text-[11px] font-semibold tracking-wider uppercase">
                          Ngày kết thúc
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell className="typo-body-base-medium border-border-1 text-content-dark-3 px-4 py-2 text-[11px] font-semibold tracking-wider uppercase">
                          Trạng thái
                        </Table.ColumnHeaderCell>
                        <Table.ColumnHeaderCell className="typo-body-base-medium text-content-dark-3 px-4 py-2 text-center text-[11px] font-semibold tracking-wider uppercase">
                          Đính kèm
                        </Table.ColumnHeaderCell>
                      </Table.Row>
                    </Table.Header>
                    <Table.Body className="divide-border-1 divide-y">
                      {tkdaFields.length > 0 ? (
                        tkdaFields.map(({ field, data }) => {
                          const employeeId = data?.employee_id
                          const empName =
                            (field as any).employee_detail?.fullname ||
                            (field as any)._employee_name ||
                            (employeeId ? `ID: ${employeeId}` : '---')
                          const fromDate = data?.effective_from
                          const toDate = data?.effective_to

                          return (
                            <Table.Row
                              key={field.id}
                              className="hover:bg-surface-secondary-default transition-colors"
                            >
                              <Table.Cell className="border-border-1 w-[35%] px-4 py-3 align-middle">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#f1f5f9] text-[10.5px] font-semibold text-[#475569]">
                                    {getInitials(empName)}
                                  </div>
                                  <div className="truncate">
                                    <div className="text-content-dark-1 truncate text-[13px] leading-tight font-semibold">
                                      {empName}
                                    </div>
                                    <div className="text-content-dark-3 mt-0.5 block truncate text-[11px]">
                                      {(field as any).employee_detail?.code || ''}
                                    </div>
                                  </div>
                                </div>
                              </Table.Cell>
                              <Table.Cell className="border-border-1 text-content-dark-2 px-4 py-3 text-right align-middle font-medium">
                                {fromDate ? formatDate(fromDate) : '---'}
                              </Table.Cell>
                              <Table.Cell className="border-border-1 text-content-dark-2 px-4 py-3 text-right align-middle font-medium">
                                {toDate ? formatDate(toDate) : '---'}
                              </Table.Cell>
                              <Table.Cell className="border-border-1 px-4 py-3 align-middle">
                                {renderStatusChip(data)}
                              </Table.Cell>
                              <Table.Cell className="px-4 py-3 text-center align-middle">
                                {data?.attachments?.length ? (
                                  <div className="flex flex-col items-center gap-1">
                                    {data.attachments.map((file: any, idx: number) => {
                                      const name =
                                        file.name ||
                                        file.file_name ||
                                        file.filename ||
                                        `Tệp ${idx + 1}`
                                      const url = file.url || file.file
                                      return url ? (
                                        <a
                                          key={idx}
                                          href={url}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="text-brand-primary text-xs whitespace-nowrap hover:underline"
                                          onClick={(e) => e.stopPropagation()}
                                        >
                                          {name}
                                        </a>
                                      ) : (
                                        <span
                                          key={idx}
                                          className="text-content-dark-1 text-xs whitespace-nowrap"
                                        >
                                          {name}
                                        </span>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  '---'
                                )}
                              </Table.Cell>
                            </Table.Row>
                          )
                        })
                      ) : (
                        <Table.Row>
                          <Table.Cell
                            colSpan={5}
                            className="text-content-dark-3 px-4 py-4 text-center text-[13px] italic"
                          >
                            Chưa có ai được phân công.
                          </Table.Cell>
                        </Table.Row>
                      )}
                    </Table.Body>
                  </Table.Root>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-border-1 bg-surface-secondary-default/40 flex items-center border-t px-5 py-3.5">
              <span className="text-content-dark-3 flex items-center gap-1.5 text-[12px] font-medium">
                <Clock className="text-content-dark-3 h-3.5 w-3.5" />
                Các khoảng có thể hụt (không ai phụ trách) nhưng <b>không được chồng lấn</b>.
              </span>
            </div>
          </div>
        </>
      )}
    </Flex>
  )
}

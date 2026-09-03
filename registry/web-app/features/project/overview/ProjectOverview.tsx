import { Flex, Grid, Text } from '@radix-ui/themes'
import { DisplayField } from '@/components/commons/DisplayField'
import { Chip, Button } from '@/components/ui'
import { Separator } from '@/components/ui/separator'
import { useProjectStaffs, type Project } from '@/services/realestate-service.ts'
import { ColoredValueVariant } from '@/api/schema.ts'
import useAppConstant from '@/hooks/useAppConstant.ts'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key.ts'
import { useMemo, useCallback } from 'react'
import { formatDate } from '@/utils/date-utils.ts'
import { formatCurrencyVND } from '@/utils/common.ts'
import { UserCog, Users, Clock, Info, ArrowLeftRight, Plus, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { useDialog } from '@/hooks/useDialog.ts'
import { useAbility } from '@/lib/ability.ts'
import ProjectStaffHandoverDialog from '../_shares/components/ProjectStaffHandoverDialog'
import ProjectStaffEditDialog from '../_shares/components/ProjectStaffEditDialog'

type ProjectDetailWrapperProps = {
  project: Project
}

const ProjectOverview = ({ project }: ProjectDetailWrapperProps) => {
  const { keysMap } = useAppConstant({
    keys: [
      APP_CONSTANT_KEY.REALESTATE.PROJECT_STATUS,
      APP_CONSTANT_KEY.REALESTATE.PROJECT_PROJECT_TYPE_CHOICES,
      APP_CONSTANT_KEY.REALESTATE.PROJECT_PHASE_CHOICES,
      APP_CONSTANT_KEY.REALESTATE.PROJECT_SOURCE_TYPE_CHOICES,
      APP_CONSTANT_KEY.REALESTATE.SALES_ALLOCATION_STAFF_ROLE_CHOICES,
    ],
    module: 'realestate',
  })

  const { data: staffsResponse } = useProjectStaffs({ project: project.id })
  const staffs = staffsResponse?.results || []

  const { displayFormContent } = useDialog()
  const ability = useAbility()
  const canUpdate = ability.can('update', 'project')

  const handleOpenHandover = useCallback(
    (role: 'project_director' | 'project_secretary', roleLabel: string, roleShort: string) => {
      displayFormContent({
        title: `Chuyển giao ${roleShort}`,
        content: (
          <ProjectStaffHandoverDialog
            projectId={project.id}
            role={role}
            roleLabel={roleLabel}
            roleShort={roleShort}
            staffs={staffs}
          />
        ),
        hideFooter: true,
        confirmText: '',
      })
    },
    [project.id, staffs, displayFormContent]
  )

  const handleOpenEdit = useCallback(
    (
      record: any,
      role: 'project_director' | 'project_secretary',
      roleLabel: string,
      roleShort: string
    ) => {
      displayFormContent({
        title: `Sửa mốc bổ nhiệm ${roleShort}`,
        content: (
          <ProjectStaffEditDialog
            projectId={project.id}
            record={record}
            role={role}
            roleLabel={roleLabel}
            roleShort={roleShort}
            staffs={staffs}
          />
        ),
        hideFooter: true,
        confirmText: '',
      })
    },
    [project.id, staffs, displayFormContent]
  )

  const statusLabels = useMemo(() => {
    const statusMap = keysMap.get(APP_CONSTANT_KEY.REALESTATE.PROJECT_STATUS)
    if (statusMap && typeof statusMap === 'object' && !Array.isArray(statusMap)) {
      return statusMap as Record<string, string>
    }
    return {} as Record<string, string>
  }, [keysMap])

  const projectTypeLabels = useMemo(() => {
    const m = keysMap.get(APP_CONSTANT_KEY.REALESTATE.PROJECT_PROJECT_TYPE_CHOICES)
    if (m && typeof m === 'object' && !Array.isArray(m)) return m as Record<string, string>
    return {} as Record<string, string>
  }, [keysMap])

  const phaseLabels = useMemo(() => {
    const m = keysMap.get(APP_CONSTANT_KEY.REALESTATE.PROJECT_PHASE_CHOICES)
    if (m && typeof m === 'object' && !Array.isArray(m)) return m as Record<string, string>
    return {} as Record<string, string>
  }, [keysMap])

  const sourceTypeLabels = useMemo(() => {
    const m = keysMap.get(APP_CONSTANT_KEY.REALESTATE.PROJECT_SOURCE_TYPE_CHOICES)
    if (m && typeof m === 'object' && !Array.isArray(m)) return m as Record<string, string>
    return {} as Record<string, string>
  }, [keysMap])

  const statusVariants: Record<string, ColoredValueVariant> = {
    active: ColoredValueVariant.GREEN,
    inactive: ColoredValueVariant.RED,
    completed: ColoredValueVariant.BLUE,
  }

  const status = project.status || 'active'
  const statusLabel = statusLabels[status] || status
  const statusVariant = statusVariants[status] || ColoredValueVariant.GREY

  const createdDate = formatDate(project.created_at)
  const updatedDate = formatDate(project.updated_at)

  const projectTypeLabel = project.project_type
    ? (projectTypeLabels[project.project_type] ?? project.project_type)
    : '-'
  const phaseLabel = project.phase ? (phaseLabels[project.phase] ?? project.phase) : '-'
  const sourceTypeLabel = project.source_type
    ? (sourceTypeLabels[project.source_type] ?? project.source_type)
    : '-'

  const investorDisplay = (() => {
    const investor = project.investor
    if (!investor) return '-'
    const code = investor.code ?? ''
    const name = investor.name ?? ''
    if (code && name) return `${code} - ${name}`
    return code || name || '-'
  })()

  const avgPriceDisplay =
    project.avg_price_estimate != null && project.avg_price_estimate !== ''
      ? formatCurrencyVND(String(project.avg_price_estimate))
      : '-'

  const descriptionDisplay = project.description ? (
    <div
      className="prose prose-sm max-w-none [&_li]:leading-6 [&_p]:mb-2 [&_p]:leading-6 [&_ul]:ml-6 [&_ul]:list-disc [&_ul]:space-y-1"
      dangerouslySetInnerHTML={{ __html: project.description }}
    />
  ) : (
    '-'
  )

  // Coordinator Filtering & Sorting
  const today = useMemo(() => format(new Date(), 'yyyy-MM-dd'), [])

  const getInitials = useCallback((name: string) => {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 0) return ''
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (
      (parts[parts.length - 2]?.[0] || '') + (parts[parts.length - 1]?.[0] || '')
    ).toUpperCase()
  }, [])

  const renderStatusChip = useCallback(
    (s: any) => {
      const from = s.effective_from || ''
      const to = s.effective_to || ''
      if (from > today) {
        return (
          <Chip label="Sắp hiệu lực" variant={ColoredValueVariant.BLUE} type="outlined" showDot />
        )
      }
      if (from <= today && (!to || to >= today)) {
        return (
          <Chip label="Đang hiệu lực" variant={ColoredValueVariant.GREEN} type="outlined" showDot />
        )
      }
      return <Chip label="Đã kết thúc" variant={ColoredValueVariant.GREY} type="outlined" />
    },
    [today]
  )

  const { activeGdda, upcomingGdda, gddaHistory } = useMemo(() => {
    const list = staffs.filter((s: any) => s.role === 'project_director')
    const active = list.find((s: any) => {
      const from = s.effective_from || ''
      const to = s.effective_to || ''
      return from <= today && (!to || to >= today)
    })
    const upcoming = list.find((s: any) => {
      const from = s.effective_from || ''
      return from > today
    })
    const history = [...list].sort((a: any, b: any) =>
      (b.effective_from || '').localeCompare(a.effective_from || '')
    )
    return { activeGdda: active, upcomingGdda: upcoming, gddaHistory: history }
  }, [staffs, today])

  const { activeTkda, upcomingTkda, tkdaHistory } = useMemo(() => {
    const list = staffs.filter((s: any) => s.role === 'project_secretary')
    const active = list.find((s: any) => {
      const from = s.effective_from || ''
      const to = s.effective_to || ''
      return from <= today && (!to || to >= today)
    })
    const upcoming = list.find((s: any) => {
      const from = s.effective_from || ''
      return from > today
    })
    const history = [...list].sort((a: any, b: any) =>
      (b.effective_from || '').localeCompare(a.effective_from || '')
    )
    return { activeTkda: active, upcomingTkda: upcoming, tkdaHistory: history }
  }, [staffs, today])

  return (
    <Flex direction="column" gap="5" px="7" className="pt-0 pb-6">
      <Flex direction="column" gap="4">
        <Flex align="center" gap="2" className="mt-0 mb-4">
          <Info className="text-brand-primary h-[18px] w-[18px]" />
          <Text className="typo-body-sm-semibold text-content-dark-3 tracking-[0.06em] uppercase">
            Thông tin dự án
          </Text>
          <div className="bg-border-1 h-[1px] flex-grow" />
        </Flex>
        <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            <DisplayField label="Mã dự án" value={project.code} />
            <DisplayField label="Tên dự án" value={project.name} />
            <DisplayField label="Loại dự án" value={projectTypeLabel} />
            <DisplayField label="Giai đoạn hiện tại" value={phaseLabel} />
            <DisplayField label="Loại nguồn sản phẩm" value={sourceTypeLabel} />
            <DisplayField label="Chủ đầu tư" value={investorDisplay} />
            <DisplayField
              label="Trạng thái"
              value={<Chip label={statusLabel} variant={statusVariant} size="small" />}
            />
            <DisplayField label="Ngày mở bán" value={formatDate(project.sale_open_date)} />
            <DisplayField
              label="Ngày bắt đầu dự kiến"
              value={formatDate(project.planned_start_date)}
            />
            <DisplayField
              label="Ngày kết thúc dự kiến"
              value={formatDate(project.planned_end_date)}
            />
            <DisplayField label="Ngày tạo" value={createdDate} />
            <DisplayField label="Ngày cập nhật cuối cùng" value={updatedDate} />
            <DisplayField
              label="Tổng số căn"
              value={
                project.total_units !== null && project.total_units !== undefined
                  ? String(project.total_units)
                  : '-'
              }
            />
            <DisplayField label="Giá bán ước tính bình quân (VND)" value={avgPriceDisplay} />
          </div>
          <Separator className="my-6" />
          <DisplayField label="Địa chỉ" value={project.address || '-'} />
          <Separator className="my-6" />
          <DisplayField label="Mô tả" value={descriptionDisplay} />
        </div>

        <Flex align="center" gap="2" className="mt-[26px] mb-[12px]">
          <Users className="text-brand-primary h-[18px] w-[18px]" />
          <Text className="typo-body-sm-semibold text-content-dark-3 tracking-[0.06em] uppercase">
            Đầu mối dự án
          </Text>
          <div className="bg-border-1 h-[1px] flex-grow" />
        </Flex>
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
                  <Text className="text-content-dark-1 typo-body-lg-semibold">
                    {activeGdda?.employee?.fullname ||
                      activeGdda?.employee?.code ||
                      '— Chưa phân công —'}
                  </Text>
                </div>
              </Flex>
              {canUpdate && (
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  leftIcon={
                    activeGdda ? (
                      <ArrowLeftRight className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )
                  }
                  onClick={() => handleOpenHandover('project_director', 'Giám đốc dự án', 'GDDA')}
                >
                  {activeGdda ? 'Chuyển giao' : 'Thêm'}
                </Button>
              )}
            </Flex>
            {activeGdda ? (
              <div className="bg-surface-secondary-default border-border-1 flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Text className="text-content-dark-3 typo-body-sm-medium block">
                    {activeGdda.employee?.code} ·{' '}
                    {activeGdda.employee?.department?.name || 'Phòng Kinh doanh'}
                  </Text>
                  <Text className="text-content-dark-3 typo-body-sm-medium mt-1 block">
                    Hiệu lực từ {formatDate(activeGdda.effective_from)} →{' '}
                    {activeGdda.effective_to ? formatDate(activeGdda.effective_to) : 'nay'}
                  </Text>
                </div>
                <Chip
                  label="Đang hiệu lực"
                  variant={ColoredValueVariant.GREEN}
                  type="outlined"
                  showDot
                />
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
                  <b>{upcomingGdda.employee?.fullname}</b> sẽ nhận GDDA từ{' '}
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
                  <Text className="text-content-dark-1 typo-body-lg-semibold">
                    {activeTkda?.employee?.fullname ||
                      activeTkda?.employee?.code ||
                      '— Chưa phân công —'}
                  </Text>
                </div>
              </Flex>
              {canUpdate && (
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  leftIcon={
                    activeTkda ? (
                      <ArrowLeftRight className="h-4 w-4" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )
                  }
                  onClick={() => handleOpenHandover('project_secretary', 'Thư ký dự án', 'TKDA')}
                >
                  {activeTkda ? 'Chuyển giao' : 'Thêm'}
                </Button>
              )}
            </Flex>
            {activeTkda ? (
              <div className="bg-surface-secondary-default border-border-1 flex items-center justify-between rounded-lg border p-4">
                <div>
                  <Text className="text-content-dark-3 typo-body-sm-medium block">
                    {activeTkda.employee?.code} ·{' '}
                    {activeTkda.employee?.department?.name || 'Thư ký dự án'}
                  </Text>
                  <Text className="text-content-dark-3 typo-body-sm-medium mt-1 block">
                    Hiệu lực từ {formatDate(activeTkda.effective_from)} →{' '}
                    {activeTkda.effective_to ? formatDate(activeTkda.effective_to) : 'nay'}
                  </Text>
                </div>
                <Chip
                  label="Đang hiệu lực"
                  variant={ColoredValueVariant.GREEN}
                  type="outlined"
                  showDot
                />
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
                  <b>{upcomingTkda.employee?.fullname}</b> sẽ nhận TKDA từ{' '}
                  <b>{formatDate(upcomingTkda.effective_from)}</b>
                </span>
              </div>
            )}
          </div>
        </Grid>

        <Flex align="center" gap="2" className="mt-[26px] mb-[12px]">
          <Clock className="text-brand-primary h-[18px] w-[18px]" />
          <Text className="typo-body-sm-semibold text-content-dark-3 tracking-[0.06em] uppercase">
            Lịch sử bổ nhiệm
          </Text>
          <div className="bg-border-1 h-[1px] flex-grow" />
        </Flex>
        <Grid columns={{ initial: '1', md: '2' }} gap="4">
          {/* GDDA History */}
          <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-[20px]">
            <Flex
              align="center"
              gap="2"
              className="typo-body-sm-semibold text-brand-primary mb-[8px] tracking-[0.04em] uppercase"
            >
              <UserCog className="h-[15px] w-[15px]" />
              <span>GDDA — Giám đốc dự án</span>
            </Flex>
            <div className="divide-border-1 max-h-[300px] divide-y overflow-y-auto pr-2">
              {gddaHistory.length > 0 ? (
                gddaHistory.map((h: any, i: number) => {
                  const empName = h.employee?.fullname || h.employee?.code || '-'
                  return (
                    <div
                      key={h.id || i}
                      className="flex items-center gap-[11px] px-[2px] py-[10px]"
                    >
                      <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-[#f1f5f9] text-[11px] font-semibold text-[#475569]">
                        {getInitials(empName)}
                      </div>
                      <div className="flex-grow">
                        <span className="text-content-dark-1 block text-[13px] leading-tight font-semibold">
                          {empName}
                        </span>
                        <span className="text-content-dark-3 mt-0.5 block text-[11.5px]">
                          {formatDate(h.effective_from)} →{' '}
                          {h.effective_to ? formatDate(h.effective_to) : 'nay'}
                        </span>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        {renderStatusChip(h)}
                        {canUpdate && i === 0 && (
                          <Button
                            type="button"
                            variant="secondary-border"
                            size="small"
                            leftIcon={<Pencil className="h-3.5 w-3.5" />}
                            onClick={() =>
                              handleOpenEdit(h, 'project_director', 'Giám đốc dự án', 'GDDA')
                            }
                          >
                            Sửa
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-content-dark-3 px-[2px] py-[10px] text-[13px] italic">
                  Chưa có bổ nhiệm nào.
                </div>
              )}
            </div>
          </div>

          {/* TKDA History */}
          <div className="border-border-1 bg-surface-primary-default flex flex-col rounded-xl border p-[20px]">
            <Flex
              align="center"
              gap="2"
              className="typo-body-sm-semibold text-green-70 mb-[8px] tracking-[0.04em] uppercase"
            >
              <Users className="h-[15px] w-[15px]" />
              <span>TKDA — Thư ký dự án</span>
            </Flex>
            <div className="divide-border-1 max-h-[300px] divide-y overflow-y-auto pr-2">
              {tkdaHistory.length > 0 ? (
                tkdaHistory.map((h: any, i: number) => {
                  const empName = h.employee?.fullname || h.employee?.code || '-'
                  return (
                    <div
                      key={h.id || i}
                      className="flex items-center gap-[11px] px-[2px] py-[10px]"
                    >
                      <div className="flex h-[30px] w-[30px] flex-shrink-0 items-center justify-center rounded-full bg-[#f1f5f9] text-[11px] font-semibold text-[#475569]">
                        {getInitials(empName)}
                      </div>
                      <div className="flex-grow">
                        <span className="text-content-dark-1 block text-[13px] leading-tight font-semibold">
                          {empName}
                        </span>
                        <span className="text-content-dark-3 mt-0.5 block text-[11.5px]">
                          {formatDate(h.effective_from)} →{' '}
                          {h.effective_to ? formatDate(h.effective_to) : 'nay'}
                        </span>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        {renderStatusChip(h)}
                        {canUpdate && i === 0 && (
                          <Button
                            type="button"
                            variant="secondary-border"
                            size="small"
                            leftIcon={<Pencil className="h-3.5 w-3.5" />}
                            onClick={() =>
                              handleOpenEdit(h, 'project_secretary', 'Thư ký dự án', 'TKDA')
                            }
                          >
                            Sửa
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="text-content-dark-3 px-[2px] py-[10px] text-[13px] italic">
                  Chưa có bổ nhiệm nào.
                </div>
              )}
            </div>
          </div>
        </Grid>
      </Flex>
    </Flex>
  )
}

export default ProjectOverview

import { Button } from '@/components/ui'
import { IconCaretdown, IconDownloadsimple } from '@/assets/icons'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx'
import useAppConstant from '@/hooks/useAppConstant'
import { APP_CONSTANT_KEY } from '@/constants/app-constant-key'
import { useMemo } from 'react'
import { Separator } from '@radix-ui/themes'
import {
  ContractExportTemplate,
  RecruitmentRequestExportType,
} from '@/constants/api-schema-aliases'

interface ContractActionsProps {
  onExportWithTemplate: (
    template: ContractExportTemplate,
    docType?: RecruitmentRequestExportType
  ) => void
}

const QN_TEMPLATE_VALUES = [
  ContractExportTemplate.contract_qn_sale,
  ContractExportTemplate.contract_qn_support,
]

const ContractActions = ({ onExportWithTemplate }: ContractActionsProps) => {
  const { keysMap: constantsMap } = useAppConstant({
    module: 'hrm',
    keys: [APP_CONSTANT_KEY.HRM.CONTRACT_EXPORT_TEMPLATE],
  })
  const contractExportTemplateMap =
    constantsMap.get(APP_CONSTANT_KEY.HRM.CONTRACT_EXPORT_TEMPLATE) || {}

  const templateOptions = useMemo(() => {
    return Object.values(ContractExportTemplate)
      .filter((v) => !QN_TEMPLATE_VALUES.includes(v))
      .map((v) => ({
        label: contractExportTemplateMap[v],
        value: ContractExportTemplate[v],
      }))
  }, [])

  const qnTemplateOptions = useMemo(() => {
    return Object.values(ContractExportTemplate)
      .filter((v) => QN_TEMPLATE_VALUES.includes(v))
      .map((v) => ({
        label: contractExportTemplateMap[v],
        value: ContractExportTemplate[v],
      }))
  }, [])

  const qnTemplateOptionsDocs = useMemo(
    () => qnTemplateOptions.map((v) => ({ ...v, label: `${v.label} (Docx)` })),
    [qnTemplateOptions]
  )
  const qnTemplateOptionsPdf = useMemo(
    () => qnTemplateOptions.map((v) => ({ ...v, label: `${v.label} (PDF)` })),
    [qnTemplateOptions]
  )

  // Common reusable button component
  const ActionButton = ({
    label,
    onClick,
    leftIcon,
  }: {
    label: string
    onClick: () => void
    leftIcon: React.ReactNode
  }) => (
    <Button
      variant="text"
      className="hover:bg-background-3 flex w-full cursor-pointer items-center gap-2 px-3 py-4 text-left transition-colors"
      onClick={onClick}
      leftIcon={leftIcon}
    >
      <span className="typo-body-base text-content-dark-1">{label}</span>
    </Button>
  )

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          size="small"
          variant="secondary"
          rightIcon={<IconCaretdown className="h-3.5 w-3.5" />}
        >
          Xuất file
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="start"
        className="w-fit rounded-[3px] border-none bg-white p-4 shadow-lg"
      >
        <div className="flex items-center justify-between px-3 py-1 pb-3">
          <span className="text-content-dark-2 typo-body-base-semibold">Chọn mẫu xuất</span>
        </div>
        <div className="flex flex-col gap-1">
          {templateOptions.map((option) => (
            <ActionButton
              key={option.value}
              label={option.label}
              onClick={() => onExportWithTemplate(option.value)}
              leftIcon={<IconDownloadsimple className="text-content-dark-2 h-5 w-5" />}
            />
          ))}
          <Separator className={'!w-full'} />
          {qnTemplateOptionsDocs.map((option) => (
            <ActionButton
              key={option.value}
              label={option.label}
              onClick={() => onExportWithTemplate(option.value, RecruitmentRequestExportType.docx)}
              leftIcon={<IconDownloadsimple className="text-content-dark-2 h-5 w-5" />}
            />
          ))}
          <Separator className={'!w-full'} />
          {qnTemplateOptionsPdf.map((option) => (
            <ActionButton
              key={option.value}
              label={option.label}
              onClick={() => onExportWithTemplate(option.value, RecruitmentRequestExportType.pdf)}
              leftIcon={<IconDownloadsimple className="text-content-dark-2 h-5 w-5" />}
            />
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

export default ContractActions

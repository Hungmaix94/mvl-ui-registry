import { useRef, useCallback } from 'react'
import { Flex, Text } from '@radix-ui/themes'
import { Button, TextField } from '@/components/ui'
import { IconPlus, IconTrash } from '@/assets/icons'
import { cn } from '@/utils'

type ColumnConfig = {
  key: string
  header: string
  placeholder?: string
}

type BranchCsvMultiRowFieldProps<Row extends Record<string, string>> = {
  title: string
  description?: string
  columns: ColumnConfig[]
  rows: Row[]
  onChange: (rows: Row[]) => void
  isDisabled?: boolean
  errorMessage?: string
  gridTemplateColsClass: string
}

function BranchCsvMultiRowField<Row extends Record<string, string>>({
  title,
  description,
  columns,
  rows,
  onChange,
  isDisabled,
  errorMessage,
  gridTemplateColsClass,
}: BranchCsvMultiRowFieldProps<Row>) {
  const handleCellChange = (rowIndex: number, key: string, value: string) => {
    const nextRows = rows.map((row, index) =>
      index === rowIndex
        ? {
            ...row,
            [key]: value,
          }
        : row
    )

    onChange(nextRows)
  }

  const handleAddRow = () => {
    const emptyRow = columns.reduce(
      (acc, col) => ({
        ...acc,
        [col.key]: '',
      }),
      {} as Row
    )

    onChange([...rows, emptyRow])
  }

  const handleRemoveRow = (rowIndex: number) => {
    const nextRows = rows.filter((_, index) => index !== rowIndex)
    onChange(nextRows)
  }

  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const numCols = columns.length
  const numRows = rows.length

  const focusCell = useCallback(
    (rowIndex: number, colIndex: number) => {
      const r = Math.max(0, Math.min(rowIndex, numRows - 1))
      const c = Math.max(0, Math.min(colIndex, numCols - 1))
      const key = `${r}-${c}`
      inputRefs.current[key]?.focus()
    },
    [numRows, numCols]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, rowIndex: number, colIndex: number) => {
      const key = e.key
      if (key !== 'ArrowLeft' && key !== 'ArrowRight' && key !== 'ArrowUp' && key !== 'ArrowDown') {
        return
      }
      e.preventDefault()
      if (key === 'ArrowRight') {
        if (colIndex < numCols - 1) focusCell(rowIndex, colIndex + 1)
        else if (rowIndex < numRows - 1) focusCell(rowIndex + 1, 0)
      } else if (key === 'ArrowLeft') {
        if (colIndex > 0) focusCell(rowIndex, colIndex - 1)
        else if (rowIndex > 0) focusCell(rowIndex - 1, numCols - 1)
      } else if (key === 'ArrowDown') {
        if (rowIndex < numRows - 1) focusCell(rowIndex + 1, colIndex)
      } else if (key === 'ArrowUp') {
        if (rowIndex > 0) focusCell(rowIndex - 1, colIndex)
      }
    },
    [numRows, numCols, focusCell]
  )

  const hasRows = rows.length > 0

  return (
    <Flex direction="column" gap="2" className="bg-background-1 rounded-lg pt-3">
      <Flex direction="column" gap="1">
        <Text className="typo-body-base-semibold text-content-dark-2">{title}</Text>
        {description ? (
          <Text className="typo-body-sm text-content-dark-3">{description}</Text>
        ) : null}
      </Flex>

      <Flex direction="column" gap="2">
        {hasRows && (
          <>
            <div
              className={cn(
                'typo-body-xs text-content-dark-3 grid items-center gap-3',
                gridTemplateColsClass
              )}
            >
              {columns.map((col) => (
                <div key={col.key} className="typo-body-sm-medium pl-0">
                  {col.header}
                </div>
              ))}
              <div />
            </div>

            {rows.map((row, rowIndex) => (
              <div key={rowIndex} className={cn('grid items-center gap-3', gridTemplateColsClass)}>
                {columns.map((col, colIndex) => (
                  <TextField
                    key={`${rowIndex}-${colIndex}-${col.key}`}
                    ref={(el) => {
                      inputRefs.current[`${rowIndex}-${colIndex}`] = el
                    }}
                    value={(row[col.key] as string) ?? ''}
                    onChange={(value) => handleCellChange(rowIndex, col.key, value)}
                    onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                    placeholder={col.placeholder}
                    disabled={isDisabled}
                  />
                ))}
                <div className="flex items-center justify-center">
                  <Button
                    type="button"
                    variant="text"
                    size="small"
                    iconOnly
                    onClick={() => handleRemoveRow(rowIndex)}
                    disabled={isDisabled}
                    aria-label="Xóa dòng"
                  >
                    <IconTrash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </>
        )}
      </Flex>

      {errorMessage ? (
        <Text className="text-action-primary-red-default text-xs">{errorMessage}</Text>
      ) : null}

      <div>
        <Button
          type="button"
          variant="secondary-border"
          size="small"
          onClick={handleAddRow}
          disabled={isDisabled}
          leftIcon={<IconPlus className="h-3.5 w-3.5" />}
          className={'border-neutral-60 border-[1px]'}
        >
          Thêm
        </Button>
      </div>
    </Flex>
  )
}

export default BranchCsvMultiRowField

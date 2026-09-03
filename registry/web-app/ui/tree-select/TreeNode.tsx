import React from 'react'
import { TreeNodeData } from './types'
import { IconCaretdown, IconCaretright } from '@/assets/icons/arrows'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/utils'

interface TreeNodeProps {
  node: TreeNodeData
  level: number
  isExpanded: boolean
  onToggleExpand: (nodeId: string | number) => void
  onToggleSelect: (nodeId: string | number, isSelected: boolean) => void
  isSelected: boolean
  isIndeterminate: boolean
}

const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  level,
  isExpanded,
  onToggleExpand,
  onToggleSelect,
  isSelected,
  isIndeterminate,
}) => {
  const hasChildren = node.children && node.children.length > 0

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleExpand(node.id)
  }

  const handleToggleSelect = (checked: boolean) => {
    onToggleSelect(node.id, checked)
  }

  return (
    <div className="flex flex-col">
      <div
        className={cn(
          'flex cursor-pointer items-center rounded-sm py-1 hover:bg-gray-100',
          isSelected && 'bg-gray-100'
        )}
        style={{ paddingLeft: `${level * 20}px` }}
      >
        {hasChildren && (
          <span onClick={handleToggleExpand} className="mr-1">
            {isExpanded ? (
              <IconCaretdown size={16} className="text-gray-500" />
            ) : (
              <IconCaretright size={16} className="text-gray-500" />
            )}
          </span>
        )}
        {!hasChildren && <span className="mr-1" style={{ width: '16px' }} />} {/* Spacer */}
        <Checkbox
          id={`checkbox-${node.id}`}
          checked={isIndeterminate ? 'indeterminate' : isSelected}
          onCheckedChange={handleToggleSelect}
          className="mr-2"
        />
        <label htmlFor={`checkbox-${node.id}`} className="flex-1 cursor-pointer">
          {node.name}
        </label>
      </div>
    </div>
  )
}

export default TreeNode

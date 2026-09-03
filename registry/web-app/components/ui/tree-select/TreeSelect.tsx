import React, { useState, useMemo, useCallback, useEffect } from 'react'
import { TreeNodeData } from './types'
import TreeNode from './TreeNode'
import { useDepartmentTree } from '@/features/org/services/department-service'
import { cn } from '@/lib/utils'
import { Popover, PopoverContentPrimitive, PopoverTrigger } from '@/components/ui/popover'
import Chip from '@/components/ui/chip/Chip'
import { ColoredValueVariant } from '@/api/schema.ts'
import { SearchIcon } from 'lucide-react'

export interface TreeSelectProps {
  value?: (string | number)[]
  onChange?: (selectedIds: (string | number)[]) => void
  data?: TreeNodeData[] // Optional: if data is provided externally
  placeholder?: string
  className?: string
}

const getInitialExpandedState = (nodes: TreeNodeData[]): Record<string | number, boolean> => {
  const expanded: Record<string | number, boolean> = {}
  nodes.forEach((node) => {
    if (node.children && node.children.length > 0) {
      expanded[node.id] = true // Expand all by default for now
      Object.assign(expanded, getInitialExpandedState(node.children))
    }
  })
  return expanded
}

const flattenTree = (nodes: TreeNodeData[]): TreeNodeData[] => {
  let flat: TreeNodeData[] = []
  nodes.forEach((node) => {
    flat.push(node)
    if (node.children) {
      flat = flat.concat(flattenTree(node.children))
    }
  })
  return flat
}

// Filter tree nodes by search query - keeps parents if any child matches
const filterTree = (nodes: TreeNodeData[], query: string): TreeNodeData[] => {
  if (!query.trim()) return nodes

  const lowerQuery = query.toLowerCase()

  return nodes.reduce<TreeNodeData[]>((acc, node) => {
    const nodeMatches = node.name.toLowerCase().includes(lowerQuery)
    const filteredChildren = node.children ? filterTree(node.children, query) : []

    if (nodeMatches || filteredChildren.length > 0) {
      acc.push({
        ...node,
        children: filteredChildren.length > 0 ? filteredChildren : node.children,
      })
    }
    return acc
  }, [])
}

const TreeSelect: React.FC<TreeSelectProps> = ({
  value = [],
  onChange,
  data: propData,
  placeholder = 'Select departments...',
  className,
}) => {
  const { data: fetchedTreeData } = useDepartmentTree()

  const treeData = useMemo(() => {
    if (propData) return propData
    // Fallback: Check if fetchedTreeData is an array, otherwise wrap it or default empty
    if (Array.isArray(fetchedTreeData)) return fetchedTreeData as TreeNodeData[]
    return []
  }, [propData, fetchedTreeData])

  const [expandedNodes, setExpandedNodes] = useState<Record<string | number, boolean>>({})

  // Expand all nodes when treeData changes
  useEffect(() => {
    setExpandedNodes(getInitialExpandedState(treeData))
  }, [treeData])

  // Ensure value is always an array
  const [selectedNodeIds, setSelectedNodeIds] = useState<(string | number)[]>(
    Array.isArray(value) ? value : []
  )
  const [searchQuery, setSearchQuery] = useState<string>('')

  useEffect(() => {
    setSelectedNodeIds(Array.isArray(value) ? value : [])
  }, [value])

  // Filter tree based on search query
  const filteredTreeData = useMemo(() => {
    return filterTree(treeData, searchQuery)
  }, [treeData, searchQuery])

  const allFlatNodes = useMemo(() => flattenTree(treeData), [treeData])
  const nodeMap = useMemo(() => {
    const map = new Map<string | number, TreeNodeData>()
    allFlatNodes.forEach((node) => map.set(node.id, node))
    return map
  }, [allFlatNodes])

  // Helper to get all leaf node IDs (recursively)
  const getAllLeafIds = useCallback((nodes: TreeNodeData[]): (string | number)[] => {
    let leaves: (string | number)[] = []
    nodes.forEach((node) => {
      if (!node.children || node.children.length === 0) {
        leaves.push(node.id)
      } else {
        leaves = leaves.concat(getAllLeafIds(node.children))
      }
    })
    return leaves
  }, [])

  // Determine selection state (selected, indeterminate)
  const getNodeSelectionState = useCallback(
    (node: TreeNodeData) => {
      const isNodeExplicitlySelected = selectedNodeIds.includes(node.id)

      // If no children, simple check
      if (!node.children || node.children.length === 0) {
        return { isSelected: isNodeExplicitlySelected, isIndeterminate: false }
      }

      // For parents, check all DESCENDANT LEAVES
      const leafIds = getAllLeafIds(node.children)
      const allLeavesSelected =
        leafIds.length > 0 && leafIds.every((id) => selectedNodeIds.includes(id))
      const someLeavesSelected = leafIds.some((id) => selectedNodeIds.includes(id))

      if (isNodeExplicitlySelected || allLeavesSelected) {
        return { isSelected: true, isIndeterminate: false }
      }

      if (someLeavesSelected) {
        return { isSelected: false, isIndeterminate: true }
      }

      return { isSelected: false, isIndeterminate: false }
    },
    [selectedNodeIds, getAllLeafIds]
  )

  const isDescendant = useCallback((ancestor: TreeNodeData, descendant: TreeNodeData): boolean => {
    if (!ancestor.children) return false
    if (ancestor.children.some((child) => child.id === descendant.id)) return true
    return ancestor.children.some((child) => isDescendant(child, descendant))
  }, [])

  const toggleExpand = useCallback((nodeId: string | number) => {
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }))
  }, [])

  const toggleSelect = useCallback(
    (nodeId: string | number, isChecked: boolean) => {
      let newSelectedIds = new Set(selectedNodeIds)
      const node = nodeMap.get(nodeId)

      if (!node) return

      // 1. Handle the node itself
      if (isChecked) {
        newSelectedIds.add(nodeId)
      } else {
        newSelectedIds.delete(nodeId)
      }

      // 2. Handle children
      const updateChildren = (children: TreeNodeData[], select: boolean) => {
        children.forEach((child) => {
          if (select) {
            newSelectedIds.add(child.id)
          } else {
            newSelectedIds.delete(child.id)
          }
          if (child.children) {
            updateChildren(child.children, select)
          }
        })
      }
      if (node.children) {
        updateChildren(node.children, isChecked)
      }

      // 3. Handle parents (indeterminate state)
      const updateParents = (currentNodeId: string | number) => {
        const parent = allFlatNodes.find((n) => n.children?.some((c) => c.id === currentNodeId))
        if (parent) {
          const parentChildrenIds = parent.children?.map((c) => c.id) || []
          const selectedParentChildren = parentChildrenIds.filter((id) => newSelectedIds.has(id))

          if (selectedParentChildren.length === parentChildrenIds.length) {
            newSelectedIds.add(parent.id) // All children selected, select parent
            updateParents(parent.id)
          } else if (selectedParentChildren.length > 0) {
            // Some children selected, parent is indeterminate (not explicitly stored in selectedNodeIds)
            newSelectedIds.delete(parent.id)
            updateParents(parent.id)
          } else {
            newSelectedIds.delete(parent.id) // No children selected, deselect parent
            updateParents(parent.id)
          }
        }
      }
      updateParents(nodeId)

      setSelectedNodeIds(Array.from(newSelectedIds))
      if (onChange) {
        onChange(Array.from(newSelectedIds))
      }
    },
    [selectedNodeIds, onChange, allFlatNodes, nodeMap]
  )

  const renderTreeNodes = (nodes: TreeNodeData[], level: number = 0) => {
    return nodes.map((node) => {
      const { isSelected, isIndeterminate } = getNodeSelectionState(node)
      const hasChildren = node.children && node.children.length > 0
      const isNodeExpanded = expandedNodes[node.id] || false

      return (
        <React.Fragment key={node.id}>
          <TreeNode
            node={node}
            level={level}
            isExpanded={isNodeExpanded}
            onToggleExpand={toggleExpand}
            onToggleSelect={toggleSelect}
            isSelected={isSelected}
            isIndeterminate={isIndeterminate}
          />
          {isNodeExpanded && hasChildren && node.children && (
            <div className="pl-4">{renderTreeNodes(node.children, level + 1)}</div>
          )}
        </React.Fragment>
      )
    })
  }

  const visibleSelectedIds = useMemo(() => {
    return selectedNodeIds.filter((id) => {
      const node = nodeMap.get(id)
      if (!node) return false

      // Check if any ANCESTOR is also selected. If so, don't show this node (it's covered by ancestor)
      return !selectedNodeIds.some((otherId) => {
        if (id === otherId) return false
        const otherNode = nodeMap.get(otherId)
        if (!otherNode) return false
        return isDescendant(otherNode, node)
      })
    })
  }, [selectedNodeIds, nodeMap, isDescendant])

  const handleRemoveChip = (id: string | number) => {
    toggleSelect(id, false)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <div className={cn('relative w-full cursor-pointer', className)}>
          <div className="flex max-h-[80px] min-h-[40px] flex-wrap items-start gap-2 overflow-y-auto rounded border border-gray-300 p-2">
            {visibleSelectedIds.length > 0 ? (
              visibleSelectedIds.map((id) => {
                const node = nodeMap.get(id)
                if (!node) return null
                return (
                  <Chip
                    key={id}
                    label={node.name}
                    variant={ColoredValueVariant.GREEN}
                    type="outlined"
                    size="large"
                    onRemove={() => handleRemoveChip(id)}
                  />
                )
              })
            ) : (
              <span className="text-sm text-gray-400">{placeholder}</span>
            )}
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContentPrimitive
        className="z-[100] w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-md border border-gray-200 bg-white p-0 shadow-lg"
        align="start"
        side="bottom"
        sideOffset={4}
        avoidCollisions={false}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-3 py-2">
          <SearchIcon className="size-4 shrink-0 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-gray-400"
          />
        </div>
        {/* Tree list */}
        <div className="max-h-[180px] overflow-y-auto p-2">
          {filteredTreeData.length > 0 ? (
            renderTreeNodes(filteredTreeData)
          ) : (
            <div className="py-4 text-center text-sm text-gray-500">Không tìm thấy kết quả</div>
          )}
        </div>
      </PopoverContentPrimitive>
    </Popover>
  )
}

export default TreeSelect

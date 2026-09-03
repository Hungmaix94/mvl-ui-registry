# Table Component

The Table component is built on top of TanStack Table and Radix UI themes, providing a powerful and accessible data table solution.

## Features

- ✅ Column-specific sorting (configured per column)
- ✅ Frozen columns (sticky positioning)
- ✅ Column alignment (left, center, right)
- ✅ Row selection (single/multiple)
- ✅ Pagination
- ✅ Loading states
- ✅ Empty states
- ✅ Actions column
- ✅ **Row click to show actions** (click any row to open action menu)
- ✅ STT (serial number) column
- ✅ Responsive design

## Usage

### Basic Example

```tsx
import { Table } from '@/components/ui/table'
import { ColumnDef } from '@tanstack/react-table'

type User = {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
}

const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    meta: {
      sortable: true, // Enable sorting for this column
      align: 'left',
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
    meta: {
      sortable: true, // Enable sorting for this column
      align: 'left',
    },
  },
  {
    accessorKey: 'role',
    header: 'Role',
    meta: {
      sortable: false, // Disable sorting for this column
      align: 'center',
    },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
    meta: {
      sortable: true, // Enable sorting for this column
      align: 'right',
      frozen: true, // Make this column sticky
    },
  },
]

function UserTable() {
  return (
    <Table<User>
      data={users}
      columns={columns}
      enableSorting={true}
      enablePagination={true}
      enableRowSelection={true}
      showSTT={true}
      showActions={true}
      rowActions={[
        {
          label: 'Edit',
          onClick: (user) => console.log('Edit', user),
        },
        {
          label: 'Delete',
          onClick: (user) => console.log('Delete', user),
          variant: 'danger',
        },
      ]}
    />
  )
}
```

## Column Configuration

### Meta Properties

Each column can have the following meta properties:

```tsx
{
  accessorKey: 'fieldName',
  header: 'Display Name',
  meta: {
    sortable: boolean,        // Enable/disable sorting for this column
    frozen: boolean,          // Make column sticky (left side)
    align: 'left' | 'center' | 'right', // Text alignment
    width: string,            // Fixed width (e.g., '200px', 'w-48')
    headerClassName: string,  // Custom CSS classes for header
    cellClassName: string     // Custom CSS classes for cells
  }
}
```

### Sorting Configuration

**Important**: Sorting is now controlled per column using `meta.sortable`:

- `meta.sortable: true` - Column can be sorted (shows sort indicators, hover effects, click handlers)
- `meta.sortable: false` - Column cannot be sorted (no sort indicators, no hover effects)
- No `meta.sortable` specified - Column cannot be sorted (default behavior)

### Frozen Columns

Columns with `meta.frozen: true` will stick to the left side of the table when scrolling horizontally:

```tsx
{
  accessorKey: 'id',
  header: 'ID',
  meta: {
    frozen: true,
    sortable: true
  }
}
```

## Props

| Prop                 | Type                                       | Default               | Description                                                                     |
| -------------------- | ------------------------------------------ | --------------------- | ------------------------------------------------------------------------------- |
| `data`               | `TData[]`                                  | -                     | Array of data objects                                                           |
| `columns`            | `ColumnDef<TData>[]`                       | -                     | Column definitions                                                              |
| `enableSorting`      | `boolean`                                  | `true`                | Global sorting toggle (but individual columns still need `meta.sortable: true`) |
| `enablePagination`   | `boolean`                                  | `true`                | Enable pagination                                                               |
| `enableRowSelection` | `boolean`                                  | `false`               | Enable row selection                                                            |
| `showSTT`            | `boolean`                                  | `true`                | Show serial number column                                                       |
| `showActions`        | `boolean`                                  | `false`               | Show actions column                                                             |
| `rowActions`         | `TableAction<TData>[]`                     | `[]`                  | Actions for each row                                                            |
| `density`            | `'compact' \| 'comfortable' \| 'spacious'` | `'comfortable'`       | Row density                                                                     |
| `pageSize`           | `number`                                   | `10`                  | Items per page                                                                  |
| `isLoading`          | `boolean`                                  | `false`               | Show loading state                                                              |
| `emptyMessage`       | `string`                                   | `'No data available'` | Message when no data                                                            |

## Migration Guide

### From Previous Version

If you're migrating from a version where all columns were sortable by default:

**Before:**

```tsx
const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    // All columns were sortable by default
  },
]
```

**After:**

```tsx
const columns: ColumnDef<User>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    meta: {
      sortable: true, // Explicitly enable sorting
    },
  },
]
```

## Row Click Behavior

When a row has actions defined, clicking anywhere on the row will automatically open the actions menu:

```tsx
// If rowActions is provided, clicking any row will show the action menu
<Table<User>
  data={users}
  columns={columns}
  rowActions={[
    {
      label: 'Edit',
      onClick: (user) => console.log('Edit', user),
    },
    {
      label: 'Delete',
      onClick: (user) => console.log('Delete', user),
      variant: 'danger',
    },
  ]}
/>
```

**Behavior:**

- ✅ Click any row → Opens action menu automatically
- ✅ Click action menu button → Opens action menu (normal behavior)
- ✅ Click outside action menu → Closes action menu
- ✅ Only rows with visible actions will be clickable

### Best Practices

1. **Be selective with sorting**: Only enable sorting on columns where it makes sense (text, numbers, dates)
2. **Use frozen columns sparingly**: Frozen columns reduce horizontal scrolling space
3. **Consider alignment**: Use center alignment for numbers and status indicators
4. **Test responsive behavior**: Ensure tables work well on mobile devices
5. **Row actions**: Use row click for primary actions, keep action column for secondary actions

# Button Component

Base button component được thiết kế **100% theo Figma design system** của dự án "My Viet Land Web", sử dụng Radix UI primitive, Tailwind CSS và color system đã được sync từ Figma.

## Features

- ✅ **Figma-First Design**: Ưu tiên hiển thị chính xác theo Figma design
- ✅ **Radix UI Primitive**: Sử dụng `@radix-ui/themes` Button làm accessible foundation
- ✅ 5 variants: `primary`, `secondary`, `secondary-border`, `link`, `text`
- ✅ 4 sizes: `extra-large`, `large`, `medium`, `small`
- ✅ 3 states: `default`, `hover`, `activated` (disabled handled by props)
- ✅ Icon support: left, right, icon-only
- ✅ Loading state với spinner animation cho tất cả button types
- ✅ Full TypeScript support
- ✅ Accessibility features (ARIA attributes, keyboard navigation)
- ✅ Responsive design
- ✅ Uses Figma color system (CSS variables từ sync)
- ✅ Uses Figma typography system (Inter font, exact sizing)
- ✅ No focus ring (theo Figma design)

## Usage

```tsx
import { Button } from '@/components/ui/button';

// Basic usage
<Button variant="primary" size="medium">
  Click me
</Button>

// With icons
<Button variant="primary" leftIcon={<IconCheckcircle />}>
  Save
</Button>

// Icon only - MUST provide icon
<Button variant="primary" iconOnly>
  <IconGear />
</Button>

// Loading state - works with all button types
<Button variant="primary" loading>
  Loading...
</Button>

// Disabled - automatically uses disabled state
<Button variant="primary" disabled>
  Disabled
</Button>

// Secondary activated state
<Button variant="secondary" state="activated">
  Activated
</Button>

// Text button with hover state
<Button variant="text" state="hover">
  Hover Text
</Button>
```

## Props

| Prop             | Type                                                                 | Default     | Description                             |
| ---------------- | -------------------------------------------------------------------- | ----------- | --------------------------------------- |
| `variant`        | `'primary' \| 'secondary' \| 'secondary-border' \| 'link' \| 'text'` | `'primary'` | Button style variant                    |
| `size`           | `'extra-large' \| 'large' \| 'medium' \| 'small'`                    | `'medium'`  | Button size                             |
| `state`          | `'default' \| 'hover' \| 'activated'`                                | `'default'` | Button state (disabled handled by prop) |
| `iconOnly`       | `boolean`                                                            | `false`     | Show only icon without text             |
| `showBackground` | `boolean`                                                            | `true`      | Show background (for icon-only buttons) |
| `leftIcon`       | `React.ReactNode`                                                    | -           | Icon to show on the left                |
| `rightIcon`      | `React.ReactNode`                                                    | -           | Icon to show on the right               |
| `disabled`       | `boolean`                                                            | `false`     | Disable the button (highest priority)   |
| `loading`        | `boolean`                                                            | `false`     | Show loading spinner                    |
| `onClick`        | `() => void`                                                         | -           | Click handler                           |

## State Priority

1. **`disabled={true}`** → Always uses disabled state (highest priority)
2. **`loading={true}`** → Shows loading spinner, disables button
3. **`state="hover"`** → Only works when not disabled/loading
4. **`state="activated"`** → Only for secondary variant

## Variant Details

### Primary

- **Default**: Red background (#b8292f) + white text
- **Hover**: Darker red (#800000) + white text
- **Disabled**: Light grey (#f2f2f2) + grey text

### Secondary

- **Default**: Grey background (#c7c7c7) + black text
- **Hover**: Dark grey (#878787) + **WHITE text**
- **Disabled**: Light grey (#f2f2f2) + grey text
- **Activated**: Light red background (#f7ebeb) + red text

### Secondary Border

- **Default**: Light background + 1.5px solid border
- **Hover**: Slightly darker background + same border
- **Disabled**: Grey background + grey border

### Link

- **Default**: Blue text (#4976f4), no underline
- **Hover**: Darker blue (#1f3f99) + underline
- **Disabled**: Light blue (#dbe4fd) + underline

### Text

- **Default**: Red text (#b8292f), transparent background
- **Hover**: Darker red (#800000), **still transparent**
- **Disabled**: Grey text (#c7c7c7), transparent background

## Size Specifications (Exact from Figma)

### Extra Large

- **Text buttons**: `px-[18px] py-3` (18px 12px)
- **Text variant**: `px-3 py-[6px]` (12px 6px)
- **Icon-only**: `p-3` (12px)
- **Typography**: 18px medium

### Large

- **Text buttons**: `px-[18px] py-2` (18px 8px)
- **Text variant**: `px-3 py-[6px]` (12px 6px)
- **Icon-only**: `p-[10px]` (10px)
- **Typography**: 16px medium

### Medium

- **Text buttons**: `px-3 py-2` (12px 8px)
- **Text variant**: `px-2 py-1` (8px 4px)
- **Icon-only**: `p-[10px]` (10px)
- **Typography**: 14px medium

### Small

- **Text buttons**: `px-3 py-2` (12px 8px)
- **Text variant**: `px-2 py-1` (8px 4px)
- **Icon-only**: `p-[9px]` (9px)
- **Typography**: 12px medium

## Loading Behavior

- **All button types**: Shows loading spinner
- **Text-only buttons**: `[🔄] Save`
- **With icons**: `[🔄] Save` (icons hidden)
- **Icon-only**: `[🔄]` (original icon hidden)
- **State**: Automatically disabled while loading

## Demo

Truy cập `/button-demo` để xem tất cả variants và states của component.

## Technical Details

- **Base**: Radix UI Button primitive với `asChild` pattern
- **Styling**: Tailwind CSS classes với CSS variables từ Figma
- **Accessibility**: ARIA attributes, keyboard navigation, focus management
- **Performance**: Efficient re-renders với React.forwardRef
- **TypeScript**: Full type safety với proper prop interfaces
- **Color System**: Sử dụng CSS variables từ Figma sync pipeline
- **Typography**: Sử dụng exact font sizes từ Figma
- **Focus**: No focus ring (focus:ring-0) theo Figma design

## Development

Xem `PROMPT.md` để có prompt tối ưu khi develop hoặc fix bugs cho component này.

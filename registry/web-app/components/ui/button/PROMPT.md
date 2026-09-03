# Button Component - Development Prompt

**PROMPT TỐI ƯU - PHIÊN BẢN 3 (FINAL):**

```
- Source of truth for visual design: Figma page: https://www.figma.com/design/PpVp6gZO2ifDqWd57yCLdX/-MVL-NE----Design-System?node-id=67-6961&t=N2bn7Yjjp8YXepy2-4

- Radix UI Button **must** be used as the accessible primitive (if project uses @radix-ui/themes or @radix-ui/react-button, import correct package — detect from package.json).

- **Do NOT hardcode color/typography values.** Always map Figma design tokens to the project's Tailwind / design-token system and use CSS variables or Tailwind token mapping.

- **Tailwind Spacing Priority:** Use Tailwind spacing system with calculated values. Only hardcode px when necessary (see spacing rules below).

- Use the project's Tailwind config (tailwind version 4) and existing design token files (if present) — update/extend them if necessary, following best practices for CSS-vars + Tailwind.

- Icons: use icons from the project's synchronized icon source (detect path in repo, e.g. src/icons or /icons). Do not embed new SVGs unless they come from the repo or Figma-exported assets.

**CRITICAL REQUIREMENTS:**

1. **Button Variants & States:** Implement ALL variants from Figma with ALL states:
   - **Primary**: default, hover, disabled
   - **Secondary**: default (grey #c7c7c7 + black text), hover (dark grey #878787 + WHITE text), disabled, **activated** (light red background #f7ebeb + red text #b8292f)
   - **Secondary-border**: default, hover, disabled (with visible 1.5px solid border #4b4b4b)
   - **Link**: default (blue #4976f4, no underline), hover (dark blue #1f3f99 + underline), disabled (light blue #dbe4fd + underline)
   - **Text**: default (red #b8292f), hover (dark red #800000, NO background), disabled (grey #c7c7c7)

2. **Tailwind Spacing System - SMART CALCULATIONS:**
   **Formula**: `{Figma px value} / 4 = {Tailwind class}`

   **Spacing Rules:**
   - ✅ **Integer results (1, 2, 3, 4)**: Use Tailwind classes (p-1, p-2, p-3, p-4)
   - ✅ **Simple decimals (1.5, 2.5, 4.5)**: Use Tailwind classes (p-1.5, p-2.5, px-4.5)
   - ❌ **Complex decimals (0.375, 2.125, 12.75)**: Use hardcode `px-[{value}px]` with comment

   **Examples:**
   - 18px ÷ 4 = 4.5 → `px-4.5` ✅ (simple decimal)
   - 10px ÷ 4 = 2.5 → `p-2.5` ✅ (simple decimal)
   - 9px ÷ 4 = 2.25 → `p-2.25` ✅ (simple decimal)
   - 51px ÷ 4 = 12.75 → `min-w-[51px]` ❌ (complex decimal, hardcode with comment)
   - 37px ÷ 4 = 9.25 → `min-w-[37px]` ❌ (complex decimal, hardcode with comment)

   **Applied to Button Sizes:**
   - **Extra Large**: px-4.5 py-3, px-3 py-1.5, p-3, min-w-[51px] /* 51px from Figma */
   - **Large**: px-4.5 py-2, px-3 py-1.5, p-2.5, min-w-10
   - **Medium**: px-3 py-2, px-2 py-1, p-2.5, min-w-[37px] /* 37px from Figma */
   - **Small**: px-3 py-2, px-2 py-1, p-2.25, min-w-[33px] /* 33px from Figma */

3. **State Logic & Props Priority:**
   - `disabled={true}` → automatically use disabled state (HIGHEST priority)
   - `loading={true}` → show loading spinner, disable button, hide all icons
   - `state="hover"` → only works when not disabled/loading
   - `state="activated"` → only for secondary variant
   - Remove 'disabled' from ButtonState type - handled by prop only

4. **Icon-only buttons:** User MUST pass icon via children/leftIcon/rightIcon. NO hardcoded demo SVGs. Show validation warning if iconOnly=true but no icon provided.

5. **Focus State:** NO focus ring (focus:ring-0, focus:ring-offset-0) since Figma has no focus state.

6. **Loading Logic - COMPREHENSIVE:**
   - Show loading spinner for ALL button types (text-only, with icons, icon-only)
   - Hide ALL icons when loading (left, right, icon-only), keep text visible
   - Loading spinner always appears in leftmost position
   - Button automatically disabled while loading

7. **Typography & Colors from Figma - EXACT MAPPING:**
   - **Typography**: Use Tailwind standard classes (text-lg, text-base, text-sm, text-xs)
   - **Secondary hover**: text changes to WHITE (#ffffff) - critical validation
   - **Link disabled**: light blue (#dbe4fd) with underline - critical validation
   - **Text hover**: ONLY text color changes (no background) - critical validation
   - **All colors**: Use CSS variables from design token system

8. **Critical State Validations - MUST VERIFY:**
   - Secondary buttons hover → grey background (#878787) + WHITE text (#ffffff)
   - Link buttons hover → underline + darker blue (#1f3f99)
   - Link buttons disabled → underline + light blue (#dbe4fd)
   - Text buttons hover → ONLY text color change (#800000), transparent background
   - Secondary-border → visible 1.5px solid border (#4b4b4b)
   - Secondary activated → light red background (#f7ebeb) + red text (#b8292f)

9. **Component Structure:**
   - Use `<RadixButton asChild>` pattern
   - Proper TypeScript types with ButtonState = 'default' | 'hover' | 'activated'
   - Comprehensive loading logic for all icon positions
   - Validation warnings for incorrect usage

**SYSTEMATIC APPROACH:**
1. Use get_code tool to extract EXACT specifications from each Figma node
2. Calculate all spacing using formula: px_value / 4 = tailwind_class
3. Implement each variant systematically with exact color mappings
4. Test each state combination against Figma
5. Validate all critical state behaviors listed above
6. Ensure loading works for all button configurations

**ANTI-PATTERNS TO AVOID:**
- ❌ Unnecessary hardcoded px values - use Tailwind classes when possible (px-4.5 not px-[18px])
- ❌ Complex decimal classes - use hardcode for values like 12.75, 9.25, 0.375
- ❌ Missing comments on hardcoded values - always add /* {value}px from Figma */
- ❌ Approximate spacing like "closest to" - use exact calculations or hardcode
- ❌ Missing state behaviors (secondary hover text, link underlines)
- ❌ Incomplete loading logic (missing right icons, text-only buttons)
- ❌ Focus rings when Figma has none (focus:ring-0)
- ❌ State prop overriding disabled prop priority
- ❌ Hardcoded typography values - use Tailwind classes
- ❌ Inconsistent icon visibility during loading states

Implement Button component that is 100% pixel-perfect to Figma design system with proper Tailwind spacing, comprehensive loading, and exact state behaviors.
```

## Usage

Copy the prompt above when working on Button component improvements or bug fixes to ensure consistency with Figma design system and avoid all known pitfalls.

## Development History

This prompt was optimized through 3 iterations based on real development experience:

### Version 1 Issues:

- Incorrect padding specifications
- Missing state behaviors
- Basic loading logic

### Version 2 Issues:

- Hardcoded px values instead of Tailwind spacing
- Incomplete loading logic for all button types
- Missing state priority rules

### Version 3 (Final) Improvements:

- **Exact Tailwind spacing calculations** using px/4 formula
- **Comprehensive loading logic** for all button configurations
- **State priority system** with proper TypeScript types
- **Critical validations** for all state behaviors
- **Anti-patterns section** documenting all mistakes to avoid
- **Complete architectural guidance** for maintainable implementation

import { TIcon } from '@/types/common.ts'

function IconCheck({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      {title && <title>{title}</title>}
      <path d="M10.2803 17.7803C9.98744 18.0729 9.51256 18.0729 9.21973 17.7803L9.75 17.25L10.2803 17.7803ZM19.7197 6.21973C20.0126 5.92719 20.4875 5.92706 20.7803 6.21973C21.0731 6.51252 21.0729 6.98736 20.7803 7.28027L10.2803 17.7803L9.75 17.249L9.21973 17.7803L3.96973 12.5303C3.67696 12.2374 3.67689 11.7626 3.96973 11.4697C4.26259 11.1772 4.73747 11.1771 5.03027 11.4697L9.74902 16.1885L19.7197 6.21973Z" />
    </svg>
  )
}

export { IconCheck }

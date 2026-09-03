import { TIcon } from '@/types/common.ts'

function IconShield({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M19.5 3.75C19.8978 3.75 20.2792 3.90815 20.5605 4.18945C20.8419 4.47076 21 4.85218 21 5.25V10.75C21 19.1619 13.8406 21.9348 12.4658 22.3906L12.4648 22.3896C12.1627 22.4914 11.8362 22.4916 11.5342 22.3896V22.3906C10.1594 21.9348 3 19.1619 3 10.75V5.25C3 4.85217 3.15815 4.47076 3.43945 4.18945C3.72076 3.90815 4.10217 3.75 4.5 3.75H19.5ZM4.5 10.75C4.5 18.0797 10.6921 20.529 12 20.9639C13.3079 20.529 19.5 18.0797 19.5 10.75V5.25H4.5V10.75Z" />
    </svg>
  )
}

export { IconShield }

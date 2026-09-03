import { TIcon } from '@/types/common.ts'

function IconFoldersimple({ size = 24, color = 'currentColor', title = '', ...props }: TIcon) {
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
      <path d="M8.75 4.5C9.07455 4.5 9.39075 4.60507 9.65039 4.7998L12.25 6.75H20.25C20.6478 6.75 21.0292 6.90815 21.3105 7.18945C21.5919 7.47076 21.75 7.85218 21.75 8.25V18.833C21.75 19.2087 21.6006 19.5693 21.335 19.835C21.0693 20.1006 20.7087 20.25 20.333 20.25H3.75C3.35218 20.25 2.97076 20.0919 2.68945 19.8105C2.40815 19.5292 2.25 19.1478 2.25 18.75V6C2.25 5.60217 2.40815 5.22076 2.68945 4.93945C2.97076 4.65815 3.35217 4.5 3.75 4.5H8.75ZM3.75 18.75H20.25V8.25H12.25C11.9254 8.25 11.6093 8.14493 11.3496 7.9502L8.75 6H3.75V18.75Z" />
    </svg>
  )
}

export { IconFoldersimple }

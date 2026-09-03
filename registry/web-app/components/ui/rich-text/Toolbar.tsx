import { useState, useEffect } from 'react'
import { Editor } from '@tiptap/react'
import {
  IconTextbolder,
  IconTextitalic,
  IconTextunderline,
  IconListbullets,
  IconListnumbers,
} from '@/assets/icons'
import { Button } from '@/components/ui'
import { cn } from '@/utils'

interface ToolbarProps {
  editor: Editor | null
}

const Toolbar = ({ editor }: ToolbarProps) => {
  const [_, setForceUpdate] = useState(0)

  useEffect(() => {
    if (editor) {
      const forceUpdate = () => setForceUpdate((p) => p + 1)
      editor.on('transaction', forceUpdate)
      return () => {
        editor.off('transaction', forceUpdate)
      }
    }
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className="border-border-1 bg-neutral-20 flex items-center gap-1 rounded-t-md border-b-0 p-1">
      <Button
        type="button"
        variant="secondary"
        size="small"
        iconOnly
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(
          'h-8 w-8 border-none bg-transparent',
          editor.isActive('bold') ? 'bg-neutral-50' : ''
        )}
      >
        <IconTextbolder />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="small"
        iconOnly
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(
          'h-8 w-8 border-none bg-transparent',
          editor.isActive('italic') ? 'bg-neutral-50' : ''
        )}
      >
        <IconTextitalic />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="small"
        iconOnly
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={cn(
          'h-8 w-8 border-none bg-transparent',
          editor.isActive('underline') ? 'bg-neutral-50' : ''
        )}
      >
        <IconTextunderline />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="small"
        iconOnly
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={cn(
          'h-8 w-8 border-none bg-transparent',
          editor.isActive('bulletList') ? 'bg-neutral-50' : ''
        )}
      >
        <IconListbullets />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="small"
        iconOnly
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={cn(
          'h-8 w-8 border-none bg-transparent',
          editor.isActive('orderedList') ? 'bg-neutral-50' : ''
        )}
      >
        <IconListnumbers />
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="small"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={cn(
          'flex h-8 w-8 items-center justify-center border-none bg-transparent p-0 text-center font-bold text-nowrap',
          editor.isActive('heading', { level: 1 }) ? 'bg-neutral-50' : ''
        )}
      >
        H1
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="small"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={cn(
          'flex h-8 w-8 items-center justify-center border-none bg-transparent p-0 text-center font-bold text-nowrap',
          editor.isActive('heading', { level: 2 }) ? 'bg-neutral-50' : ''
        )}
      >
        H2
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="small"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        className={cn(
          'flex h-8 w-8 items-center justify-center border-none bg-transparent p-0 text-center font-bold text-nowrap',
          editor.isActive('heading', { level: 3 }) ? 'bg-neutral-50' : ''
        )}
      >
        H3
      </Button>
    </div>
  )
}

export default Toolbar

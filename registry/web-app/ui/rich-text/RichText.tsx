import React, { useEffect } from 'react'
import { useEditor, EditorContent, useEditorState } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { CharacterCount } from '@tiptap/extensions'
import { cn } from '@/utils'
import { FormCaption } from '@/components/ui/form'
import Toolbar from './Toolbar'
import './RichText.css'

export interface RichTextProps {
  label?: string
  required?: boolean
  value?: string
  defaultValue?: string
  onChange?: (value: string) => void
  placeholder?: string
  error?: string
  caption?: string
  disabled?: boolean
  className?: string
  id?: string
  name?: string
  maxCharacters?: number
}

const RichText = React.forwardRef<HTMLDivElement, RichTextProps>(
  (
    {
      label,
      required,
      value,
      defaultValue,
      onChange,
      placeholder,
      error,
      caption,
      disabled = false,
      className,
      id,
      name,
      maxCharacters = 500,
    },
    ref
  ) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3],
          },
          bulletList: {
            keepMarks: true,
            keepAttributes: false,
          },
          orderedList: {
            keepMarks: true,
            keepAttributes: false,
          },
          underline: false,
        }),
        Underline,
        CharacterCount.configure({}),
      ],
      content: value || defaultValue || '',
      onUpdate: ({ editor }) => {
        onChange?.(editor.getHTML())
      },
      editable: !disabled,
      editorProps: {
        attributes: {
          class: 'rich-text-editor typo-body-base-regular focus:outline-none',
        },
      },
    })

    const { charactersCount } = useEditorState({
      editor,
      selector: (context) => ({
        charactersCount: context.editor.storage.characterCount.characters(),
        wordsCount: context.editor.storage.characterCount.words(),
      }),
    })

    useEffect(() => {
      if (editor && !editor.isDestroyed && value !== undefined && value !== editor.getHTML()) {
        editor.commands.setContent(value, { emitUpdate: false })
      }
    }, [value, editor])

    return (
      <div className={cn('flex w-full flex-col gap-2', className)} ref={ref}>
        {label && (
          <div className="flex items-center gap-0.5">
            <label htmlFor={id || name} className="typo-body-base-semibold text-neutral-90">
              {label}
            </label>
            {required && (
              <span className="typo-body-base-semibold text-action-primary-red-default">*</span>
            )}
          </div>
        )}
        <div
          className={cn(
            'rounded border',
            'border-neutral-60',
            disabled ? 'bg-data-light-grey-disabled' : 'bg-white',
            error ? 'border-data-red-default' : 'focus-within:border-neutral-100'
          )}
        >
          <Toolbar editor={editor} />
          <EditorContent editor={editor} placeholder={placeholder} />
          <div
            className={cn(
              'w-full',
              'flex justify-end pr-2 pb-2',
              'text-neutral-80 text-xs',
              disabled && 'text-content-dark-4'
            )}
          >
            {charactersCount}/{maxCharacters}
          </div>
        </div>
        <FormCaption caption={caption} error={error} disabled={disabled} />
      </div>
    )
  }
)

RichText.displayName = 'RichText'

export default RichText

import { useMemo, useEffect, useState, useRef } from 'react'
import { useToast } from '@/hooks/useToast.ts'
import type { Employee } from '@/features/employee/services/employee-service'
import {
  usePreviewTerminationEmail,
  type TerminationEmailPreviewResponse,
} from '@/features/employee/services/employee-email-service'
import { FullScreenLoading } from '@/components/Loading.tsx'
import { extractErrorMessage } from '@/utils/error-utils'

type TerminationEmailPreviewProps = {
  employee: Employee
}

export default function TerminationEmailPreview({ employee }: TerminationEmailPreviewProps) {
  const { error: showErrorToast } = useToast()
  const previewMutation = usePreviewTerminationEmail()
  const [emailPreview, setEmailPreview] = useState<TerminationEmailPreviewResponse | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const processHtmlForIsolation = useMemo(() => {
    return (html: string): string => {
      if (!html) return ''
      const uniqueId = `email-preview-${employee.id}`
      let processedHtml = html
      const styleTagRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi
      const styleMatches: Array<{ full: string; css: string }> = []
      let match
      while ((match = styleTagRegex.exec(html)) !== null) {
        styleMatches.push({ full: match[0], css: match[1] })
      }
      styleMatches.forEach(({ full, css }) => {
        let depth = 0
        let inSelector = true
        let currentSelector = ''
        let result = ''
        let i = 0
        while (i < css.length) {
          const char = css[i]
          const nextChar = css[i + 1]
          if (char === '@' && nextChar && /[a-z-]/i.test(nextChar)) {
            const atRuleEnd = css.indexOf('{', i)
            if (atRuleEnd !== -1) {
              result += css.substring(i, atRuleEnd + 1)
              i = atRuleEnd + 1
              depth++
              inSelector = false
              continue
            }
          }
          if (char === '{') {
            depth++
            if (inSelector && currentSelector.trim()) {
              const scopedSelector = currentSelector
                .split(',')
                .map((s) => {
                  const trimmed = s.trim()
                  if (!trimmed || trimmed.includes(uniqueId) || trimmed.startsWith('@')) {
                    return trimmed
                  }
                  return `#${uniqueId} ${trimmed}`
                })
                .join(', ')
              result += scopedSelector + ' {'
              currentSelector = ''
            } else {
              result += char
            }
            inSelector = false
          } else if (char === '}') {
            depth--
            result += char
            if (depth === 0) inSelector = true
          } else if (inSelector) {
            currentSelector += char
          } else {
            result += char
          }
          i++
        }
        processedHtml = processedHtml.replace(full, `<style>${result}</style>`)
      })
      if (!processedHtml.includes(`id="${uniqueId}"`)) {
        processedHtml = `<div id="${uniqueId}" class="email-content-wrapper">${processedHtml}</div>`
      }
      return processedHtml
    }
  }, [employee.id])

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        setPreviewError(null)
        const response = await previewMutation.mutateAsync({ id: employee.id })
        setEmailPreview(response ?? null)
      } catch (error) {
        const errorMsg = extractErrorMessage(error)
        setPreviewError(errorMsg)
        showErrorToast(errorMsg)
      }
    }
    fetchPreview()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employee.id])

  useEffect(() => {
    if (iframeRef.current && emailPreview) {
      const htmlContent = (emailPreview as { html?: string })?.html || ''
      const processedHtml = processHtmlForIsolation(htmlContent)
      const iframeDoc =
        iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document
      if (iframeDoc) {
        iframeDoc.open()
        iframeDoc.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                  margin: 0;
                  padding: 8px;
                  font-family: 'Inter', sans-serif;
                  font-size: 14px;
                  line-height: 1.5;
                  color: #000000;
                  background: transparent;
                  overflow-x: hidden;
                }
                .email-content-wrapper { width: 100%; max-width: 100%; box-sizing: border-box; }
                .email-content-wrapper * { box-sizing: border-box; max-width: 100%; }
              </style>
            </head>
            <body>${processedHtml}</body>
          </html>
        `)
        iframeDoc.close()
        const resizeIframe = () => {
          if (iframeRef.current && iframeDoc.body) {
            const height = Math.max(iframeDoc.body.scrollHeight, iframeDoc.body.offsetHeight, 384)
            iframeRef.current.style.height = `${Math.min(height, 600)}px`
          }
        }
        if (iframeDoc.readyState === 'complete') {
          resizeIframe()
        } else {
          iframeRef.current.onload = resizeIframe
          setTimeout(resizeIframe, 100)
        }
      }
    }
  }, [emailPreview, employee.id, processHtmlForIsolation])

  if (previewMutation.isPending) {
    return <FullScreenLoading className="h-96 min-h-96 flex-1" />
  }

  if (previewError) {
    return (
      <div className="text-content-dark-2 flex h-96 items-center justify-center">
        {previewError}
      </div>
    )
  }

  if (!emailPreview) return null

  const subject = (emailPreview as { subject?: string })?.subject || '-'

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-data-light-grey-default border-action-outline-default flex flex-col gap-3 rounded border p-5">
        <div className="flex items-start gap-5">
          <span className="text-content-dark-3 w-[66px] shrink-0 text-sm">Tiêu đề:</span>
          <span className="text-content-dark-1 flex-1 text-base font-bold">{subject}</span>
        </div>
        <div className="bg-border-1 h-px w-full" />
        <div className="flex flex-col items-start gap-5">
          <span className="text-content-dark-3 w-[66px] shrink-0 text-sm">Nội dung:</span>
          <div className="border-border-1 bg-background-1 max-h-[600px] min-h-0 w-full flex-1 overflow-hidden rounded border">
            <iframe
              ref={iframeRef}
              className="w-full border-0"
              style={{
                display: 'block',
                width: '100%',
                minHeight: '384px',
                height: '384px',
                border: 'none',
                overflow: 'auto',
              }}
              sandbox="allow-same-origin"
              title="Termination email preview"
            />
          </div>
        </div>
      </div>
    </div>
  )
}

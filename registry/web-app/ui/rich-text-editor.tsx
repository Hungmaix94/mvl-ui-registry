import React, { useState } from 'react';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link as LinkIcon,
  Heading2,
  Heading3,
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Nhập nội dung bài viết định dạng...',
  minHeight = '240px',
  className,
}) => {
  const [activeTab, setActiveTab] = useState<'visual' | 'html'>('visual');

  const insertTag = (tag: string) => {
    onChange(`${value}<${tag}>Nội dung mới</${tag}>`);
  };

  return (
    <div className={cn('overflow-hidden rounded border border-slate-200 bg-white shadow-2xs font-inter', className)}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50/80 px-3 py-2 gap-2 select-none">
        <div className="flex flex-wrap items-center gap-1 text-slate-600">
          <button
            type="button"
            onClick={() => insertTag('strong')}
            className="p-1.5 rounded hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
            title="In đậm"
          >
            <Bold size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertTag('em')}
            className="p-1.5 rounded hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
            title="In nghiêng"
          >
            <Italic size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertTag('u')}
            className="p-1.5 rounded hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
            title="Gạch chân"
          >
            <Underline size={15} />
          </button>

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          <button
            type="button"
            onClick={() => insertTag('h2')}
            className="p-1.5 rounded hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
            title="Tiêu đề H2"
          >
            <Heading2 size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertTag('h3')}
            className="p-1.5 rounded hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
            title="Tiêu đề H3"
          >
            <Heading3 size={15} />
          </button>

          <div className="h-4 w-[1px] bg-slate-300 mx-1" />

          <button
            type="button"
            onClick={() => insertTag('ul')}
            className="p-1.5 rounded hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
            title="Danh sách gạch đầu dòng"
          >
            <List size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertTag('ol')}
            className="p-1.5 rounded hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
            title="Danh sách số thứ tự"
          >
            <ListOrdered size={15} />
          </button>
          <button
            type="button"
            onClick={() => insertTag('a')}
            className="p-1.5 rounded hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
            title="Chèn liên kết"
          >
            <LinkIcon size={15} />
          </button>
        </div>

        {/* Tab View */}
        <div className="flex items-center gap-1 bg-slate-200/60 p-0.5 rounded text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('visual')}
            className={cn(
              'px-2.5 py-1 rounded transition-all',
              activeTab === 'visual' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Soạn thảo
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('html')}
            className={cn(
              'px-2.5 py-1 rounded transition-all',
              activeTab === 'html' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Mã HTML
          </button>
        </div>
      </div>

      {/* Editor Body */}
      {activeTab === 'visual' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ minHeight }}
          className="w-full p-4 text-xs text-slate-800 bg-white outline-none leading-relaxed resize-y font-inter"
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ minHeight }}
          className="w-full p-4 text-xs font-mono text-emerald-800 bg-content-dark-1/5 outline-none leading-relaxed resize-y"
        />
      )}
    </div>
  );
};

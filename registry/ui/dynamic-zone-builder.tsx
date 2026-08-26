import React, { useState, useRef } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  FileText,
  GripVertical,
  HelpCircle,
  Image as ImageIcon,
  LayoutTemplate,
  Link as LinkIcon,
  MessageSquareQuote,
  MoreHorizontal,
  Plus,
  Table,
  Trash2,
  Video,
  X,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

import { TextInput } from './input';
import { TextArea } from './textarea';
import { RichTextEditor } from './rich-text-editor';

export type BlockType =
  | 'hero_banner'
  | 'richtext'
  | 'image_gallery'
  | 'price_policy_table'
  | 'quote'
  | 'cta_button'
  | 'embed_media'
  | 'faq_accordion';

export interface DynamicBlock {
  id: string;
  type: BlockType;
  value: Record<string, any>;
  collapsed?: boolean;
}

export interface BlockCatalogItem {
  type: BlockType;
  title: string;
  description: string;
  category: 'shared' | 'marketing' | 'interactive';
  icon: React.ComponentType<{ size?: number; className?: string }>;
  defaultValues: Record<string, any>;
}

export const BLOCK_CATALOG: BlockCatalogItem[] = [
  {
    type: 'richtext',
    title: 'Rich text',
    description: 'Văn bản định dạng WYSIWYG tự do',
    category: 'shared',
    icon: FileText,
    defaultValues: {
      html_content: '<p>MaiVietLand trân trọng thông báo chính sách bán hàng mới nhất áp dụng cho toàn bộ quý khách hàng...</p>',
    },
  },
  {
    type: 'image_gallery',
    title: 'Media / Gallery',
    description: 'Bộ sưu tập 3–8 ảnh thực tế công trường & sa bàn',
    category: 'shared',
    icon: ImageIcon,
    defaultValues: {
      gallery_title: 'Hình ảnh thực tế công trường dự án',
      columns: 3,
      images: [
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80',
      ],
    },
  },
  {
    type: 'quote',
    title: 'Quote',
    description: 'Trích dẫn phát biểu của chuyên gia BĐS',
    category: 'shared',
    icon: MessageSquareQuote,
    defaultValues: {
      quote_text: 'Dự án sở hữu vị trí vàng cùng hệ thống tiện ích đẳng cấp, mang lại tiềm năng tăng giá vượt trội cho nhà đầu tư.',
      author_name: 'Nguyễn Văn Hùng',
      author_title: 'Giám Đốc Nghiên Cứu Thị Trường MaiVietLand',
    },
  },
  {
    type: 'price_policy_table',
    title: 'Table / Pricing',
    description: 'Bảng tiến độ thanh toán & chiết khấu',
    category: 'shared',
    icon: Table,
    defaultValues: {
      table_title: 'Tiến Độ Thanh Toán Chuẩn 2026',
      rows: [
        { phase: 'Đợt 1', timing: 'Ký HĐMB (Sau 7 ngày)', percent: '15%', note: 'Bao gồm tiền đặt cọc 50 triệu' },
        { phase: 'Đợt 2', timing: 'Sau 60 ngày', percent: '10%', note: 'Thanh toán vào tài khoản CĐT' },
        { phase: 'Đợt 3', timing: 'Sau 120 ngày', percent: '10%', note: 'Hoàn thành thi công tầng 5' },
        { phase: 'Đợt 4', timing: 'Nhận bàn giao nhà (Q4/2026)', percent: '45%', note: 'Ngân hàng hỗ trợ giải ngân 0%' },
        { phase: 'Đợt 5', timing: 'Nhận Sổ hồng', percent: '5%', note: 'Bàn giao GCNQSDĐ' },
      ],
    },
  },
  {
    type: 'hero_banner',
    title: 'Hero banner',
    description: 'Ảnh nền lớn, tiêu đề nổi bật, badge và nút CTA',
    category: 'marketing',
    icon: LayoutTemplate,
    defaultValues: {
      headline: 'Chính Sách Bán Hàng Đột Phá Tháng 8/2026',
      subheadline: 'Hỗ trợ lãi suất 0% trong 24 tháng, chiết khấu lên đến 12%',
      bg_image_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
      badge_text: 'Ưu đãi có hạn',
      cta_text: 'Xem bảng hàng ngay',
      cta_url: '#bang-hang',
    },
  },
  {
    type: 'cta_button',
    title: 'CTA Box',
    description: 'Khối nút kêu gọi hành động thu hút khách hàng',
    category: 'marketing',
    icon: LinkIcon,
    defaultValues: {
      cta_title: 'Nhận Bảng Tính Dòng Tiền & Bảng Hàng Độc Quyền',
      cta_subtitle: 'Chuyên viên tư vấn cấp cao MaiVietLand sẽ liên hệ trong vòng 5 phút',
      btn_label: 'Đăng Ký Nhận Bảng Tính',
      btn_url: '#form-dang-ky',
    },
  },
  {
    type: 'embed_media',
    title: 'Media Video 360',
    description: 'Nhúng video Youtube hoặc Tour 3D Matterport',
    category: 'interactive',
    icon: Video,
    defaultValues: {
      media_type: 'youtube',
      embed_url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      caption: 'Video toàn cảnh tiến độ thi công thực tế mới nhất',
    },
  },
  {
    type: 'faq_accordion',
    title: 'FAQ Accordion',
    description: 'Danh sách các câu hỏi thường gặp Q&A',
    category: 'interactive',
    icon: HelpCircle,
    defaultValues: {
      faqs: [
        { question: 'Dự án đã có giấy phép xây dựng chưa?', answer: 'Dự án đã có đầy đủ Giấy phép xây dựng số 128/GPXD.' },
        { question: 'Ngân hàng nào bảo lãnh dự án?', answer: 'Ngân hàng Techcombank và Vietcombank hỗ trợ gói vay 0%.' },
      ],
    },
  },
];

export interface DynamicZoneBuilderProps {
  blocks: DynamicBlock[];
  onChange: (blocks: DynamicBlock[]) => void;
  title?: string;
  description?: string;
}

export function DynamicZoneBuilder({
  blocks = [],
  onChange,
  title = 'blocks',
}: DynamicZoneBuilderProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [insertTargetIndex, setInsertTargetIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<'shared' | 'marketing' | 'interactive'>('shared');
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLDivElement | null>(null);

  const handleSelectComponent = (catalogItem: BlockCatalogItem) => {
    const newBlock: DynamicBlock = {
      id: `block-${catalogItem.type}-${Date.now()}`,
      type: catalogItem.type,
      value: JSON.parse(JSON.stringify(catalogItem.defaultValues)),
      collapsed: false,
    };

    if (insertTargetIndex !== null) {
      const updated = [...blocks];
      updated.splice(insertTargetIndex, 0, newBlock);
      onChange(updated);
    } else {
      onChange([...blocks, newBlock]);
    }

    setPickerOpen(false);
    setInsertTargetIndex(null);
    setOpenMenuIndex(null);
  };

  const handleUpdateBlockValue = (index: number, key: string, val: any) => {
    const updated = [...blocks];
    updated[index] = {
      ...updated[index],
      value: {
        ...updated[index].value,
        [key]: val,
      },
    };
    onChange(updated);
  };

  const handleToggleCollapse = (index: number) => {
    const updated = [...blocks];
    updated[index] = {
      ...updated[index],
      collapsed: !updated[index].collapsed,
    };
    onChange(updated);
  };

  const handleDelete = (index: number) => {
    const updated = blocks.filter((_, i) => i !== index);
    onChange(updated);
    if (openMenuIndex === index) setOpenMenuIndex(null);
  };

  const handleDuplicate = (index: number) => {
    const target = blocks[index];
    const dup: DynamicBlock = {
      id: `block-${target.type}-${Date.now()}`,
      type: target.type,
      value: JSON.parse(JSON.stringify(target.value)),
      collapsed: false,
    };
    const updated = [...blocks];
    updated.splice(index + 1, 0, dup);
    onChange(updated);
    setOpenMenuIndex(null);
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    dragNodeRef.current = e.currentTarget;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const updated = [...blocks];
      const [moved] = updated.splice(draggedIndex, 1);
      updated.splice(dragOverIndex, 0, moved);
      onChange(updated);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const openPickerAbove = (index: number) => {
    setInsertTargetIndex(index);
    setPickerOpen(true);
    setOpenMenuIndex(null);
  };

  const openPickerBelow = (index: number) => {
    setInsertTargetIndex(index + 1);
    setPickerOpen(true);
    setOpenMenuIndex(null);
  };

  const filteredCatalog = BLOCK_CATALOG.filter((c) => c.category === activeCategory);

  return (
    <div className="space-y-4 font-sans">
      <div className="flex items-center justify-between pb-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-800 tracking-wide">
            {title} ({blocks.length})
          </span>
        </div>
      </div>

      <div className="space-y-0">
        <div className="space-y-0">
          {blocks.map((block, index) => {
            const meta = BLOCK_CATALOG.find((c) => c.type === block.type) || BLOCK_CATALOG[0];
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;
            const isMenuOpen = openMenuIndex === index;

            return (
              <React.Fragment key={block.id}>
                {index > 0 && (
                  <div className="flex justify-center py-1">
                    <div className="w-[2px] h-3 bg-[#4a4a68]" />
                  </div>
                )}

                <div
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`relative rounded-xl border transition-all duration-150 ${
                    isDragging
                      ? 'opacity-40 border-dashed border-[#B32B2F] bg-slate-100 scale-98'
                      : isDragOver
                      ? 'border-2 border-[#B32B2F] shadow-md bg-rose-50/20'
                      : 'border-slate-300 bg-[#212134] text-white shadow-xs hover:border-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between px-3.5 py-2.5 select-none bg-[#212134] rounded-t-xl">
                    <div
                      className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                      onClick={() => handleToggleCollapse(index)}
                    >
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[#32324d] text-slate-300 hover:bg-[#4945ff] hover:text-white transition-colors">
                        {block.collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
                      </div>

                      <div className="grid grid-cols-2 gap-0.5 text-slate-400">
                        <div className="h-1 w-1 rounded-xs bg-current" />
                        <div className="h-1 w-1 rounded-xs bg-current" />
                        <div className="h-1 w-1 rounded-xs bg-current" />
                        <div className="h-1 w-1 rounded-xs bg-current" />
                      </div>

                      <span className="text-xs font-semibold text-slate-200 truncate">
                        {meta.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-slate-400" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleDelete(index)}
                        className="rounded p-1 text-slate-400 hover:bg-rose-900/40 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Delete entry"
                      >
                        <Trash2 size={14} />
                      </button>

                      <div
                        className="rounded p-1 text-slate-400 hover:bg-[#32324d] hover:text-slate-200 cursor-grab active:cursor-grabbing transition-colors"
                        title="Drag to reorder"
                      >
                        <GripVertical size={14} />
                      </div>

                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setOpenMenuIndex(isMenuOpen ? null : index)}
                          className={`rounded p-1 transition-colors cursor-pointer ${
                            isMenuOpen ? 'bg-[#4945ff] text-white' : 'text-slate-400 hover:bg-[#32324d] hover:text-slate-200'
                          }`}
                          title="More options"
                        >
                          <MoreHorizontal size={14} />
                        </button>

                        {isMenuOpen && (
                          <div className="absolute right-0 top-full mt-1.5 z-50 w-52 overflow-hidden rounded-xl border border-slate-700 bg-[#181826] py-1 text-xs text-slate-200 shadow-2xl animate-in fade-in zoom-in-95">
                            <button
                              type="button"
                              onClick={() => openPickerAbove(index)}
                              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-[#212134] hover:text-white transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2">
                                <ArrowUp size={13} className="text-slate-400" />
                                Add component above
                              </span>
                              <span className="text-slate-500">›</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openPickerBelow(index)}
                              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-[#212134] hover:text-white transition-colors cursor-pointer"
                            >
                              <span className="flex items-center gap-2">
                                <ArrowDown size={13} className="text-slate-400" />
                                Add component below
                              </span>
                              <span className="text-slate-500">›</span>
                            </button>

                            <div className="my-1 border-t border-slate-700/60" />

                            <button
                              type="button"
                              onClick={() => handleDuplicate(index)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#212134] hover:text-white transition-colors cursor-pointer"
                            >
                              <Copy size={13} className="text-slate-400" />
                              Duplicate component
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(index)}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-rose-400 hover:bg-rose-950/50 transition-colors cursor-pointer"
                            >
                              <Trash2 size={13} />
                              Delete component
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {!block.collapsed && (
                    <div className="border-t border-slate-700 bg-white p-5 text-slate-900 rounded-b-xl space-y-4 animate-in fade-in duration-150">
                      {block.type === 'richtext' && (
                        <div>
                          <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                            Nội dung văn bản định dạng
                          </label>
                          <RichTextEditor
                            value={block.value.html_content || ''}
                            onChange={(val) => handleUpdateBlockValue(index, 'html_content', val)}
                            placeholder="Nhập nội dung bài viết định dạng..."
                          />
                        </div>
                      )}

                      {block.type === 'image_gallery' && (
                        <div className="space-y-3">
                          <TextInput
                            label="Tiêu đề Bộ sưu tập ảnh"
                            value={block.value.gallery_title || ''}
                            onChange={(e) => handleUpdateBlockValue(index, 'gallery_title', e.target.value)}
                          />
                          <TextArea
                            label="Danh sách URL hình ảnh (Mỗi dòng 1 link URL)"
                            rows={4}
                            value={Array.isArray(block.value.images) ? block.value.images.join('\n') : ''}
                            onChange={(e) =>
                              handleUpdateBlockValue(
                                index,
                                'images',
                                e.target.value.split('\n').filter((l) => l.trim().length > 0)
                              )
                            }
                          />
                        </div>
                      )}

                      {block.type === 'hero_banner' && (
                        <div className="space-y-4">
                          <TextInput
                            label="Tiêu đề Banner chính"
                            value={block.value.headline || ''}
                            onChange={(e) => handleUpdateBlockValue(index, 'headline', e.target.value)}
                          />
                          <TextInput
                            label="Phụ đề / Slogan"
                            value={block.value.subheadline || ''}
                            onChange={(e) => handleUpdateBlockValue(index, 'subheadline', e.target.value)}
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <TextInput
                              label="URL Ảnh nền (Cover URL)"
                              value={block.value.bg_image_url || ''}
                              onChange={(e) => handleUpdateBlockValue(index, 'bg_image_url', e.target.value)}
                            />
                            <TextInput
                              label="Nhãn Badge khuyến mại"
                              value={block.value.badge_text || ''}
                              onChange={(e) => handleUpdateBlockValue(index, 'badge_text', e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {block.type === 'price_policy_table' && (
                        <div className="space-y-3">
                          <TextInput
                            label="Tiêu đề Bảng Chính Sách"
                            value={block.value.table_title || ''}
                            onChange={(e) => handleUpdateBlockValue(index, 'table_title', e.target.value)}
                          />
                          <div className="overflow-x-auto rounded-xl border border-slate-200">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                                <tr>
                                  <th className="p-2.5">Đợt</th>
                                  <th className="p-2.5">Thời Điểm</th>
                                  <th className="p-2.5">Tỷ Lệ (%)</th>
                                  <th className="p-2.5">Ghi Chú</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {(block.value.rows || []).map((row: any, rIdx: number) => (
                                  <tr key={rIdx} className="hover:bg-slate-50/50">
                                    <td className="p-2 font-semibold text-slate-800">{row.phase}</td>
                                    <td className="p-2 text-slate-600">{row.timing}</td>
                                    <td className="p-2 font-bold text-[#B32B2F]">{row.percent}</td>
                                    <td className="p-2 text-slate-500 text-[11px]">{row.note}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {block.type === 'quote' && (
                        <div className="space-y-3">
                          <TextArea
                            label="Nội dung câu nói trích dẫn"
                            rows={3}
                            value={block.value.quote_text || ''}
                            onChange={(e) => handleUpdateBlockValue(index, 'quote_text', e.target.value)}
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <TextInput
                              label="Họ tên người phát biểu"
                              value={block.value.author_name || ''}
                              onChange={(e) => handleUpdateBlockValue(index, 'author_name', e.target.value)}
                            />
                            <TextInput
                              label="Chức danh / Đơn vị"
                              value={block.value.author_title || ''}
                              onChange={(e) => handleUpdateBlockValue(index, 'author_title', e.target.value)}
                            />
                          </div>
                        </div>
                      )}

                      {block.type === 'cta_button' && (
                        <div className="space-y-3">
                          <TextInput
                            label="Tiêu đề Kêu gọi hành động"
                            value={block.value.cta_title || ''}
                            onChange={(e) => handleUpdateBlockValue(index, 'cta_title', e.target.value)}
                          />
                          <TextInput
                            label="Đoạn văn thuyết phục ngắn"
                            value={block.value.cta_subtitle || ''}
                            onChange={(e) => handleUpdateBlockValue(index, 'cta_subtitle', e.target.value)}
                          />
                        </div>
                      )}

                      {block.type === 'embed_media' && (
                        <div className="space-y-3">
                          <TextInput
                            label="Đường dẫn Embed URL (Youtube / Matterport 3D)"
                            value={block.value.embed_url || ''}
                            onChange={(e) => handleUpdateBlockValue(index, 'embed_url', e.target.value)}
                          />
                        </div>
                      )}

                      {block.type === 'faq_accordion' && (
                        <div className="space-y-3">
                          <label className="text-xs font-semibold text-slate-700 block">
                            Danh sách câu hỏi & trả lời ({block.value.faqs?.length || 0})
                          </label>
                          {(block.value.faqs || []).map((faq: any, fIdx: number) => (
                            <div key={fIdx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                              <TextInput
                                label={`Câu hỏi ${fIdx + 1}`}
                                value={faq.question}
                                onChange={(e) => {
                                  const newFaqs = [...block.value.faqs];
                                  newFaqs[fIdx].question = e.target.value;
                                  handleUpdateBlockValue(index, 'faqs', newFaqs);
                                }}
                              />
                              <TextArea
                                label="Câu trả lời"
                                rows={2}
                                value={faq.answer}
                                onChange={(e) => {
                                  const newFaqs = [...block.value.faqs];
                                  newFaqs[fIdx].answer = e.target.value;
                                  handleUpdateBlockValue(index, 'faqs', newFaqs);
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}
        </div>

        {blocks.length > 0 && (
          <div className="flex justify-center">
            <div className="w-[2px] h-3.5 bg-[#4a4a68]" />
          </div>
        )}

        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => {
              setInsertTargetIndex(null);
              setPickerOpen(!pickerOpen);
            }}
            className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold shadow-md transition-all cursor-pointer ${
              pickerOpen
                ? 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                : 'bg-[#2b2b40] text-slate-100 border border-slate-600 hover:bg-[#383854] hover:scale-105 active:scale-95'
            }`}
          >
            {pickerOpen ? (
              <>
                <X size={14} className="text-slate-400" />
                <span>Close</span>
              </>
            ) : (
              <>
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-[#4945ff] text-white">
                  <Plus size={11} />
                </div>
                <span>Add a component to blocks</span>
              </>
            )}
          </button>
        </div>

        {pickerOpen && (
          <div className="flex justify-center">
            <div className="w-[2px] h-3.5 bg-[#4a4a68]" />
          </div>
        )}

        {pickerOpen && (
          <div className="rounded-xl border border-slate-700 bg-[#1e1e2f] p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <h4 className="text-center text-xs font-semibold text-slate-300 mb-3 uppercase tracking-wider">
              Pick one component
            </h4>

            <div className="flex items-center justify-between rounded-t-lg bg-[#fff8db] text-[#735e00] px-4 py-2 font-semibold text-xs border border-amber-200">
              <div className="flex items-center gap-2">
                <ChevronDown size={14} />
                <span className="capitalize">{activeCategory} ({filteredCatalog.length})</span>
              </div>

              <div className="flex items-center gap-1">
                {(['shared', 'marketing', 'interactive'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors cursor-pointer ${
                      activeCategory === cat ? 'bg-[#fae79b] text-[#5c4a00] font-bold' : 'hover:bg-amber-100/60'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-b-lg border-x border-b border-slate-700 bg-[#181826] p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {filteredCatalog.map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => handleSelectComponent(item)}
                  className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-700/80 bg-[#212134] p-4 text-center transition-all hover:border-[#fae79b] hover:bg-[#2a2a42] hover:scale-105 active:scale-95 cursor-pointer group"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#fae79b] text-[#735e00] shadow-md group-hover:bg-[#ffe366] transition-colors">
                    <div className="grid grid-cols-2 gap-1">
                      <div className="h-1.5 w-1.5 rounded-xs bg-[#5c4a00]" />
                      <div className="h-1.5 w-1.5 rounded-xs bg-[#5c4a00]" />
                      <div className="h-1.5 w-1.5 rounded-xs bg-[#5c4a00]" />
                      <div className="h-1.5 w-1.5 rounded-xs bg-[#5c4a00]" />
                    </div>
                  </div>

                  <span className="text-xs font-semibold text-slate-200 group-hover:text-white">
                    {item.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DynamicZoneBuilder;

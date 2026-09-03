import React from 'react';
import { HelpCircle } from 'lucide-react';

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQAccordionProps {
  title: string;
  subtitle?: string;
  items: FAQItem[];
}

export const FAQAccordion: React.FC<FAQAccordionProps> = ({
  title,
  subtitle,
  items = [],
}) => {
  return (
    <section className="bg-white py-16 px-6 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        <div className="space-y-3">
          {items.map((faq, idx) => (
            <div key={idx} className="rounded-xl border border-slate-200 p-4 space-y-2 bg-slate-50">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle size={15} className="text-[#B32B2F] shrink-0" />
                <span>{faq.question}</span>
              </h4>
              <p className="text-xs text-slate-600 pl-6 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export const FAQAccordionConfig = {
  fields: {
    title: { type: 'text' as const, label: 'Tiêu đề' },
    subtitle: { type: 'textarea' as const, label: 'Mô tả' },
    items: {
      type: 'array' as const,
      label: 'Câu hỏi thường gặp',
      arrayFields: {
        question: { type: 'text' as const, label: 'Câu hỏi' },
        answer: { type: 'textarea' as const, label: 'Câu trả lời' },
      },
    },
  },
  defaultProps: {
    title: 'Câu Hỏi Thường Gặp (FAQ)',
    subtitle: 'Giải đáp các thắc mắc phổ biến của khách hàng về pháp lý và tiến độ bàn giao.',
    items: [
      {
        question: 'Pháp lý dự án hiện tại đã hoàn thiện chưa?',
        answer:
          'Dự án đã có đầy đủ Giấy phép xây dựng, Quyết định giao đất 1/500 và biên bản nghiệm thu móng đủ điều kiện mở bán theo quy định.',
      },
      {
        question: 'Ngân hàng nào bảo lãnh và hỗ trợ cho vay?',
        answer:
          'Ngân hàng Vietcombank và MB Bank trực tiếp bảo lãnh tiến độ và hỗ trợ gói vay ưu đãi 0% lãi suất trong 24 tháng.',
      },
      {
        question: 'Thời gian bàn giao nhà dự kiến là khi nào?',
        answer:
          'Dự kiến bàn giao vào Quý 4/2026 với tiêu chuẩn bàn giao hoàn thiện nội thất liền tường cao cấp từ các thương hiệu Kohler, Hafele, Daikin.',
      },
    ],
  },
  render: FAQAccordion,
};

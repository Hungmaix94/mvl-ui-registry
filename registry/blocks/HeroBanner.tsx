import React from 'react';
import { Sparkles } from 'lucide-react';

export interface HeroBannerProps {
  badge?: string;
  title: string;
  subtitle?: string;
  bgImage?: string;
  ctaText?: string;
  ctaLink?: string;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  badge,
  title,
  subtitle,
  bgImage,
  ctaText,
  ctaLink,
  secondaryCtaText,
  secondaryCtaLink,
}) => {
  return (
    <section className="relative min-h-[520px] flex items-center justify-center text-white overflow-hidden bg-slate-900 px-6 py-20 font-sans">
      {bgImage && (
        <div className="absolute inset-0 z-0">
          <img src={bgImage} alt={title} className="h-full w-full object-cover brightness-50" />
        </div>
      )}
      <div className="relative z-10 max-w-4xl mx-auto text-center space-y-5">
        {badge && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#B32B2F]/90 border border-white/20 px-4 py-1 text-xs font-bold text-white shadow-lg">
            <Sparkles size={13} className="text-amber-300" />
            <span>{badge}</span>
          </span>
        )}
        <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm md:text-base text-slate-200 max-w-2xl mx-auto leading-relaxed">{subtitle}</p>
        )}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
          {ctaText && (
            <a
              href={ctaLink || '#'}
              className="rounded-xl bg-[#B32B2F] hover:bg-[#870B0B] px-6 py-3 text-sm font-bold text-white shadow-lg transition-all"
            >
              {ctaText}
            </a>
          )}
          {secondaryCtaText && (
            <a
              href={secondaryCtaLink || '#'}
              className="rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-xs border border-white/30 px-6 py-3 text-sm font-bold text-white transition-all"
            >
              {secondaryCtaText}
            </a>
          )}
        </div>
      </div>
    </section>
  );
};

export const HeroBannerConfig = {
  fields: {
    badge: { type: 'text' as const, label: 'Badge Tag' },
    title: { type: 'text' as const, label: 'Tiêu đề chính' },
    subtitle: { type: 'textarea' as const, label: 'Mô tả phụ' },
    bgImage: { type: 'text' as const, label: 'URL Ảnh nền' },
    ctaText: { type: 'text' as const, label: 'Nút CTA chính' },
    ctaLink: { type: 'text' as const, label: 'Link CTA chính' },
    secondaryCtaText: { type: 'text' as const, label: 'Nút CTA phụ' },
    secondaryCtaLink: { type: 'text' as const, label: 'Link CTA phụ' },
  },
  defaultProps: {
    badge: 'MỞ BÁN PHÂN KHU ĐẸP NHẤT 2026',
    title: 'Tuyệt Tác Không Gian Sống Thượng Lưu',
    subtitle: 'Sở hữu căn hộ cao cấp với chính sách thanh toán đột phá 0% lãi suất trong 24 tháng.',
    bgImage: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1600&q=80',
    ctaText: 'Nhận Bảng Giá Chi Tiết',
    ctaLink: '#dang-ky',
    secondaryCtaText: 'Xem Mặt Bằng',
    secondaryCtaLink: '#mat-bang',
  },
  render: HeroBanner,
};

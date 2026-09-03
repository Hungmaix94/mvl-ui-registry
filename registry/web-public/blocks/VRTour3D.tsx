import React from 'react';
import { Sparkles } from 'lucide-react';

export interface VRTour3DProps {
  title: string;
  subtitle?: string;
  tourUrl?: string;
}

export const VRTour3D: React.FC<VRTour3DProps> = ({
  title,
  subtitle,
  tourUrl,
}) => {
  return (
    <section className="bg-slate-900 text-white py-16 px-6 font-sans text-center">
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl md:text-3xl font-black">{title}</h2>
        {subtitle && <p className="text-xs text-slate-300">{subtitle}</p>}
        <div className="aspect-video rounded-2xl border border-white/20 bg-black/40 overflow-hidden flex items-center justify-center">
          {tourUrl && tourUrl.startsWith('http') && tourUrl.includes('matterport') ? (
            <iframe src={tourUrl} title={title} className="w-full h-full border-0" allowFullScreen />
          ) : (
            <div className="text-center space-y-2">
              <Sparkles size={32} className="mx-auto text-amber-400" />
              <span className="text-xs text-slate-300 block">Trình phát thực tế ảo VR 360 Matterport</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export const VRTour3DConfig = {
  fields: {
    title: { type: 'text' as const, label: 'Tiêu đề' },
    subtitle: { type: 'textarea' as const, label: 'Mô tả' },
    tourUrl: { type: 'text' as const, label: 'URL Matterport / VR Tour' },
  },
  defaultProps: {
    title: 'Trải Nghiệm Nhà Mẫu Thực Tế Ảo VR 360°',
    subtitle: 'Khám phá từng góc căn hộ mẫu với góc nhìn 360 độ chân thực không cần đến tận nơi.',
    tourUrl: 'https://my.matterport.com',
  },
  render: VRTour3D,
};

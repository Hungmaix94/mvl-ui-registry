import React from 'react';
import { Video } from 'lucide-react';

export interface VideoSectionProps {
  title: string;
  videoUrl?: string;
  posterUrl?: string;
}

export const VideoSection: React.FC<VideoSectionProps> = ({
  title,
  posterUrl,
}) => {
  return (
    <section className="bg-white py-16 px-6 font-sans text-center">
      <div className="max-w-4xl mx-auto space-y-6">
        <h2 className="text-2xl md:text-3xl font-black text-slate-900">{title}</h2>
        <div className="relative aspect-video rounded-2xl border border-slate-200 overflow-hidden bg-slate-900 flex items-center justify-center group cursor-pointer shadow-lg">
          {posterUrl && (
            <img
              src={posterUrl}
              alt={title}
              className="h-full w-full object-cover brightness-75 group-hover:scale-105 transition-all duration-300"
            />
          )}
          <div className="absolute flex h-16 w-16 items-center justify-center rounded-full bg-[#B32B2F] text-white shadow-xl group-hover:scale-110 transition-transform">
            <Video size={24} />
          </div>
        </div>
      </div>
    </section>
  );
};

export const VideoSectionConfig = {
  fields: {
    title: { type: 'text' as const, label: 'Tiêu đề Video' },
    videoUrl: { type: 'text' as const, label: 'URL Video YouTube' },
    posterUrl: { type: 'text' as const, label: 'URL Poster' },
  },
  defaultProps: {
    title: 'Video Giới Thiệu Dự Án Toàn Cảnh',
    videoUrl: 'https://youtube.com',
    posterUrl: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80',
  },
  render: VideoSection,
};

import React from 'react';
import { Globe, Phone, Mail, MapPin, Share2 } from 'lucide-react';

export interface FooterSectionProps {
  companyName: string;
  slogan?: string;
  hotline?: string;
  email?: string;
  address?: string;
  copyright?: string;
  bgImage?: string;
  facebookUrl?: string;
  zaloUrl?: string;
  youtubeUrl?: string;
}

export const FooterSection: React.FC<FooterSectionProps> = ({
  companyName,
  slogan,
  hotline,
  email,
  address,
  copyright,
  bgImage,
  facebookUrl,
  zaloUrl,
  youtubeUrl,
}) => {
  return (
    <footer className="relative bg-gradient-to-br from-[#70080B] via-[#94191D] to-[#540507] text-white pt-14 pb-8 px-6 font-sans overflow-hidden border-t-2 border-amber-400/40">
      {bgImage && (
        <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none">
          <img src={bgImage} alt="Footer Background" className="h-full w-full object-cover" />
        </div>
      )}

      <div className="relative max-w-6xl mx-auto space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Cột 1: Brand & Slogan */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg">
                <Globe size={22} className="text-amber-300" />
              </div>
              <div>
                <h3 className="text-base font-black tracking-wide text-white uppercase">{companyName}</h3>
                <span className="text-[11px] font-semibold text-amber-200 uppercase tracking-wider">
                  Hệ Thống Phân Phối BĐS Toàn Quốc
                </span>
              </div>
            </div>
            {slogan && <p className="text-xs text-white/80 leading-relaxed max-w-lg">{slogan}</p>}
            <div className="flex items-center gap-3 pt-2">
              {facebookUrl && (
                <a
                  href={facebookUrl}
                  className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                  title="Facebook"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </a>
              )}
              {youtubeUrl && (
                <a
                  href={youtubeUrl}
                  className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                  title="YouTube"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
              )}
              {zaloUrl && (
                <a
                  href={zaloUrl}
                  className="h-8 w-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                  title="Zalo"
                >
                  <Share2 size={16} />
                </a>
              )}
            </div>
          </div>

          {/* Cột 2: Danh Mục Dự Án Nổi Bật */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Dự Án Trọng Điểm</h4>
            <ul className="space-y-2 text-xs text-white/80">
              <li className="hover:text-amber-200 cursor-pointer transition-colors">• Vinhomes Ocean Park 2 & 3</li>
              <li className="hover:text-amber-200 cursor-pointer transition-colors">• Masteri Centre Point</li>
              <li className="hover:text-amber-200 cursor-pointer transition-colors">• Sun Symphony Residence</li>
              <li className="hover:text-amber-200 cursor-pointer transition-colors">• Ecopark Grand The Island</li>
              <li className="hover:text-amber-200 cursor-pointer transition-colors">• The Beverly Solari</li>
            </ul>
          </div>

          {/* Cột 3: Thông Tin Liên Hệ Trực Tiếp */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider">Liên Hệ Hỗ Trợ</h4>
            <div className="space-y-2.5 text-xs text-white/80">
              {hotline && (
                <div className="flex items-start gap-2">
                  <Phone size={14} className="text-amber-300 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] text-white/60">Hotline 24/7:</span>
                    <span className="font-bold text-white">{hotline}</span>
                  </div>
                </div>
              )}
              {email && (
                <div className="flex items-start gap-2">
                  <Mail size={14} className="text-amber-300 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] text-white/60">Hòm thư hỗ trợ:</span>
                    <span>{email}</span>
                  </div>
                </div>
              )}
              {address && (
                <div className="flex items-start gap-2">
                  <MapPin size={14} className="text-amber-300 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-[10px] text-white/60">Trụ sở chính:</span>
                    <span className="text-[11px] leading-snug">{address}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Copyright */}
        <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/60">
          <p>{copyright || '© 2026 Mai Viet Land. All rights reserved.'}</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="hover:underline cursor-pointer">Điều khoản sử dụng</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">Chính sách bảo mật</span>
            <span>•</span>
            <span className="hover:underline cursor-pointer">Quy chế hoạt động sàn</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export const FooterSectionConfig = {
  fields: {
    companyName: { type: 'text' as const, label: 'Tên Công Ty' },
    slogan: { type: 'textarea' as const, label: 'Slogan / Giới thiệu' },
    hotline: { type: 'text' as const, label: 'Hotline liên hệ' },
    email: { type: 'text' as const, label: 'Email liên hệ' },
    address: { type: 'textarea' as const, label: 'Địa chỉ trụ sở' },
    copyright: { type: 'text' as const, label: 'Bản quyền' },
    bgImage: { type: 'text' as const, label: 'URL Ảnh nền Footer' },
    facebookUrl: { type: 'text' as const, label: 'Link Facebook' },
    zaloUrl: { type: 'text' as const, label: 'Link Zalo' },
    youtubeUrl: { type: 'text' as const, label: 'Link YouTube' },
  },
  defaultProps: {
    companyName: 'CÔNG TY CỔ PHẦN ĐỊA ỐC MAI VIỆT LAND',
    slogan:
      'Nền tảng phân phối và phát triển Bất động sản chuyên nghiệp hàng đầu Việt Nam. Đối tác chiến lược toàn diện của Vingroup, Sun Group, Masterise Homes, Ecopark.',
    hotline: '1900 1234 - 0988 888 888',
    email: 'info@maivietland.vn',
    address: 'Tầng 11, Tháp C, Tòa nhà Golden Land, 275 Nguyễn Trãi, Thanh Xuân, Hà Nội',
    copyright: '© 2026 Mai Viet Land. All rights reserved. Hệ sinh thái công nghệ BĐS đa nền tảng.',
    bgImage: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=1600&q=80',
    facebookUrl: 'https://facebook.com/maivietland',
    zaloUrl: 'https://zalo.me/maivietland',
    youtubeUrl: 'https://youtube.com/maivietland',
  },
  render: FooterSection,
};

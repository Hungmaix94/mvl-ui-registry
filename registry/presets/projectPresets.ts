import { ALL_BLOCK_COMPONENTS, type BlockComponentName } from '../blocks';

/** 1. Mẫu dự án Căn Hộ Cao Tầng (Vinhomes, Masteri, Sun Group...) */
export const APARTMENT_PRESET: BlockComponentName[] = [
  'HeroBanner',
  'AmenitiesGrid',
  'FloorPlans',
  'PricingTable',
  'ContactLeadForm',
  'PropertyGallery',
  'VRTour3D',
  'LocationMap',
  'FooterSection',
];

/** 2. Mẫu dự án Đất Nền & Biệt Thự Nghỉ Dưỡng (Ecopark, Vega City...) */
export const VILLA_LAND_PRESET: BlockComponentName[] = [
  'HeroBanner',
  'MasterPlan3D',
  'AmenitiesGrid',
  'PricingTable',
  'ContactLeadForm',
  'VideoSection',
  'LocationMap',
  'FooterSection',
];

/** 3. Mẫu Sự Kiện Mở Bán / Flash Sale */
export const EVENT_PRESET: BlockComponentName[] = [
  'HeroBanner',
  'VideoSection',
  'PricingTable',
  'ContactLeadForm',
  'FAQAccordion',
  'FooterSection',
];

/** 4. Toàn bộ các khối nội dung có sẵn */
export const ALL_PRESET: BlockComponentName[] = [
  'HeroBanner',
  'AmenitiesGrid',
  'FloorPlans',
  'PricingTable',
  'ContactLeadForm',
  'FAQAccordion',
  'PropertyGallery',
  'LocationMap',
  'VRTour3D',
  'VideoSection',
  'FooterSection',
  'MasterPlan3D',
];

/** Cấu hình phân nhóm trực quan cho thanh công cụ Puck Page Builder */
export const PUCK_CATEGORIES = {
  banner: {
    title: '🌟 Banner & Giới thiệu',
    components: ['HeroBanner', 'VideoSection'],
  },
  project: {
    title: '🏢 Chi tiết Dự án & Mặt bằng',
    components: ['AmenitiesGrid', 'FloorPlans', 'MasterPlan3D', 'LocationMap'],
  },
  sales: {
    title: '💰 Bảng giá & Chuyển đổi',
    components: ['PricingTable', 'ContactLeadForm'],
  },
  media: {
    title: '🌐 Thư viện & 3D Tour',
    components: ['PropertyGallery', 'VRTour3D', 'FAQAccordion'],
  },
  footer: {
    title: '📍 Chân trang & Liên hệ',
    components: ['FooterSection'],
  },
};

export interface CreateProjectPuckConfigOptions {
  allowedBlocks?: BlockComponentName[] | string[];
  overrides?: Record<string, any>;
}

/**
 * Hàm khởi tạo Puck Config theo đúng danh sách block được cấp quyền cho từng Dự Án
 */
export function createProjectPuckConfig(options?: CreateProjectPuckConfigOptions) {
  const allowed = (options?.allowedBlocks as BlockComponentName[]) || ALL_PRESET;
  const components: Record<string, any> = {};

  allowed.forEach((name) => {
    if (ALL_BLOCK_COMPONENTS[name]) {
      components[name] = ALL_BLOCK_COMPONENTS[name];
    }
  });

  if (options?.overrides) {
    Object.assign(components, options.overrides);
  }

  // Tự động lọc các category chỉ chứa các component khả dụng
  const categories: Record<string, { title: string; components: string[] }> = {};
  Object.entries(PUCK_CATEGORIES).forEach(([catKey, catVal]) => {
    const matchedComponents = catVal.components.filter((c) => allowed.includes(c as BlockComponentName));
    if (matchedComponents.length > 0) {
      categories[catKey] = {
        title: catVal.title,
        components: matchedComponents,
      };
    }
  });

  return {
    components,
    categories,
  };
}

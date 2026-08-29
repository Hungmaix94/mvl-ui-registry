export * from './HeroBanner';
export * from './AmenitiesGrid';
export * from './FloorPlans';
export * from './PricingTable';
export * from './ContactLeadForm';
export * from './FAQAccordion';
export * from './PropertyGallery';
export * from './LocationMap';
export * from './VRTour3D';
export * from './VideoSection';
export * from './FooterSection';
export * from './MasterPlan3D';

import { HeroBannerConfig } from './HeroBanner';
import { AmenitiesGridConfig } from './AmenitiesGrid';
import { FloorPlansConfig } from './FloorPlans';
import { PricingTableConfig } from './PricingTable';
import { ContactLeadFormConfig } from './ContactLeadForm';
import { FAQAccordionConfig } from './FAQAccordion';
import { PropertyGalleryConfig } from './PropertyGallery';
import { LocationMapConfig } from './LocationMap';
import { VRTour3DConfig } from './VRTour3D';
import { VideoSectionConfig } from './VideoSection';
import { FooterSectionConfig } from './FooterSection';
import { MasterPlan3DConfig } from './MasterPlan3D';

export const ALL_BLOCK_COMPONENTS = {
  HeroBanner: HeroBannerConfig,
  AmenitiesGrid: AmenitiesGridConfig,
  FloorPlans: FloorPlansConfig,
  PricingTable: PricingTableConfig,
  ContactLeadForm: ContactLeadFormConfig,
  FAQAccordion: FAQAccordionConfig,
  PropertyGallery: PropertyGalleryConfig,
  LocationMap: LocationMapConfig,
  VRTour3D: VRTour3DConfig,
  VideoSection: VideoSectionConfig,
  FooterSection: FooterSectionConfig,
  MasterPlan3D: MasterPlan3DConfig,
};

export type BlockComponentName = keyof typeof ALL_BLOCK_COMPONENTS;

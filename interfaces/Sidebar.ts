import { Layout } from "react-grid-layout";

interface Dish {
  id: number;
  title: string | null;
  type?: "dish" | "spacer" | "sectionTitle" | "inlineText" | "inlineImage" | "inlineSectionDivider";
  description: string | null;
  price: string | null;
  column: number;
  isSpacer: boolean;
  order_position: number;
  frontend_id: string;
  section?: string;
  visible: boolean;
  spacer?: Spacer | null;
  created_at: string;
  dishBlockId?: number;
  layout?: string;
  dndLayout?: Layout;
  index?: number;
  [key: string]: any;
  addOns?: string | null;
  placeholderTitle: string;
  placeholderDescription: string;
  placeholderPrice: string;
  isEdit: boolean;
  secondPrice?: string | null;
  inlineText_layout?: number | null;
  temp_inlineText_layout?: number | null;
  inlineTextLayoutBlockId?: number | null;
  isSectionTitle?: boolean;
  textAlign?: "Left" | "Center" | "Right";
  imageUrl?: string | null;
  imageHeight?: number;
  imageWidth?: number;
  imageHeightInches?: number;
  borderImageUrl?: string | null;
  dishMarginLeft?: number;
  dishMarginRight?: number;
  dishMarginTop?: number;
  dishMarginBottom?: number;
  dividerImageUrl?: string | null;
  dividerImageHeight?: number;
  dividerImageWidth?: number;
  dividerImageHeightInches?: number;
}
interface Spacer {
  height: number;
  width: number;
}
interface Section {
  horizontalAlign?: string;
  id: number;
  sectionId: string;
  name: string;
  columns: number;
  dishes: Dish[];
  dndLayout: Layout;
  pageId: number;
  position_start: number;
  position_end: number;
  title_layout: number | null;
  dish_layout: number | null;
  temp_title_layout?: number | null;
  temp_dish_layout?: number | null;
  created_at: string;
  sectionBlockId?: number;
  order_position: number;
  menu_dishes?: any;
  dishLayoutBlockId: any;
  sectionTitleLayoutBlockId: any;
  inlineTextLayoutBlockId: any;
  isSaved: boolean;
  sectionUniqueId: string;
  dishLayout: any;
  sectionLayout: any;
  placeholderName: string;
  columnMargin: number;
  sectionGroupBlockId?: number;
  sectionPageGroupId?: number;
  topMargin?: number;
  borderImageUrl?: string | null;
  borderLibraryId?: number | null;
  sectionMarginLeft?: number;
  sectionMarginRight?: number;
  sectionMarginTop?: number;
  sectionMarginBottom?: number;
}
interface Page {
  id: number;
  name: string;
  page_index: number;
  menu_id: number;
  pageId: number;
  columns: number;
  blockUUID: string;
  pageUUID?: string;
  sections: Section[];
  created_at: string;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  dishSpacingValue: number;
  pageHeight?: number;
  pageWidth?: number;
  isSaved: boolean;
  pageUniqueId: string;
  columnMargin: number;
  sectionGap: number;
  orientation?: "portrait" | "landscape";
}
interface MenuLayout {
  id: number;
  name: string;
  pages: Page[];
}

interface SelectedSection {
  pageId: number | null;
  sectionId: number | null;
}
interface AddOneDishReturnType {
  mainSection: number;
  difference: number;
  getMinimFont: number;
  newSection: Section;
}
interface DishHandlers {
  duplicateDish: (sectionId: number, dishId: number) => void;
  removeDish: (sectionId: number, dishId: number) => void;
  incrementSpacerHeight: (sectionId: number, dishId: number) => void;
  decrementSpacerHeight: (sectionId: number, dishId: number) => void;
}
interface RenderSectionProps {
  pageId: number;
  columns: number;
  isLoading?: boolean;
}
interface SectionProps {
  section: Section;
  pageId: number;
  key: string;
  columns: number;
}
export type {
  Dish,
  Section,
  Page,
  MenuLayout,
  RenderSectionProps,
  SelectedSection,
  SectionProps,
  DishHandlers,
  AddOneDishReturnType,
};

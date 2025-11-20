interface DishLayout {
  w: number;
}

export interface Dish {
  id: string;
  type: string;
  section: string;
  title?: string;
  price?: string;
  description?: string;
  dietaryIcons?: string[];
  addOns?: string | null;
  spacer?: string | { height: number };
  isSpacer?: boolean;
  isEdit?: boolean;
  columns: number;
  column: number;
  dndLayout: DishLayout;
  dishLayout?: any;
  titleLayout?: any;
  sectionTitleLayoutBlockId?: string[];
  dishLayoutBlockId?: string[];
  inlineTextLayoutBlockId?: any;
  temp_inlineText_layout?: any;
  inlineText_layout?: any;
  isSectionTitle?: boolean;
  secondPrice?: string;
  textAlign?: "Left" | "Center" | "Right";
  borderImageUrl?: string | null;
  dishMarginLeft?: number;
  dishMarginRight?: number;
  dishMarginTop?: number;
  dishMarginBottom?: number;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  imageHeightInches?: number;
  dividerImageUrl?: string;
  dividerImageWidth?: number;
  dividerImageHeight?: number;
  dividerImageHeightInches?: number;
}

export interface DishBlock {
  newDish: any;
  uuid: string;
  dishUUID: string;
  sectionID: string;
  dndLayout: DishLayout;
  column: number;
  type: string;
  pageColumn: number;
  pageMarginTop: number;
  pageMarginBottom: number;
  sectionColumn: number;
  title?: string;
  isSectionTitle?: boolean;
  borderImageUrl?: string;
  sectionMarginTop?: number;
  sectionMarginBottom?: number;
  sectionMarginLeft?: number;
  sectionMarginRight?: number;
  // Store original dish position for border calculation (before any content adjustments)
  originalDishX?: number;
  originalDishWidth?: number;
  // Dish border and margin properties
  dishBorderImageUrl?: string;
  dishMarginTop?: number;
  dishMarginBottom?: number;
  dishMarginLeft?: number;
  dishMarginRight?: number;
}

export interface LayoutSettings {
  isDishTitleAndPrice?: boolean;
  isDishDescriptionAndPrice?: boolean;
  isDishTitleAndDescriptionAndPrice?: boolean;
  isJustifyPriceCenter?: boolean;
  isJustifyPriceTop?: boolean;
  isDefaultLayout?: boolean;
}

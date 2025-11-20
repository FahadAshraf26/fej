export interface ProcessMenuRequest {
  fileUrls: string[];
  fileTypes?: string[];
  restaurantInfo?: {
    name: string;
    logo?: string;
    colors?: {
      primary: string;
      secondary: string;
    };
  };
}

export interface MenuSection {
  name: string;
  description?: string;
  items: MenuItem[];
}

export interface MenuItem {
  name: string;
  description: string;
  price: string;
  dietaryInfo: string[];
  addOns: {
    name: string;
    price: string;
  }[];
}

export interface TransformedData {
  sections: {
    [pageId: string]: {
      id: string;
      name: string;
      columns: number;
      dishes: string[];
      layout: {
        minW: number;
        maxW: number;
        minH: number;
        maxH: number;
        w: number;
        h: number;
        x: number;
        y: number;
        i: string;
      };
    }[];
  };
  dishes: {
    [sectionId: string]: {
      id: string;
      title: string | null;
      description: string | null;
      price: string | null;
      section: number;
      type: string;
      order_position: number;
      column: number;
      dietaryIcons: string[];
      addOns: string | null;
    }[];
  };
} 
import { Location } from "./IRestaurantList";
import { Page } from "./Sidebar";

export interface ITemplate {
  id: number;
  name: string;
  description: string;
  content: string; // UUID string format
  isGlobal: boolean;
  createdBy: string; // UUID string format
  created_at: string; // ISO date string
  restaurant_id?: string;
  printPreview?: boolean | null;
  location?: string | null;
  locationInformation?: Location | null;
  isAutoLayout: boolean;
  templates_versions?: any[];
  templateOrder?: number | null;
  hasThumbnail: boolean;
}
export interface ITemplateDetails extends ITemplate {
  tags?: string[] | null;
  menuSize?: string | null;
  updatedAt?: string; // ISO date string
  pages?: Page[];
  isPSDImport?: boolean; // Flag to indicate if this template was imported from PSD
}

// Interface for handling asset deletion
export interface DeleteAssetsIDs {
  id: string;
  content: string;
}

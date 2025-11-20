export interface BorderLibraryItem {
  id: number;
  created_at: string;
  updated_at: string;
  template_id: number;
  created_by: string;
  name: string;
  description?: string;
  image_url: string;
  thumbnail_url?: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  is_active: boolean;
  display_order: number;
}

export interface BorderUploadData {
  template_id: number;
  name: string;
  description?: string;
  file: File;
}

export interface BorderSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBorder: (border: BorderLibraryItem | null) => void;
  currentBorderId?: number;
  templateId: number;
}

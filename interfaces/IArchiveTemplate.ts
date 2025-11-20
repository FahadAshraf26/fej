export interface ArchiveEntry {
  content: string;
  time: Date;
  location?: string;
}

export interface ArchiveTemplate {
  id: number;
  name: string | null;
  description: string | null;
  content: ArchiveEntry[];
  restaurant_id: string | null;
  location: string | null;
  isGlobal: boolean | null;
  createdBy: string | null;
  menuSize: string | null;
  templateOrder: number | null;
  tags: string | null;
  updatedAt: Date | null;
  printPreview: number | null;
}

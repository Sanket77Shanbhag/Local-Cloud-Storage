export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
  updatedAt: number;
  isLocked: boolean;
  password?: string; // Standard plain text encryption for demo / local locking
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt: number | null;
  color?: string; // Optional custom color/tag
}

export interface FileVersion {
  id: string;
  name: string;
  size: number;
  type: string;
  content: File | Blob;
  updatedAt: number;
}

export interface FileItem {
  id: string;
  name: string;
  parentId: string | null;
  size: number;
  type: string;
  content: File | Blob;
  createdAt: number;
  updatedAt: number;
  isFavorite: boolean;
  isDeleted: boolean;
  deletedAt: number | null;
  tags: string[];
  description?: string;
  versions: FileVersion[];
}

export type ViewMode = 'grid' | 'list' | 'details';

export type SortBy = 'name' | 'size' | 'type' | 'createdAt' | 'updatedAt';

export type SortOrder = 'asc' | 'desc';

export interface FilterOptions {
  search: string;
  type: string; // 'all' | 'document' | 'image' | 'video' | 'audio' | 'archive' | 'custom'
  minSize: number | null; // in bytes
  maxSize: number | null; // in bytes
  dateMin: string; // YYYY-MM-DD
  dateMax: string; // YYYY-MM-DD
  tag: string; // Tag filtering
}

export interface StorageStats {
  totalFiles: number;
  totalFolders: number;
  totalSize: number;
  recycleBinSize: number;
  sizeByType: {
    documents: number;
    images: number;
    videos: number;
    audio: number;
    archives: number;
    others: number;
  };
}

export interface KeyboardShortcut {
  key: string;
  description: string;
}

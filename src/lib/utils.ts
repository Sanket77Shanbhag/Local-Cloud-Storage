import { FileItem, Folder } from '../types';

export function formatBytes(bytes: number, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function getFileCategory(fileName: string, mimeType: string): 'documents' | 'images' | 'videos' | 'audio' | 'archives' | 'others' {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv', 'md'].includes(ext) || mimeType.startsWith('text/') || mimeType.includes('pdf') || mimeType.includes('document')) {
    return 'documents';
  }
  
  if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'bmp', 'ico'].includes(ext) || mimeType.startsWith('image/')) {
    return 'images';
  }
  
  if (['mp4', 'avi', 'mov', 'webm', 'mkv', 'flv'].includes(ext) || mimeType.startsWith('video/')) {
    return 'videos';
  }
  
  if (['mp3', 'wav', 'ogg', 'm4a', 'flac', 'aac'].includes(ext) || mimeType.startsWith('audio/')) {
    return 'audio';
  }
  
  if (['zip', 'rar', 'tar', 'gz', '7z', 'bz2'].includes(ext) || mimeType.includes('zip') || mimeType.includes('compressed')) {
    return 'archives';
  }
  
  return 'others';
}

export function getFolderPathString(folderId: string | null, folders: Folder[]): string {
  if (!folderId) return 'Root';
  
  const path: string[] = [];
  let current: Folder | undefined = folders.find(f => f.id === folderId);
  
  while (current) {
    path.unshift(current.name);
    const parentId = current.parentId;
    current = parentId ? folders.find(f => f.id === parentId) : undefined;
  }
  
  return path.join(' / ');
}

export function getFolderAncestors(folderId: string | null, folders: Folder[]): Folder[] {
  const ancestors: Folder[] = [];
  if (!folderId) return ancestors;
  
  let current = folders.find(f => f.id === folderId);
  while (current) {
    ancestors.unshift(current);
    const parentId = current.parentId;
    current = parentId ? folders.find(f => f.id === parentId) : undefined;
  }
  
  return ancestors;
}

export function calculateFolderSize(folderId: string, files: FileItem[], folders: Folder[]): number {
  // Get all descendant folders
  const getDescendants = (parentId: string): string[] => {
    const list = [parentId];
    const children = folders.filter(f => f.parentId === parentId && !f.isDeleted);
    for (const child of children) {
      list.push(...getDescendants(child.id));
    }
    return list;
  };

  const folderIds = getDescendants(folderId);
  const matchedFiles = files.filter(file => !file.isDeleted && file.parentId && folderIds.includes(file.parentId));
  return matchedFiles.reduce((sum, file) => sum + file.size, 0);
}

export function countFolderFiles(folderId: string, files: FileItem[], folders: Folder[]): { filesCount: number, foldersCount: number } {
  const getDescendants = (parentId: string): string[] => {
    const list = [parentId];
    const children = folders.filter(f => f.parentId === parentId && !f.isDeleted);
    for (const child of children) {
      list.push(...getDescendants(child.id));
    }
    return list;
  };

  const folderIds = getDescendants(folderId);
  // Subtracting the main folder itself
  const foldersCount = folderIds.length - 1;
  const filesCount = files.filter(file => !file.isDeleted && file.parentId && folderIds.includes(file.parentId)).length;
  
  return { filesCount, foldersCount };
}

import React, { useState, useRef, useEffect } from 'react';
import { FileItem, Folder, ViewMode } from '../types';
import { formatBytes, getFileCategory } from '../lib/utils';
import {
  Folder as FolderIcon,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  Star,
  MoreVertical,
  Plus,
  Trash2,
  FolderPlus,
  ArrowUpFromLine,
  ChevronRight,
  Home,
  Check,
  Download,
  Copy,
  Move,
  Key,
  FolderOpen,
  Unlock,
  AlertTriangle
} from 'lucide-react';

interface MainGridProps {
  currentFolderId: string | null;
  folders: Folder[];
  files: FileItem[];
  selectedItems: Set<string>;
  setSelectedItems: React.Dispatch<React.SetStateAction<Set<string>>>;
  onSelectFolder: (id: string | null) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  
  // Storage actions
  onCreateFolder: (name: string, parentId: string | null) => void;
  onUploadFiles: (fileList: FileList | File[]) => void;
  onDeleteFile: (id: string) => void;
  onDeleteFolder: (id: string) => void;
  onUpdateFile: (file: FileItem) => void;
  onUpdateFolder: (folder: Folder) => void;
  
  // Recycle bin operations
  onRestoreFile: (id: string) => void;
  onRestoreFolder: (id: string) => void;
  onPermanentlyDeleteFile: (id: string) => void;
  onPermanentlyDeleteFolder: (id: string) => void;

  // Single active detail selections
  onHighlightItem: (item: { type: 'file' | 'folder'; id: string } | null) => void;
  highlightedItem: { type: 'file' | 'folder'; id: string } | null;

  // Clipboard support
  clipboard: { action: 'copy' | 'move'; items: { type: 'file' | 'folder'; id: string }[] } | null;
  setClipboard: (cb: { action: 'copy' | 'move'; items: { type: 'file' | 'folder'; id: string }[] } | null) => void;
  onPaste: (targetFolderId: string | null) => void;

  // Special views from sidebar filters
  activeView: 'explorer' | 'favorites' | 'recent' | 'recycle' | 'stats';
}

export default function MainGrid({
  currentFolderId,
  folders,
  files,
  selectedItems,
  setSelectedItems,
  onSelectFolder,
  viewMode,
  setViewMode,
  onCreateFolder,
  onUploadFiles,
  onDeleteFile,
  onDeleteFolder,
  onUpdateFile,
  onUpdateFolder,
  onRestoreFile,
  onRestoreFolder,
  onPermanentlyDeleteFile,
  onPermanentlyDeleteFolder,
  onHighlightItem,
  highlightedItem,
  clipboard,
  setClipboard,
  onPaste,
  activeView
}: MainGridProps) {
  const [dragOver, setDragOver] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  // Custom context menu floating positioning
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    type: 'file' | 'folder' | 'canvas';
    id: string | null;
  } | null>(null);

  // Folder security unlocking verify state
  const [lockedFolderOpenId, setLockedFolderOpenId] = useState<string | null>(null);
  const [verificationPasscode, setVerificationPasscode] = useState('');
  const [verificationError, setVerificationError] = useState('');

  // Editing names states
  const [renameTarget, setRenameTarget] = useState<{ type: 'file' | 'folder'; id: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  // Hide context menu on outer clicks
  useEffect(() => {
    const clickHandler = () => {
      setContextMenu(null);
    };
    window.addEventListener('click', clickHandler);
    return () => window.removeEventListener('click', clickHandler);
  }, []);

  // Filter local folder items based on active sidebar views
  let displayedFolders: Folder[] = [];
  let displayedFiles: FileItem[] = [];

  const currentFolderObj = folders.find(f => f.id === currentFolderId);

  // Password Locker check
  const isWorkspaceLocked = currentFolderObj?.isLocked && !selectedItems.has(currentFolderObj.id);

  if (activeView === 'explorer') {
    // Standard view
    displayedFolders = folders.filter(f => f.parentId === currentFolderId && !f.isDeleted);
    displayedFiles = files.filter(f => f.parentId === currentFolderId && !f.isDeleted);
  } else if (activeView === 'favorites') {
    displayedFolders = folders.filter(f => f.isFavorite && !f.isDeleted);
    displayedFiles = files.filter(f => f.isFavorite && !f.isDeleted);
  } else if (activeView === 'recent') {
    displayedFolders = [];
    // Sort all files by modify date within last 7 days
    displayedFiles = files
      .filter(f => !f.isDeleted)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 15);
  } else if (activeView === 'recycle') {
    displayedFolders = folders.filter(f => f.isDeleted);
    displayedFiles = files.filter(f => f.isDeleted);
  }

  // Handle Drag Events for local files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFiles(e.dataTransfer.files);
    }
  };

  // Multiple selection handlers
  const handleItemClick = (e: React.MouseEvent, type: 'file' | 'folder', id: string) => {
    e.stopPropagation();
    onHighlightItem({ type, id });

    const key = `${type}-${id}`;
    if (e.metaKey || e.ctrlKey) {
      // Toggle
      const updated = new Set(selectedItems);
      if (updated.has(key)) {
        updated.delete(key);
      } else {
        updated.add(key);
      }
      setSelectedItems(updated);
    } else if (e.shiftKey) {
      // Basic selection extender fallback or toggle
      const updated = new Set(selectedItems);
      updated.add(key);
      setSelectedItems(updated);
    } else {
      // Direct single selection
      const updated = new Set<string>();
      updated.add(key);
      setSelectedItems(updated);
    }
  };

  const handleCanvasClick = () => {
    setSelectedItems(new Set());
    onHighlightItem(null);
  };

  // Breadcrumbs calculation
  const getBreadcrumbs = () => {
    const list: { id: string | null; name: string }[] = [{ id: null, name: 'My Local Index' }];
    if (!currentFolderId) return list;

    const buildPath = (fId: string) => {
      const fObj = folders.find(f => f.id === fId);
      if (!fObj) return;
      if (fObj.parentId) {
        buildPath(fObj.parentId);
      }
      list.push({ id: fObj.id, name: fObj.name });
    };

    buildPath(currentFolderId);
    return list;
  };

  // Trigger folder locking password gate
  const handleFolderDoubleClick = (folder: Folder) => {
    if (folder.isDeleted) return;

    if (folder.isLocked) {
      // Open verification code gate
      setLockedFolderOpenId(folder.id);
      setVerificationPasscode('');
      setVerificationError('');
    } else {
      onSelectFolder(folder.id);
    }
  };

  const handleVerifyPasscode = () => {
    if (!lockedFolderOpenId) return;
    const folder = folders.find(f => f.id === lockedFolderOpenId);
    if (folder && folder.password === verificationPasscode) {
      onSelectFolder(lockedFolderOpenId);
      setLockedFolderOpenId(null);
    } else {
      setVerificationError('Invalid passcode, authorization failed.');
    }
  };

  // File download helper
  const handleDownloadFile = (file: FileItem) => {
    try {
      const url = URL.createObjectURL(file.content);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Download file error:', e);
    }
  };

  // Custom Context Menu helper
  const handleContextMenu = (e: React.MouseEvent, type: 'file' | 'folder' | 'canvas', id: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Highlight first if not already inside selection
    const key = id ? `${type}-${id}` : '';
    if (id && !selectedItems.has(key)) {
      onHighlightItem({ type: type as 'file' | 'folder', id });
      setSelectedItems(new Set([key]));
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      type,
      id
    });
  };

  // Context Menu operations
  const triggerRename = (type: 'file' | 'folder', id: string, currentName: string) => {
    setRenameTarget({ type, id });
    setRenameValue(currentName);
  };

  const handleFinishRename = () => {
    if (!renameTarget) return;
    const name = renameValue.trim();
    if (!name) return;

    if (renameTarget.type === 'file') {
      const file = files.find(f => f.id === renameTarget.id);
      if (file) {
        // Version tracker: copy as old version before renaming if requested
        const oldVersion = {
          id: `v-${Date.now()}`,
          name: file.name,
          size: file.size,
          type: file.type,
          content: file.content,
          updatedAt: file.updatedAt
        };
        onUpdateFile({
          ...file,
          name,
          updatedAt: Date.now(),
          versions: [...file.versions, oldVersion]
        });
      }
    } else {
      const folder = folders.find(f => f.id === renameTarget.id);
      if (folder) {
        onUpdateFolder({ ...folder, name, updatedAt: Date.now() });
      }
    }

    setRenameTarget(null);
  };

  const handleToggleStar = (type: 'file' | 'folder', id: string) => {
    if (type === 'file') {
      const file = files.find(f => f.id === id);
      if (file) {
        onUpdateFile({ ...file, isFavorite: !file.isFavorite, updatedAt: Date.now() });
      }
    } else {
      const folder = folders.find(f => f.id === id);
      if (folder) {
        onUpdateFolder({ ...folder, isFavorite: !folder.isFavorite, updatedAt: Date.now() });
      }
    }
  };

  const handleDuplicate = (type: 'file' | 'folder', id: string) => {
    if (type === 'file') {
      const file = files.find(f => f.id === id);
      if (file) {
        // Name copy format
        const extIndex = file.name.lastIndexOf('.');
        const baseName = extIndex !== -1 ? file.name.substring(0, extIndex) : file.name;
        const extension = extIndex !== -1 ? file.name.substring(extIndex) : '';
        const duplicateFile: FileItem = {
          ...file,
          id: `file-dup-${Date.now()}`,
          name: `${baseName}_copy${extension}`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          isFavorite: false,
          versions: []
        };
        onUpdateFile(duplicateFile);
      }
    }
  };

  const handleClipboardAction = (action: 'copy' | 'move') => {
    const list: { type: 'file' | 'folder'; id: string }[] = [];
    selectedItems.forEach(key => {
      const [type, id] = key.split('-');
      list.push({ type: type as 'file' | 'folder', id });
    });
    
    if (list.length > 0) {
      setClipboard({ action, items: list });
    }
  };

  // Bulk Delete option
  const handleBulkDelete = () => {
    selectedItems.forEach(key => {
      const [type, id] = key.split('-');
      if (type === 'file') {
        onDeleteFile(id);
      } else {
        onDeleteFolder(id);
      }
    });
    setSelectedItems(new Set());
  };

  // Bulk Permanent Delete option
  const handleBulkPermanentDelete = () => {
    selectedItems.forEach(key => {
      const [type, id] = key.split('-');
      if (type === 'file') {
        onPermanentlyDeleteFile(id);
      } else {
        onPermanentlyDeleteFolder(id);
      }
    });
    setSelectedItems(new Set());
  };

  // Bulk Restore option
  const handleBulkRestore = () => {
    selectedItems.forEach(key => {
      const [type, id] = key.split('-');
      if (type === 'file') {
        onRestoreFile(id);
      } else {
        onRestoreFolder(id);
      }
    });
    setSelectedItems(new Set());
  };

  return (
    <div
      ref={containerRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onContextMenu={(e) => handleContextMenu(e, 'canvas', null)}
      onClick={handleCanvasClick}
      className={`flex-1 flex flex-col min-w-0 bg-white relative transition-colors ${
        dragOver ? 'bg-blue-50/30' : ''
      }`}
      id="main-file-grid-container"
    >
      {/* Search Header Breadcrumbs Zone */}
      <div className="p-4 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-3 select-none">
        {/* Breadcrumb row */}
        <div className="flex items-center gap-1.5 flex-wrap text-sm font-semibold text-gray-500">
          {getBreadcrumbs().map((b, idx, array) => (
            <React.Fragment key={b.id || 'root-index'}>
              <button
                onClick={() => {
                  onSelectFolder(b.id);
                }}
                className={`flex items-center gap-1.5 py-1 px-1.5 rounded-md hover:bg-gray-100 hover:text-gray-900 transition-colors cursor-pointer ${
                  currentFolderId === b.id ? 'text-gray-900 font-bold bg-gray-50' : ''
                }`}
              >
                {b.id === null && <Home className="h-4 w-4 text-blue-500" />}
                <span>{b.name}</span>
              </button>
              {idx < array.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-gray-300" />}
            </React.Fragment>
          ))}
        </div>

        {/* View Action operations */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          {/* Paste Clipboard button if clipboard exists */}
          {clipboard && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPaste(currentFolderId);
              }}
              className="bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Copy className="h-3.5 w-3.5" />
              <span>Paste Here ({clipboard.items.length})</span>
            </button>
          )}

          {activeView === 'explorer' && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNewFolderModal(true);
                }}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold px-4 py-2 h-9 rounded-md transition-all duration-150 flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <FolderPlus className="h-4 w-4 text-blue-500" />
                <span>New Folder</span>
              </button>

              <label className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2 h-9 rounded-md transition-all duration-150 flex items-center gap-1.5 cursor-pointer shadow-sm">
                <ArrowUpFromLine className="h-4 w-4" />
                <span>Upload</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && onUploadFiles(e.target.files)}
                />
              </label>
            </>
          )}

          {/* Toggle View mode */}
          <div className="flex border border-gray-200 rounded-lg p-0.5 bg-gray-50">
            {(['grid', 'list', 'details'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={(e) => {
                  e.stopPropagation();
                  setViewMode(mode);
                }}
                className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
                  viewMode === mode
                    ? 'bg-white text-blue-700 shadow-2xs border border-gray-150'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Drag overlay state */}
      {dragOver && (
        <div className="absolute inset-0 bg-blue-50/85 flex flex-col justify-center items-center z-40 pointer-events-none animate-fadeIn border-2 border-dashed border-blue-400 m-4 rounded-xl">
          <ArrowUpFromLine className="h-12 w-12 text-blue-600 animate-bounce" />
          <h3 className="font-bold text-lg text-blue-950 mt-4">Release to Upload Files</h3>
          <p className="text-sm text-blue-600/80 mt-1.5">Your files will be stored directly inside this folder locally.</p>
        </div>
      )}

      {/* Main rendering area */}
      <div className="flex-1 overflow-y-auto p-4 select-none">
        
        {/* Bulk tools ribbon if selection is active */}
        {selectedItems.size > 0 && (
          <div className="bg-gray-50 border border-gray-150 rounded-xl p-3 mb-4 flex items-center justify-between animate-fadeIn shadow-2xs">
            <span className="text-xs text-gray-600 font-semibold flex items-center gap-2">
              <Check className="h-4 w-4 text-blue-600" />
              {selectedItems.size} items selected
            </span>
            <div className="flex gap-2">
              {activeView === 'recycle' ? (
                <>
                  <button
                    onClick={handleBulkRestore}
                    className="bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    Restore Selection
                  </button>
                  <button
                    onClick={handleBulkPermanentDelete}
                    className="bg-red-50 border border-red-100 hover:bg-red-100 text-red-800 text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Wipe Permanently
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleClipboardAction('copy')}
                    className="bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    Copy
                  </button>
                  <button
                    onClick={() => handleClipboardAction('move')}
                    className="bg-white border border-gray-200 hover:bg-gray-100 text-gray-700 text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer"
                  >
                    Move
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="bg-red-50 border border-red-100 hover:bg-red-100 text-red-800 text-[11px] font-bold px-3 py-1.5 rounded-lg cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Move to Recycle Bin
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Empty state detection */}
        {displayedFolders.length === 0 && displayedFiles.length === 0 ? (
          <div className="flex flex-col justify-center items-center text-center py-24 text-gray-400">
            <FolderOpen className="h-12 w-12 text-gray-200 mb-3" />
            <h3 className="font-bold text-sm text-gray-800">Directory index is empty</h3>
            {activeView === 'explorer' ? (
              <p className="text-xs text-gray-500 mt-1 max-w-[240px]">Drag & drop files or click New Folder to begin building nested structures locally.</p>
            ) : (
              <p className="text-xs text-gray-500 mt-1 max-w-[240px]">No items available in this category index.</p>
            )}
          </div>
        ) : (
          <>
            {/* GRID VIEW MODALITY */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {/* Folders first */}
                {displayedFolders.map(folder => {
                  const isSelected = selectedItems.has(`folder-${folder.id}`);
                  const isHighlighted = highlightedItem?.type === 'folder' && highlightedItem.id === folder.id;
                  const isRenaming = renameTarget?.type === 'folder' && renameTarget.id === folder.id;

                  return (
                    <div
                      key={folder.id}
                      onClick={(e) => handleItemClick(e, 'folder', folder.id)}
                      onDoubleClick={() => handleFolderDoubleClick(folder)}
                      onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id)}
                      className={`group border rounded-[10px] p-4 transition-all duration-200 text-left relative cursor-pointer ${
                        isSelected || isHighlighted
                          ? 'bg-[#eff6ff] border-transparent outline-1 outline-[#bfdbfe] shadow-xs'
                          : 'bg-white hover:bg-[#f8fafc] border-slate-200'
                      }`}
                    >
                      {/* Favorite star */}
                      {folder.isFavorite && (
                        <Star className="absolute top-2.5 right-2.5 h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                      )}

                      <div className="flex flex-col gap-3">
                        <FolderIcon
                          className="h-8 w-8 text-blue-500 shrink-0"
                          style={{ color: folder.color || '#3b82f6' }}
                          fill={isSelected ? `${folder.color || '#3b82f6'}20` : 'none'}
                        />
                        
                        <div>
                          {isRenaming ? (
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={handleFinishRename}
                              onKeyDown={(e) => e.key === 'Enter' && handleFinishRename()}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              className="text-xs font-semibold px-2 py-1 border border-blue-300 rounded-md w-full bg-white focus:outline-hidden"
                            />
                          ) : (
                            <h5 className="font-semibold text-xs text-gray-800 truncate" title={folder.name}>
                              {folder.name}
                            </h5>
                          )}
                          <p className="text-[10px] text-gray-400 mt-0.5">Directory</p>
                        </div>
                      </div>

                      {folder.isLocked && (
                        <div className="absolute bottom-2.5 right-2.5">
                          <Key className="h-3.5 w-3.5 text-amber-500" />
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Files */}
                {displayedFiles.map(file => {
                  const isSelected = selectedItems.has(`file-${file.id}`);
                  const isHighlighted = highlightedItem?.type === 'file' && highlightedItem.id === file.id;
                  const isRenaming = renameTarget?.type === 'file' && renameTarget.id === file.id;

                  return (
                    <div
                      key={file.id}
                      onClick={(e) => handleItemClick(e, 'file', file.id)}
                      onContextMenu={(e) => handleContextMenu(e, 'file', file.id)}
                      onDoubleClick={() => !file.isDeleted && handleDownloadFile(file)}
                      className={`group border rounded-[10px] p-4 transition-all duration-200 text-left relative cursor-pointer ${
                        isSelected || isHighlighted
                          ? 'bg-[#eff6ff] border-transparent outline-1 outline-[#bfdbfe] shadow-xs'
                          : 'bg-white hover:bg-[#f8fafc] border-slate-200'
                      }`}
                    >
                      {/* Favorite Star */}
                      {file.isFavorite && (
                        <Star className="absolute top-2.5 right-2.5 h-3.5 w-3.5 fill-amber-400 text-amber-500" />
                      )}

                      <div className="flex flex-col gap-3">
                        <div className="text-blue-600">
                          {(() => {
                            const ext = file.name.split('.').pop()?.toLowerCase();
                            if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext || '')) return <ImageIcon className="h-8 w-8 text-emerald-500" />;
                            if (['mp4', 'avi', 'mov'].includes(ext || '')) return <Film className="h-8 w-8 text-amber-500" />;
                            if (['mp3', 'wav', 'ogg'].includes(ext || '')) return <Music className="h-8 w-8 text-indigo-500" />;
                            if (['zip', 'rar', '7z'].includes(ext || '')) return <Archive className="h-8 w-8 text-purple-600" />;
                            return <FileText className="h-8 w-8 text-blue-500" />;
                          })()}
                        </div>

                        <div>
                          {isRenaming ? (
                            <input
                              type="text"
                              value={renameValue}
                              onChange={(e) => setRenameValue(e.target.value)}
                              onBlur={handleFinishRename}
                              onKeyDown={(e) => e.key === 'Enter' && handleFinishRename()}
                              onClick={(e) => e.stopPropagation()}
                              autoFocus
                              className="text-xs font-semibold px-2 py-1 border border-blue-300 rounded-md w-full bg-white focus:outline-hidden"
                            />
                          ) : (
                            <h5 className="font-semibold text-xs text-gray-800 truncate" title={file.name}>
                              {file.name}
                            </h5>
                          )}
                          <p className="text-[10px] text-gray-400 mt-0.5">{formatBytes(file.size)}</p>
                        </div>
                      </div>

                      {/* Version count badge */}
                      {file.versions.length > 0 && (
                        <span className="absolute bottom-2 right-2 text-[8px] font-bold bg-blue-100 text-blue-700 px-1 py-0.5 rounded-xs">
                          v{file.versions.length + 1}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* LIST VIEW MODALITY */}
            {viewMode === 'list' && (
              <div className="space-y-1">
                {displayedFolders.map(folder => {
                  const isSelected = selectedItems.has(`folder-${folder.id}`);
                  const isHighlighted = highlightedItem?.type === 'folder' && highlightedItem.id === folder.id;

                  return (
                    <div
                      key={folder.id}
                      onClick={(e) => handleItemClick(e, 'folder', folder.id)}
                      onDoubleClick={() => handleFolderDoubleClick(folder)}
                      onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                        isSelected || isHighlighted
                          ? 'bg-blue-50/50 border-blue-300'
                          : 'bg-white hover:bg-gray-50/50 border-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <FolderIcon className="h-5 w-5 text-blue-500" style={{ color: folder.color || '#3b82f6' }} />
                        <span className="truncate font-semibold text-gray-800">{folder.name}</span>
                        {folder.isLocked && <Key className="h-3 w-3 text-amber-500 shrink-0" />}
                      </div>
                      <div className="text-[10px] text-gray-400 tracking-wide font-medium whitespace-nowrap">Directory</div>
                    </div>
                  );
                })}

                {displayedFiles.map(file => {
                  const isSelected = selectedItems.has(`file-${file.id}`);
                  const isHighlighted = highlightedItem?.type === 'file' && highlightedItem.id === file.id;

                  return (
                    <div
                      key={file.id}
                      onClick={(e) => handleItemClick(e, 'file', file.id)}
                      onContextMenu={(e) => handleContextMenu(e, 'file', file.id)}
                      onDoubleClick={() => !file.isDeleted && handleDownloadFile(file)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                        isSelected || isHighlighted
                          ? 'bg-blue-50/50 border-blue-300'
                          : 'bg-white hover:bg-gray-50/50 border-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {(() => {
                          const ext = file.name.split('.').pop()?.toLowerCase();
                          if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext || '')) return <ImageIcon className="h-5 w-5 text-emerald-500" />;
                          if (['mp4', 'avi', 'mov'].includes(ext || '')) return <Film className="h-5 w-5 text-amber-500" />;
                          if (['mp3', 'wav', 'ogg'].includes(ext || '')) return <Music className="h-5 w-5 text-indigo-500" />;
                          return <FileText className="h-5 w-5 text-blue-500" />;
                        })()}
                        <span className="truncate font-semibold text-gray-800">{file.name}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono text-medium whitespace-nowrap">{formatBytes(file.size)}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* DETAILS VIEW MODALITY (TABLE) */}
            {viewMode === 'details' && (
              <div className="overflow-x-auto border border-gray-150 rounded-xl">
                <table className="w-full text-left border-collapse text-xs select-none">
                  <thead>
                    <tr className="bg-gray-50 text-gray-400 border-b border-gray-150 font-bold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Size</th>
                      <th className="py-3 px-4">Modified Date</th>
                      <th className="py-3 px-4">Tags / Labels</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Folders */}
                    {displayedFolders.map(folder => {
                      const isSelected = selectedItems.has(`folder-${folder.id}`);
                      const isHighlighted = highlightedItem?.type === 'folder' && highlightedItem.id === folder.id;

                      return (
                        <tr
                          key={folder.id}
                          onClick={(e) => handleItemClick(e, 'folder', folder.id)}
                          onDoubleClick={() => handleFolderDoubleClick(folder)}
                          onContextMenu={(e) => handleContextMenu(e, 'folder', folder.id)}
                          className={`border-b border-gray-100 cursor-pointer text-gray-700 font-medium transition-colors ${
                            isSelected || isHighlighted
                              ? 'bg-blue-50/50'
                              : 'bg-white hover:bg-gray-50/40'
                          }`}
                        >
                          <td className="py-2.5 px-4 flex items-center gap-2 min-w-[200px]">
                            <FolderIcon className="h-4.5 w-4.5 text-blue-500 shrink-0" style={{ color: folder.color || '#3b82f6' }} />
                            <span className="truncate font-semibold text-gray-800">{folder.name}</span>
                            {folder.isLocked && <Key className="h-3 w-3 text-amber-500 shrink-0" />}
                          </td>
                          <td className="py-2.5 px-4 text-gray-500 font-semibold text-[11px]">Folder</td>
                          <td className="py-2.5 px-4 text-gray-400">---</td>
                          <td className="py-2.5 px-4 text-gray-400 font-mono text-[11px]">{new Date(folder.updatedAt).toLocaleString()}</td>
                          <td className="py-2.5 px-4">
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-semibold border border-gray-150">Active Directory</span>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Files */}
                    {displayedFiles.map(file => {
                      const isSelected = selectedItems.has(`file-${file.id}`);
                      const isHighlighted = highlightedItem?.type === 'file' && highlightedItem.id === file.id;

                      return (
                        <tr
                          key={file.id}
                          onClick={(e) => handleItemClick(e, 'file', file.id)}
                          onContextMenu={(e) => handleContextMenu(e, 'file', file.id)}
                          onDoubleClick={() => !file.isDeleted && handleDownloadFile(file)}
                          className={`border-b border-gray-100 cursor-pointer text-gray-700 font-medium transition-colors ${
                            isSelected || isHighlighted
                              ? 'bg-blue-50/50'
                              : 'bg-white hover:bg-gray-50/40'
                          }`}
                        >
                          <td className="py-2.5 px-4 flex items-center gap-2 min-w-[200px]">
                            {(() => {
                              const ext = file.name.split('.').pop()?.toLowerCase();
                              if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext || '')) return <ImageIcon className="h-4.5 w-4.5 text-emerald-500 shrink-0" />;
                              if (['mp4', 'avi', 'mov'].includes(ext || '')) return <Film className="h-4.5 w-4.5 text-amber-500 shrink-0" />;
                              if (['mp3', 'wav', 'ogg'].includes(ext || '')) return <Music className="h-4.5 w-4.5 text-indigo-500 shrink-0" />;
                              return <FileText className="h-4.5 w-4.5 text-blue-500 shrink-0" />;
                            })()}
                            <span className="truncate font-semibold text-gray-900">{file.name}</span>
                          </td>
                          <td className="py-2.5 px-4 text-gray-500 font-mono text-[11px] truncate max-w-[100px]" title={file.type}>{file.type || 'Binary file'}</td>
                          <td className="py-2.5 px-4 font-mono text-gray-600 text-[11px] font-semibold">{formatBytes(file.size)}</td>
                          <td className="py-2.5 px-4 text-gray-500 font-mono text-[11px]">{new Date(file.updatedAt).toLocaleString()}</td>
                          <td className="py-2.5 px-4 flex flex-wrap gap-1">
                            {file.tags.length === 0 ? (
                              <span className="text-gray-300">-</span>
                            ) : (
                              file.tags.map(t => (
                                <span key={t} className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold border border-blue-100">{t}</span>
                              ))
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Floating Custom HTML Context Menu */}
      {contextMenu && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{ top: contextMenu.y, left: contextMenu.x }}
          className="fixed bg-white border border-gray-150 rounded-xl shadow-md p-1.5 z-50 w-52 text-left text-xs animate-popup"
        >
          {contextMenu.type === 'canvas' ? (
            <div className="space-y-0.5">
              <button
                onClick={() => {
                  setShowNewFolderModal(true);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 rounded-lg font-semibold flex items-center gap-2 text-gray-700 cursor-pointer"
              >
                <FolderPlus className="h-4 w-4 text-blue-500" /> New Folder
              </button>
              {clipboard && (
                <button
                  onClick={() => {
                    onPaste(currentFolderId);
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-emerald-50 rounded-lg font-semibold flex items-center gap-2 text-emerald-800 cursor-pointer"
                >
                  <Copy className="h-4 w-4 text-emerald-500" /> Paste clipboard
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-0.5 select-none">
              <button
                onClick={() => {
                  const item = contextMenu.type === 'file' 
                    ? files.find(f => f.id === contextMenu.id)
                    : folders.find(f => f.id === contextMenu.id);
                  if (item) triggerRename(contextMenu.type as 'file' | 'folder', item.id, item.name);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 rounded-lg font-semibold text-gray-700 flex items-center gap-2 cursor-pointer"
              >
                Rename item
              </button>
              
              <button
                onClick={() => {
                  if (contextMenu.id) handleToggleStar(contextMenu.type as 'file' | 'folder', contextMenu.id);
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 rounded-lg font-semibold text-gray-700 flex items-center gap-2 cursor-pointer"
              >
                Star favorite
              </button>

              {contextMenu.type === 'file' && (
                <>
                  <button
                    onClick={() => {
                      if (contextMenu.id) handleDuplicate('file', contextMenu.id);
                      setContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-gray-50 rounded-lg font-semibold text-gray-700 flex items-center gap-2 cursor-pointer"
                  >
                    Duplicate content
                  </button>

                  <button
                    onClick={() => {
                      const fileObj = files.find(f => f.id === contextMenu.id);
                      if (fileObj) handleDownloadFile(fileObj);
                      setContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-blue-50 hover:text-blue-700 rounded-lg font-semibold text-gray-700 flex items-center gap-2 cursor-pointer"
                  >
                    <Download className="h-4 w-4 text-blue-500" /> Download
                  </button>
                </>
              )}

              <div className="border-t border-gray-100 my-1" />

              <button
                onClick={() => {
                  handleClipboardAction('copy');
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 rounded-lg font-semibold text-gray-700 flex items-center gap-2 cursor-pointer"
              >
                Copy
              </button>

              <button
                onClick={() => {
                  handleClipboardAction('move');
                  setContextMenu(null);
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-gray-50 rounded-lg font-semibold text-gray-700 flex items-center gap-3 cursor-pointer"
              >
                Move To
              </button>

              <div className="border-t border-gray-100 my-1" />

              {activeView === 'recycle' ? (
                <>
                  <button
                    onClick={() => {
                      if (contextMenu.id) {
                        if (contextMenu.type === 'file') onRestoreFile(contextMenu.id);
                        else onRestoreFolder(contextMenu.id);
                      }
                      setContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 text-emerald-800 rounded-lg font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    Restore to Root
                  </button>
                  <button
                    onClick={() => {
                      if (contextMenu.id) {
                        if (contextMenu.type === 'file') onPermanentlyDeleteFile(contextMenu.id);
                        else onPermanentlyDeleteFolder(contextMenu.id);
                      }
                      setContextMenu(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-700 rounded-lg font-semibold flex items-center gap-2 cursor-pointer"
                  >
                    Wipe permanently
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    if (contextMenu.id) {
                      if (contextMenu.type === 'file') onDeleteFile(contextMenu.id);
                      else onDeleteFolder(contextMenu.id);
                    }
                    setContextMenu(null);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 rounded-lg font-semibold flex items-center gap-2 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" /> Move to Recycle
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* New Folder Modal dialog */}
      {showNewFolderModal && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50" style={{ background: 'rgba(15,23,42,0.15)', backdropFilter: 'blur(2px)' }}>
          <div className="bg-white rounded-xl border border-gray-150 p-6 w-96 shadow-lg space-y-4 animate-scaleUp">
            <div>
              <h4 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <FolderPlus className="h-5 w-5 text-blue-500" /> Create New Directory
              </h4>
              <p className="text-xs text-gray-500 mt-1">Make an unlimited nested folder structure inside current view.</p>
            </div>
            
            <input
              type="text"
              placeholder="Folder Name (e.g., Training Documents)..."
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full text-xs p-2.5 border border-gray-155 rounded-lg bg-gray-50/50 text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-blue-100 font-medium"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onCreateFolder(newFolderName, currentFolderId);
                  setNewFolderName('');
                  setShowNewFolderModal(false);
                }
              }}
              autoFocus
            />

            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => {
                  setNewFolderName('');
                  setShowNewFolderModal(false);
                }}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onCreateFolder(newFolderName, currentFolderId);
                  setNewFolderName('');
                  setShowNewFolderModal(false);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg cursor-pointer shadow-xs"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Directory Access Password Unlock Verification Dialog */}
      {lockedFolderOpenId && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50 animate-fadeIn" style={{ background: 'rgba(15,23,42,0.15)', backdropFilter: 'blur(2px)' }}>
          <div className="bg-white rounded-xl border border-gray-150 p-6 w-96 shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
                <Key className="h-5 w-5 animate-pulse" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900 text-sm">Protected Folder Secure Access</h4>
                <p className="text-[10px] text-gray-500">Security credentials are required (try seeded passcode "123")</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <input
                type="password"
                placeholder="Enter passcode..."
                value={verificationPasscode}
                onChange={(e) => setVerificationPasscode(e.target.value)}
                className="w-full text-xs p-2.5 border border-gray-200 rounded-lg bg-gray-50 text-center tracking-widest font-mono text-gray-800 focus:outline-hidden"
                onKeyDown={(e) => e.key === 'Enter' && handleVerifyPasscode()}
                autoFocus
              />
              {verificationError && (
                <p className="text-[10px] text-red-500 font-medium">{verificationError}</p>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setLockedFolderOpenId(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyPasscode}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg cursor-pointer"
              >
                Unlock Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

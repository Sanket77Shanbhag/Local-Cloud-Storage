/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect, useRef } from 'react';
import { Folder, FileItem, FilterOptions, SortBy, SortOrder } from './types';
import {
  initDB,
  getAllFolders,
  getAllFiles,
  saveFolder,
  saveFile,
  deleteFolder,
  deleteFile,
  seedInitialDataIfEmpty,
  saveFoldersBulk,
  saveFilesBulk
} from './lib/db';
import { getFileCategory } from './lib/utils';
import Sidebar from './components/Sidebar';
import SearchAndFilters from './components/SearchAndFilters';
import MainGrid from './components/MainGrid';
import RightPanel from './components/RightPanel';
import StatsDashboard from './components/StatsDashboard';
import ShortcutsDialog from './components/ShortcutsDialog';
import { AlertCircle, Terminal, CheckCircle } from 'lucide-react';

export default function App() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  
  // Navigation states
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  // Selection
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [highlightedItem, setHighlightedItem] = useState<{ type: 'file' | 'folder'; id: string } | null>(null);
  
  // Clipboard
  const [clipboard, setClipboard] = useState<{ action: 'copy' | 'move'; items: { type: 'file' | 'folder'; id: string }[] } | null>(null);
  
  // Filters and sort option
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    type: 'all',
    minSize: null,
    maxSize: null,
    dateMin: '',
    dateMax: '',
    tag: ''
  });
  const [sortBy, setSortBy] = useState<SortBy>('name');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Display mode triggers
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'details'>('grid');
  const [activeView, setActiveView] = useState<'explorer' | 'favorites' | 'recent' | 'recycle' | 'stats'>('explorer');

  // UI state overlays
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Load database items on startup
  useEffect(() => {
    async function loadData() {
      try {
        await initDB();
        const data = await seedInitialDataIfEmpty();
        setFolders(data.folders);
        setFiles(data.files);
        showBanner('System initialization successful. Loaded local device files.', 'success');
      } catch (err) {
        console.error('Initialization error:', err);
        showBanner('Failed loading local DB. Fallback state loaded.', 'error');
      }
    }
    loadData();
  }, []);

  // Set timeout callback to clear banners cleanly
  const bannerTimer = useRef<number | null>(null);
  const showBanner = (text: string, type: 'success' | 'error' | 'info') => {
    if (bannerTimer.current) {
      window.clearTimeout(bannerTimer.current);
    }
    setStatusMessage({ text, type });
    bannerTimer.current = window.setTimeout(() => {
      setStatusMessage(null);
    }, 4500);
  };

  // Keyboard shortcut handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus Search input: Ctrl + F
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
        }
      }

      // Open shortcuts helper panel: K
      if (e.key.toLowerCase() === 'k' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setShowShortcuts(prev => !prev);
      }

      // deselect options: Escape
      if (e.key === 'Escape') {
        setSelectedItems(new Set());
        setHighlightedItem(null);
      }

      // Star Toggle Favorite: F
      if (e.key.toLowerCase() === 'f' && highlightedItem && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        const { type, id } = highlightedItem;
        if (type === 'file') {
          const file = files.find(f => f.id === id);
          if (file) {
            handleUpdateFile({ ...file, isFavorite: !file.isFavorite, updatedAt: Date.now() });
            showBanner(`Favorite status updated for '${file.name}'`, 'success');
          }
        } else {
          const folder = folders.find(f => f.id === id);
          if (folder) {
            handleUpdateFolder({ ...folder, isFavorite: !folder.isFavorite, updatedAt: Date.now() });
            showBanner(`Favorite status updated for '${folder.name}'`, 'success');
          }
        }
      }

      // Delete key maps to Recycle Bin
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedItems.size > 0 && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        selectedItems.forEach(key => {
          const [type, id] = key.split('-');
          if (type === 'file') {
            handleDeleteFile(id);
          } else {
            handleDeleteFolder(id);
          }
        });
        setSelectedItems(new Set());
        setHighlightedItem(null);
        showBanner(`Successfully trashed selection items.`, 'info');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [highlightedItem, selectedItems, files, folders]);

  // CRUD events linked to IndexedDB
  const handleCreateFolder = async (name: string, parentId: string | null) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const newFolder: Folder = {
      id: `folder-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: trimmed,
      parentId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isLocked: false,
      isFavorite: false,
      isDeleted: false,
      deletedAt: null
    };

    try {
      await saveFolder(newFolder);
      setFolders(prev => [...prev, newFolder]);
      showBanner(`Created folder '${trimmed}'`, 'success');
    } catch (e) {
      showBanner('Failed storing folder in DB.', 'error');
    }
  };

  const handleUploadFiles = async (fileList: FileList | File[]) => {
    const newUploads: FileItem[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const newFileItem: FileItem = {
        id: `file-${Date.now()}-${Math.random().toString(36).substr(2, 4)}-${i}`,
        name: file.name,
        parentId: currentFolderId,
        size: file.size,
        type: file.type || 'application/octet-stream',
        content: file,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isFavorite: false,
        isDeleted: false,
        deletedAt: null,
        tags: [],
        versions: []
      };
      newUploads.push(newFileItem);
    }

    try {
      await saveFilesBulk(newUploads);
      setFiles(prev => [...prev, ...newUploads]);
      showBanner(`Successfully uploaded ${newUploads.length} content file(s)`, 'success');
    } catch (e) {
      showBanner('Upload failure inside IndexedDB.', 'error');
    }
  };

  const handleDeleteFile = async (id: string) => {
    const file = files.find(f => f.id === id);
    if (!file) return;

    const updatedFile = { ...file, isDeleted: true, deletedAt: Date.now(), updatedAt: Date.now() };
    try {
      await saveFile(updatedFile);
      setFiles(prev => prev.map(f => f.id === id ? updatedFile : f));
    } catch (e) {
      showBanner('Failed purger syncing file.', 'error');
    }
  };

  const handleDeleteFolder = async (id: string) => {
    // Collect child IDs recursively, mark them all as deleted
    const getChildFolders = (pId: string): string[] => {
      const children = folders.filter(f => f.parentId === pId && !f.isDeleted);
      const list = [pId];
      for (const c of children) {
        list.push(...getChildFolders(c.id));
      }
      return list;
    };

    const targetIds = getChildFolders(id);
    const updatedFolders = folders.map(f => {
      if (targetIds.includes(f.id)) {
        return { ...f, isDeleted: true, deletedAt: Date.now(), updatedAt: Date.now() };
      }
      return f;
    });

    const updatedFiles = files.map(file => {
      if (file.parentId && targetIds.includes(file.parentId)) {
        return { ...file, isDeleted: true, deletedAt: Date.now(), updatedAt: Date.now() };
      }
      return file;
    });

    try {
      const foldersToUpdate = updatedFolders.filter(f => targetIds.includes(f.id));
      const filesToUpdate = updatedFiles.filter(file => file.parentId && targetIds.includes(file.parentId));
      
      await saveFoldersBulk(foldersToUpdate);
      await saveFilesBulk(filesToUpdate);
      
      setFolders(updatedFolders);
      setFiles(updatedFiles);
    } catch (e) {
      showBanner('Failed recursive trashing in database.', 'error');
    }
  };

  // RESTORE FROM RECYCLE BIN
  const handleRestoreFile = async (id: string) => {
    const file = files.find(f => f.id === id);
    if (!file) return;

    // Put at root index if parent folder is also deleted or missing
    const parent = file.parentId ? folders.find(fo => fo.id === file.parentId) : null;
    const parentDeleted = parent ? parent.isDeleted : false;

    const updatedFile: FileItem = {
      ...file,
      parentId: parentDeleted ? null : file.parentId,
      isDeleted: false,
      deletedAt: null,
      updatedAt: Date.now()
    };

    try {
      await saveFile(updatedFile);
      setFiles(prev => prev.map(f => f.id === id ? updatedFile : f));
      showBanner(`Restored '${file.name}' to folders`, 'success');
    } catch (e) {
      showBanner('Database restore write query failed.', 'error');
    }
  };

  const handleRestoreFolder = async (id: string) => {
    const getRecDeletedChildren = (pId: string): string[] => {
      const list = [pId];
      const children = folders.filter(f => f.parentId === pId && f.isDeleted);
      for (const child of children) {
        list.push(...getRecDeletedChildren(child.id));
      }
      return list;
    };

    const targetIds = getRecDeletedChildren(id);
    const updatedFolders = folders.map(f => {
      if (targetIds.includes(f.id)) {
        return { ...f, isDeleted: false, deletedAt: null, updatedAt: Date.now() };
      }
      return f;
    });

    const updatedFiles = files.map(file => {
      if (file.parentId && targetIds.includes(file.parentId) && file.isDeleted) {
        return { ...file, isDeleted: false, deletedAt: null, updatedAt: Date.now() };
      }
      return file;
    });

    try {
      const fUpdate = updatedFolders.filter(folder => targetIds.includes(folder.id));
      const fileUpdate = updatedFiles.filter(file => file.parentId && targetIds.includes(file.parentId));
      await saveFoldersBulk(fUpdate);
      await saveFilesBulk(fileUpdate);

      setFolders(updatedFolders);
      setFiles(updatedFiles);
      showBanner(`Restored directory nesting hierarchy nicely.`, 'success');
    } catch (e) {
      showBanner('Restore recursive elements failed.', 'error');
    }
  };

  // PERMANENT PURGE
  const handlePermanentlyDeleteFile = async (id: string) => {
    try {
      await deleteFile(id);
      setFiles(prev => prev.filter(f => f.id !== id));
      showBanner('Wiped file permanently from local device.', 'info');
    } catch (e) {
      showBanner('Purge file failure.', 'error');
    }
  };

  const handlePermanentlyDeleteFolder = async (id: string) => {
    // Delete folders & files recursively
    const getDescendants = (pId: string): string[] => {
      const list = [pId];
      const children = folders.filter(f => f.parentId === pId);
      for (const child of children) {
        list.push(...getDescendants(child.id));
      }
      return list;
    };

    const targetIds = getDescendants(id);

    try {
      for (const fid of targetIds) {
        await deleteFolder(fid);
      }
      
      const filesToDelete = files.filter(f => f.parentId && targetIds.includes(f.parentId));
      for (const file of filesToDelete) {
        await deleteFile(file.id);
      }

      setFolders(prev => prev.filter(f => !targetIds.includes(f.id)));
      setFiles(prev => prev.filter(f => !(f.parentId && targetIds.includes(f.parentId))));
      showBanner('Recursive folder purge completed.', 'info');
    } catch (e) {
      showBanner('Recursive folder permanent purge fails', 'error');
    }
  };

  const handleUpdateFile = async (updatedFile: FileItem) => {
    try {
      await saveFile(updatedFile);
      setFiles(prev => prev.map(f => f.id === updatedFile.id ? updatedFile : f));
      if (highlightedItem?.type === 'file' && highlightedItem.id === updatedFile.id) {
        // preserve current highlight selection info
        setHighlightedItem({ type: 'file', id: updatedFile.id });
      }
    } catch (e) {
      showBanner('Failed editing file properties.', 'error');
    }
  };

  const handleUpdateFolder = async (updatedFolder: Folder) => {
    try {
      await saveFolder(updatedFolder);
      setFolders(prev => prev.map(f => f.id === updatedFolder.id ? updatedFolder : f));
    } catch (e) {
      showBanner('Failed editing folder properties.', 'error');
    }
  };

  // Version History Restore Swap Action
  const handleRestoreVersion = async (file: FileItem, versionIndex: number) => {
    const selectedVersion = file.versions[versionIndex];
    if (!selectedVersion) return;

    // Create a copy of current active state to save as a new history node first
    const previousActiveVersion = {
      id: `v-${Date.now()}-${Math.random().toString(36).substr(2, 3)}`,
      name: file.name,
      size: file.size,
      type: file.type,
      content: file.content,
      updatedAt: Date.now()
    };

    // Construct the restored active file
    const restoredFile: FileItem = {
      ...file,
      name: selectedVersion.name,
      size: selectedVersion.size,
      type: selectedVersion.type,
      content: selectedVersion.content,
      updatedAt: Date.now(),
      versions: [
        ...file.versions.filter((_, idx) => idx !== versionIndex),
        previousActiveVersion
      ]
    };

    try {
      await saveFile(restoredFile);
      setFiles(prev => prev.map(f => f.id === file.id ? restoredFile : f));
      showBanner(`Successfully restored version archive matching '${selectedVersion.name}'`, 'success');
    } catch (e) {
      showBanner('History restore rollback failed.', 'error');
    }
  };

  // RECURSIVE COPYING ALGORITHM FOR PASTE ACTIONS
  const handlePaste = async (targetFolderId: string | null) => {
    if (!clipboard) return;
    const { action, items } = clipboard;

    const newFilesList: FileItem[] = [];
    const newFoldersList: Folder[] = [];
    const foldersToMoveList: Folder[] = [];
    const filesToMoveList: FileItem[] = [];

    // Temporary mapping of old folder IDs to newly generated folder IDs during bulk copies
    const copyFolderIdMap = new Map<string, string>();

    const duplicateFolderTree = async (fId: string, destParentId: string | null) => {
      const origFolder = folders.find(fo => fo.id === fId);
      if (!origFolder) return;

      const freshFolderId = `folder-copy-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
      copyFolderIdMap.set(fId, freshFolderId);

      const dupFolderObj: Folder = {
        ...origFolder,
        id: freshFolderId,
        parentId: destParentId,
        name: `${origFolder.name} - Copied`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isFavorite: false
      };
      newFoldersList.push(dupFolderObj);

      // Duplicate internal immediate files
      const sourceFiles = files.filter(f => f.parentId === fId && !f.isDeleted);
      sourceFiles.forEach(f => {
        newFilesList.push({
          ...f,
          id: `file-copy-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          parentId: freshFolderId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          versions: [],
          isFavorite: false
        });
      });

      // Duplicate sub directories
      const childDirs = folders.filter(fol => fol.parentId === fId && !fol.isDeleted);
      for (const subDir of childDirs) {
        await duplicateFolderTree(subDir.id, freshFolderId);
      }
    };

    try {
      for (const item of items) {
        if (item.type === 'file') {
          const fileObj = files.find(f => f.id === item.id);
          if (!fileObj) continue;

          if (action === 'copy') {
            // copy duplicates
            const extIndex = fileObj.name.lastIndexOf('.');
            const base = extIndex !== -1 ? fileObj.name.substring(0, extIndex) : fileObj.name;
            const ext = extIndex !== -1 ? fileObj.name.substring(extIndex) : '';

            newFilesList.push({
              ...fileObj,
              id: `file-copy-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
              name: `${base} - Copied${ext}`,
              parentId: targetFolderId,
              createdAt: Date.now(),
              updatedAt: Date.now(),
              isFavorite: false,
              versions: []
            });
          } else {
            // move updates parent
            filesToMoveList.push({
              ...fileObj,
              parentId: targetFolderId,
              updatedAt: Date.now()
            });
          }
        } else {
          // Folder elements
          const folderObj = folders.find(fo => fo.id === item.id);
          if (!folderObj) continue;

          if (action === 'copy') {
            await duplicateFolderTree(item.id, targetFolderId);
          } else {
            // prevent moving a folder into itself or its own descendants
            const isDescendent = (checkId: string, parentCheck: string | null): boolean => {
              if (parentCheck === null) return false;
              if (parentCheck === checkId) return true;
              const dad = folders.find(f => f.id === parentCheck);
              return dad ? isDescendent(checkId, dad.parentId) : false;
            };

            if (targetFolderId === folderObj.id || isDescendent(folderObj.id, targetFolderId)) {
              showBanner("Invalid Destination: Cannot move folder inside its own subtree hierarchy.", 'error');
              return;
            }

            foldersToMoveList.push({
              ...folderObj,
              parentId: targetFolderId,
              updatedAt: Date.now()
            });
          }
        }
      }

      // Write changes and state bulk updates
      if (action === 'copy') {
        if (newFoldersList.length > 0) {
          await saveFoldersBulk(newFoldersList);
          setFolders(prev => [...prev, ...newFoldersList]);
        }
        if (newFilesList.length > 0) {
          await saveFilesBulk(newFilesList);
          setFiles(prev => [...prev, ...newFilesList]);
        }
        showBanner(`Successfully copied ${newFoldersList.length + newFilesList.length} items here`, 'success');
      } else {
        // Move trigger
        if (foldersToMoveList.length > 0) {
          await saveFoldersBulk(foldersToMoveList);
          setFolders(prev => prev.map(f => {
            const match = foldersToMoveList.find(moved => moved.id === f.id);
            return match ? match : f;
          }));
        }
        if (filesToMoveList.length > 0) {
          await saveFilesBulk(filesToMoveList);
          setFiles(prev => prev.map(f => {
            const match = filesToMoveList.find(moved => moved.id === f.id);
            return match ? match : f;
          }));
        }
        showBanner(`Successfully moved ${foldersToMoveList.length + filesToMoveList.length} items here`, 'success');
      }

      // Clean clipboard state after movement
      setClipboard(null);
    } catch (e) {
      showBanner('Failed copying or moving entities in IndexedDB.', 'error');
    }
  };

  // EXTRACT DYNAMIC LIST OF TAGS FOR SELECT DROPDOWN FILTERS
  const getAllUniqueTags = () => {
    const active = files.filter(f => !f.isDeleted);
    const tagsSet = new Set<string>();
    active.forEach(file => {
      file.tags.forEach(t => tagsSet.add(t));
    });
    return Array.from(tagsSet);
  };

  // FILTERED FILES & FOLDERS CALCULATOR Based on Sort/Filter options
  const getSortedAndFilteredItems = () => {
    // 1. Filter out deleted folders/files depending on state
    let filteredFiles = files;
    let filteredFolders = folders;

    const currentFolderObj = folders.find(f => f.id === currentFolderId);

    if (activeView === 'explorer') {
      filteredFolders = folders.filter(f => f.parentId === currentFolderId && !f.isDeleted);
      filteredFiles = files.filter(f => f.parentId === currentFolderId && !f.isDeleted);
    } else if (activeView === 'favorites') {
      filteredFolders = folders.filter(f => f.isFavorite && !f.isDeleted);
      filteredFiles = files.filter(f => f.isFavorite && !f.isDeleted);
    } else if (activeView === 'recent') {
      filteredFolders = [];
      filteredFiles = files
        .filter(f => !f.isDeleted)
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 15);
    } else if (activeView === 'recycle') {
      filteredFolders = folders.filter(f => f.isDeleted);
      filteredFiles = files.filter(f => f.isDeleted);
    }

    // Apply Filter Options
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filteredFolders = filteredFolders.filter(f => f.name.toLowerCase().includes(q));
      filteredFiles = filteredFiles.filter(f => 
        f.name.toLowerCase().includes(q) || 
        (f.description && f.description.toLowerCase().includes(q))
      );
    }

    if (filters.type !== 'all') {
      // folders drop out because directory doesn't hold MIME category format
      filteredFolders = [];
      filteredFiles = filteredFiles.filter(f => getFileCategory(f.name, f.type) === filters.type);
    }

    if (filters.tag) {
      filteredFolders = [];
      filteredFiles = filteredFiles.filter(f => f.tags.includes(filters.tag));
    }

    if (filters.minSize !== null) {
      filteredFolders = [];
      filteredFiles = filteredFiles.filter(f => f.size >= (filters.minSize || 0));
    }

    if (filters.maxSize !== null) {
      filteredFolders = [];
      filteredFiles = filteredFiles.filter(f => f.size <= (filters.maxSize || Infinity));
    }

    if (filters.dateMin) {
      const minMs = new Date(filters.dateMin).getTime();
      filteredFolders = filteredFolders.filter(f => f.updatedAt >= minMs);
      filteredFiles = filteredFiles.filter(f => f.updatedAt >= minMs);
    }

    if (filters.dateMax) {
      const maxMs = new Date(filters.dateMax + 'T23:59:59').getTime();
      filteredFolders = filteredFolders.filter(f => f.updatedAt <= maxMs);
      filteredFiles = filteredFiles.filter(f => f.updatedAt <= maxMs);
    }

    // Apply sorting
    const orderSign = sortOrder === 'asc' ? 1 : -1;

    filteredFolders.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name) * orderSign;
      if (sortBy === 'createdAt') return (a.createdAt - b.createdAt) * orderSign;
      if (sortBy === 'updatedAt') return (a.updatedAt - b.updatedAt) * orderSign;
      return 0; // folders do not have size or type attributes directly
    });

    filteredFiles.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name) * orderSign;
      if (sortBy === 'createdAt') return (a.createdAt - b.createdAt) * orderSign;
      if (sortBy === 'updatedAt') return (a.updatedAt - b.updatedAt) * orderSign;
      if (sortBy === 'size') return (a.size - b.size) * orderSign;
      if (sortBy === 'type') return a.type.localeCompare(b.type) * orderSign;
      return 0;
    });

    return { filteredFolders, filteredFiles };
  };

  const { filteredFolders, filteredFiles } = getSortedAndFilteredItems();

  // Find currently highlighted item file/folder content object references
  const getHighlightedDetailRefs = () => {
    if (!highlightedItem) return { activeFile: null, activeFolder: null };
    if (highlightedItem.type === 'file') {
      return {
        activeFile: files.find(f => f.id === highlightedItem.id) || null,
        activeFolder: null
      };
    } else {
      return {
        activeFile: null,
        activeFolder: folders.find(f => f.id === highlightedItem.id) || null
      };
    }
  };

  const { activeFile, activeFolder } = getHighlightedDetailRefs();

  return (
    <div className="flex bg-gray-50 text-gray-800 font-sans h-screen select-none overflow-hidden" id="explorer-main">
      {/* Sidebar Navigation Panel wrapper */}
      <Sidebar
        folders={folders}
        files={files}
        currentFolderId={currentFolderId}
        onSelectFolder={setCurrentFolderId}
        activeView={activeView}
        setActiveView={(v) => {
          setActiveView(v);
          setSelectedItems(new Set());
          setHighlightedItem(null);
        }}
        onOpenShortcuts={() => setShowShortcuts(true)}
      />

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col h-full min-w-0">
        
        {/* Top Control Bar with Quick Info statistics or Search Filters */}
        <div className="p-4 bg-white border-b border-gray-150 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight">
                {activeView === 'explorer' 
                  ? (currentFolderId ? folders.find(f => f.id === currentFolderId)?.name : 'Root Index Storage') 
                  : activeView === 'favorites' ? 'Starred Favorites Index'
                  : activeView === 'recent' ? 'Recent Active Files'
                  : activeView === 'recycle' ? 'Recycle Trashed Bin'
                  : 'Volume Statistics and Metrics'
                }
              </h2>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">
                Local Database Index • {folders.filter(f => !f.isDeleted).length} Folders Nested
              </p>
            </div>

            {/* General Status message banner */}
            {statusMessage && (
              <div className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-2 animate-fadeIn max-w-sm ${
                statusMessage.type === 'success' ? 'bg-emerald-50 border-emerald-150 text-emerald-800'
                : statusMessage.type === 'error' ? 'bg-red-50 border-red-150 text-red-800'
                : 'bg-blue-50 border-blue-150 text-blue-800'
              }`}>
                {statusMessage.type === 'success' ? <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                : statusMessage.type === 'error' ? <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
                : <Terminal className="h-4 w-4 text-blue-600 shrink-0" />}
                <span className="truncate">{statusMessage.text}</span>
              </div>
            )}
          </div>

          <SearchAndFilters
            filters={filters}
            setFilters={setFilters}
            sortBy={sortBy}
            setSortBy={setSortBy}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            allTags={getAllUniqueTags()}
          />
        </div>

        {/* Content routing based on statistics view option */}
        <div className="flex-1 flex min-h-0 min-w-0">
          {activeView === 'stats' ? (
            <div className="flex-1 overflow-y-auto p-5">
              <StatsDashboard
                files={files}
                folders={folders}
                onNavigateToRecycleBin={() => {
                  setActiveView('recycle');
                  setSelectedItems(new Set());
                  setHighlightedItem(null);
                }}
              />
            </div>
          ) : (
            <MainGrid
              currentFolderId={currentFolderId}
              folders={folders}
              files={files}
              selectedItems={selectedItems}
              setSelectedItems={setSelectedItems}
              onSelectFolder={setCurrentFolderId}
              viewMode={viewMode}
              setViewMode={setViewMode}
              onCreateFolder={handleCreateFolder}
              onUploadFiles={handleUploadFiles}
              onDeleteFile={handleDeleteFile}
              onDeleteFolder={handleDeleteFolder}
              onUpdateFile={handleUpdateFile}
              onUpdateFolder={handleUpdateFolder}
              onRestoreFile={handleRestoreFile}
              onRestoreFolder={handleRestoreFolder}
              onPermanentlyDeleteFile={handlePermanentlyDeleteFile}
              onPermanentlyDeleteFolder={handlePermanentlyDeleteFolder}
              onHighlightItem={setHighlightedItem}
              highlightedItem={highlightedItem}
              clipboard={clipboard}
              setClipboard={setClipboard}
              onPaste={handlePaste}
              activeView={activeView}
            />
          )}

          {/* Properties Detail side panels */}
          <RightPanel
            selectedFile={activeFile}
            selectedFolder={activeFolder}
            folders={folders}
            onUpdateFile={handleUpdateFile}
            onUpdateFolder={handleUpdateFolder}
            onRestoreVersion={handleRestoreVersion}
          />
        </div>
      </main>

      {/* Show Shortcuts Help Dialog key overlay */}
      {showShortcuts && (
        <ShortcutsDialog onClose={() => setShowShortcuts(false)} />
      )}
    </div>
  );
}

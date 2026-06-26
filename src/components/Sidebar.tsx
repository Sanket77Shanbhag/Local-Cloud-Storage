import React from 'react';
import { Folder, FileItem } from '../types';
import FolderTree from './FolderTree';
import { formatBytes } from '../lib/utils';
import {
  HardDrive,
  Trash2,
  FolderHeart,
  Clock,
  LayoutGrid,
  Info,
  Layers,
  ChevronRight,
  ShieldCheck,
  FolderClosed,
  ChevronDown
} from 'lucide-react';

interface SidebarProps {
  folders: Folder[];
  files: FileItem[];
  currentFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  activeView: 'explorer' | 'favorites' | 'recent' | 'recycle' | 'stats';
  setActiveView: (view: 'explorer' | 'favorites' | 'recent' | 'recycle' | 'stats') => void;
  onOpenShortcuts: () => void;
}

export default function Sidebar({
  folders,
  files,
  currentFolderId,
  onSelectFolder,
  activeView,
  setActiveView,
  onOpenShortcuts
}: SidebarProps) {
  const activeFiles = files.filter(f => !f.isDeleted);
  const deletedFiles = files.filter(f => f.isDeleted);

  const totalSize = activeFiles.reduce((sum, f) => sum + f.size, 0);
  const totalFoldersCount = folders.filter(f => !f.isDeleted).length;
  
  // Storage Quota
  const storageQuota = 100 * 1024 * 1024; // 100MB
  const storagePercent = Math.min((totalSize / storageQuota) * 100, 100);

  const starCount = files.filter(f => f.isFavorite && !f.isDeleted).length + 
                    folders.filter(f => f.isFavorite && !f.isDeleted).length;

  const recentCount = files.filter(f => !f.isDeleted && (Date.now() - f.updatedAt < 1000 * 60 * 60 * 24 * 2)).length; // last 2 days

  const selectExplorerRoot = () => {
    setActiveView('explorer');
    onSelectFolder(null);
  };

  return (
    <aside className="w-[240px] shrink-0 bg-white border-r border-slate-200 flex flex-col h-full" id="explorer-sidebar">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center gap-2.5">
        <div className="bg-blue-500 text-white p-2 rounded-lg shadow-sm">
          <HardDrive className="h-5 w-5" />
        </div>
        <div>
          <h1 className="font-bold text-sm text-slate-900 tracking-tight">LocalDrive</h1>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Storage Index</p>
        </div>
      </div>

      {/* Main Navigation links */}
      <div className="p-3 space-y-1 select-none">
        <button
          onClick={selectExplorerRoot}
          className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
            activeView === 'explorer' && currentFolderId === null
              ? 'bg-[#eff6ff] text-[#3b82f6] border-r-3 border-[#3b82f6] font-bold rounded-r-none'
              : 'text-slate-600 hover:bg-slate-50 hover:text-blue-500 rounded-lg'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <LayoutGrid className="h-4 w-4 text-blue-500" />
            <span>All My Files</span>
          </div>
          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-sm">
            {activeFiles.length}
          </span>
        </button>

        <button
          onClick={() => setActiveView('favorites')}
          className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
            activeView === 'favorites'
              ? 'bg-[#eff6ff] text-[#3b82f6] border-r-3 border-[#3b82f6] font-bold rounded-r-none'
              : 'text-slate-600 hover:bg-slate-50 hover:text-blue-500 rounded-lg'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <FolderHeart className="h-4 w-4 text-emerald-500" />
            <span>Favorites</span>
          </div>
          {starCount > 0 && (
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-sm font-bold">
              {starCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveView('recent')}
          className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
            activeView === 'recent'
              ? 'bg-[#eff6ff] text-[#3b82f6] border-r-3 border-[#3b82f6] font-bold rounded-r-none'
              : 'text-slate-600 hover:bg-slate-50 hover:text-blue-500 rounded-lg'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-purple-500" />
            <span>Recent Uploads</span>
          </div>
          {recentCount > 0 && (
            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded-sm">
              {recentCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveView('recycle')}
          className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
            activeView === 'recycle'
              ? 'bg-red-50 text-red-700 border-r-3 border-red-500 rounded-r-none font-bold'
              : 'text-slate-600 hover:bg-slate-50 hover:text-blue-500 rounded-lg'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Trash2 className="h-4 w-4 text-red-500" />
            <span>Recycle Bin</span>
          </div>
          {deletedFiles.length > 0 && (
            <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-sm font-semibold">
              {deletedFiles.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveView('stats')}
          className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer ${
            activeView === 'stats'
              ? 'bg-[#eff6ff] text-[#3b82f6] border-r-3 border-[#3b82f6] font-bold rounded-r-none'
              : 'text-slate-600 hover:bg-slate-50 hover:text-blue-500 rounded-lg'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Layers className="h-4 w-4 text-amber-500" />
            <span>Directory Analytics</span>
          </div>
        </button>
      </div>

      {/* Directory Hierarchy Tree heading */}
      <div className="p-3 border-t border-slate-100 flex-1 overflow-y-auto space-y-2">
        <div className="flex items-center justify-between px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
          <span>Folder Nestings</span>
          <span className="text-slate-300 font-normal">({totalFoldersCount} active)</span>
        </div>
        
        {/* Render interactive local explorer nesting tree hierarchy starts with parentId null */}
        <div className="px-1 bg-white">
          <div
            onClick={selectExplorerRoot}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer mb-1.5 ${
              activeView === 'explorer' && currentFolderId === null
                ? 'text-blue-600 bg-blue-50/50'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <FolderClosed className="h-3.5 w-3.5 text-blue-400" />
            <span>Root Index</span>
          </div>

          <FolderTree
            folders={folders}
            currentFolderId={currentFolderId}
            onSelectFolder={(id) => {
              setActiveView('explorer');
              onSelectFolder(id);
            }}
            parentId={null}
            level={0}
          />
        </div>
      </div>

      {/* Security & Local confirmation status */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-white border border-slate-200 text-[10.5px] text-emerald-700 font-semibold shadow-2xs">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">Local Device Encryption Active</span>
        </div>
      </div>

      {/* Local Storage usage indicator */}
      <div className="p-4 border-t border-slate-100 bg-white">
        <div className="flex justify-between items-center text-xs text-slate-500 font-medium mb-1.5">
          <span>Local Volume Space</span>
          <span>{formatBytes(totalSize, 1)}</span>
        </div>
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-blue-600 h-full rounded-full transition-all duration-300"
            style={{ width: `${storagePercent}%` }}
          />
        </div>
        <div className="flex justify-between items-center mt-2.5">
          <button
            onClick={onOpenShortcuts}
            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-wider flex items-center gap-1 cursor-pointer"
          >
            <Info className="h-3 w-3" /> Shortcuts (K)
          </button>
          <span className="text-[10px] text-slate-400 font-mono">Quota 100M</span>
        </div>
      </div>
    </aside>
  );
}

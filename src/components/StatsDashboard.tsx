import React from 'react';
import { FileItem, Folder, StorageStats } from '../types';
import { formatBytes, getFileCategory } from '../lib/utils';
import { HardDrive, FileText, Image, Film, Music, Archive, FileQuestion, Trash2, FolderOpen, ArrowRight } from 'lucide-react';

interface StatsDashboardProps {
  files: FileItem[];
  folders: Folder[];
  onNavigateToRecycleBin: () => void;
}

export default function StatsDashboard({ files, folders, onNavigateToRecycleBin }: StatsDashboardProps) {
  const activeFiles = files.filter(f => !f.isDeleted);
  const activeFolders = folders.filter(f => !f.isDeleted);
  const deletedFiles = files.filter(f => f.isDeleted);

  const totalSize = activeFiles.reduce((sum, f) => sum + f.size, 0);
  const recycleBinSize = deletedFiles.reduce((sum, f) => sum + f.size, 0);

  const stats: StorageStats = {
    totalFiles: activeFiles.length,
    totalFolders: activeFolders.length,
    totalSize,
    recycleBinSize,
    sizeByType: {
      documents: 0,
      images: 0,
      videos: 0,
      audio: 0,
      archives: 0,
      others: 0
    }
  };

  activeFiles.forEach(file => {
    const category = getFileCategory(file.name, file.type);
    stats.sizeByType[category] += file.size;
  });

  // Calculate percentages
  const grandTotal = totalSize || 1; // avoid divide by zero
  const getPercent = (size: number) => {
    return Math.round((size / grandTotal) * 100);
  };

  const categories = [
    { key: 'documents', label: 'Documents', color: 'bg-blue-500', text: 'text-blue-500', bg: 'bg-blue-50', icon: FileText, size: stats.sizeByType.documents },
    { key: 'images', label: 'Images & Photos', color: 'bg-emerald-500', text: 'text-emerald-500', bg: 'bg-emerald-50', icon: Image, size: stats.sizeByType.images },
    { key: 'videos', label: 'Videos', color: 'bg-amber-500', text: 'text-amber-500', bg: 'bg-amber-50', icon: Film, size: stats.sizeByType.videos },
    { key: 'audio', label: 'Audio Tracks', color: 'bg-indigo-500', text: 'text-indigo-500', bg: 'bg-indigo-50', icon: Music, size: stats.sizeByType.audio },
    { key: 'archives', label: 'Archives (ZIP/RAR)', color: 'bg-purple-500', text: 'text-purple-500', bg: 'bg-purple-50', icon: Archive, size: stats.sizeByType.archives },
    { key: 'others', label: 'Other Formats', color: 'bg-gray-500', text: 'text-gray-500', bg: 'bg-gray-50', icon: FileQuestion, size: stats.sizeByType.others },
  ];

  // Simulated total storage quota
  const storageQuota = 100 * 1024 * 1024; // 100MB demo limit
  const quotaUsedPercent = Math.min(Math.round((totalSize / storageQuota) * 100), 100);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-6" id="storage-dashboard">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <HardDrive className="h-5 w-5 text-blue-600" />
            Storage Overview
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Real-time stats of your browser-allocated local IndexedDB space</p>
        </div>
        <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium border border-blue-100">
          Quota: {formatBytes(storageQuota, 0)}
        </span>
      </div>

      {/* Quota Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-medium text-gray-700">
          <span>{formatBytes(totalSize)} of {formatBytes(storageQuota)} used</span>
          <span>{quotaUsedPercent}%</span>
        </div>
        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden flex">
          {categories.map((cat) => {
            const widthPct = stats.sizeByType[cat.key as keyof typeof stats.sizeByType] ? (stats.sizeByType[cat.key as keyof typeof stats.sizeByType] / storageQuota) * 100 : 0;
            if (widthPct === 0) return null;
            return (
              <div
                key={cat.key}
                style={{ width: `${widthPct}%` }}
                className={`${cat.color} h-full transition-all duration-300`}
                title={`${cat.label}: ${formatBytes(stats.sizeByType[cat.key as keyof typeof stats.sizeByType])}`}
              />
            );
          })}
          {quotaUsedPercent > 0 && totalSize < storageQuota && (
            <div className="bg-gray-200 h-full flex-1" />
          )}
        </div>
      </div>

      {/* Big totals cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-4 transition-all hover:shadow-sm">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <FolderOpen className="h-3.5 w-3.5 text-blue-500" />
            Total Folders
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">{stats.totalFolders}</p>
          <p className="text-[10px] text-slate-400 mt-1">Unlimited nesting support</p>
        </div>

        <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-4 transition-all hover:shadow-sm">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-blue-500" />
            Total Files
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">{stats.totalFiles}</p>
          <p className="text-[10px] text-slate-400 mt-1">Stored securely on device</p>
        </div>

        <div className="bg-[#f8fafc] border border-slate-200/80 rounded-xl p-4 transition-all hover:shadow-sm">
          <div className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
            <HardDrive className="h-3.5 w-3.5 text-blue-500" />
            Total Size
          </div>
          <p className="text-2xl font-bold text-slate-800 mt-2">{formatBytes(stats.totalSize, 1)}</p>
          <p className="text-[10px] text-slate-400 mt-1">Local database indexes</p>
        </div>

        <button
          onClick={onNavigateToRecycleBin}
          className="bg-red-50/40 border border-red-100 hover:bg-red-50 hover:border-red-200 text-left rounded-xl p-4 transition-all hover:shadow-sm cursor-pointer group"
        >
          <div className="text-xs font-medium text-red-600 flex items-center gap-1.5">
            <Trash2 className="h-3.5 w-3.5" />
            Recycle Bin
          </div>
          <p className="text-2xl font-bold text-red-800 mt-2">{formatBytes(stats.recycleBinSize, 1)}</p>
          <div className="flex items-center justify-between text-[10px] text-red-500 mt-1">
            <span>Restore deleted files</span>
            <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </div>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="border-t border-gray-100 pt-5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">File Category Breakdown</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((cat) => {
            const hasSize = cat.size > 0;
            return (
              <div
                key={cat.key}
                className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-lg hover:border-slate-200 transition-all hover:shadow-sm"
              >
                <div className={`p-2.5 rounded-lg ${cat.bg} ${cat.text}`}>
                  <cat.icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-0.5">
                    <p className="text-xs font-semibold text-gray-700 truncate">{cat.label}</p>
                    <p className="text-xs text-gray-500 font-mono font-medium">{hasSize ? getPercent(cat.size) : 0}%</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] text-gray-400 font-medium">
                      {files.filter(f => !f.isDeleted && getFileCategory(f.name, f.type) === cat.key).length} files
                    </p>
                    <p className="text-xs font-semibold text-gray-600 font-mono">{formatBytes(cat.size)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Folder } from '../types';
import { ChevronRight, ChevronDown, Folder as FolderIcon, Key } from 'lucide-react';

interface FolderTreeProps {
  folders: Folder[];
  currentFolderId: string | null;
  onSelectFolder: (id: string | null) => void;
  parentId: string | null;
  level: number;
}

export default function FolderTree({
  folders,
  currentFolderId,
  onSelectFolder,
  parentId,
  level
}: FolderTreeProps) {
  // Store expanded state in standard React state
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    'f-projects': true, // Expand projects by default for rich visual presentation
  });

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const currentLevelFolders = folders.filter(f => f.parentId === parentId && !f.isDeleted);

  if (currentLevelFolders.length === 0) return null;

  return (
    <ul className={`space-y-0.5 ${level > 0 ? 'border-l border-slate-200 ml-3.5 pl-1.5' : ''}`}>
      {currentLevelFolders.map(folder => {
        const hasChildren = folders.some(f => f.parentId === folder.id && !f.isDeleted);
        const isExpanded = expanded[folder.id];
        const isSelected = currentFolderId === folder.id;

        return (
          <li key={folder.id} className="select-none">
            <div
              onClick={() => onSelectFolder(folder.id)}
              className={`group flex items-center justify-between px-2 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all duration-150 ${
                isSelected
                  ? 'bg-[#eff6ff] text-[#3b82f6] font-bold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-blue-500'
              }`}
            >
              <div className="flex items-center min-w-0 gap-1.5">
                {/* Expander Arrow */}
                <button
                  onClick={(e) => toggleExpand(folder.id, e)}
                  disabled={!hasChildren}
                  className={`p-0.5 rounded-sm hover:bg-slate-200/50 text-slate-400 group-hover:text-slate-600 ${
                    !hasChildren ? 'opacity-0 cursor-default' : 'cursor-pointer'
                  }`}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                </button>

                {/* Folder icon with customizable system tag colors */}
                <FolderIcon
                  className="h-4 w-4 shrink-0 transition-transform group-hover:scale-105"
                  style={{ color: folder.color || '#3b82f6' }}
                  fill={isSelected ? `${folder.color || '#3b82f6'}20` : 'none'}
                />

                <span className="truncate">{folder.name}</span>
                {folder.isLocked && (
                  <Key className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                )}
              </div>
            </div>

            {hasChildren && isExpanded && (
              <FolderTree
                folders={folders}
                currentFolderId={currentFolderId}
                onSelectFolder={onSelectFolder}
                parentId={folder.id}
                level={level + 1}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

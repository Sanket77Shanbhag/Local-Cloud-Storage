import React, { useState, useEffect } from 'react';
import { FileItem, Folder } from '../types';
import { formatBytes } from '../lib/utils';
import {
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  FileQuestion,
  Calendar,
  Tag,
  Key,
  Unlock,
  Plus,
  X,
  Clock,
  ArrowUpFromLine,
  ChevronRight,
  Eye,
  Info,
  Undo
} from 'lucide-react';

interface RightPanelProps {
  selectedFile: FileItem | null;
  selectedFolder: Folder | null;
  folders: Folder[];
  onUpdateFile: (file: FileItem) => void;
  onUpdateFolder: (folder: Folder) => void;
  onRestoreVersion: (file: FileItem, versionIndex: number) => void;
}

export default function RightPanel({
  selectedFile,
  selectedFolder,
  folders,
  onUpdateFile,
  onUpdateFolder,
  onRestoreVersion
}: RightPanelProps) {
  const [textPreview, setTextPreview] = useState<string>('');
  const [imageObjectURL, setImageObjectURL] = useState<string>('');
  const [newTag, setNewTag] = useState<string>('');
  const [editingDesc, setEditingDesc] = useState<string>('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [folderPasswordInput, setFolderPasswordInput] = useState('');
  const [showFolderPasswordReveal, setShowFolderPasswordReveal] = useState(false);

  // Load preview data dynamically
  useEffect(() => {
    // Clear previous object URLs to prevent memory leak
    if (imageObjectURL) {
      URL.revokeObjectURL(imageObjectURL);
      setImageObjectURL('');
    }
    setTextPreview('');

    if (selectedFile) {
      setEditingDesc(selectedFile.description || '');
      
      const fileType = selectedFile.type || '';
      const content = selectedFile.content;

      if (fileType.startsWith('image/') || fileType.startsWith('image/svg+xml')) {
        try {
          const url = URL.createObjectURL(content);
          setImageObjectURL(url);
        } catch (e) {
          console.error('Failed to create ObjectURL', e);
        }
      } else if (fileType.startsWith('text/') || fileType.includes('json') || selectedFile.name.endsWith('.txt') || selectedFile.name.endsWith('.md')) {
        const reader = new FileReader();
        reader.onload = () => {
          setTextPreview(String(reader.result || '').substring(0, 1000));
        };
        reader.readAsText(content);
      }
    } else if (selectedFolder) {
      setEditingDesc('');
    }
  }, [selectedFile, selectedFolder]);

  // Clean up Object URL on unmount
  useEffect(() => {
    return () => {
      if (imageObjectURL) {
        URL.revokeObjectURL(imageObjectURL);
      }
    };
  }, [imageObjectURL]);

  // Handle Tag addition
  const handleAddTag = () => {
    if (!selectedFile || !newTag.trim()) return;
    const tag = newTag.trim();
    if (!selectedFile.tags.includes(tag)) {
      const updatedFile = { ...selectedFile, tags: [...selectedFile.tags, tag], updatedAt: Date.now() };
      onUpdateFile(updatedFile);
    }
    setNewTag('');
    setShowTagInput(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!selectedFile) return;
    const updatedFile = {
      ...selectedFile,
      tags: selectedFile.tags.filter(t => t !== tagToRemove),
      updatedAt: Date.now()
    };
    onUpdateFile(updatedFile);
  };

  // Description blur save
  const handleBlurDescription = () => {
    if (selectedFile && editingDesc !== selectedFile.description) {
      const updatedFile = { ...selectedFile, description: editingDesc, updatedAt: Date.now() };
      onUpdateFile(updatedFile);
    }
  };

  // Folder security lock toggle
  const handleToggleFolderLock = () => {
    if (!selectedFolder) return;
    
    if (selectedFolder.isLocked) {
      // Unlock: clear locked and password
      const updatedFolder = {
        ...selectedFolder,
        isLocked: false,
        password: '',
        updatedAt: Date.now()
      };
      onUpdateFolder(updatedFolder);
      setFolderPasswordInput('');
    } else {
      // Open configure lock
      if (!folderPasswordInput.trim()) {
        alert('Please enter a folder lock passcode.');
        return;
      }
      const updatedFolder = {
        ...selectedFolder,
        isLocked: true,
        password: folderPasswordInput.trim(),
        updatedAt: Date.now()
      };
      onUpdateFolder(updatedFolder);
    }
  };

  const getParentFolderName = (parentId: string | null) => {
    if (!parentId) return 'Root / Home';
    return folders.find(f => f.id === parentId)?.name || 'Unknown Directory';
  };

  return (
    <div className="width: 280px shrink-0 bg-[#f8fafc] border-l border-slate-200 flex flex-col h-full overflow-y-auto" id="properties-panel">
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-150 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Properties & Preview</h3>
        <span className="text-[10px] bg-slate-100 text-slate-500 border border-slate-200 px-2 py-0.5 rounded-full font-semibold">
          {selectedFile ? 'File Detail' : 'Folder Detail'}
        </span>
      </div>

      {selectedFile ? (
        <div className="p-4 space-y-6">
          {/* File Icon Block */}
          <div className="bg-white rounded-lg border border-slate-200 p-5 flex flex-col items-center text-center shadow-xs">
            <div className="p-3 bg-white rounded-lg shadow-2xs border border-gray-100 mb-3 text-blue-600">
              {(() => {
                const ext = selectedFile.name.split('.').pop()?.toLowerCase();
                if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext || '')) return <ImageIcon className="h-6 w-6 text-emerald-500" />;
                if (['mp4', 'avi', 'mov'].includes(ext || '')) return <Film className="h-6 w-6 text-amber-500" />;
                if (['mp3', 'wav', 'ogg'].includes(ext || '')) return <Music className="h-6 w-6 text-indigo-500" />;
                if (['zip', 'rar', '7z'].includes(ext || '')) return <Archive className="h-6 w-6 text-purple-600" />;
                return <FileText className="h-6 w-6 text-blue-500" />;
              })()}
            </div>
            <h4 className="font-semibold text-sm text-gray-800 break-all px-2">{selectedFile.name}</h4>
            <p className="text-[11px] font-mono text-gray-500 mt-1">{formatBytes(selectedFile.size)} • {selectedFile.type || 'Custom Format'}</p>
          </div>

          {/* Real Preview Section */}
          <div className="space-y-2">
            <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> Live Preview
            </h5>
            
            {imageObjectURL ? (
              <div className="aspect-ratio: 4/3 w-full bg-white border border-slate-200 rounded-lg flex items-center justify-center p-2 max-h-48 overflow-hidden shadow-xs">
                <img
                  src={imageObjectURL}
                  alt={selectedFile.name}
                  referrerPolicy="no-referrer"
                  className="max-h-40 max-w-full object-contain rounded-sm"
                />
              </div>
            ) : textPreview ? (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-2.5 max-h-40 overflow-y-auto">
                <pre className="text-[10px] font-mono text-gray-700 whitespace-pre-wrap font-medium leading-relaxed">
                  {textPreview}
                </pre>
              </div>
            ) : selectedFile.type.startsWith('audio/') ? (
              <div className="rounded-lg border border-gray-150 bg-indigo-50/50 p-3 text-center space-y-2">
                <p className="text-[10px] font-semibold text-indigo-700">Device Synthesizer Channel</p>
                <div className="flex justify-center gap-1.5">
                  <div className="w-1 h-3 bg-indigo-500 rounded-full animate-pulse" />
                  <div className="w-1 h-5 bg-indigo-600 rounded-full animate-pulse" />
                  <div className="w-1 h-2 bg-indigo-400 rounded-full animate-pulse" />
                </div>
                <p className="text-[10px] text-indigo-500">Seeded audio media player loaded</p>
              </div>
            ) : (
                <div className="rounded-lg border border-dashed border-gray-200 p-4 text-center text-xs text-gray-400 select-none font-medium">
                  Preview unavailable for binary formats
                </div>
            )}
          </div>

          {/* Description Block */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Description & Metadata Notes</label>
            <textarea
              className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:outline-hidden focus:ring-2 focus:ring-blue-100 bg-gray-50/20 text-gray-700 font-medium leading-relaxed"
              rows={3}
              placeholder="Add user documentation, note coordinates, or description tags for search optimization..."
              value={editingDesc}
              onChange={(e) => setEditingDesc(e.target.value)}
              onBlur={handleBlurDescription}
            />
          </div>

          {/* Tags block */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
              <span>Tags / Labels</span>
              <button
                onClick={() => setShowTagInput(!showTagInput)}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-0.5 font-bold cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </label>

            {showTagInput && (
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="New tag label..."
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                  className="flex-1 text-xs px-2.5 py-1 border border-gray-200 rounded-md focus:outline-hidden text-gray-700"
                />
                <button
                  onClick={handleAddTag}
                  className="bg-blue-600 text-white rounded-md px-2.5 text-xs font-semibold cursor-pointer"
                >
                  Save
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-1.5">
              {selectedFile.tags.length === 0 ? (
                <span className="text-[11px] text-gray-400 font-medium">No custom labels applied</span>
              ) : (
                selectedFile.tags.map(t => (
                  <span
                    key={t}
                    className="flex items-center gap-1 text-[10px] font-semibold bg-[#dcfce7] border border-[#bbf7d0] text-[#166534] rounded-md pl-2 pr-1 py-0.5 group"
                  >
                    <span>{t}</span>
                    <button
                      onClick={() => handleRemoveTag(t)}
                      className="text-gray-400 hover:text-red-500 rounded font-bold cursor-pointer"
                    >
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Metadata Block */}
          <div className="space-y-2 border-t border-gray-100 pt-4">
            <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">File Metadata</h5>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-400">Located Folder</span>
                <span className="text-gray-700 font-medium truncate max-w-[120px]" title={getParentFolderName(selectedFile.parentId)}>
                  {getParentFolderName(selectedFile.parentId)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Modified</span>
                <span className="text-gray-700 font-mono text-[11px]">{new Date(selectedFile.updatedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-gray-400 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Created</span>
                <span className="text-gray-700 font-mono text-[11px]">{new Date(selectedFile.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Version History Section */}
          <div className="space-y-3.5 border-t border-gray-100 pt-4" id="version-history">
            <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Active Version History
            </h5>
            
            {/* Version List */}
            <div className="space-y-2">
              {/* Current Version */}
              <div className="flex items-center justify-between text-xs bg-blue-50/50 border border-blue-100/50 rounded-lg p-2.5">
                <div>
                  <p className="font-semibold text-blue-900">Current active copy</p>
                  <p className="text-[10px] text-blue-500 mt-0.5">{new Date(selectedFile.updatedAt).toLocaleTimeString()}</p>
                </div>
                <span className="text-[10px] bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded-sm">V{selectedFile.versions.length + 1}</span>
              </div>

              {/* Old Versions list */}
              {selectedFile.versions.length === 0 ? (
                <p className="text-[11px] text-gray-400 italic text-center py-1 font-medium">Restore versions stack empty</p>
              ) : (
                selectedFile.versions.map((ver, idx) => (
                  <div key={ver.id} className="flex items-center justify-between text-xs bg-gray-50 border border-gray-150 rounded-lg p-2.5 hover:bg-gray-100/80 transition-colors">
                    <div>
                      <p className="font-medium text-gray-700 truncate max-w-[120px]" title={ver.name}>{ver.name}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {new Date(ver.updatedAt).toLocaleDateString()} {new Date(ver.updatedAt).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-gray-200 text-gray-600 font-bold px-1.5 py-0.5 rounded-sm">V{idx + 1}</span>
                      <button
                        onClick={() => onRestoreVersion(selectedFile, idx)}
                        title="Revert current and swap version"
                        className="p-1 text-blue-600 hover:bg-blue-100/65 rounded cursor-pointer"
                      >
                        <Undo className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : selectedFolder ? (
        <div className="p-4 space-y-6">
          {/* Folder Icon Block */}
          <div className="bg-gray-50 rounded-xl border border-gray-200/80 p-5 flex flex-col items-center text-center">
            <div className="p-3 bg-white rounded-lg shadow-2xs border border-gray-100 mb-3">
              <Plus className="h-7 w-7" style={{ color: selectedFolder.color || '#3b82f6' }} />
            </div>
            <h4 className="font-semibold text-sm text-gray-800">{selectedFolder.name}</h4>
            <p className="text-[11px] text-gray-500 mt-1">
              Active directory index
            </p>
          </div>

          {/* Tag Customization Color picker */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Folder Style Color Accent</label>
            <div className="flex gap-2">
              {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'].map(c => (
                <button
                  key={c}
                  onClick={() => onUpdateFolder({ ...selectedFolder, color: c, updatedAt: Date.now() })}
                  className={`w-6 h-6 rounded-full border cursor-pointer transform hover:scale-110 transition-transform ${
                    selectedFolder.color === c ? 'ring-2 ring-offset-2 ring-blue-500 border-white' : 'border-gray-200'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Security & Access Lock */}
          <div className="space-y-3.5 border-t border-gray-100 pt-4" id="folder-security-panel">
            <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
              <Key className="h-3.5 w-3.5" /> Folder Privacy Lock
            </h5>
            
            <div className="bg-gray-50 border border-gray-150 rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600 font-semibold">Security Status</span>
                {selectedFolder.isLocked ? (
                  <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-100 flex items-center gap-1 leading-none">
                    <Key className="h-2.5 w-2.5" /> Password Locked
                  </span>
                ) : (
                  <span className="text-[10px] font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1 leading-none">
                    <Unlock className="h-2.5 w-2.5" /> Privacy Free
                  </span>
                )}
              </div>

              {!selectedFolder.isLocked ? (
                <div className="space-y-2">
                  <p className="text-[10px] text-gray-400 leading-relaxed">Protect this directory with a local access passcode. Nested files will remain masked from view until verified.</p>
                  <div className="flex gap-1.5">
                    <input
                      type={showFolderPasswordReveal ? 'text' : 'password'}
                      placeholder="Passcode..."
                      value={folderPasswordInput}
                      onChange={(e) => setFolderPasswordInput(e.target.value)}
                      className="flex-1 text-xs px-2.5 py-1 border border-gray-200 rounded-md focus:outline-hidden text-gray-700"
                    />
                    <button
                      onClick={() => setShowFolderPasswordReveal(!showFolderPasswordReveal)}
                      type="button"
                      className="px-1.5 text-xs text-gray-400 hover:text-gray-600 font-semibold cursor-pointer"
                    >
                      {showFolderPasswordReveal ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={handleToggleFolderLock}
                      className="bg-blue-600 hover:bg-blue-700 text-white rounded-md px-2.5 text-xs font-semibold cursor-pointer"
                    >
                      Lock
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <div className="text-[10px] text-amber-600/90 bg-amber-50/50 p-2 border border-amber-100/50 rounded font-medium">
                    This folder requires authorization passcode for item listings.
                  </div>
                  <button
                    onClick={handleToggleFolderLock}
                    className="w-full bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Unlock className="h-3.5 w-3.5" /> Remove Password Lock
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Folder Details metadata */}
          <div className="space-y-2 border-t border-gray-100 pt-4">
            <h5 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-semibold">Folder Statistics</h5>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Parent Folder</span>
                <span className="text-gray-700 font-medium truncate max-w-[150px]" title={getParentFolderName(selectedFolder.parentId)}>
                  {getParentFolderName(selectedFolder.parentId)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Last Modified</span>
                <span className="text-gray-700 font-mono text-[11px]">{new Date(selectedFolder.updatedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Created Date</span>
                <span className="text-gray-700 font-mono text-[11px]">{new Date(selectedFolder.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

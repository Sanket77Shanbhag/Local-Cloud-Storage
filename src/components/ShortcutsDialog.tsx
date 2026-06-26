import React from 'react';
import { KeyboardShortcut } from '../types';
import { Keyboard, X } from 'lucide-react';

interface ShortcutsDialogProps {
  onClose: () => void;
}

export default function ShortcutsDialog({ onClose }: ShortcutsDialogProps) {
  const list: KeyboardShortcut[] = [
    { key: 'K', description: 'Show this interactive shortcuts panel helper' },
    { key: 'Ctrl + F', description: 'Focus and trigger general search bar input' },
    { key: 'Ctrl + N', description: 'Create a new folder in the current directory' },
    { key: 'Ctrl + C', description: 'Copy highlighted file/folder items to clipboard' },
    { key: 'Ctrl + X', description: 'Cut and select file/folder items for moving' },
    { key: 'Ctrl + V', description: 'Paste copied or cut objects into current folder' },
    { key: 'Delete or Backspace', description: 'Move highlighted selection to Recycle Bin' },
    { key: 'Escape', description: 'Deselect all files and clean focus highlights' },
    { key: 'F', description: 'Quick-toggle star favorite status for highlighted item' },
  ];

  return (
    <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50" style={{ background: 'rgba(15,23,42,0.15)', backdropFilter: 'blur(2px)' }} id="shortcuts-modal">
      <div className="bg-white rounded-xl border border-gray-150 p-6 w-110 shadow-lg space-y-4 animate-scaleUp">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5 text-blue-600 animate-pulse" />
            <h4 className="font-bold text-gray-900 text-sm">Keyboard Shortcuts Guide</h4>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 rounded-full p-1 hover:bg-gray-100 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">Boost your productivity using native file system shortcuts on your keyboard. Most actions will sync instantly to local storage.</p>

        <div className="border border-gray-100 rounded-lg overflow-hidden divide-y divide-gray-100">
          {list.map(s => (
            <div key={s.key} className="flex justify-between items-center px-4 py-2 bg-gray-50/50 hover:bg-gray-50">
              <span className="text-xs text-gray-600 font-semibold">{s.description}</span>
              <kbd className="px-2 py-0.5 bg-white border border-gray-200 text-gray-500 rounded font-mono text-[10px] font-bold shadow-2xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-1.5 rounded-lg cursor-pointer"
          >
            Acknowledge
          </button>
        </div>
      </div>
    </div>
  );
}

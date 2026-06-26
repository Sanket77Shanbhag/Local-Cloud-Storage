import { Folder, FileItem } from '../types';

const DB_NAME = 'LocalFileExplorerDB';
const DB_VERSION = 2; // Incremented for clean seed
const FOLDERS_STORE = 'folders';
const FILES_STORE = 'files';

let dbInstance: IDBDatabase | null = null;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('IndexedDB error:', event);
      reject(new Error('Failed to open local storage database.'));
    };

    request.onsuccess = (event) => {
      dbInstance = (event.target as IDBOpenDBRequest).result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
        db.createObjectStore(FOLDERS_STORE, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        db.createObjectStore(FILES_STORE, { keyPath: 'id' });
      }
    };
  });
}

export async function getAllFolders(): Promise<Folder[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FOLDERS_STORE, 'readonly');
    const store = transaction.objectStore(FOLDERS_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error('Failed to fetch folders.'));
    };
  });
}

export async function saveFolder(folder: Folder): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FOLDERS_STORE, 'readwrite');
    const store = transaction.objectStore(FOLDERS_STORE);
    const request = store.put(folder);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to save folder.'));
    };
  });
}

export async function saveFoldersBulk(folders: Folder[]): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FOLDERS_STORE, 'readwrite');
    const store = transaction.objectStore(FOLDERS_STORE);
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('Bulk save folders failed'));

    for (const folder of folders) {
      store.put(folder);
    }
  });
}

export async function deleteFolder(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FOLDERS_STORE, 'readwrite');
    const store = transaction.objectStore(FOLDERS_STORE);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to delete folder.'));
    };
  });
}

export async function getAllFiles(): Promise<FileItem[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILES_STORE, 'readonly');
    const store = transaction.objectStore(FILES_STORE);
    const request = store.getAll();

    request.onsuccess = () => {
      resolve(request.result || []);
    };

    request.onerror = () => {
      reject(new Error('Failed to fetch files.'));
    };
  });
}

export async function saveFile(file: FileItem): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILES_STORE, 'readwrite');
    const store = transaction.objectStore(FILES_STORE);
    const request = store.put(file);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to save file.'));
    };
  });
}

export async function saveFilesBulk(files: FileItem[]): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILES_STORE, 'readwrite');
    const store = transaction.objectStore(FILES_STORE);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('Bulk save files failed'));

    for (const f of files) {
      store.put(f);
    }
  });
}

export async function deleteFile(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILES_STORE, 'readwrite');
    const store = transaction.objectStore(FILES_STORE);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to delete file.'));
    };
  });
}

// Seeds the DB with an beautiful initial skeleton if empty
export async function seedInitialDataIfEmpty(): Promise<{ folders: Folder[], files: FileItem[] }> {
  const currentFolders = await getAllFolders();
  const currentFiles = await getAllFiles();

  if (currentFolders.length > 0 || currentFiles.length > 0) {
    return { folders: currentFolders, files: currentFiles };
  }

  // Create seed structure
  const now = Date.now();
  
  const rootFolders: Folder[] = [
    {
      id: 'f-projects',
      name: 'Projects',
      parentId: null,
      createdAt: now - 1000 * 60 * 60 * 24 * 5, // 5 days ago
      updatedAt: now - 1000 * 60 * 60 * 24 * 5,
      isLocked: false,
      isFavorite: true,
      isDeleted: false,
      deletedAt: null,
      color: '#3b82f6', // blue
    },
    {
      id: 'f-personal',
      name: 'Personal',
      parentId: null,
      createdAt: now - 1000 * 60 * 60 * 24 * 3,
      updatedAt: now - 1000 * 60 * 60 * 24 * 3,
      isLocked: false,
      isFavorite: false,
      isDeleted: false,
      deletedAt: null,
      color: '#10b981', // green
    },
    {
      id: 'f-training',
      name: 'Training',
      parentId: 'f-projects',
      createdAt: now - 1000 * 60 * 60 * 24 * 4,
      updatedAt: now - 1000 * 60 * 60 * 24 * 4,
      isLocked: false,
      isFavorite: false,
      isDeleted: false,
      deletedAt: null,
    },
    {
      id: 'f-reports',
      name: 'Reports',
      parentId: 'f-projects',
      createdAt: now - 1000 * 60 * 60 * 24 * 2,
      updatedAt: now - 1000 * 60 * 60 * 24 * 2,
      isLocked: false,
      isFavorite: false,
      isDeleted: false,
      deletedAt: null,
    },
    {
      id: 'f-images',
      name: 'Images',
      parentId: 'f-training',
      createdAt: now - 1000 * 60 * 60 * 24 * 4,
      updatedAt: now - 1000 * 60 * 60 * 24 * 4,
      isLocked: false,
      isFavorite: true,
      isDeleted: false,
      deletedAt: null,
    },
    {
      id: 'f-documents',
      name: 'Documents',
      parentId: 'f-training',
      createdAt: now - 1000 * 60 * 60 * 24 * 4,
      updatedAt: now - 1000 * 60 * 60 * 24 * 4,
      isLocked: false,
      isFavorite: false,
      isDeleted: false,
      deletedAt: null,
    },
    {
      id: 'f-photos',
      name: 'Photos',
      parentId: 'f-personal',
      createdAt: now - 1000 * 60 * 60 * 24 * 3,
      updatedAt: now - 1000 * 60 * 60 * 24 * 3,
      isLocked: false,
      isFavorite: false,
      isDeleted: false,
      deletedAt: null,
    },
    {
      id: 'f-certificates',
      name: 'Certificates',
      parentId: 'f-personal',
      createdAt: now - 1000 * 60 * 60 * 12, // 12 hours ago
      updatedAt: now - 1000 * 60 * 60 * 12,
      isLocked: true, // Let's seed a password-protected folder
      password: '123', // Clean, simple password
      isFavorite: false,
      isDeleted: false,
      deletedAt: null,
      color: '#ef4444', // red
    },
    {
      id: 'f-archive',
      name: 'Old Deliverables',
      parentId: null,
      createdAt: now - 1000 * 60 * 60 * 24 * 10,
      updatedAt: now - 1000 * 60 * 60 * 24 * 10,
      isLocked: false,
      isFavorite: false,
      isDeleted: true, // Placed in Recycle Bin
      deletedAt: now - 1000 * 60 * 60 * 2, // deleted 2 hours ago
    }
  ];

  // Helper to create simple text Blobs
  const makeTextBlob = (text: string) => new Blob([text], { type: 'text/plain' });
  
  // Create a styled dummy PNG base64 and turn it into a Blob
  // Single pixel transparent PNG as fallback or just standard SVG/binary blobs
  const textBlob = makeTextBlob("Local File Storage Application System Outline\n\nThis explorer functions entirely locally.\nFeatures:\n- Unlimited Folder Nesting\n- Recycle Bin Recovery\n- Advanced Filters\n- Tagging and Locking\n- Keyboard Shortcuts");
  const q2ReportBlob = makeTextBlob("QUARTERLY REPORT - Q2 2026\n\nTotal Uploads: 1,420 files\nStorage utilization: 64%\nMost active folder: Projects/Training\nDatabase index efficiency: 100%");
  
  // Let's seed a fake SVG blob for an image
  const svgLogoContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
    <rect width="100" height="100" fill="#eff6ff" rx="16"/>
    <path d="M30 45 L50 30 L70 45 L70 70 L30 70 Z" fill="#3b82f6" opacity="0.8"/>
    <circle cx="50" cy="50" r="10" fill="#ffffff" opacity="0.9"/>
  </svg>`;
  const logoImageBlob = new Blob([svgLogoContent], { type: 'image/svg+xml' });

  // Let's seed an audio tone (mock MP3/WAV)
  const soundBlob = new Blob([new Uint8Array([0, 1, 2, 3])], { type: 'audio/mp3' });

  const rootFiles: FileItem[] = [
    {
      id: 'file-welcome',
      name: 'welcome_guide.txt',
      parentId: null,
      size: textBlob.size,
      type: 'text/plain',
      content: textBlob,
      createdAt: now - 1000 * 60 * 60 * 24,
      updatedAt: now - 1000 * 60 * 60 * 24,
      isFavorite: true,
      isDeleted: false,
      deletedAt: null,
      tags: ['Guide', 'Important'],
      description: 'System quickstart guide and feature overview.',
      versions: [],
    },
    {
      id: 'file-logo',
      name: 'enterprise_logo.svg',
      parentId: 'f-images',
      size: logoImageBlob.size,
      type: 'image/svg+xml',
      content: logoImageBlob,
      createdAt: now - 1000 * 60 * 60 * 24 * 2,
      updatedAt: now - 1000 * 60 * 60 * 24 * 2,
      isFavorite: false,
      isDeleted: false,
      deletedAt: null,
      tags: ['Assets', 'Design'],
      description: 'Corporate logo branding asset for Projects.',
      versions: [
        {
          id: 'v-logo-old',
          name: 'enterprise_logo_v1.svg',
          size: logoImageBlob.size - 20,
          type: 'image/svg+xml',
          content: logoImageBlob,
          updatedAt: now - 1000 * 60 * 60 * 24 * 3,
        }
      ],
    },
    {
      id: 'file-report',
      name: 'q2_status_report.docx',
      parentId: 'f-documents',
      size: q2ReportBlob.size,
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      content: q2ReportBlob,
      createdAt: now - 1000 * 60 * 60 * 5, // 5 hours ago
      updatedAt: now - 1000 * 60 * 60 * 5,
      isFavorite: false,
      isDeleted: false,
      deletedAt: null,
      tags: ['Finance', 'Report'],
      description: 'Status update detailing project completions and budget allocations.',
      versions: [],
    },
    {
      id: 'file-audio',
      name: 'welcome_bell.mp3',
      parentId: null,
      size: 40960,
      type: 'audio/mp3',
      content: soundBlob,
      createdAt: now - 1000 * 60 * 60 * 24 * 3,
      updatedAt: now - 1000 * 60 * 60 * 24 * 3,
      isFavorite: false,
      isDeleted: false,
      deletedAt: null,
      tags: ['Media', 'System'],
      description: 'Synthesized notification/welcome sound.',
      versions: [],
    },
    {
      id: 'file-deleted',
      name: 'draft_architecture.txt',
      parentId: 'f-archive',
      size: 450,
      type: 'text/plain',
      content: makeTextBlob('Temporary list of discarded database schemas.'),
      createdAt: now - 1000 * 60 * 60 * 24 * 8,
      updatedAt: now - 1000 * 60 * 60 * 24 * 8,
      isFavorite: false,
      isDeleted: true,
      deletedAt: now - 1000 * 60 * 60 * 2,
      tags: ['Draft'],
      versions: [],
    }
  ];

  // Store in IDB
  for (const folder of rootFolders) {
    await saveFolder(folder);
  }
  for (const file of rootFiles) {
    await saveFile(file);
  }

  return { folders: rootFolders, files: rootFiles };
}

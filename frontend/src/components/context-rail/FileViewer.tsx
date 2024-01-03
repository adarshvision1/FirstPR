'use client';

import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock file content for demo
const MOCK_FILE_CONTENT = `import React from 'react';

export function Button({ children }) {
  return (
    <button className="px-4 py-2 bg-blue-500 text-white rounded">
      {children}
    </button>
  );
}
`;

interface FileViewerProps {
    filePath: string;
    onClose: () => void;
}

export function FileViewer({ filePath, onClose }: FileViewerProps) {
    return (
        <div className="flex flex-col h-full bg-slate-900 text-slate-300">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 bg-slate-900">
                <span className="text-sm font-mono text-slate-100 truncate">{filePath}</span>
                <button onClick={onClose} className="text-slate-400 hover:text-white">
                    <X className="w-4 h-4" />
                </button>
            </div>
            <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                <pre className="text-xs font-mono leading-relaxed">
                    <code>{MOCK_FILE_CONTENT}</code>
                </pre>
            </div>
        </div>
    );
}

'use client';

import { X, GitPullRequest, CheckCircle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { StreamingText } from '../chat/StreamingText';

interface PRPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
}

const MOCK_DIFF = `diff --git a/src/App.tsx b/src/App.tsx
index 4a12c3..8b45d2 100644
--- a/src/App.tsx
+++ b/src/App.tsx
@@ -12,7 +12,7 @@ function App() {
-  const [count, setCount] = useState(0)
+  const [count, setCount] = useState<number>(0)
 
   return (
     <div className="App">
-      <h1>Vite + React</h1>
+      <h1 className="text-3xl font-bold">Vite + React + Tailwind</h1>
`;

export function PRPreviewModal({ isOpen, onClose, title = "Fix responsive layout" }: PRPreviewModalProps) {
    const [isCreating, setIsCreating] = useState(false);
    const [prUrl, setPrUrl] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleCreatePR = async () => {
        setIsCreating(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        setPrUrl("https://github.com/owner/repo/pull/123");
        setIsCreating(false);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                            <GitPullRequest className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-800">Preview Pull Request</h2>
                            <p className="text-sm text-slate-500">Creating draft PR for <span className="font-mono text-slate-700">{title}</span></p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-slate-50">

                    {/* PR Description */}
                    <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 shadow-sm">
                        <h3 className="text-sm font-medium text-slate-700 mb-2">Description</h3>
                        <p className="text-sm text-slate-600 leading-relaxed">
                            This PR fixes the layout issues on mobile devices by adding responsive utility classes to the main container.
                            Updated the heading typography to match the design system.
                        </p>
                    </div>

                    {/* Diff Viewer */}
                    <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-sm">
                        <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 flex justify-between items-center">
                            <span className="text-xs font-mono text-slate-400">src/App.tsx</span>
                            <span className="text-xs text-slate-500">2 changes</span>
                        </div>
                        <div className="p-4 overflow-x-auto">
                            <pre className="text-sm font-mono text-slate-300">
                                <StreamingText content={MOCK_DIFF} format="markdown" />
                            </pre>
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>

                    {prUrl ? (
                        <a
                            href={prUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 text-sm font-medium bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                            <CheckCircle className="w-4 h-4" />
                            View PR #123
                        </a>
                    ) : (
                        <button
                            onClick={handleCreatePR}
                            disabled={isCreating}
                            className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isCreating ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <GitPullRequest className="w-4 h-4" />
                                    Create Draft PR
                                </>
                            )}
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}

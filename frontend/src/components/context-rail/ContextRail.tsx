'use client';

import { useState } from 'react';
import { FolderNode, Issue } from '@/lib/types';
import { FileViewer } from './FileViewer';
import { Folder, File, ChevronRight, ChevronDown, Book, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextRailProps {
    folderMap?: FolderNode;
    issues?: Issue[];
}

export function ContextRail({ folderMap, issues }: ContextRailProps) {
    const [activeTab, setActiveTab] = useState<'files' | 'issues'>('files');
    const [selectedFile, setSelectedFile] = useState<string | null>(null);

    return (
        <div className="w-80 border-l border-slate-200 bg-white flex flex-col h-full shadow-lg z-10 hidden md:flex">
            {/* Tabs */}
            <div className="flex border-b border-slate-100">
                <button
                    onClick={() => setActiveTab('files')}
                    className={cn(
                        "flex-1 py-3 text-sm font-medium transition-colors relative",
                        activeTab === 'files' ? "text-teal-600 bg-teal-50/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    )}
                >
                    Files
                    {activeTab === 'files' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />}
                </button>
                <button
                    onClick={() => setActiveTab('issues')}
                    className={cn(
                        "flex-1 py-3 text-sm font-medium transition-colors relative",
                        activeTab === 'issues' ? "text-teal-600 bg-teal-50/50" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                    )}
                >
                    Issues
                    {activeTab === 'issues' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-500" />}
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden relative">
                {selectedFile ? (
                    <FileViewer filePath={selectedFile} onClose={() => setSelectedFile(null)} />
                ) : (
                    <div className="h-full overflow-y-auto p-4 custom-scrollbar">
                        {activeTab === 'files' ? (
                            folderMap ? (
                                <FileTree node={folderMap} onSelectFile={setSelectedFile} />
                            ) : (
                                <div className="text-center mt-10 text-slate-400 text-sm">
                                    <Folder className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    No files analyzed yet.
                                </div>
                            )
                        ) : (
                            issues && issues.length > 0 ? (
                                <div className="space-y-3">
                                    {issues.map(issue => (
                                        <div key={issue.id} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-teal-300 transition-colors group cursor-pointer">
                                            <div className="flex items-start gap-2">
                                                <AlertCircle className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                                                <div>
                                                    <span className="text-sm font-medium text-slate-800 group-hover:text-teal-700 block mb-1">
                                                        {issue.title}
                                                    </span>
                                                    <div className="flex gap-2 text-xs text-slate-400">
                                                        <span>#{issue.number}</span>
                                                        {issue.labels.map(l => (
                                                            <span key={l} className="bg-slate-100 px-1.5 py-0.5 rounded">{l}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center mt-10 text-slate-400 text-sm">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    No issues loaded.
                                </div>
                            )
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function FileTree({ node, depth = 0, onSelectFile }: { node: FolderNode; depth?: number; onSelectFile: (path: string) => void }) {
    const [isOpen, setIsOpen] = useState(depth < 2); // Open top levels by default
    const isFolder = node.type === 'folder';

    const handleClick = () => {
        if (isFolder) {
            setIsOpen(!isOpen);
        } else {
            onSelectFile(node.path);
        }
    };

    return (
        <div className="text-sm text-slate-600 font-mono select-none">
            <div
                className={cn(
                    "flex items-center gap-1.5 py-1 px-2 hover:bg-slate-100 rounded cursor-pointer transition-colors",
                    !isFolder && "hover:text-teal-600"
                )}
                style={{ paddingLeft: (depth * 12) + 8 }}
                onClick={handleClick}
            >
                <span className="opacity-50 w-4 flex justify-center">
                    {isFolder && (
                        isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                    )}
                </span>
                {isFolder ? <Folder className="w-4 h-4 text-blue-400/80" /> : <File className="w-4 h-4 text-slate-400" />}
                <span className={cn(isFolder ? "font-medium text-slate-700" : "text-slate-600")}>{node.name}</span>
            </div>
            {isFolder && isOpen && node.children && (
                <div>
                    {node.children.map((child) => (
                        <FileTree key={child.path} node={child} depth={depth + 1} onSelectFile={onSelectFile} />
                    ))}
                </div>
            )}
        </div>
    );
}

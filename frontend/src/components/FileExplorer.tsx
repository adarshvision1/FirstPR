import React, { useCallback } from 'react';
import { File, Folder } from 'lucide-react';



interface FileExplorerProps {
    files: any[]; // Raw file list from GitHub API
    onSelectFile: (path: string) => void;
    selectedFile: string | null;
}

// Basic flat-to-tree for now, assuming paths are full paths

const FileItem = React.memo(({ file, depth, isSelected, onSelect }: { file: any, depth: number, isSelected: boolean, onSelect: () => void }) => {
    const isFolder = file.type === 'tree';
    const filename = file.path.split('/').pop();
    const style = { paddingLeft: `${depth * 16 + 12}px` };

    return (
        <div
            className={`flex items-center gap-2 py-1.5 cursor-pointer transition-colors ${isSelected
                ? 'bg-[#1f2428] text-[#e6edf3] font-medium border-l-2 border-[#a371f7]'
                : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#c9d1d9] border-l-2 border-transparent'
                }`}
            style={style}
            onClick={onSelect}
            role="treeitem"
            aria-selected={isSelected}
            tabIndex={0}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
        >
            {isFolder ? <Folder size={14} className="text-[#58a6ff]" aria-hidden="true" /> : <File size={14} className="text-[#8b949e]" aria-hidden="true" />}
            <span className="text-sm truncate">{filename}</span>
        </div>
    );
});

FileItem.displayName = 'FileItem';

export const FileExplorer: React.FC<FileExplorerProps> = ({ files, onSelectFile, selectedFile }) => {
    const handleFileSelect = useCallback((path: string) => {
        onSelectFile(path);
    }, [onSelectFile]);
    // Simple approach: Render flat list, but visually indent
    // We filter to show only top-level or expanded - but for MVP, let's just show all
    // limited to first 200 or so to avoid perf issues

    return (
        <div className="h-full overflow-y-auto bg-[#0d1117] w-64 flex-shrink-0" role="tree" aria-label="File explorer">
            <div className="p-3 border-b border-[#30363d] bg-[#0d1117] sticky top-0 font-semibold text-[#c9d1d9] text-sm flex items-center gap-2">
                <Folder size={16} className="text-[#8b949e]" aria-hidden="true" /> Files
            </div>
            <div className="py-2">
                {files.slice(0, 300).map((file) => {
                    const depth = file.path.split('/').length - 1;
                    return (
                        <FileItem
                            key={file.path}
                            file={file}
                            depth={depth}
                            isSelected={selectedFile === file.path}
                            onSelect={() => handleFileSelect(file.path)}
                        />
                    );
                })}
            </div>
        </div>
    );
};

import React, { useCallback, useState, useMemo } from 'react';
import { File, Folder, FolderOpen, ChevronRight, ChevronDown } from 'lucide-react';

const MAX_VISIBLE_FILES = 300;

interface FileExplorerProps {
    files: any[]; // Raw file list from GitHub API
    onSelectFile: (path: string) => void;
    selectedFile: string | null;
}

interface TreeNode {
    name: string;
    path: string;
    type: 'tree' | 'blob';
    children: TreeNode[];
}

function buildTree(files: any[]): TreeNode[] {
    const root: TreeNode[] = [];
    const map: Record<string, TreeNode> = {};

    // Sort: folders first, then alphabetical
    const sorted = [...files].sort((a, b) => {
        if (a.type === 'tree' && b.type !== 'tree') return -1;
        if (a.type !== 'tree' && b.type === 'tree') return 1;
        return a.path.localeCompare(b.path);
    });

    for (const file of sorted) {
        const parts = file.path.split('/');
        const node: TreeNode = {
            name: parts[parts.length - 1],
            path: file.path,
            type: file.type === 'tree' ? 'tree' : 'blob',
            children: [],
        };
        map[file.path] = node;

        if (parts.length === 1) {
            root.push(node);
        } else {
            const parentPath = parts.slice(0, -1).join('/');
            if (map[parentPath]) {
                map[parentPath].children.push(node);
            } else {
                root.push(node);
            }
        }
    }

    // Sort children of each folder: folders first, then files, alphabetically
    const sortChildren = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
            if (a.type === 'tree' && b.type !== 'tree') return -1;
            if (a.type !== 'tree' && b.type === 'tree') return 1;
            return a.name.localeCompare(b.name);
        });
        nodes.forEach(n => { if (n.children.length) sortChildren(n.children); });
    };
    sortChildren(root);

    return root;
}

const TreeItem = React.memo(({ node, depth, selectedFile, expandedFolders, onToggleFolder, onSelectFile }: {
    node: TreeNode;
    depth: number;
    selectedFile: string | null;
    expandedFolders: Set<string>;
    onToggleFolder: (path: string) => void;
    onSelectFile: (path: string) => void;
}) => {
    const isFolder = node.type === 'tree';
    const isExpanded = expandedFolders.has(node.path);
    const isSelected = selectedFile === node.path;
    const style = { paddingLeft: `${depth * 14 + 12}px` };

    const handleClick = () => {
        if (isFolder) {
            onToggleFolder(node.path);
        } else {
            onSelectFile(node.path);
        }
    };

    return (
        <>
            <div
                className={`flex items-center gap-1.5 py-1.5 cursor-pointer transition-all duration-150 ${isSelected && !isFolder
                    ? 'bg-[#a371f7]/10 text-[#e6edf3] font-medium border-l-2 border-[#a371f7]'
                    : 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#c9d1d9] border-l-2 border-transparent'
                    }`}
                style={style}
                onClick={handleClick}
                role="treeitem"
                aria-selected={isSelected && !isFolder}
                aria-expanded={isFolder ? isExpanded : undefined}
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
            >
                {isFolder && (
                    <span className="text-[#484f58] flex-shrink-0">
                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </span>
                )}
                {isFolder
                    ? (isExpanded
                        ? <FolderOpen size={14} className="text-[#58a6ff] flex-shrink-0" aria-hidden="true" />
                        : <Folder size={14} className="text-[#58a6ff] flex-shrink-0" aria-hidden="true" />)
                    : <File size={14} className="text-[#8b949e] flex-shrink-0 ml-[18px]" aria-hidden="true" />
                }
                <span className="text-sm truncate">{node.name}</span>
            </div>
            {isFolder && isExpanded && node.children.length > 0 && (
                <div className="animate-folder-expand">
                    {node.children.map(child => (
                        <TreeItem
                            key={child.path}
                            node={child}
                            depth={depth + 1}
                            selectedFile={selectedFile}
                            expandedFolders={expandedFolders}
                            onToggleFolder={onToggleFolder}
                            onSelectFile={onSelectFile}
                        />
                    ))}
                </div>
            )}
        </>
    );
});

TreeItem.displayName = 'TreeItem';

export const FileExplorer: React.FC<FileExplorerProps> = ({ files, onSelectFile, selectedFile }) => {
    const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

    const tree = useMemo(() => buildTree(files.slice(0, MAX_VISIBLE_FILES)), [files]);

    const handleToggleFolder = useCallback((path: string) => {
        setExpandedFolders(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    }, []);

    const handleFileSelect = useCallback((path: string) => {
        onSelectFile(path);
    }, [onSelectFile]);

    return (
        <div className="h-full overflow-y-auto bg-[#0d1117] w-64 flex-shrink-0" role="tree" aria-label="File explorer">
            <div className="p-3 border-b border-[#30363d] bg-[#0d1117] sticky top-0 z-10 font-semibold text-[#c9d1d9] text-sm flex items-center gap-2">
                <Folder size={16} className="text-[#8b949e]" aria-hidden="true" /> Files
            </div>
            <div className="py-1">
                {tree.map(node => (
                    <TreeItem
                        key={node.path}
                        node={node}
                        depth={0}
                        selectedFile={selectedFile}
                        expandedFolders={expandedFolders}
                        onToggleFolder={handleToggleFolder}
                        onSelectFile={handleFileSelect}
                    />
                ))}
            </div>
        </div>
    );
};

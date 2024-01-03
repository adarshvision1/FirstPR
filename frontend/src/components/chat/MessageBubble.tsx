'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { StreamMessageType, FolderNode, Issue } from '@/lib/types';
import { StreamingText } from './StreamingText';
import { Folder, File, GitMerge, FileCode, CheckCircle2, ChevronRight, AlertCircle, GitPullRequest } from 'lucide-react';

interface MessageBubbleProps {
    type: StreamMessageType;
    content?: string;
    data?: any;
    isStreaming?: boolean;
}

export function MessageBubble({ type, content, data, isStreaming }: MessageBubbleProps) {

    if (type === 'progress') {
        return (
            <div className="flex items-center gap-2 p-3 text-sm text-slate-500 animate-pulse">
                <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                <span>{data?.stage || content}</span>
            </div>
        );
    }

    if (type === 'folder_map') {
        return (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl rounded-tl-none shadow-sm max-w-2xl my-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                    <Folder className="w-4 h-4" /> Project Structure
                </h3>
                <FolderTree node={data as FolderNode} />
            </div>
        );
    }

    if (type === 'pull_requests') {
        const prs = data as any[];
        return (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl rounded-tl-none shadow-sm max-w-2xl my-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                    <GitPullRequest className="w-4 h-4" /> Recent Pull Requests
                </h3>
                <div className="space-y-2">
                    {prs.map((pr) => (
                        <a
                            key={pr.number}
                            href={pr.html_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-3 bg-white border border-slate-200 rounded-lg hover:border-teal-300 transition-colors group"
                        >
                            <div className="flex justify-between items-start gap-2">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={cn(
                                            "text-xs font-medium px-1.5 py-0.5 rounded-full capitalize",
                                            pr.state === 'open' ? "bg-green-100 text-green-700" : "bg-purple-100 text-purple-700"
                                        )}>
                                            {pr.state}
                                        </span>
                                        <span className="text-xs text-slate-400">#{pr.number}</span>
                                    </div>
                                    <h4 className="text-sm font-medium text-slate-800 truncate group-hover:text-teal-700">{pr.title}</h4>
                                    <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <img src={pr.user.avatar_url} alt={pr.user.login} className="w-4 h-4 rounded-full" />
                                            <span>{pr.user.login}</span>
                                        </div>
                                        <span>•</span>
                                        <span>{new Date(pr.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        </a>
                    ))}
                </div>
            </div>
        );
    }

    if (type === 'issues') {
        return (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl rounded-tl-none shadow-sm max-w-2xl my-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                    <GitMerge className="w-4 h-4" /> Recommended First Issues
                </h3>
                <div className="space-y-2">
                    {(data as Issue[])?.map((issue) => (
                        <div key={issue.id} className="p-3 bg-white border border-slate-200 rounded-lg hover:border-teal-300 transition-colors cursor-pointer group">
                            <div className="flex justify-between items-start">
                                <span className="font-medium text-slate-800 group-hover:text-teal-700">#{issue.number} {issue.title}</span>
                                <span className="text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded-full">{issue.labels[0]}</span>
                            </div>
                            <button className="mt-2 text-xs text-teal-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                Preview Fix →
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (type === 'social_links') {
        const links = data as { platform: string, url: string }[];
        return (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl rounded-tl-none shadow-sm max-w-2xl my-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                    🌐 Community & Socials
                </h3>
                <div className="flex flex-wrap gap-2">
                    {links.map((link, idx) => (
                        <a
                            key={idx}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:text-teal-600 hover:border-teal-300 transition-colors flex items-center gap-2"
                        >
                            {link.platform}
                        </a>
                    ))}
                </div>
            </div>
        );
    }

    if (type === 'architecture_token') {
        // Check if content is PlantUML
        const isPlantUml = content?.trim().startsWith('@startuml');

        let plantUmlUrl = null;
        if (isPlantUml && content) {
            try {
                // Dynamic import to avoid SSR issues if package assumes browser, though plantuml-encoder is pure JS
                const plantumlEncoder = require('plantuml-encoder');
                const encoded = plantumlEncoder.encode(content);
                plantUmlUrl = `http://www.plantuml.com/plantuml/img/${encoded}`;
            } catch (e) {
                console.error("PlantUML encoding failed", e);
            }
        }

        return (
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl rounded-tl-none shadow-sm max-w-2xl my-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-2">
                    <FileCode className="w-4 h-4" /> System Architecture
                </h3>
                {plantUmlUrl ? (
                    <div className="overflow-x-auto">
                        <img src={plantUmlUrl} alt="System Architecture Diagram" className="max-w-full rounded border border-slate-200" />
                        <details className="mt-2 text-xs">
                            <summary className="cursor-pointer text-slate-400 hover:text-slate-600">View Source</summary>
                            <pre className="mt-2 bg-slate-900 text-slate-50 p-3 rounded overflow-x-auto">
                                <code>{content}</code>
                            </pre>
                        </details>
                    </div>
                ) : (
                    <pre className="text-xs bg-slate-900 text-slate-50 p-3 rounded overflow-x-auto">
                        <code>{content}</code>
                    </pre>
                )}
            </div>
        );
    }

    return (
        <div className={cn(
            "p-4 rounded-xl rounded-tl-none shadow-sm max-w-2xl my-2",
            "bg-white border border-slate-100 text-slate-800"
        )}>
            {type === 'summary' && (
                <div className="mb-2 flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-teal-100 text-teal-700 text-[10px] font-bold uppercase tracking-wide">
                        Analysis
                    </span>
                </div>
            )}
            <StreamingText content={content || ''} isStreaming={isStreaming} />
        </div>
    );
}

function FolderTree({ node, depth = 0 }: { node: FolderNode; depth?: number }) {
    const isFolder = node.type === 'folder';

    return (
        <div className="text-sm text-slate-600 font-mono" style={{ paddingLeft: depth * 12 }}>
            <div className="flex items-center gap-1.5 py-1 hover:bg-slate-100 rounded px-1 -ml-1">
                {isFolder ? <Folder className="w-3.5 h-3.5 text-blue-400" /> : <File className="w-3.5 h-3.5 text-slate-400" />}
                <span className={cn(isFolder && "font-medium text-slate-700")}>{node.name}</span>
            </div>
            {node.children?.map((child) => (
                <FolderTree key={child.path} node={child} depth={depth + 1} />
            ))}
        </div>
    );
}

import React, { useEffect, useState, useCallback } from 'react';
import { getFileContent, explainFile } from '../api/client';
import { Loader2, Bot, ArrowLeft, AlertCircle, Copy, Check } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import DOMPurify from 'dompurify';
import ReactMarkdown from 'react-markdown';

interface FileViewerProps {
    repo: string;
    path: string;
    onBack?: () => void;
}

const getLanguageFromPath = (path: string): string => {
    const ext = path.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'js': return 'javascript';
        case 'jsx': return 'jsx';
        case 'ts': return 'typescript';
        case 'tsx': return 'tsx';
        case 'py': return 'python';
        case 'css': return 'css';
        case 'html': return 'html';
        case 'json': return 'json';
        case 'md': return 'markdown';
        case 'yml':
        case 'yaml': return 'yaml';
        case 'sh':
        case 'bash': return 'bash';
        case 'go': return 'go';
        case 'rs': return 'rust';
        case 'java': return 'java';
        case 'cpp': return 'cpp';
        case 'c': return 'c';
        default: return 'text';
    }
};

export const FileViewer: React.FC<FileViewerProps> = ({ repo, path, onBack }) => {
    const [content, setContent] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showExplanation, setShowExplanation] = useState(false);
    const [explanationContent, setExplanationContent] = useState('');
    const [loadingExplanation, setLoadingExplanation] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchContent = async () => {
            if (!path) return;
            setLoading(true);
            setError('');
            setShowExplanation(false);
            setExplanationContent('');
            try {
                const data = await getFileContent(repo, path);
                if (data && typeof data.content === 'string') {
                    setContent(data.content);
                } else {
                    setContent('Binary or large file content not displayed.');
                }
            } catch {
                setError('Failed to load file content.');
            } finally {
                setLoading(false);
            }
        };
        fetchContent();
    }, [repo, path]);

    const handleCopy = useCallback(() => {
        navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, [content]);

    const handleExplain = useCallback(async () => {
        if (!showExplanation && !explanationContent) {
            setLoadingExplanation(true);
            setShowExplanation(true);
            try {
                const res = await explainFile(repo, path, content);
                setExplanationContent(res.explanation || 'No explanation available.');
            } catch (e: any) {
                console.error(e);
                const detail = e.response?.data?.detail || e.message || 'Unknown error';
                setExplanationContent(`Failed to generate explanation: ${detail}`);
            } finally {
                setLoadingExplanation(false);
            }
        } else {
            setShowExplanation(!showExplanation);
        }
    }, [showExplanation, explanationContent, repo, path, content]);

    if (!path) {
        return (
            <div className="h-full flex items-center justify-center text-[#8b949e] bg-[#0d1117]">
                Select a file to view content
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#0d1117]">
            <div className="h-12 border-b border-[#30363d] flex items-center justify-between px-4 bg-[#161b22] sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    {onBack && (
                        <button onClick={onBack} className="p-1 hover:bg-[#21262d] rounded text-[#8b949e] hover:text-[#c9d1d9] transition-colors">
                            <ArrowLeft size={16} />
                        </button>
                    )}
                    <h3 className="font-mono text-sm font-medium text-[#e6edf3]">{path}</h3>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-[#21262d] text-[#8b949e] hover:bg-[#30363d] hover:text-[#c9d1d9] transition-all duration-200"
                        title="Copy content"
                    >
                        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                        onClick={handleExplain}
                        disabled={loadingExplanation}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${showExplanation
                            ? 'bg-[#a371f7] text-white shadow-md shadow-[#a371f7]/20'
                            : 'bg-gradient-to-r from-[#a371f7] to-[#8b5cf6] text-white hover:shadow-md hover:shadow-[#a371f7]/20 hover:brightness-110'
                            } disabled:opacity-60`}
                    >
                        {loadingExplanation ? <Loader2 size={14} className="animate-spin" /> : <Bot size={14} />}
                        {showExplanation ? 'Hide AI Explanation' : 'Explain with AI'}
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-auto relative bg-[#0d1117]">
                {loading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#0d1117]/80 backdrop-blur-sm">
                        <Loader2 className="animate-spin text-[#a371f7]" />
                    </div>
                ) : error ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center h-full">
                        <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
                        <p className="text-red-400 mb-2">{error}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="text-xs text-[#8b949e] hover:text-[#e6edf3] underline"
                        >
                            Try Reloading
                        </button>
                    </div>
                ) : (
                    <div className="relative min-h-full">
                        {showExplanation && (
                            <div className="p-5 bg-[#1f2428] border-b border-[#30363d] text-[#c9d1d9] text-sm leading-relaxed shadow-inner animate-slide-down">
                                <div className="flex items-center gap-2 mb-3 font-semibold text-[#a371f7]">
                                    <Bot size={16} /> AI Explanation
                                </div>
                                {loadingExplanation ? (
                                    <div className="flex items-center gap-2 text-[#8b949e] py-4">
                                        <Loader2 size={14} className="animate-spin" /> Generating explanation...
                                    </div>
                                ) : (
                                    <div className="prose prose-sm prose-invert max-w-none text-[#c9d1d9]">
                                        <ReactMarkdown
                                            components={{
                                                code({ inline, className, children, ...props }: React.ComponentPropsWithoutRef<'code'> & { inline?: boolean }) {
                                                    const match = /language-(\w+)/.exec(className || '');
                                                    return !inline && match ? (
                                                        <SyntaxHighlighter
                                                            language={match[1]}
                                                            style={vscDarkPlus}
                                                            customStyle={{ margin: '0.5rem 0', padding: '0.75rem', background: '#0d1117', borderRadius: '0.5rem', border: '1px solid #30363d' }}
                                                            codeTagProps={{ style: { fontFamily: "'JetBrains Mono', monospace", fontSize: '0.8rem' } }}
                                                        >
                                                            {String(children).replace(/\n$/, '')}
                                                        </SyntaxHighlighter>
                                                    ) : (
                                                        <code className="bg-[#21262d] text-[#e6edf3] px-1.5 py-0.5 rounded text-sm font-mono border border-[#30363d]" {...props}>
                                                            {children}
                                                        </code>
                                                    );
                                                }
                                            }}
                                        >
                                            {DOMPurify.sanitize(explanationContent)}
                                        </ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        )}
                        <SyntaxHighlighter
                            language={getLanguageFromPath(path)}
                            style={vscDarkPlus}
                            customStyle={{ margin: 0, padding: '1rem', background: '#0d1117', minHeight: '100%' }}
                            codeTagProps={{ style: { fontFamily: "'JetBrains Mono', monospace", fontSize: '0.875rem' } }}
                            showLineNumbers={true}
                            lineNumberStyle={{ minWidth: "3em", paddingRight: "1em", color: "#484f58", textAlign: "right" }}
                        >
                            {content}
                        </SyntaxHighlighter>
                    </div>
                )}
            </div>
        </div>
    );
};

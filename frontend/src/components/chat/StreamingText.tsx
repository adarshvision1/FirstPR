'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { StreamMessageType } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

interface StreamingTextProps {
    content: string;
    isStreaming?: boolean;
    className?: string;
    format?: 'text' | 'markdown';
}

export function StreamingText({ content, isStreaming = false, className, format = 'markdown' }: StreamingTextProps) {
    const endRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (isStreaming) {
            endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [content, isStreaming]);

    return (
        <div className={cn("prose prose-sm dark:prose-invert max-w-none relative", className)}>
            {format === 'markdown' ? (
                <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                    {content}
                </ReactMarkdown>
            ) : (
                <p className="whitespace-pre-wrap">{content}</p>
            )}
            {isStreaming && (
                <span data-testid="cursor" className="inline-block w-1.5 h-4 ml-1 align-middle bg-teal-500 animate-pulse" />
            )}
            <span ref={endRef} />
        </div>
    );
}

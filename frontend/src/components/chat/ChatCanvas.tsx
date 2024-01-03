'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './MessageBubble';
import { StreamMessageType, StreamMessage } from '@/lib/types';
import { Send, Github, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatCanvasProps {
    messages: StreamMessage[];
    isStreaming: boolean;
    onAnalyze: (url: string) => void;
}

export function ChatCanvas({ messages, isStreaming, onAnalyze }: ChatCanvasProps) {
    const [inputValue, setInputValue] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    // Auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputValue.trim() || isStreaming) return;
        onAnalyze(inputValue);
        setInputValue('');
    };

    const handleSuggestion = (url: string) => {
        setInputValue(url);
        // Optional: auto-submit or just fill
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 relative">
            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50 select-none pb-20">
                        <div className="w-16 h-16 bg-slate-200 rounded-2xl flex items-center justify-center mb-6 text-slate-400">
                            <Github className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-semibold text-slate-800 mb-2">Detailed PRs. Zero Friction.</h1>
                        <p className="max-w-md text-slate-500">
                            Paste a GitHub repository URL to generate a comprehensive analysis, architecture diagram, and first PR plan.
                        </p>
                    </div>
                )}

                {messages.map((msg, i) => (
                    <MessageBubble key={i} {...msg} isStreaming={isStreaming && i === messages.length - 1} />
                ))}
                <div ref={bottomRef} />
            </div>

            <div className="p-4 bg-white border-t border-slate-100">
                <div className="max-w-3xl mx-auto">
                    <form onSubmit={handleSubmit} className="relative group">
                        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                            <Github className="w-5 h-5" />
                        </div>
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            placeholder="github.com/owner/repo"
                            className="w-full pl-10 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500 transition-all font-mono text-sm shadow-sm hover:shadow-md hover:border-slate-300"
                            autoFocus
                        />
                        <button
                            type="submit"
                            disabled={isStreaming || !inputValue}
                            className={cn(
                                "absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center rounded-lg transition-all",
                                inputValue && !isStreaming ? "bg-teal-600 text-white shadow-md hover:bg-teal-700 hover:scale-105" : "bg-slate-200 text-slate-400 cursor-not-allowed"
                            )}
                        >
                            {isStreaming ? (
                                <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                            ) : (
                                <ArrowRight className="w-5 h-5" />
                            )}
                        </button>
                    </form>
                    <div className="mt-2 flex justify-center gap-4 text-xs text-slate-400">
                        <button onClick={() => handleSuggestion('facebook/react')} className="hover:text-teal-600 transition-colors">Try <b>facebook/react</b></button>
                        <span>•</span>
                        <button onClick={() => handleSuggestion('vercel/next.js')} className="hover:text-teal-600 transition-colors">Try <b>vercel/next.js</b></button>
                    </div>
                </div>
            </div>
        </div>
    );
}

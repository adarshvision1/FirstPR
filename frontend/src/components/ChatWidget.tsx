import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Bot } from 'lucide-react';
import { chat, getCommunityHealth, getActivityStatus } from '../api/client';

interface ChatWidgetProps {
    repo: string;
    analysisResult?: any;
}

interface Message {
    role: 'user' | 'model';
    text: string;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ repo, analysisResult }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        { role: 'model', text: 'Hi! I can help you understand this repository. Ask me anything like "Is this active?" or "Where should I start?"' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Cache context
    const [context, setContext] = useState<any>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load context on open
    useEffect(() => {
        if (isOpen && !context) {
            const loadContext = async () => {
                try {
                    // Use analysis result if available, otherwise fetch fallbacks
                    if (analysisResult) {
                        // Check if we have issue analysis, if not, fetch it
                        let issueAnalysis = analysisResult.issue_analysis_and_recommendations;

                        if (!issueAnalysis) {
                            try {
                                // Fallback: fetch issues directly
                                const issuesData = await import('../api/client').then(m => m.getIssues(repo));
                                issueAnalysis = issuesData.analysis || { top_candidates: issuesData.issues?.slice(0, 5) };
                            } catch (err) {
                                console.warn("Failed to fetch fallback issues", err);
                            }
                        }

                        // Extract only necessary fields to avoid payload issues
                        const slimContext = {
                            metadata: analysisResult.metadata,
                            project_summary: analysisResult.project_summary,
                            architecture_overview: analysisResult.architecture_overview,
                            tech_stack_detected: analysisResult.tech_stack_detected,
                            top_functions: analysisResult.top_functions ? analysisResult.top_functions.slice(0, 20) : [],
                            issue_analysis_and_recommendations: issueAnalysis,
                            social_links: analysisResult.social_links,
                            development_workflow: analysisResult.development_workflow,
                            folder_structure: analysisResult.folder_structure ? analysisResult.folder_structure.slice(0, 20) : [],
                        };

                        setContext({
                            repo_name: repo,
                            analysis: slimContext
                        });
                    } else {
                        const [activity, rules] = await Promise.all([
                            getActivityStatus(repo),
                            getCommunityHealth(repo)
                        ]);
                        setContext({ repo_name: repo, activity, rules });
                    }
                } catch (e) {
                    console.error("Failed to load chat context", e);
                }
            };
            loadContext();
        }
    }, [isOpen, repo, context, analysisResult]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            const response = await chat(repo, userMsg, context || { repo_name: repo }, messages.map(m => ({ role: m.role, text: m.text })));
            setMessages(prev => [...prev, { role: 'model', text: response.answer }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'model', text: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-end">
            {isOpen && (
                <div className="mb-4 w-96 max-h-[500px] h-[400px] bg-[#161b22] rounded-2xl shadow-xl border border-[#30363d] flex flex-col overflow-hidden animate-fade-in-up">
                    <div className="bg-[#1f2428] p-4 text-[#e6edf3] flex justify-between items-center border-b border-[#30363d]">
                        <div className="flex items-center gap-2">
                            <Bot size={20} className="text-[#a371f7]" />
                            <span className="font-semibold">Repository Assistant</span>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="hover:bg-[#30363d] p-1 rounded text-[#8b949e] hover:text-[#c9d1d9] transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    <div className="flex-grow overflow-y-auto p-4 space-y-4 bg-[#0d1117]">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.role === 'user'
                                    ? 'bg-[#a371f7] text-white rounded-tr-none'
                                    : 'bg-[#21262d] border border-[#30363d] text-[#c9d1d9] rounded-tl-none shadow-sm'
                                    }`}>
                                    {msg.text}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-[#21262d] border border-[#30363d] p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-2 items-center text-[#8b949e] text-sm">
                                    <Loader2 size={14} className="animate-spin" />
                                    Thinking...
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <form onSubmit={handleSubmit} className="p-3 bg-[#161b22] border-t border-[#30363d] flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about this repo..."
                            className="flex-grow px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-xl text-sm text-[#c9d1d9] outline-none focus:ring-2 focus:ring-[#a371f7]/50 placeholder:text-[#8b949e]"
                        />
                        <button
                            type="submit"
                            disabled={isLoading || !input.trim()}
                            className="p-2 bg-[#a371f7] text-white rounded-xl hover:bg-[#9352e8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </form>
                </div>
            )}

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-4 bg-[#a371f7] text-white rounded-full shadow-lg hover:bg-[#9352e8] transition-transform hover:scale-105 border border-[#30363d]"
            >
                {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
            </button>
        </div>
    );
};

import React, { useState } from 'react';
import mermaid from 'mermaid';
import { Layers, Map, Workflow, Globe, Twitter, ExternalLink, Link as LinkIcon, Youtube, Linkedin, Facebook, Instagram, MessageCircle, Copy, Check } from 'lucide-react';
import type { AnalysisResult } from '../types';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ProjectOverviewProps {
    result: AnalysisResult;
}

import { Section } from './Section';

const CodeBlock = ({ language, value }: { language: string, value: string }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group rounded-lg overflow-hidden border border-[#30363d] my-4">
            <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
                <span className="text-xs font-mono text-[#8b949e]">{language || 'code'}</span>
                <button
                    onClick={handleCopy}
                    className="text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
                >
                    {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                </button>
            </div>
            <SyntaxHighlighter
                language={language}
                style={vscDarkPlus}
                customStyle={{ margin: 0, padding: '1rem', background: '#0d1117' }}
                codeTagProps={{ style: { fontFamily: "'JetBrains Mono', monospace" } }}
            >
                {value}
            </SyntaxHighlighter>
        </div>
    );
};

export const ProjectOverview: React.FC<ProjectOverviewProps> = ({ result }) => {

    // Mermaid diagram rendering
    React.useEffect(() => {
        if (result.architecture_diagram_mermaid) {
            mermaid.initialize({ startOnLoad: true, theme: 'dark', securityLevel: 'loose' });
            mermaid.contentLoaded();
        }
    }, [result.architecture_diagram_mermaid]);



    return (
        <div className="h-full overflow-y-auto bg-[#0d1117] p-8">
            <div className="max-w-5xl mx-auto">
                <header className="mb-8 border-b border-[#30363d] pb-8">
                    <h1 className="text-4xl font-bold text-[#e6edf3] mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#e6edf3] to-[#8b949e]">
                        {result.repo.split('/')[1]}
                    </h1>
                    <p className="text-[#8b949e] text-lg font-medium leading-relaxed max-w-3xl">{result.metadata.description}</p>
                    {result.project_summary && (
                        <div className="mt-6 p-4 bg-[#1f2428] border-l-4 border-[#a371f7] rounded-r-lg text-[#e6edf3] shadow-md">
                            <strong className="text-[#a371f7]">Summary:</strong> {result.project_summary.one_liner}
                        </div>
                    )}
                </header>

                {/* Architecture */}
                {result.architecture_overview && (
                    <Section title="Architecture Overview" icon={Layers}>
                        <div className="flex flex-wrap gap-3 mb-6">
                            {/* Metadata-based links */}
                            {result.metadata.homepage && (
                                <a
                                    href={result.metadata.homepage.startsWith('http') ? result.metadata.homepage : `https://${result.metadata.homepage}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg text-sm font-medium text-[#c9d1d9] transition-all hover:text-[#58a6ff]"
                                >
                                    <Globe size={14} className="text-[#58a6ff]" />
                                    Website
                                    <ExternalLink size={12} className="text-[#8b949e]" />
                                </a>
                            )}
                            {result.metadata.twitter_username && (
                                <a
                                    href={`https://twitter.com/${result.metadata.twitter_username}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg text-sm font-medium text-[#c9d1d9] transition-all hover:text-[#58a6ff]"
                                >
                                    <Twitter size={14} className="text-[#58a6ff]" />
                                    @{result.metadata.twitter_username}
                                    <ExternalLink size={12} className="text-[#8b949e]" />
                                </a>
                            )}

                            {/* LLM-extracted links */}
                            {result.social_links && result.social_links.map((link: { platform: string; url: string }, idx: number) => {
                                // Skip if it duplicates metadata (basic check)
                                if (link.platform.toLowerCase().includes('twitter') && result.metadata.twitter_username) return null;
                                if ((link.platform.toLowerCase().includes('website') || link.platform.toLowerCase().includes('homepage')) && result.metadata.homepage) return null;

                                let Icon = LinkIcon;
                                let colorClass = "text-[#8b949e]";

                                const p = link.platform.toLowerCase();
                                if (p.includes('discord')) { Icon = MessageCircle; colorClass = "text-[#58a6ff]"; }
                                else if (p.includes('youtube')) { Icon = Youtube; colorClass = "text-[#f85149]"; }
                                else if (p.includes('linkedin')) { Icon = Linkedin; colorClass = "text-[#1f6feb]"; }
                                else if (p.includes('facebook')) { Icon = Facebook; colorClass = "text-[#1f6feb]"; }
                                else if (p.includes('instagram')) { Icon = Instagram; colorClass = "text-[#d2a8ff]"; }
                                else if (p.includes('twitter') || p.includes('x.com')) { Icon = Twitter; colorClass = "text-[#58a6ff]"; }

                                return (
                                    <a
                                        key={idx}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[#30363d] rounded-lg text-sm font-medium text-[#c9d1d9] transition-all hover:text-[#58a6ff]"
                                    >
                                        <Icon size={14} className={colorClass} />
                                        {link.platform}
                                        <ExternalLink size={12} className="text-[#8b949e]" />
                                    </a>
                                );
                            })}
                        </div>

                        <div className="prose prose-invert max-w-none mb-8 text-[#c9d1d9]">
                            <ReactMarkdown
                                components={{
                                    code({ inline, className, children, ...props }: React.ComponentPropsWithoutRef<'code'> & { inline?: boolean }) {
                                        const match = /language-(\w+)/.exec(className || '')
                                        return !inline && match ? (
                                            <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
                                        ) : (
                                            <code className="bg-[#21262d] text-[#e6edf3] px-1.5 py-0.5 rounded text-sm font-mono border border-[#30363d]" {...props}>
                                                {children}
                                            </code>
                                        )
                                    }
                                }}
                            >
                                {result.architecture_overview.narrative}
                            </ReactMarkdown>
                        </div>

                        {result.architecture_diagram_mermaid && (
                            <div className="mb-8 p-6 bg-[#0d1117] border border-[#30363d] rounded-xl overflow-x-auto shadow-inner">
                                <h4 className="font-semibold text-[#e6edf3] mb-4">System Diagram</h4>
                                <div className="mermaid flex justify-center min-w-full">
                                    {result.architecture_diagram_mermaid}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                            {result.architecture_overview.components.map((comp: { name: string; purpose: string }, idx: number) => (
                                <div key={idx} className="p-4 bg-[#1f2428] rounded-lg border border-[#30363d] hover:border-[#a371f7] transition-all hover:shadow-md group">
                                    <div className="font-semibold text-[#a371f7] mb-1 group-hover:text-[#d2a8ff]">{comp.name}</div>
                                    <div className="text-sm text-[#8b949e] group-hover:text-[#c9d1d9]">{comp.purpose}</div>
                                </div>
                            ))}
                        </div>

                        {result.architecture_overview.tech_stack_reasoning && (
                            <div className="overflow-hidden bg-[#161b22] border border-[#30363d] rounded-xl shadow-sm">
                                <table className="min-w-full divide-y divide-[#30363d]">
                                    <thead className="bg-[#21262d]">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">Technology</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">Purpose</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">Reasoning</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-[#0d1117] divide-y divide-[#30363d]">
                                        {result.architecture_overview.tech_stack_reasoning.map((item: { technology: string; purpose: string; reasoning: string }, idx: number) => (
                                            <tr key={idx} className="hover:bg-[#161b22] transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#a371f7]">{item.technology}</td>
                                                <td className="px-6 py-4 text-sm text-[#c9d1d9]">{item.purpose}</td>
                                                <td className="px-6 py-4 text-sm text-[#8b949e] italic">{item.reasoning}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </Section>
                )}

                {/* Development Workflow */}
                {result.development_workflow && (
                    <Section title="Development Workflow" icon={Workflow}>
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold text-sm text-[#e6edf3] mb-2">Setup</h4>
                                <div className="rounded-lg overflow-x-auto border border-[#30363d]">
                                    <SyntaxHighlighter language="bash" style={vscDarkPlus} customStyle={{ margin: 0, padding: '1rem', background: '#0d1117' }}>
                                        {result.development_workflow.setup_commands.join('\n')}
                                    </SyntaxHighlighter>
                                </div>
                            </div>
                            <div>
                                <h4 className="font-semibold text-sm text-[#e6edf3] mb-2">Testing</h4>
                                <div className="rounded-lg overflow-x-auto border border-[#30363d]">
                                    <SyntaxHighlighter language="bash" style={vscDarkPlus} customStyle={{ margin: 0, padding: '1rem', background: '#0d1117' }}>
                                        {result.development_workflow.test_commands.join('\n')}
                                    </SyntaxHighlighter>
                                </div>
                            </div>
                        </div>
                    </Section>
                )}



                {/* Onboarding Roadmap */}
                {result.firstpr_onboarding_roadmap && (
                    <Section title="Onboarding Roadmap" icon={Map}>
                        <div className="space-y-8">
                            {Object.entries(result.firstpr_onboarding_roadmap).map(([day, items]: [string, string[]]) => (
                                <div key={day} className="relative pl-8 border-l border-[#30363d] ml-2">
                                    <div className="absolute -left-[9px] top-0 w-[18px] h-[18px] rounded-full bg-[#161b22] border-2 border-[#a371f7] flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-[#a371f7]"></div>
                                    </div>
                                    <h4 className="font-bold text-[#e6edf3] mb-3 capitalize text-lg">{day.replace('_', ' ')}</h4>
                                    <div className="space-y-3">
                                        {items.map((item, i) => (
                                            <div key={i} className="flex gap-3 text-[#c9d1d9] bg-[#21262d]/50 p-3 rounded-lg border border-[#30363d]">
                                                <span className="text-[#a371f7] font-bold">{(i + 1).toString().padStart(2, '0')}.</span>
                                                <p className="leading-relaxed">{item}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {/* Community Insights (New Feature) */}
                {result.discussions && result.discussions.length > 0 && (
                    <Section title="Community Insights" icon={MessageCircle}>
                        <div className="space-y-4">
                            {result.discussions.map((discussion: { html_url: string; title: string; body: string; comments: number; labels?: { name: string }[] }, idx: number) => (
                                <a
                                    key={idx}
                                    href={discussion.html_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block p-5 bg-[#161b22] rounded-xl border border-[#30363d] hover:border-[#a371f7] transition-all hover:shadow-lg group"
                                >
                                    <div className="flex justify-between items-start gap-4">
                                        <div>
                                            <h4 className="font-bold text-[#e6edf3] mb-2 line-clamp-1 group-hover:text-[#58a6ff] transition-colors">{discussion.title}</h4>
                                            <p className="text-sm text-[#8b949e] line-clamp-2">{discussion.body ? discussion.body.replace(/\*/g, '').slice(0, 150) : 'No description'}...</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-2 min-w-fit">
                                            {discussion.labels && discussion.labels.length > 0 && (
                                                <div className="flex gap-1">
                                                    {discussion.labels.map((l: { name: string }, i: number) => (
                                                        <span key={i} className="text-[10px] px-2 py-1 rounded-full bg-[#21262d] text-[#a371f7] border border-[#30363d] font-medium">
                                                            {l.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="text-xs text-[#8b949e] font-medium flex items-center gap-1 bg-[#21262d] px-2 py-1 rounded-md">
                                                <MessageCircle size={12} /> {discussion.comments} comments
                                            </div>
                                        </div>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </Section>
                )}

                <footer className="mt-16 pt-8 border-t border-[#30363d] text-center text-[#8b949e] text-sm">
                    <div className="flex items-center justify-center gap-2 mb-2 opacity-50 hover:opacity-100 transition-opacity">
                        <span>Generated by</span>
                        <span className="font-bold text-[#e6edf3]">FirstPR</span>
                        <span>•</span>
                        <span>Powered by Gemini 2.0 Flash</span>
                    </div>
                </footer>
            </div>
        </div>
    );
};

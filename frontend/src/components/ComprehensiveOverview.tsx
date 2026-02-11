import React, { useState } from 'react';
import mermaid from 'mermaid';
import {
    Camera, Compass, Layers, FolderTree, FileCode2, GitPullRequest,
    FlaskConical, BookOpen, GraduationCap, Copy, Check, Workflow,
    ArrowRight, Terminal, Tag, Lightbulb
} from 'lucide-react';
import type { ComprehensiveResult } from '../types';
import { Section } from './Section';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ComprehensiveOverviewProps {
    result: ComprehensiveResult;
    repoName: string;
}

const CodeBlock = ({ language, value }: { language: string; value: string }) => {
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

const MarkdownRenderer = ({ content }: { content: string }) => (
    <div className="prose prose-invert max-w-none text-[#c9d1d9]">
        <ReactMarkdown
            components={{
                code({ className, children, ...props }: React.ComponentPropsWithoutRef<'code'> & { inline?: boolean }) {
                    const match = /language-(\w+)/.exec(className || '');
                    const isBlock = String(children).includes('\n');
                    return isBlock && match ? (
                        <CodeBlock language={match[1]} value={String(children).replace(/\n$/, '')} />
                    ) : (
                        <code className="bg-[#21262d] text-[#e6edf3] px-1.5 py-0.5 rounded text-sm font-mono border border-[#30363d]" {...props}>
                            {children}
                        </code>
                    );
                }
            }}
        >
            {content}
        </ReactMarkdown>
    </div>
);

export const ComprehensiveOverview: React.FC<ComprehensiveOverviewProps> = ({ result, repoName }) => {
    React.useEffect(() => {
        if (result.architecture_diagram_mermaid || result.sequence_diagrams) {
            mermaid.initialize({ startOnLoad: true, theme: 'dark', securityLevel: 'loose' });
            setTimeout(() => mermaid.contentLoaded(), 300);
        }
    }, [result.architecture_diagram_mermaid, result.sequence_diagrams]);

    return (
        <div className="h-full overflow-y-auto bg-[#0d1117] p-8">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <header className="mb-8 border-b border-[#30363d] pb-8">
                    <h1 className="text-4xl font-bold text-[#e6edf3] mb-3 tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[#e6edf3] to-[#8b949e]">
                        {repoName.split('/')[1] || repoName}
                    </h1>
                    {result.project_snapshot?.one_liner && (
                        <div className="mt-4 p-4 bg-[#1f2428] border-l-4 border-[#a371f7] rounded-r-lg text-[#e6edf3] shadow-md">
                            <strong className="text-[#a371f7]">Summary:</strong> {result.project_snapshot.one_liner}
                        </div>
                    )}
                </header>

                {/* 1. Project Snapshot */}
                {result.project_snapshot && (
                    <Section title="Project Snapshot" icon={Camera}>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 bg-[#1f2428] rounded-lg border border-[#30363d]">
                                    <div className="text-xs text-[#8b949e] uppercase tracking-wider mb-1">Target Audience</div>
                                    <div className="text-[#e6edf3] font-medium">{result.project_snapshot.target_audience}</div>
                                </div>
                                <div className="p-4 bg-[#1f2428] rounded-lg border border-[#30363d]">
                                    <div className="text-xs text-[#8b949e] uppercase tracking-wider mb-1">Problem Solved</div>
                                    <div className="text-[#e6edf3] font-medium">{result.project_snapshot.problem_solved}</div>
                                </div>
                                <div className="p-4 bg-[#1f2428] rounded-lg border border-[#30363d]">
                                    <div className="text-xs text-[#8b949e] uppercase tracking-wider mb-1">Maturity</div>
                                    <div className="text-[#e6edf3] font-medium capitalize">{result.project_snapshot.maturity}</div>
                                </div>
                            </div>
                            {result.project_snapshot.key_stats && Object.keys(result.project_snapshot.key_stats).length > 0 && (
                                <div className="flex flex-wrap gap-3 mt-4">
                                    {Object.entries(result.project_snapshot.key_stats).map(([key, val]) => (
                                        <span key={key} className="px-3 py-1.5 bg-[#21262d] border border-[#30363d] rounded-full text-sm text-[#c9d1d9]">
                                            <span className="text-[#a371f7] font-semibold">{key}:</span> {String(val)}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Section>
                )}

                {/* 2. Guided Tour */}
                {result.guided_tour && (
                    <Section title="Guided Tour" icon={Compass}>
                        <div className="space-y-6">
                            <MarkdownRenderer content={result.guided_tour.overview} />
                            {result.guided_tour.user_journey && (
                                <div className="mt-4 p-4 bg-[#1f2428] rounded-lg border border-[#30363d]">
                                    <h4 className="text-sm font-semibold text-[#e6edf3] mb-2 flex items-center gap-2">
                                        <ArrowRight size={14} className="text-[#a371f7]" /> User Journey
                                    </h4>
                                    <MarkdownRenderer content={result.guided_tour.user_journey} />
                                </div>
                            )}
                            {result.guided_tour.use_cases && result.guided_tour.use_cases.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {result.guided_tour.use_cases.map((uc, idx) => (
                                        <div key={idx} className="p-3 bg-[#21262d]/50 rounded-lg border border-[#30363d] text-[#c9d1d9] flex items-start gap-2">
                                            <Lightbulb size={16} className="text-[#a371f7] mt-0.5 flex-shrink-0" />
                                            <span>{uc}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </Section>
                )}

                {/* 3. Architecture Map */}
                {result.architecture_map && (
                    <Section title="Architecture Map" icon={Layers}>
                        <MarkdownRenderer content={result.architecture_map.narrative} />

                        {result.architecture_diagram_mermaid && (
                            <div className="my-6 p-6 bg-[#0d1117] border border-[#30363d] rounded-xl overflow-x-auto shadow-inner">
                                <h4 className="font-semibold text-[#e6edf3] mb-4">System Diagram</h4>
                                <div className="mermaid flex justify-center min-w-full">
                                    {result.architecture_diagram_mermaid}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-6">
                            {result.architecture_map.components.map((comp, idx) => (
                                <div key={idx} className="p-4 bg-[#1f2428] rounded-lg border border-[#30363d] hover:border-[#a371f7] transition-all hover:shadow-md group">
                                    <div className="font-semibold text-[#a371f7] mb-1 group-hover:text-[#d2a8ff]">{comp.name}</div>
                                    <div className="text-sm text-[#8b949e] group-hover:text-[#c9d1d9]">{comp.purpose}</div>
                                    {comp.tech && <div className="text-xs text-[#58a6ff] mt-2 font-mono">{comp.tech}</div>}
                                </div>
                            ))}
                        </div>

                        {result.architecture_map.data_flow && (
                            <div className="p-4 bg-[#1f2428] rounded-lg border border-[#30363d] mt-4">
                                <h4 className="text-sm font-semibold text-[#e6edf3] mb-2">Data Flow</h4>
                                <MarkdownRenderer content={result.architecture_map.data_flow} />
                            </div>
                        )}

                        {result.architecture_map.tech_stack_reasoning && result.architecture_map.tech_stack_reasoning.length > 0 && (
                            <div className="overflow-hidden bg-[#161b22] border border-[#30363d] rounded-xl shadow-sm mt-6">
                                <table className="min-w-full divide-y divide-[#30363d]">
                                    <thead className="bg-[#21262d]">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">Technology</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">Purpose</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">Reasoning</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-[#0d1117] divide-y divide-[#30363d]">
                                        {result.architecture_map.tech_stack_reasoning.map((item, idx) => (
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

                {/* 4. Module/Package View */}
                {result.module_package_view && (
                    <Section title="Module / Package View" icon={FolderTree}>
                        {result.module_package_view.directory_structure && result.module_package_view.directory_structure.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-sm font-semibold text-[#e6edf3] mb-3">Directory Structure</h4>
                                <div className="space-y-2">
                                    {result.module_package_view.directory_structure.map((dir, idx) => (
                                        <div key={idx} className="flex gap-3 items-start p-3 bg-[#21262d]/50 rounded-lg border border-[#30363d]">
                                            <code className="text-[#58a6ff] text-sm font-mono whitespace-nowrap">{dir.path}</code>
                                            <span className="text-sm text-[#8b949e]">{dir.responsibility}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {result.module_package_view.key_modules && result.module_package_view.key_modules.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-[#e6edf3] mb-3">Key Modules</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {result.module_package_view.key_modules.map((mod, idx) => (
                                        <div key={idx} className="p-4 bg-[#1f2428] rounded-lg border border-[#30363d] hover:border-[#a371f7] transition-all">
                                            <div className="font-semibold text-[#a371f7] font-mono text-sm mb-1">{mod.module}</div>
                                            <div className="text-sm text-[#8b949e] mb-2">{mod.purpose}</div>
                                            {mod.exports && mod.exports.length > 0 && (
                                                <div className="flex flex-wrap gap-1">
                                                    {mod.exports.map((exp, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-[#21262d] text-[#58a6ff] text-xs rounded font-mono border border-[#30363d]">
                                                            {exp}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Section>
                )}

                {/* 5. File-Level Explanations */}
                {result.file_level_explanations && (
                    <Section title="File-Level Explanations" icon={FileCode2}>
                        {result.file_level_explanations.entry_points && result.file_level_explanations.entry_points.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-sm font-semibold text-[#e6edf3] mb-3 flex items-center gap-2">
                                    <Terminal size={14} className="text-[#3fb950]" /> Entry Points
                                </h4>
                                <div className="space-y-3">
                                    {result.file_level_explanations.entry_points.map((ep, idx) => (
                                        <div key={idx} className="p-4 bg-[#1f2428] rounded-lg border border-[#30363d]">
                                            <div className="font-mono text-sm text-[#58a6ff] mb-1">{ep.file}</div>
                                            <div className="text-sm text-[#c9d1d9] mb-2">{ep.purpose}</div>
                                            <div className="flex flex-wrap gap-1">
                                                {ep.key_functions.map((fn, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-[#21262d] text-[#a371f7] text-xs rounded font-mono border border-[#30363d]">{fn}</span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {result.file_level_explanations.core_files && result.file_level_explanations.core_files.length > 0 && (
                            <div className="mb-6">
                                <h4 className="text-sm font-semibold text-[#e6edf3] mb-3">Core Files</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {result.file_level_explanations.core_files.map((cf, idx) => (
                                        <div key={idx} className="p-3 bg-[#21262d]/50 rounded-lg border border-[#30363d]">
                                            <div className="font-mono text-sm text-[#58a6ff]">{cf.file}</div>
                                            <div className="text-sm text-[#8b949e] mt-1">{cf.purpose}</div>
                                            <span className={`inline-block mt-2 px-2 py-0.5 text-xs rounded-full ${cf.importance === 'high' ? 'bg-[#f85149]/20 text-[#f85149]' : cf.importance === 'medium' ? 'bg-[#d29922]/20 text-[#d29922]' : 'bg-[#3fb950]/20 text-[#3fb950]'}`}>
                                                {cf.importance}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {result.file_level_explanations.config_files && result.file_level_explanations.config_files.length > 0 && (
                            <div>
                                <h4 className="text-sm font-semibold text-[#e6edf3] mb-3">Configuration Files</h4>
                                <div className="space-y-3">
                                    {result.file_level_explanations.config_files.map((cf, idx) => (
                                        <div key={idx} className="p-3 bg-[#21262d]/50 rounded-lg border border-[#30363d]">
                                            <div className="font-mono text-sm text-[#58a6ff]">{cf.file}</div>
                                            <div className="text-sm text-[#8b949e] mt-1">{cf.purpose}</div>
                                            {cf.key_settings && cf.key_settings.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {cf.key_settings.map((s, i) => (
                                                        <span key={i} className="px-2 py-0.5 bg-[#21262d] text-[#d2a8ff] text-xs rounded font-mono border border-[#30363d]">{s}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Section>
                )}

                {/* 6. Sequence & Data-Flow Diagrams */}
                {result.sequence_diagrams && result.sequence_diagrams.workflows && result.sequence_diagrams.workflows.length > 0 && (
                    <Section title="Sequence & Data-Flow Diagrams" icon={Workflow}>
                        <div className="space-y-6">
                            {result.sequence_diagrams.workflows.map((wf, idx) => (
                                <div key={idx} className="p-4 bg-[#1f2428] rounded-lg border border-[#30363d]">
                                    <h4 className="font-semibold text-[#e6edf3] mb-2">{wf.name}</h4>
                                    <p className="text-sm text-[#8b949e] mb-4">{wf.description}</p>
                                    {wf.mermaid && (
                                        <div className="p-4 bg-[#0d1117] border border-[#30363d] rounded-lg overflow-x-auto">
                                            <div className="mermaid flex justify-center min-w-full">{wf.mermaid}</div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </Section>
                )}

                {/* 7. Tests & Local Runbook */}
                {result.tests_and_runbook && (
                    <Section title="Tests & Local Runbook" icon={FlaskConical}>
                        <div className="space-y-6">
                            {result.tests_and_runbook.setup_steps && result.tests_and_runbook.setup_steps.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-sm text-[#e6edf3] mb-2">Setup</h4>
                                    <div className="rounded-lg overflow-x-auto border border-[#30363d]">
                                        <SyntaxHighlighter language="bash" style={vscDarkPlus} customStyle={{ margin: 0, padding: '1rem', background: '#0d1117' }}>
                                            {result.tests_and_runbook.setup_steps.join('\n')}
                                        </SyntaxHighlighter>
                                    </div>
                                </div>
                            )}
                            {result.tests_and_runbook.run_local && result.tests_and_runbook.run_local.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-sm text-[#e6edf3] mb-2">Run Locally</h4>
                                    <div className="rounded-lg overflow-x-auto border border-[#30363d]">
                                        <SyntaxHighlighter language="bash" style={vscDarkPlus} customStyle={{ margin: 0, padding: '1rem', background: '#0d1117' }}>
                                            {result.tests_and_runbook.run_local.join('\n')}
                                        </SyntaxHighlighter>
                                    </div>
                                </div>
                            )}
                            {result.tests_and_runbook.run_tests && result.tests_and_runbook.run_tests.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-sm text-[#e6edf3] mb-2">Testing</h4>
                                    <div className="rounded-lg overflow-x-auto border border-[#30363d]">
                                        <SyntaxHighlighter language="bash" style={vscDarkPlus} customStyle={{ margin: 0, padding: '1rem', background: '#0d1117' }}>
                                            {result.tests_and_runbook.run_tests.join('\n')}
                                        </SyntaxHighlighter>
                                    </div>
                                </div>
                            )}
                            {result.tests_and_runbook.common_commands && Object.keys(result.tests_and_runbook.common_commands).length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-sm text-[#e6edf3] mb-2">Common Commands</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {Object.entries(result.tests_and_runbook.common_commands).map(([key, val]) => (
                                            <div key={key} className="flex items-center gap-3 p-3 bg-[#21262d]/50 rounded-lg border border-[#30363d]">
                                                <span className="text-sm font-semibold text-[#a371f7] capitalize">{key}</span>
                                                <code className="text-sm text-[#58a6ff] font-mono">{val}</code>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {result.tests_and_runbook.debugging_tips && result.tests_and_runbook.debugging_tips.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-sm text-[#e6edf3] mb-2">Debugging Tips</h4>
                                    <div className="space-y-2">
                                        {result.tests_and_runbook.debugging_tips.map((tip, idx) => (
                                            <div key={idx} className="flex gap-3 text-[#c9d1d9] bg-[#21262d]/50 p-3 rounded-lg border border-[#30363d]">
                                                <Lightbulb size={16} className="text-[#d29922] mt-0.5 flex-shrink-0" />
                                                <span className="text-sm">{tip}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Section>
                )}

                {/* 8. Issues & PR Integration */}
                {result.issues_and_prs && (
                    <Section title="Issues & PR Integration" icon={GitPullRequest}>
                        <div className="space-y-6">
                            {result.issues_and_prs.good_first_issues && result.issues_and_prs.good_first_issues.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-sm text-[#e6edf3] mb-3">Good First Issues</h4>
                                    <div className="space-y-2">
                                        {result.issues_and_prs.good_first_issues.map((issue, idx) => (
                                            <div key={idx} className="flex gap-3 p-3 bg-[#21262d]/50 rounded-lg border border-[#30363d] text-[#c9d1d9]">
                                                <span className="text-[#3fb950] font-bold flex-shrink-0">{(idx + 1).toString().padStart(2, '0')}.</span>
                                                <span className="text-sm">{issue}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {result.issues_and_prs.contribution_workflow && result.issues_and_prs.contribution_workflow.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-sm text-[#e6edf3] mb-3">Contribution Workflow</h4>
                                    <div className="space-y-2">
                                        {result.issues_and_prs.contribution_workflow.map((step, idx) => (
                                            <div key={idx} className="flex gap-3 items-start p-3 bg-[#1f2428] rounded-lg border border-[#30363d]">
                                                <div className="w-6 h-6 rounded-full bg-[#a371f7]/20 text-[#a371f7] flex items-center justify-center text-xs font-bold flex-shrink-0">{idx + 1}</div>
                                                <span className="text-sm text-[#c9d1d9]">{step}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {result.issues_and_prs.labels_explained && Object.keys(result.issues_and_prs.labels_explained).length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-sm text-[#e6edf3] mb-3">Labels Guide</h4>
                                    <div className="flex flex-wrap gap-3">
                                        {Object.entries(result.issues_and_prs.labels_explained).map(([label, desc]) => (
                                            <div key={label} className="p-3 bg-[#21262d]/50 rounded-lg border border-[#30363d] text-sm">
                                                <span className="flex items-center gap-2 mb-1">
                                                    <Tag size={12} className="text-[#a371f7]" />
                                                    <span className="font-mono text-[#a371f7]">{label}</span>
                                                </span>
                                                <span className="text-[#8b949e]">{desc}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </Section>
                )}

                {/* 9. Glossary */}
                {result.glossary && result.glossary.terms && result.glossary.terms.length > 0 && (
                    <Section title="Glossary of Project Terms" icon={BookOpen}>
                        <div className="overflow-hidden bg-[#161b22] border border-[#30363d] rounded-xl shadow-sm">
                            <table className="min-w-full divide-y divide-[#30363d]">
                                <thead className="bg-[#21262d]">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">Term</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">Definition</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-[#8b949e] uppercase tracking-wider">Context</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-[#0d1117] divide-y divide-[#30363d]">
                                    {result.glossary.terms.map((t, idx) => (
                                        <tr key={idx} className="hover:bg-[#161b22] transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[#a371f7] font-mono">{t.term}</td>
                                            <td className="px-6 py-4 text-sm text-[#c9d1d9]">{t.definition}</td>
                                            <td className="px-6 py-4 text-sm text-[#8b949e] italic">{t.context}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Section>
                )}

                {/* 10. Learning Path */}
                {result.learning_path && (
                    <Section title="Personalized Learning Path" icon={GraduationCap}>
                        <div className="space-y-8">
                            {Object.entries(result.learning_path).map(([day, items]) => (
                                <div key={day} className="relative pl-8 border-l border-[#30363d] ml-2">
                                    <div className="absolute -left-[9px] top-0 w-[18px] h-[18px] rounded-full bg-[#161b22] border-2 border-[#a371f7] flex items-center justify-center">
                                        <div className="w-2 h-2 rounded-full bg-[#a371f7]"></div>
                                    </div>
                                    <h4 className="font-bold text-[#e6edf3] mb-3 capitalize text-lg">{day.replace(/_/g, ' ')}</h4>
                                    <div className="space-y-3">
                                        {Array.isArray(items) && items.map((item, i) => (
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

                {/* Footer */}
                <footer className="mt-16 pt-8 border-t border-[#30363d] text-center text-[#8b949e] text-sm">
                    <div className="flex items-center justify-center gap-2 mb-2 opacity-50 hover:opacity-100 transition-opacity">
                        <span>Generated by</span>
                        <span className="font-bold text-[#e6edf3]">FirstPR</span>
                        <span>•</span>
                        <span>Powered by Gemini</span>
                    </div>
                    {result._meta && (
                        <div className="text-xs text-[#484f58] mt-2">
                            {result._meta.chunks_total} chunks analyzed • {result._meta.chunks_verbatim} verbatim • {result._meta.chunks_summarized} summarized
                        </div>
                    )}
                </footer>
            </div>
        </div>
    );
};

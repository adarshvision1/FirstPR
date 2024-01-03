import React, { useEffect, useState } from 'react';
import { getJobStatus, getJobResult } from '../api/client';
import type { JobStatus, AnalysisResult } from '../api/client';
import { AlertCircle, Download, FileText, Layers, GitBranch, Terminal, Shield } from 'lucide-react';
import mermaid from 'mermaid';
import { motion } from 'framer-motion';
import { LoadingOverlay } from './LoadingOverlay';

interface DashboardProps {
    jobId: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ jobId }) => {
    const [status, setStatus] = useState<JobStatus['status']>('pending');
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let interval: any;

        mermaid.initialize({ startOnLoad: true });

        const checkStatus = async () => {
            try {
                const job = await getJobStatus(jobId);
                setStatus(job.status);
                if (job.status === 'completed') {
                    const res = await getJobResult(jobId);
                    setResult(res);
                    clearInterval(interval);
                    setTimeout(() => mermaid.contentLoaded(), 500); // Re-render mermaid
                } else if (job.status === 'failed') {
                    setError(job.error || 'Job failed');
                    clearInterval(interval);
                }
            } catch (err: any) {
                setError(err.message);
                clearInterval(interval);
            }
        };

        checkStatus();
        interval = setInterval(checkStatus, 2000); // Poll every 2s

        return () => clearInterval(interval);
    }, [jobId]);

    const handleDownload = () => {
        if (!result) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(result, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `${result.repo.replace('/', '-')}-analysis.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    if (error) {
        return (
            <div className="max-w-4xl mx-auto mt-10 p-6 bg-red-50 border border-red-100 rounded-xl flex items-center gap-4 text-red-700 shadow-sm">
                <AlertCircle size={24} />
                <div>
                    <h3 className="font-semibold text-lg">Analysis Failed</h3>
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    if (status !== 'completed' || !result) {
        return <LoadingOverlay />;
    }

    return (
        <div className="container mx-auto p-6 space-y-8 pb-20">
            {/* Header Section */}
            <header className="glass-card p-8 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 animate-fade-in-up">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                        {result.repo}
                        <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-xs rounded-full font-semibold uppercase tracking-wide">
                            Analysis Complete
                        </span>
                    </h1>
                    <p className="text-slate-600 mt-2 text-lg max-w-2xl">{result.project_summary?.one_liner || result.metadata.description}</p>

                    <div className="flex flex-wrap gap-2 mt-4">
                        {result.tech_stack_detected?.languages?.map((lang) => (
                            <span key={lang} className="px-3 py-1 bg-slate-100 text-slate-700 text-sm font-medium rounded-md border border-slate-200">
                                {lang}
                            </span>
                        ))}
                        {result.tech_stack_detected?.frameworks?.map((fw) => (
                            <span key={fw} className="px-3 py-1 bg-indigo-50 text-indigo-700 text-sm font-medium rounded-md border border-indigo-100">
                                {fw}
                            </span>
                        ))}
                    </div>
                </div>
                <button
                    onClick={handleDownload}
                    className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
                >
                    <Download size={18} />
                    Download JSON
                </button>
            </header>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Main Content Column */}
                <div className="lg:col-span-2 space-y-8">

                    {/* Architecture Diagram */}
                    {result.architecture_diagram_mermaid && (
                        <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                    <Layers size={24} />
                                </div>
                                <h2 className="text-2xl font-bold text-slate-900">Architecture Overview</h2>
                            </div>
                            <p className="text-slate-600 mb-6 leading-relaxed">{result.architecture_overview?.narrative}</p>
                            <div className="mermaid bg-slate-50 p-6 rounded-xl border border-slate-100 overflow-x-auto">
                                {result.architecture_diagram_mermaid.replace(/```mermaid/g, '').replace(/```/g, '')}
                            </div>
                        </section>
                    )}

                    {/* Development Workflow */}
                    <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
                                <Terminal size={24} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Development Workflow</h2>
                        </div>
                        {result.development_workflow && (
                            <div className="space-y-6">
                                <div>
                                    <h4 className="font-semibold text-sm text-slate-500 uppercase tracking-wider mb-2">Setup</h4>
                                    <div className="bg-slate-900 text-slate-50 p-4 rounded-xl font-mono text-sm overflow-x-auto shadow-inner">
                                        <pre>{result.development_workflow.setup_commands.join('\n')}</pre>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm text-slate-500 uppercase tracking-wider mb-2">Run Locally</h4>
                                    <div className="bg-slate-900 text-slate-50 p-4 rounded-xl font-mono text-sm overflow-x-auto shadow-inner">
                                        <pre>{result.development_workflow.run_local.join('\n')}</pre>
                                    </div>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Core Components */}
                    <section className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                                <Shield size={24} />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Core Components</h2>
                        </div>
                        <div className="grid gap-4">
                            {result.core_components_and_functions?.map((comp, idx) => (
                                <div key={idx} className="group p-4 rounded-xl border border-slate-100 hover:border-indigo-100 hover:bg-indigo-50/30 transition-all">
                                    <div className="font-mono text-indigo-700 font-semibold text-lg mb-1">{comp.symbol}</div>
                                    <div className="text-slate-600">{comp.purpose}</div>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {/* Sidebar Column */}
                <div className="space-y-8">
                    {/* Onboarding Roadmap */}
                    {result.firstpr_onboarding_roadmap && (
                        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full -mr-8 -mt-8"></div>
                            <div className="flex items-center gap-3 mb-6 relative z-10">
                                <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                                    <GitBranch size={24} />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">7-Day Roadmap</h2>
                            </div>
                            <div className="space-y-6 relative z-10">
                                {Object.entries(result.firstpr_onboarding_roadmap).map(([day, tasks]) => (
                                    <div key={day} className="relative pl-6 border-l-2 border-slate-100 last:border-0 pb-6 last:pb-0">
                                        <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-indigo-500"></div>
                                        <h3 className="font-bold text-slate-800 capitalize mb-2">{day.replace('_', ' ')}</h3>
                                        <ul className="space-y-2">
                                            {tasks.map((task: string, i: number) => (
                                                <li key={i} className="text-sm text-slate-600 leading-snug flex gap-2">
                                                    <span className="mt-1.5 w-1 h-1 rounded-full bg-slate-400 flex-shrink-0"></span>
                                                    {task}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* Folder Structure */}
                    {result.folder_structure && (
                        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                                    <FileText size={24} />
                                </div>
                                <h2 className="text-xl font-bold text-slate-900">Folder Structure</h2>
                            </div>
                            <div className="space-y-3">
                                {result.folder_structure.map((folder, idx) => (
                                    <div key={idx} className="text-sm">
                                        <div className="font-mono font-semibold text-slate-800 bg-slate-50 inline-block px-2 py-0.5 rounded border border-slate-100 mb-1">
                                            {folder.path}
                                        </div>
                                        <div className="text-slate-500 pl-2 border-l-2 border-slate-100 ml-1">
                                            {folder.responsibility}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};


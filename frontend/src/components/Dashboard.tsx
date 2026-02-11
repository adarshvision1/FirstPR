import React, { useEffect, useState, useCallback } from 'react';
import { getJobStatus, getJobResult, explainComprehensive, getComprehensiveResult } from '../api/client';
import type { JobStatus, AnalysisResult, ComprehensiveResult } from '../types';
import { AlertCircle, BookOpen, LayoutDashboard } from 'lucide-react';
import mermaid from 'mermaid';
import { LoadingOverlay } from './LoadingOverlay';
import { FileExplorer } from './FileExplorer';
import { FileViewer } from './FileViewer';
import { ActivityPanel } from './ActivityPanel';
import { ProjectOverview } from './ProjectOverview';
import { ComprehensiveOverview } from './ComprehensiveOverview';
import { ChatWidget } from './ChatWidget';

interface DashboardProps {
    jobId: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ jobId }) => {
    const [status, setStatus] = useState<JobStatus['status']>('pending');
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState('');
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'overview' | 'comprehensive' | 'file'>('overview');

    // Comprehensive analysis state
    const [comprehensiveJobId, setComprehensiveJobId] = useState<string | null>(null);
    const [comprehensiveResult, setComprehensiveResult] = useState<ComprehensiveResult | null>(null);
    const [comprehensiveStatus, setComprehensiveStatus] = useState<'idle' | 'loading' | 'completed' | 'failed'>('idle');

    const handleFileSelect = useCallback((path: string) => {
        setSelectedFile(path);
        setViewMode('file');
    }, []);

    const handleBackToOverview = useCallback(() => {
        setViewMode(comprehensiveResult ? 'comprehensive' : 'overview');
    }, [comprehensiveResult]);

    // Poll for basic analysis
    useEffect(() => {
        mermaid.initialize({ startOnLoad: true });

        const checkStatus = async () => {
            try {
                const job = await getJobStatus(jobId);
                setStatus(job.status);
                if (job.status === 'completed') {
                    const res = await getJobResult(jobId);
                    setResult(res);
                    if (res && res.file_tree) {
                        const readme = res.file_tree.find((f: { path: string }) => f.path.toLowerCase() === 'readme.md');
                        if (readme) setSelectedFile(readme.path);
                    }
                    clearInterval(interval);
                    setTimeout(() => mermaid.contentLoaded(), 500);
                } else if (job.status === 'failed') {
                    setError(job.error || 'Job failed');
                    clearInterval(interval);
                }
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Unknown error');
                clearInterval(interval);
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 2000);

        return () => clearInterval(interval);
    }, [jobId]);

    // Start comprehensive analysis once basic analysis completes
    useEffect(() => {
        if (status !== 'completed' || !result || comprehensiveJobId) return;

        const startComprehensive = async () => {
            try {
                const parts = result.repo.split('/');
                if (parts.length < 2) return;
                setComprehensiveStatus('loading');
                const job = await explainComprehensive(parts[0], parts[1]);
                setComprehensiveJobId(job.job_id);
            } catch {
                setComprehensiveStatus('failed');
            }
        };

        startComprehensive();
    }, [status, result, comprehensiveJobId]);

    // Poll for comprehensive analysis
    useEffect(() => {
        if (!comprehensiveJobId) return;

        const checkComprehensive = async () => {
            try {
                const job = await getJobStatus(comprehensiveJobId);
                if (job.status === 'completed') {
                    const res = await getComprehensiveResult(comprehensiveJobId);
                    setComprehensiveResult(res);
                    setComprehensiveStatus('completed');
                    setViewMode('comprehensive');
                    clearInterval(interval);
                } else if (job.status === 'failed') {
                    setComprehensiveStatus('failed');
                    clearInterval(interval);
                }
            } catch {
                setComprehensiveStatus('failed');
                clearInterval(interval);
            }
        };

        checkComprehensive();
        const interval = setInterval(checkComprehensive, 3000);

        return () => clearInterval(interval);
    }, [comprehensiveJobId]);

    if (error) {
        return (
            <div className="max-w-4xl mx-auto mt-10 p-6 bg-[#1f1315] border border-[#f8514933] rounded-xl flex items-center gap-4 text-[#f85149] shadow-sm">
                <AlertCircle size={24} />
                <div>
                    <h3 className="font-semibold text-lg">Analysis Failed</h3>
                    <p className="text-[#f85149]/80">{error}</p>
                </div>
            </div>
        );
    }

    if (status !== 'completed' || !result) {
        return <LoadingOverlay />;
    }

    return (
        <div className="flex h-[calc(100vh-64px)] overflow-hidden bg-[#0d1117] border-t border-[#30363d]">
            {/* Left Panel: File Explorer */}
            <div className="flex-shrink-0 border-r border-[#30363d] overflow-hidden">
                <FileExplorer
                    files={result.file_tree}
                    onSelectFile={handleFileSelect}
                    selectedFile={selectedFile}
                />
            </div>

            {/* Center Panel: Viewer or Overview */}
            <div className="flex-grow h-full overflow-hidden flex flex-col min-w-0 relative bg-[#0d1117]">
                {/* Tab bar for switching views */}
                {viewMode !== 'file' && (
                    <div className="flex items-center gap-1 px-4 pt-3 pb-0 bg-[#0d1117] border-b border-[#30363d]">
                        <button
                            onClick={() => setViewMode('overview')}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border border-b-0 transition-colors ${viewMode === 'overview' ? 'bg-[#0d1117] text-[#e6edf3] border-[#30363d]' : 'bg-transparent text-[#8b949e] border-transparent hover:text-[#c9d1d9]'}`}
                        >
                            <LayoutDashboard size={14} />
                            Overview
                        </button>
                        <button
                            onClick={() => comprehensiveResult && setViewMode('comprehensive')}
                            disabled={!comprehensiveResult}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border border-b-0 transition-colors ${viewMode === 'comprehensive' ? 'bg-[#0d1117] text-[#e6edf3] border-[#30363d]' : 'bg-transparent text-[#8b949e] border-transparent hover:text-[#c9d1d9]'} ${!comprehensiveResult ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <BookOpen size={14} />
                            Onboarding Guide
                            {comprehensiveStatus === 'loading' && (
                                <span className="ml-1 inline-block w-3 h-3 border-2 border-[#a371f7] border-t-transparent rounded-full animate-spin"></span>
                            )}
                        </button>
                    </div>
                )}

                {viewMode === 'comprehensive' && comprehensiveResult ? (
                    <ComprehensiveOverview result={comprehensiveResult} repoName={result.repo} />
                ) : viewMode === 'overview' && result ? (
                    <ProjectOverview result={result} />
                ) : selectedFile ? (
                    <FileViewer
                        repo={result.repo}
                        path={selectedFile}
                        onBack={handleBackToOverview}
                    />
                ) : (
                    <div className="flex-grow flex items-center justify-center text-[#8b949e]">
                        Select a file to view
                    </div>
                )}
            </div>

            {/* Right Panel: Activity & Insights */}
            <ActivityPanel repo={result.repo} />

            {/* Floating Chat Widget */}
            <div className="fixed bottom-6 right-6 z-50">
                <ChatWidget repo={result.repo} analysisResult={result} />
            </div>
        </div>
    );
};

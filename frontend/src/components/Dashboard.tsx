import React, { useEffect, useState, useCallback } from 'react';
import { getJobStatus, getJobResult } from '../api/client';
import type { JobStatus, AnalysisResult } from '../types';
import { AlertCircle } from 'lucide-react';
import mermaid from 'mermaid'; // Keep for diagram in center panel if needed, or move to tab
import { LoadingOverlay } from './LoadingOverlay';
import { FileExplorer } from './FileExplorer';
import { FileViewer } from './FileViewer';
import { ActivityPanel } from './ActivityPanel';
import { ProjectOverview } from './ProjectOverview';
import { ChatWidget } from './ChatWidget';

interface DashboardProps {
    jobId: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ jobId }) => {
    const [status, setStatus] = useState<JobStatus['status']>('pending');
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState('');
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'overview' | 'file'>('overview');

    const handleFileSelect = useCallback((path: string) => {
        setSelectedFile(path);
        setViewMode('file');
    }, []);

    const handleBackToOverview = useCallback(() => {
        setViewMode('overview');
    }, []);

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
                    // Default to README if available, or first file
                    if (res && res.file_tree) {
                        const readme = res.file_tree.find(f => f.path.toLowerCase() === 'readme.md');
                        if (readme) setSelectedFile(readme.path);
                    }
                    clearInterval(interval);
                    setTimeout(() => mermaid.contentLoaded(), 500);
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
        interval = setInterval(checkStatus, 2000);

        return () => clearInterval(interval);
    }, [jobId]);

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
                {viewMode === 'overview' && result ? (
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


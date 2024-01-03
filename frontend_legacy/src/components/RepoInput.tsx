import React, { useState } from 'react';
import { analyzeRepo } from '../api/client';
import { Loader2, ArrowRight, Github } from 'lucide-react';

interface RepoInputProps {
    onAnalysisStarted: (jobId: string) => void;
}

export const RepoInput: React.FC<RepoInputProps> = ({ onAnalysisStarted }) => {
    const [repo, setRepo] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        const cleanRepo = repo.replace('https://github.com/', '').trim();
        if (!cleanRepo.includes('/')) {
            setError('Please use "owner/repo" format (e.g. facebook/react)');
            return;
        }

        setLoading(true);
        setError('');
        try {
            const job = await analyzeRepo(cleanRepo);
            onAnalysisStarted(job.job_id);
        } catch (err: any) {
            setError(err.message || 'Failed to start analysis');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="glass-card rounded-2xl p-2 pl-6 flex items-center gap-4 transition-all focus-within:ring-2 ring-indigo-500/50 shadow-2xl shadow-indigo-500/10">
                <Github className="text-slate-400" size={24} />
                <input
                    type="text"
                    className="flex-grow bg-transparent border-none outline-none text-lg text-slate-800 placeholder:text-slate-400 h-10 w-full"
                    placeholder="Enter URL or owner/repo (e.g. facebook/react)"
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    disabled={loading}
                />
                <button
                    onClick={handleSubmit}
                    disabled={loading || !repo}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl px-6 py-3 font-medium transition-all flex items-center gap-2"
                >
                    {loading ? (
                        <Loader2 className="animate-spin" size={20} />
                    ) : (
                        <>
                            Analyze <ArrowRight size={18} />
                        </>
                    )}
                </button>
            </div>

            {error && (
                <p className="mt-4 text-center text-red-500 bg-red-50 py-2 px-4 rounded-lg inline-block mx-auto">
                    {error}
                </p>
            )}

            <div className="mt-8 text-center">
                <p className="text-slate-400 text-sm mb-4">Or try popular repositories:</p>
                <div className="flex flex-wrap justify-center gap-3">
                    {['facebook/react', 'fastapi/fastapi', 'microsoft/vscode'].map((example) => (
                        <button
                            key={example}
                            onClick={() => setRepo(example)}
                            className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-colors"
                        >
                            {example}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

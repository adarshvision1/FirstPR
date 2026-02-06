import React, { useState, useCallback } from 'react';
import { analyzeRepo } from '../api/client';
import { Loader2, ArrowRight, Github } from 'lucide-react';

interface RepoInputProps {
    onAnalysisStarted: (jobId: string) => void;
}

export const RepoInput: React.FC<RepoInputProps> = ({ onAnalysisStarted }) => {
    const [repo, setRepo] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = useCallback(async (e: React.FormEvent) => {
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
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to start analysis');
            }
        } finally {
            setLoading(false);
        }
    }, [repo, onAnalysisStarted]);

    const handleExampleClick = useCallback((example: string) => {
        setRepo(example);
    }, []);

    return (
        <div className="w-full max-w-2xl mx-auto">
            <div className="bg-[#161b22]/80 backdrop-blur-xl border border-[#30363d] rounded-2xl p-2 pl-6 flex items-center gap-4 transition-all focus-within:ring-2 ring-indigo-500/50 shadow-2xl shadow-indigo-500/10">
                <Github className="text-[#8b949e]" size={24} />
                <input
                    type="text"
                    className="flex-grow bg-transparent border-none outline-none text-lg text-[#e6edf3] placeholder:text-[#8b949e] h-10 w-full"
                    placeholder="Enter URL or owner/repo (e.g. facebook/react)"
                    value={repo}
                    onChange={(e) => setRepo(e.target.value)}
                    disabled={loading}
                    aria-label="Repository URL or owner/repo"
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
                <p className="mt-4 text-center text-red-400 bg-red-900/20 border border-red-800 py-2 px-4 rounded-lg inline-block mx-auto">
                    {error}
                </p>
            )}

            <div className="mt-8 text-center">
                <p className="text-[#8b949e] text-sm mb-4">Or try popular repositories:</p>
                <div className="flex flex-wrap justify-center gap-3">
                    {['facebook/react', 'fastapi/fastapi', 'microsoft/vscode'].map((example) => (
                        <button
                            key={example}
                            onClick={() => handleExampleClick(example)}
                            className="text-xs px-3 py-1.5 rounded-full bg-[#21262d] border border-[#30363d] text-[#8b949e] hover:border-[#a371f7] hover:text-[#e6edf3] transition-colors"
                        >
                            {example}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

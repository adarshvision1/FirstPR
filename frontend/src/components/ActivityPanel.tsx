import React, { useEffect, useState } from 'react';
import { getIssues, getPullRequests } from '../api/client';
import { AlertCircle, GitPullRequest, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { IssueItem } from './IssueItem';
import { PullRequestItem } from './PullRequestItem';
import type { Issue, PullRequest } from '../types';

interface ActivityPanelProps {
    repo: string;
}

export const ActivityPanel: React.FC<ActivityPanelProps> = ({ repo }) => {
    const [issues, setIssues] = useState<Issue[]>([]);
    const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
    const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [isExpanded, setIsExpanded] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [issData, prData] = await Promise.all([
                    getIssues(repo),
                    getPullRequests(repo)
                ]);
                setIssues(issData?.issues || []);
                setPullRequests(prData?.pull_requests || []);
            } catch (err) {
                console.error("Failed to load activity data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [repo]);

    if (loading) return <div className="p-4 text-center text-slate-500">Loading insights...</div>;

    return (
        <div className={`h-full bg-[#0d1117] flex-shrink-0 border-l border-[#30363d] transition-all duration-300 ${isExpanded ? 'w-[500px]' : 'w-80'} flex flex-col`}>
            <div className="flex justify-start p-2 border-b border-[#30363d] bg-[#161b22]">
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1.5 hover:bg-[#30363d] rounded-md text-[#8b949e] hover:text-[#c9d1d9] transition-colors"
                    title={isExpanded ? "Collapse" : "Expand"}
                >
                    {isExpanded ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
                </button>
            </div>

            {/* Issues Section - Top Half */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0 border-b border-[#30363d]">
                <div className="flex items-center justify-between px-4 py-3 bg-[#161b22]/95 backdrop-blur z-10 border-b border-[#30363d] shrink-0">
                    <h3 className="text-sm font-semibold text-[#e6edf3] flex items-center gap-2">
                        <AlertCircle size={16} className="text-[#a371f7]" />
                        Recent Issues
                    </h3>
                    {selectedIssueId && (
                        <button onClick={() => setSelectedIssueId(null)} className="text-xs text-[#8b949e] hover:text-[#c9d1d9] flex items-center gap-1 transition-colors">
                            <X size={12} /> Clear
                        </button>
                    )}
                </div>

                <div className="overflow-y-auto p-4 space-y-3">
                    {issues.slice(0, 10).map((issue) => (
                        <IssueItem
                            key={issue.id}
                            issue={issue}
                            isSelected={selectedIssueId === issue.number}
                            onClick={() => setSelectedIssueId(selectedIssueId === issue.number ? null : issue.number)}
                        />
                    ))}
                    {issues.length === 0 && <div className="text-[#8b949e] text-xs italic text-center py-4">No open issues found</div>}
                </div>
            </div>

            {/* Pull Requests Section - Bottom Half */}
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="flex items-center justify-between px-4 py-3 bg-[#161b22]/95 backdrop-blur z-10 border-b border-[#30363d] shrink-0">
                    <h3 className="text-sm font-semibold text-[#e6edf3] flex items-center gap-2">
                        <GitPullRequest size={16} className="text-[#3fb950]" />
                        Pull Requests
                    </h3>
                    {selectedIssueId && <span className="text-[10px] font-medium text-[#8b949e] bg-[#21262d] px-2 py-0.5 rounded-full border border-[#30363d]">Linked to #{selectedIssueId}</span>}
                </div>

                <div className="overflow-y-auto p-4 space-y-3">
                    {pullRequests
                        .filter(pr => !selectedIssueId || (pr.body && pr.body.includes(`#${selectedIssueId}`)) || (pr.title && pr.title.includes(`#${selectedIssueId}`)))
                        .slice(0, 10)
                        .map((pr) => (
                            <PullRequestItem key={pr.id} pr={pr} />
                        ))}
                    {pullRequests.length === 0 && <div className="text-[#8b949e] text-xs italic text-center py-4">No pull requests found</div>}
                    {selectedIssueId && pullRequests.filter(pr => (pr.body && pr.body.includes(`#${selectedIssueId}`)) || (pr.title && pr.title.includes(`#${selectedIssueId}`))).length === 0 && (
                        <div className="text-[#8b949e] text-xs italic text-center py-8 bg-[#21262d]/50 rounded-lg border border-dashed border-[#30363d]">
                            No linked PRs found for #{selectedIssueId}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

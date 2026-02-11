import React from 'react';
import type { Issue } from '../types';

interface IssueItemProps {
    issue: Issue;
    isSelected: boolean;
    onClick: () => void;
}

const IssueItemInner: React.FC<IssueItemProps> = ({ issue, isSelected, onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`group relative block p-3 rounded-lg border cursor-pointer transition-all duration-200 ${isSelected
                ? 'bg-[#a371f7]/10 border-[#a371f7] shadow-sm'
                : 'bg-[#161b22] border-[#30363d] hover:border-[#a371f7]/50 hover:shadow-md'
                }`}
        >
            <div className="flex justify-between items-start gap-3 mb-1.5">
                <h4 className={`text-sm font-medium line-clamp-2 transition-colors ${isSelected ? 'text-[#a371f7]' : 'text-[#e6edf3] group-hover:text-[#a371f7]'
                    }`}>
                    {issue.title}
                </h4>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full flex-shrink-0 ${isSelected ? 'bg-[#a371f7]/20 text-[#a371f7]' : 'bg-[#21262d] text-[#8b949e] group-hover:bg-[#30363d]'
                    }`}>#{issue.number}</span>
            </div>

            <div className="flex flex-wrap gap-1.5 mt-2">
                {issue.labels.slice(0, 3).map((l) => (
                    <span key={l.id} className="px-1.5 py-0.5 bg-[#21262d] text-[#8b949e] text-[10px] rounded border border-[#30363d] group-hover:border-[#8b949e]/30 transition-colors">
                        {l.name}
                    </span>
                ))}
            </div>
        </div>
    );
};

export const IssueItem = React.memo(IssueItemInner);

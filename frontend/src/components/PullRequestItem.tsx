import React from 'react';
import type { PullRequest } from '../types';

interface PullRequestItemProps {
    pr: PullRequest;
}

const PullRequestItemInner: React.FC<PullRequestItemProps> = ({ pr }) => {
    return (
        <a
            href={pr.html_url}
            target="_blank"
            rel="noreferrer"
            className="block p-3 rounded-lg border border-[#30363d] bg-[#161b22] hover:border-[#3fb950]/50 hover:shadow-md transition-all duration-200 group"
        >
            <div className="flex justify-between items-start gap-3 mb-1.5">
                <h4 className="text-sm font-medium text-[#e6edf3] group-hover:text-[#3fb950] line-clamp-2 transition-colors">
                    {pr.title}
                </h4>
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${pr.state === 'open' ? 'bg-[#3fb950]/10 text-[#3fb950] border border-[#3fb950]/20' : 'bg-[#a371f7]/10 text-[#a371f7] border border-[#a371f7]/20'}`}>
                    {pr.state}
                </span>
            </div>
            <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-[#8b949e] group-hover:text-[#c9d1d9] transition-colors flex items-center gap-1">
                    <span className="w-4 h-4 rounded-full bg-[#30363d] flex items-center justify-center text-[8px] font-bold text-[#e6edf3]">
                        {pr.user?.login?.charAt(0).toUpperCase()}
                    </span>
                    {pr.user?.login}
                </span>
                <span className="text-[10px] font-mono text-[#8b949e] group-hover:text-[#c9d1d9]">#{pr.number}</span>
            </div>
        </a>
    );
};

export const PullRequestItem = React.memo(PullRequestItemInner);

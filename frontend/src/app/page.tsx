'use client';

import { useState } from 'react';
import { ChatCanvas } from '@/components/chat/ChatCanvas';
import { ContextRail } from '@/components/context-rail/ContextRail';
import { PRPreviewModal } from '@/components/modals/PRPreviewModal';
import { StreamMessage, FolderNode, Issue } from '@/lib/types';

export default function Home() {
  const [messages, setMessages] = useState<StreamMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Computed state
  const folderMap = messages.findLast(m => m.type === 'folder_map')?.data as FolderNode;
  const issues = messages.findLast(m => m.type === 'issues')?.data as Issue[];

  const handleAnalyze = async (repoUrl: string) => {
    setIsStreaming(true);
    setMessages(prev => [...prev, { type: 'summary', content: `Analyzing ${repoUrl}...` }]); // Optimistic

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: repoUrl })
      });

      const data = await res.json();
      if (!res.ok || !data.jobId) {
        throw new Error(data.detail || data.error || "Failed to start analysis");
      }

      const { jobId } = data;

      const streamRes = await fetch(`/api/stream/${jobId}`);
      if (!streamRes.body) throw new Error("No stream body");

      const reader = streamRes.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const msg: StreamMessage = JSON.parse(line);
            handleStreamMessage(msg);
          } catch (e) {
            console.error("Parse error", e);
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { type: 'error', content: 'Connection lost. Please try again.' }]);
    } finally {
      setIsStreaming(false);
    }
  };

  const handleStreamMessage = (msg: StreamMessage) => {
    if (msg.type === 'done') {
      setIsStreaming(false);
      return;
    }

    setMessages(prev => {
      const last = prev[prev.length - 1];

      // Handle token streaming for architecture
      if (msg.type === 'architecture_token') {
        if (last && last.type === 'architecture_token') {
          return [
            ...prev.slice(0, -1),
            { ...last, content: (last.content || '') + msg.content }
          ];
        }
        return [...prev, msg];
      }

      // Handle progress updates (replace last progress)
      if (msg.type === 'progress') {
        if (last && last.type === 'progress') {
          return [...prev.slice(0, -1), msg];
        }
      }

      return [...prev, msg];
    });
  };

  return (
    <main className="flex h-screen w-full bg-slate-50 overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (simplified) */}
        <div className="h-14 border-b border-slate-200 bg-white flex items-center px-6 justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold">FP</div>
            <span className="font-semibold text-slate-800">FirstPR</span>
          </div>
          <button
            onClick={() => setIsPreviewOpen(true)}
            className="text-sm font-medium text-teal-600 hover:text-teal-700 disabled:opacity-50"
            disabled={messages.length === 0}
          >
            Preview PR
          </button>
        </div>

        <div className="flex-1 min-h-0">
          <ChatCanvas
            messages={messages}
            isStreaming={isStreaming}
            onAnalyze={handleAnalyze}
          />
        </div>
      </div>

      {/* Context Rail */}
      <ContextRail folderMap={folderMap} issues={issues} />

      {/* Modals */}
      <PRPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />
    </main>
  );
}

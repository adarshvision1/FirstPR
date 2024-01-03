import { NextRequest } from 'next/server';
import { StreamMessage } from '@/lib/types';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

// Helper to sleep
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
    const { jobId } = await params;

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            let isStreamClosed = false;
            const send = (msg: StreamMessage) => {
                if (isStreamClosed) return;
                try {
                    controller.enqueue(encoder.encode(JSON.stringify(msg) + '\n'));
                } catch (e) {
                    isStreamClosed = true;
                }
            };

            try {
                let isComplete = false;
                let attempts = 0;

                send({ type: 'progress', stage: 'Initializing analysis...' });

                while (!isComplete && attempts < 120 && !isStreamClosed) { // Timeout ~2 mins
                    attempts++;

                    // Poll status
                    try {
                        const statusRes = await fetch(`${BACKEND_URL}/api/analyze/${jobId}/status`);
                        if (!statusRes.ok) {
                            throw new Error(`Backend status check failed: ${statusRes.status}`);
                        }
                        const statusData = await statusRes.json();

                        if (statusData.status === 'failed') {
                            send({ type: 'error', content: statusData.error || 'Analysis failed on server.' });
                            controller.close();
                            return;
                        }

                        if (statusData.status === 'completed') {
                            isComplete = true;
                            break;
                        }

                        // Map backend "processing" to UI progress updates
                        // Real backend might not give granular stages yet, so we simulate or use what's available
                        send({ type: 'progress', stage: 'Analyzing repository structure and code...' });

                    } catch (e) {
                        console.error("Polling error", e);
                    }

                    await sleep(1000);
                }

                if (isComplete) {
                    // Fetch final result
                    const resultRes = await fetch(`${BACKEND_URL}/api/analyze/${jobId}/result`);
                    const result = await resultRes.json();

                    // 1. Summary
                    if (result.project_summary) {
                        send({ type: 'summary', content: result.project_summary.one_liner });
                    }

                    // 2. Folder Map
                    if (result.folder_structure) {
                        // specific mapping might be needed if backend shape differs from FolderNode
                        // assuming direct map for now or simplest case
                        send({ type: 'folder_map', data: convertToFolderNode(result.file_tree) });
                    }

                    // 3. Architecture
                    if (result.architecture_overview) {
                        send({ type: 'progress', stage: 'Generating architecture diagram...' });
                        const narrative = result.architecture_overview.narrative || "";

                        // Stream narrative as tokens? Or just skip narrative if we want the diagram focused?
                        // Let's send narrative as summary or just part of the flow?
                        // The previous implementation streamed narrative as 'architecture_token'. 
                        // If I want to render PlantUML, I should probably send the PlantUML code as 'architecture_token' 
                        // OR send a new type.

                        // Let's send the PlantUML code if available.
                        if (result.architecture_diagram_plantuml) {
                            // Send the whole block as one token for now, or stream it.
                            send({ type: 'architecture_token', content: result.architecture_diagram_plantuml });
                        } else if (result.architecture_diagram_mermaid) {
                            send({ type: 'architecture_token', content: result.architecture_diagram_mermaid });
                        } else {
                            // Fallback to narrative if no diagram
                            send({ type: 'architecture_token', content: narrative });
                        }
                    }

                    // 3.5 Social Links
                    if (result.social_links && result.social_links.length > 0) {
                        send({ type: 'social_links', data: result.social_links });
                    }

                    // 4. Issues
                    if (result.issue_analysis_and_recommendations) {
                        const recs = result.issue_analysis_and_recommendations;
                        let issuesRaw: any[] = [];

                        // Handle both { top_candidates: [...] } and direct array
                        if (recs.top_candidates && Array.isArray(recs.top_candidates)) {
                            issuesRaw = recs.top_candidates;
                        } else if (Array.isArray(recs)) {
                            issuesRaw = recs;
                        }

                        if (issuesRaw.length > 0) {
                            const issues = issuesRaw.map((title: any, idx: number) => ({
                                id: idx,
                                number: 0,
                                title: typeof title === 'string' ? title : (title.title || "Unknown Issue"),
                                labels: ['enhancement']
                            }));
                            send({ type: 'issues', data: issues });
                        }
                    }

                    // 5. Pull Requests
                    if (result.pull_requests && result.pull_requests.length > 0) {
                        send({ type: 'pull_requests', data: result.pull_requests });
                    }

                    send({ type: 'done' });
                } else {
                    send({ type: 'error', content: 'Analysis timed out.' });
                }

                controller.close();

            } catch (error) {
                console.error("Streaming error:", error);
                send({ type: 'error', content: 'Stream connection failed' });
                controller.close();
            }
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}

// Simple converter from list of paths to FolderNode tree
function convertToFolderNode(fileTree: { path: string, type: string }[]): any {
    const root = { name: 'root', type: 'folder', path: '', children: [] };

    // Basic implementation: just top level for now or full nested
    // To keep it simple and robust for this demo:
    // We will just show top 2 levels or list.
    // ... Actually let's assume the frontend handles the recursive Display 
    // and we build a proper tree here?

    const tree: any = { name: 'root', type: 'folder', path: '', children: [] };

    for (const file of fileTree) {
        const parts = file.path.split('/');
        let current = tree;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            const isFile = i === parts.length - 1 && file.type === 'blob';
            let node = current.children.find((c: any) => c.name === part);
            if (!node) {
                node = {
                    name: part,
                    type: isFile ? 'file' : 'folder',
                    path: parts.slice(0, i + 1).join('/'),
                    children: []
                };
                current.children.push(node);
            }
            current = node;
        }
    }
    return tree;
}

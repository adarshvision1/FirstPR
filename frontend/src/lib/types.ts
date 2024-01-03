export type StreamMessageType =
    | 'progress'
    | 'summary'
    | 'folder_map'
    | 'architecture_token'
    | 'issues'
    | 'pull_requests'
    | 'onboarding_step'
    | 'action_result'
    | 'social_links'
    | 'done'
    | 'error';

export interface StreamMessage {
    type: StreamMessageType;
    stage?: string; // For 'progress'
    content?: string; // For 'summary', 'architecture_token'
    data?: any; // For structured data like 'folder_map', 'issues'
    id?: string;
}

export interface FolderNode {
    name: string;
    type: 'file' | 'folder';
    children?: FolderNode[];
    path: string;
}

export interface Issue {
    id: number;
    title: string;
    number: number;
    labels: string[];
}

export interface PullRequest {
    number: number;
    title: string;
    html_url: string;
    state: string;
    user: {
        login: string;
        avatar_url: string;
    };
    created_at: string;
    comments_count: number;
}

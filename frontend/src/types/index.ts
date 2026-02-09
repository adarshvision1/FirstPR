export interface Label {
    id: number;
    name: string;
}

export interface User {
    login: string;
}

export interface Issue {
    id: number;
    number: number;
    title: string;
    state: string;
    labels: Label[];
    user: User;
    body: string;
    html_url: string;
}

export interface PullRequest {
    id: number;
    number: number;
    title: string;
    state: string;
    user: User;
    body: string;
    html_url: string;
}

export interface AnalysisRequest {
    repo: string;
    ref?: string;
    options?: Record<string, any>;
}

export interface JobStatus {
    job_id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    error?: string;
}

export interface AnalysisResult {
    repo: string;
    metadata: any;
    default_branch: string;
    file_tree: any[];
    manifests: Record<string, string>;
    dependency_graph: any;
    top_functions: any[];
    discussions?: any[];

    // Enhanced fields
    project_summary?: { one_liner: string; audience: string; maturity: string };
    social_links?: { platform: string; url: string }[];
    architecture_overview?: { narrative: string; components: { name: string; purpose: string }[]; tech_stack_reasoning?: { technology: string; purpose: string; reasoning: string }[] };
    architecture_diagram_mermaid?: string;
    folder_structure?: { path: string; responsibility: string }[];

    tech_stack_detected?: { languages: string[]; frameworks: string[] };
    development_workflow?: { setup_commands: string[]; run_local: string[]; test_commands: string[] };
    issue_analysis_and_recommendations?: { top_candidates: any[] };
    firstpr_onboarding_roadmap?: Record<string, string[]>;
    frequently_asked_questions?: { question: string; answer: string }[];
    missing_docs_and_improvements?: string[];

    // Internal
    rate_limit_remaining?: number;
    rate_limit_reset?: string;
}

// Comprehensive explanation types (10-section onboarding guide)
export interface ComprehensiveResult {
    project_snapshot?: {
        one_liner: string;
        target_audience: string;
        problem_solved: string;
        maturity: string;
        key_stats?: Record<string, string | number>;
    };
    guided_tour?: {
        overview: string;
        user_journey: string;
        use_cases: string[];
    };
    architecture_map?: {
        narrative: string;
        components: { name: string; purpose: string; tech: string }[];
        tech_stack_reasoning: { technology: string; purpose: string; reasoning: string }[];
        data_flow: string;
    };
    architecture_diagram_mermaid?: string;
    module_package_view?: {
        directory_structure: { path: string; responsibility: string }[];
        key_modules: { module: string; purpose: string; exports: string[] }[];
    };
    file_level_explanations?: {
        entry_points: { file: string; purpose: string; key_functions: string[] }[];
        core_files: { file: string; purpose: string; importance: string }[];
        config_files: { file: string; purpose: string; key_settings: string[] }[];
    };
    sequence_diagrams?: {
        workflows: { name: string; mermaid: string; description: string }[];
    };
    tests_and_runbook?: {
        setup_steps: string[];
        run_local: string[];
        run_tests: string[];
        common_commands: Record<string, string>;
        debugging_tips: string[];
    };
    issues_and_prs?: {
        good_first_issues: string[];
        contribution_workflow: string[];
        pr_requirements: string[];
        labels_explained: Record<string, string>;
    };
    glossary?: {
        terms: { term: string; definition: string; context: string }[];
    };
    learning_path?: Record<string, string[]>;
    _meta?: {
        chunks_total: number;
        chunks_verbatim: number;
        chunks_summarized: number;
        reasoning: string;
    };
}

import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_URL,
});

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

  // Enhanced fields
  project_summary?: { one_liner: string; audience: string; maturity: string };
  architecture_overview?: { narrative: string; components: { name: string; purpose: string }[] };
  architecture_diagram_mermaid?: string;
  folder_structure?: { path: string; responsibility: string }[];
  core_components_and_functions?: { symbol: string; purpose: string }[];
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

export const analyzeRepo = async (repo: string) => {
  const response = await api.post<JobStatus>('/analyze', { repo });
  return response.data;
};

export const getJobStatus = async (jobId: string) => {
  const response = await api.get<JobStatus>(`/analyze/${jobId}/status`);
  return response.data;
};

export const getJobResult = async (jobId: string) => {
  const response = await api.get<AnalysisResult>(`/analyze/${jobId}/result`);
  return response.data;
};

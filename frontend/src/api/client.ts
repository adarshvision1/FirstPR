import axios from 'axios';
import type { AnalysisResult, ComprehensiveResult, JobStatus } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_URL,
});

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

export const getFileContent = async (repo: string, path: string) => {
  const response = await api.get(`/repos/${repo}/contents/${path}`);
  return response.data;
};

export const getActivityStatus = async (repo: string) => {
  const response = await api.get(`/repos/${repo}/activity-status`);
  return response.data;
};

export const getIssues = async (repo: string) => {
  const response = await api.get(`/repos/${repo}/issues`);
  return response.data;
};

export const getPullRequests = async (repo: string) => {
  const response = await api.get(`/repos/${repo}/pull-requests`);
  return response.data;
};

export const getCommunityHealth = async (repo: string) => {
  const response = await api.get(`/repos/${repo}/community`);
  return response.data;
};

export const getChecks = async (repo: string) => {
  const response = await api.get(`/repos/${repo}/checks`);
  return response.data;
};

export const chat = async (repo_url: string, message: string, context: any, history: any[]) => {
  const response = await api.post(`/chat`, { repo_url, message, context, history });
  return response.data;
};

export const explainFile = async (repo: string, path: string, content?: string) => {
  const response = await api.post('/explain-file', { repo, path, content });
  return response.data;
};

export const explainComprehensive = async (owner: string, repo: string) => {
  const response = await api.post<JobStatus>(`/repos/${owner}/${repo}/explain-comprehensive`);
  return response.data;
};

export const getComprehensiveResult = async (jobId: string) => {
  const response = await api.get<ComprehensiveResult>(`/analyze/${jobId}/result`);
  return response.data;
};

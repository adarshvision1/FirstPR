from __future__ import annotations

from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Dict, Any
from datetime import datetime


class AnalysisRequest(BaseModel):
    repo: str
    ref: str = "main"
    options: Dict[str, Any] = {}


class FileNode(BaseModel):
    path: str
    type: str  # blob, tree
    size: Optional[int] = None
    sha: Optional[str] = None


class DependencyGraph(BaseModel):
    nodes: List[Dict[str, Any]]
    edges: List[Dict[str, Any]]


class FunctionInfo(BaseModel):
    file: str
    name: str
    signature: str
    notes: Optional[str] = None


class AnalysisResult(BaseModel):
    repo: str
    metadata: Dict[str, Any]
    default_branch: str
    file_tree: List[FileNode]
    manifests: Dict[str, str]
    samples: Dict[str, str]
    dependency_graph: DependencyGraph
    top_functions: List[FunctionInfo]
    open_issues: List[Dict[str, Any]]
    discussions: List[Dict[str, Any]]
    contributors: List[Dict[str, Any]]
    # Enhanced fields
    # Enhanced fields matching requirements
    project_summary: Optional[Dict[str, str]] = None  # {one_liner, audience, maturity}
    social_links: Optional[List[Dict[str, str]]] = (
        None  # [{platform: "Discord", url: "..."}]
    )
    architecture_overview: Optional[Dict[str, Any]] = None  # {narrative, components}
    architecture_diagram_mermaid: Optional[str] = None
    folder_structure: Optional[List[Dict[str, Any]]] = None
    core_components_and_functions: Optional[List[Dict[str, Any]]] = None
    tech_stack_detected: Optional[Dict[str, Any]] = None
    development_workflow: Optional[Dict[str, Any]] = (
        None  # {setup_commands, run_local, etc}
    )
    issue_analysis_and_recommendations: Optional[Dict[str, Any]] = None
    firstpr_onboarding_roadmap: Optional[Dict[str, List[str]]] = None
    frequently_asked_questions: Optional[List[Dict[str, str]]] = None
    missing_docs_and_improvements: Optional[List[str]] = None

    # Internal
    rate_limit_remaining: Optional[int] = None
    rate_limit_reset: Optional[str] = None


class JobStatus(BaseModel):
    job_id: str
    status: str  # pending, processing, completed, failed
    created_at: datetime
    completed_at: Optional[datetime] = None
    error: Optional[str] = None


class ChatRequest(BaseModel):
    repo_url: str
    message: str
    history: List[Dict[str, str]] = []


class ExplainFileRequest(BaseModel):
    """Request model for file explanation endpoint"""
    repo: str
    path: str
    content: str | None = None
    context: Optional[Dict[str, Any]] = {}

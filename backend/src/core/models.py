from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class AnalysisRequest(BaseModel):
    repo: str
    ref: str = "main"
    options: dict[str, Any] = {}


class FileNode(BaseModel):
    path: str
    type: str  # blob, tree
    size: int | None = None
    sha: str | None = None


class DependencyGraph(BaseModel):
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]


class FunctionInfo(BaseModel):
    file: str
    name: str
    signature: str
    notes: str | None = None


class AnalysisResult(BaseModel):
    repo: str
    metadata: dict[str, Any]
    default_branch: str
    file_tree: list[FileNode]
    manifests: dict[str, str]
    samples: dict[str, str]
    dependency_graph: DependencyGraph
    top_functions: list[FunctionInfo]
    open_issues: list[dict[str, Any]]
    discussions: list[dict[str, Any]]
    contributors: list[dict[str, Any]]
    # Enhanced fields
    # Enhanced fields matching requirements
    project_summary: dict[str, str] | None = None  # {one_liner, audience, maturity}
    social_links: list[dict[str, str]] | None = (
        None  # [{platform: "Discord", url: "..."}]
    )
    architecture_overview: dict[str, Any] | None = None  # {narrative, components}
    architecture_diagram_mermaid: str | None = None
    folder_structure: list[dict[str, Any]] | None = None
    core_components_and_functions: list[dict[str, Any]] | None = None
    tech_stack_detected: dict[str, Any] | None = None
    development_workflow: dict[str, Any] | None = (
        None  # {setup_commands, run_local, etc}
    )
    issue_analysis_and_recommendations: dict[str, Any] | None = None
    firstpr_onboarding_roadmap: dict[str, list[str]] | None = None
    frequently_asked_questions: list[dict[str, str]] | None = None
    missing_docs_and_improvements: list[str] | None = None

    # Internal
    rate_limit_remaining: int | None = None
    rate_limit_reset: str | None = None


class JobStatus(BaseModel):
    job_id: str
    status: str  # pending, processing, completed, failed
    created_at: datetime
    completed_at: datetime | None = None
    error: str | None = None


class ChatRequest(BaseModel):
    repo_url: str
    message: str
    history: list[dict[str, str]] = []
    context: dict[str, Any] | None = None


class ExplainFileRequest(BaseModel):
    """Request model for file explanation endpoint"""
    repo: str
    path: str
    content: str | None = None

from fastapi import APIRouter, HTTPException, BackgroundTasks, Header
from typing import Optional
from ..core.models import AnalysisRequest, AnalysisResult, JobStatus
from ..services.github import github_client
from ..services.analyzer import analyzer
from ..services.llm import llm_service
from uuid import uuid4
from datetime import datetime
import asyncio

router = APIRouter()

# In-memory job store - Replace with Redis/DB in prod
jobs = {}

async def process_analysis(job_id: str, req: AnalysisRequest, token: Optional[str] = None):
    jobs[job_id]["status"] = "processing"
    try:
        # Handle full URL or owner/repo
        repo_input = req.repo.strip()
        if repo_input.startswith("http"):
            from urllib.parse import urlparse
            path_parts = urlparse(repo_input).path.strip("/").split("/")
            if len(path_parts) >= 2:
                owner, repo_name = path_parts[-2], path_parts[-1]
            else:
                raise ValueError("Invalid repository URL")
        else:
            owner, repo_name = repo_input.split('/')
        
        # Pass token to GitHub client
        metadata = await github_client.get_repo_metadata(owner, repo_name, token=token)
        # Smart branch detection
        if req.ref == "main" and metadata.get("default_branch") and metadata.get("default_branch") != "main":
            ref_to_use = metadata.get("default_branch")
        else:
            ref_to_use = req.ref

        file_tree = await github_client.get_file_tree(owner, repo_name, ref_to_use, token=token)
        
        # Fetch PRs
        raw_prs = await github_client.get_pull_requests(owner, repo_name, token=token)
        
        # Analyze Code
        analysis = await analyzer.analyze_repo(file_tree, "/tmp") # Note: Root path is mock, we use file contents from memory/api ideally
        
        # LLM Generation Bundle
        bundle = {
            "repo": req.repo,
            "metadata": metadata,
            "top_functions": analysis.get("top_functions", []),
            "manifests": analysis.get("manifests", {}),
            "tech_stack": analysis.get("tech_stack", {}),
            "entry_points": analysis.get("entry_points", [])
        }
        llm_result = await llm_service.generate_analysis(bundle)
        
        if llm_result.get("error"):
            # Fallback if LLM fails
            error_msg = f"AI Analysis Failed: {llm_result['error']}"
            llm_result["project_summary"] = {"one_liner": error_msg, "audience": "N/A", "maturity": "N/A"}
            llm_result["architecture_overview"] = {"narrative": "Could not generate architecture overview due to AI error.", "components": []}

        # Create Result
        final_result = AnalysisResult(
            repo=req.repo,
            metadata=metadata,
            default_branch=metadata.get("default_branch", "main"),
            file_tree=[{"path": f["path"], "type": f["type"]} for f in file_tree[:200]],
            manifests=analysis.get("manifests", {}),
            samples={}, 
            dependency_graph=analysis.get("dependency_graph", {"nodes": [], "edges": []}),
            top_functions=[{"file": f.file, "name": f.name, "notes": f.notes} for f in analysis.get("top_functions", [])],
            open_issues=[],
            pull_requests=[{
                "number": pr["number"],
                "title": pr["title"],
                "html_url": pr["html_url"],
                "state": pr["state"],
                "user": {"login": pr["user"]["login"], "avatar_url": pr["user"]["avatar_url"]},
                "created_at": pr["created_at"],
                "updated_at": pr["updated_at"],
                "body": pr.get("body", ""),
                "labels": [{"name": l["name"], "color": l["color"]} for l in pr.get("labels", [])],
                "comments_count": pr.get("comments", 0), # note: list endpoint might not have this, detail does. But 'issues' endpoint does.
                "review_comments_count": pr.get("review_comments", 0) # same note
            } for pr in raw_prs],
            discussions=[],
            contributors=[],
            
            # Mapped Fields
            project_summary=llm_result.get("project_summary"),
            architecture_overview=llm_result.get("architecture_overview"),
            architecture_diagram_mermaid=llm_result.get("architecture_diagram_mermaid"),
            architecture_diagram_plantuml=llm_result.get("architecture_diagram_plantuml"),
            folder_structure=llm_result.get("folder_structure"),
            core_components_and_functions=llm_result.get("core_components_and_functions"),
            tech_stack_detected=llm_result.get("tech_stack_detected") or analysis.get("tech_stack"), # Fallback to static analysis
            development_workflow=llm_result.get("development_workflow"),
            issue_analysis_and_recommendations=llm_result.get("issue_analysis_and_recommendations"),
            firstpr_onboarding_roadmap=llm_result.get("firstpr_onboarding_roadmap"),
            frequently_asked_questions=llm_result.get("frequently_asked_questions"),
            missing_docs_and_improvements=llm_result.get("missing_docs_and_improvements"),
            social_links=llm_result.get("social_links"),
            
            # Rate Limits
            rate_limit_remaining=getattr(github_client, 'last_rate_limit_remaining', None), # Implemented in next step
            rate_limit_reset=getattr(github_client, 'last_rate_limit_reset', None)
        )

        jobs[job_id]["status"] = "completed"
        jobs[job_id]["result"] = final_result
        jobs[job_id]["completed_at"] = datetime.now()
        
    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)

@router.post("/analyze", response_model=JobStatus)
async def start_analysis(
    req: AnalysisRequest, 
    background_tasks: BackgroundTasks,
    x_github_token: Optional[str] = Header(None, alias="X-GitHub-Token")
):
    job_id = str(uuid4())
    jobs[job_id] = {
        "job_id": job_id,
        "status": "pending",
        "created_at": datetime.now()
    }
    # Pass token to background task
    background_tasks.add_task(process_analysis, job_id, req, token=x_github_token)
    return jobs[job_id]

@router.get("/analyze/{job_id}/status", response_model=JobStatus)
async def get_status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return jobs[job_id]

@router.get("/analyze/{job_id}/result", response_model=AnalysisResult)
async def get_result(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    if jobs[job_id]["status"] != "completed":
         raise HTTPException(status_code=400, detail="Job not completed")
    return jobs[job_id]["result"]

@router.get("/repos/{owner}/{repo}/readme")
async def get_readme(owner: str, repo: str, x_github_token: Optional[str] = Header(None, alias="X-GitHub-Token")):
    try:
        content = await github_client.get_file_content(owner, repo, "README.md", token=x_github_token)
        return {"content": content}
    except Exception as e:
         raise HTTPException(status_code=404, detail="README not found")

@router.get("/repos/{owner}/{repo}/tree")
async def get_tree(owner: str, repo: str, ref: str = "main", x_github_token: Optional[str] = Header(None, alias="X-GitHub-Token")):
    try:
        tree = await github_client.get_file_tree(owner, repo, ref, token=x_github_token)
        return {"tree": tree}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

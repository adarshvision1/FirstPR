import asyncio
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException
from fastapi.responses import ORJSONResponse
from pydantic import BaseModel

from ..core.models import AnalysisRequest, AnalysisResult, ChatRequest, JobStatus
from ..services.activity_analyzer import activity_analyzer
from ..services.analyzer import analyzer
from ..services.chat_service import chat_service
from ..services.github import github_client
from ..services.issue_pr_intelligence import issue_pr_intelligence
from ..services.llm import llm_service
from ..services.rules_detector import rules_detector

router = APIRouter(default_response_class=ORJSONResponse)
print("DEBUG: Loading routes.py module")

# In-memory job store - Replace with Redis/DB in prod
jobs = {}

async def process_analysis(job_id: str, req: AnalysisRequest, token: str | None = None):
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
        
        # Analyze Code
        analysis = await analyzer.analyze_repo(file_tree, "/tmp") 

        # 1. Fetch README
        readme_content = ""
        possible_readmes = ["README.md", "readme.md", "README.rst", "README.txt"]
        for rm in possible_readmes:
            try:
                # Check if file exists in tree
                if any(f["path"].lower() == rm.lower() for f in file_tree):
                    readme_content = await github_client.get_file_content(owner, repo_name, rm, token=token)
                    if readme_content:
                        break
            except Exception:
                continue



        # 3. Fetch Issues for Onboarding context
        issues = await github_client.get_issues(owner, repo_name, token=token)
        
        # Fetch Top Discussions
        discussions = await github_client.get_repo_discussions(owner, repo_name, token=token)

        # LLM Generation Bundle
        bundle = {
            "repo": req.repo,
            "metadata": metadata,
            "readme": readme_content,
            "readme": readme_content,
            "issues": issues,
            "top_functions": analysis.get("top_functions", []),
            "manifests": analysis.get("manifests", {}),
            "tech_stack": analysis.get("tech_stack", {}),
            "entry_points": analysis.get("entry_points", []),
            "discussions": discussions
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
            discussions=discussions,
            contributors=[],
            
            # Mapped Fields
            project_summary=llm_result.get("project_summary"),
            social_links=llm_result.get("social_links"),
            architecture_overview=llm_result.get("architecture_overview"),
            architecture_diagram_mermaid=llm_result.get("architecture_diagram_mermaid"),
            folder_structure=llm_result.get("folder_structure"),
            core_components_and_functions=llm_result.get("core_components_and_functions"),

            tech_stack_detected=llm_result.get("tech_stack_detected") or analysis.get("tech_stack"), # Fallback to static analysis
            development_workflow=llm_result.get("development_workflow"),
            issue_analysis_and_recommendations=llm_result.get("issue_analysis_and_recommendations"),
            firstpr_onboarding_roadmap=llm_result.get("firstpr_onboarding_roadmap"),
            frequently_asked_questions=llm_result.get("frequently_asked_questions"),
            missing_docs_and_improvements=llm_result.get("missing_docs_and_improvements"),
            
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
    x_github_token: str | None = Header(None, alias="X-GitHub-Token")
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
async def get_readme(owner: str, repo: str, x_github_token: str | None = Header(None, alias="X-GitHub-Token")):
    try:
        content = await github_client.get_file_content(owner, repo, "README.md", token=x_github_token)
        return {"content": content}
    except Exception:
         raise HTTPException(status_code=404, detail="README not found")

@router.get("/repos/{owner}/{repo}/tree")
async def get_tree(owner: str, repo: str, ref: str = "main", x_github_token: str | None = Header(None, alias="X-GitHub-Token")):
    try:
        tree = await github_client.get_file_tree(owner, repo, ref, token=x_github_token)
        return {"tree": tree}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/repos/{owner}/{repo}/activity-status")
async def get_activity_status(owner: str, repo: str, x_github_token: str | None = Header(None, alias="X-GitHub-Token")):
    try:
        # Parallel fetch of necessary data
        repo_data, commits, issues, prs = await asyncio.gather(
            github_client.get_repo_metadata(owner, repo, token=x_github_token),
            github_client.get_commits(owner, repo, token=x_github_token),
            github_client.get_issues(owner, repo, token=x_github_token),
            github_client.get_pull_requests(owner, repo, token=x_github_token)
        )
        
        result = activity_analyzer.calculate_activity_status(repo_data, commits, issues, prs)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/repos/{owner}/{repo}/checks")
async def get_checks(owner: str, repo: str, x_github_token: str | None = Header(None, alias="X-GitHub-Token")):
    try:
        # Fetch workflow files
        try:
            workflows = await github_client.get_workflow_files(owner, repo, token=x_github_token)
        except Exception:
            workflows = []
            
        checks = rules_detector.detect_ci_checks(workflows)
        return {"checks": checks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/repos/{owner}/{repo}/community")
async def get_community_health(owner: str, repo: str, x_github_token: str | None = Header(None, alias="X-GitHub-Token")):
    print(f"DEBUG: get_community_health called for {owner}/{repo}")
    try:
        # Fetch metadata to get default branch
        metadata = await github_client.get_repo_metadata(owner, repo, token=x_github_token)
        default_branch = metadata.get("default_branch", "main")
        
        # Fetch file tree only (sufficient for most detection)
        # For more advanced detection, we might need file contents
        file_tree = await github_client.get_file_tree(owner, repo, default_branch, token=x_github_token)
        
        # We need prs/issues for bot detection
        prs, issues = await asyncio.gather(
            github_client.get_pull_requests(owner, repo, token=x_github_token, state='all'),
            github_client.get_issues(owner, repo, token=x_github_token)
        )
        
        tools = rules_detector.detect_linting_tools(file_tree, None)
        
        # Get workflows from API for better accuracy
        try:
            workflows = await github_client.get_workflow_files(owner, repo, token=x_github_token)
        except Exception:
            workflows = []
            
        checks = rules_detector.detect_ci_checks(workflows)
        
        bots = rules_detector.detect_bots(prs, issues)
        checklist = rules_detector.generate_checklist(tools, checks)
        
        return {
            "linting_tools": tools,
            "ci_checks": checks,
            "active_bots": bots,
            "compliance_checklist": checklist
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/repos/{owner}/{repo}/contents/{path:path}")
async def get_file_content(owner: str, repo: str, path: str, x_github_token: str | None = Header(None, alias="X-GitHub-Token")):
    try:
        content = await github_client.get_file_content(owner, repo, path, token=x_github_token)
        return {"content": content, "path": path} # Return JSON object
    except Exception:
        raise HTTPException(status_code=404, detail="File not found or too large")

@router.get("/repos/{owner}/{repo}/issues")
async def get_issues(owner: str, repo: str, x_github_token: str | None = Header(None, alias="X-GitHub-Token")):
    try:
        issues = await github_client.get_issues(owner, repo, token=x_github_token)
        ranked_issues = issue_pr_intelligence.rank_issues(issues)
        return {"issues": ranked_issues}
    except Exception as e:
         raise HTTPException(status_code=500, detail=str(e))

@router.get("/repos/{owner}/{repo}/pull-requests")
async def get_pull_requests(owner: str, repo: str, x_github_token: str | None = Header(None, alias="X-GitHub-Token")):
    try:
        prs = await github_client.get_pull_requests(owner, repo, token=x_github_token)
        # For a few recent PRs, fetch details to get size
        detailed_prs = []
        # Optimization: Only fetch details for top 5 to estimate culture
        for pr in prs[:5]:
            # We don't have a get_pr_details method yet in github_client that returns additions/deletions
            # For now, we'll just return the list with basic analysis
            detailed_prs.append(pr)
            
            
        analysis = issue_pr_intelligence.analyze_prs(prs)
        metrics = issue_pr_intelligence.calculate_pr_metrics(detailed_prs)
        
        return {
            "pull_requests": prs, 
            "analysis": analysis,
            "metrics": metrics
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/chat")
async def chat(req: ChatRequest):
    try:
        response = await chat_service.chat(req.message, req.history, req.context)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ExplainFileRequest(BaseModel):
    repo: str
    path: str
    content: str | None = None

@router.post("/explain-file")
async def explain_file(req: ExplainFileRequest, x_github_token: str | None = Header(None, alias="X-GitHub-Token")):
    try:
        content = req.content
        if not content:
            # Simple owner/repo split
            if "github.com" in req.repo:
                parts = req.repo.split("github.com/")[-1].split('/')
            else:
                parts = req.repo.split('/')
                
            if len(parts) >= 2:
                owner, repo = parts[0], parts[1]
                content = await github_client.get_file_content(owner, repo, req.path, token=x_github_token)
            
        if not content:
             return {"explanation": "Could not fetch or read file content."}

        explanation = await llm_service.explain_file(content, req.path, {"repo": req.repo})
        return {"explanation": explanation}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))



import asyncio
import logging
from datetime import datetime
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Header, HTTPException
from fastapi.responses import ORJSONResponse

from ..core.models import (
    AnalysisRequest,
    AnalysisResult,
    ChatRequest,
    ExplainFileRequest,
    JobStatus,
)
from ..services.activity_analyzer import activity_analyzer
from ..services.analyzer import analyzer
from ..services.chat_service import chat_service
from ..services.chunking import chunk_file, budget_chunks
from ..services.github import github_client
from ..services.issue_pr_intelligence import issue_pr_intelligence
from ..services.llm import llm_service
from ..services.prompt_composer import prompt_composer_service
from ..services.rules_detector import rules_detector

logger = logging.getLogger(__name__)
router = APIRouter(default_response_class=ORJSONResponse)

# In-memory job store - TODO: Replace with Redis/DB in production
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
    """Get community health metrics including linting tools, CI checks, and active bots"""
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
        logger.exception(f"Error in get_community_health for {owner}/{repo}")
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
        response = await chat_service.chat(req.message, req.history, req.context or {})
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/explain-file")
async def explain_file(req: ExplainFileRequest, x_github_token: str | None = Header(None, alias="X-GitHub-Token")):
    """Explain a specific file using AI"""
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
        logger.exception(f"Error explaining file {req.path} from {req.repo}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/repos/{owner}/{repo}/explain-comprehensive")
async def explain_comprehensive(
    owner: str, 
    repo: str, 
    background_tasks: BackgroundTasks,
    x_github_token: str | None = Header(None, alias="X-GitHub-Token")
):
    """
    Generate comprehensive repository explanation using two-step LLM pipeline.
    
    This endpoint:
    1. Fetches and chunks repository files
    2. Uses Prompt Composer to optimize the prompt
    3. Generates comprehensive onboarding guide
    
    Returns a job_id for async processing.
    """
    job_id = str(uuid4())
    jobs[job_id] = {
        "job_id": job_id,
        "status": "pending",
        "created_at": datetime.now()
    }
    
    async def process_comprehensive_explanation():
        """Background task for comprehensive explanation generation."""
        jobs[job_id]["status"] = "processing"
        try:
            # Fetch repository metadata
            metadata = await github_client.get_repo_metadata(owner, repo, token=x_github_token)
            default_branch = metadata.get("default_branch", "main")
            
            # Fetch file tree
            file_tree = await github_client.get_file_tree(owner, repo, default_branch, token=x_github_token)
            
            # Priority file paths to fetch
            priority_files = [
                "README.md", "README.rst", "README.txt",
                "CONTRIBUTING.md", "CONTRIBUTING.rst",
                "LICENSE", "LICENSE.md",
                "CODE_OF_CONDUCT.md",
                "CHANGELOG.md", "HISTORY.md",
                "package.json", "pyproject.toml", "Cargo.toml", "go.mod",
                "requirements.txt", "Pipfile",
                "Dockerfile", "docker-compose.yml",
                "Makefile"
            ]
            
            # Find entry points from file tree
            entry_points = []
            for node in file_tree:
                path = node.get("path", "")
                if any(path.endswith(ep) for ep in [
                    "main.py", "app.py", "__main__.py", 
                    "index.js", "server.js", "main.js",
                    "src/index.tsx", "src/main.ts", "src/App.tsx"
                ]):
                    entry_points.append(path)
            
            # Collect files to chunk
            files_to_chunk = []
            
            # Fetch priority files and entry points
            target_files = set(priority_files + entry_points)
            for target_file in target_files:
                # Check if file exists in tree
                if any(node.get("path") == target_file for node in file_tree):
                    try:
                        content = await github_client.get_file_content(
                            owner, repo, target_file, token=x_github_token
                        )
                        if content:
                            files_to_chunk.append({
                                "path": target_file,
                                "content": content
                            })
                    except Exception as e:
                        logger.warning(f"Could not fetch {target_file}: {e}")
            
            # Also fetch docs/ directory files (limit to 10)
            docs_files = [
                node for node in file_tree 
                if node.get("path", "").startswith("docs/") and node.get("path", "").endswith(".md")
            ][:10]
            
            for doc_file in docs_files:
                try:
                    content = await github_client.get_file_content(
                        owner, repo, doc_file["path"], token=x_github_token
                    )
                    if content:
                        files_to_chunk.append({
                            "path": doc_file["path"],
                            "content": content
                        })
                except Exception as e:
                    logger.warning(f"Could not fetch {doc_file['path']}: {e}")
            
            # Chunk all collected files
            all_chunks = []
            for file_data in files_to_chunk:
                chunks = chunk_file(file_data["content"], file_data["path"])
                all_chunks.extend(chunks)
            
            logger.info(f"Created {len(all_chunks)} chunks from {len(files_to_chunk)} files")
            
            # Budget chunks to fit within token limits
            budgeted = budget_chunks(all_chunks)
            selected_chunks = budgeted["selected"]
            
            logger.info(
                f"Selected {len(selected_chunks)} chunks "
                f"({budgeted['total_tokens_used']} tokens estimated)"
            )
            
            # Prepare repo metadata for prompt composer
            repo_metadata = {
                "name": f"{owner}/{repo}",
                "description": metadata.get("description", "N/A"),
                "language": metadata.get("language", "N/A"),
                "stars": metadata.get("stargazers_count", 0),
                "open_issues": metadata.get("open_issues_count", 0)
            }
            
            # Call comprehensive explanation service (two-step pipeline)
            result = await prompt_composer_service.explain_comprehensive(
                selected_chunks, repo_metadata
            )
            
            if "error" in result:
                jobs[job_id]["status"] = "failed"
                jobs[job_id]["error"] = result["error"]
            else:
                jobs[job_id]["status"] = "completed"
                jobs[job_id]["result"] = result
                jobs[job_id]["completed_at"] = datetime.now()
                
        except Exception as e:
            logger.exception(f"Comprehensive explanation failed for {owner}/{repo}")
            jobs[job_id]["status"] = "failed"
            jobs[job_id]["error"] = str(e)
    
    background_tasks.add_task(process_comprehensive_explanation)
    return jobs[job_id]



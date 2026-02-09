

from google import genai
from google.genai import types
from ..core.config import settings
from typing import List, Dict, Any


class ChatService:
    def __init__(self):
        if settings.GOOGLE_API_KEY:
            self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
            self.model_name = "gemini-2.0-flash-thinking-exp-01-21"
        else:
            self.client = None
            self.model_name = None

    def _format_issues(self, issues_data: Dict[str, Any]) -> str:
        if not issues_data or not isinstance(issues_data, dict):
            return "No issue analysis available."

        top_candidates = issues_data.get("top_candidates", [])
        if not top_candidates or not isinstance(top_candidates, list):
            return "No suitable 'good first issues' found."

        formatted = []
        for issue in top_candidates[:5]:
            if isinstance(issue, dict):
                formatted.append(
                    f"- Issue #{issue.get('number')}: {issue.get('title')} (Score: {issue.get('score')})"
                )
            elif isinstance(issue, str):
                formatted.append(f"- Issue: {issue}")

        return "\n".join(formatted) if formatted else "No suitable issues found."

    def _format_workflow(self, workflow: Dict[str, Any]) -> str:
        if not workflow or not isinstance(workflow, dict):
            return "No development workflow detected."

        parts = []
        if workflow.get("setup_commands") and isinstance(
            workflow["setup_commands"], list
        ):
            parts.append(
                f"- Setup: {', '.join([str(c) for c in workflow['setup_commands']])}"
            )
        if workflow.get("run_local") and isinstance(workflow["run_local"], list):
            parts.append(f"- Run: {', '.join([str(c) for c in workflow['run_local']])}")
        if workflow.get("test_commands") and isinstance(
            workflow["test_commands"], list
        ):
            parts.append(
                f"- Test: {', '.join([str(c) for c in workflow['test_commands']])}"
            )

        return "\n".join(parts) if parts else "No specific workflow commands found."

    def _format_folders(self, folders: List[Dict[str, str]]) -> str:
        if not folders or not isinstance(folders, list):
            return "No folder structure analysis available."

        formatted = []
        for folder in folders[:10]:
            if isinstance(folder, dict):
                formatted.append(
                    f"- {folder.get('path')}: {folder.get('responsibility', 'N/A')}"
                )
            elif isinstance(folder, str):
                formatted.append(f"- {folder}")

        return "\n".join(formatted) if formatted else "No folder structure available."

    async def chat(
        self, message: str, history: List[Dict[str, str]], context: Dict[str, Any]
    ) -> Dict[str, str]:
        if not self.client:
            return {
                "answer": "Error: LLM API Key not configured. Please check .env file."
            }

        try:
            # Context Extraction
            repo_name = context.get("repo_name", "Unknown Repository")

            # Check for full analysis result
            analysis = context.get("analysis", {})

            context_str = ""

            if analysis:
                # Rich context from analysis result
                project_summary = analysis.get("project_summary")
                if not isinstance(project_summary, dict):
                    project_summary = {}

                arch = analysis.get("architecture_overview")
                if not isinstance(arch, dict):
                    arch = {}

                tech = analysis.get("tech_stack_detected")
                if not isinstance(tech, dict):
                    tech = {}

                metadata = analysis.get("metadata")
                if not isinstance(metadata, dict):
                    metadata = {}

                context_str = f"""
                # Project Overview
                - Description: {metadata.get("description", "N/A")}
                - Summary: {project_summary.get("one_liner", "N/A")}
                - Target Audience: {project_summary.get("audience", "N/A")}
                
                # Architecture
                - Narrative: {arch.get("narrative", "N/A")}
                - Key Components: {", ".join([c["name"] for c in (arch.get("components") or [])])}
                
                # Technology Stack
                - Languages: {", ".join(tech.get("languages") or [])}
                - Frameworks: {", ".join(tech.get("frameworks") or [])}
                
                # Key Functions
                - {", ".join([f"{f['name']} (in {f['file']})" for f in (analysis.get("top_functions") or [])[:10]])}

                # Issue Analysis & Recommendations
                {self._format_issues(analysis.get("issue_analysis_and_recommendations", {}))}

                # Development Workflow
                {self._format_workflow(analysis.get("development_workflow", {}))}

                # Folder Structure
                {self._format_folders(analysis.get("folder_structure", []))}
                """
            else:
                # Fallback to limited context
                activity = context.get("activity", {})
                rules = context.get("rules", {})

                activity_status = activity.get("activity_status", "Unknown")
                activity_explanation = activity.get("explanation", "")

                linting_tools = [t["name"] for t in (rules.get("linting_tools") or [])]
                ci_checks = rules.get("ci_checks") or []
                active_bots = rules.get("active_bots") or []

                context_str = f"""
                # Repository Context (Limited)
                - Activity Status: {activity_status}
                - Activity Explanation: {activity_explanation}
                - Linting Tools: {", ".join(linting_tools) if linting_tools else "None detected"}
                - CI Checks: {len(ci_checks)} workflows ({", ".join(c.get("name", "Unknown") for c in ci_checks[:5])}...)
                - Active Bots: {", ".join(active_bots) if active_bots else "None detected"}
                """

            system_prompt = f"""
            You are a helpful expert contributor assistant for the '{repo_name}' repository.
            Your goal is to help new contributors understand the project, find issues, and follow rules.
            
            {context_str}
            
            # Guidelines
            - Answer questions strictly based on the provided context.
            - If you don't know something, say "I don't have enough information about that."
            - Be encouraging and clear.
            - When asked where to start, suggest looking for "good first issues" if mentioned in context, or reading CONTRIBUTING.md.
            
            # User Question
            {message}
            """

            # Simple history handling (append previous QA if needed, but for now we rely on system prompt + current msg)
            # In a real app, we'd pass full history to start_chat

            print("DEBUG: Sending prompt to LLM...")
            # print(f"DEBUG: System Prompt: {system_prompt[:500]}...") # Log partial prompt
            
            # Using the new SDK's async generation
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=system_prompt,
                config=types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(include_thoughts=True)
                )
            )
            
            print("DEBUG: LLM Response received")
            return {"answer": response.text}
        except Exception as e:
            print(f"ERROR in chat_service: {str(e)}")
            import traceback

            traceback.print_exc()
            return {
                "answer": f"I encountered an error processing your request: {str(e)}"
            }


chat_service = ChatService()

import json
import logging
from typing import Any, Dict, Optional

from google import genai
from google.genai import types
from pydantic import ValidationError

# Assuming you have a config module
from ..core.config import settings

# Setup logger
logger = logging.getLogger(__name__)

class GeminiService:
    def __init__(self):
        """
        Initialize the Gemini Client.
        """
        if settings.GOOGLE_API_KEY:
            # CORRECTED: Removed invalid 'vertexai' arg. 
            # The client automatically handles connection details based on the API Key.
            self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
            
            # CORRECTED: Using the valid model ID that supports ThinkingConfig.
            # "gemini-3-pro" does not exist yet. 
            # Current SOTA for reasoning is Gemini 2.0 Flash Thinking.
            self.model_name = "gemini-2.0-flash-thinking-exp-01-21" 
        else:
            self.client = None
            self.model_name = None
            logger.warning("GOOGLE_API_KEY not found. GeminiService disabled.")

    async def generate_analysis(self, bundle: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generates a deep technical analysis using a Thinking model.
        """
        if not self.client:
            return {"error": "LLM API Key not configured"}

        # --- Context Preparation (Preserved logic) ---
        repo_name = bundle.get("repo", "Unknown Repo")
        metadata = bundle.get("metadata", {})
        tech_stack = bundle.get("tech_stack", {})

        # Truncate manifests
        manifests = {}
        for k, v in bundle.get("manifests", {}).items():
            manifests[k] = v[:2000] + "..." if len(v) > 2000 else v

        # Prepare Discussions
        discussions_context = "No discussions available."
        discussions = bundle.get("discussions", [])
        if isinstance(discussions, list) and discussions:
            discussions_summary = []
            for d in discussions[:5]:
                title = d.get("title", "N/A")
                body = str(d.get("body", ""))[:200].replace("\n", " ")
                comments = d.get("comments", 0)
                discussions_summary.append(f"- {title}: {body}... ({comments} comments)")
            discussions_context = "\n".join(discussions_summary)

        # Prepare Files & Issues
        readme = bundle.get("readme", "")[:5000]
        core_files_context = ""
        for path, content in bundle.get("core_files", {}).items():
            core_files_context += f"--- FILE: {path} ---\n{content[:3000]}\n\n"

        issues_context = ""
        for i in bundle.get("issues", [])[:5]:
            labels = [l['name'] for l in i.get('labels', [])]
            issues_context += f"Issue #{i.get('number')}: {i.get('title')} (Labels: {labels})\n"

        # --- Prompt Engineering ---
        prompt = f"""
        <role>
        You are a principal software architect onboarding a contributor to '{repo_name}'.
        </role>

        <context>
        <metadata>
        Description: {metadata.get("description", "N/A")}
        Language: {metadata.get("language", "N/A")}
        Stack: {tech_stack}
        Entry Points: {bundle.get("entry_points", [])}
        Top Functions: {[f.name for f in bundle.get("top_functions", [])][:10]}
        </metadata>

        <readme>
        {readme}
        </readme>

        <issues>
        {issues_context}
        </issues>

        <discussions>
        {discussions_context}
        </discussions>

        <manifests>
        {manifests}
        </manifests>
        </context>

        <task>
        Analyze the context to produce a **DEEP technical analysis** and **onboarding plan**.
        
        CRITICAL:
        1. Explain data flow and architecture, not just components.
        2. Create a realistic Day 1-7 roadmap based on `entry_points` and `issues`.
        </task>

        <constraints>
        1. Output MUST be valid JSON.
        2. MermaidJS diagrams must be valid syntax.
        3. No markdown formatting (no ```json blocks) in the final output string if possible.
        </constraints>

        <output_format>
        Return a JSON object with this EXACT schema:
        {{
            "project_summary": {{ "one_liner": "...", "audience": "...", "maturity": "..." }},
            "architecture_overview": {{ 
                "narrative": "...", 
                "components": [{{ "name": "...", "purpose": "..." }}], 
                "tech_stack_reasoning": [{{ "technology": "...", "reasoning": "..." }}] 
            }},
            "architecture_diagram_mermaid": "graph TD; ...",
            "folder_structure": [ {{ "path": "...", "responsibility": "..." }} ],
            "core_components_and_functions": [ {{ "symbol": "...", "purpose": "..." }} ],
            "tech_stack_detected": {{ "languages": [...], "frameworks": [...] }},
            "development_workflow": {{ "setup_commands": [...], "run_local": [...], "test_commands": [...] }},
            "issue_analysis_and_recommendations": {{ "top_candidates": [...] }},
            "firstpr_onboarding_roadmap": {{ "day0": [...], "day1": [...], "day2_3": [...], "day4_7": [...] }},
            "social_links": [ {{ "platform": "...", "url": "..." }} ],
            "frequently_asked_questions": [ {{ "question": "...", "answer": "..." }} ],
            "missing_docs_and_improvements": [...]
        }}
        </output_format>
        """

        try:
            # CORRECTED: ThinkingConfig syntax update.
            # include_thoughts=True is the standard way to enable reasoning in the public SDK.
            config = types.GenerateContentConfig(
                response_mime_type="application/json",
                thinking_config=types.ThinkingConfig(include_thoughts=True)
            )

            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config
            )

            # --- Robust JSON Extraction ---
            text = response.text.strip()
            
            # Remove Markdown blocks if the model ignored instructions
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"): # Generic block
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
            
            text = text.strip()

            try:
                result = json.loads(text)

                # Fix Mermaid Syntax in post-processing
                if "architecture_diagram_mermaid" in result:
                    diag = result["architecture_diagram_mermaid"]
                    # Remove potential markdown wrapping inside the JSON value
                    diag = diag.replace("```mermaid", "").replace("```", "").strip()
                    result["architecture_diagram_mermaid"] = diag

                return result

            except json.JSONDecodeError as je:
                logger.error(f"JSON Decode Error: {je}")
                # Fallback: Return raw text wrapped in error for debugging
                return {
                    "error": "Failed to parse LLM response", 
                    "raw_partial": text[:1000]
                }

        except Exception as e:
            logger.error(f"LLM Generation failed: {e}")
            return {"error": str(e)}

    async def explain_file(self, code: str, path: str, context: Dict[str, Any]) -> str:
        if not self.client:
            return "Error: LLM API Key not configured."

        repo_name = context.get("repo", "Unknown")

        prompt = f"""
        You are an expert developer explaining a file from '{repo_name}'.
        File: {path}
        
        Code:
        ```
        {code[:10000]} 
        ```
        
        Task:
        1. Purpose?
        2. Key classes/functions?
        3. Relation to project?
        
        Concise (under 200 words). Markdown allowed.
        """

        try:
            # Note: Not using thinking models for simple explanations to save latency/quota
            # Switching to a standard fast model for this specific task is often better
            # but we use self.model_name here for consistency.
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            return response.text
        except Exception as e:
            return f"Failed to explain file: {str(e)}"

# Instantiate
llm_service = GeminiService()

from typing import Any


from google import genai
from google.genai import types

from ..core.config import settings

class GeminiService:
    def __init__(self):
        if settings.GOOGLE_API_KEY:
            self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
            self.model_name = "gemini-2.0-flash-thinking-exp-01-21"
        else:
            self.client = None
            self.model_name = None

    async def generate_analysis(self, bundle: dict[str, Any]) -> dict[str, Any]:
        if not self.client:
            return {"error": "LLM API Key not configured"}

        # context optimization: limit top functions and file tree size
        repo_name = bundle.get("repo", "Unknown Repo")
        metadata = bundle.get("metadata", {})
        tech_stack = bundle.get("tech_stack", {})

        # Truncate manifests to avoid token limits
        manifests = {}
        for k, v in bundle.get("manifests", {}).items():
            manifests[k] = v[:2000] + "..." if len(v) > 2000 else v

        # Prepare Discussions Summary for Context
        discussions_context = "No discussions available."
        discussions = bundle.get("discussions", [])
        if discussions and isinstance(discussions, list):
            discussions_summary = []
            for d in discussions[:5]:
                title = d.get("title", "N/A")
                body = d.get("body", "")[:200].replace("\n", " ") + "..."
                comments = d.get("comments", 0)
                discussions_summary.append(f"- [Components/Topic] {title}: {body} ({comments} comments)")
            discussions_context = "\n".join(discussions_summary)

        # Prepare Context
        readme = bundle.get("readme", "")[:5000] # Truncate README
        core_files = bundle.get("core_files", {})
        core_files_context = ""
        for path, content in core_files.items():
            core_files_context += f"--- FILE: {path} ---\n{content[:3000]}\n\n" # 3k char limit per file

        issues = bundle.get("issues", [])
        issues_context = ""
        if issues:
            for i in issues[:5]: # Top 5 issues
                issues_context += f"Issue #{i.get('number')}: {i.get('title')} (Labels: {[l['name'] for l in i.get('labels', [])]})\n"

        prompt = f"""
        <role>
        You are a principal software architect and open-source mentor onboarding a new contributor to the '{repo_name}' repository.
        You are precise, insightful, and focused on "deep understanding" rather than surface-level observation.
        </role>

        <context>
        <metadata>
        Description: {metadata.get("description", "N/A")}
        Language: {metadata.get("language", "N/A")}
        Detected Tech Stack: {tech_stack}
        Entry Points: {bundle.get("entry_points", [])}
        Top Initial Functions: {[f.name for f in bundle.get("top_functions", [])][:10]}
        </metadata>

        <readme_snippet>
        {readme}
        </readme_snippet>

        <open_issues>
        {issues_context}
        </open_issues>

        <community_insights>
        {discussions_context}
        </community_insights>

        <manifests>
        {manifests}
        </manifests>
        </context>

        <task>
        Analyze the provided context to produce a **DEEP, insightful technical analysis** and a **detailed, practical onboarding plan**.
        
        CRITICAL FOCUS AREAS:
        1. **Architecture**: Don't just list components. Explain the *flow* of data and control.
        2. **Onboarding**: Create a realistic Day 1-7 roadmap based on the actual identified `entry_points` and `open_issues`.
        </task>

        <constraints>
        1. Output MUST be valid JSON.
        2. No Markdown formatting (no ```json blocks).
        3. Ensure `architecture_diagram_mermaid` is valid MermaidJS syntax.
        4. Be concise but deep. Avoid fluff.
        </constraints>

        <output_format>
        Return a JSON object with this EXACT schema:
        {{
            "project_summary": {{ "one_liner": "...", "audience": "...", "maturity": "..." }},
            "architecture_overview": {{ 
                "narrative": "High-level narrative of system design. Explain data flow, key abstractions, and design patterns.", 
                "components": [{{ "name": "...", "purpose": "..." }}], 
                "tech_stack_reasoning": [{{ "technology": "...", "purpose": "...", "reasoning": "Why was this chosen?" }}] 
            }},
            "architecture_diagram_mermaid": "graph TD; ...",
            "folder_structure": [ {{ "path": "...", "responsibility": "..." }} ],
            "core_components_and_functions": [ {{ "symbol": "...", "purpose": "Deep dive interaction analysis." }} ],
            "tech_stack_detected": {{ "languages": [...], "frameworks": [...] }},
            "development_workflow": {{ "setup_commands": ["..."], "run_local": ["..."], "test_commands": ["..."] }},
            "issue_analysis_and_recommendations": {{ "top_candidates": ["..."] }},
            "firstpr_onboarding_roadmap": {{ 
                "day0": ["..."], 
                "day1": ["..."], 
                "day2_3": ["..."], 
                "day4_7": ["..."] 
            }},
            "social_links": [ {{ "platform": "...", "url": "..." }} ],
            "frequently_asked_questions": [ {{ "question": "...", "answer": "..." }} ],
            "missing_docs_and_improvements": ["..."]
        }}
        </output_format>
        """

        try:
            # Using the new SDK's async generation
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    thinking_config=types.ThinkingConfig(include_thoughts=True)
                )
            )
            
            text = response.text.strip()
            # Handle potential markdown code blocks in thinking model output
            if text.startswith("```json"):
                text = text.split("```json")[1].split("```")[0].strip()
            elif text.startswith("```"):
                text = text.split("```")[1].split("```")[0].strip()
            # Clean up markdown code blocks if present (though response_mime_type should handle it)
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
            if text.startswith("```"):
                text = text[3:]

            import json

            try:
                result = json.loads(text)

                # Fix Mermaid Syntax: Remove markdown code blocks if present in the value
                if "architecture_diagram_mermaid" in result:
                    diag = result["architecture_diagram_mermaid"]
                    if "```" in diag:
                        diag = diag.replace("```mermaid", "").replace("```", "").strip()
                    result["architecture_diagram_mermaid"] = diag

                return result
            except json.JSONDecodeError:
                # Fallback: try to repair or just return partial
                print(f"JSON Decode Error. Raw text snippet: {text[:100]}...")
                return {"error": "Failed to parse LLM response", "raw": text[:500]}

        except Exception as e:
            with open("llm_debug.log", "a") as f:
                f.write(f"Error: {str(e)}\n")
            print(f"LLM Generation failed: {e}")
            return {"error": str(e)}

    async def explain_file(self, code: str, path: str, context: dict[str, Any]) -> str:
        if not self.client:
            return "Error: LLM API Key not configured."

        repo_name = context.get("repo", "Unknown")

        prompt = f"""
        You are an expert developer explaining a file from the '{repo_name}' repository.
        File Path: {path}
        
        ## Code Content
        ```
        {code[:10000]} 
        ```
        (Code truncated if too long)
        
        ## Task
        Provide a concise explanation of this file.
        1. What is its primary purpose?
        2. Key functions or classes?
        3. How does it fit into the broader project (if inferable)?
        
        Keep it robust but concise (under 200 words). Use markdown.
        """

        try:
            response = await self.client.aio.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    thinking_config=types.ThinkingConfig(include_thoughts=True)
                )
            )
            return response.text
        except Exception as e:
            return f"Failed to explain file: {str(e)}"

llm_service = GeminiService()

from typing import Any

from google import genai
from google.genai import types

from ..core.config import settings


class GeminiService:
    def __init__(self):
        if settings.GOOGLE_API_KEY:
            self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
            self.model_name = "gemini-3-pro-preview"
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

        prompt = f"""
        You are a senior technical lead onboarding a new developer to the '{repo_name}' repository.
        Analyze the provided context and generate a structural onboarding guide in JSON format.
        
        ## Context
        Description: {metadata.get("description", "N/A")}
        Language: {metadata.get("language", "N/A")}
        Detected Tech Stack: {tech_stack}
        Entry Points: {bundle.get("entry_points", [])}
        Top Initial Functions: {[f.name for f in bundle.get("top_functions", [])][:10]}
        Manifest Files: {list(manifests.keys())}
        Manifest Content Preview: {manifests}
        
        ## Output Requirement
        Return VALID JSON (no markdown formatting) with these exact keys:
        {{
            "project_summary": {{ "one_liner": "...", "audience": "...", "maturity": "..." }},
            "architecture_overview": {{ "narrative": "...", "components": [{{ "name": "...", "purpose": "..." }}], "tech_stack_reasoning": [{{ "technology": "...", "purpose": "...", "reasoning": "..." }}] }},
            "architecture_diagram_mermaid": "graph TD; ...",
            "folder_structure": [ {{ "path": "...", "responsibility": "..." }} ],
            "core_components_and_functions": [ {{ "symbol": "...", "purpose": "..." }} ],
            "tech_stack_detected": {{ "languages": [...], "frameworks": [...] }},
            "development_workflow": {{ "setup_commands": ["..."], "run_local": ["..."], "test_commands": ["..."] }},
            "issue_analysis_and_recommendations": {{ "top_candidates": ["..."] }},
            "firstpr_onboarding_roadmap": {{ "day0": ["..."], "day1": ["..."], "day2_3": ["..."], "day4_7": ["..."] }},
            "social_links": [ {{ "platform": "Discord/Twitter/etc", "url": "..." }} ],
            "frequently_asked_questions": [ {{ "question": "...", "answer": "..." }} ],
            "missing_docs_and_improvements": ["..." ]
        }}
        
        Ensure 'architecture_diagram_mermaid' is a valid MermaidJS string.
        """

        try:
            # Add safety settings to reduce likelihood of blocked responses
            config = types.GenerateContentConfig(
                safety_settings=[
                    types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
                    types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
                    types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
                    types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
                ]
            )
            
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=config
            )
            
            if not response.text:
                 return {"error": "Empty response from LLM"}

            text = response.text.strip()
            
            # Clean up markdown code blocks if present
            if "```json" in text:
                text = text.split("```json")[1].split("```\n")[0].strip()
            elif "```" in text:
                text = text.split("```\n")[1].split("```\n")[0].strip()

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
            except json.JSONDecodeError as je:
                # Try to find JSON within the text if the above fails
                import re
                json_match = re.search(r'(\{.*\})', text, re.DOTALL)
                if json_match:
                    try:
                        return json.loads(json_match.group(1))
                    except:
                        pass
                
                print(f"JSON Decode Error: {je}. Raw text snippet: {text[:100]}...")
                return {"error": "Failed to parse LLM response as JSON", "raw": text[:500]}

        except Exception as e:
            with open("llm_debug.log", "a") as f:
                import datetime
                f.write(f"[{datetime.datetime.now()}] Error: {str(e)}\n")
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
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt
            )
            return response.text
        except Exception as e:
            return f"Failed to explain file: {str(e)}"


llm_service = GeminiService()
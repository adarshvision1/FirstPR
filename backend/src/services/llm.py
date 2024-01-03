import google.generativeai as genai
from ..core.config import settings
from typing import Dict, Any

class GeminiService:
    def __init__(self):
        if settings.GOOGLE_API_KEY:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            self.model = genai.GenerativeModel('gemini-3-flash-preview')
        else:
            self.model = None

    async def generate_analysis(self, bundle: Dict[str, Any]) -> Dict[str, Any]:
        if not self.model:
            return {"error": "LLM API Key not configured"}
            
        # context optimization: limit top functions and file tree size
        repo_name = bundle.get('repo', 'Unknown Repo')
        metadata = bundle.get('metadata', {})
        tech_stack = bundle.get('tech_stack', {})
        
        # Truncate manifests to avoid token limits
        manifests = {}
        for k, v in bundle.get('manifests', {}).items():
            manifests[k] = v[:2000] + "..." if len(v) > 2000 else v
        
        prompt = f"""
        You are a senior technical lead onboarding a new developer to the '{repo_name}' repository.
        Analyze the provided context and generate a structural onboarding guide in JSON format.
        
        ## Context
        Description: {metadata.get('description', 'N/A')}
        Language: {metadata.get('language', 'N/A')}
        Detected Tech Stack: {tech_stack}
        Entry Points: {bundle.get('entry_points', [])}
        Top Initial Functions: {[f.name for f in bundle.get('top_functions', [])][:10]}
        Manifest Files: {list(manifests.keys())}
        Manifest Content Preview: {manifests}
        
        ## Output Requirement
        Return VALID JSON with these exact keys:
        {{
            "project_summary": {{ "one_liner": "...", "audience": "...", "maturity": "..." }},
            "social_links": [ {{ "platform": "Discord|Slack|Twitter|etc", "url": "..." }} ],
            "architecture_overview": {{ "narrative": "...", "components": [{{ "name": "...", "purpose": "..." }}] }},
            "architecture_diagram_plantuml": "@startuml ... @enduml",
            "folder_structure": [ {{ "path": "...", "responsibility": "..." }} ],
            "core_components_and_functions": [ {{ "symbol": "...", "purpose": "..." }} ],
            "tech_stack_detected": {{ "languages": [...], "frameworks": [...] }},
            "development_workflow": {{ "setup_commands": ["..."], "run_local": ["..."], "test_commands": ["..."] }},
            "issue_analysis_and_recommendations": {{ "top_candidates": ["..."] }},
            "firstpr_onboarding_roadmap": {{ "day0": ["..."], "day1": ["..."], "day2_3": ["..."], "day4_7": ["..."] }},
            "frequently_asked_questions": [ {{ "question": "...", "answer": "..." }} ],
            "missing_docs_and_improvements": ["..."]
        }}
        
        Ensure 'architecture_diagram_plantuml' is a valid PlantUML Sequence or Component diagram string starting with @startuml and ending with @enduml.
        For 'social_links', inspect the context for any mentions of community channels like Discord, Slack, Twitter, etc.
        """
        
        for attempt in range(3):
            try:
                # generation_config for Gemini 3
                generation_config = genai.types.GenerationConfig(
                    response_mime_type="application/json"
                )

                response = await self.model.generate_content_async(
                    prompt,
                    generation_config=generation_config
                )
                text = response.text.strip()
                    
                import json
                try:
                    return json.loads(text)
                except json.JSONDecodeError:
                    # Fallback: try to repair or just return partial
                    print(f"JSON Decode Error. Raw text snippet: {text[:100]}...")
                    return {"error": "Failed to parse LLM response", "raw": text[:500]}
            except Exception as e:
                if "429" in str(e):
                    print(f"Rate limit hit (attempt {attempt+1}/3). Retrying in {2**attempt}s...")
                    import asyncio
                    await asyncio.sleep(2**attempt)
                    continue
                
                with open("llm_debug.log", "a") as f:
                    f.write(f"Error: {str(e)}\n")
                print(f"LLM Generation failed: {e}")
                return {"error": str(e)}
        
        return {"error": "Rate limit exceeded after retries."}

llm_service = GeminiService()

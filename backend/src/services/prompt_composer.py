"""
Prompt Composer Service for meta-prompt generation.

This service implements the first step of the two-step LLM pipeline:
generating optimized prompts that will be used for final repository explanation.
"""

import json
import logging
from typing import Any

from google import genai
from google.genai import types

from ..core.config import settings
from .chunking import (
    classify_chunk_type,
    generate_quick_summary,
)

logger = logging.getLogger(__name__)

# Template for Prompt Composer
PROMPT_COMPOSER_TEMPLATE = """
You are a Prompt Engineering Expert. Your task is to create an optimized system + user prompt for explaining a repository to new contributors.

## Available Chunks
You have {chunk_count} chunks of repository data:

{chunk_manifest}

Each chunk has:
- ID: Unique identifier
- Path: File path
- Type: [readme/docs/code/config/test]
- Size: Character count
- Summary: Brief description

## Your Task
Generate a prompt that will be sent to another LLM to produce a comprehensive repository explanation.

Your generated prompt should:
1. Include the MOST IMPORTANT chunks verbatim (especially README, CONTRIBUTING, key entry points)
2. Reference other chunks by summary only
3. Structure information to produce these sections:
   - Project Snapshot
   - Guided Tour
   - Architecture Map
   - Module/Package View
   - File-Level Explanations
   - Sequence Diagrams
   - Tests & Local Runbook
   - Issues & PR Integration
   - Glossary
   - Learning Path

## Decision Criteria
Include verbatim if:
- README or CONTRIBUTING files (highest priority)
- Entry point files (main.py, index.js, etc.)
- Core architecture files
- Chunk size < 1000 chars
- Contains unique configuration or setup instructions

Summarize if:
- Large code files (>2000 chars)
- Repetitive test files
- Generated files (package-lock.json, etc.)
- Secondary documentation

## Output Format
Return a JSON object with these exact keys:
{{
    "system_prompt": "Instructions for the final LLM explaining how to structure the analysis...",
    "user_prompt_prefix": "Context about the repository...",
    "chunks_verbatim": ["chunk_id_1", "chunk_id_2", ...],
    "chunks_summarized": ["chunk_id_3", "chunk_id_4", ...],
    "reasoning": "Brief explanation of your choices"
}}

The system_prompt should be comprehensive instructions for generating the structured output.
The user_prompt_prefix should introduce the repository and set context.
Ensure the combined prompt stays within 990,000 tokens (~3.96M characters).

Provide ONLY the JSON output, no additional text.
"""

# Template for Final Repository Explanation
FINAL_EXPLANATION_SYSTEM_PROMPT = """
You are an expert technical mentor onboarding a new open-source contributor to a repository.

## Your Mission
Create a comprehensive, well-structured guide that helps the contributor:
1. Understand what the project does and why it exists
2. Navigate the codebase confidently
3. Understand the architecture and key components
4. Know where to start contributing
5. Find answers to common questions quickly

## Required Output Structure

Generate a detailed JSON response with these exact keys:

{{
    "project_snapshot": {{
        "one_liner": "Brief description",
        "target_audience": "Who uses this",
        "problem_solved": "What problem it solves",
        "maturity": "alpha/beta/stable/mature",
        "key_stats": {{}}
    }},
    "guided_tour": {{
        "overview": "What the project does in detail",
        "user_journey": "How users interact with it",
        "use_cases": ["case 1", "case 2"]
    }},
    "architecture_map": {{
        "narrative": "High-level architecture explanation",
        "components": [
            {{"name": "Component", "purpose": "What it does", "tech": "Technologies used"}}
        ],
        "tech_stack_reasoning": [
            {{"technology": "Tech", "purpose": "Why used", "reasoning": "Decision rationale"}}
        ],
        "data_flow": "How data flows through the system"
    }},
    "architecture_diagram_mermaid": "graph TD; A[Component] --> B[Component];",
    "module_package_view": {{
        "directory_structure": [
            {{"path": "dir/", "responsibility": "What it contains"}}
        ],
        "key_modules": [
            {{"module": "module.py", "purpose": "What it does", "exports": ["func1", "class1"]}}
        ]
    }},
    "file_level_explanations": {{
        "entry_points": [
            {{"file": "main.py", "purpose": "Entry point", "key_functions": ["main"]}}
        ],
        "core_files": [
            {{"file": "core.py", "purpose": "Core logic", "importance": "high"}}
        ],
        "config_files": [
            {{"file": "config.py", "purpose": "Configuration", "key_settings": ["API_KEY"]}}
        ]
    }},
    "sequence_diagrams": {{
        "workflows": [
            {{
                "name": "User Registration",
                "mermaid": "sequenceDiagram...",
                "description": "Step by step explanation"
            }}
        ]
    }},
    "tests_and_runbook": {{
        "setup_steps": ["step 1", "step 2"],
        "run_local": ["command 1", "command 2"],
        "run_tests": ["test command"],
        "common_commands": {{"build": "npm run build", "test": "pytest"}},
        "debugging_tips": ["tip 1", "tip 2"]
    }},
    "issues_and_prs": {{
        "good_first_issues": ["description of good starter issues"],
        "contribution_workflow": ["step 1", "step 2"],
        "pr_requirements": ["requirement 1", "requirement 2"],
        "labels_explained": {{"bug": "Bug reports", "enhancement": "New features"}}
    }},
    "glossary": {{
        "terms": [
            {{"term": "API", "definition": "Application Programming Interface", "context": "How it's used in project"}}
        ]
    }},
    "learning_path": {{
        "day_0": ["Setup", "Read README"],
        "day_1": ["Understand core concepts"],
        "days_2_3": ["Deep dive into modules"],
        "days_4_7": ["First contribution"],
        "week_2_plus": ["Advanced contributions"]
    }}
}}

Be specific, actionable, and welcoming to newcomers. Use real examples from the codebase when possible.
"""


class PromptComposerService:
    def __init__(self):
        if settings.GOOGLE_API_KEY:
            self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
            self.model_name = "gemini-3-pro-preview"
        else:
            self.client = None
            self.model_name = None

    async def compose_optimized_prompt(
        self, chunks: list[dict[str, Any]], repo_metadata: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Call Prompt Composer LLM to generate optimized prompts.
        
        Args:
            chunks: List of chunk dictionaries
            repo_metadata: Repository metadata (name, description, etc.)
            
        Returns:
            Dictionary with system_prompt, user_prompt, and chunk selections
        """
        if not self.client:
            return {"error": "LLM API Key not configured"}

        # Create chunk manifest
        chunk_manifest = []
        for chunk in chunks:
            manifest_entry = {
                "id": chunk.get("chunk_id"),
                "path": chunk.get("path"),
                "type": classify_chunk_type(chunk),
                "size": len(chunk.get("content", "")),
                "summary": generate_quick_summary(chunk),
            }
            chunk_manifest.append(manifest_entry)

        # Format manifest as readable text
        manifest_text = json.dumps(chunk_manifest, indent=2)

        # Build prompt for composer
        composer_prompt = PROMPT_COMPOSER_TEMPLATE.format(
            chunk_count=len(chunks), chunk_manifest=manifest_text
        )

        try:
            # Call LLM with safety settings
            config = types.GenerateContentConfig(
                # Lower temperature for deterministic prompt engineering
                temperature=0.3,
                safety_settings=[
                    types.SafetySetting(
                        category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold="BLOCK_NONE",
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold="BLOCK_NONE",
                    ),
                ],
            )

            response = self.client.models.generate_content(
                model=self.model_name, contents=composer_prompt, config=config
            )

            if not response.text:
                return {"error": "Empty response from Prompt Composer"}

            text = response.text.strip()

            # Clean up markdown code blocks if present
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()

            # Parse JSON response
            prompt_specification = json.loads(text)

            # Add metadata
            prompt_specification["repo_name"] = repo_metadata.get("name", "Unknown")
            prompt_specification["repo_description"] = repo_metadata.get(
                "description", "N/A"
            )

            return prompt_specification

        except json.JSONDecodeError as je:
            logger.error(f"Failed to parse Prompt Composer response: {je}")
            return {
                "error": "Failed to parse Prompt Composer JSON",
                "raw": text[:500] if "text" in locals() else "No response",
            }
        except Exception as e:
            logger.error(f"Prompt Composer failed: {e}")
            return {"error": str(e)}

    async def generate_final_explanation(
        self,
        chunks: list[dict[str, Any]],
        prompt_spec: dict[str, Any],
        repo_metadata: dict[str, Any],
    ) -> dict[str, Any]:
        """
        Generate final comprehensive repository explanation using composed prompt.
        
        Args:
            chunks: All available chunks
            prompt_spec: Prompt specification from compose_optimized_prompt
            repo_metadata: Repository metadata
            
        Returns:
            Structured repository explanation
        """
        if not self.client:
            return {"error": "LLM API Key not configured"}

        # Build chunk lookup
        chunk_lookup = {chunk["chunk_id"]: chunk for chunk in chunks}

        # Get chunks to include verbatim
        verbatim_ids = prompt_spec.get("chunks_verbatim", [])
        summarized_ids = prompt_spec.get("chunks_summarized", [])

        # Build verbatim content
        verbatim_content = []
        for chunk_id in verbatim_ids:
            if chunk_id in chunk_lookup:
                chunk = chunk_lookup[chunk_id]
                verbatim_content.append(
                    f"### File: {chunk['path']}\n\n{chunk['content']}\n\n"
                )

        # Build summarized content
        summarized_content = []
        for chunk_id in summarized_ids:
            if chunk_id in chunk_lookup:
                chunk = chunk_lookup[chunk_id]
                summary = generate_quick_summary(chunk)
                summarized_content.append(f"- {chunk['path']}: {summary}")

        # Build final user prompt
        user_prompt = f"""
## Repository: {repo_metadata.get('name', 'Unknown')}

**Description**: {repo_metadata.get('description', 'N/A')}
**Language**: {repo_metadata.get('language', 'N/A')}
**Stars**: {repo_metadata.get('stars', 0)}
**Open Issues**: {repo_metadata.get('open_issues', 0)}

## Key Files (Verbatim)

{chr(10).join(verbatim_content)}

## Additional Files (Summaries)

{chr(10).join(summarized_content)}

---

Generate a comprehensive onboarding guide following the specified JSON structure.
"""

        try:
            # Call LLM with safety settings
            config = types.GenerateContentConfig(
                temperature=0.5,
                safety_settings=[
                    types.SafetySetting(
                        category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold="BLOCK_NONE",
                    ),
                    types.SafetySetting(
                        category="HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold="BLOCK_NONE",
                    ),
                ],
            )

            # Use custom system prompt if provided, otherwise use default
            system_prompt = prompt_spec.get(
                "system_prompt", FINAL_EXPLANATION_SYSTEM_PROMPT
            )

            # Combine system and user prompts
            full_prompt = f"{system_prompt}\n\n{user_prompt}"

            response = self.client.models.generate_content(
                model=self.model_name, contents=full_prompt, config=config
            )

            if not response.text:
                return {"error": "Empty response from final explanation LLM"}

            text = response.text.strip()

            # Clean up markdown code blocks
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()

            # Parse JSON response
            explanation = json.loads(text)

            return explanation

        except json.JSONDecodeError as je:
            logger.error(f"Failed to parse final explanation: {je}")
            return {
                "error": "Failed to parse final explanation JSON",
                "raw": text[:500] if "text" in locals() else "No response",
            }
        except Exception as e:
            logger.error(f"Final explanation generation failed: {e}")
            return {"error": str(e)}

    async def explain_comprehensive(
        self, chunks: list[dict[str, Any]], repo_metadata: dict[str, Any]
    ) -> dict[str, Any]:
        """
        Complete two-step pipeline: compose prompt, then generate explanation.
        
        Args:
            chunks: Repository content chunks
            repo_metadata: Repository metadata
            
        Returns:
            Comprehensive repository explanation
        """
        # Step 1: Compose optimized prompt
        logger.info("Step 1: Composing optimized prompt...")
        prompt_spec = await self.compose_optimized_prompt(chunks, repo_metadata)

        if "error" in prompt_spec:
            return prompt_spec

        # Step 2: Generate final explanation
        logger.info("Step 2: Generating final explanation...")
        explanation = await self.generate_final_explanation(
            chunks, prompt_spec, repo_metadata
        )

        # Add metadata about the process
        explanation["_meta"] = {
            "chunks_total": len(chunks),
            "chunks_verbatim": len(prompt_spec.get("chunks_verbatim", [])),
            "chunks_summarized": len(prompt_spec.get("chunks_summarized", [])),
            "reasoning": prompt_spec.get("reasoning", ""),
        }

        return explanation


# Singleton instance
prompt_composer_service = PromptComposerService()

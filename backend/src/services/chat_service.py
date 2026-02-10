import asyncio
import logging
from typing import Any

from google import genai
from google.genai import types

from ..core.config import settings

# Constants for retry logic
MAX_RETRIES = 3
BASE_DELAY = 2

logger = logging.getLogger(__name__)


class ChatService:
    def __init__(self):
        if settings.GOOGLE_API_KEY:
            self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
            self.model_name = "gemini-2.0-flash"
        else:
            self.client = None
            self.model_name = None

    def _format_issues(self, issues_data: dict[str, Any]) -> str:
        if not issues_data or not isinstance(issues_data, dict):
            return "No issue analysis available."
        
        # Pull candidate list from issues analysis if it exists
        issue_info = issues_data.get("issue_analysis_and_recommendations", {})
        candidates = issue_info.get("top_candidates", [])
        
        if not candidates:
            return "No specific issues highlighted for onboarding yet."
            
        formatted = "Here are the top issues recommended for a new contributor:\n"
        for c in candidates[:3]:
            formatted += f"- {c}\n"
        return formatted

    def _format_tech_stack(self, tech_data: dict[str, Any]) -> str:
        if not tech_data or not isinstance(tech_data, dict):
            return "Tech stack information not yet analyzed."
            
        langs = tech_data.get("languages", [])
        frameworks = tech_data.get("frameworks", [])
        
        stack_str = ""
        if langs:
            stack_str += f"Languages: {', '.join(langs)}\n"
        if frameworks:
            stack_str += f"Frameworks: {', '.join(frameworks)}\n"
            
        return stack_str if stack_str else "Basic tech stack detected."

    def _is_rate_limit_error(self, error: Exception) -> bool:
        """Check if an exception is a rate limit error."""
        error_str = str(error).lower()
        rate_limit_keywords = [
            "resource_exhausted",
            "429",
            "rate limit",
            "quota",
            "too many requests",
        ]
        return any(keyword in error_str for keyword in rate_limit_keywords)

    async def _generate_with_retry(self, prompt: str, config: types.GenerateContentConfig) -> Any:
        """Generate content with retry logic and exponential backoff."""
        last_exception = None
        
        for attempt in range(MAX_RETRIES):
            try:
                response = self.client.models.generate_content(
                    model=self.model_name,
                    contents=prompt,
                    config=config
                )
                return response
            except Exception as e:
                last_exception = e
                if self._is_rate_limit_error(e):
                    if attempt < MAX_RETRIES - 1:
                        delay = BASE_DELAY * (2 ** attempt)
                        logger.warning(
                            f"Rate limit hit on attempt {attempt + 1}/{MAX_RETRIES}. "
                            f"Retrying in {delay}s..."
                        )
                        await asyncio.sleep(delay)
                    else:
                        logger.error(f"Rate limit hit after {MAX_RETRIES} attempts")
                else:
                    # For non-rate-limit errors, raise immediately
                    raise
        
        # If we get here, all retries were exhausted
        raise last_exception

    async def chat(
        self, message: str, history: list[dict[str, str]], context: dict[str, Any]
    ) -> dict[str, str]:
        if not self.client:
            return {
                "answer": "Error: LLM API Key not configured. Please check .env file."
            }

        # Guard against None context
        if context is None:
            context = {}

        # Build conversation context
        project_one_liner = context.get("summary", {}).get("one_liner", "a GitHub repository")
        tech_stack = self._format_tech_stack(context.get("tech_stack", {}))
        issues_summary = self._format_issues(context.get("analysis", {}))

        system_prompt = f"""
        You are 'FirstPR Chat', a helpful AI assistant specialized in onboarding developers to this project.
        
        Project Overview: {project_one_liner}
        Tech Stack: {tech_stack}
        
        {issues_summary}
        
        Context for this conversation:
        - You have access to deep architectural analysis of this repo.
        - You should prioritize helping the user understand how to make their FIRST contribution.
        - Keep answers concise, technical, and encouraging.
        
        Current User Question: {message}
        """

        # Convert history format for Gemini
        # history is List of {"role": "user/assistant", "content": "..."} or {"role": "user/assistant", "text": "..."}
        # Gemini expects roles "user" and "model"
        chat_history = []
        for h in history:
            role = "user" if h["role"] == "user" else "model"
            # In new SDK, history parts can be simpler
            # Support both "content" and "text" keys from frontend
            chat_history.append({"role": role, "parts": [{"text": h.get("content", h.get("text", ""))}]})

        try:
            logger.debug("Sending prompt to LLM...")
            
            # Format conversation history into the prompt
            conversation_context = ""
            if chat_history:
                conversation_context = "\n\n## Previous Conversation:\n"
                for msg in chat_history:
                    role_label = "User" if msg["role"] == "user" else "Assistant"
                    conversation_context += f"{role_label}: {msg['parts'][0]['text']}\n"
            
            # Combine system prompt with conversation history
            full_prompt = system_prompt + conversation_context
            
            # Add safety settings like the LLM service
            config = types.GenerateContentConfig(
                safety_settings=[
                    types.SafetySetting(category="HARM_CATEGORY_HARASSMENT", threshold="BLOCK_NONE"),
                    types.SafetySetting(category="HARM_CATEGORY_HATE_SPEECH", threshold="BLOCK_NONE"),
                    types.SafetySetting(category="HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold="BLOCK_NONE"),
                    types.SafetySetting(category="HARM_CATEGORY_DANGEROUS_CONTENT", threshold="BLOCK_NONE"),
                ]
            )
            
            # Use retry logic for API calls
            response = await self._generate_with_retry(full_prompt, config)
            
            if not response.text:
                return {"answer": "I received an empty response. Please try again."}
            
            logger.debug("LLM Response received")
            return {"answer": response.text}

        except Exception as e:
            logger.error(f"Chat Error: {str(e)}")
            
            # Check if it's a rate limit error and provide user-friendly message
            if self._is_rate_limit_error(e):
                return {
                    "answer": "I'm currently experiencing high demand and hit a rate limit. "
                    "Please wait a moment and try again. If this persists, the API quota may need to be increased."
                }
            else:
                return {
                    "answer": "I encountered an error while processing your request. Please try again later."
                }


chat_service = ChatService()

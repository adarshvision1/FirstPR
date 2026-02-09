import logging
from typing import Any, Dict, List

from google import genai

from ..core.config import settings

logger = logging.getLogger(__name__)


class ChatService:
    """Conversational AI service for onboarding developers to open-source projects."""

    def __init__(self):
        if settings.GOOGLE_API_KEY:
            self.client = genai.Client(api_key=settings.GOOGLE_API_KEY)
            self.model_name = "gemini-3-pro-preview"
        else:
            self.client = None
            self.model_name = None

    def _format_issues(self, issues_data: Dict[str, Any]) -> str:
        if not issues_data or not isinstance(issues_data, dict):
            return "No issue analysis available."

        issue_info = issues_data.get("issue_analysis_and_recommendations", {})
        candidates = issue_info.get("top_candidates", [])

        if not candidates:
            return "No specific issues highlighted for onboarding yet."

        formatted = "Here are the top issues recommended for a new contributor:\n"
        for c in candidates[:3]:
            formatted += f"- {c}\n"
        return formatted

    def _format_tech_stack(self, tech_data: Dict[str, Any]) -> str:
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

    async def chat(
        self, message: str, history: List[Dict[str, str]], context: Dict[str, Any]
    ) -> Dict[str, str]:
        if not self.client:
            return {
                "answer": "Error: LLM API Key not configured. Please check .env file."
            }

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

        chat_history = []
        for h in history:
            role = "user" if h["role"] == "user" else "model"
            chat_history.append({"role": role, "parts": [{"text": h["content"]}]})

        try:
            chat_session = self.client.chats.create(
                model=self.model_name,
                history=chat_history,
                config={"system_instruction": system_prompt}
            )

            response = chat_session.send_message(message)
            return {"answer": response.text}

        except Exception as e:
            logger.error(f"Chat error: {e}")
            return {"answer": f"I encountered an error while thinking: {str(e)}"}


chat_service = ChatService()
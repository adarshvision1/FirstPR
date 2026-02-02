import google.generativeai as genai
from ..core.config import settings
from typing import List, Dict, Any


class ChatService:
    def __init__(self):
        if settings.GOOGLE_API_KEY:
            genai.configure(api_key=settings.GOOGLE_API_KEY)
            self.model = genai.GenerativeModel("gemini-3-pro-preview")
        else:
            self.model = None

    def _format_issues(self, issues_data: Dict[str, Any]) -> str:
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
        if not self.model:
            return {
                "answer": "Error: LLM API Key not configured. Please check .env file."
            }

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
        # history is List of {"role": "user/assistant", "content": "..."}
        # Gemini expects roles "user" and "model"
        chat_history = []
        for h in history:
            role = "user" if h["role"] == "user" else "model"
            chat_history.append({"role": role, "parts": [h["content"]]})

        try:
            print("DEBUG: Sending prompt to LLM...")
            
            # Use the model to generate content
            # For simplicity, we'll prefix with system prompt if history is empty,
            # or use it as a preamble.
            
            if not chat_history:
                response = await self.model.generate_content_async(system_prompt)
            else:
                # Start chat session with history
                chat_session = self.model.start_chat(history=chat_history)
                response = await chat_session.send_message_async(message)
            
            print("DEBUG: LLM Response received")
            return {"answer": response.text}

        except Exception as e:
            print(f"DEBUG: Chat Error: {str(e)}")
            return {"answer": f"I encountered an error while thinking: {str(e)}"}

import asyncio
import os
import sys

# Add src to path
sys.path.append(os.path.join(os.getcwd(), "src"))

from src.services.chat_service import ChatService

async def main():
    service = ChatService()
    if not service.client:
        print("Client not initialized. Check GOOGLE_API_KEY.")
        return

    print(f"Using model: {service.model_name}")
    
    test_context = {
        "summary": {"one_liner": "A test github repo"},
        "tech_stack": {"languages": ["Python"]},
        "analysis": {"issue_analysis_and_recommendations": {"top_candidates": ["Fix imports"]}}
    }
    
    print("Testing chat...")
    history = []
    message = "How do I get started?"
    result = await service.chat(message, history, test_context)
    
    if "answer" in result:
        print(f"Answer: {result['answer'][:200]}...")
    else:
        print(f"Chat failed: {result}")

if __name__ == "__main__":
    asyncio.run(main())

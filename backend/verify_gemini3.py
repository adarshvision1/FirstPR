import sys
import os
import asyncio
from typing import Dict, Any

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), "src"))

from services.llm import GeminiService

async def main():
    print("Initializing GeminiService...")
    service = GeminiService()
    
    if not service.model:
        print("Error: Model not initialized. Check API Key.")
        return

    # Check model name (accessing private attribute for verification if available, or just trust init)
    # google.generativeai.GenerativeModel doesn't expose model_name cleanly in all versions, 
    # but we can check what we passed to init if we modify the class or just assume it is correct from the code edit.
    
    mock_bundle = {
        "repo": "FirstPR-Test",
        "metadata": {
            "description": "A test repository for verifying Gemini 3 migration.",
            "language": "Python"
        },
        "tech_stack": {
            "languages": ["Python"],
            "frameworks": ["FastAPI"]
        },
        "entry_points": ["main.py"],
        "top_functions": [], 
        "manifests": {
            "requirements.txt": "fastapi==0.100.0\nuvicorn==0.22.0"
        }
    }
    
    print("Sending request to Gemini 3...")
    try:
        result = await service.generate_analysis(mock_bundle)
        print("\n--- Response Received ---")
        print(result)
        
        if "project_summary" in result:
            print("\nSUCCESS: Verified structured JSON output.")
        else:
            print("\nWARNING: Response structure might be incorrect.")
            
    except Exception as e:
        print(f"\nERROR: {e}")

if __name__ == "__main__":
    asyncio.run(main())

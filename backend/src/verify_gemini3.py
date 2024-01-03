import asyncio
import sys
import os

# We render this file inside backend/src/verify_gemini3.py
# Run with: python -m src.verify_gemini3 from backend/ directory

from .services.llm import GeminiService

async def main():
    print("Initializing GeminiService...")
    try:
        service = GeminiService()
    except Exception as e:
        print(f"Failed to initialize GeminiService: {e}")
        return
    
    if not service.model:
        print("Error: Model not initialized. Check API Key.")
        return

    print("Model initialized.")

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
        import json
        print(json.dumps(result, indent=2))
        
        if "project_summary" in result:
            print("\nSUCCESS: Verified structured JSON output.")
        elif "error" in result:
             print(f"\nFAILURE: API returned error: {result['error']}")
        else:
            print("\nWARNING: Response structure might be incorrect.")
            
    except Exception as e:
        print(f"\nERROR: {e}")

if __name__ == "__main__":
    asyncio.run(main())

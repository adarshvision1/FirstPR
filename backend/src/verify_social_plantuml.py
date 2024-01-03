import asyncio
import sys
import os

# Run with: python -m src.verify_social_plantuml from backend/ directory

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
        "repo": "FirstPR-Test-Social",
        "metadata": {
            "description": "A test repository with a Discord community.",
            "language": "Python"
        },
        "tech_stack": {
            "languages": ["Python"],
            "frameworks": ["FastAPI"]
        },
        "entry_points": ["main.py"],
        "top_functions": [], 
        "manifests": {
            "README.md": "Join our community on Discord: https://discord.gg/example\nCheck out our docs."
        }
    }
    
    print("Sending request to Gemini 3 for Social Links & PlantUML...")
    try:
        result = await service.generate_analysis(mock_bundle)
        print("\n--- Response Received ---")
        import json
        print(json.dumps(result, indent=2))
        
        if "social_links" in result and len(result["social_links"]) > 0:
            print("\nSUCCESS: Found Social Links:", result["social_links"])
        else:
            print("\nWARNING: No Social Links found (might be expected if mock data wasn't strong enough or model ignored it).")

        if "architecture_diagram_plantuml" in result and "@startuml" in result["architecture_diagram_plantuml"]:
             print("\nSUCCESS: Found PlantUML Diagram.")
        else:
             print("\nWARNING: No PlantUML Diagram found.")
            
    except Exception as e:
        print(f"\nERROR: {e}")

if __name__ == "__main__":
    asyncio.run(main())

import asyncio
import os
import sys

# Add src to path
sys.path.append(os.path.join(os.getcwd(), "src"))

# Use absolute import instead of relative
from src.services.llm import GeminiService

async def main():
    service = GeminiService()
    if not service.model:
        print("Model not initialized. Check GOOGLE_API_KEY.")
        return

    print(f"Using model: {service.model.model_name}")
    
    test_bundle = {
        "repo": "test-repo",
        "metadata": {"description": "A test repository"},
        "tech_stack": {"languages": ["Python"]},
        "entry_points": ["main.py"],
        "top_functions": [],
        "manifests": {"pyproject.toml": "[project]\nname='test'"}
    }
    
    print("Testing generate_analysis...")
    result = await service.generate_analysis(test_bundle)
    if "error" in result:
        print(f"Analysis failed: {result['error']}")
        if "raw" in result:
             print(f"Raw response: {result['raw']}")
    else:
        print("Analysis successful!")
        print(result)

    print("\nTesting explain_file...")
    explanation = await service.explain_file("print('hello')", "main.py", {"repo": "test-repo"})
    print(f"Explanation: {explanation}")

if __name__ == "__main__":
    asyncio.run(main())

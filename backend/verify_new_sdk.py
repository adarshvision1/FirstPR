import asyncio
import os
import sys

# Add src to path
sys.path.append(os.path.join(os.getcwd(), "src"))

from src.services.llm import GeminiService

async def main():
    service = GeminiService()
    if not service.client:
        print("Client not initialized. Check GOOGLE_API_KEY.")
        return

    print(f"Using model: {service.model_name}")
    
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
        # Print a small subset of the keys to verify
        print(f"Keys returned: {list(result.keys())}")

    print("\nTesting explain_file...")
    explanation = await service.explain_file("print('hello')", "main.py", {"repo": "test-repo"})
    print(f"Explanation: {explanation[:100]}...")

if __name__ == "__main__":
    asyncio.run(main())

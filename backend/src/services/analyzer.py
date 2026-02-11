# Note: In a real implementation, we'd need to compile languages or use pre-compiled bindings.
# For this scaffold, we'll mock the extraction or use simple AST for Python.
import ast
import asyncio
import logging
import os
from typing import Any

from ..core.concurrency import ConcurrencyManager
from ..core.models import FunctionInfo

logger = logging.getLogger(__name__)

# Standalone function for CPU-bound AST parsing
def parse_python_ast(content: str, path: str) -> list[FunctionInfo]:
    if not content:
        return []
    
    funcs = []
    try:
        tree = ast.parse(content)
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # extract signature
                args = [a.arg for a in node.args.args]
                signature = f"def {node.name}({', '.join(args)})"
                
                docstring = ast.get_docstring(node)
                
                funcs.append(FunctionInfo(
                    file=path,
                    name=node.name,
                    signature=signature,
                    notes=docstring.split('\n')[0] if docstring else None
                ))
    except SyntaxError:
        pass
        
    return funcs

class AnalyzerService:
    def __init__(self):
        self.parsers = {} 
        # Future: Initialize tree-sitter parsers here if binaries available
        
    def _detect_tech_stack(self, file_tree: list[dict[str, Any]], manifests: dict[str, str]) -> dict[str, list[str]]:
        languages = set()
        frameworks = set()
        
        # 1. Extension-based detection
        extensions = {
            ".py": "Python", ".js": "JavaScript", ".ts": "TypeScript", ".tsx": "React/TypeScript",
            ".jsx": "React", ".go": "Go", ".rs": "Rust", ".java": "Java", ".cpp": "C++"
        }
        
        for node in file_tree:
            ext = os.path.splitext(node['path'])[1]
            if ext in extensions:
                languages.add(extensions[ext])
                
        # 2. Manifest-based framework detection
        if "package.json" in manifests:
            pkg_json = manifests["package.json"]
            if '"react"' in pkg_json: frameworks.add("React")
            if '"next"' in pkg_json: frameworks.add("Next.js")
            if '"express"' in pkg_json: frameworks.add("Express")
            if '"tailwindcss"' in pkg_json: frameworks.add("Tailwind CSS")

        if "pyproject.toml" in manifests or "requirements.txt" in manifests:
            content = manifests.get("pyproject.toml", "") + manifests.get("requirements.txt", "")
            if "fastapi" in content: frameworks.add("FastAPI")
            if "django" in content: frameworks.add("Django")
            if "flask" in content: frameworks.add("Flask")
            if "pandas" in content: frameworks.add("Pandas")
            if "pytorch" in content or "torch" in content: frameworks.add("PyTorch")
            if "tensorflow" in content: frameworks.add("TensorFlow")

        return {
            "languages": list(languages),
            "frameworks": list(frameworks)
        }

    async def _fetch_and_parse(self, root_path: str, path: str, is_manifest: bool) -> tuple[str, str, list[FunctionInfo]]:
        """
        Helper to fetch content and parse it if it's a python file.
        Returns: (path, content, functions)
        """
        content = await self._read_file(root_path, path)
        if not content:
            return path, "", []
            
        funcs = []
        if path.endswith(".py") and not is_manifest:
            # Offload CPU-intensive AST parsing
            funcs = await ConcurrencyManager.run_cpu_bound(parse_python_ast, content, path)
            
        return path, content, funcs

    async def analyze_repo(self, file_tree: list[dict[str, Any]], root_path: str) -> dict[str, Any]:
        """
        Orchestrates the analysis of the repository using concurrency.
        """
        manifests = {}
        top_functions = []
        dependency_graph = {"nodes": [], "edges": []}
        
        tasks = []
        sem = asyncio.Semaphore(10) # Limit concurrent file fetches to prevent GitHub 503s
        
        async def fetch_with_sem(root_path, path, is_manifest):
            async with sem:
                return await self._fetch_and_parse(root_path, path, is_manifest)
        
        # 1. Identify key files and schedule tasks
        for node in file_tree:
            path = node['path']
            is_manifest = path.endswith("requirements.txt") or path.endswith("package.json") or path.endswith("pyproject.toml")
            is_python = path.endswith(".py")
            
            if is_manifest or is_python:
                tasks.append(fetch_with_sem(root_path, path, is_manifest))

        # 2. Execute all file reads and parses in parallel
        # Limit concurrency to prevent overwhelming filesystem/memory (even though read_file calls github_client which has no limits here, we should be careful)
        # Using a semaphore if needed, but for now gather is fine for typical repo sizes
        results = await asyncio.gather(*tasks)
        
        # 3. Aggregate results
        for path, content, funcs in results:
            if path.endswith("requirements.txt") or path.endswith("package.json") or path.endswith("pyproject.toml"):
                manifests[path] = content
            
            if funcs:
                top_functions.extend(funcs)

        # 4. Tech Stack Detection
        tech_stack = self._detect_tech_stack(file_tree, manifests)
        
        # 5. Identify Entry Points (heuristic)
        entry_points = []
        for node in file_tree:
            if node['path'] in ["main.py", "app.py", "wsgi.py", "manage.py", "index.js", "server.js", "src/index.tsx", "src/main.ts"]:
                entry_points.append(node['path'])

        return {
            "manifests": manifests,
            "top_functions": top_functions[:20], 
            "dependency_graph": dependency_graph,
            "tech_stack": tech_stack,
            "entry_points": entry_points
        }

    async def _read_file(self, root: str, path: str) -> str:
        # Optimization: analyzer now relies on git clone or similar, but the original code used local file reads?
        # Wait, the original code used `open(full_path)`. If this is running locally after a clone, that's fine.
        # If this is supposed to fetch from GitHub, the original code was wrong or `root` implies a local temp dir.
        # Assuming `root` is a local directory where repo was cloned/downloaded.
        
        full_path = os.path.join(root, path)
        if os.path.exists(full_path):
            try:
                # Removed unnecessary asyncio.Lock for read-only file operations
                # Lock was causing blocking and not needed since file reads are non-destructive
                with open(full_path, encoding="utf-8", errors="ignore") as f:
                    return f.read()
            except Exception:
                return None
        return None

analyzer = AnalyzerService()

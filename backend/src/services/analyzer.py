import os
from typing import List, Dict, Any
from tree_sitter import Language, Parser
# Note: In a real implementation, we'd need to compile languages or use pre-compiled bindings.
# For this scaffold, we'll mock the extraction or use simple AST for Python.
import ast
from ..core.models import FunctionInfo
import asyncio

class AnalyzerService:
    def __init__(self):
        self.parsers = {} 
        # Future: Initialize tree-sitter parsers here if binaries available
        
    def _detect_tech_stack(self, file_tree: List[Dict[str, Any]], manifests: Dict[str, str]) -> Dict[str, List[str]]:
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

    async def analyze_repo(self, file_tree: List[Dict[str, Any]], root_path: str) -> Dict[str, Any]:
        """
        Orchestrates the analysis of the repository.
        """
        top_functions = []
        manifests = {}
        dependency_graph = {"nodes": [], "edges": []}
        
        # 1. Identify key files
        for node in file_tree:
            path = node['path']
            if path.endswith("requirements.txt") or path.endswith("package.json") or path.endswith("pyproject.toml"):
                content = await self._read_file(root_path, path)
                if content:
                    manifests[path] = content
            
            if path.endswith(".py"):
                funcs = await self._analyze_python_file(root_path, path)
                top_functions.extend(funcs)

        # 2. Tech Stack Detection
        tech_stack = self._detect_tech_stack(file_tree, manifests)
        
        # 3. Identify Entry Points (heuristic)
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
        full_path = os.path.join(root, path)
        if os.path.exists(full_path):
            try:
                async with asyncio.Lock(): # Not strictly needed for read, but good practice
                    with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                        return f.read()
            except Exception:
                return None
        return None

    async def _analyze_python_file(self, root: str, path: str) -> List[FunctionInfo]:
        content = await self._read_file(root, path)
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

analyzer = AnalyzerService()

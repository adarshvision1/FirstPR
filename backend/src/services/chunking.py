"""
Chunking service for repository content preparation.

Implements smart chunking strategies for different file types with
metadata preservation.
"""

import re
from typing import Any

# Constants
MAX_CHUNK_SIZE = 4000  # characters
CHUNK_OVERLAP = 400  # characters for context continuity
MAX_TOKENS_ESTIMATE = 2_970_000  # Available tokens for chunk content (3x budget)


def estimate_tokens(text: str) -> int:
    """
    Estimate token count from text.
    Approximation: 1 token ≈ 4 characters
    """
    return len(text) // 4


def classify_chunk_type(chunk: dict[str, Any]) -> str:
    """
    Classify chunk type based on file path.
    
    Returns: readme|docs|code|config|test
    """
    path = chunk.get("path", "").lower()
    
    if "readme" in path:
        return "readme"
    elif path.startswith("docs/") or path.endswith(".md"):
        return "docs"
    elif any(
        path.endswith(ext)
        for ext in [".yml", ".yaml", ".json", ".toml", ".ini", ".conf"]
    ):
        return "config"
    elif "test" in path or path.endswith(
        ("_test.py", ".test.js", ".test.ts", ".spec.js")
    ):
        return "test"
    elif any(
        path.endswith(ext)
        for ext in [".py", ".js", ".ts", ".tsx", ".jsx", ".go", ".rs"]
    ):
        return "code"
    else:
        return "other"


def is_entry_point(path: str) -> bool:
    """Check if file is an entry point."""
    entry_points = [
        "main.py", "app.py", "__main__.py", "wsgi.py", "manage.py",
        "index.js", "server.js", "app.js", "main.js",
        "src/index.tsx", "src/main.ts", "src/App.tsx",
        "cmd/main.go", "main.go"
    ]
    return any(path.endswith(ep) for ep in entry_points)


def chunk_by_markdown_headers(content: str, path: str) -> list[dict[str, Any]]:
    """
    Chunk markdown content by headers (H1, H2, H3).
    Preserves header hierarchy and code blocks.
    """
    chunks = []
    
    # Split by headers while preserving them
    header_pattern = re.compile(r'^(#{1,3})\s+(.+)$', re.MULTILINE)
    
    sections = []
    current_section = {"header": "", "level": 0, "content": "", "line_start": 1}
    
    lines = content.split('\n')
    line_num = 1
    
    for line in lines:
        match = header_pattern.match(line)
        if match:
            # Save current section if it has content
            if current_section["content"]:
                sections.append(current_section)
            
            # Start new section
            level = len(match.group(1))
            header_text = match.group(2)
            current_section = {
                "header": header_text,
                "level": level,
                "content": line + "\n",
                "line_start": line_num
            }
        else:
            current_section["content"] += line + "\n"
        
        line_num += 1
    
    # Add last section
    if current_section["content"]:
        sections.append(current_section)
    
    # Convert sections to chunks
    for idx, section in enumerate(sections):
        content_lines = section["content"].split('\n')
        chunks.append({
            "content": section["content"],
            "path": path,
            "chunk_id": f"{path}:chunk_{idx}",
            "line_range": [
                section["line_start"],
                section["line_start"] + len(content_lines) - 1
            ],
            "heading": section["header"],
            "heading_level": section["level"]
        })
    
    return chunks


def chunk_by_code_structure(content: str, path: str) -> list[dict[str, Any]]:
    """
    Chunk code files by logical units (functions, classes).
    Falls back to line-based chunking for complex cases.
    """
    chunks = []
    
    # Simple line-based chunking for code
    # In production, would use AST or tree-sitter for language-specific parsing
    lines = content.split('\n')
    total_lines = len(lines)
    
    # Calculate lines per chunk to stay within MAX_CHUNK_SIZE
    max_lines_per_chunk = MAX_CHUNK_SIZE // 80  # Assume ~80 chars per line
    
    start = 0
    idx = 0
    while start < total_lines:
        end = min(start + max_lines_per_chunk, total_lines)
        
        # Include overlap for context
        if start > 0:
            overlap_lines = min(CHUNK_OVERLAP // 80, start)
            chunk_start = start - overlap_lines
        else:
            chunk_start = start
        
        chunk_lines = lines[chunk_start:end]
        chunk_content = '\n'.join(chunk_lines)
        
        chunks.append({
            "content": chunk_content,
            "path": path,
            "chunk_id": f"{path}:chunk_{idx}",
            "line_range": [chunk_start + 1, end],
            "heading": None
        })
        
        start = end
        idx += 1
    
    return chunks


def chunk_by_sliding_window(content: str, path: str) -> list[dict[str, Any]]:
    """
    Chunk content using sliding window with overlap.
    Generic approach for any text.
    """
    chunks = []
    idx = 0
    start = 0
    content_length = len(content)
    
    while start < content_length:
        end = min(start + MAX_CHUNK_SIZE, content_length)
        
        # Try to break at word boundary
        if end < content_length:
            # Look for nearest newline or space
            for char in ['\n', ' ', '.']:
                boundary = content.rfind(char, start, end)
                if boundary != -1:
                    end = boundary + 1
                    break
        
        chunk_content = content[start:end]
        
        # Estimate line range (approximate)
        lines_before = content[:start].count('\n')
        lines_in_chunk = chunk_content.count('\n')
        
        chunks.append({
            "content": chunk_content,
            "path": path,
            "chunk_id": f"{path}:chunk_{idx}",
            "line_range": [lines_before + 1, lines_before + lines_in_chunk + 1],
            "heading": None
        })
        
        # Move start with overlap
        start = end - CHUNK_OVERLAP if end < content_length else end
        idx += 1
    
    return chunks


def chunk_file(content: str, path: str) -> list[dict[str, Any]]:
    """
    Main chunking function that routes to appropriate strategy.
    
    Args:
        content: File content as string
        path: File path for metadata
        
    Returns:
        List of chunk dictionaries with metadata
    """
    if not content or not path:
        return []
    
    # Route to appropriate chunking strategy
    if path.endswith('.md'):
        return chunk_by_markdown_headers(content, path)
    elif any(
        path.endswith(ext)
        for ext in ['.py', '.js', '.ts', '.tsx', '.jsx', '.go', '.rs']
    ):
        return chunk_by_code_structure(content, path)
    else:
        return chunk_by_sliding_window(content, path)


def score_chunk(chunk: dict[str, Any]) -> float:
    """
    Score a chunk by importance for prioritization.
    Higher scores = higher priority.
    """
    score = 0.0
    path = chunk.get("path", "")
    
    # File type scoring
    if "README" in path.upper():
        score += 100
    elif path.startswith("docs/"):
        score += 80
    elif "CONTRIBUTING" in path.upper():
        score += 90
    elif any(path.endswith(ext) for ext in [".py", ".js", ".ts", ".tsx"]):
        score += 50
    elif path.endswith(".md"):
        score += 60
    
    # Entry point bonus
    if is_entry_point(path):
        score += 40
    
    # Core module bonus
    if any(d in path for d in ["/src/", "/lib/", "/pkg/"]):
        score += 30
    
    # Configuration files
    if any(path.endswith(ext) for ext in [".json", ".toml", ".yaml", ".yml"]):
        score += 45
    
    # Length penalty (prefer concise chunks)
    content_length = len(chunk.get("content", ""))
    if content_length < 2000:
        score += 10
    elif content_length > 8000:
        score -= 20
    
    # Heading level bonus (for markdown)
    heading_level = chunk.get("heading_level", 0)
    if heading_level == 1:
        score += 15
    elif heading_level == 2:
        score += 10
    
    return score


def prioritize_chunks(chunks: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Sort chunks by importance score (descending).
    """
    return sorted(chunks, key=score_chunk, reverse=True)


def budget_chunks(
    chunks: list[dict[str, Any]], max_tokens: int = MAX_TOKENS_ESTIMATE
) -> dict[str, Any]:
    """
    Select chunks that fit within token budget using priority system.
    
    Args:
        chunks: List of chunk dictionaries
        max_tokens: Maximum token budget
        
    Returns:
        Dictionary with 'selected' and 'summarized' chunk lists
    """
    selected = []
    needs_summary = []
    token_count = 0
    
    # Prioritize chunks
    prioritized = prioritize_chunks(chunks)
    
    for chunk in prioritized:
        chunk_tokens = estimate_tokens(chunk["content"])
        
        # Always include high-priority chunks if they fit
        if token_count + chunk_tokens <= max_tokens:
            selected.append(chunk)
            token_count += chunk_tokens
        else:
            # Mark for summarization
            needs_summary.append(chunk)
    
    return {
        "selected": selected,
        "needs_summary": needs_summary,
        "total_tokens_used": token_count,
        "chunks_selected": len(selected),
        "chunks_for_summary": len(needs_summary)
    }


def create_chunk_summary(chunk: dict[str, Any]) -> dict[str, Any]:
    """
    Create a condensed summary of a chunk.
    
    This is a placeholder - in production, would call LLM for summarization.
    For now, returns truncated version with metadata.
    """
    content = chunk.get("content", "")
    path = chunk.get("path", "")
    
    # Extract first few lines and last few lines
    lines = content.split('\n')
    if len(lines) > 20:
        summary_lines = lines[:10] + ["...", "[content truncated]", "..."] + lines[-10:]
        summary_content = '\n'.join(summary_lines)
    else:
        summary_content = content
    
    return {
        "content": summary_content,
        "path": path,
        "chunk_id": chunk.get("chunk_id"),
        "is_summary": True,
        "original_size": len(content),
        "summary_size": len(summary_content),
        "line_range": chunk.get("line_range")
    }


def generate_quick_summary(chunk: dict[str, Any]) -> str:
    """
    Generate a quick one-line summary of a chunk.
    """
    path = chunk.get("path", "")
    chunk_type = classify_chunk_type(chunk)
    content_size = len(chunk.get("content", ""))
    heading = chunk.get("heading")
    
    if heading:
        return f"{chunk_type.title()} section: {heading} ({content_size} chars)"
    else:
        return f"{chunk_type.title()} from {path} ({content_size} chars)"

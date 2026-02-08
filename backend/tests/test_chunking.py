"""
Tests for chunking service.
"""

import pytest

from src.services.chunking import (
    chunk_by_markdown_headers,
    chunk_by_code_structure,
    chunk_by_sliding_window,
    chunk_file,
    classify_chunk_type,
    estimate_tokens,
    is_entry_point,
    score_chunk,
    prioritize_chunks,
    budget_chunks,
    generate_quick_summary,
)


def test_estimate_tokens():
    """Test token estimation."""
    text = "a" * 100
    assert estimate_tokens(text) == 25  # 100 / 4


def test_classify_chunk_type():
    """Test chunk type classification."""
    assert classify_chunk_type({"path": "README.md"}) == "readme"
    assert classify_chunk_type({"path": "docs/guide.md"}) == "docs"
    assert classify_chunk_type({"path": "src/main.py"}) == "code"
    assert classify_chunk_type({"path": "config.yaml"}) == "config"
    assert classify_chunk_type({"path": "test_main.py"}) == "test"


def test_is_entry_point():
    """Test entry point detection."""
    assert is_entry_point("main.py") is True
    assert is_entry_point("src/app.py") is True
    assert is_entry_point("index.js") is True
    assert is_entry_point("helper.py") is False


def test_chunk_by_markdown_headers():
    """Test markdown header-based chunking."""
    content = """# Title
Some intro text.

## Section 1
Content for section 1.

## Section 2
Content for section 2.
"""
    
    chunks = chunk_by_markdown_headers(content, "README.md")
    
    assert len(chunks) >= 3
    assert chunks[0]["heading"] == "Title"
    assert chunks[1]["heading"] == "Section 1"
    assert "Content for section 1" in chunks[1]["content"]


def test_chunk_by_code_structure():
    """Test code structure chunking."""
    content = "def func1():\n    pass\n\n" * 100  # Create long file
    
    chunks = chunk_by_code_structure(content, "main.py")
    
    assert len(chunks) >= 1
    assert all(chunk["path"] == "main.py" for chunk in chunks)
    assert all("chunk_id" in chunk for chunk in chunks)


def test_chunk_by_sliding_window():
    """Test sliding window chunking."""
    content = "x" * 10000  # Long content
    
    chunks = chunk_by_sliding_window(content, "data.txt")
    
    assert len(chunks) >= 2  # Should be split into multiple chunks
    assert all(len(chunk["content"]) <= 4000 for chunk in chunks)


def test_chunk_file_routing():
    """Test that chunk_file routes to correct strategy."""
    # Markdown
    md_content = "# Title\nContent"
    md_chunks = chunk_file(md_content, "README.md")
    assert len(md_chunks) >= 1
    
    # Code
    code_content = "def func(): pass"
    code_chunks = chunk_file(code_content, "main.py")
    assert len(code_chunks) >= 1
    
    # Other
    other_content = "Some text"
    other_chunks = chunk_file(other_content, "data.txt")
    assert len(other_chunks) >= 1


def test_score_chunk():
    """Test chunk scoring logic."""
    readme_chunk = {"path": "README.md", "content": "x" * 1000}
    code_chunk = {"path": "src/main.py", "content": "x" * 1000}
    test_chunk = {"path": "tests/test_main.py", "content": "x" * 1000}
    
    readme_score = score_chunk(readme_chunk)
    code_score = score_chunk(code_chunk)
    test_score = score_chunk(test_chunk)
    
    # README should have highest score
    assert readme_score > code_score
    assert readme_score > test_score


def test_prioritize_chunks():
    """Test chunk prioritization."""
    chunks = [
        {"path": "src/helper.py", "content": "x" * 100},
        {"path": "README.md", "content": "x" * 100},
        {"path": "tests/test.py", "content": "x" * 100},
    ]
    
    prioritized = prioritize_chunks(chunks)
    
    # README should be first
    assert prioritized[0]["path"] == "README.md"


def test_budget_chunks():
    """Test token budgeting."""
    chunks = [
        {"path": f"file{i}.py", "content": "x" * 1000, "chunk_id": f"chunk_{i}"}
        for i in range(100)
    ]
    
    result = budget_chunks(chunks, max_tokens=10000)
    
    assert "selected" in result
    assert "needs_summary" in result
    assert result["total_tokens_used"] <= 10000
    assert len(result["selected"]) + len(result["needs_summary"]) <= len(chunks)


def test_generate_quick_summary():
    """Test quick summary generation."""
    chunk = {
        "path": "src/main.py",
        "content": "def main(): pass",
        "chunk_id": "main:0",
        "heading": None,
    }
    
    summary = generate_quick_summary(chunk)
    
    assert isinstance(summary, str)
    assert "main.py" in summary


def test_chunk_with_empty_content():
    """Test chunking with empty content."""
    chunks = chunk_file("", "empty.py")
    assert chunks == []


def test_chunk_with_none_content():
    """Test chunking with None values."""
    chunks = chunk_file(None, None)
    assert chunks == []
    
    # Test with only one None
    chunks = chunk_file(None, "file.py")
    assert chunks == []
    
    chunks = chunk_file("content", None)
    assert chunks == []

# Using the Comprehensive Repository Explanation Feature

This document shows how to use the two-step LLM pipeline for comprehensive repository analysis.

## Overview

The comprehensive explanation feature uses an advanced two-step LLM pipeline to generate detailed onboarding guides for open-source repositories. This is different from the standard analysis endpoint and provides more in-depth information specifically designed for new contributors.

## API Usage

### Endpoint

```
POST /api/repos/{owner}/{repo}/explain-comprehensive
```

### Example Request

```bash
# Using curl
curl -X POST "http://localhost:8000/api/repos/octocat/Hello-World/explain-comprehensive" \
  -H "X-GitHub-Token: your_github_token_here"

# Returns immediately with job_id
# {
#   "job_id": "123e4567-e89b-12d3-a456-426614174000",
#   "status": "pending",
#   "created_at": "2024-01-15T10:30:00"
# }
```

### Checking Status

```bash
# Check job status
curl "http://localhost:8000/api/analyze/123e4567-e89b-12d3-a456-426614174000/status"

# Returns:
# {
#   "job_id": "123e4567-e89b-12d3-a456-426614174000",
#   "status": "processing",  # or "completed", "failed"
#   "created_at": "2024-01-15T10:30:00"
# }
```

### Getting Results

```bash
# Get completed analysis
curl "http://localhost:8000/api/analyze/123e4567-e89b-12d3-a456-426614174000/result"

# Returns comprehensive JSON response (see structure below)
```

## Response Structure

The comprehensive explanation returns a structured JSON with these sections:

```json
{
  "project_snapshot": {
    "one_liner": "Brief project description",
    "target_audience": "Who uses this project",
    "problem_solved": "What problem it addresses",
    "maturity": "alpha/beta/stable/mature",
    "key_stats": {
      "stars": 1000,
      "contributors": 50,
      "open_issues": 25
    }
  },
  
  "guided_tour": {
    "overview": "Detailed explanation of what the project does",
    "user_journey": "How users interact with the system",
    "use_cases": [
      "Use case 1",
      "Use case 2"
    ]
  },
  
  "architecture_map": {
    "narrative": "High-level architecture explanation",
    "components": [
      {
        "name": "Component Name",
        "purpose": "What it does",
        "tech": "Technologies used"
      }
    ],
    "tech_stack_reasoning": [
      {
        "technology": "React",
        "purpose": "Frontend UI",
        "reasoning": "Why this technology was chosen"
      }
    ],
    "data_flow": "How data flows through the system"
  },
  
  "architecture_diagram_mermaid": "graph TD; A[Frontend] --> B[Backend]; B --> C[Database];",
  
  "module_package_view": {
    "directory_structure": [
      {
        "path": "src/",
        "responsibility": "Main application code"
      }
    ],
    "key_modules": [
      {
        "module": "main.py",
        "purpose": "Application entry point",
        "exports": ["main", "run_server"]
      }
    ]
  },
  
  "file_level_explanations": {
    "entry_points": [
      {
        "file": "main.py",
        "purpose": "Starts the application",
        "key_functions": ["main"]
      }
    ],
    "core_files": [
      {
        "file": "core/app.py",
        "purpose": "Core application logic",
        "importance": "high"
      }
    ],
    "config_files": [
      {
        "file": "config.py",
        "purpose": "Configuration management",
        "key_settings": ["API_KEY", "DATABASE_URL"]
      }
    ]
  },
  
  "sequence_diagrams": {
    "workflows": [
      {
        "name": "User Authentication",
        "mermaid": "sequenceDiagram\n    User->>Frontend: Login\n    Frontend->>Backend: POST /auth\n    Backend->>Database: Verify\n    Database-->>Backend: User Data\n    Backend-->>Frontend: Token\n    Frontend-->>User: Success",
        "description": "How users authenticate in the system"
      }
    ]
  },
  
  "tests_and_runbook": {
    "setup_steps": [
      "Clone the repository",
      "Install dependencies: npm install",
      "Copy .env.example to .env"
    ],
    "run_local": [
      "npm run dev",
      "Open http://localhost:3000"
    ],
    "run_tests": [
      "npm test",
      "npm run test:e2e"
    ],
    "common_commands": {
      "build": "npm run build",
      "test": "npm test",
      "lint": "npm run lint"
    },
    "debugging_tips": [
      "Enable debug logs with DEBUG=app:*",
      "Check browser console for frontend errors"
    ]
  },
  
  "issues_and_prs": {
    "good_first_issues": [
      "Look for 'good first issue' label",
      "Documentation improvements are great starters"
    ],
    "contribution_workflow": [
      "Fork the repository",
      "Create a feature branch",
      "Make changes and add tests",
      "Submit a pull request"
    ],
    "pr_requirements": [
      "All tests must pass",
      "Code must be linted",
      "Add documentation for new features"
    ],
    "labels_explained": {
      "bug": "Something isn't working",
      "enhancement": "New feature or request",
      "good first issue": "Good for newcomers"
    }
  },
  
  "glossary": {
    "terms": [
      {
        "term": "API",
        "definition": "Application Programming Interface",
        "context": "REST API used for backend communication"
      },
      {
        "term": "ORM",
        "definition": "Object-Relational Mapping",
        "context": "SQLAlchemy ORM used for database access"
      }
    ]
  },
  
  "learning_path": {
    "day_0": [
      "Read README.md",
      "Set up development environment",
      "Run the application locally"
    ],
    "day_1": [
      "Understand the main entry points",
      "Trace a simple user request",
      "Read architecture documentation"
    ],
    "days_2_3": [
      "Deep dive into core modules",
      "Understand the data model",
      "Review test structure"
    ],
    "days_4_7": [
      "Pick a 'good first issue'",
      "Make your first contribution",
      "Get code review feedback"
    ],
    "week_2_plus": [
      "Take on more complex issues",
      "Help review other PRs",
      "Contribute to documentation"
    ]
  },
  
  "_meta": {
    "chunks_total": 45,
    "chunks_verbatim": 12,
    "chunks_summarized": 33,
    "reasoning": "Included README, main entry points, and key docs verbatim..."
  }
}
```

## How It Works

### Step 1: Data Collection & Chunking

1. **File Fetching**: The system fetches priority files from the repository:
   - README, CONTRIBUTING, LICENSE
   - Documentation files from `docs/`
   - Configuration files (package.json, requirements.txt, etc.)
   - Entry points (main.py, index.js, etc.)
   - Sample code files from core directories

2. **Intelligent Chunking**: Files are broken into chunks with metadata:
   - Markdown files: Split by headers (H1, H2, H3)
   - Code files: Split by logical units (functions, classes)
   - Other files: Sliding window with overlap

3. **Token Budgeting**: Chunks are prioritized and selected to fit within token limits:
   - README always included first
   - Entry points second
   - Core documentation third
   - Less important files summarized

### Step 2: Meta-Prompt Generation

1. **Prompt Composer LLM Call**: The first LLM call analyzes all chunks and decides:
   - Which chunks to include verbatim (most important)
   - Which chunks to summarize
   - How to structure the final prompt

2. **Final Explanation LLM Call**: The second LLM call uses the optimized prompt to generate:
   - Structured comprehensive explanation
   - All 10 sections with actionable information
   - Specific examples from the codebase

## Use Cases

### 1. New Contributor Onboarding

A developer wants to contribute to a new open-source project:

```javascript
// Frontend code example
async function onboardToRepo(owner, repo) {
  // Start comprehensive analysis
  const { job_id } = await fetch(
    `/api/repos/${owner}/${repo}/explain-comprehensive`,
    { method: 'POST' }
  ).then(r => r.json());
  
  // Poll for completion
  let status = 'pending';
  while (status === 'pending' || status === 'processing') {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const response = await fetch(`/api/analyze/${job_id}/status`);
    ({ status } = await response.json());
  }
  
  // Get and display results
  const guide = await fetch(`/api/analyze/${job_id}/result`).then(r => r.json());
  
  // Display learning path
  console.log('Day 0 Tasks:', guide.learning_path.day_0);
  console.log('Good First Issues:', guide.issues_and_prs.good_first_issues);
}
```

### 2. Repository Documentation

Generate comprehensive onboarding documentation automatically:

```python
# Backend script example
import requests
import json

def generate_onboarding_doc(owner, repo, github_token=None):
    """Generate comprehensive onboarding guide for a repository."""
    
    headers = {}
    if github_token:
        headers['X-GitHub-Token'] = github_token
    
    # Start analysis
    response = requests.post(
        f'http://localhost:8000/api/repos/{owner}/{repo}/explain-comprehensive',
        headers=headers
    )
    job_id = response.json()['job_id']
    
    # Wait for completion
    while True:
        status_resp = requests.get(f'http://localhost:8000/api/analyze/{job_id}/status')
        status = status_resp.json()['status']
        
        if status == 'completed':
            break
        elif status == 'failed':
            print('Analysis failed')
            return
        
        time.sleep(5)
    
    # Get results
    result = requests.get(f'http://localhost:8000/api/analyze/{job_id}/result').json()
    
    # Save to markdown file
    with open(f'{repo}_onboarding.md', 'w') as f:
        f.write(f"# {repo} Onboarding Guide\n\n")
        f.write(f"## Project Snapshot\n\n")
        f.write(f"{result['project_snapshot']['one_liner']}\n\n")
        # ... format other sections
    
    return result

# Usage
guide = generate_onboarding_doc('octocat', 'Hello-World')
```

### 3. Team Onboarding Tool

Create an internal tool for onboarding new team members:

```typescript
// TypeScript example
interface OnboardingGuide {
  project_snapshot: ProjectSnapshot;
  guided_tour: GuidedTour;
  learning_path: LearningPath;
  // ... other fields
}

class RepositoryOnboarder {
  private apiBase = 'http://localhost:8000/api';
  
  async createOnboardingGuide(owner: string, repo: string): Promise<OnboardingGuide> {
    // Start comprehensive analysis
    const jobResponse = await fetch(
      `${this.apiBase}/repos/${owner}/${repo}/explain-comprehensive`,
      { method: 'POST' }
    );
    const { job_id } = await jobResponse.json();
    
    // Wait for completion
    const guide = await this.pollForCompletion(job_id);
    
    return guide;
  }
  
  private async pollForCompletion(jobId: string): Promise<OnboardingGuide> {
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes max
    
    while (attempts < maxAttempts) {
      const statusResponse = await fetch(`${this.apiBase}/analyze/${jobId}/status`);
      const { status } = await statusResponse.json();
      
      if (status === 'completed') {
        const resultResponse = await fetch(`${this.apiBase}/analyze/${jobId}/result`);
        return await resultResponse.json();
      }
      
      if (status === 'failed') {
        throw new Error('Analysis failed');
      }
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      attempts++;
    }
    
    throw new Error('Analysis timeout');
  }
}
```

## Performance Considerations

- **Processing Time**: Comprehensive analysis takes 30-120 seconds depending on repository size
- **Token Usage**: Uses Gemini 3 Pro's 1M token context window efficiently
- **Caching**: Results are cached based on commit SHA (future enhancement)
- **Rate Limiting**: Respects GitHub API rate limits with automatic backoff

## Best Practices

1. **Use GitHub Token**: Pass a GitHub token for higher rate limits and private repository access
2. **Async Processing**: Always use the async job pattern - don't expect immediate results
3. **Error Handling**: Implement proper error handling for failed analyses
4. **Caching**: Cache results client-side to avoid repeated API calls
5. **Polling Strategy**: Use exponential backoff for status polling

## Differences from Standard Analysis

| Feature | Standard Analysis | Comprehensive Explanation |
|---------|------------------|---------------------------|
| Processing | Fast (~5-10s) | Slower (~30-120s) |
| LLM Calls | 1 call | 2 calls (meta-prompt + final) |
| Depth | Overview level | Deep dive with actionable items |
| Use Case | Quick insights | New contributor onboarding |
| Sections | 8 sections | 10+ detailed sections |
| Learning Path | Basic roadmap | Day-by-day learning plan |

## Troubleshooting

### Analysis Takes Too Long

- **Cause**: Large repository with many files
- **Solution**: The system automatically prioritizes important files. Results will still be comprehensive.

### Analysis Fails

- **Cause**: GitHub rate limit or LLM error
- **Solution**: 
  1. Pass a GitHub token for higher rate limits
  2. Wait and retry after a few minutes
  3. Check the error message in the job status

### Incomplete Results

- **Cause**: Token limit reached
- **Solution**: The chunking system automatically handles this by summarizing less important content

## Future Enhancements

- [ ] Streaming results as they're generated
- [ ] Caching based on commit SHA
- [ ] Incremental updates for repository changes
- [ ] Multi-language support
- [ ] Custom section selection
- [ ] Export to PDF/Markdown
- [ ] Interactive learning path tracker

## Contributing

To improve the comprehensive explanation feature:

1. Review `/CONTRIBUTOR_ONBOARDING_GUIDE.md` for architecture details
2. Check `/backend/src/services/chunking.py` for chunking logic
3. Review `/backend/src/services/prompt_composer.py` for LLM pipeline
4. Add tests in `/backend/tests/test_chunking.py`

## Support

For issues or questions:
- Open an issue on GitHub
- Check existing issues for similar problems
- Review the main README.md for setup instructions

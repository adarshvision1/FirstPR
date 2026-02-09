# FirstPR — The Project Story

## Inspiration

It started with a `git clone` and a sinking feeling.

I was a new developer trying to make my **first open-source contribution**. I'd heard all the advice — _"just pick a good-first-issue"_ — but nobody told me what to do *after* that. I'd open a repository with 200+ files, a cryptic folder structure, and zero idea where the code I needed to change actually lived. I'd stare at the README, grep through directories, and still feel completely lost.

The frustration was real:

```
$ find . -name "*.py" | wc -l
347
$ cat README.md
# Project
TODO: Add docs
```

I spent **more time understanding the codebase** than actually writing code. Architecture decisions were buried in commit messages. The tech stack was scattered across config files. Onboarding docs — if they existed — were three major versions behind.

I thought: _"There has to be a better way."_

Then it hit me. What if you could just **paste a GitHub link** and instantly get a full, beautiful breakdown of the entire repository — its architecture, file structure, community health, active issues, and a personalized roadmap for your first contribution?

That's how **FirstPR** was born.

---

## What It Does

FirstPR is an **AI-powered repository analysis and onboarding assistant**. You paste a GitHub repository URL, and it generates:

- **Deep Architecture Analysis** — tech stack, design patterns, module relationships
- **Interactive File Explorer** — browse the repo structure with AI-generated summaries
- **Community & Activity Insights** — recent PRs, issues, contribution patterns
- **Personalized Onboarding Roadmap** — a step-by-step path to your first pull request
- **AI Chat Assistant** — ask follow-up questions about the codebase in natural language

All rendered in a clean, dark-themed dashboard that feels like home for any developer.

---

## How We Built It

### The Stack

FirstPR is a full-stack application with three core layers:

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS, Framer Motion |
| **Backend** | Python, FastAPI, async HTTP with `httpx` |
| **AI Engine** | Google Gemini 3 Pro API |
| **Data Source** | GitHub REST API |

### Architecture Overview

The system follows an **async job-based architecture**:

1. The user submits a GitHub repo URL via the React frontend
2. The FastAPI backend spawns an **async analysis job** and returns a `job_id`
3. The frontend **polls** the backend for job status updates
4. Meanwhile, the backend orchestrates multiple parallel tasks:
   - Fetches repository metadata, file tree, README, recent issues, and PRs via the GitHub API
   - Sends structured prompts to **Gemini 3 Pro** for deep analysis
   - Aggregates results into a unified response
5. Once complete, the dashboard renders the full analysis with interactive components

The key architectural decisions:

- **Lazy-loaded components** (`React.lazy` + `Suspense`) to minimize initial bundle size
- **Job-based polling** instead of WebSockets for simplicity and Railway/Render compatibility
- **Concurrent API calls** with a managed concurrency pool to respect GitHub rate limits
- **Structured Gemini prompts** that produce consistent, parseable JSON output

### The Math Behind It

We use a weighted scoring model to rank "good first issues" for new contributors. Given an issue \\( i \\) with attributes like label count \\( l_i \\), comment count \\( c_i \\), and days open \\( d_i \\), we compute an approachability score:

$$
S(i) = w_1 \cdot \frac{1}{1 + c_i} + w_2 \cdot \mathbb{1}[l_i \in L_{\text{beginner}}] + w_3 \cdot \frac{1}{\log(1 + d_i)}
$$

where \\( L_{\text{beginner}} \\) is the set of beginner-friendly labels (e.g., `good-first-issue`, `help-wanted`), and \\( w_1, w_2, w_3 \\) are learned weights. This ensures new contributors see the **most approachable issues first**.

---

## Challenges We Faced

### 1. Taming the GitHub API Rate Limit

The GitHub REST API limits unauthenticated requests to 60/hour. A single repo analysis can trigger 10–20 API calls (metadata, tree, README, issues, PRs, contributors). We built a **concurrency manager** to batch and throttle requests, and added token-based authentication to push the limit to 5,000/hour.

### 2. Getting Gemini 3 to Return Structured Output

Large language models love to improvise. Getting Gemini 3 to consistently return **valid JSON** with specific fields required careful prompt engineering — system instructions, few-shot examples, and explicit schema definitions in the prompt. We iterated through dozens of prompt versions before landing on a reliable format.

### 3. Handling Massive Repositories

Repos like `torvalds/linux` have **70,000+ files**. We couldn't send the entire file tree to Gemini. The solution: **intelligent truncation** — we sample the top-level structure, prioritize files like `README.md`, `package.json`, `Cargo.toml`, and `go.mod`, and let the AI infer the rest from patterns.

### 4. The Cold Start Problem

The first analysis takes 15–30 seconds (GitHub API + Gemini inference). Users staring at a blank screen will bounce. We added a **multi-phase loading overlay** with animated progress messages — _"Cloning the knowledge graph…"_, _"Mapping the architecture…"_ — to keep users engaged while the backend works.

---

## What We Learned

- **Prompt engineering is software engineering.** Structured prompts with schemas, examples, and guardrails are as important as the code that calls the API.
- **Developer tools should feel like developer tools.** The dark theme, monospace fonts, and terminal-inspired UI weren't just aesthetics — they built trust with our target users.
- **Open source has an onboarding crisis.** During testing, every developer we showed FirstPR to said the same thing: _"I wish I had this when I started."_

---

## What's Next

- **VS Code Extension** — analyze repos directly from your editor
- **Contribution Difficulty Estimator** — predict how hard a given issue will be to solve
- **Team Onboarding Mode** — generate onboarding docs for internal company repos
- **Multi-model support** — integrate Claude, GPT-4, and local models via Ollama

---

## Try It

```bash
# Clone and run locally
git clone https://github.com/adarshvision1/FirstPR.git
cd FirstPR
docker-compose up --build
# Open http://localhost:3000
```

Or use the CLI directly:

```bash
python backend/firstpr-cli.py analyze octocat/Hello-World
```

---

_Built with ☕ and frustration at the Gemini 3 Hackathon._
_Because your first PR shouldn't require reading 10,000 lines of code._

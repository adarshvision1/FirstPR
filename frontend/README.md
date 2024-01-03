# FirstPR: Zero Friction Contribution

A single-screen, chat-style web app that streams repository analysis results and lets users take actions inline. Built with Next.js 14+, TypeScript, and Tailwind CSS.

## Features

- **Streamed Analysis**: Real-time streaming of repository summary, folder structure, and architecture diagrams.
- **Chat Interface**: Minimalist "Steve Jobs" style chat canvas for interaction.
- **Context Rail**: Collapsible sidebar showing file tree, key files, and issues.
- **Mock Backend**: Simulated backend latency and token streaming for demonstration.
- **PR Preview**: Inline action to preview and create draft PRs.

## tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4, Lucide Icons, Inter Font
- **State**: React Server Components + Client Hooks
- **Streaming**: Native `ReadableStream` and `TextDecoder`
- **Markdown**: `react-markdown` with `rehype-highlight`
- **Diagrams**: Mermaid (rendering handled via code blocks for now)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

1.  Navigate to the frontend directory:
    ```bash
    cd frontend
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

3.  Run the development server:
    ```bash
    npm run dev
    ```

4.  Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage Demo

1.  **Analyze**: Enter a GitHub repo URL (e.g., `facebook/react`) or click a suggestion.
2.  **Streaming**: Watch the analysis stream in:
    - **Progress**: "Scanning..." -> "Analyzing..."
    - **Summary**: High-level overview.
    - **Folder Map**: Interactive file tree in the chat.
    - **Architecture**: Token-by-token streamed diagram code.
    - **Issues**: List of "good first issues".
3.  **Context**: Open the "Files" or "Issues" tab in the right rail. Click files to view content.
4.  **Action**: Click "Preview PR" in the top bar to simulate creating a PR.

## Testing

Run unit tests with Vitest:

```bash
npm run test
```

## Deployment

Deploy easily to Vercel:

```bash
npx vercel
```

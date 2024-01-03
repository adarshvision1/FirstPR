import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Default to main if no ref provided, but let backend handle smarts
        const payload = {
            repo: body.repo || body.url, // Handle both 'repo' and 'url' from frontend
            ref: body.ref || "main"
        };

        const res = await fetch(`${BACKEND_URL}/api/analyze`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            const error = await res.json();
            return NextResponse.json(error, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json({ ...data, jobId: data.job_id });

    } catch (error) {
        console.error("Analyze error:", error);
        return NextResponse.json({ detail: "Failed to connect to analysis service" }, { status: 500 });
    }
}

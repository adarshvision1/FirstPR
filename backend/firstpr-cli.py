#!/usr/bin/env python3
import argparse
import requests
import json
import sys
import time
import os

# Default to Docker URL if inside container, else localhost
API_URL = os.environ.get("API_URL", "http://localhost:8000/api")


def analyze(repo, ref="main", token=None):
    print(f"Analyzing {repo} ({ref})...")

    headers = {}
    if token:
        headers["X-GitHub-Token"] = token

    try:
        resp = requests.post(
            f"{API_URL}/analyze", json={"repo": repo, "ref": ref}, headers=headers
        )
        resp.raise_for_status()
        job = resp.json()
        job_id = job["job_id"]
        print(f"Job started: {job_id}")

        while True:
            try:
                status_resp = requests.get(f"{API_URL}/analyze/{job_id}/status")
                status_resp.raise_for_status()
                status = status_resp.json()
                sys.stdout.write(f"\rStatus: {status['status']}")
                sys.stdout.flush()

                if status["status"] in ["completed", "failed"]:
                    print()
                    break
            except requests.RequestException:
                # transient network blip in CLI
                pass
            time.sleep(2)

        if status["status"] == "completed":
            result_resp = requests.get(f"{API_URL}/analyze/{job_id}/result")
            result_resp.raise_for_status()
            result = result_resp.json()
            # Summarize result instead of dumping everything
            print("\nAnalysis Complete!")
            print(f"Repo: {result.get('repo')}")
            print(f"Description: {result.get('metadata', {}).get('description')}")
            print(f"Top Functions Found: {len(result.get('top_functions', []))}")
            if result.get("architecture_overview"):
                print(
                    "\nArchitecture Overview:\n"
                    + str(result["architecture_overview"])[:200]
                    + "..."
                )

            print("\nResult Keys Found:", list(result.keys()))
        else:
            print(f"Analysis failed: {status.get('error')}")

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="FirstPR CLI")
    parser.add_argument("action", choices=["analyze"])
    parser.add_argument("repo", help="Repository in owner/repo format")
    parser.add_argument("--ref", default="main", help="Git reference (default: main)")
    parser.add_argument("--token", help="Optional GitHub Token")

    args = parser.parse_args()

    if args.action == "analyze":
        analyze(args.repo, args.ref, args.token)

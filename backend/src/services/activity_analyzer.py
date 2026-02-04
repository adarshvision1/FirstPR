from datetime import UTC, datetime, timedelta
from typing import Any


class ActivityAnalyzer:
    def __init__(self):
        pass

    def calculate_activity_status(
        self,
        repo_data: dict[str, Any],
        commits: list[dict[str, Any]],
        issues: list[dict[str, Any]],
        prs: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Analyzes repository activity and returns a status + explanation.
        """
        now = datetime.now(UTC)

        # 1. Analyze Commits
        last_commit_date = None
        commit_frequency_90d = 0
        authors_90d = set()

        if commits:
            last_commit_str = commits[0]["commit"]["author"]["date"]
            last_commit_date = datetime.fromisoformat(
                last_commit_str.replace("Z", "+00:00")
            )

            cutoff_90d = now - timedelta(days=90)
            for commit in commits:
                commit_date = datetime.fromisoformat(
                    commit["commit"]["author"]["date"].replace("Z", "+00:00")
                )
                if commit_date > cutoff_90d:
                    commit_frequency_90d += 1
                    if commit.get("author"):
                        authors_90d.add(commit["author"]["login"])
                else:
                    break

        days_since_last_commit = (
            (now - last_commit_date).days if last_commit_date else 999
        )
        active_contributors = len(authors_90d)

        # 2. Analyze PRs & Issues
        # Calculate issue response time (approximate based on updated_at vs created_at for active issues)
        # and PR merge frequency.

        pr_merge_count_30d = 0
        pr_created_30d = 0
        cutoff_30d = now - timedelta(days=30)

        if prs:
            for pr in prs:
                created_at = datetime.fromisoformat(
                    pr["created_at"].replace("Z", "+00:00")
                )
                if created_at > cutoff_30d:
                    pr_created_30d += 1
                if pr.get("merged_at"):
                    merged_at = datetime.fromisoformat(
                        pr["merged_at"].replace("Z", "+00:00")
                    )
                    if merged_at > cutoff_30d:
                        pr_merge_count_30d += 1

        # Determine Status
        status = "🔴 Low Activity / Possibly Abandoned"
        confidence = "Medium"
        explanation = []

        # Scoring System
        score = 0

        # Commit Activity Score
        if days_since_last_commit < 14:
            score += 3
            explanation.append(f"Recent commits within {days_since_last_commit} days.")
        elif days_since_last_commit < 60:
            score += 1
        else:
            score -= 2
            explanation.append(f"No commits in {days_since_last_commit} days.")

        # Commit Frequency Score
        if commit_frequency_90d > 20:
            score += 2
            explanation.append("High commit frequency.")
        elif commit_frequency_90d > 5:
            score += 1

        # Contributor Score
        if active_contributors > 5:
            score += 2
            explanation.append(f"Active team of {active_contributors} contributors.")
        elif active_contributors > 1:
            score += 1

        # PR Activity Score
        if pr_merge_count_30d > 5:
            score += 2
            explanation.append(f"{pr_merge_count_30d} PRs merged in last 30 days.")
        elif pr_merge_count_30d > 0:
            score += 1

        # Determine Final Status based on Score
        if score >= 6:
            status = "🟢 Active"
            confidence = "High"
        elif score >= 2:
            status = "🟡 Moderately Active"
            confidence = "High" if commit_frequency_90d > 0 else "Medium"
        else:
            status = "🔴 Low Activity / Possibly Abandoned"
            confidence = "High"

        if not explanation:
            explanation.append(
                "Activity levels are consistent with a mature or slow-moving project."
            )

        return {
            "activity_status": status,
            "confidence_level": confidence,
            "explanation": " ".join(explanation),
            "metrics": {
                "days_since_last_commit": days_since_last_commit,
                "commit_frequency_90d": commit_frequency_90d,
                "active_contributors_count": active_contributors,
                "pr_merge_count_30d": pr_merge_count_30d,
                "pr_created_30d": pr_created_30d,
            },
        }


activity_analyzer = ActivityAnalyzer()

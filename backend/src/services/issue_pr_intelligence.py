from typing import Any


class IssuePRIntelligence:
    def __init__(self):
        self.beginner_labels = {
            "good first issue",
            "good-first-issue",
            "help wanted",
            "beginner",
            "documentation",
            "easy",
        }
        self.risky_labels = {"bug", "critical", "security", "complex", "advanced"}

    def rank_issues(self, issues: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """
        Ranks issues by beginner-friendliness and enhances them with a 'difficulty' score.
        """
        ranked_issues = []
        for issue in issues:
            if issue.get("pull_request"):  # Skip PRs returned as issues
                continue

            labels = {l["name"].lower() for l in issue.get("labels", [])}
            score = 0
            difficulty = "Medium"
            reasons = []

            # 1. Label Analysis
            if labels & self.beginner_labels:
                score += 5
                difficulty = "Beginner-Friendly"
                reasons.append("Marked for beginners")

            if labels & self.risky_labels:
                score -= 3
                difficulty = "Hard"
                reasons.append("Marked as complex or critical")

            # 2. Comment Analysis (Fewer comments = easier to pick up?)
            # profound discussions might indicate complexity.
            comments = issue.get("comments", 0)
            if comments == 0:
                score += 1
                reasons.append("No comments yet")
            elif comments > 10:
                score -= 2
                difficulty = "Hard"
                reasons.append("Active/Complex discussion")

            # 3. Description Length (Heuristic)
            body = issue.get("body") or ""
            if len(body) > 100:
                score += 1  # Detailed description is good

            ranked_issues.append(
                {
                    **issue,
                    "intelligence": {
                        "score": score,
                        "difficulty": difficulty,
                        "reasons": reasons,
                    },
                }
            )

        # Sort by score descending
        return sorted(
            ranked_issues, key=lambda x: x["intelligence"]["score"], reverse=True
        )

    def analyze_prs(self, prs: list[dict[str, Any]]) -> dict[str, Any]:
        """
        Analyzes recent PRs to infer repo culture.
        Note: We need full PR details (additions/deletions) for accurate size analysis.
        The list endpoint usually doesn't return additions/deletions.
        We might need to fetch a few individual PRs or rely on 'body' length as proxy.
        For now, we'll infer from what we have or user might need to fetch details.

        Assuming we might not have deep details for ALL, we'll return summary stats based on available data.
        """
        if not prs:
            return {
                "typical_size": "Unknown",
                "merge_frequency": "Unknown",
                "review_strictness": "Unknown",
            }

        merged_prs = [pr for pr in prs if pr.get("merged_at")]
        # If we can't see merged_at from list (sometimes it's null in list view if not detailed),
        # we check 'state' == 'closed'. But 'merged_at' is best.

        # Calculate merge frequency (approx)
        # We can't do deep size analysis without fetching each PR.
        # We'll trust the frontend or another step to ask for details if needed.
        # Here we provide high-level stats.

        return {
            "total_analyzed": len(prs),
            "merged_count": len(merged_prs),
            "open_count": len(prs) - len(merged_prs),
            "note": "Detailed size analaysis requires fetching individual PRs.",
        }

    def calculate_pr_metrics(
        self, detailed_prs: list[dict[str, Any]]
    ) -> dict[str, Any]:
        """
        If we have detailed PR data (with additions/deletions/comments)
        """
        if not detailed_prs:
            return {}

        # Calculate PR complexity
        avg_additions = 0
        avg_deletions = 0
        avg_comments = 0

        if detailed_prs:
            avg_additions = sum(pr.get("additions", 0) for pr in detailed_prs) / len(
                detailed_prs
            )
            avg_deletions = sum(pr.get("deletions", 0) for pr in detailed_prs) / len(
                detailed_prs
            )
            avg_comments = sum(
                pr.get("comments", 0) + pr.get("review_comments", 0)
                for pr in detailed_prs
            ) / len(detailed_prs)

        size_label = "Small"
        if avg_additions > 1000:
            size_label = "Large"
        elif avg_additions > 300:
            size_label = "Medium"

        strictness = "Lenient"
        explanation = "Reviews are generally quick with few comments."

        if avg_comments > 10:
            strictness = "Very Strict"
            explanation = "Expect deep code reviews and significant feedback."
        elif avg_comments > 5:
            strictness = "Strict"
            explanation = "Reviews are thorough; expect efficient feedback iteration."
        elif avg_comments > 2:
            strictness = "Moderate"
            explanation = "Standard review process."

        return {
            "typical_size": size_label,
            "avg_lines_changed": round(avg_additions, 0),
            "avg_deletions": round(avg_deletions, 0),
            "avg_review_comments": round(avg_comments, 1),
            "review_strictness": strictness,
            "expectation": explanation,
        }


issue_pr_intelligence = IssuePRIntelligence()
